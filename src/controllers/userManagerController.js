import User from "../models/User.js";
import Role from "../models/Role.js";
import {AppError} from "../utils/AppError.js";
import {success} from "../utils/response.js";
import {AuthMessage} from "../utils/MessageRes.js";
import {paginate} from "../utils/pagination.js";

// List Dealer Staff in manager's dealership
export async function listStaff(req, res, next) {
  try {
    const currentUser = await User.findById(req.user.id).populate("role_id");
    if (currentUser.role_id.name !== "Dealer Manager") {
      throw new AppError("Access denied", 403, 2101);
    }
    if (!currentUser.dealership_id) {
      throw new AppError("Dealer Manager missing dealership_id", 400, 2102);
    }

    const dealerStaffRole = await Role.findOne({name: "Dealer Staff"});
    if (!dealerStaffRole) throw new AppError("Role not found", 404, 2103);

    const filter = {
      role_id: dealerStaffRole._id,
      dealership_id: currentUser.dealership_id,
    };

    const result = await paginate(
      User,
      req,
      ["full_name", "email", "phone"],
      filter
    );

    const populated = await User.populate(result.data, [
      {path: "dealership_id", select: "code company_name"},
    ]);

    return success(res, AuthMessage.FETCH_SUCCESS, {
      ...result,
      data: populated.map((u) => {
        const obj = u.toObject ? u.toObject() : {...u};
        delete obj.password;
        return obj;
      }),
    });
  } catch (err) {
    next(err);
  }
}

// Get user detail within manager's dealership
export async function getStaffById(req, res, next) {
  try {
    const {id} = req.params;
    const currentUser = await User.findById(req.user.id).populate("role_id");
    if (currentUser.role_id.name !== "Dealer Manager") {
      throw new AppError("Access denied", 403, 2111);
    }
    if (!currentUser.dealership_id) {
      throw new AppError("Dealer Manager missing dealership_id", 400, 2112);
    }

    const user = await User.findById(id)
      .populate("role_id", "name")
      .populate("dealership_id", "company_name");

    if (!user) throw new AppError("User not found", 404, 2113);

    const targetDealershipId = user?.dealership_id?._id || user?.dealership_id;
    if (String(targetDealershipId) !== String(currentUser.dealership_id)) {
      throw new AppError("Access denied", 403, 2114);
    }

    const obj = user.toObject();
    delete obj.password;
    return success(res, AuthMessage.FETCH_ONE_SUCCESS, obj);
  } catch (err) {
    next(err);
  }
}
