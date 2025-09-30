import Option from "../models/Option.js";
import {paginate} from "../utils/pagination.js";
import {success, created, error as errorRes} from "../utils/response.js";
import {OptionMessage} from "../utils/MessageRes.js";

// Create option (EVM Staff, Admin)
export async function createOption(req, res, next) {
  try {
    const payload = {...req.body};
    const uploaded = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        if (file.path) uploaded.push(file.path);
      }
    }
    if (uploaded.length)
      payload.images = [...(payload.images || []), ...uploaded];

    const option = await Option.create(payload);
    return created(res, OptionMessage.CREATE_SUCCESS, option);
  } catch (err) {
    next(err);
  }
}

// List options with pagination and search
export async function getOptions(req, res, next) {
  try {
    const result = await paginate(Option, req, [
      "name",
      "category",
      "description",
    ]);
    return success(res, OptionMessage.LIST_SUCCESS, result);
  } catch (err) {
    next(err);
  }
}

// Get option by id
export async function getOptionById(req, res, next) {
  try {
    const item = await Option.findById(req.params.id);
    if (!item) return errorRes(res, OptionMessage.NOT_FOUND, 404);
    return success(res, OptionMessage.DETAIL_SUCCESS, item);
  } catch (err) {
    next(err);
  }
}

// Update option
export async function updateOption(req, res, next) {
  try {
    const item = await Option.findById(req.params.id);
    if (!item) return errorRes(res, OptionMessage.NOT_FOUND, 404);

    const {imagesToRemove} = req.body;
    if (Array.isArray(imagesToRemove) && imagesToRemove.length > 0) {
      item.images = item.images.filter((url) => !imagesToRemove.includes(url));
    }

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        if (file.path) item.images.push(file.path);
      }
    }

    Object.assign(item, req.body);
    await item.save();
    return success(res, OptionMessage.UPDATE_SUCCESS, item);
  } catch (err) {
    next(err);
  }
}

// Delete option
export async function deleteOption(req, res, next) {
  try {
    const item = await Option.findByIdAndDelete(req.params.id);
    if (!item) return errorRes(res, OptionMessage.NOT_FOUND, 404);
    return success(res, OptionMessage.DELETE_SUCCESS, {id: item._id});
  } catch (err) {
    next(err);
  }
}
