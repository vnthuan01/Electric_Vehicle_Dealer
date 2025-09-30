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

        // --- snapshot vehicle ---
        vehicle_name: String,
        vehicle_price: Number,

        quantity: {type: Number, min: 1, max: 100, default: 1},
        discount: {type: Number, default: 0},
        promotion_id: {type: mongoose.Schema.Types.ObjectId, ref: "Promotion"},

        // --- snapshot accessories ---
        accessories: [
          {
            accessory_id: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "Accessory",
              required: true,
            },
            name: String,
            price: Number,
            quantity: {type: Number, default: 1},
          },
        ],

        // --- snapshot options ---
        options: [
          {
            option_id: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "Option",
              required: true,
            },
            name: String,
            price: Number,
          },
        ],

        final_amount: {type: Number, required: true},
      },
    ],

    final_amount: {type: Number, required: true},
    paid_amount: {type: Number, default: 0},

    payment_method: {
      type: String,
      enum: ["cash", "installment"],
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
