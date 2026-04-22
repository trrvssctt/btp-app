const { z } = require('zod');
const asyncHandler = require('../utils/asyncHandler');
const authService = require('../services/authService');
const auditLog = require('../utils/auditLog');

const registerSchema = z.object({
  email: z.string().email(),
  nom: z.string().min(2).max(120),
  password: z.string().min(8).max(120),
  role: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

exports.register = [
  require('../middleware/validate')(registerSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.register(req.body);
    res.status(201).json({ data: result });
  }),
];

exports.login = [
  require('../middleware/validate')(loginSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.login(req.body);
    auditLog({ req, actor_id: result.user.id, action: 'LOGIN', entity_type: 'Session', detail: 'Connexion réussie' });
    res.json({ data: result });
  }),
];

exports.me = asyncHandler(async (req, res) => {
  const user = await authService.me(req.user.id);
  res.json({ data: user });
});
