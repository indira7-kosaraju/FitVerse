import mongoose from 'mongoose';
import multer from 'multer';
import { AppError } from '../utils/AppError.js';

export function notFoundHandler(req, res) {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ success: false, message: err.message, errors: err.errors });
  }
  if (err instanceof mongoose.Error.ValidationError) {
    const errors = Object.fromEntries(Object.entries(err.errors).map(([path, e]) => [path, e.message]));
    return res.status(400).json({ success: false, message: 'Please fix the highlighted fields.', errors });
  }
  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({ success: false, message: `Invalid ${err.path}.`, errors: { [err.path]: 'Invalid value' } });
  }
  if (err?.code === 11000) {
    const field = Object.keys(err.keyValue || err.keyPattern || {})[0] || 'field';
    const message = field === 'email' ? 'An account with this email already exists.' : `That ${field} is already in use.`;
    return res.status(409).json({ success: false, message, errors: { [field]: message } });
  }
  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'File is too large.' : err.message;
    return res.status(400).json({ success: false, message });
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Malformed JSON body.' });
  }
  console.error(err);
  res.status(500).json({ success: false, message: 'Something went wrong on our side. Please try again.' });
}
