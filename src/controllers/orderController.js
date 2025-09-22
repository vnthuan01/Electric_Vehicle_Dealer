import Order from "../models/Order.js";
import Promotion from "../models/Promotion.js";
import * as zalopayService from "../services/ZaloPayService.js";
import {createOrder as createPaypalOrder} from "../services/paypalService.js";
import {success, created, error as errorRes} from "../utils/response.js";
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

// Tạo đơn hàng/báo giá
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

    //Tính tổng tiền cuối cùng
    const final_amount = await calculateFinalAmount(
      price,
      discount,
      promotion_id
    );

    //Sinh mã đơn hàng
    const code = generateOrderCode();

    //Tạo đơn hàng trong DB
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

    //Tạo công nợ khách hàng và đại lý-hãng
    await createCustomerDebt(order);

    //Xử lý thanh toán ZaloPay
    let zalopayData = null;
    if (payment_method === "zalopay") {
      const orderData = {
        app_trans_id: `order_${Date.now()}`,
        amount: final_amount,
        description: `Thanh toán đơn hàng ${code}`,
        return_url: `${process.env.CLIENT_URL}/order/${order._id}/payment-return`,
        embed_data: {order_id: order._id.toString()},
        item: [],
      };
      zalopayData = await zalopayService.createOrder(orderData);
    }

    //Xử lý thanh toán PayPal
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

    //Trả về response
    return created(res, "Tạo đơn hàng thành công", {
      order,
      zalopay: zalopayData,
      paypal: paypalData,
    });
  } catch (err) {
    next(err);
  }
}

// Capture đơn hàng sau khi khách redirect từ PayPal
export async function createCapturePaypal(req, res) {
  try {
    const {orderId} = req.body;
    const captureData = await captureOrder(orderId);
    res.json(captureData);
  } catch (err) {
    res.status(500).json({error: err.message});
  }
}

// Lấy danh sách đơn hàng với filter & search cơ bản
export async function getOrders(req, res, next) {
  try {
    const {status, q} = req.query;
    const conditions = {};
    if (status) conditions.status = status;
    if (q) conditions.code = {$regex: q, $options: "i"};

    const orders = await Order.find(conditions)
      .populate("customer_id")
      .populate("vehicle_id")
      .sort({createdAt: -1});

    return success(res, "Danh sách đơn hàng", orders);
  } catch (err) {
    next(err);
  }
}

// Lấy chi tiết đơn hàng
export async function getOrderById(req, res, next) {
  try {
    const order = await Order.findById(req.params.id)
      .populate("customer_id")
      .populate("vehicle_id");

    if (!order) return errorRes(res, "Không tìm thấy đơn hàng", 404);
    return success(res, "Chi tiết đơn hàng", order);
  } catch (err) {
    next(err);
  }
}

// Cập nhật đơn hàng (không bao gồm trạng thái)
export async function updateOrder(req, res, next) {
  try {
    const {price, discount, promotion_id, payment_method, notes} = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return errorRes(res, "Không tìm thấy đơn hàng", 404);

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

    return success(res, "Cập nhật đơn hàng thành công", order);
  } catch (err) {
    next(err);
  }
}

// Xoá đơn hàng
export async function deleteOrder(req, res, next) {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) return errorRes(res, "Không tìm thấy đơn hàng", 404);
    return success(res, "Đã xoá đơn hàng", {id: order._id});
  } catch (err) {
    next(err);
  }
}

// Cập nhật trạng thái đơn hàng: quote -> confirmed -> contract_signed -> delivered
export async function updateOrderStatus(req, res, next) {
  try {
    const {status} = req.body;
    const allowed = ["quote", "confirmed", "contract_signed", "delivered"];
    if (!allowed.includes(status))
      return errorRes(res, "Trạng thái không hợp lệ", 400);

    const order = await Order.findById(req.params.id);
    if (!order) return errorRes(res, "Không tìm thấy đơn hàng", 404);

    order.status = status;
    await order.save();

    return success(res, "Cập nhật trạng thái đơn hàng thành công", order);
  } catch (err) {
    next(err);
  }
}
