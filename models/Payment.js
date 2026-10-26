// One PAID bill of one table sitting (a snapshot). The unique index makes "Mark paid" safe:
// the same bill can never be paid twice, even if two staff press at the same moment.
import mongoose from "mongoose";

const LineSchema = new mongoose.Schema(
    { name: { type: String, required: true }, qty: { type: Number, required: true }, unitPaise: { type: Number, required: true } },
    { _id: false }
);

const OrderSnapSchema = new mongoose.Schema(
    {
        orderId: { type: mongoose.Schema.Types.ObjectId, required: true },
        at: { type: Date, required: true },
        items: { type: [LineSchema], default: [] },
        totalPaise: { type: Number, required: true },
    },
    { _id: false }
);

const PaymentSchema = new mongoose.Schema(
    {
        cafeId: { type: mongoose.Schema.Types.ObjectId, required: true },
        tableId: { type: mongoose.Schema.Types.ObjectId, required: true },
        tableNumber: { type: Number, required: true },
        sitting: { type: String, required: true },
        orders: { type: [OrderSnapSchema], default: [] },
        totalPaise: { type: Number, required: true, min: 1 },
        method: { type: String, enum: ["upi", "cash", "card"], default: "upi" },
        payer: { type: String, default: "", maxlength: 60 }, // UPI id / name the money came from (typed by staff)
        paidBy: { type: String, default: "" }, // staff/admin username who pressed "Mark paid"
    },
    { timestamps: true }
);

PaymentSchema.index({ tableId: 1, sitting: 1 }, { unique: true });
PaymentSchema.index({ cafeId: 1, createdAt: -1 });

export default mongoose.models.Payment || mongoose.model("Payment", PaymentSchema, "payments");