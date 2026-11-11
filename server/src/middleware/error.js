import { ZodError } from 'zod';
import { HttpError } from '../utils/httpError.js';
import { logger } from '../utils/logger.js';
import { isProd } from '../config/env.js';

/** 404 for any /api route that did not match. */
export function notFound(req, res) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

/** The one central error handler. Every error response is { success:false, message, errors? }. */
export function errorHandler(err, req, res, _next) {
  if (err instanceof HttpError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.errors && { errors: err.errors }),
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }

  // Malformed JSON body from the client.
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Malformed JSON body' });
  }

  // Mongo duplicate key (e.g. unique email, slug or SKU).
  if (err.code === 11000) {
    return res
      .status(409)
      .json({ success: false, message: 'A record with this value already exists' });
  }

  // Bad ObjectId in a URL.
  if (err.name === 'CastError') {
    return res.status(400).json({ success: false, message: `Invalid ${err.path}` });
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ success: false, message: 'Image must be 5 MB or smaller' });
  }

  const status = err.statusCode && err.statusCode >= 400 ? err.statusCode : 500;
  if (status === 500) logger.error(`${req.method} ${req.originalUrl}`, err);

  return res.status(status).json({
    success: false,
    message: status === 500 && isProd ? 'Something went wrong' : err.message,
  });
}
