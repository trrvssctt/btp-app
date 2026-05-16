const { z } = require('zod');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate');
const HttpError = require('../utils/HttpError');
const rm = require('../models/domReadingModel');
const dm = require('../models/domDeviceModel');

const ingestSchema = z.object({
  device_id:  z.string().min(1),
  value:      z.coerce.number(),
  unit:       z.string().max(20).optional().nullable(),
  timestamp:  z.string().datetime().optional().nullable(),
  metadata:   z.record(z.unknown()).optional().nullable(),
});

exports.list = asyncHandler(async (req, res) => {
  const data = await rm.list({
    device_id: req.query.device_id,
    limit:     req.query.limit ? Number(req.query.limit) : 100,
    since:     req.query.since,
  });
  res.json({ data });
});

exports.ingest = [validate(ingestSchema), asyncHandler(async (req, res) => {
  const { device_id, value, unit, timestamp, metadata } = req.body;

  const device = await dm.findByUniqueId(device_id);
  if (!device) throw new HttpError(404, `Device inconnu : ${device_id}`);
  if (device.status === 'offline') {
    await dm.update(device.id, { status: 'online', last_seen_at: new Date().toISOString() });
  }

  const reading = await rm.create({
    device_id: device.id,
    value,
    unit: unit || device.unit,
    metadata,
    received_at: timestamp,
  });

  await dm.update(device.id, {
    last_value: String(value),
    last_seen_at: new Date().toISOString(),
  });

  res.status(201).json({ data: reading });
})];
