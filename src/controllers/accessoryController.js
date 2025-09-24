import Accessory from "../models/Accessory.js";
import {paginate} from "../utils/pagination.js";
import {success, created, error as errorRes} from "../utils/response.js";
import {AccessoryMessage} from "../utils/MessageRes.js";

// Create accessory (EVM Staff, Admin)
export async function createAccessory(req, res, next) {
  try {
    const payload = {...req.body};
    // collect uploaded image URLs
    const uploaded = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        if (file.path) uploaded.push(file.path);
      }
    }
    if (uploaded.length)
      payload.images = [...(payload.images || []), ...uploaded];

    const accessory = await Accessory.create(payload);
    return created(res, AccessoryMessage.CREATE_SUCCESS, accessory);
  } catch (err) {
    next(err);
  }
}

// List accessories with pagination and search
export async function getAccessories(req, res, next) {
  try {
    const result = await paginate(Accessory, req, [
      "name",
      "type",
      "description",
    ]);
    return success(res, AccessoryMessage.LIST_SUCCESS, result);
  } catch (err) {
    next(err);
  }
}

// Get accessory by id
export async function getAccessoryById(req, res, next) {
  try {
    const item = await Accessory.findById(req.params.id);
    if (!item) return errorRes(res, AccessoryMessage.NOT_FOUND, 404);
    return success(res, AccessoryMessage.DETAIL_SUCCESS, item);
  } catch (err) {
    next(err);
  }
}

// Update accessory
export async function updateAccessory(req, res, next) {
  try {
    const item = await Accessory.findById(req.params.id);
    if (!item) return errorRes(res, AccessoryMessage.NOT_FOUND, 404);

    // remove images if requested
    const {imagesToRemove} = req.body;
    if (Array.isArray(imagesToRemove) && imagesToRemove.length > 0) {
      item.images = item.images.filter((url) => !imagesToRemove.includes(url));
    }

    // append uploaded images
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        if (file.path) item.images.push(file.path);
      }
    }

    Object.assign(item, req.body);
    await item.save();
    return success(res, AccessoryMessage.UPDATE_SUCCESS, item);
  } catch (err) {
    next(err);
  }
}

// Delete accessory
export async function deleteAccessory(req, res, next) {
  try {
    const item = await Accessory.findByIdAndDelete(req.params.id);
    if (!item) return errorRes(res, AccessoryMessage.NOT_FOUND, 404);
    return success(res, AccessoryMessage.DELETE_SUCCESS, {id: item._id});
  } catch (err) {
    next(err);
  }
}
