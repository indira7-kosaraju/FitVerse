import { badRequest } from './AppError.js';

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const PHONE_RE = /^\+?[\d\s()-]{7,20}$/;

export function passwordError(password) {
  if (typeof password !== 'string' || password.length < 8) return 'Password must be at least 8 characters.';
  if (password.length > 128) return 'Password is too long.';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'Password must include a letter and a number.';
  return null;
}

/** Throws a 400 with field errors if any rule fails. rules: { field: () => message|null } */
export function check(rules) {
  const errors = {};
  for (const [field, rule] of Object.entries(rules)) {
    const message = rule();
    if (message) errors[field] = message;
  }
  if (Object.keys(errors).length) throw badRequest('Please fix the highlighted fields.', errors);
}
