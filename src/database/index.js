import mongoose from "mongoose";

// Improve query parsing and avoid deprecation warnings
mongoose.set("strictQuery", true);

// Reuse a single connection across serverless invocations
let cached = globalThis.__mongoose;
if (!cached) {
  cached = globalThis.__mongoose = { conn: null, promise: null };
}

async function connectToDB() {
  const uri = process.env.MONGODB_URL;
  if (!uri) {
    throw new Error("MONGODB_URL is not set");
  }

  if (cached.conn) return cached.conn;

  const opts = {
    // Modern drivers ignore useNewUrlParser/useUnifiedTopology flags
    // Pooling and timeouts suitable for serverless
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    // Provide dbName when URI ends with '/'
    dbName: process.env.MONGODB_DB || "jobs",
  };

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(uri, opts)
      .then((mongooseInstance) => {
        console.log("✅ MongoDB connected");
        return mongooseInstance;
      })
      .catch((err) => {
        console.error("❌ MongoDB connection error:", err?.message || err);
        cached.promise = null; // allow retry on next call
        throw err;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

export default connectToDB;
