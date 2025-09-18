import mongoose from "mongoose";

const manufacturerSchema = new mongoose.Schema(
  {
    name: {type: String, required: true},
    code: {type: String, required: true, unique: true, index: true},
    country: {type: String},
    founded: {type: Date},
  },
  {timestamps: true}
);

export default mongoose.model("Manufacturer", manufacturerSchema);
