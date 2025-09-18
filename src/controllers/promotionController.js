import Promotion from "../models/Promotion.js";
import {success, created, error as errorRes} from "../utils/response.js";

export async function createPromotion(req, res, next) {
  try {
    const promotion = await Promotion.create(req.body);
    return created(res, "Tạo khuyến mãi thành công", promotion);
  } catch (err) {
    next(err);
  }
}

export async function getPromotions(req, res, next) {
  try {
    const {active} = req.query;
    const cond = {};
    if (active !== undefined) cond.is_active = active === "true";
    const promotions = await Promotion.find(cond).sort({createdAt: -1});
    return success(res, "Danh sách khuyến mãi", promotions);
  } catch (err) {
    next(err);
  }
}

export async function getPromotionById(req, res, next) {
  try {
    const promotion = await Promotion.findById(req.params.id);
    if (!promotion) return errorRes(res, "Không tìm thấy khuyến mãi", 404);
    return success(res, "Chi tiết khuyến mãi", promotion);
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
    if (!promotion) return errorRes(res, "Không tìm thấy khuyến mãi", 404);
    return success(res, "Cập nhật khuyến mãi thành công", promotion);
  } catch (err) {
    next(err);
  }
}

export async function deletePromotion(req, res, next) {
  try {
    const promotion = await Promotion.findByIdAndDelete(req.params.id);
    if (!promotion) return errorRes(res, "Không tìm thấy khuyến mãi", 404);
    return success(res, "Đã xoá khuyến mãi", {id: promotion._id});
  } catch (err) {
    next(err);
  }
}
