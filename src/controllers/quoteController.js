import Quote from "../models/Quote.js";
import Vehicle from "../models/Vehicle.js";
import Option from "../models/Option.js";
import Accessory from "../models/Accessory.js";
import Promotion from "../models/Promotion.js";
import {success, created, error as errorRes} from "../utils/response.js";
import {paginate} from "../utils/pagination.js";
import {generateQuotePDF} from "../services/quoteServie.js";

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
    const optionDocs = await Option.find({_id: {$in: optionIds}}).lean();
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
    const accessoryDocs = await Accessory.find({_id: {$in: ids}}).lean();
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
    const {items = [], notes} = req.body;
    if (!Array.isArray(items) || items.length === 0)
      return errorRes(res, "Empty items", 400);
    // Tính từng item
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
      items: itemsWithFinal,
      final_amount: total,
      notes,
      startDate,
      endDate,
      status: "valid",
    });
    return created(res, "Quote created", quote);
  } catch (e) {
    next(e);
  }
}

// =================== LIST QUOTES ===================
export async function getQuotes(req, res, next) {
  try {
    // Chỉ lọc quote còn hạn hoặc valid
    const now = new Date();
    const cond = {status: {$ne: "canceled"}, endDate: {$gte: now}};
    const result = await paginate(Quote, req, ["code", "notes"], cond);
    return success(res, "List quotes", result);
  } catch (e) {
    next(e);
  }
}

// =================== DETAIL QUOTE - TỰ ĐỘNG CHECK HẾT HẠN ===================
export async function getQuoteById(req, res, next) {
  try {
    const quote = await Quote.findById(req.params.id);
    if (!quote) return errorRes(res, "Quote not found", 404);
    const now = new Date();
    if (quote.status === "valid" && quote.endDate < now) {
      quote.status = "expired";
      await quote.save();
    }
    return success(res, "Get quote detail", quote);
  } catch (e) {
    next(e);
  }
}

// =================== UPDATE QUOTE (KHÔNG UPDATE HẾT HẠN/ĐÃ HỦY) ===================
export async function updateQuote(req, res, next) {
  try {
    const {id} = req.params;
    const {items, notes, status} = req.body;
    const quote = await Quote.findById(id);
    if (!quote) return errorRes(res, "Quote not found", 404);

    const now = new Date();
    if (quote.status !== "valid" || quote.endDate < now)
      return errorRes(res, "Quote is expired/canceled", 400);

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
    return success(res, "Quote updated", quote);
  } catch (e) {
    next(e);
  }
}

// =================== DELETE (SOFT DELETE) QUOTE ===================
export async function deleteQuote(req, res, next) {
  try {
    const {id} = req.params;

    const quote = await Quote.findById(id);
    if (!quote) return errorRes(res, "Quote not found", 404);

    // Nếu đã hết hạn hoặc đã bị hủy thì không cần hủy thêm
    if (["canceled"].includes(quote.status)) {
      return errorRes(res, "Quote already canceled", 400);
    }

    // Soft delete: cập nhật trạng thái
    quote.status = "canceled";
    quote.canceled_at = new Date();

    await quote.save();

    return success(res, "Quote canceled successfully", {
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
    const {id} = req.params;
    const quote = await Quote.findById(id).lean();
    if (!quote) return errorRes(res, "Quote not found", 404);
    console.log(quote);
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
