// One dish or drink on the menu.
import mongoose from "mongoose";

// A picture stored in ImageKit. We keep the fileId so we can delete the picture later.
const PictureSchema = new mongoose.Schema({ url: { type: String, required: true }, fileId: { type: String, required: true } }, { _id: false });

const MenuItemSchema = new mongoose.Schema(
    {
        cafeId: { type: mongoose.Schema.Types.ObjectId, required: true },
        categoryId: { type: mongoose.Schema.Types.ObjectId, required: true },
        name: { type: String, required: true, trim: true, maxlength: 80 },
        nameKey: { type: String, required: true }, // lowercase copy of the name, used to block duplicates
        description: { type: String, required: true, trim: true, maxlength: 300 },
        price: { type: Number, required: true, min: 1 }, // in PAISE: ₹149.50 = 14950
        mainImage: { type: PictureSchema, required: true },
        secondImage: { type: PictureSchema, default: undefined },
        isAvailable: { type: Boolean, default: true }, // false = shows as "Sold out"
        sortOrder: { type: Number, default: 0 },
    },
    { timestamps: true }
);

// No two items with the same name in the same category of one cafe.
MenuItemSchema.index({ cafeId: 1, categoryId: 1, nameKey: 1 }, { unique: true });
MenuItemSchema.index({ cafeId: 1, categoryId: 1, sortOrder: 1 });

export default mongoose.models.MenuItem || mongoose.model("MenuItem", MenuItemSchema, "menuItems");