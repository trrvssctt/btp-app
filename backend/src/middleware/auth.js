const jwt = require('jsonwebtoken');
const env = require('../config/env');
const HttpError = require('../utils/HttpError');
const { query } = require('../db/pool');

async function authenticate(req, _res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new HttpError(401, 'Missing or invalid Authorization header');
    }
    const token = header.slice(7);
    let payload;
    try {
      payload = jwt.verify(token, env.jwt.secret);
    } catch (e) {
      throw new HttpError(401, 'Invalid or expired token');
    }

    const { rows } = await query(
      `SELECT u.id, u.email, u.nom, u.actif,
              COALESCE(array_agg(DISTINCT r.code) FILTER (WHERE r.code IS NOT NULL), '{}') AS roles,
              COALESCE(array_agg(DISTINCT p.code) FILTER (WHERE p.code IS NOT NULL), '{}') AS permissions
         FROM users u
         LEFT JOIN user_roles ur ON ur.user_id = u.id
         LEFT JOIN roles r ON r.id = ur.role_id
         LEFT JOIN role_permissions rp ON rp.role_id = r.id
         LEFT JOIN permissions p ON p.id = rp.permission_id
        WHERE u.id = $1
        GROUP BY u.id`,
      [payload.sub],
    );
    const user = rows[0];
    if (!user) throw new HttpError(401, 'User no longer exists');
    if (!user.actif) throw new HttpError(403, 'User is disabled');

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

function requireRole(...allowed) {
  return (req, _res, next) => {
    if (!req.user) return next(new HttpError(401, 'Not authenticated'));
    const ok = req.user.roles.some((r) => allowed.includes(r)) || req.user.roles.includes('ADMIN');
    if (!ok) return next(new HttpError(403, `Role required: ${allowed.join(' | ')}`));
    next();
  };
}

function requirePermission(...needed) {
  return (req, _res, next) => {
    if (!req.user) return next(new HttpError(401, 'Not authenticated'));
    const has = needed.every((p) => req.user.permissions.includes(p)) || req.user.roles.includes('ADMIN');
    if (!has) return next(new HttpError(403, `Permission required: ${needed.join(', ')}`));
    next();
  };
}

module.exports = { authenticate, requireRole, requirePermission };
