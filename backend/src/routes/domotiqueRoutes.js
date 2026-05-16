const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth');
const building = require('../controllers/domBuildingController');
const device   = require('../controllers/domDeviceController');
const reading  = require('../controllers/domReadingController');
const command  = require('../controllers/domCommandController');
const alert    = require('../controllers/domAlertController');
const rule     = require('../controllers/domRuleController');
const energy   = require('../controllers/domEnergyController');

// Toutes les routes domotique nécessitent une authentification + rôle ADMIN
router.use(authenticate);
router.use(requireRole('ADMIN'));

// ── Bâtiments ──────────────────────────────────────────────────────────────
router.get   ('/buildings',          building.list);
router.post  ('/buildings',          building.create);
router.put   ('/buildings/:id',      building.update);
router.delete('/buildings/:id',      building.delete);
router.get   ('/buildings/:id/tree', building.getTree);

// ── Hiérarchie ─────────────────────────────────────────────────────────────
router.post  ('/floors',         building.createFloor);
router.put   ('/floors/:id',     building.updateFloor);
router.delete('/floors/:id',     building.deleteFloor);
router.post  ('/zones',          building.createZone);
router.put   ('/zones/:id',      building.updateZone);
router.delete('/zones/:id',      building.deleteZone);
router.post  ('/apartments',     building.createApartment);
router.put   ('/apartments/:id', building.updateApartment);
router.delete('/apartments/:id', building.deleteApartment);
router.post  ('/rooms',          building.createRoom);
router.put   ('/rooms/:id',      building.updateRoom);
router.delete('/rooms/:id',      building.deleteRoom);

// ── Équipements ────────────────────────────────────────────────────────────
router.get ('/devices',     device.list);
router.get ('/devices/:id', device.get);
router.post('/devices',     device.create);
router.put ('/devices/:id', device.update);

// ── Commandes (actionneurs) ────────────────────────────────────────────────
router.get ('/commands',            command.list);
router.post('/devices/:id/command', command.send);

// ── Mesures IoT ────────────────────────────────────────────────────────────
router.get ('/readings', reading.list);
router.post('/readings', reading.ingest);   // ingest depuis gateway

// ── Alertes ────────────────────────────────────────────────────────────────
router.get('/alerts',             alert.list);
router.put('/alerts/:id/resolve', alert.resolve);

// ── Routines ───────────────────────────────────────────────────────────────
router.get   ('/rules',              rule.list);
router.get   ('/rules/:id',          rule.get);
router.post  ('/rules',              rule.create);
router.put   ('/rules/:id',          rule.update);
router.delete('/rules/:id',          rule.remove);
router.patch ('/rules/:id/enabled',  rule.toggle);
router.post  ('/rules/:id/trigger',  rule.trigger);

// ── Énergie ────────────────────────────────────────────────────────────────
router.get('/energy', energy.summary);

module.exports = router;
