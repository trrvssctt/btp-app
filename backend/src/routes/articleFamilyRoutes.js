const router = require('express').Router();
const ctrl = require('../controllers/articleFamilyController');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate);

router.get('/', ctrl.list);
router.get('/:id', ctrl.get);
// Aligné sur la page /parametres/familles (ADMIN, MAGASINIER) ; suppression : ADMIN.
router.post('/', requireRole('ADMIN', 'MAGASINIER'), ctrl.create);
router.put('/:id', requireRole('ADMIN', 'MAGASINIER'), ctrl.update);
router.delete('/:id', requireRole('ADMIN'), ctrl.remove);

module.exports = router;
