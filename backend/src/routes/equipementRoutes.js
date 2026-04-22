const router = require('express').Router();
const ctrl = require('../controllers/equipementController');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate);
router.get('/', ctrl.list);
router.get('/:id', ctrl.get);
router.post('/', requireRole('ADMIN', 'MAGASINIER', 'CHEF_PROJET'), ctrl.create);
router.put('/:id', requireRole('ADMIN', 'MAGASINIER', 'CHEF_PROJET'), ctrl.update);

module.exports = router;
