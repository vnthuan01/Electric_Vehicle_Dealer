import User from "../models/User.js";
import Role from "../models/Role.js";
import {AppError} from "../utils/AppError.js";
import {success, created} from "../utils/response.js";
import {AuthMessage} from "../utils/MessageRes.js";
import {hashPassword} from "../utils/password.js";
import {paginate} from "../utils/pagination.js";

// Get all users (Admin or Dealer Manager, với optional filters + pagination)
export async function getAllUsers(req, res, next) {
  try {
    const {dealership_id, manufacturer_id, role} = req.query;

    const filter = {};
    const currentUser = await User.findById(req.user.id).populate("role_id");

    if (currentUser.role_id.name === "Dealer Manager") {
      // Dealer Manager chỉ lấy Dealer Staff cùng dealership
      const dealerStaffRole = await Role.findOne({name: "Dealer Staff"});
      if (dealerStaffRole) {
        filter.role_id = dealerStaffRole._id;
        filter.dealership_id = currentUser.dealership_id;
      }
    } else if (currentUser.role_id.name === "Admin") {
      // Admin có thể filter theo các tiêu chí nhưng không được lấy role Admin
      if (role) {
        const roleDoc = await Role.findOne({name: role});
        if (roleDoc) {
          // Nếu role được query là Admin thì reject luôn
          if (roleDoc.name === "Admin") {
            throw new AppError("Cannot fetch users with Admin role", 403, 2010);
          }
          filter.role_id = roleDoc._id;
        }
      } else {
        // Nếu không filter role thì loại bỏ Admin luôn
        const adminRole = await Role.findOne({name: "Admin"});
        if (adminRole) {
          filter.role_id = {$ne: adminRole._id};
        }
      }

      if (dealership_id) filter.dealership_id = dealership_id;
      if (manufacturer_id) filter.manufacturer_id = manufacturer_id;
    } else {
      throw new AppError("Access denied", 403, 2009);
    }

    // Paginate
    const result = await paginate(
      User,
      req,
      ["full_name", "email", "phone"],
      filter
    );
    console.log(result.data.map((u) => u.dealership_id));

    const populatedData = await User.populate(result.data, [
      {path: "dealership_id", select: "code company_name", model: "Dealership"},
      {path: "manufacturer_id", select: "code name", model: "Manufacturer"},
    ]);

    return success(res, AuthMessage.FETCH_SUCCESS, {
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

    // Get current user with role info
    const currentUser = await User.findById(req.user.id).populate("role_id");

    const user = await User.findById(id)
      .populate("role_id", "name")
      .populate("dealership_id", "company_name")
      .populate("manufacturer_id", "name");
    console.log(user);
    if (!user) throw new AppError("User not found", 404, 2001);
    console.log(user);

    // Nếu là Dealer Manager, chỉ cho phép xem nhân viên trong cùng dealership
    if (currentUser.role_id.name === "Dealer Manager") {
      if (
        user.dealership_id?._id.toString() !==
        currentUser.dealership_id?._id.toString()
      ) {
        throw new AppError("Access denied", 403, 2010);
      }
    }

    return success(res, AuthMessage.FETCH_ONE_SUCCESS, user);
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
      role_id,
      dealership_id: reqDealershipId,
      manufacturer_id: reqManufacturerId,
    } = req.body;

    let dealership_id = reqDealershipId;
    let manufacturer_id = reqManufacturerId;

    // Get current user with role info
    const currentUser = await User.findById(req.user.id).populate("role_id");
    const currentRoleName = await Role.findById(role_id).select("name");

    // Nếu là Dealer Manager, chỉ cho phép tạo Dealer Staff trong dealership của họ
    if (currentUser.role_id.name === "Dealer Manager") {
      if (currentRoleName.name !== "Dealer Staff") {
        throw new AppError(
          "Dealer Manager can only create Dealer Staff",
          403,
          2011
        );
      }
      if (
        dealership_id &&
        dealership_id !== currentUser.dealership_id.toString()
      ) {
        throw new AppError(
          "Dealer Manager can only create staff in their dealership",
          403,
          2012
        );
      }
      // Ép dealership_id là dealership của Dealer Manager
      dealership_id = currentUser.dealership_id;
      manufacturer_id = null; // Dealer Staff không thuộc manufacturer
    }

    // Validate ít nhất 1 trong 2 ID (chỉ áp dụng cho Admin)
    if (
      currentUser.role_id.name === "Admin" &&
      !dealership_id &&
      !manufacturer_id
    ) {
      throw new AppError(
        AuthMessage.MUST_PROVIDE_DEALERSHIP_OR_MANUFACTURER_ID,
        400,
        2008
      );
    }

    // Kiểm tra email đã tồn tại
    const existed = await User.findOne({email});
    if (existed)
      throw new AppError(AuthMessage.EMAIL_ALREADY_EXISTS, 400, 2002);

    // Kiểm tra role
    const role = await Role.findById(role_id);
    if (!role) throw new AppError(AuthMessage.INVALID_ROLE, 400, 2003);

    const hashed = await hashPassword(password);

    const userData = {
      full_name,
      email,
      phone,
      password: hashed,
      role_id: role._id,
      dealership_id: dealership_id || null,
      manufacturer_id: manufacturer_id || null,
    };

    if (req.file) {
      userData.avatar = req.file.path;
    }

    const user = await User.create(userData);

    return created(res, AuthMessage.REGISTER_SUCCESS, {id: user.id});
  } catch (err) {
    next(err);
  }
}

export async function updateUser(req, res, next) {
  try {
    const {id} = req.params;
    const {
      full_name,
      email,
      phone,
      password,
      role_name,
      dealership_id: reqDealershipId,
      manufacturer_id: reqManufacturerId,
    } = req.body;

    // cho phép thay đổi hai biến này
    let dealership_id = reqDealershipId;
    let manufacturer_id = reqManufacturerId;

    // Get current user with role info
    const currentUser = await User.findById(req.user.id).populate("role_id");

    const user = await User.findById(id);
    if (!user) throw new AppError(AuthMessage.USER_NOT_FOUND, 404, 2004);

    // Nếu là Dealer Manager, chỉ cho phép cập nhật nhân viên trong cùng dealership
    if (currentUser.role_id.name === "Dealer Manager") {
      if (
        user.dealership_id?.toString() !== currentUser.dealership_id?.toString()
      ) {
        throw new AppError("Access denied", 403, 2013);
      }
      // Dealer Manager không thể thay đổi role hoặc dealership_id
      if (role_name && role_name !== "Dealer Staff") {
        throw new AppError(
          "Dealer Manager can only update Dealer Staff",
          403,
          2014
        );
      }
      if (
        dealership_id &&
        dealership_id !== currentUser.dealership_id.toString()
      ) {
        throw new AppError(
          "Dealer Manager cannot change dealership",
          403,
          2015
        );
      }
      // Ép dealership_id là dealership của Dealer Manager
      dealership_id = currentUser.dealership_id;
      manufacturer_id = null; // Dealer Staff không thuộc manufacturer
    }

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

    if (req.file) {
      if (user.avatar) {
        // Implement Cloudinary deletion logic here if needed
      }
      user.avatar = req.file.path;
    }

    await user.save();

    return success(res, AuthMessage.UPDATE_SUCCESS, user);
  } catch (err) {
    next(err);
  }
}

// Delete user (Admin or Dealer Manager)
export async function deleteUser(req, res, next) {
  try {
    const {id} = req.params;

    // Get current user with role info
    const currentUser = await User.findById(req.user.id).populate("role_id");

    const user = await User.findById(id);
    if (!user) throw new AppError("User not found", 404, 2007);

    // Nếu là Dealer Manager, chỉ cho phép xóa nhân viên trong cùng dealership
    if (currentUser.role_id.name === "Dealer Manager") {
      if (
        user.dealership_id?.toString() !== currentUser.dealership_id?.toString()
      ) {
        throw new AppError("Access denied", 403, 2016);
      }
      // Dealer Manager không thể xóa chính mình
      if (user._id.toString() === currentUser._id.toString()) {
        throw new AppError("Cannot delete yourself", 403, 2017);
      }
    }

    await User.findByIdAndDelete(id);

    return success(res, AuthMessage.DELETE_SUCCESS);
  } catch (err) {
    next(err);
  }
}
