import mongoose from "mongoose";

const TypeSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, maxlength: 40 },
});

export default mongoose.models.Type || mongoose.model("Type", TypeSchema, "types");