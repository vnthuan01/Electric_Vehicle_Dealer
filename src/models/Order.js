import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    code: {type: String, required: true, unique: true, index: true},
    customer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    dealership_id: {type: mongoose.Schema.Types.ObjectId, ref: "Dealership"},
    salesperson_id: {type: mongoose.Schema.Types.ObjectId, ref: "User"},
    items: [
      {
        vehicle_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Vehicle",
          required: true,
        },
        quantity: {type: Number, min: 1, max: 100, default: 1},
        price: {type: Number, required: true},
        discount: {type: Number, default: 0},
        promotion_id: {type: mongoose.Schema.Types.ObjectId, ref: "Promotion"},
        final_amount: {type: Number, required: true},
      },
    ],
    final_amount: {type: Number, required: true},
    paid_amount: {type: Number, default: 0},
    payment_method: {
      type: String,
      enum: ["cash", "paypal", "zalopay", "installment"],
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
