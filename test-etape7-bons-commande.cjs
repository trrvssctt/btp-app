#!/usr/bin/env node

/**
 * Script de test automatique — ÉTAPE 7 du scénario
 * Création des 3 bons de commande de l'acheteur Moussa Faye
 *
 * Usage: node test-etape7-bons-commande.js
 */

const axios = require('axios');

const API_URL = 'http://localhost:9000/api';
const CREDENTIALS = {
  email: 'moussa.faye@btp-sn.com',
  password: 'Moussa2025!'
};

// Articles IDs (à récupérer dynamiquement)
const ARTICLES = {};
const SUPPLIERS = {};

async function login() {
  console.log('\n🔐 Connexion en tant qu\'ACHETEUR (Moussa Faye)...');
  const { data } = await axios.post(`${API_URL}/auth/login`, CREDENTIALS);
  console.log(`✓ Connecté : ${data.data.user.nom} (${data.data.user.roles[0]})`);
  return data.data.token;
}

async function loadReferentials(token) {
  console.log('\n📦 Chargement des référentiels...');

  // Charger les articles
  const { data: articlesData } = await axios.get(`${API_URL}/articles`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  articlesData.data.forEach(a => {
    ARTICLES[a.code] = { id: a.id, designation: a.designation, prix_moyen: parseFloat(a.prix_moyen) };
  });

  // Charger les fournisseurs
  const { data: suppliersData } = await axios.get(`${API_URL}/suppliers`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  suppliersData.data.forEach(s => {
    SUPPLIERS[s.code] = { id: s.id, raison_sociale: s.raison_sociale };
  });

  console.log(`✓ ${Object.keys(ARTICLES).length} articles chargés`);
  console.log(`✓ ${Object.keys(SUPPLIERS).length} fournisseurs chargés`);
}

async function createBC001(token) {
  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📝 Création BC-2026-001 — Câblage électrique (SENICO)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const lignes = [
    { code: 'CAB-3G25', quantite: 12, prix_unitaire: 87000 },
    { code: 'CAB-3G15', quantite: 18, prix_unitaire: 63500 },
    { code: 'INTER-SIMPLE', quantite: 45, prix_unitaire: 4200 },
    { code: 'PRISE-2P', quantite: 60, prix_unitaire: 5500 },
    { code: 'DISJONCT-25A', quantite: 20, prix_unitaire: 11800 },
  ];

  const payload = {
    supplier_id: SUPPLIERS['SENICO'].id,
    statut: 'ENVOYEE',
    lignes: lignes.map(l => ({
      article_id: ARTICLES[l.code].id,
      quantite: l.quantite,
      prix_unitaire: l.prix_unitaire
    }))
  };

  console.log('Lignes de commande :');
  lignes.forEach(l => {
    const subtotal = l.quantite * l.prix_unitaire;
    console.log(`  ${l.code.padEnd(15)} × ${String(l.quantite).padStart(3)} → ${l.prix_unitaire.toLocaleString('fr-SN').padStart(10)} FCFA/u = ${subtotal.toLocaleString('fr-SN').padStart(12)} FCFA`);
  });

  const total = lignes.reduce((s, l) => s + (l.quantite * l.prix_unitaire), 0);
  console.log(`\n  TOTAL ATTENDU : ${total.toLocaleString('fr-SN')} FCFA (2 942 000 FCFA selon scénario)\n`);

  const { data } = await axios.post(`${API_URL}/purchase-orders`, payload, {
    headers: { Authorization: `Bearer ${token}` }
  });

  console.log(`✅ BC créé : ${data.data.numero}`);
  console.log(`   Montant  : ${parseFloat(data.data.montant_total).toLocaleString('fr-SN')} FCFA`);
  console.log(`   Statut   : ${data.data.statut}`);

  return data.data;
}

async function createBC002(token) {
  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📝 Création BC-2026-002 — EPI (BTP-DEPOT)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const lignes = [
    { code: 'EPI-SN-CAS', quantite: 50, prix_unitaire: 3500 },
    { code: 'EPI-SN-GANT', quantite: 100, prix_unitaire: 2500 },
    { code: 'EPI-SN-VIS', quantite: 50, prix_unitaire: 8500 },
    { code: 'EPI-SN-LUNE', quantite: 50, prix_unitaire: 3000 },
  ];

  const payload = {
    supplier_id: SUPPLIERS['BTP-DEPOT'].id,
    statut: 'ENVOYEE',
    lignes: lignes.map(l => ({
      article_id: ARTICLES[l.code].id,
      quantite: l.quantite,
      prix_unitaire: l.prix_unitaire
    }))
  };

  console.log('Lignes de commande :');
  lignes.forEach(l => {
    const subtotal = l.quantite * l.prix_unitaire;
    console.log(`  ${l.code.padEnd(15)} × ${String(l.quantite).padStart(3)} → ${l.prix_unitaire.toLocaleString('fr-SN').padStart(10)} FCFA/u = ${subtotal.toLocaleString('fr-SN').padStart(12)} FCFA`);
  });

  const total = lignes.reduce((s, l) => s + (l.quantite * l.prix_unitaire), 0);
  console.log(`\n  TOTAL ATTENDU : ${total.toLocaleString('fr-SN')} FCFA\n`);

  const { data } = await axios.post(`${API_URL}/purchase-orders`, payload, {
    headers: { Authorization: `Bearer ${token}` }
  });

  console.log(`✅ BC créé : ${data.data.numero}`);
  console.log(`   Montant  : ${parseFloat(data.data.montant_total).toLocaleString('fr-SN')} FCFA`);
  console.log(`   Statut   : ${data.data.statut}`);

  return data.data;
}

async function createBC003(token) {
  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📝 Création BC-2026-003 — Carrelage internat (CFAO-BTP)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const lignes = [
    { code: 'CARREL-30', quantite: 420, prix_unitaire: 8200 },
    { code: 'CARREL-MURAL', quantite: 180, prix_unitaire: 11500 },
    { code: 'CIMENT-COLLE', quantite: 80, prix_unitaire: 4000 },
    { code: 'PEINTURE-INT', quantite: 20, prix_unitaire: 34000 },
  ];

  const payload = {
    supplier_id: SUPPLIERS['CFAO-BTP'].id,
    statut: 'ENVOYEE',
    lignes: lignes.map(l => ({
      article_id: ARTICLES[l.code].id,
      quantite: l.quantite,
      prix_unitaire: l.prix_unitaire
    }))
  };

  console.log('Lignes de commande :');
  lignes.forEach(l => {
    const subtotal = l.quantite * l.prix_unitaire;
    console.log(`  ${l.code.padEnd(15)} × ${String(l.quantite).padStart(3)} → ${l.prix_unitaire.toLocaleString('fr-SN').padStart(10)} FCFA/u = ${subtotal.toLocaleString('fr-SN').padStart(12)} FCFA`);
  });

  const total = lignes.reduce((s, l) => s + (l.quantite * l.prix_unitaire), 0);
  console.log(`\n  TOTAL ATTENDU : ${total.toLocaleString('fr-SN')} FCFA\n`);

  const { data } = await axios.post(`${API_URL}/purchase-orders`, payload, {
    headers: { Authorization: `Bearer ${token}` }
  });

  console.log(`✅ BC créé : ${data.data.numero}`);
  console.log(`   Montant  : ${parseFloat(data.data.montant_total).toLocaleString('fr-SN')} FCFA`);
  console.log(`   Statut   : ${data.data.statut}`);

  return data.data;
}

async function verifySummary(token) {
  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 VÉRIFICATION — Liste des bons de commande');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const { data } = await axios.get(`${API_URL}/purchase-orders`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const bcs2026 = data.data.filter(bc => bc.numero.startsWith('BC-2026-'));

  console.log('Bons de commande 2026 créés :');
  bcs2026.forEach(bc => {
    console.log(`  ${bc.numero} | ${bc.supplier_nom.padEnd(35)} | ${parseFloat(bc.montant_total).toLocaleString('fr-SN').padStart(12)} FCFA | ${bc.statut}`);
  });

  const totalBC = bcs2026.reduce((s, bc) => s + parseFloat(bc.montant_total), 0);
  console.log(`\n  TOTAL DES 3 BC : ${totalBC.toLocaleString('fr-SN')} FCFA`);
}

async function main() {
  try {
    console.log('\n╔══════════════════════════════════════════════════════════════════╗');
    console.log('║  TEST AUTOMATIQUE — ÉTAPE 7 DU SCÉNARIO BTP MANAGER             ║');
    console.log('║  Création des bons de commande par l\'ACHETEUR                   ║');
    console.log('╚══════════════════════════════════════════════════════════════════╝');

    const token = await login();
    await loadReferentials(token);

    const bc1 = await createBC001(token);
    const bc2 = await createBC002(token);
    const bc3 = await createBC003(token);

    await verifySummary(token);

    console.log('\n\n✅ ÉTAPE 7 COMPLÉTÉE AVEC SUCCÈS\n');
    console.log('Prochaine étape : ÉTAPE 8 — Réception marchandises (MAGASINIER)\n');

  } catch (error) {
    console.error('\n❌ ERREUR :', error.response?.data || error.message);
    process.exit(1);
  }
}

main();
