import mongoose from "mongoose";

// Mô hình Promotion: hỗ trợ giảm theo phần trăm hoặc số tiền cố định
const promotionSchema = new mongoose.Schema(
  {
    name: {type: String, required: true},
    type: {
      type: String,
      enum: ["service", "gift"],
      required: true,
    },
    value: {type: Number, required: true},
    start_date: {type: Date},
    end_date: {type: Date},
    is_active: {type: Boolean, default: true},
    is_deleted: {type: Boolean, default: false},
    dealerships: [{type: mongoose.Schema.Types.ObjectId, ref: "Dealership"}], // Các đại lý được phân bổ
  },
  {timestamps: true}
);

promotionSchema.index({name: 1});
promotionSchema.index({is_active: 1});
promotionSchema.index({start_date: 1, end_date: 1});

export default mongoose.model("Promotion", promotionSchema);
