import mongoose from "mongoose";

// Công nợ giữa đại lý và hãng
const dealerManufacturerDebtSchema = new mongoose.Schema(
  {
    dealership_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dealership",
      required: true,
    },
    manufacturer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Manufacturer",
      required: true,
    },
    total_amount: { type: Number, required: true },
    paid_amount: { type: Number, default: 0 },
    remaining_amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["open", "partial", "settled"],
      default: "open",
    },

    // Chi tiết theo từng lô/phiếu nhập từ requestVehicle
    items: [
      {
        request_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "RequestVehicle",
        },
        vehicle_id: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle" },
        vehicle_name: String,
        color: String,
        unit_price: Number,
        quantity: Number,
        amount: Number, // unit_price * quantity
        delivered_at: { type: Date },
        notes: String,

        // ========== TRACKING FIELDS (Solution 2) ==========
        settled_amount: {
          type: Number,
          default: 0,
          min: 0,
        },

        remaining_amount: {
          type: Number,
        },

        settled_by_orders: [
          {
            order_id: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "Order",
              required: true,
            },
            order_code: {
              type: String,
              required: true,
            },
            quantity_sold: {
              type: Number,
              required: true,
              min: 1,
            },
            amount: {
              type: Number,
              required: true,
              min: 0,
            },
            settled_at: {
              type: Date,
              default: Date.now,
            },
            payment_id: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "Payment",
            },
            notes: String,
          },
        ],

        status: {
          type: String,
          enum: ["pending_payment", "partial_paid", "fully_paid"],
          default: "pending_payment",
        },

        sold_quantity: {
          type: Number,
          default: 0,
          min: 0,
        },
      },
    ],

    // Lịch sử thanh toán đối trừ (hãng ↔ đại lý)
    payments: [
      {
        amount: Number,
        paid_at: { type: Date, default: Date.now },
        method: { type: String }, // chuyển khoản/tiền mặt
        order_id: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
        note: String,
      },
    ],

    is_deleted: { type: Boolean, default: false },
    deleted_at: { type: Date },
    deleted_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model(
  "DealerManufacturerDebt",
  dealerManufacturerDebtSchema
);
