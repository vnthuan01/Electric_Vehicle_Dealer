import mongoose from "mongoose";

const customerSchema = new mongoose.Schema({
  full_name: {type: String, required: true},
  phone: {type: String, required: true},
  email: {type: String},
  preferences: {type: String},
  address: {type: String},
  createdAt: {type: Date, default: Date.now},
});

export default mongoose.model("Customer", customerSchema);
