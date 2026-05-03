const router = require('express').Router();
const ctrl = require('../controllers/equipementController');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate);

// CRUD équipement
router.get('/',    ctrl.list);
router.get('/:id', ctrl.get);
router.post('/',   requireRole('ADMIN', 'MAGASINIER', 'CHEF_PROJET', 'RESP_LOGISTIQUE'), ctrl.create);
router.put('/:id', requireRole('ADMIN', 'MAGASINIER', 'CHEF_PROJET', 'RESP_LOGISTIQUE'), ctrl.update);

// Affectations (UC-11)
router.get( '/:id/affectations',                requireRole('ADMIN', 'MAGASINIER', 'RESP_LOGISTIQUE', 'CHEF_PROJET', 'CONDUCTEUR'), ctrl.listAssignments);
router.post('/:id/affectations',                requireRole('ADMIN', 'MAGASINIER', 'RESP_LOGISTIQUE'), ctrl.createAssignment);
router.put( '/:id/affectations/:affId/retour',  requireRole('ADMIN', 'MAGASINIER', 'RESP_LOGISTIQUE'), ctrl.returnEquipment);

module.exports = router;
