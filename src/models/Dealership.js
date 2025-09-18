import mongoose from "mongoose";

const dealershipSchema = new mongoose.Schema(
  {
    name: {type: String, required: true},
    code: {type: String, required: true, unique: true, index: true},
    address: {type: String},
    phone: {type: String},
    email: {type: String},
  },
  {timestamps: true}
);

export default mongoose.model("Dealership", dealershipSchema);
