// The shared cart of ONE table, plus the list of phones that are sitting at it.
// One document per table AND per QR "epoch": replacing a QR code (or switching the table off) starts a fresh cart.
import mongoose from "mongoose";

const LineSchema = new mongoose.Schema(
    { id: { type: String, required: true }, qty: { type: Number, required: true, min: 1, max: 20 } },
    { _id: false }
);

// One phone at the table. sid = the random id inside that phone's guest cookie.
const GuestSchema = new mongoose.Schema(
    { sid: { type: String, required: true }, seenAt: { type: Date, required: true } },
    { _id: false }
);

const TableCartSchema = new mongoose.Schema({
    tableId: { type: mongoose.Schema.Types.ObjectId, required: true },
    cafeId: { type: mongoose.Schema.Types.ObjectId, required: true },
    epoch: { type: Number, required: true },
    items: { type: [LineSchema], default: [] },
    guests: { type: [GuestSchema], default: [] },
    sitting: { type: String },
    version: { type: Number, default: 1 }, // goes up ONLY when the items change. Phones compare this number.
    rev: { type: Number, default: 0 }, // goes up on EVERY save. Used to detect "someone saved while I was working".
    lastActiveAt: { type: Date, required: true }, // last time anyone did anything at this table
    expiresAt: { type: Date, required: true }, // the database deletes the cart after this moment
});

TableCartSchema.index({ tableId: 1, epoch: 1 }, { unique: true });
TableCartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // automatic clean-up (TTL)

export default mongoose.models.TableCart || mongoose.model("TableCart", TableCartSchema, "tableCarts");