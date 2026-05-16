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

exports.createFloor = [validate(floorSchema), asyncHandler(async (req, res) => {
  res.status(201).json({ data: await m.createFloor(req.body) });
})];

exports.createZone = [validate(zoneSchema), asyncHandler(async (req, res) => {
  res.status(201).json({ data: await m.createZone(req.body) });
})];

exports.createApartment = [validate(aptSchema), asyncHandler(async (req, res) => {
  res.status(201).json({ data: await m.createApartment(req.body) });
})];

exports.createRoom = [validate(roomSchema), asyncHandler(async (req, res) => {
  res.status(201).json({ data: await m.createRoom(req.body) });
})];
