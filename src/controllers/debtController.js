import Debt from "../models/Debt.js";
import DealerManufacturerDebt from "../models/DealerManufacturerDebt.js";
import Order from "../models/Order.js";
import Customer from "../models/Customer.js";
import { success, error as errorRes } from "../utils/response.js";
import { DealerMessage, ManufacturerMessage } from "../utils/MessageRes.js";
import { paginate } from "../utils/pagination.js";
import Vehicle from "../models/Vehicle.js";
import RequestVehicle from "../models/RequestVehicle.js"; // ✅ Added for Solution 2

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
/**
 * Đối trừ debt khi customer thanh toán Order
 *
 * ✨ SOLUTION 2: Batch-Specific Debt Settlement
 * - Với tracking: Đối trừ theo từng lô cụ thể (dựa vào used_stocks)
 * - Fallback: Nếu không có used_stocks → Dùng logic cũ (chia theo tỷ lệ)
 * - Track chi tiết trong settled_by_orders[]
 * - Recalculate totals từ items
 *
 * @param {Object} order - Order object với items[].used_stocks[]
 * @param {Object} payment - Payment object
 * @param {Object} [session] - Optional Mongoose session for transaction
 */
export async function settleDealerManufacturerByOrderPayment(
  order,
  payment,
  session = null
) {
  // Nếu order đã thanh toán đủ, settle toàn bộ phần còn lại (bao gồm cả deposit)
  const isFullPaid =
    Number(order.paid_amount || 0) >= Number(order.final_amount || 0);
  // Số tiền thực sự cần settle cho debt (nếu là lần cuối):
  // Nếu là lần cuối, settle toàn bộ phần còn lại của debt, không chỉ payment.amount
  // Nếu chưa đủ, giữ nguyên logic cũ
  const paid = isFullPaid
    ? Number(order.final_amount || 0) -
      Number(order.settled_to_manufacturer || 0)
    : Number(payment.amount || 0);
  // Lưu ý: order.settled_to_manufacturer là tổng số tiền đã settle cho debt trước đó (nếu có), cần cập nhật khi settle xong
  const settledDebts = [];

  if (paid <= 0) {
    console.log("⚠️ Payment amount is 0, skip debt settlement");
    return { settled_debts: [] };
  }

  // ✅ 1. TÍNH TỶ LỆ THANH TOÁN CHO TỪNG ITEM
  const totalOrderAmount = (order.items || []).reduce(
    (sum, item) =>
      sum + Number(item.vehicle_price || 0) * Number(item.quantity || 1),
    0
  );

  if (totalOrderAmount <= 0) {
    console.warn("⚠️ Order total is 0, cannot settle debt");
    return { settled_debts: [] };
  }

  // ✅ 2. XỬ LÝ TỪNG ITEM
  for (const item of order.items || []) {
    const itemAmount =
      Number(item.vehicle_price || 0) * Number(item.quantity || 1);
    const itemRatio = itemAmount / totalOrderAmount;
    // Nếu là lần cuối, chia lại phần còn lại cần settle cho debt
    const itemPayment = isFullPaid
      ? Math.round(Number(order.final_amount || 0) * itemRatio) -
        Number(item.settled_to_manufacturer || 0 || 0)
      : Math.round(paid * itemRatio);

    if (itemPayment <= 0) continue;

    // ✅ 3. KIỂM TRA: Có used_stocks không?
    if (item.used_stocks && item.used_stocks.length > 0) {
      // ========== SOLUTION 2: Đối trừ theo lô ==========
      console.log(
        `✅ Order ${order.code} has used_stocks, settling by batch tracking`
      );

      let remainingItemPayment = itemPayment;

      for (const usedStock of item.used_stocks) {
        if (remainingItemPayment <= 0) break;

        // Skip nếu không có source
        if (!usedStock.source_request_id) {
          console.warn(
            `⚠️ No source_request_id for stock in Order ${order.code}. ` +
              `This is likely an old stock entry. Skip batch tracking.`
          );
          continue;
        }

        // ✅ 4. TÌM RequestVehicle
        const requestVehicleQuery = RequestVehicle.findById(
          usedStock.source_request_id
        );
        const requestVehicle = session
          ? await requestVehicleQuery.session(session)
          : await requestVehicleQuery;

        if (!requestVehicle) {
          console.warn(
            `⚠️ RequestVehicle ${usedStock.source_request_id} not found`
          );
          continue;
        }

        if (!requestVehicle.debt_id) {
          console.warn(
            `⚠️ RequestVehicle ${requestVehicle.code} has no debt_id`
          );
          continue;
        }

        // ✅ 5. TÌM Debt
        const debtQuery = DealerManufacturerDebt.findById(
          requestVehicle.debt_id
        );
        const debt = session
          ? await debtQuery.session(session)
          : await debtQuery;

        if (!debt) {
          console.warn(`⚠️ Debt ${requestVehicle.debt_id} not found`);
          continue;
        }

        // ✅ 6. TÌM Debt Item tương ứng
        const debtItem = debt.items.find(
          (i) =>
            i.request_id &&
            i.request_id.toString() === usedStock.source_request_id.toString()
        );

        if (!debtItem) {
          console.warn(
            `⚠️ Debt item for request ${usedStock.source_request_id} not found in debt ${debt._id}`
          );
          continue;
        }

        // ✅ 7. TÍNH PAYMENT CHO LÔ NÀY (theo tỷ lệ quantity)
        const stockRatio =
          Number(usedStock.quantity || 1) / Number(item.quantity || 1);
        const stockPayment = Math.round(itemPayment * stockRatio);

        // Không vượt quá còn nợ
        const maxCanSettle =
          debtItem.remaining_amount !== undefined
            ? debtItem.remaining_amount
            : Number(debtItem.amount || 0) -
              Number(debtItem.settled_amount || 0);
        const actualStockPayment = Math.min(
          stockPayment,
          maxCanSettle,
          remainingItemPayment
        );

        if (actualStockPayment <= 0) continue;

        // ✅ 8. ĐỐI TRỪ VÀO DEBT ITEM
        debtItem.settled_amount =
          Number(debtItem.settled_amount || 0) + actualStockPayment;
        debtItem.remaining_amount =
          Number(debtItem.amount || 0) - debtItem.settled_amount;
        debtItem.sold_quantity =
          Number(debtItem.sold_quantity || 0) + Number(usedStock.quantity || 1);

        // ✅ 9. TRACK: Order này đã thanh toán bao nhiêu
        if (!debtItem.settled_by_orders) {
          debtItem.settled_by_orders = [];
        }

        debtItem.settled_by_orders.push({
          order_id: order._id,
          order_code: order.code,
          quantity_sold: Number(usedStock.quantity || 1),
          amount: actualStockPayment,
          settled_at: new Date(),
          payment_id: payment._id,
          notes: `Settled from Order ${order.code} - ${
            usedStock.quantity
          } unit(s) from batch ${requestVehicle.code || requestVehicle._id}`,
        });

        // ✅ 10. UPDATE ITEM STATUS
        if (debtItem.settled_amount >= debtItem.amount) {
          debtItem.status = "fully_paid";
        } else if (debtItem.settled_amount > 0) {
          debtItem.status = "partial_paid";
        } else {
          debtItem.status = "pending_payment";
        }

        // ✅ 11. RECALCULATE DEBT TOTALS (từ items)
        debt.paid_amount = debt.items.reduce(
          (sum, item) => sum + Number(item.settled_amount || 0),
          0
        );
        debt.remaining_amount =
          Number(debt.total_amount || 0) - debt.paid_amount;

        // ✅ 12. UPDATE DEBT STATUS
        if (debt.remaining_amount <= 0) {
          debt.status = "settled";
        } else if (debt.paid_amount > 0) {
          debt.status = "partial";
        } else {
          debt.status = "open";
        }

        // ✅ 13. ADD DEBT PAYMENT RECORD
        if (!debt.payments) {
          debt.payments = [];
        }

        debt.payments.push({
          amount: actualStockPayment,
          paid_at: new Date(),
          method: payment.method,
          order_id: order._id,
          note: `Auto settle from Order ${order.code} - ${
            usedStock.quantity
          } unit(s) from RequestVehicle ${
            requestVehicle.code || requestVehicle._id
          }`,
        });

        await debt.save(session ? { session } : {});

        remainingItemPayment -= actualStockPayment;

        // Track for response
        settledDebts.push({
          debt_id: debt._id,
          request_code: requestVehicle.code || requestVehicle._id.toString(),
          settled_amount: actualStockPayment,
          item_status: debtItem.status,
        });

        console.log(
          `  💰 [Batch Settlement] Settled ${actualStockPayment.toLocaleString()}đ ` +
            `for debt item ${debtItem._id} (Request: ${requestVehicle.code}, Status: ${debtItem.status})`
        );
      }

      // ✅ Warning nếu còn dư payment
      if (remainingItemPayment > 0) {
        console.warn(
          `⚠️ Remaining ${remainingItemPayment.toLocaleString()}đ after settling used_stocks. ` +
            `This might indicate data inconsistency.`
        );
      }
    } else {
      // ========== FALLBACK: Không có used_stocks → Dùng logic cũ ==========
      console.log(
        `⚠️ Order ${order.code} item ${item.vehicle_name} has NO used_stocks. ` +
          `Using fallback logic (settle by dealer-manufacturer total).`
      );

      const vehicleQuery = Vehicle.findById(item.vehicle_id).select(
        "manufacturer_id"
      );
      const vehicle = session
        ? await vehicleQuery.session(session)
        : await vehicleQuery;

      if (!vehicle) {
        console.warn(`⚠️ Vehicle ${item.vehicle_id} not found`);
        continue;
      }

      // Tìm debt theo Dealer + Manufacturer (không biết lô cụ thể)
      const debtQuery = DealerManufacturerDebt.findOne({
        dealership_id: order.dealership_id,
        manufacturer_id: vehicle.manufacturer_id,
        status: { $in: ["open", "partial"] },
      });
      const debt = session ? await debtQuery.session(session) : await debtQuery;

      if (!debt) {
        console.warn(
          `⚠️ No debt found for dealer-manufacturer ` +
            `(Dealer: ${order.dealership_id}, Manufacturer: ${vehicle.manufacturer_id})`
        );
        continue;
      }

      // Đối trừ tổng (không theo lô)
      debt.paid_amount = Number(debt.paid_amount || 0) + itemPayment;
      debt.remaining_amount = Number(debt.total_amount || 0) - debt.paid_amount;

      if (debt.remaining_amount <= 0) {
        debt.status = "settled";
      } else if (debt.paid_amount > 0) {
        debt.status = "partial";
      }

      if (!debt.payments) {
        debt.payments = [];
      }

      debt.payments.push({
        amount: itemPayment,
        paid_at: new Date(),
        method: payment.method,
        order_id: order._id,
        note: `Auto settle from Order ${order.code} (fallback - no batch tracking)`,
      });

      await debt.save(session ? { session } : {});

      settledDebts.push({
        debt_id: debt._id,
        request_code: "N/A (fallback)",
        settled_amount: itemPayment,
        item_status: debt.status,
      });

      console.log(
        `  💰 [Fallback] Settled ${itemPayment.toLocaleString()}đ ` +
          `for debt ${debt._id} (status: ${debt.status})`
      );
    }
  }

  console.log(
    `✅ Debt settlement completed for Order ${order.code}. ${settledDebts.length} debt item(s) updated.`
  );

  return { settled_debts: settledDebts };
}

