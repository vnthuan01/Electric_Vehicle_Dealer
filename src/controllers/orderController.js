import Order from "../models/Order.js";
import Promotion from "../models/Promotion.js";
import * as zalopayService from "../services/ZaloPayService.js";
import {
  capturePaypalOrder,
  createOrder as createPaypalOrder,
} from "../services/paypalService.js";
import {OrderMessage} from "../utils/MessageRes.js";
import {success, created, error as errorRes} from "../utils/response.js";
import {paginate} from "../utils/pagination.js";
import {createCustomerDebt} from "./debtController.js";

//Helper generate order Code - timestamp
const generateOrderCode = () => {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");

  return `ORD${yy}${mm}${dd}${hh}${min}${ss}`; // ví dụ: ORD250922162045
};

// Helper tính toán số tiền cuối cùng dựa vào discount và promotion
async function calculateItemFinalAmount(item) {
  let promoDiscount = 0;

  if (item.promotion_id) {
    const promo = await Promotion.findById(item.promotion_id).lean();
    if (promo?.type === "percent") {
      promoDiscount = Math.round((item.price * (promo.value || 0)) / 100);
    } else if (promo?.type === "amount") {
      promoDiscount = promo.value || 0;
    }
  }

  const finalAmount =
    (item.price - (item.discount || 0) - promoDiscount) * (item.quantity || 1);
  return finalAmount > 0 ? finalAmount : 0;
}

// ==================== Create Order ====================
export async function createOrder(req, res, next) {
  try {
    const {
      customer_id,
      dealership_id,
      payment_method = "cash",
      notes,
      items = [], // [{ vehicle_id, quantity, price, discount, promotion_id }]
    } = req.body;

    if (!items.length) {
      return res
        .status(400)
        .json({message: "Order must have at least one item"});
    }

    // Tính final_amount từng item
    const itemsWithFinal = [];
    for (const item of items) {
      const final_amount = await calculateItemFinalAmount(item);
      itemsWithFinal.push({
        ...item,
        final_amount,
      });
    }

    // Tổng final_amount cho toàn order
    const totalAmount = itemsWithFinal.reduce(
      (sum, i) => sum + i.final_amount,
      0
    );

    const code = generateOrderCode();

    // Tạo order trong DB
    const order = await Order.create({
      code,
      customer_id,
      dealership_id,
      salesperson_id: req.user ? req.user.id : null,
      items: itemsWithFinal,
      final_amount: totalAmount,
      paid_amount: 0, // mặc định chưa thanh toán
      payment_method,
      status: "quote",
      notes,
    });

    // Xử lý payment
    let zalopayData = null;
    if (payment_method === "zalopay") {
      const orderData = {
        app_trans_id: `order_${Date.now()}`,
        amount: totalAmount,
        description: `Payment for order ${code}`,
        return_url: `${process.env.CLIENT_URL}/order/${order._id}/payment-return`,
        embed_data: {order_id: order._id.toString()},
        item: itemsWithFinal.map((i) => ({
          name: `Vehicle ${i.vehicle_id}`,
          quantity: i.quantity,
          price: Math.round(i.final_amount / (i.quantity || 1)), // price/unit
        })),
      };
      zalopayData = await zalopayService.createZalopayOrder(orderData);
    }

    let paypalData = null;
    if (payment_method === "paypal") {
      const paypalOrder = await createPaypalOrder(
        totalAmount.toFixed(2),
        "USD",
        `${process.env.CLIENT_URL}/order/${order._id}/paypal-success`,
        `${process.env.CLIENT_URL}/order/${order._id}/paypal-cancel`
      );
      const approveUrl = paypalOrder.links.find(
        (link) => link.rel === "approve"
      )?.href;
      paypalData = {order: paypalOrder, approveUrl};
    }

    return created(res, OrderMessage.CREATE_SUCCESS, {
      order,
      zalopay: zalopayData,
      paypal: paypalData,
    });
  } catch (err) {
    next(err);
  }
}

