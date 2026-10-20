import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { connectDB, getDB } from '../db.js';

if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD || !process.env.JWT_SECRET) {
  console.error('Set ADMIN_EMAIL, ADMIN_PASSWORD, and JWT_SECRET in server/.env'); process.exit(1);
}
try {
  await connectDB();
  const email = process.env.ADMIN_EMAIL.toLowerCase().trim();
  const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
  await getDB().collection('admins').updateOne({ email }, { $set: { name: process.env.ADMIN_NAME || 'MU Home Service Admin', email, passwordHash, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } }, { upsert: true });
  console.log(`Admin user ready: ${email}`);
  process.exit(0);
} catch (e) { console.error(e); process.exit(1); }
