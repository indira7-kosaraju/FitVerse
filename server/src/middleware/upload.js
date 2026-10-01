import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { config } from '../config.js';
import { badRequest } from '../utils/AppError.js';

export const UPLOAD_ROOT = config.uploadDir;

const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };

function imageUpload(subdir, maxBytes) {
  const dir = path.join(UPLOAD_ROOT, subdir);
  fs.mkdirSync(dir, { recursive: true });
  return multer({
    storage: multer.diskStorage({
      destination: dir,
      // Random, unguessable names; never trust the client's filename.
      filename: (req, file, cb) => cb(null, crypto.randomBytes(16).toString('hex') + EXT[file.mimetype]),
    }),
    limits: { fileSize: maxBytes, files: 10 },
    fileFilter: (req, file, cb) =>
      EXT[file.mimetype] ? cb(null, true) : cb(badRequest('Only JPG, PNG, WEBP or GIF images are allowed.')),
  });
}

export const avatarUpload = imageUpload('avatars', 5 * 1024 * 1024).single('avatar');
export const progressUpload = imageUpload('progress', 10 * 1024 * 1024).array('photos', 10);

/** "/api/v1/uploads/avatars/x.jpg" → absolute file path inside UPLOAD_ROOT, or null. */
export function fileFromUrl(url) {
  const marker = '/uploads/';
  const i = typeof url === 'string' ? url.indexOf(marker) : -1;
  if (i === -1) return null;
  const file = path.resolve(UPLOAD_ROOT, url.slice(i + marker.length));
  return file.startsWith(UPLOAD_ROOT + path.sep) ? file : null;
}

export function removeUploadedFile(url) {
  const file = fileFromUrl(url);
  if (file) fs.promises.unlink(file).catch(() => {});
}
