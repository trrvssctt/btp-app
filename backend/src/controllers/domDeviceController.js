const { z } = require('zod');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate');
const HttpError = require('../utils/HttpError');
const m = require('../models/domDeviceModel');

const deviceSchema = z.object({
  id:                z.string().min(1).max(50),
  unique_identifier: z.string().min(1).max(200),
  name:              z.string().min(1).max(200),
  type:              z.string().min(1).max(100),
  category:          z.enum(['sensor', 'actuator', 'hybrid']).optional(),
  protocol:          z.string().max(50).optional(),
  status:            z.enum(['online', 'offline', 'alert']).optional(),
  actif:             z.boolean().optional(),
  location:          z.string().max(300).optional().nullable(),
  building_id:       z.string().uuid().optional().nullable(),
  floor_id:          z.string().uuid().optional().nullable(),
  apartment_id:      z.string().uuid().optional().nullable(),
  room_id:           z.string().uuid().optional().nullable(),
  last_value:        z.string().max(100).optional().nullable(),
  unit:              z.string().max(20).optional().nullable(),
  energy_profile: z.object({
    nominal_power_watt:    z.coerce.number().positive(),
    kwh_price:             z.coerce.number().nonnegative().optional(),
    daily_threshold_kwh:   z.coerce.number().nonnegative().optional().nullable(),
    monthly_threshold_kwh: z.coerce.number().nonnegative().optional().nullable(),
    can_be_auto_cut:       z.boolean().optional(),
    priority:              z.enum(['low', 'normal', 'critical']).optional(),
  }).optional().nullable(),
});

exports.list = asyncHandler(async (req, res) => {
  const data = await m.list({
    building_id: req.query.building_id,
    type:        req.query.type,
    category:    req.query.category,
    status:      req.query.status,
    search:      req.query.search,
  });
  res.json({ data });
});

exports.get = asyncHandler(async (req, res) => {
  const d = await m.findById(req.params.id);
  if (!d) throw new HttpError(404, 'Device not found');
  res.json({ data: d });
});

exports.create = [validate(deviceSchema), asyncHandler(async (req, res) => {
  const { energy_profile, ...deviceData } = req.body;
  const device = await m.create(deviceData);
  if (energy_profile) await m.upsertEnergyProfile(device.id, energy_profile);
  res.status(201).json({ data: await m.findById(device.id) });
})];

exports.update = [validate(deviceSchema.partial()), asyncHandler(async (req, res) => {
  const { energy_profile, ...deviceData } = req.body;
  const device = await m.update(req.params.id, deviceData);
  if (!device) throw new HttpError(404, 'Device not found');
  if (energy_profile) await m.upsertEnergyProfile(device.id, energy_profile);
  res.json({ data: await m.findById(device.id) });
})];
