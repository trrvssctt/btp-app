const router = require('express').Router();
const ctrl = require('../controllers/companySettingsController');
const { authenticate, requireRole } = require('../middleware/auth');

// GET public : le branding (nom, logo, adresse) est affiché dès la page de login,
// avant authentification. Aucune donnée sensible n'est exposée.
router.get('/', ctrl.get);

// PUT réservé à l'ADMIN authentifié.
router.put('/', authenticate, requireRole('ADMIN'), ctrl.update);

module.exports = router;
