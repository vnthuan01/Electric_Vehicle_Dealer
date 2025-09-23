import Order from "../models/Order.js";
import Promotion from "../models/Promotion.js";
import * as zalopayService from "../services/ZaloPayService.js";
import {createOrder as createPaypalOrder} from "../services/paypalService.js";
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
async function calculateFinalAmount(price, discount = 0, promotion_id = null) {
  let promoDiscount = 0;
  if (promotion_id) {
    const promo = await Promotion.findById(promotion_id).lean();
    if (promo?.type === "percent") {
      promoDiscount = Math.round((price * (promo.value || 0)) / 100);
    } else if (promo?.type === "amount") {
      promoDiscount = promo.value || 0;
    }
  }
  const finalAmount = Math.max(0, price - discount - promoDiscount);
  return finalAmount;
}

// ==================== Create Order ====================
export async function createOrder(req, res, next) {
  try {
    const {
      customer_id,
      vehicle_id,
      dealership_id,
      manufacturer_id,
      price,
      discount = 0,
      promotion_id = null,
      payment_method = "cash",
      notes,
    } = req.body;

    const final_amount = await calculateFinalAmount(
      price,
      discount,
      promotion_id
    );
    const code = generateOrderCode();

    const order = await Order.create({
      code,
      customer_id,
      vehicle_id,
      dealership_id,
      manufacturer_id,
      salesperson_id: req.user?.id,
      price,
      discount,
      promotion_id,
      final_amount,
      payment_method,
      status: "quote",
      notes,
    });

    await createCustomerDebt(order);

    let zalopayData = null;
    if (payment_method === "zalopay") {
      const orderData = {
        app_trans_id: `order_${Date.now()}`,
        amount: final_amount,
        description: `Payment for order ${code}`,
        return_url: `${process.env.CLIENT_URL}/order/${order._id}/payment-return`,
        embed_data: {order_id: order._id.toString()},
        item: [],
      };
      zalopayData = await zalopayService.createOrder(orderData);
    }

    let paypalData = null;
    if (payment_method === "paypal") {
      const paypalOrder = await createPaypalOrder(
        final_amount.toFixed(2),
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
export async function createCapturePaypal(req, res) {
  try {
    const {orderId} = req.body;
    const captureData = await captureOrder(orderId);
    res.json(captureData);
  } catch (err) {
    res.status(500).json({error: err.message});
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
