#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════════════
#  BTP Manager — déploiement sur le VPS depuis GitHub
# ════════════════════════════════════════════════════════════════════════════
#  À exécuter SUR LE VPS. Chaque exécution :
#    1. récupère la dernière version de la branche sur GitHub ;
#    2. réinstalle les dépendances si les package-lock.json ont changé ;
#    3. construit le frontend dans un dossier temporaire puis le bascule
#       d'un coup (le site reste servi pendant le build) ;
#    4. recharge UNIQUEMENT le processus PM2 btp-api et vérifie /health ;
#    5. en cas d'échec du health check, revient automatiquement à la
#       version précédente (code, frontend et backend).
#
#  Usage :
#    ./deploy-vps.sh              déploie si GitHub a de nouveaux commits
#    ./deploy-vps.sh --force      redéploie même sans nouveau commit
#    ./deploy-vps.sh --migrate    applique aussi schema.sql (idempotent)
#
#  Variables surchargeables (valeurs par défaut entre crochets) :
#    APP_DIR   [/opt/btp-app]                               dossier du projet
#    REPO_URL  [https://github.com/trrvssctt/btp-app.git]   dépôt GitHub
#    BRANCH    [main]                                       branche déployée
#    PM2_NAME  [btp-api]                                    processus PM2
#
#  Serveur partagé : ce script ne touche qu'au dossier $APP_DIR et au seul
#  processus PM2 $PM2_NAME. Il ne modifie ni Nginx, ni les ports, ni les autres
#  applications PM2. Avant d'agir, il vérifie que le port du backend (PORT de
#  backend/.env) appartient bien à $PM2_NAME.
#
#  Prérequis (une seule fois, voir deploiement_vps.txt) : git, Node.js 20,
#  PM2 (processus btp-api lancé via ecosystem.config.cjs), Nginx configuré pour
#  servir $APP_DIR/dist et proxifier /api, et le fichier $APP_DIR/backend/.env
#  (jamais versionné) avec DATABASE_URL, JWT_SECRET, PORT, CORS_ORIGINS.
# ════════════════════════════════════════════════════════════════════════════
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/opt/btp-app}"
REPO_URL="${REPO_URL:-https://github.com/trrvssctt/btp-app.git}"
BRANCH="${BRANCH:-main}"
PM2_NAME="${PM2_NAME:-btp-api}"

FORCE=0
MIGRATE=0

log()  { printf '[%s] %s\n' "$(date '+%H:%M:%S')" "$*"; }
fail() { log "✗ $*"; exit 1; }

usage() { sed -n '2,37p' "$0" | sed 's/^# \{0,1\}//'; }

parse_args() {
  for arg in "$@"; do
    case "$arg" in
      --force)   FORCE=1 ;;
      --migrate) MIGRATE=1 ;;
      -h|--help) usage; exit 0 ;;
      *) fail "Option inconnue : $arg (voir --help)" ;;
    esac
  done
}

check_prereqs() {
  for cmd in git node npm pm2 curl flock pgrep; do
    command -v "$cmd" >/dev/null 2>&1 || fail "Commande requise introuvable : $cmd"
  done
}

# Clone initial si le dossier n'est pas encore un dépôt git.
ensure_repo() {
  if [ ! -d "$APP_DIR/.git" ]; then
    log "Clonage initial de $REPO_URL ($BRANCH) dans $APP_DIR…"
    mkdir -p "$APP_DIR"
    git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
  fi
}

# Port du backend, lu dans backend/.env (défaut 3000, comme le serveur).
backend_port() {
  local port
  port="$(grep -E '^PORT=' "$APP_DIR/backend/.env" 2>/dev/null | tail -1 | cut -d= -f2 | tr -d '"'"'"' \r')"
  echo "${port:-3000}"
}

# Hash d'un fichier suivi par git à un commit donné (vide s'il n'existe pas).
blob_at() { git -C "$APP_DIR" rev-parse --quiet --verify "$1:$2" 2>/dev/null || true; }

