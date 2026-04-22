const router = require('express').Router();
const ctrl = require('../controllers/depotController');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate);
router.get('/', ctrl.list);
router.get('/:id', ctrl.get);
router.post('/', requireRole('ADMIN'), ctrl.create);
router.put('/:id', requireRole('ADMIN'), ctrl.update);
router.delete('/:id', requireRole('ADMIN'), ctrl.remove);

module.exports = router;
