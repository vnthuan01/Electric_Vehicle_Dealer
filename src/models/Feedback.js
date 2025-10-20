import mongoose from "mongoose";

// Khiếu nại/Phản hồi của khách hàng (tối giản)
const feedbackSchema = new mongoose.Schema(
  {
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
    content: {type: String, required: true},
    status: {
      type: String,
      enum: ["new", "in_progress", "resolved", "rejected"],
      default: "new",
    },
    comments: [
      {
        user_id: {type: mongoose.Schema.Types.ObjectId, ref: "User"},
        comment: {type: String, required: true},
        created_at: {type: Date, default: Date.now},
      },
    ],
  },
  {timestamps: true}
);

export default mongoose.model("Feedback", feedbackSchema);

// Indexes
feedbackSchema.index({status: 1});
feedbackSchema.index({dealership_id: 1});
