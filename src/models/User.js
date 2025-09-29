import mongoose from "mongoose";

// Mô hình User theo yêu cầu: full_name, email, phone, address, password, role_id, dealership_id, manufacturer_id
const userSchema = new mongoose.Schema(
  {
    full_name: {type: String, required: true},
    avatar: {type: String},
    email: {type: String, required: true, unique: true, index: true},
    phone: {type: String, index: true},
    address: {type: String, index: true},
    password: {type: String, required: true},
    role_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      required: true,
    },
    dealership_id: {type: mongoose.Schema.Types.ObjectId, ref: "Dealership"},
    manufacturer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Manufacturer",
    },
  },
  {timestamps: true}
);

export default mongoose.model("User", userSchema);
