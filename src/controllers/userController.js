import User from "../models/User.js";
import Role from "../models/Role.js";
import {AppError} from "../utils/AppError.js";
import {success, created} from "../utils/response.js";
import {AuthMessage} from "../utils/MessageRes.js";
import {hashPassword} from "../utils/password.js";
import {paginate} from "../utils/pagination.js";

// Get all users (Admin only, with optional filters + pagination)
export async function getAllUsers(req, res, next) {
  try {
    const {dealership_id, manufacturer_id, role} = req.query;

    const filter = {};

    // Filter theo role nếu truyền
    if (role) {
      const roleDoc = await Role.findOne({name: role});
      if (roleDoc) filter.role_id = roleDoc._id;
    }

    if (dealership_id) filter.dealership_id = dealership_id;
    if (manufacturer_id) filter.manufacturer_id = manufacturer_id;

    // Dùng paginate
    const result = await paginate(
      User,
      req,
      ["full_name", "email", "phone"],
      filter
    );

    // Populate cho từng user (dùng Promise.all để giữ pagination metadata)
    const populatedData = await Promise.all(
      result.data.map((u) =>
        User.findById(u._id)
          .populate("role_id", "name")
          .populate("dealership_id", "name")
          .populate("manufacturer_id", "name")
      )
    );

    return success(res, "Fetched users successfully", {
      ...result,
      data: populatedData,
    });
  } catch (err) {
    next(err);
  }
}

// Get user by ID
export async function getUserById(req, res, next) {
  try {
    const {id} = req.params;
    const user = await User.findById(id)
      .populate("role_id", "name")
      .populate("dealership_id", "name")
      .populate("manufacturer_id", "name");
    if (!user) throw new AppError("User not found", 404, 2001);

    return success(res, "Fetched user successfully", user);
  } catch (err) {
    next(err);
  }
}

// Create user (Admin)
export async function createUser(req, res, next) {
  try {
    const {
      full_name,
      email,
      phone,
      password,
      role_name,
      dealership_id,
      manufacturer_id,
    } = req.body;

    const existed = await User.findOne({email});
    if (existed)
      throw new AppError(AuthMessage.EMAIL_ALREADY_EXISTS, 400, 2002);

    const role = await Role.findOne({name: role_name});
    if (!role) throw new AppError(AuthMessage.INVALID_ROLE, 400, 2003);

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

    return created(res, "User created successfully", {id: user._id});
  } catch (err) {
    next(err);
  }
}

// Update user
export async function updateUser(req, res, next) {
  try {
    const {id} = req.params;
    const {
      full_name,
      email,
      phone,
      password,
      role_name,
      dealership_id,
      manufacturer_id,
    } = req.body;

    const user = await User.findById(id);
    if (!user) throw new AppError("User not found", 404, 2004);

    if (email && email !== user.email) {
      const existed = await User.findOne({email});
      if (existed)
        throw new AppError(AuthMessage.EMAIL_ALREADY_EXISTS, 400, 2005);
      user.email = email;
    }

    if (role_name) {
      const role = await Role.findOne({name: role_name});
      if (!role) throw new AppError(AuthMessage.INVALID_ROLE, 400, 2006);
      user.role_id = role._id;
    }

    if (password) {
      user.password = await hashPassword(password);
    }

    if (full_name) user.full_name = full_name;
    if (phone) user.phone = phone;
    if (dealership_id) user.dealership_id = dealership_id;
    if (manufacturer_id) user.manufacturer_id = manufacturer_id;

    await user.save();

    return success(res, "User updated successfully", user);
  } catch (err) {
    next(err);
  }
}

// Delete user
export async function deleteUser(req, res, next) {
  try {
    const {id} = req.params;
    const user = await User.findByIdAndDelete(id);
    if (!user) throw new AppError("User not found", 404, 2007);

    return success(res, "User deleted successfully");
  } catch (err) {
    next(err);
  }
}
