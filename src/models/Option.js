import mongoose from "mongoose";

const optionSchema = new mongoose.Schema(
  {
    name: {type: String, required: true}, // Tên option
    description: {type: String}, // Mô tả chi tiết
    price: {type: Number, default: 0}, // Giá option nếu có
    category: {type: String}, // Loại option (ví dụ: interior, exterior, software)
    images: {type: [String], default: []}, // Cloudinary URLs
  },
  {timestamps: true}
);

optionSchema.index({name: 1});
optionSchema.index({category: 1});

export default mongoose.model("Option", optionSchema);