install_deps() {
  local from="$1" to="$2"
  if [ ! -d "$APP_DIR/node_modules" ] || [ "$(blob_at "$from" package-lock.json)" != "$(blob_at "$to" package-lock.json)" ]; then
    log "Frontend : installation des dépendances (npm ci)…"
    (cd "$APP_DIR" && npm ci --no-audit --no-fund)
  else
    log "Frontend : dépendances inchangées."
  fi
  if [ ! -d "$APP_DIR/backend/node_modules" ] || [ "$(blob_at "$from" backend/package-lock.json)" != "$(blob_at "$to" backend/package-lock.json)" ]; then
    log "Backend : installation des dépendances (npm ci --omit=dev)…"
    (cd "$APP_DIR/backend" && npm ci --omit=dev --no-audit --no-fund)
  else
    log "Backend : dépendances inchangées."
  fi
}

# Build dans dist.new puis bascule : Nginx sert l'ancien dist pendant le build.
build_frontend() {
  log "Frontend : build de production…"
  rm -rf "$APP_DIR/dist.new"
  (cd "$APP_DIR" && VITE_API_URL=/api npx vite build --outDir dist.new --emptyOutDir)
  rm -rf "$APP_DIR/dist.prev"
  [ -d "$APP_DIR/dist" ] && mv "$APP_DIR/dist" "$APP_DIR/dist.prev"
  mv "$APP_DIR/dist.new" "$APP_DIR/dist"
  log "Frontend : nouvelle version en ligne."
}

run_migration() {
  log "Base de données : application de schema.sql…"
  (cd "$APP_DIR/backend" && npm run migrate)
}

# Recharge uniquement $PM2_NAME. S'il n'existe pas, on le démarre via
# ecosystem.config.cjs (--only) — jamais de processus créé « à l'aveugle ».
reload_backend() {
  if pm2 describe "$PM2_NAME" >/dev/null 2>&1; then
    log "Backend : rechargement PM2 de $PM2_NAME (les autres applications ne sont pas touchées)…"
    pm2 reload "$PM2_NAME" --update-env >/dev/null
  elif [ -f "$APP_DIR/ecosystem.config.cjs" ]; then
    log "Backend : démarrage de $PM2_NAME via ecosystem.config.cjs…"
    (cd "$APP_DIR" && pm2 start ecosystem.config.cjs --only "$PM2_NAME" >/dev/null)
  else
    fail "Processus PM2 $PM2_NAME introuvable et pas de ecosystem.config.cjs : démarrage manuel requis."
  fi
  pm2 save >/dev/null
}

# PID du processus PM2 $PM2_NAME et de tous ses descendants (start.sh → node).
pm2_tree_pids() {
  local root
  root="$(pm2 pid "$PM2_NAME" 2>/dev/null | tail -1 | tr -dc '0-9')"
  [ -n "$root" ] && [ "$root" != "0" ] || return 0
  local queue="$root" pid
  while [ -n "$queue" ]; do
    pid="${queue%% *}"; queue="${queue#"$pid"}"; queue="${queue# }"
    echo "$pid"
    queue="$queue $(pgrep -P "$pid" | tr '\n' ' ')"
    queue="${queue# }"; queue="${queue% }"
  done
}

# Sécurité serveur partagé : le port du backend doit être libre ou tenu par
# $PM2_NAME. S'il est tenu par une autre application, on n'agit pas.
check_port_owner() {
  command -v ss >/dev/null 2>&1 || { log "ss indisponible : vérification du port ignorée."; return 0; }
  local port owners tree
  port="$(backend_port)"
  owners="$(ss -ltnpH "( sport = :$port )" 2>/dev/null | grep -o 'pid=[0-9]*' | cut -d= -f2 | sort -u || true)"
  [ -n "$owners" ] || { log "Port $port libre."; return 0; }
  tree="$(pm2_tree_pids)"
  for pid in $owners; do
    if ! grep -qx "$pid" <<<"$tree"; then
      fail "Le port $port est utilisé par un autre processus (pid $pid : $(ps -o comm= -p "$pid" 2>/dev/null)) que $PM2_NAME. Déploiement annulé."
    fi
  done
  log "Port $port tenu par $PM2_NAME ✓"
}

