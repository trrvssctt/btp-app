const { query } = require('../db/pool');

async function get() {
  const { rows } = await query('SELECT * FROM company_settings LIMIT 1');
  return rows[0] || null;
}

async function update(data) {
  const {
    raison_sociale,
    logo_url,
    adresse,
    code_postal,
    ville,
    pays,
    telephone,
    email,
    site_web,
    ninea,
    registre_commerce,
    numero_tva,
    devise,
  } = data;

  // Récupérer l'enregistrement existant
  const existing = await get();

  if (!existing) {
    // Créer si n'existe pas
    const { rows } = await query(
      `INSERT INTO company_settings (
        raison_sociale, logo_url, adresse, code_postal, ville, pays,
        telephone, email, site_web, ninea, registre_commerce, numero_tva, devise
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [raison_sociale, logo_url, adresse, code_postal, ville, pays, telephone, email, site_web, ninea, registre_commerce, numero_tva, devise],
    );
    return rows[0];
  }

  // Mettre à jour
  const { rows } = await query(
    `UPDATE company_settings
     SET raison_sociale = $1, logo_url = $2, adresse = $3, code_postal = $4,
         ville = $5, pays = $6, telephone = $7, email = $8, site_web = $9,
         ninea = $10, registre_commerce = $11, numero_tva = $12, devise = $13,
         updated_at = now()
     WHERE id = $14
     RETURNING *`,
    [raison_sociale, logo_url, adresse, code_postal, ville, pays, telephone, email, site_web, ninea, registre_commerce, numero_tva, devise, existing.id],
  );
  return rows[0];
}

module.exports = { get, update };
