import Quote from "../models/Quote.js";
import Vehicle from "../models/Vehicle.js";
import Option from "../models/Option.js";
import Accessory from "../models/Accessory.js";
import Promotion from "../models/Promotion.js";
import PromotionUsage from "../models/PromotionUsage.js";
import { success, created, error as errorRes } from "../utils/response.js";
import { QuoteMessage } from "../utils/MessageRes.js";
import { paginate } from "../utils/pagination.js";
import { generateQuotePDF } from "../services/quoteServie.js";

// Helper tạo code unique cho Quote
function generateQuoteCode() {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = (now.getMonth() + 1).toString().padStart(2, "0");
  const d = now.getDate().toString().padStart(2, "0");
  const h = now.getHours().toString().padStart(2, "0");
  const min = now.getMinutes().toString().padStart(2, "0");
  const s = now.getSeconds().toString().padStart(2, "0");
  return `Q${y}${m}${d}${h}${min}${s}`;
}

// Helper tính giá cuối cùng cho item quote
async function calculateQuoteItem({
  vehicle_id,
  color,
  quantity,
  discount,
  promotion_id,
  options,
  accessories,
}) {
  // Lấy snapshot xe
  const vehicle = await Vehicle.findById(vehicle_id).lean();
  if (!vehicle) throw Error("Vehicle not found: " + vehicle_id);
  // Lấy snapshot options
  let optionSnapshots = [];
  if (options?.length) {
    const optionIds = options.map((o) =>
      typeof o === "string" ? o : o.option_id
    );
    const optionDocs = await Option.find({ _id: { $in: optionIds } }).lean();
    optionSnapshots = optionDocs.map((o) => ({
      option_id: o._id,
      name: o.name,
      price: o.price,
    }));
  }
  // Lấy snapshot accessories
  let accessorySnapshots = [];
  if (accessories?.length) {
    const ids = accessories.map((a) => a.accessory_id);
    const accessoryDocs = await Accessory.find({ _id: { $in: ids } }).lean();
    accessorySnapshots = accessoryDocs.map((a) => {
      const input = accessories.find((x) => x.accessory_id == a._id.toString());
      return {
        accessory_id: a._id,
        name: a.name,
        price: a.price,
        quantity: input?.quantity || 1,
      };
    });
  }

  // Options/accessories tổng
  const optionsTotal = optionSnapshots.reduce(
    (sum, o) => sum + (o.price || 0),
    0
  );
  const accessoriesTotal = accessorySnapshots.reduce(
    (sum, a) => sum + (a.price || 0) * (a.quantity || 1),
    0
  );
  // Tính toán tổng
  const subtotal =
    (vehicle.price + optionsTotal + accessoriesTotal) * (quantity || 1);
  const finalAmount = subtotal - (discount || 0);
  return {
    vehicle_id: vehicle._id,
    vehicle_name: vehicle.name,
    vehicle_price: vehicle.price,
    color,
    quantity: quantity || 1,
    discount: discount || 0,
    promotion_id,
    options: optionSnapshots,
    accessories: accessorySnapshots,
    final_amount: finalAmount > 0 ? finalAmount : 0,
  };
}

// =================== CREATE QUOTE ===================
export async function createQuote(req, res, next) {
  try {
    const { items = [], notes, customer_id } = req.body;
    const userId = req.user._id;

    if (!customer_id) return errorRes(res, QuoteMessage.MISSING_CUSTOMER, 400);

    if (!Array.isArray(items) || items.length === 0)
      return errorRes(res, QuoteMessage.EMPTY_ITEMS, 400);

    // --- Validate: Khách PHẢI chọn màu cho mỗi xe ---
    for (const item of items) {
      if (!item.color || item.color.trim() === "") {
        const vehicle = await Vehicle.findById(item.vehicle_id)
          .select("name")
          .lean();
        return errorRes(
          res,
          `Xe "${
            vehicle?.name || item.vehicle_id
          }" chưa chọn màu! Vui lòng chọn màu xe trước khi tạo báo giá.`,
          400
        );
      }
    }

    // --- Check vehicle trùng ---
    const hasDuplicateVehicleWithColor = items.some((item, idx) => {
      return (
        items.findIndex(
          (i) =>
            String(i.vehicle_id) === String(item.vehicle_id) &&
            i.color === item.color
        ) !== idx
      );
    });
    if (hasDuplicateVehicleWithColor) {
      return res.status(400).json({
        message:
          "Duplicate vehicles with the same color in the order are not allowed",
      });
    }
    // --- Check promotion từng user chỉ dùng 1 lần ---
    for (const item of items) {
      if (item.promotion_id) {
        const used = await PromotionUsage.findOne({
          customer_id,
          vehicle_id: item.vehicle_id,
          promotion_id: item.promotion_id,
          status: "used",
        });
        if (used) {
          return errorRes(
            res,
            QuoteMessage.PROMOTION_ALREADY_USED(item.promotion_id),
            400
          );
        }
      }
    }
    // Khi tạo quote, đánh dấu pending cho mỗi promotion
    for (const item of items) {
      if (item.promotion_id) {
        await PromotionUsage.create({
          customer_id,
          vehicle_id: item.vehicle_id,
          promotion_id: item.promotion_id,
          quote_id: null, // sẽ update bên dưới sau khi tạo quote
          order_id: null,
          status: "pending",
        });
      }
    }

    // --- Tính từng item ---
    const itemsWithFinal = [];
    for (const item of items) {
      itemsWithFinal.push(await calculateQuoteItem(item));
    }

    const total = itemsWithFinal.reduce((sum, i) => sum + i.final_amount, 0);
    const code = generateQuoteCode();
    const now = new Date();
    const startDate = now;
    const endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const quote = await Quote.create({
      code,
      customer_id,
      items: itemsWithFinal,
      final_amount: total,
      notes,
      startDate,
      endDate,
      status: "valid",
      created_by: userId,
    });

    // Sau khi có quote._id, update PromotionUsage.pending gán quote_id
    for (const item of items) {
      if (item.promotion_id) {
        await PromotionUsage.updateMany(
          {
            customer_id,
            vehicle_id: item.vehicle_id,
            promotion_id: item.promotion_id,
            status: "pending",
            quote_id: null,
          },
          { $set: { quote_id: quote._id } }
        );
      }
    }

    return created(res, QuoteMessage.CREATE_SUCCESS, quote);
  } catch (e) {
    next(e);
  }
}

