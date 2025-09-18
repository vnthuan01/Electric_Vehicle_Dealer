import mongoose from "mongoose";

const refreshTokenSchema = new mongoose.Schema({
  user: {type: mongoose.Schema.Types.ObjectId, ref: "User", required: true},
  token: {type: String, required: true, unique: true},
  createdAt: {type: Date, default: Date.now, expires: "7d"},
});

export default mongoose.model("RefreshToken", refreshTokenSchema);
