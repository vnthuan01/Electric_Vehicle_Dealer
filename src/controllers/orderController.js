import Order from "../models/Order.js";
import Promotion from "../models/Promotion.js";
import Option from "../models/Option.js";
import Accessory from "../models/Accessory.js";
import {OrderMessage, VehicleMessage} from "../utils/MessageRes.js";
import {success, created, error as errorRes} from "../utils/response.js";
import {paginate} from "../utils/pagination.js";
import {createCustomerDebt} from "./debtController.js";
import Debt from "../models/Debt.js";
import Vehicle from "../models/Vehicle.js";

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

// Helper tính toán số tiền cuối cùng dựa vào discount, promotion, options, accessories
export async function calculateItemFinalAmount(item) {
  const {
    price,
    quantity = 1,
    discount = 0,
    promotion_id,
    options = [], // [{ option_id, name, price }]
    accessories = [], // [{ accessory_id, name, price, quantity }]
  } = item;

  // --- Promotion ---
  let promoDiscount = 0;
  if (promotion_id) {
    const promo = await Promotion.findById(promotion_id).lean();
    if (promo?.type === "percent") {
      promoDiscount = Math.round((price * (promo.value || 0)) / 100);
    } else if (promo?.type === "amount") {
      promoDiscount = promo.value || 0;
    }
  }

  // --- Options total ---
  const optionsTotal = options.reduce((sum, o) => sum + (o.price || 0), 0);

  // --- Accessories total ---
  const accessoriesTotal = accessories.reduce(
    (sum, a) => sum + (a.price || 0) * (a.quantity || 1),
    0
  );

  // --- Subtotal & final amount ---
  const subtotal = (price + optionsTotal + accessoriesTotal) * quantity;
  const finalAmount = subtotal - discount - promoDiscount;

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
      items = [], // [{ vehicle_id, quantity, discount, promotion_id, options:[], accessories:[{ accessory_id, quantity }] }]
    } = req.body;

    if (!items.length) {
      return res
        .status(400)
        .json({message: OrderMessage.MISSING_REQUIRED_FIELDS});
    }

    const itemsWithFinal = [];

    for (const item of items) {
      // --- Vehicle snapshot ---
      const vehicle = await Vehicle.findById(item.vehicle_id).lean();
      if (!vehicle)
        throw new Error(VehicleMessage.NOT_FOUND + ": " + item.vehicle_id);

      // --- Options snapshot ---
      let optionSnapshots = [];
      if (item.options?.length) {
        const optionIds = item.options.map((o) =>
          typeof o === "string" ? o : o.option_id
        );
        const optionDocs = await Option.find({_id: {$in: optionIds}}).lean();
        optionSnapshots = optionDocs.map((o) => ({
          option_id: o._id,
          name: o.name,
          price: o.price,
        }));
      }

      // --- Accessories snapshot ---
      let accessorySnapshots = [];
      if (item.accessories?.length) {
        const ids = item.accessories.map((a) => a.accessory_id);
        const accessoryDocs = await Accessory.find({_id: {$in: ids}}).lean();
        accessorySnapshots = accessoryDocs.map((a) => {
          const input = item.accessories.find(
            (x) => x.accessory_id == a._id.toString()
          );
          return {
            accessory_id: a._id,
            name: a.name,
            price: a.price,
            quantity: input?.quantity || 1,
          };
        });
      }

      // --- Final amount ---
      const final_amount = await calculateItemFinalAmount({
        price: vehicle.price,
        quantity: item.quantity || 1,
        discount: item.discount || 0,
        promotion_id: item.promotion_id || null,
        options: optionSnapshots,
        accessories: accessorySnapshots,
      });

      itemsWithFinal.push({
        vehicle_id: vehicle._id,
        vehicle_name: vehicle.name,
        vehicle_price: vehicle.price,
        quantity: item.quantity || 1,
        discount: item.discount || 0,
        promotion_id: item.promotion_id || null,
        options: optionSnapshots,
        accessories: accessorySnapshots,
        final_amount,
      });
    }

    // --- Tổng tiền toàn order ---
    const totalAmount = itemsWithFinal.reduce(
      (sum, i) => sum + i.final_amount,
      0
    );
    const code = generateOrderCode();

    const order = await Order.create({
      code,
      customer_id,
      dealership_id,
      salesperson_id: req.user ? req.user.id : null,
      items: itemsWithFinal,
      final_amount: totalAmount,
      paid_amount: 0,
      payment_method,
      status: "quote",
      notes,
    });

    // Công nợ
    createCustomerDebt(order);

    return created(res, OrderMessage.CREATE_SUCCESS, {
      order,
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
    const {items, payment_method, notes} = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return errorRes(res, OrderMessage.NOT_FOUND, 404);

    // If items provided, rebuild snapshots and recalc per-item final amounts
    if (Array.isArray(items)) {
      const itemsWithFinal = [];

      for (const item of items) {
        // Vehicle snapshot
        const vehicle = await Vehicle.findById(item.vehicle_id).lean();
        if (!vehicle)
          throw new Error(VehicleMessage.NOT_FOUND + ": " + item.vehicle_id);

        // Options snapshot
        let optionSnapshots = [];
        if (item.options?.length) {
          const optionIds = item.options.map((o) =>
            typeof o === "string" ? o : o.option_id
          );
          const optionDocs = await Option.find({_id: {$in: optionIds}}).lean();
          optionSnapshots = optionDocs.map((o) => ({
            option_id: o._id,
            name: o.name,
            price: o.price,
          }));
        }

        // Accessories snapshot
        let accessorySnapshots = [];
        if (item.accessories?.length) {
          const ids = item.accessories.map((a) => a.accessory_id);
          const accessoryDocs = await Accessory.find({_id: {$in: ids}}).lean();
          accessorySnapshots = accessoryDocs.map((a) => {
            const input = item.accessories.find(
              (x) => x.accessory_id == a._id.toString()
            );
            return {
              accessory_id: a._id,
              name: a.name,
              price: a.price,
              quantity: input?.quantity || 1,
            };
          });
        }

        // Final amount per item
        const itemFinal = await calculateItemFinalAmount({
          price: vehicle.price,
          quantity: item.quantity || 1,
          discount: item.discount || 0,
          promotion_id: item.promotion_id || null,
          options: optionSnapshots,
          accessories: accessorySnapshots,
        });

        itemsWithFinal.push({
          vehicle_id: vehicle._id,
          vehicle_name: vehicle.name,
          vehicle_price: vehicle.price,
          quantity: item.quantity || 1,
          discount: item.discount || 0,
          promotion_id: item.promotion_id || null,
          options: optionSnapshots,
          accessories: accessorySnapshots,
          final_amount: itemFinal,
        });
      }

      order.items = itemsWithFinal;
    }

    if (payment_method !== undefined) order.payment_method = payment_method;
    if (notes !== undefined) order.notes = notes;

    // Recalculate order total
    order.final_amount = (order.items || []).reduce(
      (sum, i) => sum + (i.final_amount || 0),
      0
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
    const {status, paid_amount} = req.body; // nhận thêm paid_amount nếu muốn cập nhật
    const allowed = ["quote", "confirmed", "contract_signed", "delivered"];
    if (!allowed.includes(status))
      return errorRes(res, OrderMessage.INVALID_STATUS, 400);

    const order = await Order.findById(req.params.id);
    if (!order) return errorRes(res, OrderMessage.NOT_FOUND, 404);

    order.status = status;

    // Nếu có paid_amount gửi lên => cập nhật
    if (paid_amount !== undefined) {
      order.paid_amount = paid_amount;

      // Tính remaining
      const remaining = order.final_amount - order.paid_amount;

      // Cập nhật/ tạo Debt
      let debt = await Debt.findOne({order_id: order._id});
      const debtStatus =
        remaining === 0 ? "settled" : order.paid_amount ? "partial" : "open";

      if (debt) {
        debt.paid_amount = order.paid_amount;
        debt.remaining_amount = remaining;
        debt.status = debtStatus;
        await debt.save();
      } else {
        debt = await Debt.create({
          customer_id: order.customer_id,
          order_id: order._id,
          total_amount: order.final_amount,
          paid_amount: order.paid_amount,
          remaining_amount: remaining,
          status: debtStatus,
        });
      }
    }

    await order.save();

    return success(res, OrderMessage.STATUS_UPDATE_SUCCESS, {order});
  } catch (err) {
    next(err);
  }
}
