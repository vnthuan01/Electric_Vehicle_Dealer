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
import Payment from "../models/Payment.js";
import {createStatusLog} from "./orderStatusLogController.js";

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
    options = [], // [{ option_id, name, price }]
    accessories = [], // [{ accessory_id, name, price, quantity }]
  } = item;

  // --- Options total ---
  const optionsTotal = options.reduce((sum, o) => sum + (o.price || 0), 0);

  // --- Accessories total ---
  const accessoriesTotal = accessories.reduce(
    (sum, a) => sum + (a.price || 0) * (a.quantity || 1),
    0
  );

  // --- Subtotal & final amount ---
  const subtotal = (price + optionsTotal + accessoriesTotal) * quantity;
  const finalAmount = subtotal - discount;

  return finalAmount > 0 ? finalAmount : 0;
}

// Helper kiểm tra tồn kho có đủ không (theo màu nếu có)
async function checkStockAvailability(items, dealership_id) {
  const stockChecks = [];

  for (const item of items) {
    const vehicle = await Vehicle.findById(item.vehicle_id).lean();
    if (!vehicle) throw new Error(`Vehicle not found: ${item.vehicle_id}`);

    let availableQuantity = 0;
    if (item.color) {
      const dealerStockByColor = vehicle.stocks?.find(
        (stock) =>
          stock.owner_type === "dealer" &&
          stock.owner_id.toString() === dealership_id.toString() &&
          stock.color === item.color
      );
      availableQuantity = dealerStockByColor?.quantity || 0;
    } else {
      const dealerStocks = (vehicle.stocks || []).filter(
        (s) =>
          s.owner_type === "dealer" &&
          s.owner_id.toString() === dealership_id.toString()
      );
      availableQuantity = dealerStocks.reduce(
        (sum, s) => sum + (s.quantity || 0),
        0
      );
    }

    const requestedQuantity = item.quantity || 1;

    if (availableQuantity < requestedQuantity) {
      throw new Error(
        `Insufficient stock for vehicle ${
          vehicle.name
        }$${""}. Available: ${availableQuantity}, Requested: ${requestedQuantity}`
      );
    }

    stockChecks.push({
      vehicle_id: vehicle._id,
      vehicle_name: vehicle.name,
      color: item.color || null,
      available: availableQuantity,
      requested: requestedQuantity,
    });
  }

  return stockChecks;
}

// Helper trừ stock sau khi tạo đơn thành công (ưu tiên theo màu)
async function deductStock(items, dealership_id) {
  for (const item of items) {
    const vehicle = await Vehicle.findById(item.vehicle_id);
    if (!vehicle) continue;

    let remain = item.quantity || 1;
    if (item.color) {
      const stockIndex = vehicle.stocks?.findIndex(
        (stock) =>
          stock.owner_type === "dealer" &&
          stock.owner_id.toString() === dealership_id.toString() &&
          stock.color === item.color
      );
      if (stockIndex >= 0) {
        const deduct = Math.min(remain, vehicle.stocks[stockIndex].quantity);
        vehicle.stocks[stockIndex].quantity -= deduct;
        remain -= deduct;
      }
    } else {
      for (const s of vehicle.stocks || []) {
        if (
          s.owner_type === "dealer" &&
          s.owner_id.toString() === dealership_id.toString() &&
          remain > 0
        ) {
          const deduct = Math.min(remain, s.quantity || 0);
          s.quantity -= deduct;
          remain -= deduct;
        }
      }
    }
    await vehicle.save();
  }
}

