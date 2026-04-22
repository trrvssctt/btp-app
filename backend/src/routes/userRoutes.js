const router = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const { authenticate, requireRole } = require('../middleware/auth');
const { query } = require('../db/pool');

router.use(authenticate);
router.use(requireRole('ADMIN', 'RESP_TECHNIQUE', 'CONTROLEUR'));

router.get('/', asyncHandler(async (_req, res) => {
  const { rows } = await query(
    `SELECT
       u.id, u.email, u.nom, u.actif, u.created_at,
       ARRAY_AGG(DISTINCT r.code)   FILTER (WHERE r.code IS NOT NULL) AS roles,
       ARRAY_AGG(DISTINCT r.libelle) FILTER (WHERE r.libelle IS NOT NULL) AS role_libelles
     FROM users u
     LEFT JOIN user_roles ur ON ur.user_id = u.id
     LEFT JOIN roles r ON r.id = ur.role_id
     GROUP BY u.id
     ORDER BY u.nom`,
  );
  res.json({ data: rows });
}));

module.exports = router;
