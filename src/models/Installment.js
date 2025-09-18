import mongoose from "mongoose";

// Hồ sơ trả góp
const installmentSchema = new mongoose.Schema(
  {
    order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    customer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    bank_name: {type: String},
    loan_amount: {type: Number, required: true},
    tenure_months: {type: Number, required: true},
    interest_rate: {type: Number, required: true}, // % năm
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "active", "closed"],
      default: "pending",
    },
  },
  {timestamps: true}
);

export default mongoose.model("Installment", installmentSchema);
