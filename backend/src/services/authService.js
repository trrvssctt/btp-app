const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const HttpError = require('../utils/HttpError');
const userModel = require('../models/userModel');

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, nom: user.nom },
    env.jwt.secret,
    { expiresIn: env.jwt.expiresIn },
  );
}

async function register({ email, nom, password, role }) {
  const existing = await userModel.findByEmail(email);
  if (existing) throw new HttpError(409, 'Email already registered');

  const password_hash = await bcrypt.hash(password, 10);
  const user = await userModel.create({ email, nom, password_hash });

  const roleCode = role || 'DEMANDEUR';
  const roleId = await userModel.getRoleIdByCode(roleCode);
  if (roleId) await userModel.attachRole(user.id, roleId);

  const rp = await userModel.getRolesAndPermissions(user.id);
  return { user: { ...user, ...rp }, token: signToken(user) };
}

async function login({ email, password }) {
  const user = await userModel.findByEmail(email);
  if (!user || !user.password_hash) throw new HttpError(401, 'Invalid credentials');
  if (!user.actif) throw new HttpError(403, 'User is disabled');

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) throw new HttpError(401, 'Invalid credentials');

  const rp = await userModel.getRolesAndPermissions(user.id);
  const safe = { id: user.id, email: user.email, nom: user.nom, actif: user.actif, ...rp };
  return { user: safe, token: signToken(user) };
}

async function me(userId) {
  const user = await userModel.findById(userId);
  if (!user) throw new HttpError(404, 'User not found');
  const rp = await userModel.getRolesAndPermissions(user.id);
  return { ...user, ...rp };
}

module.exports = { register, login, me };