// ==================== Capture PayPal ====================
export async function paypalReturn(req, res, next) {
  try {
    const {orderId} = req.params;
    const {token} = req.query; // token từ PayPal redirect

    if (!token)
      return res.status(400).json({success: false, message: "Missing token"});

    const order = await Order.findById(orderId);
    if (!order)
      return res.status(404).json({success: false, message: "Order not found"});

    const captureResult = await capturePaypalOrder(token);

    const captureAmount = parseFloat(
      captureResult.purchase_units[0]?.payments?.captures[0]?.amount?.value ||
        "0"
    );

    if (captureAmount <= 0)
      return res
        .status(400)
        .json({success: false, message: "Invalid capture amount"});

    order.paid_amount = captureAmount;
    await order.save();

    const remaining = order.final_amount - order.paid_amount;
    let debt = await Debt.findOne({order_id: order._id});
    const status =
      remaining === 0 ? "settled" : order.paid_amount ? "partial" : "open";

    if (debt) {
      debt.paid_amount = order.paid_amount;
      debt.remaining_amount = remaining;
      debt.status = status;
      await debt.save();
    } else {
      debt = await Debt.create({
        customer_id: order.customer_id,
        order_id: order._id,
        total_amount: order.final_amount,
        paid_amount: order.paid_amount,
        remaining_amount: remaining,
        status,
      });
    }

    return res.json({
      success: true,
      orderId: order._id,
      paid_amount: order.paid_amount,
      debt,
    });
  } catch (err) {
    next(err);
  }
}

// ==================== Get Orders (with pagination & timestamp filter) ====================
export async function getOrders(req, res, next) {
  try {
    const {status, startDate, endDate} = req.query;

    // ----- EXTRA QUERY -----
    const extraQuery = {};
    if (status) extraQuery.status = status;
    if (startDate || endDate) {
      extraQuery.createdAt = {};
      if (startDate) extraQuery.createdAt.$gte = new Date(startDate);
      if (endDate) extraQuery.createdAt.$lte = new Date(endDate);
    }

    // ----- PAGINATE -----
    const result = await paginate(Order, req, ["code"], extraQuery);

    const populatedData = await Order.populate(result.data, [
      {path: "customer_id"},
      {path: "vehicle_id"},
    ]);

    return success(res, OrderMessage.LIST_SUCCESS, {
      ...result,
      data: populatedData,
    });
  } catch (err) {
    next(err);
  }
}

// ==================== Get Order By ID ====================
export async function getOrderById(req, res, next) {
  try {
    const order = await Order.findById(req.params.id)
      .populate("customer_id")
      .populate("vehicle_id");

    if (!order) return errorRes(res, OrderMessage.NOT_FOUND, 404);
    return success(res, OrderMessage.DETAIL_SUCCESS, order);
  } catch (err) {
    next(err);
  }
}

// ==================== Update Order ====================
export async function updateOrder(req, res, next) {
  try {
    const {price, discount, promotion_id, payment_method, notes} = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return errorRes(res, OrderMessage.NOT_FOUND, 404);

    if (price !== undefined) order.price = price;
    if (discount !== undefined) order.discount = discount;
    if (promotion_id !== undefined) order.promotion_id = promotion_id;
    if (payment_method !== undefined) order.payment_method = payment_method;
    if (notes !== undefined) order.notes = notes;

    order.final_amount = await calculateFinalAmount(
      order.price,
      order.discount,
      order.promotion_id
    );

    await order.save();

    return success(res, OrderMessage.UPDATE_SUCCESS, order);
  } catch (err) {
    next(err);
  }
}

// ==================== Delete Order ====================
export async function deleteOrder(req, res, next) {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) return errorRes(res, OrderMessage.NOT_FOUND, 404);
    return success(res, OrderMessage.DELETE_SUCCESS, {id: order._id});
  } catch (err) {
    next(err);
  }
}

// ==================== Update Order Status ====================
export async function updateOrderStatus(req, res, next) {
  try {
    const {status} = req.body;
    const allowed = ["quote", "confirmed", "contract_signed", "delivered"];
    if (!allowed.includes(status))
      return errorRes(res, OrderMessage.INVALID_STATUS, 400);

    const order = await Order.findById(req.params.id);
    if (!order) return errorRes(res, OrderMessage.NOT_FOUND, 404);

    order.status = status;
    await order.save();

    return success(res, OrderMessage.STATUS_UPDATE_SUCCESS, order);
  } catch (err) {
    next(err);
  }
}
