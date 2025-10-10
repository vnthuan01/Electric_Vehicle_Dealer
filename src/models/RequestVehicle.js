// models/RequestVehicle.js
import mongoose from "mongoose";

const requestVehicleSchema = new mongoose.Schema(
  {
    vehicle_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
    },
    dealership_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dealership",
      required: true,
    },
    color: {type: String},
    quantity: {type: Number, required: true},
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    notes: {
      type: String,
    },
    debt_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DealerManufacturerDebt",
    },
  },
  {timestamps: true}
);

export default mongoose.model("RequestVehicle", requestVehicleSchema);
