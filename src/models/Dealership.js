import mongoose from "mongoose";

const dealershipSchema = new mongoose.Schema(
  {
    name: {type: String, required: true},
    code: {type: String, required: true, unique: true, index: true},
    address: {type: String},
    phone: {type: String},
    email: {type: String},
    isActive: {type: Boolean, default: true, index: true},
    manufacturer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Manufacturer",
      required: true,
    },
  },
  {timestamps: true}
);

export default mongoose.model("Dealership", dealershipSchema);
