import User from "../models/User.js";
import Role from "../models/Role.js";
import {signRefreshToken, signToken} from "../utils/jwt.js";
import {hashPassword, comparePassword} from "../utils/password.js";
import {AppError} from "../utils/AppError.js";
import {success, created, error as errorRes} from "../utils/response.js";
import RefreshToken from "../models/RefreshToken.js";

// Đăng ký người dùng mới
export async function register(req, res, next) {
  try {
    const {
      full_name,
      email,
      phone,
      password,
      role_name = "Dealer Staff",
      dealership_id,
      manufacturer_id,
    } = req.body;
    const existed = await User.findOne({email});
    if (existed) throw new AppError("Email đã tồn tại", 400, 1006);
    const role = await Role.findOne({name: role_name});
    if (!role) throw new AppError("Role không hợp lệ", 400, 1010);
    const hashed = await hashPassword(password);
    const user = await User.create({
      full_name,
      email,
      phone,
      password: hashed,
      role_id: role._id,
      dealership_id,
      manufacturer_id,
    });
    return created(res, "Đăng ký thành công", {id: user._id});
  } catch (e) {
    next(e);
  }
}

// Đăng nhập
export async function login(req, res, next) {
  try {
    const {email, password} = req.body;
    const user = await User.findOne({email}).populate("role_id");
    if (!user) return errorRes(res, "Invalid credentials", 401);

    const match = await comparePassword(password, user.password);
    if (!match) return errorRes(res, "Invalid credentials", 401);

    const payload = {
      id: user._id,
      email: user.email,
      role: user.role_id?.name,
      roleName: user.role_id?.name,
    };

    const accessToken = signToken(payload, "30m");
    const refreshToken = signRefreshToken(payload, "7d");

    // Xoá tất cả refresh token cũ trước khi tạo mới
    await RefreshToken.deleteMany({user: user._id});

    // Lưu refresh token mới
    await RefreshToken.create({user: user._id, token: refreshToken});

    return success(res, "Login successful", {accessToken, refreshToken});
  } catch (err) {
    next(err);
  }
}

// Refresh token: tạo lại JWT mới từ user hiện tại (đã xác thực)
export async function refreshToken(req, res, next) {
  try {
    const {refreshToken: oldToken} = req.body;
    if (!oldToken) return errorRes(res, "Refresh token required", 400);

    const tokenDoc = await RefreshToken.findOne({token: oldToken});
    if (!tokenDoc) return errorRes(res, "Invalid refresh token", 401);

    const user = await User.findById(tokenDoc.user).populate("role_id");
    if (!user) return errorRes(res, "User not found", 404);

    // Xoá refresh token cũ
    await RefreshToken.deleteMany({user: user._id});

    const payload = {
      id: user._id,
      email: user.email,
      role: user.role_id?.name,
      roleName: user.role_id?.name,
    };

    const newAccessToken = signToken(payload, "30m");
    const newRefreshToken = signRefreshToken(payload, "7d");

    await RefreshToken.create({user: user._id, token: newRefreshToken});

    return success(res, "Token refreshed successfully", {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (err) {
    next(err);
  }
}

export async function logout(req, res, next) {
  try {
    const {refreshToken} = req.body;
    if (!refreshToken) return errorRes(res, "Refresh token required", 400);

    // Xoá refresh token khỏi DB => token vô hiệu
    await RefreshToken.deleteOne({token: refreshToken});

    return success(res, "Logged out successfully");
  } catch (err) {
    next(err);
  }
}
