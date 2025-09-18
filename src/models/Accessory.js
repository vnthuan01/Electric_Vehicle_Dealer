import mongoose from "mongoose";

const accessorySchema = new mongoose.Schema(
  {
    name: {type: String, required: true}, // Tên phụ kiện
    description: {type: String}, // Mô tả chi tiết
    price: {type: Number, default: 0}, // Giá phụ kiện
    type: {type: String}, // Loại phụ kiện (ví dụ: safety, comfort, entertainment)
  },
  {timestamps: true}
);

export default mongoose.model("Accessory", accessorySchema);
