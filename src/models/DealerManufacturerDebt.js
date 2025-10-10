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
    total_amount: {type: Number, required: true},
    paid_amount: {type: Number, default: 0},
    remaining_amount: {type: Number, required: true},
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
        vehicle_id: {type: mongoose.Schema.Types.ObjectId, ref: "Vehicle"},
        vehicle_name: String,
        color: String,
        unit_price: Number,
        quantity: Number,
        amount: Number, // unit_price * quantity
        delivered_at: {type: Date},
        notes: String,
      },
    ],

    // Lịch sử thanh toán đối trừ (hãng ↔ đại lý)
    payments: [
      {
        amount: Number,
        paid_at: {type: Date, default: Date.now},
        method: {type: String}, // chuyển khoản/tiền mặt
        order_id: {type: mongoose.Schema.Types.ObjectId, ref: "Order"},
        note: String,
      },
    ],
  },
  {timestamps: true}
);

export default mongoose.model(
  "DealerManufacturerDebt",
  dealerManufacturerDebtSchema
);
