// A menu section such as "Coffee", "Snacks" or "Desserts".
import mongoose from "mongoose";

const CategorySchema = new mongoose.Schema({
    cafeId: { type: mongoose.Schema.Types.ObjectId, required: true },
    name: { type: String, required: true, trim: true, maxlength: 40 },
    nameKey: { type: String, required: true }, // lowercase copy of the name, used to block duplicates
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
});

// The database itself refuses two categories with the same name in one cafe.
CategorySchema.index({ cafeId: 1, nameKey: 1 }, { unique: true });

export default mongoose.models.Category || mongoose.model("Category", CategorySchema, "categories");