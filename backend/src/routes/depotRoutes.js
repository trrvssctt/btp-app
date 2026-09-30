const router = require('express').Router();
const ctrl = require('../controllers/depotController');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate);
router.get('/', ctrl.list);
router.get('/:id', ctrl.get);
// Aligné sur la page /parametres/depots (ADMIN, RESP_LOGISTIQUE) ; suppression : ADMIN.
router.post('/', requireRole('ADMIN', 'RESP_LOGISTIQUE'), ctrl.create);
router.put('/:id', requireRole('ADMIN', 'RESP_LOGISTIQUE'), ctrl.update);
router.delete('/:id', requireRole('ADMIN'), ctrl.remove);

module.exports = router;
