import Manufacturer from "../models/Manufacturer.js";
import {success, created, error as errorRes} from "../utils/response.js";

export async function createManufacturer(req, res, next) {
  try {
    const item = await Manufacturer.create(req.body);
    return created(res, "Tạo hãng thành công", item);
  } catch (err) {
    next(err);
  }
}

export async function getManufacturers(req, res, next) {
  try {
    const {q} = req.query;
    const cond = {};
    if (q)
      cond.$or = [
        {name: {$regex: q, $options: "i"}},
        {code: {$regex: q, $options: "i"}},
      ];
    const items = await Manufacturer.find(cond).sort({createdAt: -1});
    return success(res, "Danh sách hãng", items);
  } catch (err) {
    next(err);
  }
}

export async function getManufacturerById(req, res, next) {
  try {
    const item = await Manufacturer.findById(req.params.id);
    if (!item) return errorRes(res, "Không tìm thấy hãng", 404);
    return success(res, "Chi tiết hãng", item);
  } catch (err) {
    next(err);
  }
}

export async function updateManufacturer(req, res, next) {
  try {
    const item = await Manufacturer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!item) return errorRes(res, "Không tìm thấy hãng", 404);
    return success(res, "Cập nhật hãng thành công", item);
  } catch (err) {
    next(err);
  }
}

export async function deleteManufacturer(req, res, next) {
  try {
    const item = await Manufacturer.findByIdAndDelete(req.params.id);
    if (!item) return errorRes(res, "Không tìm thấy hãng", 404);
    return success(res, "Đã xoá hãng", {id: item._id});
  } catch (err) {
    next(err);
  }
}
