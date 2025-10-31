import mongoose from "mongoose";

const orderStatusLogSchema = new mongoose.Schema(
  {
    order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    customer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    dealership_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dealership",
      required: true,
    },

    // Trạng thái cũ và mới
    old_status: {
      type: String,
      enum: [
        "pending", // Mới tạo, chưa check stock
        "deposit_paid", // Đã cọc, stock đã trừ nếu có xe
        "waiting_vehicle_request", // (Case hết xe) Đã request, chờ Hãng approve
        "vehicle_ready", // Xe sẵn sàng, chờ khách trả nốt
        "fully_paid", // Đã thanh toán đủ, sẵn sàng giao xe
        "delivered", // Đã giao xe
        "completed", // Hoàn tất
        "cancelled", // Hủy đơn (do Hãng reject hoặc khách hủy)
      ],
    },
    new_status: {
      type: String,
      enum: [
        "pending", // Mới tạo, chưa check stock
        "deposit_paid", // Đã cọc, stock đã trừ nếu có xe
        "waiting_vehicle_request", // (Case hết xe) Đã request, chờ Hãng approve
        "vehicle_ready", // Xe sẵn sàng, chờ khách trả nốt
        "fully_paid", // Đã thanh toán đủ, sẵn sàng giao xe
        "delivered", // Đã giao xe
        "completed", // Hoàn tất
        "cancelled", // Hủy đơn (do Hãng reject hoặc khách hủy)
      ],
      required: true,
    },

    // Trạng thái giao xe cũ và mới
    old_delivery_status: {
      type: String,
      enum: ["pending", "scheduled", "in_transit", "delivered", "failed"],
    },
    new_delivery_status: {
      type: String,
      enum: ["pending", "scheduled", "in_transit", "delivered", "failed"],
    },

    // Người thực hiện thay đổi
    changed_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    changed_by_name: {
      type: String,
      required: true,
    },

    // Lý do thay đổi
    reason: {
      type: String,
    },

    // Thông tin bổ sung
    notes: {
      type: String,
    },

    // Metadata
    ip_address: {
      type: String,
    },
    user_agent: {
      type: String,
    },

    // Thông tin thanh toán (nếu có)
    payment_info: {
      amount: Number,
      method: String,
      reference: String,
    },

    // Thông tin giao xe (nếu có)
    delivery_info: {
      scheduled_date: Date,
      actual_date: Date,
      delivery_person: {
        name: String,
        phone: String,
      },
      delivery_address: String,
    },
  },
  { timestamps: true }
);

// Indexes
orderStatusLogSchema.index({ order_id: 1, created_at: -1 });
orderStatusLogSchema.index({ dealership_id: 1, created_at: -1 });
orderStatusLogSchema.index({ customer_id: 1, created_at: -1 });
orderStatusLogSchema.index({ new_status: 1, created_at: -1 });

export default mongoose.model("OrderStatusLog", orderStatusLogSchema);
