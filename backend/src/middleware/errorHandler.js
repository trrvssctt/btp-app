const { ZodError } = require('zod');

// 404
function notFound(req, res, _next) {
  res.status(404).json({ error: { message: `Not found: ${req.method} ${req.originalUrl}` } });
}

function errorHandler(err, req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: { message: 'Validation error', details: err.flatten().fieldErrors },
    });
  }
  if (err && err.status) {
    return res.status(err.status).json({
      error: { message: err.message, details: err.details },
    });
  }
  console.error('[error]', err);
  // Temporairement retourné pour débogage sur le VPS
  res.status(500).json({ 
    error: { 
      message: 'Internal server error', 
      debug: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    } 
  });
}

module.exports = { notFound, errorHandler };
