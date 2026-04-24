const router = require('express').Router();
const ctrl = require('../controllers/purchaseOrderController');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate);

router.get('/', ctrl.list);
router.get('/:id', ctrl.get);
router.post('/', requireRole('ADMIN', 'RESP_LOGISTIQUE', 'ACHETEUR'), ctrl.create);

module.exports = router;