health_check() {
  local url="http://127.0.0.1:$(backend_port)/health"
  log "Vérification : $url"
  for _ in $(seq 1 15); do
    # On exige la réponse propre à ce backend ({"status":"ok",…}).
    if curl -fsS --max-time 3 "$url" 2>/dev/null | grep -q '"status":"ok"'; then
      log "✓ Backend en bonne santé."
      return 0
    fi
    sleep 2
  done
  return 1
}

# Retour à la version précédente : code, dépendances, frontend, backend.
rollback() {
  local prev="$1" failed="$2"
  log "⚠ Échec du health check — retour à ${prev:0:7}…"
  git -C "$APP_DIR" reset --hard "$prev" >/dev/null
  install_deps "$failed" "$prev"
  if [ -d "$APP_DIR/dist.prev" ]; then
    rm -rf "$APP_DIR/dist"
    mv "$APP_DIR/dist.prev" "$APP_DIR/dist"
  fi
  reload_backend
  if health_check; then
    log "Version précédente rétablie. Consultez : pm2 logs $PM2_NAME --lines 100"
  else
    log "La version précédente ne répond pas non plus : pm2 logs $PM2_NAME --lines 100"
  fi
  exit 1
}

main() {
  parse_args "$@"
  check_prereqs
  ensure_repo

  # Une seule exécution à la fois.
  exec 9>"$APP_DIR/.deploy.lock"
  flock -n 9 || fail "Un déploiement est déjà en cours."

  [ -f "$APP_DIR/backend/.env" ] || fail "Fichier $APP_DIR/backend/.env manquant (DATABASE_URL, JWT_SECRET, PORT, CORS_ORIGINS)."
  check_port_owner

  # Les fichiers suivis ne doivent pas être modifiés à la main sur le serveur :
  # le déploiement les écraserait.
  if [ -n "$(git -C "$APP_DIR" status --porcelain --untracked-files=no)" ] && [ "$FORCE" -eq 0 ]; then
    git -C "$APP_DIR" status --short --untracked-files=no
    fail "Modifications locales sur le serveur (ci-dessus). Relancez avec --force pour les écraser."
  fi

  local prev new
  prev="$(git -C "$APP_DIR" rev-parse HEAD)"
  log "Récupération de origin/$BRANCH…"
  git -C "$APP_DIR" fetch --prune origin "$BRANCH"
  new="$(git -C "$APP_DIR" rev-parse "origin/$BRANCH")"

  if [ "$prev" = "$new" ] && [ "$FORCE" -eq 0 ] && [ "$MIGRATE" -eq 0 ]; then
    log "Déjà à jour (${new:0:7}). Rien à déployer (--force pour redéployer)."
    exit 0
  fi

  log "Déploiement ${prev:0:7} → ${new:0:7}"
  git -C "$APP_DIR" --no-pager log --oneline "$prev..$new" 2>/dev/null | head -20 || true
  git -C "$APP_DIR" reset --hard "$new" >/dev/null

  install_deps "$prev" "$new"
  build_frontend
  if [ "$MIGRATE" -eq 1 ]; then run_migration; fi
  reload_backend

  health_check || rollback "$prev" "$new"

  log "✅ Déploiement terminé : $(git -C "$APP_DIR" --no-pager log -1 --format='%h %s')"
}

# Tout est dans des fonctions : bash lit le fichier en entier avant d'exécuter
# main, donc le `git reset` qui met à jour ce script en cours de route est sans risque.
main "$@"
