const router = require('express').Router();
const ctrl = require('../controllers/notificationSettingsController');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate);

router.get('/', ctrl.list);
router.put('/:id', requireRole('ADMIN'), ctrl.update);

module.exports = router;
