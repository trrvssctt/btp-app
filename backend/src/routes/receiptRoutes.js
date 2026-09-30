const router = require('express').Router();
const ctrl = require('../controllers/receiptController');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate);

router.get('/', ctrl.list);
router.get('/:id', ctrl.get);
router.post('/', requireRole('ADMIN', 'MAGASINIER', 'ACHETEUR', 'RESP_LOGISTIQUE'), ctrl.create);

module.exports = router;
