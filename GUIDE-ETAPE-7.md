# 📝 GUIDE PRATIQUE — ÉTAPE 7 : CRÉATION BON DE COMMANDE (ACHETEUR)

## 🎯 Objectif
Transformer les demandes approuvées en bons de commande fournisseur.

---

## 👤 Rôle concerné
**ACHETEUR** — Moussa Faye
- Email : `moussa.faye@btp-sn.com`
- Mot de passe : `Moussa2025!`

---

## 📋 Étapes à suivre

### 1️⃣ Connexion

1. Ouvrir l'application : http://localhost:5173
2. Se connecter avec les identifiants ACHETEUR
3. Vérifier l'accès au menu **Achats & commandes**

---

### 2️⃣ Création BC-2026-001 — Câblage électrique (SENICO)

**Navigation** : Menu → Achats → `+ Nouvelle commande`

**Formulaire** :
- **Fournisseur** : SENICO — Sanitaires & Électricité

**Lignes de commande** :

| Article | Code | Quantité | Prix unitaire (FCFA) |
|---------|------|----------|---------------------|
| Câble électrique 3G2.5 — rouleau 100 m | CAB-3G25 | 12 | 87 000 |
| Câble électrique 3G1.5 — rouleau 100 m | CAB-3G15 | 18 | 63 500 |
| Interrupteur simple allumage encastré | INTER-SIMPLE | 45 | 4 200 |
| Prise de courant 2P+T encastrée | PRISE-2P | 60 | 5 500 |
| Disjoncteur 25A modulaire | DISJONCT-25A | 20 | 11 800 |

**Calcul du montant total attendu** :
```
(12 × 87 000) + (18 × 63 500) + (45 × 4 200) + (60 × 5 500) + (20 × 11 800)
= 1 044 000 + 1 143 000 + 189 000 + 330 000 + 236 000
= 2 942 000 FCFA
```

**Actions** :
- Cliquer sur `+ Ligne` pour ajouter chaque article
- Sélectionner l'article dans le dropdown
- Saisir la quantité et le prix unitaire
- Vérifier le sous-total de chaque ligne
- Vérifier le **Total HT** : 2 942 000 FCFA
- Cliquer sur **`Émettre le BC`** (statut : `ENVOYEE`)

✅ **Résultat attendu** : BC-2026-001 créé avec statut `ENVOYEE`

---

### 3️⃣ Création BC-2026-002 — EPI (BTP-DEPOT)

**Fournisseur** : Dépôt BTP Dakar Distribution

**Lignes de commande** :

| Article | Code | Quantité | Prix unitaire (FCFA) |
|---------|------|----------|---------------------|
| Casque de chantier EN 397 | EPI-SN-CAS | 50 | 3 500 |
| Gants de manutention cuir | EPI-SN-GANT | 100 | 2 500 |
| Veste haute visibilité classe 2 | EPI-SN-VIS | 50 | 8 500 |
| Lunettes de protection polycarbonate | EPI-SN-LUNE | 50 | 3 000 |

**Montant total attendu** :
```
(50 × 3 500) + (100 × 2 500) + (50 × 8 500) + (50 × 3 000)
= 175 000 + 250 000 + 425 000 + 150 000
= 1 000 000 FCFA
```

**Action** : `Émettre le BC`

✅ **Résultat attendu** : BC-2026-002 créé

---

### 4️⃣ Création BC-2026-003 — Carrelage internat (CFAO-BTP)

**Fournisseur** : CFAO Matériaux Sénégal

**Lignes de commande** :

| Article | Code | Quantité | Prix unitaire (FCFA) |
|---------|------|----------|---------------------|
| Carrelage sol 30×30 cm — m² | CARREL-30 | 420 m² | 8 200 |
| Faïence murale 20×30 cm — m² | CARREL-MURAL | 180 m² | 11 500 |
| Colle carrelage gris — sac 25 kg | CIMENT-COLLE | 80 sacs | 4 000 |
| Peinture intérieure blanche — bidon 20 L | PEINTURE-INT | 20 pots | 34 000 |

