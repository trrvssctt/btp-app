# Plan d'avancement — BTP Manager

## État des lieux

### Ce qui fonctionne
| Couche | État |
|--------|------|
| Backend Express + PostgreSQL | Opérationnel (port 3000) |
| Auth JWT | Fonctionnel |
| Seed données Sénégal | Inséré (44 articles, 5 projets, 10 users, 10 demandes...) |
| Mock data remplacé par contexte SN | Fait |
| Devise EUR → FCFA (XOF) | Fait |

### Pages frontend — connexion API
| Page | Statut |
|------|--------|
| Login | OK |
| Projets | API réelle |
| Articles | API réelle |
| Demandes | API réelle + fallback mock |
| Dashboard | 100% mock |
| Stock | 100% mock |
| DemandeDetail | 100% mock |
| Mouvements | 100% mock |
| Transferts | mock |
| Achats | mock |
| Receptions | mock |
| Equipements | mock |
| Reporting | mock |
| Parametres | mock |
| Audit | mock |
| Notifications | mock |

### Bug critique non résolu
Les 10 demandes seedées ont des statuts **anglais** (`APPROVED`, `PENDING`, `DRAFT`, `VALIDATED`, `REJECTED`) alors que tout le système (backend requestModel.js + frontend labels + filtres) utilise des statuts **français**.

Correspondances à corriger dans `backend/src/db/seed_reel.js` :
| Anglais (actuel) | Français (attendu) |
|------------------|--------------------|
| `APPROVED` | `APPROUVEE` |
| `VALIDATED` | `VALIDATION_BUDGETAIRE` |
| `PENDING` | `SOUMISE` |
| `DRAFT` | `BROUILLON` |
| `REJECTED` | `REJETEE` |

---

## Phase 1 — Correction critique [x]
**Durée estimée : 30 min**
**Objectif : données demandes affichées proprement dans le bon onglet**

- [x] Corriger les statuts anglais → français dans `backend/src/db/seed_reel.js`
- [x] Re-exécuter `npm run seed:reel`
- [x] Vérifier l'affichage sur la page Demandes (onglets En attente / Approuvées / Rejetées)

---

## Phase 2 — Pages prioritaires pour la présentation [x]
**Durée estimée : 2-3h**
**Objectif : les pages les plus visibles affichent des données réelles**

- [x] **Stock** — connecter `stockApi.list()` + `depotsApi.list()` (endpoints déjà dans `src/lib/api.ts`)
- [x] **Dashboard** — agréger via `projectsApi`, `requestsApi`, `stockApi` (KPIs, alertes, graphiques)
- [x] **DemandeDetail** — connecter `requestsApi.get(id)` (endpoint déjà dans `src/lib/api.ts`)
- [x] **Mouvements** — ajouter `stockMovementsApi` dans `src/lib/api.ts` (route backend `stockMovementRoutes.js` existe) puis connecter la page

---

## Phase 3 — Pages secondaires [x]
**Durée estimée : 1-2h**
**Objectif : couvrir le workflow complet approvisionnement**

- [x] **Transferts** — `transfersApi` ajouté dans `src/lib/api.ts`, page connectée, modal branché API
- [x] **Achats** — routes backend créées (`purchaseOrderRoutes.js`, model, controller), `purchaseOrdersApi` ajouté, page connectée, modal branché API
- [x] **Receptions** — routes backend créées (`receiptRoutes.js`, model, controller), `receiptsApi` ajouté, page connectée, modal branché API
- [x] **Tous les modals** — insertion réelle via API (Articles, Projets, Demandes, Mouvements, Transferts, Achats, Réceptions) — plus de toast sans persistance

---

## Phase 4 — Finition présentation [x]
**Durée estimée : 1-2h**
**Objectif : polish final avant démo**

- [x] **Equipements** — backend créé (model/controller/routes `/api/equipements`), table patchée (`designation`, `updated_at`), 20 équipements seedés avec affectations, frontend connecté API réelle
- [x] **Reporting** — route `/api/reporting` agrège projets/demandes/fournisseurs/mouvements/articles, frontend branché données réelles, unité M FCFA
- [ ] **Notifications** — reste mock pour la présentation
- [ ] Tester le workflow complet : Login → Demande → Validation → Stock

### Commandes à exécuter avant la démo
```bash
# Si la base tourne déjà (ajoute les colonnes manquantes) :
npm run patch --prefix backend

# Re-seed complet (équipements inclus) :
npm run seed:reel --prefix backend
```

---

## Phase 5 — Améliorations post-présentation [x]

### Réalisé
- [x] **Rôles manquants** — `RESP_LOGISTIQUE`, `DG`, `DAF`, `AUDITEUR`, `CHEF_CHANTIER` ajoutés dans `seed.js`
- [x] **Audit** — table `audit_logs` complétée (`reference`, `detail`, `ip`), route `GET /api/audit` (filtres action/entité/search), journal branché en temps réel (login, demandes, mouvements), page Audit connectée données réelles
- [x] **Notifications** — table `notifications` créée, route `GET /api/notifications` + `PUT /:id/read` + `POST /read-all`, 7 notifications seedées, page Notifications connectée + marquer lu persisté
- [x] **Paramètres** — onglets Utilisateurs, Rôles, Dépôts, Fournisseurs connectés API réelle ; Seuils restent éditables localement

### Commandes à exécuter
```bash
npm run patch --prefix backend     # ajoute colonnes audit_logs, equipments + crée notifications
npm run seed   --prefix backend    # seed rôles manquants + admin
npm run seed:reel --prefix backend # données SN complètes
```

### Reste à faire (complexité élevée)
- Mécanisme de réservation de stock à l'approbation d'une demande
- Suivi budget prévisionnel vs réel par lot budgétaire (`budget_lots` vs `purchase_orders`)
- Seuils de validation persistés en base (`parameter_rules` table)
- Commentaires sur demandes (`request_comments` table)
- Lignes de réception (`receipt_lines` table)
- Mise en place des interface , acces et profils pour chacun des roles et creer des utilisteur exapmles
