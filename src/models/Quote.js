import mongoose from "mongoose";

const quoteSchema = new mongoose.Schema(
  {
    code: {type: String, required: true, unique: true, index: true},
    customer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    dealership_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dealership",
      required: true,
      index: true,
    },
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
        color: String, // vehicle color chosen

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
    notes: String,
    startDate: {type: Date},
    endDate: {type: Date},
    status: {
      type: String,
      enum: ["valid", "expired", "canceled", "invalid"],
      default: "valid",
      index: true,
    },
  },
  {timestamps: true}
);

export default mongoose.model("Quote", quoteSchema);
