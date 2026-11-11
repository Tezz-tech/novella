/* CLI: `npm run seed` (from the repo root or from /server). */
import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { seedDatabase } from './seed.js';

try {
  await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
  console.log(`Connected to ${mongoose.connection.name}. Seeding…`);
  const counts = await seedDatabase({
    ownerEmail: env.SEED_ADMIN_EMAIL,
    ownerPassword: env.SEED_ADMIN_PASSWORD,
  });
  console.log('Seed complete:', counts);
} catch (err) {
  console.error('Seed failed:', err.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
