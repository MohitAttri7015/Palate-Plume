// A person who can log in: the admin (owner) or the staff (kitchen).
// This matches what scripts/create-accounts.mjs saved in the "users" collection.
import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  cafeId: { type: mongoose.Schema.Types.ObjectId, required: true },
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  // select:false means the hash is never returned unless we ask for it on purpose.
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ["admin", "staff"], required: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.User || mongoose.model("User", UserSchema);
