# 🔧 RÉSOLUTION ERREUR CORS

## ❌ Problème rencontré

```
Blocage d'une requête multiorigine (Cross-Origin Request) : 
la politique « Same Origin » ne permet pas de consulter la ressource 
distante située sur http://localhost:3000/api/auth/login. 
Raison : échec de la requête CORS. Code d'état : (null).
```

## 🔍 Cause

Le frontend essayait de se connecter au port **3000**, mais le backend tourne sur le port **9000**.

### Configuration incorrecte

**Fichier** : `.env` (racine du projet frontend)
```env
# ❌ Ancienne configuration
VITE_API_URL=http://localhost:3000/api
```

**Backend** : `backend/src/.env`
```env
PORT=9000  # Le backend écoute sur le port 9000
```

## ✅ Solution appliquée

### 1. Modification du fichier `.env`

```env
# ✅ Nouvelle configuration
VITE_API_URL=http://localhost:9000/api
```

### 2. Redémarrage des serveurs

```bash
# Arrêter le serveur Vite (frontend)
pkill -9 -f vite

# Redémarrer le frontend
npm run dev

# Vérifier que le backend tourne toujours
curl http://localhost:9000/health
```

### 3. Vider le cache du navigateur

**Dans Firefox/Chrome** :
- Appuyer sur `Ctrl + Shift + R` (rafraîchissement forcé)
- Ou ouvrir les DevTools → Onglet Network → Cocher "Disable cache"

---

## 🎯 Vérifications

### Backend opérationnel

```bash
curl http://localhost:9000/health
# Réponse attendue : {"status":"ok","uptime":...}
```

### Frontend opérationnel

- URL : http://localhost:5173
- Page de login accessible
- Console navigateur sans erreurs CORS

### Test de connexion

**Identifiants ACHETEUR** :
- Email : `moussa.faye@btp-sn.com`
- Mot de passe : `Moussa2025!`

**Vérification dans la console navigateur** :
```javascript
// Devrait afficher : http://localhost:9000/api
console.log(import.meta.env.VITE_API_URL)
```

---

## 📝 Configuration CORS du backend

Le backend autorise les requêtes depuis le frontend :

**Fichier** : `backend/src/.env`
```env
CORS_ORIGINS=http://localhost:5173,http://localhost:8080
```

**Code** : `backend/src/app.js`
```javascript
app.use(cors({
  origin: (origin, cb) => {
    const allowed = env.corsOrigins.includes('*') || env.corsOrigins.includes(origin);
    if (allowed || !origin) return cb(null, true);
    return cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));
```

---

## 🐛 Autres causes possibles d'erreurs CORS

### 1. Backend non démarré

**Symptôme** : `ERR_CONNECTION_REFUSED`

**Solution** :
```bash
cd backend
npm run dev
```

### 2. Port déjà utilisé

**Symptôme** : `EADDRINUSE: address already in use :::9000`

**Solution** :
```bash
# Tuer le processus sur le port 9000
lsof -ti:9000 | xargs kill -9
npm run dev
```

### 3. Variable d'environnement non chargée

**Symptôme** : Le frontend essaie toujours de se connecter au port 3000

**Solution** :
```bash
# Vérifier que .env est bien lu
cat .env

# Redémarrer Vite (les var env sont chargées au démarrage)
pkill -9 -f vite
npm run dev
```

### 4. Cache navigateur

**Symptôme** : Erreur persiste même après correction

**Solution** :
- `Ctrl + Shift + R` (hard refresh)
- Vider le cache : DevTools → Application → Clear storage
- Mode navigation privée pour tester

---

## 📊 Résumé des ports

| Service | Port | URL |
|---------|------|-----|
| **Frontend Vite** | 5173 | http://localhost:5173 |
| **Backend Express** | 9000 | http://localhost:9000 |
| **PostgreSQL** | 5432 | postgresql-gestionapp.alwaysdata.net:5432 |

---

## ✅ Checklist de démarrage

Avant de tester l'application :

- [ ] Backend démarré : `cd backend && npm run dev`
- [ ] Backend répond : `curl http://localhost:9000/health`
- [ ] Frontend démarré : `npm run dev` (racine projet)
- [ ] Frontend accessible : http://localhost:5173
- [ ] Fichier `.env` configuré avec le bon port (9000)
- [ ] Cache navigateur vidé

---

## 🔗 Liens utiles

- [Documentation CORS MDN](https://developer.mozilla.org/fr/docs/Web/HTTP/CORS)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Express CORS middleware](https://expressjs.com/en/resources/middleware/cors.html)

---

*Problème résolu le 2026-07-06*
