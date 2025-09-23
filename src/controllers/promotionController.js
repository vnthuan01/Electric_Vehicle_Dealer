import Promotion from "../models/Promotion.js";
import {paginate} from "../utils/pagination.js";
import {PromotionMessage} from "../utils/MessageRes.js";
import {success, created, error as errorRes} from "../utils/response.js";

export async function createPromotion(req, res, next) {
  try {
    const promotion = await Promotion.create(req.body);
    return created(res, PromotionMessage.CREATE_SUCCESS, promotion);
  } catch (err) {
    next(err);
  }
}

export async function getPromotions(req, res, next) {
  try {
    const {active} = req.query;
    const cond = {};
    if (active !== undefined) cond.is_active = active === "true";

    const result = await paginate(
      Promotion,
      req,
      ["title", "description"],
      cond
    );

    return success(res, PromotionMessage.LIST_SUCCESS, result);
  } catch (err) {
    next(err);
  }
}

export async function getPromotionById(req, res, next) {
  try {
    const promotion = await Promotion.findById(req.params.id);
    if (!promotion) return errorRes(res, PromotionMessage.NOT_FOUND, 404);
    return success(res, PromotionMessage.DETAIL_SUCCESS, promotion);
  } catch (err) {
    next(err);
  }
}

export async function updatePromotion(req, res, next) {
  try {
    const promotion = await Promotion.findByIdAndUpdate(
      req.params.id,
      req.body,
      {new: true}
    );
    if (!promotion) return errorRes(res, PromotionMessage.NOT_FOUND, 404);
    return success(res, PromotionMessage.UPDATE_SUCCESS, promotion);
  } catch (err) {
    next(err);
  }
}

export async function deletePromotion(req, res, next) {
  try {
    const promotion = await Promotion.findByIdAndDelete(req.params.id);
    if (!promotion) return errorRes(res, PromotionMessage.NOT_FOUND, 404);
    return success(res, PromotionMessage.DELETE_SUCCESS, {id: promotion._id});
  } catch (err) {
    next(err);
  }
}
