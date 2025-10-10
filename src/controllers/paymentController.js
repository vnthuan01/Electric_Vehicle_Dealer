import Payment from "../models/Payment.js";
import Order from "../models/Order.js";
import {success, created, error as errorRes} from "../utils/response.js";
import {PaymentMessage, OrderMessage} from "../utils/MessageRes.js";
import {paginate} from "../utils/pagination.js";
import Debt from "../models/Debt.js";
import {
  updateCustomerDebtPayment,
  settleDealerManufacturerByOrderPayment,
} from "./debtController.js";
import {createStatusLog} from "./orderStatusLogController.js";

// ==================== Create Payment ====================
export async function createPayment(req, res, next) {
  try {
    const {order_id, amount, method, reference, notes} = req.body;
    if (!order_id || !amount || !method) {
      return errorRes(res, PaymentMessage.MISSING_REQUIRED_FIELDS, 400);
    }

    const dealership_id = req.user.dealership_id || null;

    // Lấy Order và kiểm tra quyền truy cập
    const order = await Order.findById(order_id);
    if (!order) return errorRes(res, OrderMessage.NOT_FOUND, 404);

    if (String(order.dealership_id) !== String(dealership_id)) {
      return errorRes(res, PaymentMessage.ACCESS_DENIED, 403);
    }

    const totalPaid = order.paid_amount || 0;
    const finalAmount = order.final_amount || 0;

    // Nếu order đã trả đủ rồi thì không cho tạo thêm payment
    if (totalPaid >= finalAmount) {
      return errorRes(res, PaymentMessage.ALREADY_FULLY_PAID, 400);
    }

    // Kiểm tra không vượt quá tổng đơn
    if (totalPaid + amount > finalAmount) {
      return errorRes(res, PaymentMessage.EXCEEDS_FINAL_AMOUNT, 400);
    }

    // Tạo payment
    const payment = await Payment.create({
      order_id,
      customer_id: order.customer_id,
      amount,
      method,
      reference,
      notes,
      paid_at: new Date(),
    });

    // Cập nhật paid_amount
    order.paid_amount = Number(totalPaid) + Number(amount);

    // --- Lưu trạng thái cũ để ghi log ---
    const oldStatus = order.status;

    // --- Cập nhật trạng thái dựa theo % thanh toán ---
    if (order.paid_amount >= order.final_amount) {
      order.status = "fullyPayment";
    } else if (order.paid_amount > 0) {
      order.status = "halfPayment";
    } else {
      order.status = "confirmed";
    }

    // --- Cập nhật công nợ nếu method là cash ---
    // (nếu chuyển khoản hoặc ghi nợ thì chưa trừ ngay)
    const debt = await Debt.findOne({order_id: order._id});
    if (method === "cash") {
      if (debt) {
        await updateCustomerDebtPayment(debt._id, amount);
        debt = await Debt.findById(debt._id).lean();
      }
    }

    await order.save();

    // --- Đối trừ công nợ Hãng↔Đại lý dựa trên khoản thanh toán của khách ---
    try {
      await settleDealerManufacturerByOrderPayment(order, payment);
    } catch (err) {
      console.error("Failed to settle manufacturer-dealer debt:", err);
    }

    // --- GHI LOG NẾU TRẠNG THÁI THAY ĐỔI ---
    if (oldStatus !== order.status) {
      await createStatusLog(
        order._id,
        oldStatus,
        order.status,
        req.user?.id,
        "Payment status updated",
        `Payment received: ${amount} VNĐ, method: ${method}`,
        {
          changed_by_name: req.user?.full_name || "System",
          ip_address: req.ip,
          user_agent: req.get("User-Agent"),
          payment_info: {
            amount,
            method,
            reference,
          },
        }
      );
    }

    return created(res, PaymentMessage.CREATE_SUCCESS, {
      payment,
      order,
      debt: debt
        ? {
            _id: debt._id,
            status: debt.status,
            remaining_amount: debt.remaining_amount,
          }
        : null,
    });
  } catch (e) {
    next(e);
  }
}

// ==================== Get Payments by Order ====================
export async function getPaymentsByOrder(req, res, next) {
  try {
    const {orderId} = req.params;
    const dealership_id = req.user.dealership_id || null;

    const order = await Order.findById(orderId);
    if (!order) return errorRes(res, OrderMessage.NOT_FOUND, 404);

    if (String(order.dealership_id) !== String(dealership_id)) {
      return errorRes(res, PaymentMessage.ACCESS_DENIED, 403);
    }

    const cond = {order_id: orderId};
    const pagination = await paginate(
      Payment,
      req,
      ["reference", "method"],
      cond
    );

    return success(res, PaymentMessage.LIST_RETRIEVED, pagination);
  } catch (e) {
    next(e);
  }
}

// ==================== Update Payment (chỉ cho sửa note/reference) ====================
export async function updatePayment(req, res, next) {
  try {
    const {id} = req.params;
    const {reference, notes} = req.body;

    const dealership_id = req.user.dealership_id || null;

    const payment = await Payment.findById(id);
    if (!payment) return errorRes(res, PaymentMessage.NOT_FOUND, 404);

    const order = await Order.findById(payment.order_id);
    if (!order) return errorRes(res, OrderMessage.NOT_FOUND, 404);

    if (String(order.dealership_id) !== String(dealership_id)) {
      return errorRes(res, PaymentMessage.ACCESS_DENIED, 403);
    }

    // Chỉ update note/reference, không được phép đổi số tiền
    if (reference !== undefined) payment.reference = reference;
    if (notes !== undefined) payment.notes = notes;
    await payment.save();

    return success(res, PaymentMessage.UPDATE_SUCCESS, payment);
  } catch (e) {
    next(e);
  }
}

// ==================== Delete Payment ====================
export async function deletePayment(req, res, next) {
  try {
    const {id} = req.params;
    const dealership_id = req.user.dealership_id || null;

    const payment = await Payment.findById(id);
    if (!payment) return errorRes(res, PaymentMessage.NOT_FOUND, 404);

    const order = await Order.findById(payment.order_id);
    if (!order) return errorRes(res, OrderMessage.NOT_FOUND, 404);

    if (String(order.dealership_id) !== String(dealership_id)) {
      return errorRes(res, PaymentMessage.ACCESS_DENIED, 403);
    }

    // Xoá payment
    await payment.deleteOne();

    // Cập nhật lại paid_amount của order
    order.paid_amount = Math.max(0, (order.paid_amount || 0) - payment.amount);

    // --- Cập nhật lại trạng thái theo số tiền còn lại ---
    if (order.paid_amount >= order.final_amount) {
      order.status = "fullyPayment";
    } else if (order.paid_amount > 0) {
      order.status = "halfPayment";
    } else {
      order.status = "confirmed";
    }

    await order.save();

    return success(res, PaymentMessage.DELETE_SUCCESS, {id});
  } catch (e) {
    next(e);
  }
}
