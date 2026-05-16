const { z } = require('zod');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate');
const HttpError = require('../utils/HttpError');
const m = require('../models/domBuildingModel');

const buildingSchema = z.object({
  name:    z.string().min(1).max(200),
  address: z.string().max(300).optional().nullable(),
  status:  z.enum(['active', 'inactive']).optional(),
});

const floorSchema = z.object({
  building_id: z.string().uuid(),
  name:        z.string().min(1).max(100),
  level_num:   z.coerce.number().int().optional(),
});

const zoneSchema = z.object({
  floor_id: z.string().uuid(),
  name:     z.string().min(1).max(100),
  type:     z.enum(['common_area', 'technical']).optional(),
});

const aptSchema = z.object({
  floor_id: z.string().uuid(),
  number:   z.string().min(1).max(20),
});

const roomSchema = z.object({
  apartment_id: z.string().uuid(),
  name:         z.string().min(1).max(100),
  usage:        z.string().max(50).optional(),
});

exports.list = asyncHandler(async (_req, res) => {
  res.json({ data: await m.listBuildings() });
});

exports.getTree = asyncHandler(async (req, res) => {
  const tree = await m.getTree(req.params.id);
  if (!tree) throw new HttpError(404, 'Building not found');
  res.json({ data: tree });
});

exports.create = [validate(buildingSchema), asyncHandler(async (req, res) => {
  res.status(201).json({ data: await m.createBuilding(req.body) });
})];

exports.update = [validate(buildingSchema.partial()), asyncHandler(async (req, res) => {
  const b = await m.updateBuilding(req.params.id, req.body);
  if (!b) throw new HttpError(404, 'Building not found');
  res.json({ data: b });
})];

exports.delete = asyncHandler(async (req, res) => {
  await m.deleteBuilding(req.params.id);
  res.status(204).end();
});

exports.createFloor = [validate(floorSchema), asyncHandler(async (req, res) => {
  res.status(201).json({ data: await m.createFloor(req.body) });
})];
exports.updateFloor = [validate(floorSchema.partial()), asyncHandler(async (req, res) => {
  const f = await m.updateFloor(req.params.id, req.body);
  if (!f) throw new HttpError(404, 'Floor not found');
  res.json({ data: f });
})];
exports.deleteFloor = asyncHandler(async (req, res) => {
  await m.deleteFloor(req.params.id);
  res.status(204).end();
});

exports.createZone = [validate(zoneSchema), asyncHandler(async (req, res) => {
  res.status(201).json({ data: await m.createZone(req.body) });
})];
exports.updateZone = [validate(zoneSchema.partial()), asyncHandler(async (req, res) => {
  const z = await m.updateZone(req.params.id, req.body);
  if (!z) throw new HttpError(404, 'Zone not found');
  res.json({ data: z });
})];
exports.deleteZone = asyncHandler(async (req, res) => {
  await m.deleteZone(req.params.id);
  res.status(204).end();
});

exports.createApartment = [validate(aptSchema), asyncHandler(async (req, res) => {
  res.status(201).json({ data: await m.createApartment(req.body) });
})];
exports.updateApartment = [validate(aptSchema.partial()), asyncHandler(async (req, res) => {
  const a = await m.updateApartment(req.params.id, req.body);
  if (!a) throw new HttpError(404, 'Apartment not found');
  res.json({ data: a });
})];
exports.deleteApartment = asyncHandler(async (req, res) => {
  await m.deleteApartment(req.params.id);
  res.status(204).end();
});

exports.createRoom = [validate(roomSchema), asyncHandler(async (req, res) => {
  res.status(201).json({ data: await m.createRoom(req.body) });
})];
exports.updateRoom = [validate(roomSchema.partial()), asyncHandler(async (req, res) => {
  const r = await m.updateRoom(req.params.id, req.body);
  if (!r) throw new HttpError(404, 'Room not found');
  res.json({ data: r });
})];
exports.deleteRoom = asyncHandler(async (req, res) => {
  await m.deleteRoom(req.params.id);
  res.status(204).end();
});
