import mongoose from 'mongoose';
import { badRequest } from './AppError.js';

export const MAX_LIMIT = 1000;

export function parsePaging(query, defaultLimit = 10) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
}

/** "-createdAt" → { createdAt: -1 }. Only keys in `allowed` are accepted. */
export function parseSort(sort, allowed, fallback) {
  if (typeof sort !== 'string' || !sort) return fallback;
  const desc = sort.startsWith('-');
  const key = desc ? sort.slice(1) : sort;
  if (!allowed.includes(key)) return fallback;
  return { [key]: desc ? -1 : 1, _id: 1 };
}

export function parseDate(value, field) {
  if (value === undefined || value === null || value === '') return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw badRequest(`Invalid date for "${field}".`, { [field]: 'Invalid date' });
  return d;
}

/** Builds a { $gte, $lte } filter from ?from&to, or undefined when neither is set. */
export function dateRange(query) {
  const from = parseDate(query.from, 'from');
  const to = parseDate(query.to, 'to');
  if (!from && !to) return undefined;
  const range = {};
  if (from) range.$gte = from;
  if (to) range.$lte = to;
  return range;
}

export const isObjectId = (v) => typeof v === 'string' && mongoose.isValidObjectId(v) && /^[a-f\d]{24}$/i.test(v);

export function assertObjectId(value, field = 'id') {
  if (!isObjectId(String(value ?? ''))) throw badRequest(`Invalid ${field}.`, { [field]: 'Invalid id' });
  return String(value);
}

export const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Runs a find with paging and returns the shape the client's `toPaged` expects. */
export async function paged(Model, filter, { query, sort, defaultLimit = 10, populate, select } = {}) {
  const { page, limit, skip } = parsePaging(query, defaultLimit);
  let q = Model.find(filter).sort(sort).skip(skip).limit(limit);
  if (select) q = q.select(select);
  if (populate) q = q.populate(populate);
  const [data, total] = await Promise.all([q, Model.countDocuments(filter)]);
  return { success: true, data, total, page, pages: Math.max(1, Math.ceil(total / limit)) };
}

/** Pages an already-loaded array (used when sorting by populated fields). */
export function pageArray(items, query, defaultLimit = 10) {
  const { page, limit, skip } = parsePaging(query, defaultLimit);
  return {
    success: true,
    data: items.slice(skip, skip + limit),
    total: items.length,
    page,
    pages: Math.max(1, Math.ceil(items.length / limit)),
  };
}

/** Copies only whitelisted keys that are present in `body`. */
export function pick(body, keys) {
  const out = {};
  for (const k of keys) if (body && Object.prototype.hasOwnProperty.call(body, k)) out[k] = body[k];
  return out;
}

export const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });
