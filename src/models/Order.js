import mongoose from "mongoose";

// Mô hình Order theo yêu cầu: hỗ trợ các trạng thái báo giá -> xác nhận -> ký hợp đồng -> giao xe
// Bao gồm cả thông tin giá, khuyến mãi áp dụng, khách hàng, xe, đại lý, phương thức thanh toán dự kiến
const orderSchema = new mongoose.Schema(
  {
    code: {type: String, required: true, unique: true, index: true}, // mã báo giá/đơn hàng
    customer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    vehicle_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
    },
    dealership_id: {type: mongoose.Schema.Types.ObjectId, ref: "Dealership"},
    salesperson_id: {type: mongoose.Schema.Types.ObjectId, ref: "User"},
    price: {type: Number, required: true},
    discount: {type: Number, default: 0},
    promotion_id: {type: mongoose.Schema.Types.ObjectId, ref: "Promotion"},
    final_amount: {type: Number, required: true},
    payment_method: {
      type: String,
      enum: ["cash", "transfer", "installment"],
      default: "cash",
    },
    status: {
      type: String,
      enum: ["quote", "confirmed", "contract_signed", "delivered"],
      default: "quote",
      index: true,
    },
    notes: String,
  },
  {timestamps: true}
);

export default mongoose.model("Order", orderSchema);
