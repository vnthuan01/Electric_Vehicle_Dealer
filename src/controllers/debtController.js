import Debt from "../models/Debt.js";
import DealerManufacturerDebt from "../models/DealerManufacturerDebt.js";
import Order from "../models/Order.js";
import Customer from "../models/Customer.js";
import {success, error as errorRes} from "../utils/response.js";
import {DealerMessage, ManufacturerMessage} from "../utils/MessageRes.js";
import {paginate} from "../utils/pagination.js";

/**
 * Tạo công nợ khách hàng khi tạo Order mới
 */
export async function createCustomerDebt(order) {
  const remaining = order.final_amount - (order.paid_amount || 0);
  const status =
    remaining === 0 ? "settled" : order.paid_amount ? "partial" : "open";

  const debt = await Debt.create({
    customer_id: order.customer_id,
    order_id: order._id,
    total_amount: order.final_amount,
    paid_amount: order.paid_amount || 0,
    remaining_amount: remaining,
    status,
  });

  return debt;
}

/**
 * Cập nhật công nợ khách hàng khi thanh toán
 */
export async function updateCustomerDebtPayment(debtId, paidAmount) {
  const debt = await Debt.findById(debtId);
  if (!debt) throw new Error("Debt not found");

  debt.paid_amount += paidAmount;
  debt.remaining_amount = debt.total_amount - debt.paid_amount;

  if (debt.remaining_amount <= 0) debt.status = "settled";
  else if (debt.paid_amount > 0) debt.status = "partial";
  else debt.status = "open";

  await debt.save();
  return debt;
}

/**
 * Cập nhật công nợ Dealer → Manufacturer khi thanh toán
 */
export async function updateDealerManufacturerDebtPayment(debtId, paidAmount) {
  const debt = await DealerManufacturerDebt.findById(debtId);
  if (!debt) throw new Error("Debt not found");

  debt.paid_amount += paidAmount;
  debt.remaining_amount = debt.total_amount - debt.paid_amount;

  if (debt.remaining_amount <= 0) debt.status = "settled";
  else if (debt.paid_amount > 0) debt.status = "partial";
  else debt.status = "open";

  await debt.save();
  return debt;
}

/**
 * GET /api/debts/customers
 * Lấy danh sách công nợ khách hàng
 */
export async function listCustomerDebts(req, res, next) {
  try {
    const extraQuery = {remaining_amount: {$gt: 0}};

    const result = await paginate(Debt, req, [], extraQuery);

    const populatedData = await Debt.populate(result.data, [
      {path: "customer_id", select: "full_name phone email"},
      {path: "order_id", select: "code final_amount"},
    ]);

    // Tính tổng trên toàn bộ data
    const totals = await Debt.aggregate([
      {$match: extraQuery},
      {
        $group: {
          _id: null,
          totalAmount: {$sum: {$ifNull: ["$total_amount", 0]}},
          remainingAmount: {$sum: {$ifNull: ["$remaining_amount", 0]}},
        },
      },
    ]);

    const totalAmount = totals[0]?.totalAmount || 0;
    const remainingAmount = totals[0]?.remainingAmount || 0;

    return success(res, DealerMessage.DEBTS_RETRIEVED, {
      ...result,
      data: populatedData,
      totalAmount,
      remainingAmount,
    });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/debts/manufacturers
 * Lấy danh sách công nợ giữa đại lý và hãng
 */
export async function listManufacturerDebts(req, res, next) {
  try {
    const extraQuery = {remaining_amount: {$gt: 0}};

    const result = await paginate(DealerManufacturerDebt, req, [], extraQuery);

    const populatedData = await DealerManufacturerDebt.populate(result.data, [
      {path: "dealership_id", select: "name"},
      {path: "manufacturer_id", select: "name"},
    ]);

    const totals = await DealerManufacturerDebt.aggregate([
      {$match: extraQuery},
      {
        $group: {
          _id: null,
          totalAmount: {$sum: {$ifNull: ["$total_amount", 0]}},
          remainingAmount: {$sum: {$ifNull: ["$remaining_amount", 0]}},
        },
      },
    ]);

    const totalAmount = totals[0]?.totalAmount || 0;
    const remainingAmount = totals[0]?.remainingAmount || 0;

    return success(res, ManufacturerMessage.DEBTS_RETRIEVED, {
      ...result,
      data: populatedData,
      totalAmount,
      remainingAmount,
    });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/debts/dealer
 * Get all debts for the logged-in dealer
 */
export async function getDealerDebts(req, res, next) {
  try {
    const dealer_id = req.user.dealership_id;
    if (!dealer_id) return errorRes(res, DealerMessage.MISSING_FIELDS, 400);

    const extraQuery = {dealership_id: dealer_id};

    const result = await paginate(DealerManufacturerDebt, req, [], extraQuery);

    const populatedData = await DealerManufacturerDebt.populate(result.data, {
      path: "manufacturer_id",
      select: "name",
    });

    const totals = await DealerManufacturerDebt.aggregate([
      {$match: extraQuery},
      {
        $group: {
          _id: null,
          totalAmount: {$sum: {$ifNull: ["$total_amount", 0]}},
          remainingAmount: {$sum: {$ifNull: ["$remaining_amount", 0]}},
        },
      },
    ]);

    const totalAmount = totals[0]?.totalAmount || 0;
    const remainingAmount = totals[0]?.remainingAmount || 0;

    return success(res, DealerMessage.DEBTS_RETRIEVED, {
      ...result,
      data: populatedData,
      totalAmount,
      remainingAmount,
    });
  } catch (err) {
    next(err);
  }
}
