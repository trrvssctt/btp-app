#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════════════
#  Publie le dernier commit local sur GitHub PAR-DESSUS l'historique existant
# ════════════════════════════════════════════════════════════════════════════
#  À exécuter sur le poste de développement (pas sur le VPS).
#
#  Le dépôt local a été initialisé sans l'historique GitHub : un simple push
#  serait refusé et un push forcé effacerait l'historique. Ce script :
#    1. récupère origin/$BRANCH ;
#    2. crée un commit enfant de origin/$BRANCH dont le contenu est celui du
#       commit local ;
#    3. CONSERVE les fichiers présents uniquement sur GitHub (ex. backend/start.sh
#       utilisé par PM2), sauf ceux qu'on retire volontairement (EXCLUS) ;
#    4. affiche le résumé et demande confirmation avant de pousser ;
#    5. aligne la branche locale sur le commit publié.
#
#  Usage : ./publier-github.sh
# ════════════════════════════════════════════════════════════════════════════
set -Eeuo pipefail

REMOTE_URL="${REMOTE_URL:-https://github.com/trrvssctt/btp-app.git}"
BRANCH="${BRANCH:-main}"
# Fichiers suivis sur GitHub à NE PAS reprendre : secrets, archives, builds.
EXCLUS='^(deploiement_vps\.txt|pixel-perfect-clone-main\.zip|dist/|node_modules/|logs/)|(^|/)\.env($|\.)'

cd "$(git rev-parse --show-toplevel)"

[ -z "$(git status --porcelain)" ] || { echo "✗ Des modifications ne sont pas commitées. Commitez-les d'abord."; exit 1; }

git remote get-url origin >/dev/null 2>&1 || git remote add origin "$REMOTE_URL"
echo "→ Récupération de origin/$BRANCH…"
git fetch origin "$BRANCH"

local_commit="$(git rev-parse HEAD)"
base="$(git rev-parse "origin/$BRANCH")"

if git merge-base --is-ancestor "$base" "$local_commit"; then
  echo "→ Le commit local descend déjà de origin/$BRANCH : push classique."
  git push origin "HEAD:$BRANCH"
  exit 0
fi

# Index temporaire : contenu du commit local + fichiers propres à GitHub.
tmp_index="$(mktemp)"
trap 'rm -f "$tmp_index"' EXIT
export GIT_INDEX_FILE="$tmp_index"
git read-tree "$local_commit"

conserves=()
while IFS= read -r path; do
  [[ "$path" =~ $EXCLUS ]] && continue
  git cat-file -e "$local_commit:$path" 2>/dev/null && continue
  read -r mode _ sha _ < <(git ls-tree "origin/$BRANCH" -- "$path")
  git update-index --add --cacheinfo "$mode,$sha,$path"
  conserves+=("$path")
done < <(git ls-tree -r --name-only "origin/$BRANCH")

tree="$(git write-tree)"
unset GIT_INDEX_FILE
new_commit="$(git log -1 --format=%B "$local_commit" | git commit-tree "$tree" -p "$base")"

echo
echo "════ Résumé ════"
echo "Base GitHub : $(git log -1 --format='%h %s' "$base")"
echo "Fichiers propres à GitHub conservés (${#conserves[@]}) :"
printf '   %s\n' "${conserves[@]:-(aucun)}"
echo "Fichiers retirés de GitHub :"
git diff --name-only --diff-filter=D "$base" "$new_commit" | sed 's/^/   /' || true
echo "Statistiques :"
git diff --shortstat "$base" "$new_commit"
echo
read -r -p "Pousser ce commit sur origin/$BRANCH ? [o/N] " rep
[[ "$rep" =~ ^[oOyY]$ ]] || { echo "Annulé — rien n'a été poussé."; exit 0; }

git push origin "$new_commit:refs/heads/$BRANCH"
git reset -q --hard "$new_commit"
echo "✅ Publié : $(git log -1 --format='%h %s')"
echo "   Sur le VPS : cd /opt/btp-app && ./deploy-vps.sh --force   (la 1re fois)"
