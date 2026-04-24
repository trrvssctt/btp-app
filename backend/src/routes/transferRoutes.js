const router = require('express').Router();
const ctrl = require('../controllers/transferController');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate);

router.get('/', ctrl.list);
router.get('/:id', ctrl.get);
router.post('/', requireRole('ADMIN', 'MAGASINIER', 'RESP_LOGISTIQUE'), ctrl.create);
router.post('/:id/statut', requireRole('ADMIN', 'MAGASINIER', 'RESP_LOGISTIQUE'), ctrl.updateStatut);
router.delete('/:id', requireRole('ADMIN'), ctrl.remove);

module.exports = router;
