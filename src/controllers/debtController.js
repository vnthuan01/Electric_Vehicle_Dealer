import Debt from "../models/Debt.js";
import DealerManufacturerDebt from "../models/DealerManufacturerDebt.js";
import Order from "../models/Order.js";
import Customer from "../models/Customer.js";
import {success, error} from "../utils/response.js";
import {DealerMessage} from "../utils/MessageRes.js";

/**
 * Tạo công nợ khách hàng khi tạo Order mới
 * @param order: Order object vừa tạo
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
 * @param debtId: ObjectId của Debt
 * @param paidAmount: số tiền thanh toán mới
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
 * @param debtId: ObjectId của DealerManufacturerDebt
 * @param paidAmount: số tiền thanh toán mới
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
    const debts = await Debt.find({remaining_amount: {$gt: 0}})
      .populate("customer_id", "full_name phone email")
      .populate("order_id", "code final_amount");
    return success(res, DealerMessage.DEBTS_RETRIEVED, debts);
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
    const debts = await DealerManufacturerDebt.find({
      remaining_amount: {$gt: 0},
    })
      .populate("dealership_id", "name")
      .populate("manufacturer_id", "name");
    return success(res, "Manufacturer debts retrieved", debts);
  } catch (e) {
    next(e);
  }
}

/**
 * Get all debts for the logged-in dealer (Dealer hiện tại)
 */
export async function getDealerDebts(req, res, next) {
  try {
    const dealer_id = req.user.dealership_id;

    if (!dealer_id) return errorRes(res, DealerMessage.MISSING_FIELDS, 400);

    const debts = await DealerManufacturerDebt.find({dealership_id: dealer_id})
      .populate("manufacturer_id", "name")
      .sort({createdAt: -1});

    const totalAmount = debts.reduce((sum, d) => sum + d.total_amount, 0);
    const remainingAmount = debts.reduce(
      (sum, d) => sum + d.remaining_amount,
      0
    );

    return success(res, "Dealer debts retrieved successfully", {
      debts,
      totalAmount,
      remainingAmount,
    });
  } catch (err) {
    next(err);
  }
}
