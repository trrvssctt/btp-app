# BTP Manager — Backend API

Node.js + Express + PostgreSQL (driver `pg`) + JWT.

## Installation

```bash
cd backend
cp .env.example .env       # éditer DATABASE_URL et JWT_SECRET
npm install
npm run migrate            # crée les tables (schéma fourni)
npm run seed               # données initiales (rôles, admin, articles, etc.)
npm run dev                # démarre l'API sur PORT (default 4000)
```

## Compte admin par défaut (seed)

- Email : `admin@btp.local`
- Mot de passe : `Admin123!`
- Rôle : `ADMIN`

À changer immédiatement en production.

## Endpoints principaux

| Méthode | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | — | Création compte |
| POST | `/api/auth/login` | — | Login → JWT |
| GET  | `/api/auth/me` | ✓ | Profil + rôles + permissions |
| GET  | `/api/projects` | ✓ | Liste projets |
| GET  | `/api/projects/:id` | ✓ | Détail projet (+ sites) |
| POST | `/api/projects` | ✓ ADMIN/CHEF | Créer projet |
| GET  | `/api/articles` | ✓ | Liste articles |
| POST | `/api/articles` | ✓ ADMIN/MAGASINIER | Créer article |
| GET  | `/api/depots` | ✓ | Liste dépôts |
| GET  | `/api/stock` | ✓ | Soldes de stock (filtre depot/article) |
| GET  | `/api/suppliers` | ✓ | Fournisseurs |
| GET  | `/api/requests` | ✓ | Liste demandes |
| GET  | `/api/requests/:id` | ✓ | Détail (+ lignes + approvals) |
| POST | `/api/requests` | ✓ | Créer demande |
| POST | `/api/requests/:id/approvals` | ✓ TECH/BUDGET/DIRECTION | Décision workflow |

Toutes les réponses : `{ data: ... }` ou `{ error: { message, details? } }`.
