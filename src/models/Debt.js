import mongoose from "mongoose";

// Công nợ khách hàng theo đơn hàng
const debtSchema = new mongoose.Schema(
  {
    customer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    total_amount: {type: Number, required: true},
    paid_amount: {type: Number, default: 0},
    remaining_amount: {type: Number, required: true},
    status: {
      type: String,
      enum: ["open", "partial", "settled"],
      default: "open",
    },
  },
  {timestamps: true}
);

export default mongoose.model("Debt", debtSchema);
