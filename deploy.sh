#!/bin/bash
# Script de déploiement — BTP Manager
# Usage: ./deploy.sh <ssh_user> [ssh_password]
# Exemple: ./deploy.sh root
set -e

VPS_IP="144.91.96.142"
SSH_USER="${1:-root}"
APP_DIR="/var/www/btp-manager"

echo "==> Déploiement BTP Manager sur $VPS_IP"
echo "==> Utilisateur SSH: $SSH_USER"
echo ""

# ─── 1. Build du frontend ─────────────────────────────────────────────────
echo "[1/5] Build du frontend React..."
cd "$(dirname "$0")"
cp .env.production .env.local 2>/dev/null || true
npm run build
echo "      Build OK -> dist/"

# ─── 2. Préparation de l'archive ──────────────────────────────────────────
echo "[2/5] Création des archives..."
tar -czf /tmp/btp-frontend.tar.gz dist/
tar -czf /tmp/btp-backend.tar.gz backend/ --exclude='backend/node_modules' --exclude='backend/.env'
echo "      Archives créées"

# ─── 3. Transfert vers le VPS ─────────────────────────────────────────────
echo "[3/5] Transfert des fichiers vers le VPS..."
scp /tmp/btp-frontend.tar.gz "$SSH_USER@$VPS_IP:/tmp/"
scp /tmp/btp-backend.tar.gz  "$SSH_USER@$VPS_IP:/tmp/"
scp nginx.conf                "$SSH_USER@$VPS_IP:/tmp/btp-nginx.conf"
scp backend/.env.production   "$SSH_USER@$VPS_IP:/tmp/btp-backend.env"
echo "      Transfert OK"

# ─── 4. Installation et configuration sur le VPS ──────────────────────────
echo "[4/5] Configuration du VPS..."
ssh "$SSH_USER@$VPS_IP" bash << 'REMOTE'
set -e

APP_DIR="/var/www/btp-manager"

# Node.js v20 si absent
if ! command -v node &>/dev/null; then
  echo "  → Installation Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
echo "  Node.js: $(node -v)"

# PM2 si absent
if ! command -v pm2 &>/dev/null; then
  echo "  → Installation PM2..."
  npm install -g pm2
fi

# Nginx si absent
if ! command -v nginx &>/dev/null; then
  echo "  → Installation Nginx..."
  apt-get update -qq && apt-get install -y nginx
fi

# Création des répertoires
mkdir -p "$APP_DIR/frontend" "$APP_DIR/backend"

# Déploiement frontend
echo "  → Déploiement frontend..."
tar -xzf /tmp/btp-frontend.tar.gz -C /tmp/
cp -r /tmp/dist/* "$APP_DIR/frontend/"

# Déploiement backend
echo "  → Déploiement backend..."
tar -xzf /tmp/btp-backend.tar.gz -C /tmp/
cp -r /tmp/backend/* "$APP_DIR/backend/"
cp /tmp/btp-backend.env "$APP_DIR/backend/.env"

# Dépendances backend
cd "$APP_DIR/backend"
npm install --production

# Configuration Nginx
cp /tmp/btp-nginx.conf /etc/nginx/sites-available/btp-manager
ln -sf /etc/nginx/sites-available/btp-manager /etc/nginx/sites-enabled/btp-manager
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# Démarrage/redémarrage du backend avec PM2
cd "$APP_DIR/backend"
pm2 delete btp-backend 2>/dev/null || true
pm2 start src/server.js --name btp-backend
pm2 save
pm2 startup 2>/dev/null || true

echo ""
echo "✅ Déploiement terminé !"
echo "   Frontend : http://144.91.96.142:8080"
echo "   API      : http://144.91.96.142:8080/api"
echo "   Health   : http://144.91.96.142:8080/health"
REMOTE

# ─── 5. Vérification ──────────────────────────────────────────────────────
echo "[5/5] Vérification..."
sleep 3
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://$VPS_IP:8080/health" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
  echo "      ✅ API répond (HTTP 200)"
else
  echo "      ⚠️  API HTTP $HTTP_CODE — vérifiez les logs: ssh $SSH_USER@$VPS_IP pm2 logs btp-backend"
fi

echo ""
echo "🏗️  BTP Manager déployé sur http://$VPS_IP:8080"
