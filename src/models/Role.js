import mongoose from "mongoose";

// Mô hình Role: quản lý vai trò hệ thống theo enum yêu cầu
// name: 'Dealer Staff' | 'Dealer Manager' | 'EVM Staff' | 'Admin'
const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      enum: ["Dealer Staff", "Dealer Manager", "EVM Staff", "Admin"],
      index: true,
    },
  },
  {timestamps: true}
);

export default mongoose.model("Role", roleSchema);
