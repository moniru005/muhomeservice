import { MongoClient } from 'mongodb';
import { services as defaultServices, packages as defaultPackages } from './data.js';

let client;
let database;

export async function connectDB() {
  if (database) return database;
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is missing');
  client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  database = client.db(process.env.MONGODB_DB || 'mu_home_service');
  await Promise.all([
    database.collection('bookings').createIndex({ createdAt: -1 }),
    database.collection('bookings').createIndex({ userId: 1, createdAt: -1 }),
    database.collection('quotations').createIndex({ bookingId: 1, createdAt: -1 }),
    database.collection('bookings').createIndex({ phone: 1 }),
    database.collection('admins').createIndex({ email: 1 }, { unique: true }),
    database.collection('users').createIndex({ email: 1 }, { unique: true }),
    database.collection('contacts').createIndex({ createdAt: -1 }),
    database.collection('siteContent').createIndex({ updatedAt: -1 }),
    database.collection('financeEntries').createIndex({ sourceKey: 1 }, { unique: true, sparse: true }),
    database.collection('financeEntries').createIndex({ date: -1, createdAt: -1 }),
    database.collection('inventoryMovements').createIndex({ itemId: 1, createdAt: -1 }),
    database.collection('inventoryMovements').createIndex({ bookingId: 1, createdAt: -1 }),
    database.collection('onlinePayments').createIndex({ paymentId: 1 }, { unique: true }),
    database.collection('onlinePayments').createIndex({ providerTransactionId: 1 }, { unique: true, sparse: true }),
    database.collection('onlinePayments').createIndex({ bookingId: 1, userId: 1, status: 1, expiresAt: 1 }),
    database.collection('onlinePayments').createIndex({ createdAt: -1 }),
    database.collection('bookings').createIndex({ deletedAt: 1, createdAt: -1 }),
    database.collection('serviceClaims').createIndex({ userId: 1, createdAt: -1 }),
    database.collection('serviceClaims').createIndex({ bookingId: 1, status: 1 }),
    database.collection('technicianAttendance').createIndex({ technicianId: 1, date: 1 }, { unique: true }),
    database.collection('technicianLeaveRequests').createIndex({ technicianId: 1, createdAt: -1 }),
    database.collection('quotationTemplates').createIndex({ serviceId: 1, active: 1 }),
    database.collection('refunds').createIndex({ refundId: 1 }, { unique: true }),
    database.collection('refunds').createIndex({ paymentId: 1, status: 1 }),
    database.collection('serviceReports').createIndex({ bookingId: 1, createdAt: -1 })
  ]);
  // Seed editable catalog only when a document does not exist. Existing admin edits are never overwritten.
  const content = database.collection('siteContent');
  await Promise.all([
    content.updateOne({ _id: 'services' }, { $setOnInsert: { items: defaultServices, createdAt: new Date(), updatedAt: new Date(), updatedBy: 'system-seed' } }, { upsert: true }),
    content.updateOne({ _id: 'packages' }, { $setOnInsert: { items: defaultPackages, createdAt: new Date(), updatedAt: new Date(), updatedBy: 'system-seed' } }, { upsert: true })
  ]);
  console.log(`MongoDB connected: ${database.databaseName}`);
  return database;
}

export function getDB() {
  if (!database) throw new Error('Database not connected');
  return database;
}

export function getMongoClient() {
  if (!client) throw new Error('MongoDB client not connected');
  return client;
}
