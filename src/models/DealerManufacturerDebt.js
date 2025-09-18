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
  },
  {timestamps: true}
);

export default mongoose.model(
  "DealerManufacturerDebt",
  dealerManufacturerDebtSchema
);