**Montant total attendu** :
```
(420 × 8 200) + (180 × 11 500) + (80 × 4 000) + (20 × 34 000)
= 3 444 000 + 2 070 000 + 320 000 + 680 000
= 6 514 000 FCFA
```

**Action** : `Émettre le BC`

✅ **Résultat attendu** : BC-2026-003 créé

---

## ✅ Vérifications finales

### Tableau de bord Achats

Vérifier que les 3 bons de commande apparaissent dans la liste :

```
┌──────────────┬─────────────────────────────────────┬──────────────────┬────────┬─────────────────┬──────────┐
│ Numéro       │ Fournisseur                         │ Date             │ Lignes │ Montant         │ Statut   │
├──────────────┼─────────────────────────────────────┼──────────────────┼────────┼─────────────────┼──────────┤
│ BC-2026-001  │ SENICO — Sanitaires & Électricité   │ 21/05/2026       │ 5      │ 2 942 000 FCFA  │ ENVOYEE  │
│ BC-2026-002  │ Dépôt BTP Dakar Distribution        │ 21/05/2026       │ 4      │ 1 000 000 FCFA  │ ENVOYEE  │
│ BC-2026-003  │ CFAO Matériaux Sénégal              │ 21/05/2026       │ 4      │ 6 514 000 FCFA  │ ENVOYEE  │
└──────────────┴─────────────────────────────────────┴──────────────────┴────────┴─────────────────┴──────────┘

TOTAL DES 3 BC : 10 456 000 FCFA
```

### Journal d'audit

Menu → Audit → Vérifier les 3 créations de BC tracées :
- Action : `CREATE`
- Entité : `BonCommande`
- Utilisateur : `Moussa Faye`
- Référence : `BC-2026-001`, `BC-2026-002`, `BC-2026-003`

---

## 🔄 Prochaine étape

**ÉTAPE 8** — RÉCEPTION MARCHANDISES & MISE EN STOCK (MAGASINIER)
- Rôle : Ibrahima Sow (`ibrahima.sow@btp-sn.com` / `Ibrahim2025!`)
- Objectif : Réceptionner les livraisons et mettre à jour le stock

---

## 🤖 Test automatique

Pour tester automatiquement cette étape via API :

```bash
cd /home/dianka/Documents/BTP_Projec_V1
node test-etape7-bons-commande.js
```

Le script créera automatiquement les 3 bons de commande et affichera un rapport détaillé.

---

## 🐛 Dépannage

### Erreur "Champs obligatoires manquants"
- Vérifier que tous les champs sont remplis (fournisseur, article, quantité, prix)
- Le prix unitaire doit être > 0

### Article non trouvé dans la liste
- Vérifier que le seed a bien été exécuté : `npm run seed:reel --prefix backend`
- Les codes articles sont sensibles à la casse

### Erreur 401 Unauthorized
- Se déconnecter et se reconnecter
- Vérifier les identifiants ACHETEUR

### Backend non démarré
```bash
cd backend
npm run dev
```
Vérifier : http://localhost:3000/health

---

## 📊 Résumé des données

**Contexte métier** :
- Les 3 demandes de besoin (DM-2026-001, DM-2025-009, DM-2025-004) ont été approuvées par le DAF
- L'acheteur les transforme en bons de commande auprès des fournisseurs
- Les BC sont en statut `ENVOYEE` (commande transmise au fournisseur)
- Prochaine étape : réception des marchandises par le magasinier

**Articles concernés** : 13 références (câbles, EPI, carrelage, peinture)
**Fournisseurs sollicités** : 3 (SENICO, BTP-DEPOT, CFAO-BTP)
**Montant total engagé** : 10 456 000 FCFA

---

*Document généré pour le scénario de test BTP Manager — Étape 7/14*
