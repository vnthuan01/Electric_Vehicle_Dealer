import Debt from "../models/Debt.js";
import DealerManufacturerDebt from "../models/DealerManufacturerDebt.js";
import Order from "../models/Order.js";
import Customer from "../models/Customer.js";
import {success, error as errorRes} from "../utils/response.js";
import {DealerMessage, ManufacturerMessage} from "../utils/MessageRes.js";
import {paginate} from "../utils/pagination.js";
import Vehicle from "../models/Vehicle.js";

/**
 * Tạo công nợ khách hàng khi tạo Order mới
 */
export async function createCustomerDebt(order) {
  const totalAmount = Number(order.final_amount || 0); // bắt buộc là Number
  const paidAmount = Number(order.paid_amount || 0);
  const remaining = totalAmount - paidAmount;
  const status =
    remaining === 0 ? "settled" : order.paid_amount ? "partial" : "open";
  console.log(order);
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

  // --- kiểm tra nếu đã thanh toán hết ---
  if (debt.status === "settled") {
    throw new Error("This debt is already settled");
  }

  // --- tính toán an toàn, tránh trả lố ---
  const newPaid = debt.paid_amount + paidAmount;

  if (newPaid > debt.total_amount) {
    throw new Error("Paid amount exceeds total debt");
  }

  debt.paid_amount = newPaid;
  debt.remaining_amount = debt.total_amount - debt.paid_amount;

  if (debt.remaining_amount <= 0) {
    debt.status = "settled";
  } else if (debt.paid_amount > 0) {
    debt.status = "partial";
  } else {
    debt.status = "open";
  }

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
 * Đối trừ công nợ Hãng↔Đại lý khi có thanh toán từ khách (theo đơn hàng)
 * Logic mặc định: phân bổ theo tỷ lệ doanh thu hãng trên từng xe trong đơn
 */
export async function settleDealerManufacturerByOrderPayment(order, payment) {
  const manufacturerAmountById = new Map();

  // Lấy danh sách vehicle liên quan
  const vehicleIds = Array.from(
    new Set((order.items || []).map((i) => String(i.vehicle_id)))
  );
  const vehicles = await Vehicle.find({_id: {$in: vehicleIds}})
    .select("_id manufacturer_id")
    .lean();
  const vehicleIdToManufacturer = new Map(
    vehicles.map((v) => [String(v._id), String(v.manufacturer_id)])
  );

  for (const it of order.items || []) {
    const manufacturerId = vehicleIdToManufacturer.get(String(it.vehicle_id));
    if (!manufacturerId) continue;
    const amountPortion =
      Number(it.vehicle_price || 0) * Number(it.quantity || 1);
    manufacturerAmountById.set(
      manufacturerId,
      (manufacturerAmountById.get(manufacturerId) || 0) + amountPortion
    );
  }

  const orderManufacturerBaseTotal = Array.from(
    manufacturerAmountById.values()
  ).reduce((s, v) => s + v, 0);
  if (orderManufacturerBaseTotal <= 0) return null;

  const paid = Number(payment.amount || 0);
  const dealershipId = order.dealership_id;

  for (const [manufacturerId, base] of manufacturerAmountById.entries()) {
    const ratio = base / orderManufacturerBaseTotal;
    const allocate = Math.round(paid * ratio);

    const debt = await DealerManufacturerDebt.findOne({
      dealership_id: dealershipId,
      manufacturer_id: manufacturerId,
    });
    if (!debt) continue;

    debt.paid_amount += allocate;
    debt.remaining_amount = Math.max(
      0,
      (debt.total_amount || 0) - (debt.paid_amount || 0)
    );
    if (debt.remaining_amount <= 0) debt.status = "settled";
    else if (debt.paid_amount > 0) debt.status = "partial";
    else debt.status = "open";

    debt.payments = debt.payments || [];
    debt.payments.push({
      ref: payment.reference,
      amount: allocate,
      paid_at: payment.paid_at || new Date(),
      method: payment.method,
      order_id: order._id,
      note: "Auto settle via customer payment",
    });

    await debt.save();
  }

  return true;
}

export async function revertDealerManufacturerByOrderPayment(order, payment) {
  try {
    if (!order || !payment) return;

    const manufacturerAmountById = new Map();

    // Lấy danh sách vehicle trong đơn
    const vehicleIds = Array.from(
      new Set((order.items || []).map((i) => String(i.vehicle_id)))
    );
    const vehicles = await Vehicle.find({_id: {$in: vehicleIds}})
      .select("_id manufacturer_id")
      .lean();

    const vehicleIdToManufacturer = new Map(
      vehicles.map((v) => [String(v._id), String(v.manufacturer_id)])
    );

    // Tính tổng doanh thu của từng hãng trong đơn
    for (const it of order.items || []) {
      const manufacturerId = vehicleIdToManufacturer.get(String(it.vehicle_id));
      if (!manufacturerId) continue;
      const amountPortion =
        Number(it.vehicle_price || 0) * Number(it.quantity || 1);
      manufacturerAmountById.set(
        manufacturerId,
        (manufacturerAmountById.get(manufacturerId) || 0) + amountPortion
      );
    }

    const orderManufacturerBaseTotal = Array.from(
      manufacturerAmountById.values()
    ).reduce((s, v) => s + v, 0);
    if (orderManufacturerBaseTotal <= 0) return;

    const paid = Number(payment.amount || 0);
    const dealershipId = order.dealership_id;

    // --- Giảm công nợ cho từng hãng ---
    for (const [manufacturerId, base] of manufacturerAmountById.entries()) {
      const ratio = base / orderManufacturerBaseTotal;
      const allocate = Math.round(paid * ratio);

      const debt = await DealerManufacturerDebt.findOne({
        dealership_id: dealershipId,
        manufacturer_id: manufacturerId,
      });
      if (!debt) continue;

      // Giảm số tiền thanh toán
      debt.paid_amount = Math.max(0, (debt.paid_amount || 0) - allocate);
      debt.remaining_amount = Math.max(
        0,
        (debt.total_amount || 0) - (debt.paid_amount || 0)
      );

      // Cập nhật trạng thái
      if (debt.remaining_amount <= 0) debt.status = "settled";
      else if (debt.paid_amount > 0) debt.status = "partial";
      else debt.status = "open";

      // Ghi lại log trong payments nếu có
      if (debt.payments?.length) {
        debt.payments = debt.payments.filter(
          (p) => p.ref !== payment.reference
        );
      }

      await debt.save();
    }

    return true;
  } catch (err) {
    console.error("Failed to revert dealer-manufacturer debt:", err);
  }
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
