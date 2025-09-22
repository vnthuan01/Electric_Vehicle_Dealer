import User from "../models/User.js";
import Role from "../models/Role.js";
import {signRefreshToken, signToken} from "../utils/jwt.js";
import {hashPassword, comparePassword} from "../utils/password.js";
import {AppError} from "../utils/AppError.js";
import {success, created, error as errorRes} from "../utils/response.js";
import RefreshToken from "../models/RefreshToken.js";
import {AuthMessage} from "../utils/MessageRes.js";
import {sendMail} from "../utils/mailer.js";
import {welcomeMailTemplate} from "../templates/authTemplate.js";

// Register new user
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

    // 1. Check if email exists
    const existed = await User.findOne({email});
    if (existed)
      throw new AppError(AuthMessage.EMAIL_ALREADY_EXISTS, 400, 1006);

    // 2. Validate role
    const role = await Role.findOne({name: role_name});
    if (!role) throw new AppError(AuthMessage.INVALID_ROLE, 400, 1010);

    // 3. Hash password and create user
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

    // 4. Send welcome email
    try {
      await sendMail({
        to: email,
        subject: "🎉 Your account has been created successfully",
        html: welcomeMailTemplate({username: full_name, password}),
      });
    } catch (mailErr) {
      console.error("Send mail failed:", mailErr.message);
      // Do not throw here to avoid failing register API
    }

    // 5. Response
    return created(res, AuthMessage.REGISTER_SUCCESS, {id: user._id});
  } catch (e) {
    next(e);
  }
}

// Login
export async function login(req, res, next) {
  try {
    const {email, password} = req.body;
    const user = await User.findOne({email}).populate("role_id");
    if (!user) return errorRes(res, AuthMessage.INVALID_CREDENTIALS, 401);

    const match = await comparePassword(password, user.password);
    if (!match) return errorRes(res, AuthMessage.INVALID_CREDENTIALS, 401);

    const payload = {
      id: user._id,
      email: user.email,
      role: user.role_id?.name,
      roleName: user.role_id?.name,
    };

    const accessToken = signToken(payload, "30m");
    const refreshToken = signRefreshToken(payload, "7d");

    // Delete old refresh tokens
    await RefreshToken.deleteMany({user: user._id});

    // Save new refresh token
    await RefreshToken.create({user: user._id, token: refreshToken});

    return success(res, AuthMessage.LOGIN_SUCCESS, {accessToken, refreshToken});
  } catch (err) {
    next(err);
  }
}

// Refresh token
export async function refreshToken(req, res, next) {
  try {
    const {refreshToken: oldToken} = req.body;
    if (!oldToken) return errorRes(res, AuthMessage.REFRESH_REQUIRED, 400);

    const tokenDoc = await RefreshToken.findOne({token: oldToken});
    if (!tokenDoc) return errorRes(res, AuthMessage.REFRESH_INVALID, 401);

    const user = await User.findById(tokenDoc.user).populate("role_id");
    if (!user) return errorRes(res, AuthMessage.USER_NOT_FOUND, 404);

    // Delete old refresh tokens
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

    return success(res, AuthMessage.REFRESH_SUCCESS, {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (err) {
    next(err);
  }
}

// Logout
export async function logout(req, res, next) {
  try {
    const {refreshToken} = req.body;
    if (!refreshToken) return errorRes(res, AuthMessage.REFRESH_REQUIRED, 400);

    // Delete refresh token from DB
    await RefreshToken.deleteOne({token: refreshToken});

    return success(res, AuthMessage.LOGOUT_SUCCESS);
  } catch (err) {
    next(err);
  }
}
