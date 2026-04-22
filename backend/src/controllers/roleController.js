const { z } = require('zod');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate');
const HttpError = require('../utils/HttpError');
const model = require('../models/roleModel');

const roleSchema = z.object({
  code: z.string().min(1).max(40),
  libelle: z.string().min(2).max(100),
});

const permissionSchema = z.object({
  code: z.string().min(1).max(40),
  libelle: z.string().min(2).max(100),
});

exports.listRoles = asyncHandler(async (req, res) => {
  res.json({ data: await model.listRoles() });
});

exports.getRole = asyncHandler(async (req, res) => {
  const r = await model.getRoleById(req.params.id);
  if (!r) throw new HttpError(404, 'Role not found');
  res.json({ data: r });
});

exports.createRole = [
  validate(roleSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json({ data: await model.createRole(req.body) });
  }),
];

exports.updateRole = [
  validate(roleSchema.partial()),
  asyncHandler(async (req, res) => {
    const updated = await model.updateRole(req.params.id, req.body);
    if (!updated) throw new HttpError(404, 'Role not found');
    res.json({ data: updated });
  }),
];

exports.removeRole = asyncHandler(async (req, res) => {
  await model.removeRole(req.params.id);
  res.status(204).end();
});

// Permissions
exports.listPermissions = asyncHandler(async (req, res) => {
  res.json({ data: await model.listPermissions() });
});

exports.assignPermission = [
  validate(z.object({ permission_id: z.string().uuid() })),
  asyncHandler(async (req, res) => {
    await model.assignPermission(req.params.id, req.body.permission_id);
    res.status(204).end();
  }),
];

exports.removePermission = asyncHandler(async (req, res) => {
  await model.removePermission(req.params.id, req.params.permission_id);
  res.status(204).end();
});
