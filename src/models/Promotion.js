import mongoose from "mongoose";

// Mô hình Promotion: hỗ trợ giảm theo phần trăm hoặc số tiền cố định
const promotionSchema = new mongoose.Schema(
  {
    name: {type: String, required: true},
    type: {type: String, enum: ["percent", "amount"], required: true},
    value: {type: Number, required: true},
    start_date: {type: Date},
    end_date: {type: Date},
    is_active: {type: Boolean, default: true},
  },
  {timestamps: true}
);

export default mongoose.model("Promotion", promotionSchema);
