const { z } = require('zod');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate');
const HttpError = require('../utils/HttpError');
const cm = require('../models/domCommandModel');
const dm = require('../models/domDeviceModel');
const mqttService = require('../services/mqttService');

const commandSchema = z.object({
  command: z.string().min(1).max(50),
  payload: z.record(z.unknown()).optional().nullable(),
  reason:  z.string().max(300).optional().nullable(),
});

exports.list = asyncHandler(async (req, res) => {
  res.json({ data: await cm.list({ device_id: req.query.device_id, limit: Number(req.query.limit) || 50 }) });
});

exports.send = [validate(commandSchema), asyncHandler(async (req, res) => {
  const device = await dm.findById(req.params.id);
  if (!device) throw new HttpError(404, 'Device not found');
  if (device.category === 'sensor') throw new HttpError(400, 'Ce capteur ne supporte pas les commandes');

  let cmd;
  if (device.mqtt_command_topic) {
    // Équipement relié au broker : la commande est réellement publiée
    const pending = await cm.create({
      device_id: device.id,
      command:   req.body.command,
      payload:   req.body.payload,
      reason:    req.body.reason,
      sent_by:   req.user?.id ?? null,
    });
    const ok = await mqttService.publishCommand(device, req.body.command, req.body.payload);
    cmd = await cm.updateStatus(pending.id, ok ? 'EXECUTED' : 'FAILED', ok ? new Date().toISOString() : null);
  } else {
    cmd = await cm.createWithHistory({
      device_id:       device.id,
      command:         req.body.command,
      payload:         req.body.payload,
      reason:          req.body.reason,
      sent_by:         req.user?.id ?? null,
      _device_status:  device.status,
    });
  }

  if (cmd.status === 'EXECUTED') {
    const newValue = req.body.command === 'ON' ? 'ON' : req.body.command === 'OFF' ? 'OFF' : req.body.command;
    await dm.update(device.id, { last_value: newValue, last_seen_at: new Date().toISOString() });
  }

  res.status(201).json({ data: cmd });
})];
