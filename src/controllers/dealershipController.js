import Dealership from "../models/Dealership.js";
import {success, created, error as errorRes} from "../utils/response.js";
import {paginate} from "../utils/pagination.js";
import {DealerMessage} from "../utils/MessageRes.js";
import User from "../models/User.js";

// Helper: lấy manufacturerId từ user
async function getManufacturerIdFromUser(userId) {
  const currentUser = await User.findById(userId).populate(
    "manufacturer_id",
    "_id name code"
  );
  return currentUser?.manufacturer_id?._id || null;
}

// Tạo mới/Đăng ký đại lý
export async function createDealership(req, res, next) {
  try {
    const manufacturerId = await getManufacturerIdFromUser(req.user.id);
    console.log(manufacturerId);
    if (!manufacturerId) {
      return errorRes(res, DealerMessage.MANUFACTURER_REQUIRED, 403);
    }

    const item = await Dealership.create({
      ...req.body,
      manufacturer_id: manufacturerId,
    });

    return created(res, DealerMessage.CREATE_SUCCESS, item);
  } catch (err) {
    next(err);
  }
}

// Xem danh sách các đại lý
export async function getDealerships(req, res, next) {
  try {
    const {q, isActive} = req.query;
    const cond = {};

    const manufacturerId = await getManufacturerIdFromUser(req.user.id);
    if (!manufacturerId) {
      return errorRes(res, DealerMessage.MANUFACTURER_REQUIRED, 403);
    }
    cond.manufacturer_id = manufacturerId;

    if (q) {
      cond.$or = [
        {name: {$regex: q, $options: "i"}},
        {code: {$regex: q, $options: "i"}},
      ];
    }

    if (isActive !== undefined) {
      cond.isActive = isActive === "true";
    }

    const result = await paginate(Dealership, req, ["name", "code"], cond);

    return success(res, DealerMessage.LIST_RETRIEVED, result);
  } catch (err) {
    next(err);
  }
}

// Xem thông tin cụ thể một đại lý
export async function getDealershipById(req, res, next) {
  try {
    const manufacturerId = await getManufacturerIdFromUser(req.user.id);
    if (!manufacturerId) {
      return errorRes(res, DealerMessage.MANUFACTURER_REQUIRED, 403);
    }

    const item = await Dealership.findOne({
      _id: req.params.id,
      manufacturer_id: manufacturerId,
    }).populate("manufacturer_id", "name code");

    if (!item) return errorRes(res, DealerMessage.NOT_FOUND, 404);
    return success(res, DealerMessage.DETAIL_RETRIEVED, item);
  } catch (err) {
    next(err);
  }
}

// Cập nhật thông tin đại lý
export async function updateDealership(req, res, next) {
  try {
    const manufacturerId = await getManufacturerIdFromUser(req.user.id);
    if (!manufacturerId) {
      return errorRes(res, DealerMessage.MANUFACTURER_REQUIRED, 403);
    }

    const item = await Dealership.findOneAndUpdate(
      {_id: req.params.id, manufacturer_id: manufacturerId},
      req.body,
      {new: true}
    );

    if (!item) return errorRes(res, DealerMessage.NOT_FOUND, 404);
    return success(res, DealerMessage.UPDATE_SUCCESS, item);
  } catch (err) {
    next(err);
  }
}

// Đánh dấu ngừng hợp tác (isActive = false)
export async function deactivateDealership(req, res, next) {
  try {
    const manufacturerId = await getManufacturerIdFromUser(req.user.id);
    if (!manufacturerId) {
      return errorRes(res, DealerMessage.MANUFACTURER_REQUIRED, 403);
    }

    const item = await Dealership.findOne({
      _id: req.params.id,
      manufacturer_id: manufacturerId,
    });

    if (!item) return errorRes(res, DealerMessage.NOT_FOUND, 404);
    if (!item.isActive) {
      return errorRes(res, DealerMessage.ALREADY_INACTIVE, 400);
    }

    item.isActive = false;
    await item.save();

    return success(res, DealerMessage.DEACTIVATE_SUCCESS, {id: item._id});
  } catch (err) {
    next(err);
  }
}
