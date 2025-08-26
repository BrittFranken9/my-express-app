import mongoose from 'mongoose';

let cachedConnection = null;

export const connectDB = async () => {
  if (cachedConnection) return cachedConnection;

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI missing in env');

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
