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
    database.collection('bookings').createIndex({ phone: 1 }),
    database.collection('admins').createIndex({ email: 1 }, { unique: true }),
    database.collection('users').createIndex({ email: 1 }, { unique: true }),
    database.collection('contacts').createIndex({ createdAt: -1 }),
    database.collection('siteContent').createIndex({ updatedAt: -1 }),
    database.collection('financeEntries').createIndex({ sourceKey: 1 }, { unique: true, sparse: true }),
    database.collection('financeEntries').createIndex({ date: -1, createdAt: -1 }),
    database.collection('inventoryMovements').createIndex({ itemId: 1, createdAt: -1 }),
    database.collection('inventoryMovements').createIndex({ bookingId: 1, createdAt: -1 })
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
