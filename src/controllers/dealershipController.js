import Dealership from "../models/Dealership.js";
import {success, created, error as errorRes} from "../utils/response.js";
import {paginate} from "../utils/pagination.js";
import {DealerMessage} from "../utils/MessageRes.js";

export async function createDealership(req, res, next) {
  try {
    const item = await Dealership.create(req.body);
    return created(res, DealerMessage.CREATE_SUCCESS, item);
  } catch (err) {
    next(err);
  }
}

export async function getDealerships(req, res, next) {
  try {
    const {q} = req.query;
    const cond = {};
    if (q) {
      cond.$or = [
        {name: {$regex: q, $options: "i"}},
        {code: {$regex: q, $options: "i"}},
      ];
    }

    const result = await paginate(Dealership, req, ["name", "code"], cond);

    return success(res, DealerMessage.LIST_RETRIEVED, result);
  } catch (err) {
    next(err);
  }
}

export async function getDealershipById(req, res, next) {
  try {
    const item = await Dealership.findById(req.params.id);
    if (!item) return errorRes(res, DealerMessage.NOT_FOUND, 404);
    return success(res, DealerMessage.DETAIL_RETRIEVED, item);
  } catch (err) {
    next(err);
  }
}

export async function updateDealership(req, res, next) {
  try {
    const item = await Dealership.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!item) return errorRes(res, DealerMessage.NOT_FOUND, 404);
    return success(res, DealerMessage.UPDATE_SUCCESS, item);
  } catch (err) {
    next(err);
  }
}

export async function deleteDealership(req, res, next) {
  try {
    const item = await Dealership.findByIdAndDelete(req.params.id);
    if (!item) return errorRes(res, DealerMessage.NOT_FOUND, 404);
    return success(res, DealerMessage.DELETE_SUCCESS, {id: item._id});
  } catch (err) {
    next(err);
  }
}