// =================== LIST QUOTES ===================
export async function getQuotes(req, res, next) {
  try {
    // Chỉ lọc quote còn hạn hoặc valid
    const now = new Date();
    const cond = { status: { $ne: "canceled" }, endDate: { $gte: now } };
    const result = await paginate(Quote, req, ["code", "notes"], cond);
    return success(res, QuoteMessage.LIST_SUCCESS, result);
  } catch (e) {
    next(e);
  }
}

// =================== DETAIL QUOTE - TỰ ĐỘNG CHECK HẾT HẠN ===================
export async function getQuoteById(req, res, next) {
  try {
    const quote = await Quote.findById(req.params.id);
    if (!quote) return errorRes(res, QuoteMessage.NOT_FOUND, 404);
    const now = new Date();
    if (quote.status === "valid" && quote.endDate < now) {
      quote.status = "expired";
      await quote.save();
    }
    return success(res, QuoteMessage.DETAIL_SUCCESS, quote);
  } catch (e) {
    next(e);
  }
}

// =================== UPDATE QUOTE (KHÔNG UPDATE HẾT HẠN/ĐÃ HỦY) ===================
export async function updateQuote(req, res, next) {
  try {
    const { id } = req.params;
    const { items, notes, status } = req.body;
    const quote = await Quote.findById(id);
    if (!quote) return errorRes(res, QuoteMessage.NOT_FOUND, 404);

    const now = new Date();
    if (quote.status !== "valid" || quote.endDate < now)
      return errorRes(res, QuoteMessage.QUOTE_EXPIRED_OR_CANCELED, 400);

    let changed = false;

    if (Array.isArray(items)) {
      for (const item of items) {
        const idx = quote.items.findIndex(
          (i) => i.vehicle_id.toString() === item.vehicle_id
        );

        // Reset nếu client gửi rỗng
        item.promotion_id = item.promotion_id || null;
        item.options = Array.isArray(item.options) ? item.options : [];
        item.accessories = Array.isArray(item.accessories)
          ? item.accessories
          : [];

        const newItem = await calculateQuoteItem(item);

        if (idx >= 0) {
          // Cập nhật item cũ
          quote.items[idx] = newItem;
        } else {
          // Thêm item mới
          quote.items.push(newItem);
        }
      }

      // Xóa item nào không còn trong request
      const vehicleIdsInRequest = items.map((i) => i.vehicle_id.toString());
      quote.items = quote.items.filter((i) =>
        vehicleIdsInRequest.includes(i.vehicle_id.toString())
      );

      // Recalculate total
      quote.final_amount = quote.items.reduce(
        (sum, i) => sum + i.final_amount,
        0
      );
      changed = true;
    }

    if (notes !== undefined) {
      quote.notes = notes;
      changed = true;
    }

    if (status && ["expired", "canceled"].includes(status)) {
      quote.status = status;
      changed = true;
    }

    if (changed) await quote.save();
    return success(res, QuoteMessage.UPDATE_SUCCESS, quote);
  } catch (e) {
    next(e);
  }
}

// =================== DELETE (SOFT DELETE) QUOTE ===================
export async function deleteQuote(req, res, next) {
  try {
    const { id } = req.params;

    const quote = await Quote.findById(id);
    if (!quote) return errorRes(res, "Quote not found", 404);

    // Nếu đã hết hạn hoặc đã bị hủy thì không cần hủy thêm
    if (["canceled"].includes(quote.status)) {
      return errorRes(res, QuoteMessage.QUOTE_ALREADY_CANCELED, 400);
    }

    // Soft delete: cập nhật trạng thái
    quote.status = "canceled";
    quote.canceled_at = new Date();

    await quote.save();

    // --- Cập nhật trạng thái PromotionUsage liên quan khi quote bị huỷ ---
    await PromotionUsage.updateMany(
      {
        quote_id: quote._id,
        status: "pending",
      },
      { $set: { status: "canceled" } }
    );

    return success(res, QuoteMessage.CANCEL_SUCCESS, {
      id: quote._id,
      status: quote.status,
      canceled_at: quote.canceled_at,
    });
  } catch (e) {
    next(e);
  }
}

export async function exportQuotePDF(req, res, next) {
  try {
    const { id } = req.params;
    const quote = await Quote.findById(id).lean();
    if (!quote) return errorRes(res, QuoteMessage.NOT_FOUND, 404);
    if (quote.status !== "valid")
      return errorRes(res, QuoteMessage.QUOTE_NOT_VALID, 400);
    const pdfBuffer = await generateQuotePDF(quote);

    const filename = `Tổng-Kết-Báo-Giá-${quote.code}.pdf`;
    res.setHeader(
      "Content-Disposition",
      `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`
    );

    res.send(pdfBuffer);
  } catch (e) {
    next(e);
  }
}
