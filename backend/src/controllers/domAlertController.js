const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/HttpError');
const m = require('../models/domAlertModel');

exports.list = asyncHandler(async (req, res) => {
  const resolved = req.query.resolved === undefined ? undefined : req.query.resolved === 'true';
  res.json({ data: await m.list({ resolved, severity: req.query.severity, building_id: req.query.building_id }) });
});

exports.resolve = asyncHandler(async (req, res) => {
  const a = await m.resolve(req.params.id);
  if (!a) throw new HttpError(404, 'Alert not found');
  res.json({ data: a });
});
