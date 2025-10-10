import mongoose from "mongoose";

// Thanh toán cho đơn hàng: tiền mặt, chuyển khoản, trả góp
const paymentSchema = new mongoose.Schema(
  {
    order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    customer_id: {type: mongoose.Schema.Types.ObjectId, ref: "Customer"},
    method: {
      type: String,
      enum: ["cash", "bank", "qr", "card"],
      required: true,
    },
    amount: {type: Number, required: true},
    paid_at: {type: Date, default: Date.now},
    reference: {type: String}, // mã giao dịch, chứng từ
    notes: {type: String},
    is_deleted: {type: Boolean, default: false},
    deleted_at: {type: Date},
    deleted_by: {type: mongoose.Schema.Types.ObjectId, ref: "User"},
  },
  {timestamps: true}
);

export default mongoose.model("Payment", paymentSchema);
