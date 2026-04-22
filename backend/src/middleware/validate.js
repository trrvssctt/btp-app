// Wrap a Zod schema → middleware. Validates req[source] (default: body).
module.exports = (schema, source = 'body') => (req, _res, next) => {
  const parsed = schema.safeParse(req[source]);
  if (!parsed.success) return next(parsed.error);
  req[source] = parsed.data;
  next();
};
