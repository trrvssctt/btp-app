const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/HttpError');
const mqttService = require('../services/mqttService');

exports.status = asyncHandler(async (_req, res) => {
  res.json({ data: mqttService.status() });
});

exports.discover = asyncHandler(async (req, res) => {
  const seconds = Math.min(Math.max(Number(req.query.seconds) || 5, 1), 15);
  const filter = req.query.filter || '#';
  try {
    res.json({ data: await mqttService.discover({ filter, seconds }) });
  } catch (err) {
    throw new HttpError(502, `Broker MQTT : ${err.message}`);
  }
});
