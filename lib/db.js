// Connects to MongoDB once and re-uses the connection.
// (Without this, every request would open a new connection and the free
//  Atlas plan would run out of connections quickly.)
import mongoose from "mongoose";

let cached = globalThis._mongooseCache;
if (!cached) cached = globalThis._mongooseCache = { conn: null, promise: null };

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is missing in your .env file.");

  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(uri, {
      bufferCommands: false,
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 10000,
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null; // try again on the next request
    throw err;
  }
  return cached.conn;
}
