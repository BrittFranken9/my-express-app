// src/config/db.js
import mongoose from 'mongoose';

let cachedConnection = null;

export const connectDB = async () => {
  if (cachedConnection) return cachedConnection;

  // Accept both names to avoid future typos
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error('MONGODB_URI (or MONGO_URI) missing in env');

  mongoose.set('strictQuery', true);
  const conn = await mongoose.connect(uri, { dbName: 'events_app' });
  cachedConnection = conn.connection;
  console.log('MongoDB connected');
  return cachedConnection;
};

export const getMongooseConnection = () => {
  if (!cachedConnection) throw new Error('Mongo not connected yet');
  return cachedConnection;
};
