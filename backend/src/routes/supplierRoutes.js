const router = require('express').Router();
const ctrl = require('../controllers/supplierController');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate);
router.get('/', ctrl.list);
router.get('/:id', ctrl.get);
router.post('/', requireRole('ADMIN', 'ACHETEUR'), ctrl.create);
router.put('/:id', requireRole('ADMIN', 'ACHETEUR'), ctrl.update);
router.delete('/:id', requireRole('ADMIN'), ctrl.remove);

module.exports = router;
