import mongoose from "mongoose";

// Lịch lái thử
const testDriveSchema = new mongoose.Schema(
  {
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
    dealership_id: {type: mongoose.Schema.Types.ObjectId, ref: "Dealership"},
    schedule_at: {type: Date, required: true},
    status: {
      type: String,
      enum: ["pending", "confirmed", "completed", "cancelled"],
      default: "pending",
    },
    notes: {type: String},
  },
  {timestamps: true}
);

export default mongoose.model("TestDrive", testDriveSchema);
