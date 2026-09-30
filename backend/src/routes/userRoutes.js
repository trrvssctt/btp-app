const router = require('express').Router();
const ctrl = require('../controllers/userController');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate);

// Annuaire (id, nom, rôles) : tout utilisateur connecté — listes de destinataires,
// responsables, etc. La liste complète des comptes reste réservée au pilotage.
router.get('/annuaire', ctrl.directory);

// Lecture : rôles de pilotage
router.get('/', requireRole('ADMIN', 'RESP_TECHNIQUE', 'CONTROLEUR', 'CHEF_PROJET'), ctrl.list);

// Écriture : ADMIN uniquement
router.post('/', requireRole('ADMIN'), ctrl.create);
router.put('/:id', requireRole('ADMIN'), ctrl.update);
router.delete('/:id', requireRole('ADMIN'), ctrl.remove);

module.exports = router;
