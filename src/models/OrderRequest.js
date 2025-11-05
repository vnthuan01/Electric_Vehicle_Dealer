import mongoose from "mongoose";

const orderRequestSchema = new mongoose.Schema(
  {
    code: {type: String, required: true, unique: true},
    requested_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    approved_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    rejected_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    dealership_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dealership",
      required: true,
    },
    // THÊM MỚI - Link về Order (nếu OrderRequest được tạo từ Order)
    order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: false,
      default: null,
    },

    items: [
      {
        vehicle_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Vehicle",
          required: true,
        },
        manufacturer_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Manufacturer",
        },
        vehicle_name: String,
        color: String,
        quantity: {type: Number, default: 1},
      },
    ],

    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "canceled"],
      default: "pending",
    },

    notes: String,
    approved_at: Date,
    rejected_at: Date,
    rejection_reason: String,

    is_deleted: {type: Boolean, default: false},
  },
  {timestamps: true}
);

export default mongoose.model("OrderRequest", orderRequestSchema);
