import mongoose from "mongoose";

// Khiếu nại/Phản hồi của khách hàng
const feedbackSchema = new mongoose.Schema(
  {
    customer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    order_id: {type: mongoose.Schema.Types.ObjectId, ref: "Order"},
    content: {type: String, required: true},
    status: {
      type: String,
      enum: ["new", "in_progress", "resolved", "rejected"],
      default: "new",
    },
    handler_id: {type: mongoose.Schema.Types.ObjectId, ref: "User"},
  },
  {timestamps: true}
);

export default mongoose.model("Feedback", feedbackSchema);
