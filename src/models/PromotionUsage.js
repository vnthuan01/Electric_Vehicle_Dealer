import mongoose from "mongoose";

const promotionUsageSchema = new mongoose.Schema({
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
  promotion_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Promotion",
    required: true,
  },
  order_id: {type: mongoose.Schema.Types.ObjectId, ref: "Order", default: null},
  quote_id: {type: mongoose.Schema.Types.ObjectId, ref: "Quote", default: null},
  status: {
    type: String,
    enum: ["pending", "used", "cancelled"],
    required: true,
  },
  created_at: {type: Date, default: Date.now},
});

promotionUsageSchema.index({
  customer_id: 1,
  vehicle_id: 1,
  promotion_id: 1,
  status: 1,
});

export default mongoose.model("PromotionUsage", promotionUsageSchema);
