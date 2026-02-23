import logger from '../lib/logger.js';

export default function errorHandler(err, req, res, _next) {
  const status = err.status || err.statusCode || 500;
  const message = status < 500 ? err.message : 'Internal server error';

  logger.error({
    err,
    method: req.method,
    url: req.originalUrl,
    status,
  });

  res.status(status).json({ error: message });
}
