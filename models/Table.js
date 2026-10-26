// One physical table in the cafe. Its QR code holds a link with the secret `token`.
import mongoose from "mongoose";


const TableSchema = new mongoose.Schema({
    cafeId: { type: mongoose.Schema.Types.ObjectId, required: true },
    number: { type: Number, required: true, min: 1, max: 99, validate: { validator: Number.isInteger, message: "Table number must be a whole number." } },
    token: { type: String, required: true, unique: true }, // the secret inside the QR link (random, cannot be guessed)
    epoch: { type: Number, default: 1 }, // goes up when the code is replaced or the table is switched off: older guest sessions stop working
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
});

// One table number once per cafe.
TableSchema.index({ cafeId: 1, number: 1 }, { unique: true });

export default mongoose.models.Table || mongoose.model("Table", TableSchema, "tables");