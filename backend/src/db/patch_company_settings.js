#!/usr/bin/env node

/**
 * Patch : Création de la table company_settings pour les paramètres de l'entreprise
 * Usage: node patch_company_settings.js
 */

const { query } = require('./pool');

async function main() {
  console.log('[patch] Création de la table company_settings...');

  await query(`
    CREATE TABLE IF NOT EXISTS company_settings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      raison_sociale VARCHAR(200) NOT NULL,
      logo_url TEXT,
      adresse TEXT,
      code_postal VARCHAR(20),
      ville VARCHAR(100),
      pays VARCHAR(100) DEFAULT 'Sénégal',
      telephone VARCHAR(50),
      email VARCHAR(100),
      site_web VARCHAR(200),
      ninea VARCHAR(50),
      registre_commerce VARCHAR(50),
      numero_tva VARCHAR(50),
      devise VARCHAR(10) DEFAULT 'FCFA',
      created_at TIMESTAMP DEFAULT now(),
      updated_at TIMESTAMP DEFAULT now()
    )
  `);

  console.log('[patch] Table company_settings créée avec succès');

  // Vérifier s'il existe déjà un enregistrement
  const { rows } = await query('SELECT COUNT(*) as count FROM company_settings');

  if (parseInt(rows[0].count) === 0) {
    console.log('[patch] Insertion des paramètres par défaut...');

    await query(`
      INSERT INTO company_settings (
        raison_sociale,
        adresse,
        code_postal,
        ville,
        pays,
        telephone,
        email,
        ninea,
        registre_commerce,
        devise
      ) VALUES (
        'BTP Sénégal SARL',
        'Zone Industrielle, Route de Rufisque',
        'BP 5432',
        'Dakar',
        'Sénégal',
        '+221 33 123 45 67',
        'contact@btp-senegal.sn',
        'SN-DKR-2020-A-12345',
        'SN-DKR-2020-B-67890',
        'FCFA'
      )
    `);

    console.log('[patch] ✓ Paramètres par défaut insérés');
  } else {
    console.log('[patch] ⚠ Paramètres déjà existants, aucune insertion');
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('[patch] Erreur:', err);
  process.exit(1);
});
