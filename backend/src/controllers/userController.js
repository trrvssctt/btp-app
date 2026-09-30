const { z } = require('zod');
const bcrypt = require('bcrypt');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate');
const HttpError = require('../utils/HttpError');
const model = require('../models/userModel');
const auditLog = require('../utils/auditLog');

const createSchema = z.object({
  email: z.string().email(),
  nom: z.string().min(2).max(120),
  password: z.string().min(6).max(120),
  actif: z.boolean().optional(),
  roles: z.array(z.string()).optional(),
});

const updateSchema = z.object({
  email: z.string().email().optional(),
  nom: z.string().min(2).max(120).optional(),
  actif: z.boolean().optional(),
  password: z.string().min(6).max(120).optional().nullable(),
  roles: z.array(z.string()).optional(),
});

exports.list = asyncHandler(async (_req, res) => {
  res.json({ data: await model.listAll() });
});

exports.directory = asyncHandler(async (_req, res) => {
  res.json({ data: await model.listDirectory() });
});

exports.create = [
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const { email, nom, password, actif, roles } = req.body;
    const existing = await model.findByEmail(email);
    if (existing) throw new HttpError(409, 'Un utilisateur avec cet email existe déjà');

    const password_hash = await bcrypt.hash(password, 10);
    const user = await model.create({ email, nom, password_hash });

    if (typeof actif === 'boolean' && actif === false) {
      await model.update(user.id, { actif: false });
    }
    await model.syncRoles(user.id, roles && roles.length ? roles : ['DEMANDEUR']);

    auditLog({ req, action: 'CREATE', entity_type: 'Utilisateur', entity_id: user.id, reference: user.email, detail: `Création utilisateur — rôles: ${(roles || []).join(', ') || 'DEMANDEUR'}` });
    const fresh = (await model.listAll()).find((u) => u.id === user.id);
    res.status(201).json({ data: fresh });
  }),
];

exports.update = [
  validate(updateSchema),
  asyncHandler(async (req, res) => {
    const { email, nom, actif, password, roles } = req.body;
    const target = await model.findById(req.params.id);
    if (!target) throw new HttpError(404, 'Utilisateur introuvable');

    // Empêcher un doublon d'email
    if (email) {
      const other = await model.findByEmail(email);
      if (other && other.id !== req.params.id) throw new HttpError(409, 'Email déjà utilisé');
    }

    await model.update(req.params.id, { email, nom, actif });
    if (password) {
      const password_hash = await bcrypt.hash(password, 10);
      await model.updatePassword(req.params.id, password_hash);
    }
    if (Array.isArray(roles)) {
      await model.syncRoles(req.params.id, roles);
    }

    auditLog({ req, action: 'UPDATE', entity_type: 'Utilisateur', entity_id: req.params.id, reference: email || target.email, detail: 'Modification utilisateur' });
    const fresh = (await model.listAll()).find((u) => u.id === req.params.id);
    res.json({ data: fresh });
  }),
];

exports.remove = asyncHandler(async (req, res) => {
  const target = await model.findById(req.params.id);
  if (!target) throw new HttpError(404, 'Utilisateur introuvable');
  if (req.user && req.user.id === req.params.id) {
    throw new HttpError(400, 'Impossible de supprimer votre propre compte');
  }
  try {
    await model.remove(req.params.id);
  } catch (err) {
    // 23503 = violation de clé étrangère : l'utilisateur a des données métier liées
    if (err && err.code === '23503') {
      throw new HttpError(409, "Cet utilisateur a des données liées (demandes, validations, mouvements...). Désactivez le compte plutôt que de le supprimer.");
    }
    throw err;
  }
  auditLog({ req, action: 'DELETE', entity_type: 'Utilisateur', entity_id: req.params.id, reference: target.email, detail: 'Suppression utilisateur' });
  res.status(204).end();
});
