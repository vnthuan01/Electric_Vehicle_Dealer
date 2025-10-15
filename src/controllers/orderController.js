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
import PromotionUsage from "../models/PromotionUsage.js";
import OrderRequest from "../models/OrderRequest.js";
import {ROLE} from "../enum/roleEnum.js";

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

function generateRequestCode() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return `REQ${yy}${mm}${dd}${hh}${min}${ss}`;
}

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

    // ================== VALIDATION DUPLICATE VEHICLE ==================
    const hasDuplicateVehicleWithColor = items.some((item, idx) => {
      return (
        items.findIndex(
          (i) => i.vehicle_id === item.vehicle_id && i.color === item.color
        ) !== idx
      );
    });

    if (hasDuplicateVehicleWithColor) {
      return res.status(400).json({
        message:
          "Duplicate vehicles with the same color in the order are not allowed",
      });
    }

    // ================== VALIDATION PROMOTION 1 LẦN/VEHICLE ==================
    for (const item of items) {
      if (item.promotion_id) {
        const promotion = await Promotion.findById(item.promotion_id).lean();
        if (!promotion) {
          return res.status(400).json({
            message: `Promotion ${item.promotion_id} not found`,
          });
        }
        const used = await Order.findOne({
          customer_id,
          "items.vehicle_id": item.vehicle_id,
          "items.promotion_id": item.promotion_id,
        }).lean();

        if (used) {
          return res.status(400).json({
            message: `Promotion ${item.promotion_id} has already been used for vehicle ${item.vehicle_id} by this customer`,
          });
        }
      }
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
      status: "pending",
    };

    // ================== Phân nhánh logic payment ==================
    if (payment_method === "installment") {
      orderData.paid_amount = totalAmount;
      orderData.status = "fullyPayment";
    } else {
      orderData.paid_amount = 0;
      orderData.status = "pending";
    }

    // ================== Tạo order ==================
    const order = await Order.create(orderData);

    // ================== Trừ stock ==================
    for (const item of itemsWithFinal) {
      if (item.category === "car") continue; // Không trừ stock cho category car
      await deductStock(
        [
          {
            vehicle_id: item.vehicle_id,
            color: item.color || null,
            quantity: item.quantity,
            options: item.options,
            accessories: item.accessories,
          },
        ],
        dealership_id
      );
    }

    // ================== Ghi log trạng thái ==================
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

    // Sau khi tạo order thành công, update promotion usage nếu có
    for (const item of itemsWithFinal) {
      if (item.promotion_id) {
        await PromotionUsage.updateMany(
          {
            customer_id,
            vehicle_id: item.vehicle_id,
            promotion_id: item.promotion_id,
            status: "pending",
          },
          {$set: {status: "used", order_id: order._id}}
        );
      }
    }

    return created(res, OrderMessage.CREATE_SUCCESS, {order});
  } catch (err) {
    next(err);
  }
}

