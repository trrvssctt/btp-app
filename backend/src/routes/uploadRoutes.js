const router = require('express').Router();
const ctrl = require('../controllers/uploadController');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate);

router.post('/image', requireRole('ADMIN'), ctrl.uploadImage);

module.exports = router;