// ==================== Create Order ====================
export async function createOrder(req, res, next) {
  try {
    const {
      customer_id,
      payment_method = "cash",
      notes,
      items = [], // [{ vehicle_id, quantity, discount, promotion_id, options:[], accessories:[{ accessory_id, quantity }] }]
    } = req.body;

    if (!items.length) {
      return res
        .status(400)
        .json({message: OrderMessage.MISSING_REQUIRED_FIELDS});
    }

    const dealership_id = req.user?.dealership_id;
    if (!dealership_id) {
      return res.status(400).json({message: "Dealership ID required"});
    }

    // ================== KIỂM TRA TỒN KHO ==================
    await checkStockAvailability(items, dealership_id);

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

      // --- Final amount per item ---
      const final_amount = await calculateItemFinalAmount({
        price: vehicle.price,
        quantity: item.quantity || 1,
        discount: item.discount || 0,
        options: optionSnapshots,
        accessories: accessorySnapshots,
      });

      itemsWithFinal.push({
        vehicle_id: vehicle._id,
        vehicle_name: vehicle.name,
        color: item.color,
        vehicle_price: vehicle.price,
        quantity: item.quantity || 1,
        discount: item.discount || 0,
        promotion_id: item.promotion_id || null,
        options: optionSnapshots,
        accessories: accessorySnapshots,
        final_amount,
        category: vehicle.category || null,
      });
    }

    // --- Tổng tiền toàn order ---
    const totalAmount = itemsWithFinal.reduce(
      (sum, i) => sum + i.final_amount,
      0
    );
    const code = generateOrderCode();

    const orderData = {
      code,
      customer_id,
      dealership_id,
      salesperson_id: req.user?.id || null,
      items: itemsWithFinal,
      final_amount: totalAmount,
      notes,
      payment_method,
      status: "quote",
    };

    // ================== Phân nhánh logic ==================
    if (payment_method === "installment") {
      orderData.paid_amount = totalAmount;
      orderData.status = "fullyPayment";
    } else {
      orderData.paid_amount = 0;
      orderData.status = "pending";
    }

    // ================== Tạo đơn hàng ==================
    const order = await Order.create(orderData);

    // ================== TRỪ STOCK SAU KHI TẠO ĐƠN THÀNH CÔNG ==================
    for (const item of itemsWithFinal) {
      if (item.category === "car") continue; // Không trừ stock cho category car
      await deductStock(
        [
          {
            vehicle_id: item.vehicle_id,
            quantity: item.quantity,
            options: item.options,
            accessories: item.accessories,
          },
        ],
        dealership_id
      );
    }

    // ================== GHI LOG TRẠNG THÁI ==================
    await createStatusLog(
      order._id,
      null,
      orderData.status,
      req.user?.id,
      "Order created",
      `Order created with ${items.length} items, total amount: ${totalAmount}`,
      {
        changed_by_name: req.user?.full_name || "System",
        ip_address: req.ip,
        user_agent: req.get("User-Agent"),
      }
    );

    // ================== Tạo công nợ & payment ==================
    if (payment_method === "cash") {
      await createCustomerDebt(order);
    } else if (payment_method === "installment") {
      await Payment.create({
        order_id: order._id,
        customer_id,
        amount: totalAmount,
        method: "installment",
        reference: "Full payment on order creation",
        paid_at: new Date(),
      });
    }

    return created(res, OrderMessage.CREATE_SUCCESS, {order});
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
    // Populate customer only; vehicles are inside item snapshots
    const populatedData = await Order.populate(result.data, [
      {path: "customer_id"},
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
    const order = await Order.findById(req.params.id).populate("customer_id");

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
    const {status} = req.body; //
    const allowed = [
      "pending",
      "confirmed",
      "halfPayment",
      "fullyPayment",
      "contract_signed",
      "delivered",
    ];
    if (!allowed.includes(status))
      return errorRes(res, OrderMessage.INVALID_STATUS, 400);

    const order = await Order.findById(req.params.id);
    if (!order) return errorRes(res, OrderMessage.NOT_FOUND, 404);

    order.status = status;

    await order.save();

    return success(res, OrderMessage.STATUS_UPDATE_SUCCESS, {order});
  } catch (err) {
    next(err);
  }
}