//Request order cho dealer_staff tới dealer_manager
//function accept requestOrder từ nhiều hãng xe 1 lúc
export async function requestOrderAccordingToDemand(req, res, next) {
  try {
    const user = req.user;
    const {items = [], notes} = req.body;

    // --- Validate cơ bản ---
    if (!items.length)
      return errorRes(res, "At least one vehicle must be requested", 400);

    if (!user.dealership_id)
      return errorRes(res, "User must belong to a dealership", 400);

    // --- Chuẩn bị item ---
    const preparedItems = [];
    for (const item of items) {
      const vehicle = await Vehicle.findById(item.vehicle_id)
        .select("_id name manufacturer_id")
        .lean();
      if (!vehicle)
        return errorRes(res, `Vehicle not found: ${item.vehicle_id}`, 404);

      preparedItems.push({
        vehicle_id: vehicle._id,
        vehicle_name: vehicle.name,
        manufacturer_id: vehicle.manufacturer_id,
        color: item.color || null,
        quantity: item.quantity || 1,
        notes: item.notes || "",
      });
    }

    const code = generateRequestCode();

    // --- Tạo OrderRequest ---
    const request = await OrderRequest.create({
      code,
      requested_by: user.id,
      dealership_id: user.dealership_id,
      items: preparedItems,
      notes,
      status: "pending",
    });

    return created(res, "Order request created successfully", request);
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

export async function getOrdersForYours(req, res, next) {
  try {
    const {status, startDate, endDate} = req.query;
    const user_id = req.user.id;

    // ----- BASE QUERY -----
    const baseQuery = {salesperson_id: user_id}; // chỉ lấy order của chính user này

    // Nếu chưa có order nào của user này thì trả rỗng luôn
    const countOrders = await Order.countDocuments(baseQuery);
    if (countOrders === 0) {
      return success(res, OrderMessage.LIST_SUCCESS, {
        data: [],
        totalRecords: 0,
        limit: parseInt(req.query.limit) || 10,
        totalPages: 0,
        page: parseInt(req.query.page) || 1,
      });
    }

    // ----- FILTER EXTRA -----
    if (status) baseQuery.status = status;
    if (startDate || endDate) {
      baseQuery.createdAt = {};
      if (startDate) baseQuery.createdAt.$gte = new Date(startDate);
      if (endDate) baseQuery.createdAt.$lte = new Date(endDate);
    }

    // ----- PAGINATE -----
    const result = await paginate(Order, req, ["code"], baseQuery);

    // ----- POPULATE CUSTOMER -----
    const populatedData = await Order.populate(result.data, [
      {path: "customer_id", select: "full_name email phone"},
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
    const order = await Order.findById(req.params.id);
    if (!order) return errorRes(res, OrderMessage.NOT_FOUND, 404);

    // --- restore stock nếu order đang pending hoặc đã trừ stock ---
    if (order.status === "pending" && order.items?.length > 0) {
      for (const item of order.items) {
        // chỉ hoàn lại stock nếu trước đó có trừ (ở controller đang không trừ cho car)
        if (item.category === "car") continue;
        if (item.color) {
          await Vehicle.findOneAndUpdate(
            {
              _id: item.vehicle_id,
              "stocks.owner_type": "dealer",
              "stocks.color": item.color,
              "stocks.owner_id": order.dealership_id,
            },
            {$inc: {"stocks.$.quantity": item.quantity}}
          );
        } else {
          // Không có màu: hoàn vào entry đầu tiên của dealer hoặc tạo mới
          const vehicle = await Vehicle.findById(item.vehicle_id);
          if (vehicle) {
            let restored = false;
            for (const s of vehicle.stocks || []) {
              if (
                s.owner_type === "dealer" &&
                String(s.owner_id) === String(order.dealership_id)
              ) {
                s.quantity += item.quantity;
                restored = true;
                break;
              }
            }
            if (!restored) {
              vehicle.stocks.push({
                owner_type: "dealer",
                owner_id: order.dealership_id,
                quantity: item.quantity,
              });
            }
            await vehicle.save();
          }
        }
      }
    }

    // --- Soft delete order ---
    order.is_deleted = true;
    order.deleted_at = new Date();
    order.deleted_by = req.user._id;
    await order.save();

    // --- Soft delete debt liên quan ---
    const debt = await Debt.findOne({order_id: order._id});
    if (debt) {
      debt.is_deleted = true;
      debt.deleted_at = new Date();
      debt.deleted_by = req.user._id;
      await debt.save();
    }

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
      "closed",
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

// ==================== List Order Requests ====================
export async function listOrderRequests(req, res, next) {
  try {
    const {status, startDate, endDate, q} = req.query;
    const user = req.user;

    // --- Base query ---
    const query = {};

    // --- Role-based filters ---
    if (user.role.includes(ROLE.DEALER_STAFF)) {
      // Nhân viên chỉ xem request chính mình tạo
      query.requested_by = user.id;
    } else if (user.role.includes(ROLE.DEALER_MANAGER)) {
      // Manager xem được tất cả request của dealership
      query.dealership_id = user.dealership_id;
    } else if (user.role.includes(ROLE.EVM_STAFF)) {
      // Manufacturer xem request có chứa xe của hãng mình
      query["items.manufacturer_id"] = user.manufacturer_id;
    }

    // --- Filters ---
    if (status) query.status = status;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // --- Search by code ---
    if (q) query.code = {$regex: q, $options: "i"};

    // --- Pagination ---
    const result = await paginate(OrderRequest, req, ["code"], query);

    const populated = await OrderRequest.populate(result.data, [
      {path: "requested_by", select: "full_name email"},
      {path: "dealership_id", select: "name"},
    ]);

    return success(res, "List order requests successfully", {
      ...result,
      data: populated,
    });
  } catch (err) {
    next(err);
  }
}

// ==================== Reject Order Request ====================
export async function rejectOrderRequest(req, res, next) {
  try {
    const user = req.user;
    const {reason} = req.body;

    // --- Validate input ---
    if (!reason || !reason.trim()) {
      return errorRes(res, "Rejection reason is required", 400);
    }

    // --- Find request ---
    const request = await OrderRequest.findById(req.params.id);
    if (!request) return errorRes(res, "Order request not found", 404);

    // --- Validate status ---
    if (request.status !== "pending") {
      return errorRes(res, "Request already processed", 400);
    }

    // --- Update request ---
    request.status = "rejected";
    request.rejected_by = user.id;
    request.rejected_at = new Date();
    request.rejection_reason = reason.trim();

    await request.save();

    return success(res, "Order request rejected successfully", {
      id: request._id,
      code: request.code,
      status: request.status,
      rejection_reason: request.rejection_reason,
      rejected_by: user.id,
    });
  } catch (err) {
    next(err);
  }
}

// ==================== Approve Order Request (multi-manufacturer support) ====================
export async function approveOrderRequestMethodCash(req, res, next) {
  try {
    const user = req.user;

    const request = await OrderRequest.findById(req.params.id);
    if (!request) return errorRes(res, "Order request not found", 404);

    if (request.status !== "pending")
      return errorRes(res, "Request already processed", 400);

    request.status = "approved";
    request.approved_by = user.id;
    request.approved_at = new Date();
    await request.save();

    return success(res, "Order request approved successfully", request);
  } catch (err) {
    next(err);
  }
}