export async function revertDealerManufacturerByOrderPayment(order, payment) {
  try {
    if (!order || !payment) return;

    const manufacturerAmountById = new Map();

    // Lấy danh sách vehicle trong đơn
    const vehicleIds = Array.from(
      new Set((order.items || []).map((i) => String(i.vehicle_id)))
    );
    const vehicles = await Vehicle.find({ _id: { $in: vehicleIds } })
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
    const extraQuery = { remaining_amount: { $gt: 0 } };

    const result = await paginate(Debt, req, [], extraQuery);

    const populatedData = await Debt.populate(result.data, [
      { path: "customer_id", select: "full_name phone email" },
      { path: "order_id", select: "code final_amount" },
    ]);

    // Tính tổng trên toàn bộ data
    const totals = await Debt.aggregate([
      { $match: extraQuery },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: { $ifNull: ["$total_amount", 0] } },
          remainingAmount: { $sum: { $ifNull: ["$remaining_amount", 0] } },
        },
      },
    ]);

    // const totalAmount = totals[0]?.totalAmount || 0;
    // const remainingAmount = totals[0]?.remainingAmount || 0;

    // return success(res, DealerMessage.DEBTS_RETRIEVED, {
    //   ...result,
    //   data: populatedData,
    //   totalAmount,
    //   remainingAmount,
    // });

    const debt = await Debt.find({})
      .populate("customer_id", "full_name phone email")
      .populate("order_id", "code final_amount status paid_amount")
      .lean();
    return success(res, "All customer debts retrieved", debt);
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
    const extraQuery = { remaining_amount: { $gt: 0 } };

    const result = await paginate(DealerManufacturerDebt, req, [], extraQuery);

    const populatedData = await DealerManufacturerDebt.populate(result.data, [
      { path: "dealership_id", select: "name" },
      { path: "manufacturer_id", select: "name" },
    ]);

    const totals = await DealerManufacturerDebt.aggregate([
      { $match: extraQuery },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: { $ifNull: ["$total_amount", 0] } },
          remainingAmount: { $sum: { $ifNull: ["$remaining_amount", 0] } },
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

    const extraQuery = { dealership_id: dealer_id };

    const result = await paginate(DealerManufacturerDebt, req, [], extraQuery);

    const populatedData = await DealerManufacturerDebt.populate(result.data, {
      path: "manufacturer_id",
      select: "name",
    });

    const totals = await DealerManufacturerDebt.aggregate([
      { $match: extraQuery },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: { $ifNull: ["$total_amount", 0] } },
          remainingAmount: { $sum: { $ifNull: ["$remaining_amount", 0] } },
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

/**
 * GET /api/debts/manufacturers/:id
 * Lấy chi tiết 1 công nợ cụ thể giữa đại lý và hãng
 */
export async function getDealerManufacturerDebtById(req, res, next) {
  try {
    const { id } = req.params;

    const debt = await DealerManufacturerDebt.findById(id)
      .populate("dealership_id", "company_name address phone email")
      .populate("manufacturer_id", "name address phone email")
      .lean();

    if (!debt) {
      return errorRes(res, "Debt not found", 404);
    }

    // Populate RequestVehicle và Vehicle information cho từng item
    for (const item of debt.items || []) {
      if (item.request_id) {
        const requestVehicle = await RequestVehicle.findById(item.request_id)
          .select(
            "code status quantity color order_id order_request_id created_at"
          )
          .lean();
        item.request_info = requestVehicle;
      }

      if (item.vehicle_id) {
        const vehicle = await Vehicle.findById(item.vehicle_id)
          .select("name model manufacturer_id price images")
          .populate("manufacturer_id", "name")
          .lean();
        item.vehicle_info = vehicle;
      }

      // Populate Order information từ settled_by_orders
      if (item.settled_by_orders && item.settled_by_orders.length > 0) {
        for (const settlement of item.settled_by_orders) {
          if (settlement.order_id) {
            const order = await Order.findById(settlement.order_id)
              .select("code status customer_id final_amount paid_amount")
              .populate("customer_id", "full_name phone")
              .lean();
            settlement.order_info = order;
          }
        }
      }
    }

    return success(res, "Debt details retrieved successfully", debt);
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/debts/customers/order/:orderId
 * Lấy công nợ khách hàng theo order cụ thể
 */
export async function getCustomerDebtByOrder(req, res, next) {
  try {
    const { orderId } = req.params;
    const debt = await Debt.findOne({ order_id: orderId })
      .populate("customer_id", "full_name phone email")
      .populate("order_id", "code final_amount status paid_amount")
      .lean();
    if (!debt) {
      return errorRes(res, "Debt not found for this order", 404);
    }
    return success(res, "Customer debt for order retrieved", debt);
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/debts/manufacturers/request/:requestId
 * Lấy công nợ giữa đại lý và hãng trên một lô hàng (RequestVehicle) cụ thể
 */
export async function getDealerManufacturerDebtByRequest(req, res, next) {
  try {
    const { requestId } = req.params;
    // Tìm RequestVehicle
    const requestVehicle = await RequestVehicle.findById(requestId).lean();
    if (!requestVehicle) {
      return errorRes(res, "RequestVehicle not found", 404);
    }
    if (!requestVehicle.debt_id) {
      return errorRes(res, "No debt_id linked to this request", 404);
    }
    // Tìm Debt và DebtItem theo requestId
    const debt = await DealerManufacturerDebt.findById(requestVehicle.debt_id)
      .populate("dealership_id", "company_name address phone email")
      .populate("manufacturer_id", "name address phone email")
      .lean();
    if (!debt) {
      return errorRes(res, "Debt not found", 404);
    }
    const debtItem = (debt.items || []).find(
      (item) => item.request_id && item.request_id.toString() === requestId
    );
    if (!debtItem) {
      return errorRes(res, "Debt item for this request not found", 404);
    }
    // Trả về chi tiết công nợ của lô hàng này
    // Tính lại sold_quantity thực tế từ settled_by_orders (không vượt quá quantity)
    let realSoldQuantity = 0;
    if (
      debtItem.settled_by_orders &&
      Array.isArray(debtItem.settled_by_orders)
    ) {
      realSoldQuantity = debtItem.settled_by_orders.reduce(
        (sum, s) => sum + (s.quantity_sold || 0),
        0
      );
      // Không vượt quá số lượng lô hàng
      realSoldQuantity = Math.min(realSoldQuantity, debtItem.quantity || 0);
    }
    return success(res, "Dealer-manufacturer debt for request retrieved", {
      debt_id: debt._id,
      overall_status: debt.status,
      total_amount: debt.total_amount,
      paid_amount: debt.paid_amount,
      remaining_amount: debt.remaining_amount,
      dealership: debt.dealership_id,
      manufacturer: debt.manufacturer_id,
      request_info: requestVehicle,
      debt_item: {
        ...debtItem,
        sold_quantity: realSoldQuantity,
      },
    });
  } catch (e) {
    next(e);
  }
}
