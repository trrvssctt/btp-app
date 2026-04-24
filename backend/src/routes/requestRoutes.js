const router = require('express').Router();
const ctrl = require('../controllers/requestController');
const { authenticate, requirePermission } = require('../middleware/auth');

router.use(authenticate);

router.get('/', ctrl.list);
router.get('/:id', ctrl.get);
router.post('/', requirePermission('REQUEST_CREATE'), ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.cancel);
router.post('/:id/approvals', ctrl.addApproval);
router.post('/:id/complement', ctrl.requestComplement);
router.post('/:id/resubmit', ctrl.resubmit);

module.exports = router;
