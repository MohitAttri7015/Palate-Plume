// One order placed from a table. It is a SNAPSHOT: names and prices are copied in,
// so changing the menu later never changes an old order.
import mongoose from "mongoose";

const OrderLineSchema = new mongoose.Schema(
    {
        itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
        name: { type: String, required: true },
        qty: { type: Number, required: true, min: 1, max: 20 },
        unitPaise: { type: Number, required: true, min: 1 }, // price of ONE item, in paise
    },
    { _id: false }
);

const OrderSchema = new mongoose.Schema(
    {
        cafeId: { type: mongoose.Schema.Types.ObjectId, required: true },
        tableId: { type: mongoose.Schema.Types.ObjectId, required: true },
        tableNumber: { type: Number, required: true },
        sitting: { type: String, required: true }, // which group of customers at the table (see TableCart.sitting)
        items: {
            type: [OrderLineSchema],
            validate: { validator: (list) => list.length > 0, message: "An order needs at least one item." },
        },
        totalPaise: { type: Number, required: true, min: 1 },
        // The kitchen moves it along: pending -> accepted -> preparing -> served (or cancelled). See lib/orderStatus.js.
        status: { type: String, enum: ["pending", "accepted", "preparing", "served", "cancelled"], default: "pending" },
    },
    { timestamps: true } // adds createdAt and updatedAt
);

OrderSchema.index({ tableId: 1, sitting: 1, createdAt: 1 }); // the "Your order" page
OrderSchema.index({ cafeId: 1, status: 1, updatedAt: -1 }); // the kitchen board

export default mongoose.models.Order || mongoose.model("Order", OrderSchema, "orders");