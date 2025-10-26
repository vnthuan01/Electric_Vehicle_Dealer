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
    dealership_id: { type: mongoose.Schema.Types.ObjectId, ref: "Dealership" },
    schedule_at: { type: Date, required: true },
    status: {
      type: String,
      enum: ["pending", "confirmed", "completed", "canceled"],
      default: "pending",
    },
    assigned_staff_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    notes: { type: String },
  },
  { timestamps: true }
);

// Indexes for common queries
testDriveSchema.index({ schedule_at: 1 });
testDriveSchema.index({ status: 1 });
testDriveSchema.index({ assigned_staff_id: 1 });

export default mongoose.model("TestDrive", testDriveSchema);
