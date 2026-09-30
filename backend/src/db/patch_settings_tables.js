#!/usr/bin/env node

/**
 * Patch : tables de configuration
 *  - validation_rules      : seuils du circuit de validation des demandes
 *  - notification_settings : préférences de notifications (globales)
 * Usage: node src/db/patch_settings_tables.js
 */

const { query } = require('./pool');

async function main() {
  console.log('[patch] Création de la table validation_rules...');
  await query(`
    CREATE TABLE IF NOT EXISTS validation_rules (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code VARCHAR(60) NOT NULL UNIQUE,
      libelle VARCHAR(200) NOT NULL,
      seuil_montant NUMERIC(15,2) NOT NULL DEFAULT 0,
      unite VARCHAR(10) NOT NULL DEFAULT 'FCFA',
      escalade VARCHAR(120),
      actif BOOLEAN NOT NULL DEFAULT true,
      ordre INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT now(),
      updated_at TIMESTAMP DEFAULT now()
    )
  `);

  const { rows: vr } = await query('SELECT COUNT(*)::int AS c FROM validation_rules');
  if (vr[0].c === 0) {
    console.log('[patch] Insertion des seuils par défaut...');
    await query(`
      INSERT INTO validation_rules (code, libelle, seuil_montant, unite, escalade, actif, ordre) VALUES
      ('VALIDATION_TECH',      'Validation technique requise',        500000,   'FCFA', 'Responsable Technique',   true, 1),
      ('VALIDATION_BUDGET',    'Validation budgétaire requise',       2000000,  'FCFA', 'Chef de Projet',          true, 2),
      ('VALIDATION_DIRECTION', 'Validation direction requise',        10000000, 'FCFA', 'DG / DAF',                true, 3),
      ('BLOCAGE_BUDGET',       'Blocage dépassement budget projet',   95,       '%',    'Escalade automatique',    true, 4)
    `);
    console.log('[patch] ✓ Seuils par défaut insérés');
  } else {
    console.log('[patch] ⚠ validation_rules déjà peuplée');
  }

  console.log('[patch] Création de la table notification_settings...');
  await query(`
    CREATE TABLE IF NOT EXISTS notification_settings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code VARCHAR(60) NOT NULL UNIQUE,
      libelle VARCHAR(200) NOT NULL,
      description TEXT,
      canal_systeme BOOLEAN NOT NULL DEFAULT true,
      canal_email BOOLEAN NOT NULL DEFAULT false,
      actif BOOLEAN NOT NULL DEFAULT true,
      ordre INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT now(),
      updated_at TIMESTAMP DEFAULT now()
    )
  `);

  const { rows: ns } = await query('SELECT COUNT(*)::int AS c FROM notification_settings');
  if (ns[0].c === 0) {
    console.log('[patch] Insertion des préférences de notifications par défaut...');
    await query(`
      INSERT INTO notification_settings (code, libelle, description, canal_systeme, canal_email, actif, ordre) VALUES
      ('DEMANDE_SOUMISE',    'Demande soumise',            'Une nouvelle demande est soumise pour validation',       true, true,  true, 1),
      ('DEMANDE_VALIDEE',    'Demande validée',            'Une demande franchit une étape de validation',           true, true,  true, 2),
      ('DEMANDE_REJETEE',    'Demande rejetée',            'Une demande est rejetée',                                true, true,  true, 3),
      ('COMPLEMENT_REQUIS',  'Complément requis',          'Un complément d''information est demandé',               true, true,  true, 4),
      ('BC_APPROUVE',        'Bon de commande approuvé',   'Un bon de commande est prêt à être émis',                true, false, true, 5),
      ('RECEPTION_STOCK',    'Réception marchandises',     'Une réception met à jour le stock',                      true, false, true, 6),
      ('ALERTE_SEUIL',       'Alerte seuil de stock',      'Un article passe sous son seuil minimum',                true, true,  true, 7)
    `);
    console.log('[patch] ✓ Préférences par défaut insérées');
  } else {
    console.log('[patch] ⚠ notification_settings déjà peuplée');
  }

  console.log('[patch] Terminé.');
  process.exit(0);
}

main().catch((err) => {
  console.error('[patch] Erreur:', err);
  process.exit(1);
});
