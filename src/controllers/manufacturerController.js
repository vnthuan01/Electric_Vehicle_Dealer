import Manufacturer from "../models/Manufacturer.js";
import {paginate} from "../utils/pagination.js";
import {success, created, error as errorRes} from "../utils/response.js";
import {ManufacturerMessage} from "../utils/MessageRes.js";

export async function createManufacturer(req, res, next) {
  try {
    const item = await Manufacturer.create(req.body);
    return created(res, ManufacturerMessage.CREATE_SUCCESS, item);
  } catch (err) {
    next(err);
  }
}

export async function getManufacturers(req, res, next) {
  try {
    const {q} = req.query;
    const cond = {};
    if (q) {
      cond.$or = [
        {name: {$regex: q, $options: "i"}},
        {code: {$regex: q, $options: "i"}},
      ];
    }

    const result = await paginate(Manufacturer, req, ["name", "code"], cond);

    return success(res, ManufacturerMessage.LIST_SUCCESS, result);
  } catch (err) {
    next(err);
  }
}

export async function getManufacturerById(req, res, next) {
  try {
    const item = await Manufacturer.findById(req.params.id);
    if (!item) return errorRes(res, ManufacturerMessage.NOT_FOUND, 404);
    return success(res, ManufacturerMessage.DETAIL_SUCCESS, item);
  } catch (err) {
    next(err);
  }
}

export async function updateManufacturer(req, res, next) {
  try {
    const item = await Manufacturer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!item) return errorRes(res, ManufacturerMessage.NOT_FOUND, 404);
    return success(res, ManufacturerMessage.UPDATE_SUCCESS, item);
  } catch (err) {
    next(err);
  }
}

export async function deleteManufacturer(req, res, next) {
  try {
    const item = await Manufacturer.findByIdAndDelete(req.params.id);
    if (!item) return errorRes(res, ManufacturerMessage.NOT_FOUND, 404);
    return success(res, ManufacturerMessage.DELETE_SUCCESS, {id: item._id});
  } catch (err) {
    next(err);
  }
}
