/**
 * Creates the first admin account (or promotes an existing user) without seeding demo data.
 *   ADMIN_NAME="Jane Doe" ADMIN_EMAIL=jane@example.com ADMIN_PASSWORD='...' npm run create-admin
 */
import mongoose from 'mongoose';
import { config } from './config.js';
import User from './models/User.js';
import { EMAIL_RE, passwordError } from './utils/validate.js';

const { ADMIN_NAME = 'Administrator', ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;

if (!ADMIN_EMAIL || !EMAIL_RE.test(ADMIN_EMAIL)) {
  console.error('Set ADMIN_EMAIL to a valid email address.');
  process.exit(1);
}
const pwError = passwordError(ADMIN_PASSWORD);
if (pwError) {
  console.error(`ADMIN_PASSWORD: ${pwError}`);
  process.exit(1);
}

await mongoose.connect(config.mongoUri);
const existing = await User.findOne({ email: ADMIN_EMAIL.toLowerCase() }).select('+tokenVersion');
if (existing) {
  existing.role = 'admin';
  existing.password = ADMIN_PASSWORD;
  existing.tokenVersion = (existing.tokenVersion ?? 0) + 1;
  await existing.save();
  console.log(`Updated ${existing.email}: role admin, password reset.`);
} else {
  const user = await User.create({ name: ADMIN_NAME, email: ADMIN_EMAIL, password: ADMIN_PASSWORD, role: 'admin' });
  console.log(`Created admin ${user.email}.`);
}
await mongoose.disconnect();
