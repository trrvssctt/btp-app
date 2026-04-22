const router = require('express').Router();
const ctrl = require('../controllers/roleController');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate);
router.use(requireRole('ADMIN'));

router.get('/', ctrl.listRoles);
router.get('/:id', ctrl.getRole);
router.post('/', ctrl.createRole);
router.put('/:id', ctrl.updateRole);
router.delete('/:id', ctrl.removeRole);

// Permissions
router.get('/permissions/list', ctrl.listPermissions);
router.post('/:id/permissions', ctrl.assignPermission);
router.delete('/:id/permissions/:permission_id', ctrl.removePermission);

module.exports = router;
