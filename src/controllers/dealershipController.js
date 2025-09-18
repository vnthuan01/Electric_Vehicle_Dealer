import Dealership from "../models/Dealership.js";
import {success, created, error as errorRes} from "../utils/response.js";

export async function createDealership(req, res, next) {
  try {
    const item = await Dealership.create(req.body);
    return created(res, "Tạo đại lý thành công", item);
  } catch (err) {
    next(err);
  }
}

export async function getDealerships(req, res, next) {
  try {
    const {q} = req.query;
    const cond = {};
    if (q)
      cond.$or = [
        {name: {$regex: q, $options: "i"}},
        {code: {$regex: q, $options: "i"}},
      ];
    const items = await Dealership.find(cond).sort({createdAt: -1});
    return success(res, "Danh sách đại lý", items);
  } catch (err) {
    next(err);
  }
}

export async function getDealershipById(req, res, next) {
  try {
    const item = await Dealership.findById(req.params.id);
    if (!item) return errorRes(res, "Không tìm thấy đại lý", 404);
    return success(res, "Chi tiết đại lý", item);
  } catch (err) {
    next(err);
  }
}

export async function updateDealership(req, res, next) {
  try {
    const item = await Dealership.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!item) return errorRes(res, "Không tìm thấy đại lý", 404);
    return success(res, "Cập nhật đại lý thành công", item);
  } catch (err) {
    next(err);
  }
}

export async function deleteDealership(req, res, next) {
  try {
    const item = await Dealership.findByIdAndDelete(req.params.id);
    if (!item) return errorRes(res, "Không tìm thấy đại lý", 404);
    return success(res, "Đã xoá đại lý", {id: item._id});
  } catch (err) {
    next(err);
  }
}
