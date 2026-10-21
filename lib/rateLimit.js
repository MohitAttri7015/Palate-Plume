// Protection against password guessing:
// too many wrong attempts => blocked for 15 minutes.
//
// The counters live in MongoDB (collection "loginAttempts"), NOT in server memory.
// On Vercel every serverless instance has its own memory, so a memory counter
// would let an attacker spread guesses across instances. MongoDB is shared by all of them.
// A TTL index removes old counters automatically.
//
// If the database has a hiccup, these functions "fail open" (login still works) and log the error.
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";

const WINDOW_MS = 15 * 60 * 1000;

let ready = null;
async function attempts() {
  await connectDB();
  const col = mongoose.connection.collection("loginAttempts");
  // Create the auto-delete index once per server instance.
  ready ??= col.createIndex({ resetAt: 1 }, { expireAfterSeconds: 0 }).catch((err) => {
    ready = null;
    console.error("loginAttempts index error:", err);
  });
  await ready;
  return col;
}

// Returns 0 if allowed, or the number of seconds to wait if blocked.
export async function retryAfterSeconds(key, max) {
  try {
    const col = await attempts();
    const doc = await col.findOne({ _id: key });
    const now = Date.now();
    if (!doc || doc.resetAt.getTime() <= now) return 0;
    return doc.count >= max ? Math.ceil((doc.resetAt.getTime() - now) / 1000) : 0;
  } catch (err) {
    console.error("Rate limit check error:", err);
    return 0;
  }
}

export async function recordFailure(key) {
  try {
    const col = await attempts();
    const now = new Date();
    const newReset = new Date(now.getTime() + WINDOW_MS);
    // One atomic step: start a new 15-minute window if none is active, otherwise add 1.
    await col.updateOne(
      { _id: key },
      [
        {
          $set: {
            count: { $cond: [{ $gt: ["$resetAt", now] }, { $add: [{ $ifNull: ["$count", 0] }, 1] }, 1] },
            resetAt: { $cond: [{ $gt: ["$resetAt", now] }, "$resetAt", newReset] },
          },
        },
      ],
      { upsert: true }
    );
  } catch (err) {
    console.error("Rate limit record error:", err);
  }
}

export async function clearFailures(key) {
  try {
    const col = await attempts();
    await col.deleteOne({ _id: key });
  } catch (err) {
    console.error("Rate limit clear error:", err);
  }
}
