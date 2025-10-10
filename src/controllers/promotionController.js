import Promotion from "../models/Promotion.js";
import Dealership from "../models/Dealership.js";
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

    return success(res, PromotionMessage.FETCH_SUCCESS, result);
  } catch (err) {
    next(err);
  }
}

export async function getPromotionById(req, res, next) {
  try {
    const promotion = await Promotion.findById(req.params.id);
    if (!promotion) return errorRes(res, PromotionMessage.NOT_FOUND, 404);
    return success(res, PromotionMessage.FETCH_ONE_SUCCESS, promotion);
  } catch (err) {
    next(err);
  }
}

export async function getPromotionsForDealership(req, res, next) {
  try {
    const {active} = req.query;
    const cond = {};

    if (active !== undefined) cond.is_active = active === "true";
    console.log(req.user);
    // 🔹 Lọc promotion theo đại lý đang đăng nhập
    if (!req.user?.dealership_id)
      return errorRes(res, PromotionMessage.NOT_FOUND_OR_UNAUTHORIZED, 400);

    cond.dealerships = req.user.dealership_id;

    const result = await paginate(Promotion, req, ["name", "type"], cond);

    result.data = result.data.map((promo) => {
      const obj = promo.toObject ? promo.toObject() : promo;
      return {
        ...obj,
        dealerships: obj.dealerships.filter(
          (id) => id.toString() === req.user.dealership_id
        ),
      };
    });

    return success(res, PromotionMessage.FETCH_SUCCESS, result);
  } catch (err) {
    next(err);
  }
}

export async function getPromotionByIdForDealership(req, res, next) {
  try {
    const dealershipId = req.user?.dealership_id;
    if (!dealershipId)
      return errorRes(res, PromotionMessage.NOT_FOUND_OR_UNAUTHORIZED, 400);

    const cond = {
      _id: req.params.id,
      dealerships: dealershipId, // chỉ lấy promotion mà đại lý này được gán
    };

    const promotion = await Promotion.findOne(cond)
      .populate("dealerships", "code company_name ")
      .lean(); // dùng lean để có object thuần

    if (!promotion)
      return errorRes(res, PromotionMessage.NOT_FOUND_OR_UNAUTHORIZED, 404);

    // Lọc lại mảng dealerships chỉ giữ đại lý hiện tại
    promotion.dealerships = promotion.dealerships.filter(
      (d) => d._id.toString() === dealershipId.toString()
    );

    return success(res, PromotionMessage.FETCH_ONE_SUCCESS, promotion);
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
    const promotion = await Promotion.findById(req.params.id);
    if (!promotion) return errorRes(res, PromotionMessage.NOT_FOUND, 404);

    if (promotion.is_deleted)
      return errorRes(res, PromotionMessage.ALREADY_DELETED, 400);

    promotion.is_deleted = true;
    promotion.is_active = false;
    await promotion.save();

    return success(res, PromotionMessage.DELETE_SUCCESS, {id: promotion._id});
  } catch (err) {
    next(err);
  }
}

export async function assignPromotionToDealerships(req, res, next) {
  try {
    const {id} = req.params;
    let {dealerships} = req.body;

    // Check input hợp lệ
    if (!Array.isArray(dealerships) || dealerships.length === 0)
      return errorRes(res, PromotionMessage.INVALID_DEALERSHIPS, 400);

    // Loại bỏ trùng trong request body
    dealerships = [...new Set(dealerships)];

    let promotion = await Promotion.findById(id);
    if (!promotion) return errorRes(res, PromotionMessage.NOT_FOUND, 404);

    const dealershipsFullId = [];

    // Xác thực các ID hợp lệ
    for (const item of dealerships) {
      if (/^[a-fA-F0-9]{24}$/.test(item)) {
        const exist = await Dealership.exists({_id: item});
        if (exist) dealershipsFullId.push(item);
      } else {
        const d = await Dealership.findOne({code: item});
        if (d?._id) dealershipsFullId.push(d._id);
      }
    }

    if (dealershipsFullId.length === 0)
      return errorRes(res, PromotionMessage.NO_VALID_DEALERSHIP, 400);

    // Kiểm tra xem đại lý đã được assign trước đó chưa
    const current = (promotion.dealerships || []).map((x) => x.toString());
    const duplicates = dealershipsFullId.filter((id) =>
      current.includes(id.toString())
    );

    if (duplicates.length > 0)
      return errorRes(
        res,
        `${PromotionMessage.DUPLICATE_DEALERSHIP}: ${duplicates.join(", ")}`,
        400
      );

    // Merge danh sách mới
    promotion.dealerships.push(...dealershipsFullId);
    await promotion.save();

    promotion = await Promotion.findById(id).populate(
      "dealerships",
      "code company_name"
    );

    return success(res, PromotionMessage.ASSIGN_SUCCESS, promotion);
  } catch (err) {
    next(err);
  }
}
