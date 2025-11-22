import mongoose from "mongoose";
import Order from "../models/Order.js";
import Promotion from "../models/Promotion.js";
import Option from "../models/Option.js";
import Accessory from "../models/Accessory.js";
import {OrderMessage, VehicleMessage} from "../utils/MessageRes.js";
import {success, created, error as errorRes} from "../utils/response.js";
import {paginate} from "../utils/pagination.js";
import {
  createCustomerDebt,
  revertDealerManufacturerByOrderPayment,
} from "./debtController.js";
import Debt from "../models/Debt.js";
import Vehicle from "../models/Vehicle.js";
import Payment from "../models/Payment.js";
import {createStatusLog} from "./orderStatusLogController.js";
import PromotionUsage from "../models/PromotionUsage.js";
import OrderRequest from "../models/OrderRequest.js";
import {ROLE} from "../enum/roleEnum.js";
import Customer from "../models/Customer.js";
import Quote from "../models/Quote.js";
import Dealership from "../models/Dealership.js";
import {capitalizeVietnamese} from "../utils/validateWord.js";
import RequestVehicle from "../models/RequestVehicle.js";
import {emitRequestStatusUpdate} from "../config/socket.js";

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

// ==================== Create Order ====================
/**
 * Tạo đơn hàng từ báo giá (Quote)
 * Luồng: Quote (valid) → Order (pending)
 *
 * Chức năng:
 * 1. Validate quote_id, quote status, customer
 * 2. Copy snapshot data từ quote (items, prices, promotions)
 * 3. Tạo Order với status = "pending", paid_amount = 0
 * 4. Ghi log trạng thái order
 * 5. Update PromotionUsage: đánh dấu "used" và cancel các quote khác dùng promotion này
 *
 * NOTE:
 * - KHÔNG check stock, KHÔNG trừ stock ở bước này
 * - KHÔNG tạo Debt (công nợ chỉ tạo khi khách cọc)
 * - Stock sẽ được check và trừ khi khách cọc (payDeposit API)
 */
export async function createOrder(req, res, next) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {quote_id, notes} = req.body;

    // ========== STEP 1: VALIDATE ==========

    // 1.1. Validate dealership_id
    const dealership_id = req.user?.dealership_id;
    if (!dealership_id) {
      await session.abortTransaction();
      return errorRes(res, "Cần dealership_id để tạo đơn hàng", 400);
    }

    // 1.2. Validate quote_id BẮT BUỘC
    if (!quote_id) {
      await session.abortTransaction();
      return errorRes(
        res,
        "quote_id là bắt buộc! Order chỉ được tạo từ báo giá.",
        400
      );
    }

    // 1.3. Lấy Quote và validate
    const quote = await Quote.findById(quote_id).session(session).lean();
    if (!quote) {
      await session.abortTransaction();
      return errorRes(res, "Không tìm thấy báo giá!", 404);
    }

    // 1.4. Validate quote không bị xóa
    if (quote.is_deleted) {
      await session.abortTransaction();
      return errorRes(res, "Báo giá đã bị xóa!", 400);
    }

    // 1.5. Validate quote status phải là "valid"
    if (quote.status !== "valid") {
      await session.abortTransaction();
      return errorRes(
        res,
        `Báo giá không hợp lệ (status: ${quote.status}). Chỉ báo giá "valid" mới có thể chuyển thành đơn hàng.`,
        400
      );
    }

    // 1.6. Validate quote chưa được chuyển thành order
    const existingOrder = await Order.findOne({
      quote_id: quote_id,
      is_deleted: false,
    })
      .session(session)
      .lean();
    if (existingOrder) {
      await session.abortTransaction();
      return errorRes(
        res,
        `Báo giá này đã được chuyển thành đơn hàng (${existingOrder.code})!`,
        400
      );
    }

    // 1.7. Validate customer
    const customer_id = quote.customer_id;
    const customer = await Customer.findById(customer_id)
      .session(session)
      .lean();
    if (!customer) {
      await session.abortTransaction();
      return errorRes(res, "Không tìm thấy khách hàng!", 404);
    }

    // 1.8. Validate items không rỗng
    const items = quote.items;
    if (!items || items.length === 0) {
      await session.abortTransaction();
      return errorRes(res, "Báo giá không có sản phẩm nào!", 400);
    }

    // 1.9. Validate mỗi xe PHẢI có màu
    for (const item of items) {
      if (!item.color || item.color.trim() === "") {
        await session.abortTransaction();
        return errorRes(
          res,
          `Xe "${
            item.vehicle_name || item.vehicle_id
          }" trong báo giá chưa có màu! ` +
            "Vui lòng cập nhật báo giá và chọn màu xe trước khi tạo đơn hàng.",
          400
        );
      }
    }

    // 1.10. Validate không có xe trùng (cùng vehicle_id và màu)
    const hasDuplicateVehicleWithColor = items.some((item, idx) => {
      return (
        items.findIndex(
          (i) =>
            String(i.vehicle_id) === String(item.vehicle_id) &&
            i.color === item.color
        ) !== idx
      );
    });
    if (hasDuplicateVehicleWithColor) {
      await session.abortTransaction();
      return errorRes(
        res,
        "Không cho phép xe với màu sắc giống nhau trong đơn hàng!",
        400
      );
    }

    // ========== STEP 2: TẠO ORDER (STATUS = "PENDING") ==========

    // 2.1. Copy snapshot từ quote và lấy thêm category từ Vehicle
    const itemsWithFinal = [];
    for (const item of items) {
      // Lấy category từ Vehicle model (vì Quote không lưu category)
      const vehicle = await Vehicle.findById(item.vehicle_id)
        .select("category")
        .session(session)
        .lean();

      itemsWithFinal.push({
        vehicle_id: item.vehicle_id,
        vehicle_name: item.vehicle_name,
        vehicle_price: item.vehicle_price,
        color: item.color || null,
        category: vehicle?.category || null, // Lấy từ Vehicle model
        quantity: item.quantity || 1,
        discount: item.discount || 0,
        promotion_id: item.promotion_id || null,
        options: item.options || [],
        accessories: item.accessories || [],
        final_amount: item.final_amount,
      });
    }

    // 2.2. Tính tổng tiền
    const totalAmount = itemsWithFinal.reduce(
      (sum, i) => sum + i.final_amount,
      0
    );

    // 2.3. Generate order code
    const code = generateOrderCode();

    // 2.4. Tạo order data
    const orderData = {
      code,
      customer_id,
      dealership_id,
      salesperson_id: req.user?.id || null,
      quote_id,
      items: itemsWithFinal,
      final_amount: totalAmount,
      paid_amount: 0, // Chưa thanh toán gì
      payment_method: "cash", // Mặc định trả thẳng
      status: "pending", // Mới tạo, chờ khách cọc
      notes: notes || quote.notes || "",
    };

    // 2.5. Tạo Order
    const [order] = await Order.create([orderData], {session});
    // 2.6 Set báo giá là đã sài
    await Quote.updateOne({_id: quote_id}, {$set: {status: "used"}}, {session});
    // ========== STEP 3: GHI LOG ORDER STATUS ==========
    await createStatusLog(
      order._id,
      null, // old_status = null (lần đầu tạo)
      "pending", // new_status
      req.user?.id,
      "Tạo đơn hàng từ báo giá",
      `Đơn hàng được tạo từ báo giá ${quote.code} với ${
        itemsWithFinal.length
      } sản phẩm, tổng tiền: ${totalAmount.toLocaleString()}đ`,
      {
        changed_by_name: req.user?.full_name || "System",
        ip_address: req.ip,
        user_agent: req.get("User-Agent"),
      }
    );

    // ========== STEP 4: UPDATE PROMOTION USAGE ==========
    for (const item of itemsWithFinal) {
      if (item.promotion_id) {
        // 5.1. Đánh dấu promotion của quote này là "used"
        await PromotionUsage.updateMany(
          {
            customer_id,
            vehicle_id: item.vehicle_id,
            promotion_id: item.promotion_id,
            quote_id,
            status: {$in: ["pending", "available"]},
            order_id: null,
          },
          {
            $set: {
              status: "used",
              order_id: order._id,
              used_at: new Date(),
            },
          },
          {session}
        );

        // 5.2. Cancel tất cả PromotionUsage khác của customer này (cùng promotion, khác quote)
        const canceledUsages = await PromotionUsage.updateMany(
          {
            customer_id,
            vehicle_id: item.vehicle_id,
            promotion_id: item.promotion_id,
            status: {$in: ["pending", "available"]},
            quote_id: {$ne: quote_id},
          },
          {$set: {status: "canceled"}},
          {session}
        );

        // 5.3. Nếu có usage bị cancel → cập nhật các quote tương ứng
        if (canceledUsages.modifiedCount > 0) {
          const affectedQuotes = await PromotionUsage.distinct(
            "quote_id",
            {
              customer_id,
              vehicle_id: item.vehicle_id,
              promotion_id: item.promotion_id,
              status: "canceled",
              quote_id: {$ne: quote_id},
            },
            {session}
          );

          if (affectedQuotes.length > 0) {
            await Quote.updateMany(
              {_id: {$in: affectedQuotes}, status: "valid"},
              {$set: {status: "canceled"}},
              {session}
            );
          }
        }
      }
    }

    // ========== COMMIT TRANSACTION ==========
    await session.commitTransaction();

    // ========== POPULATE & RETURN ==========
    const populatedOrder = await Order.findById(order._id)
      .populate("customer_id", "full_name email phone")
      .populate("dealership_id", "name")
      .populate("salesperson_id", "full_name email")
      .lean();

    return created(res, "Đơn hàng được tạo thành công!", populatedOrder);
  } catch (err) {
    await session.abortTransaction();
    console.error(" Create Order Error:", err);
    next(err);
  } finally {
    session.endSession();
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
      {path: "salesperson_id", select: "full_name email phone"},
      {path: "dealership_id", select: "company_name"},
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
      .populate({path: "customer_id", select: "full_name email phone"})
      .populate({path: "salesperson_id", select: "full_name email phone"})
      .populate({path: "dealership_id", select: "company_name"});
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
          const optionDocs = await Option.find({
            _id: {$in: optionIds},
          }).lean();
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
          const accessoryDocs = await Accessory.find({
            _id: {$in: ids},
          }).lean();
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
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {cancellation_reason, refund_method = "cash"} = req.body;

    // --- validate reason ---
    if (!cancellation_reason || cancellation_reason.trim() === "") {
      return errorRes(res, "Vui lòng cung cấp lý do huỷ đơn hàng", 400);
    }

    const order = await Order.findById(req.params.id).session(session);
    if (!order) {
      await session.abortTransaction();
      return errorRes(res, OrderMessage.NOT_FOUND, 404);
    }

    // --- REFUND PAYMENT nếu đã thanh toán ---
    const refundPayments = [];

    if (order.paid_amount > 0) {
      const refundPayment = new Payment({
        order_id: order._id,
        customer_id: order.customer_id,
        dealership_id: order.dealership_id,
        amount: order.paid_amount,
        payment_type: "refund",
        method: refund_method, // mặc định cash
        notes: `Hoàn tiền do xoá đơn hàng ${order.code}. Lý do: ${cancellation_reason}`,
      });

      await refundPayment.save({session});
      refundPayments.push(refundPayment);

      console.log(`💰 Refund created for deleteOrder: ${refundPayment._id}`);
    }

    // --- RESTORE STOCK (GIỮ NGUYÊN LOGIC CŨ) ---
    const stockDeductedStatuses = [
      "deposit_paid",
      "vehicle_ready",
      "fully_paid",
      "delivered",
    ];

    if (
      stockDeductedStatuses.includes(order.status) &&
      order.items?.length > 0
    ) {
      for (const item of order.items) {
        if (!item.color) continue;

        const quantity = item.quantity || 1;

        if (item.used_stocks && item.used_stocks.length > 0) {
          const vehicle = await Vehicle.findById(item.vehicle_id).session(
            session
          );
          if (!vehicle) continue;

          for (const usedStock of item.used_stocks) {
            const stockEntry = vehicle.stocks.id(usedStock.stock_entry_id);
            if (!stockEntry) continue;

            if (stockEntry.sold_quantity !== undefined) {
              stockEntry.sold_quantity = Math.max(
                0,
                stockEntry.sold_quantity - usedStock.quantity
              );
              stockEntry.remaining_quantity =
                (stockEntry.remaining_quantity || 0) + usedStock.quantity;

              if (
                stockEntry.remaining_quantity > 0 &&
                stockEntry.status === "depleted"
              ) {
                stockEntry.status = "active";
              }
            } else {
              stockEntry.quantity =
                (stockEntry.quantity || 0) + usedStock.quantity;
            }
          }

          await vehicle.save({session});
        } else {
          await Vehicle.updateOne(
            {_id: item.vehicle_id},
            {
              $inc: {"stocks.$[elem].quantity": quantity},
            },
            {
              arrayFilters: [
                {
                  "elem.owner_type": "dealer",
                  "elem.owner_id": order.dealership_id,
                  "elem.color": item.color,
                },
              ],
              session,
            }
          );
        }
      }
    }

    // --- UPDATE PROMOTION USAGE (GIỮ NGUYÊN LOGIC CŨ) ---
    if (order.items && order.items.length > 0) {
      for (const item of order.items) {
        if (item.promotion_id) {
          const usageList = await PromotionUsage.find({
            order_id: order._id,
            promotion_id: item.promotion_id,
            status: {$in: ["used", "canceled"]},
          }).session(session);

          for (const usage of usageList) {
            const pendingQuotes = await PromotionUsage.find({
              customer_id: order.customer_id,
              promotion_id: item.promotion_id,
              status: {$in: ["pending", "available"]},
            }).session(session);

            if (pendingQuotes.length > 0) {
              await PromotionUsage.updateMany(
                {_id: {$in: pendingQuotes.map((q) => q._id)}},
                {$set: {status: "canceled"}},
                {session}
              );

              usage.status = "canceled";
              await usage.save({session});
            } else {
              usage.status = "available";
              await usage.save({session});
            }
          }
        }
      }
    }

    // --- UPDATE ORDER STATUS + cancellation_reason (THÊM MỚI) ---
    const deleteNote = `[${new Date().toISOString()}] Đơn hàng bị xoá. Lý do: ${cancellation_reason}`;

    order.status = "canceled"; // thêm
    order.cancellation_reason = cancellation_reason; // thêm
    order.notes = order.notes ? `${order.notes}\n${deleteNote}` : deleteNote; // thêm

    // --- Soft delete ---
    order.is_deleted = true;
    order.deleted_at = new Date();
    order.deleted_by = req.user._id;
    await order.save({session});

    // --- Soft delete debt ---
    const debt = await Debt.findOne({order_id: order._id}).session(session);
    if (debt) {
      debt.is_deleted = true;
      debt.deleted_at = new Date();
      debt.deleted_by = req.user._id;
      await debt.save({session});
    }

    // --- Soft delete order requests ---
    const orderRequests = await OrderRequest.find({
      order_id: order._id,
      status: {$nin: ["canceled", "deleted"]},
    }).session(session);

    if (orderRequests.length > 0) {
      const orderRequestIds = orderRequests.map((req) => req._id);

      for (const reqDoc of orderRequests) {
        reqDoc.status = "canceled";
        reqDoc.notes = reqDoc.notes
          ? `${reqDoc.notes}\n[Auto canceled] Order ${order.code} was deleted`
          : `[Auto canceled] Order ${order.code} was deleted`;
        reqDoc.deleted_at = new Date();
        reqDoc.deleted_by = req.user._id;
        reqDoc.is_deleted = true;
        await reqDoc.save({session});
      }

      // --- Soft delete RequestVehicle from canceled orderRequests ---
      const requestVehicles = await RequestVehicle.find({
        order_request_id: {$in: orderRequestIds},
        is_deleted: {$ne: true},
      }).session(session);

      if (requestVehicles.length > 0) {
        for (const reqVehicle of requestVehicles) {
          reqVehicle.is_deleted = true;
          reqVehicle.deleted_at = new Date();
          reqVehicle.deleted_by = req.user._id;
          reqVehicle.notes = reqVehicle.notes
            ? `${reqVehicle.notes}\n[Auto deleted] Order ${order.code} was deleted`
            : `[Auto deleted] Order ${order.code} was deleted`;
          await reqVehicle.save({session});
        }
      }
    }

    // --- Revert dealer-manufacturer debt ---
    try {
      await revertDealerManufacturerByOrderPayment(order, session);
    } catch (debtErr) {
      console.error("Failed to revert dealer-manufacturer debt:", debtErr);
    }

    await session.commitTransaction();

    return success(res, OrderMessage.DELETE_SUCCESS, {
      id: order._id,
      refund_summary: {
        refunded: order.paid_amount > 0,
        refund_amount: order.paid_amount,
        refund_payments: refundPayments,
      },
    });
  } catch (err) {
    await session.abortTransaction();
    next(err);
  } finally {
    session.endSession();
  }
}

// ==================== Update Order Status ====================
export async function updateOrderStatus(req, res, next) {
  try {
    const {status} = req.body; //
    const allowed = [
      "pending",
      "deposit_paid",
      "waiting_vehicle_request",
      "waiting_bank_approval",
      "vehicle_ready",
      "fully_paid",
      "delivered",
      "completed",
      "canceled",
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

    const request = await OrderRequest.findById(req.params.id).populate(
      "items.vehicle_id"
    );
    if (!request) return errorRes(res, "Order request not found", 404);

    if (request.status !== "pending")
      return errorRes(res, "Request already processed", 400);

    // Cập nhật trạng thái approve
    request.status = "approved";
    request.approved_by = user.id;
    request.approved_at = new Date();
    await request.save();

    // Tạo request cho Manufacturer (nếu có items)
    const dealership = await Dealership.findById(request.dealership_id);
    if (!dealership) {
      return errorRes(res, "Dealership not found", 404);
    }

    const createdRequests = [];

    for (const item of request.items) {
      const vehicle = await Vehicle.findOne({
        _id: item.vehicle_id,
        status: "active",
        is_deleted: false,
      });

      if (!vehicle) continue;

      const normalizedColor = capitalizeVietnamese(item.color?.trim() || "");

      // Check duplicate pending request (cùng xe, màu, đại lý)
      const existing = await RequestVehicle.findOne({
        vehicle_id: item.vehicle_id,
        dealership_id: request.dealership_id,
        color: normalizedColor,
        status: "pending",
      });

      if (existing) {
        console.log(
          `Duplicate request for ${vehicle.name} (${normalizedColor}) skipped`
        );
        continue;
      }

      const newReq = await RequestVehicle.create({
        vehicle_id: item.vehicle_id,
        dealership_id: request.dealership_id,
        quantity: item.quantity,
        color: normalizedColor,
        notes: request.notes,
        status: "pending",
      });

      createdRequests.push(newReq);

      // Emit socket for new request
      if (req.app.get("io")) {
        emitRequestStatusUpdate(req.app.get("io"), {
          requestId: newReq._id,
          status: "pending",
          dealershipId: request.dealership_id,
          vehicle: {
            id: vehicle._id,
            name: vehicle.name,
            sku: vehicle.sku,
            color: normalizedColor,
          },
          quantity: item.quantity,
        });
      }
    }

    return success(
      res,
      "Order request approved and manufacturer requests created",
      {
        orderRequest: request,
        createdManufacturerRequests: createdRequests,
      }
    );
  } catch (err) {
    next(err);
  }
}

// ==================== Pay Deposit ====================
/**
 * Khách hàng cọc tiền + Check stock + Upload hợp đồng
 * Luồng: Order (pending) → Check stock → (deposit_paid hoặc waiting_vehicle_request)
 *
 * Chức năng:
 * 1. Validate order (phải ở trạng thái pending)
 * 2. Nhận tiền cọc từ khách
 * 3. Upload hợp đồng đã ký
 * 4. Check stock tại đại lý:
 *    a. Nếu CÓ stock → Trừ stock ngay (giữ chỗ) → status = "deposit_paid"
 *    b. Nếu HẾT stock → Tạo OrderRequest lên hãng → status = "waiting_vehicle_request"
 * 5. Tạo công nợ (Debt)
 * 6. Tạo hóa đơn payment (Payment)
 * 7. Update Order (paid_amount, status, stock_check, contract)
 * 8. Ghi log order status
 *
 * NOTE: Đây là API QUAN TRỌNG NHẤT trong luồng bán hàng
 */
export async function payDeposit(req, res, next) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {id} = req.params; // ID từ route params
    const {
      deposit_amount, // Số tiền cọc (VD: 10% của final_amount)
      payment_method, // "cash", "bank", "qr", "card" - cách thanh toán tiền cọc
      // signed_contract_url, // URL file hợp đồng đã ký (upload trước khi gọi API)
      notes,
    } = req.body;

    // ========== STEP 1: VALIDATE ORDER ==========

    // 1.1. Tìm order
    const order = await Order.findById(id).session(session);
    if (!order) {
      await session.abortTransaction();
      return errorRes(res, "Không tìm thấy đơn hàng!", 404);
    }

    // 1.2. Validate status phải là "pending"
    if (order.status !== "pending") {
      await session.abortTransaction();
      return errorRes(
        res,
        `Đơn hàng không ở trạng thái pending (hiện tại: ${order.status}). Chỉ đơn hàng pending mới có thể cọc.`,
        400
      );
    }

    // 1.2b. ✅ NEW: Log order payment_method để debug
    console.log(
      `[payDeposit] Order ${order.code}: payment_method=${
        order.payment_method || "cash"
      }`
    );

    // 1.3. Validate deposit_amount
    if (!deposit_amount || deposit_amount <= 0) {
      await session.abortTransaction();
      return errorRes(res, "Số tiền cọc phải lớn hơn 0!", 400);
    }

    if (deposit_amount > order.final_amount) {
      await session.abortTransaction();
      return errorRes(
        res,
        "Số tiền cọc không được vượt quá tổng tiền đơn hàng!",
        400
      );
    }

    // 1.4. Validate payment_method (cách thanh toán tiền cọc)
    const allowedMethods = ["cash", "bank", "qr", "card"];
    if (!allowedMethods.includes(payment_method)) {
      await session.abortTransaction();
      return errorRes(
        res,
        `Payment method phải là: ${allowedMethods.join(", ")}`,
        400
      );
    }

    // 1.5. ✅ NEW: Nếu order.payment_method="installment", thông báo flow tiếp theo
    if (order.payment_method === "installment") {
      console.log(
        `[payDeposit] ℹ️ Order ${order.code} is INSTALLMENT. After deposit, must submit bank loan application.`
      );
    }

    // ========== STEP 2: TẠO PAYMENT RECORD (TIỀN CỌC) ==========
    const payment = await Payment.create(
      [
        {
          order_id: order._id,
          customer_id: order.customer_id,
          method: payment_method,
          amount: deposit_amount,
          reference: `DEPOSIT_${order.code}`,
          notes: notes || "Tiền cọc đơn hàng",
          paid_at: new Date(),
        },
      ],
      {session}
    );

    // ========== STEP 3: UPLOAD HỢP ĐỒNG (NẾU CÓ) ==========
    // if (signed_contract_url) {
    //   // Lấy tên khách hàng để ghi vào contract
    //   const customer = await Customer.findById(order.customer_id)
    //     .session(session)
    //     .lean();

    //   order.contract = {
    //     signed_contract_url,
    //     signed_at: new Date(),
    //     signed_by: customer?.full_name || "Khách hàng",
    //     uploaded_by: req.user?.id,
    //     template_used: "standard_contract", // Có thể customize
    //   };
    // }

    // ========== STEP 4: CHECK STOCK ==========
    const stockCheckResult = await checkStockForOrder(
      order.items,
      order.dealership_id
    );

    // Lưu kết quả check stock vào order
    order.stock_check = {
      checked: true,
      checked_at: new Date(),
      checked_by: req.user?.id,
      has_stock: stockCheckResult.hasStock,
      stock_details: stockCheckResult.details,
    };

    let newStatus = "";
    let orderRequest = null;

    // ========== STEP 5a: CÓ STOCK → TRỪ STOCK NGAY (GIỮ CHỖ) ==========
    if (stockCheckResult.hasStock) {
      // Trừ stock để giữ chỗ cho khách
      await deductStockForOrder(order.items, order.dealership_id, session);

      // ✅ SET STOCK SOURCE: Xe có sẵn trong kho
      order.stock_source = "in_stock";

      newStatus = "deposit_paid"; // Đã cọc, xe đã được giữ

      // ========== STEP 5b: HẾT STOCK → TẠO ORDER REQUEST LÊN HÃNG ==========
    } else {
      // Tạo OrderRequest để request xe từ hãng
      const requestCode = generateRequestCode();

      // Lấy manufacturer_id từ Vehicle cho mỗi item
      const itemsWithManufacturer = await Promise.all(
        order.items.map(async (item) => {
          const vehicle = await Vehicle.findById(item.vehicle_id)
            .select("manufacturer_id")
            .session(session)
            .lean();

          return {
            vehicle_id: item.vehicle_id,
            vehicle_name: item.vehicle_name,
            manufacturer_id: vehicle?.manufacturer_id || null,
            color: item.color,
            quantity: item.quantity,
          };
        })
      );

      [orderRequest] = await OrderRequest.create(
        [
          {
            code: requestCode,
            requested_by: req.user?.id,
            dealership_id: order.dealership_id,
            order_id: order._id, // ✅ FIX: Thêm order_id để link về Order
            items: itemsWithManufacturer,
            status: "pending",
            notes: `Auto-created từ Order ${order.code} - Khách đã cọc`,
          },
        ],
        {session}
      );

      // Link OrderRequest vào Order
      order.order_request_id = orderRequest._id;

      // ✅ SET STOCK SOURCE: Xe phải request từ hãng
      order.stock_source = "requested";

      newStatus = "waiting_vehicle_request"; // Đang chờ hãng duyệt
    }

    // ========== STEP 6: TẠO CÔNG NỢ (DEBT) ==========
    // Cập nhật paid_amount trước khi tạo debt
    order.paid_amount = deposit_amount;

    await createCustomerDebt(order, session);

    // ========== STEP 6b: ĐỐI TRỪ CÔNG NỢ ĐẠI LÝ → HÃNG (NẾU ĐÃ TRỪ STOCK) ==========
    // ✅ FIX: Nếu xe có sẵn và đã trừ stock → Đại lý phải trả công nợ ngay cho hãng
    if (stockCheckResult.hasStock) {
      try {
        const {settleDealerManufacturerByOrderPayment} = await import(
          "./debtController.js"
        );
        await settleDealerManufacturerByOrderPayment(
          order,
          payment[0],
          session
        );
        console.log(
          `✅ Settled dealer-manufacturer debt for deposit on Order ${order.code}`
        );
      } catch (debtErr) {
        console.error(
          "⚠️ Failed to settle dealer-manufacturer debt on deposit:",
          debtErr
        );
        // ⚠️ Không throw error để không block luồng đặt cọc
      }
    }
    // ℹ️ Nếu xe chưa về (waiting_vehicle_request) → Chưa trả công nợ
    // Sẽ trả khi hãng giao xe và khách thanh toán tiếp

    // ========== STEP 7: UPDATE ORDER ==========
    const oldStatus = order.status;
    order.status = newStatus;
    await order.save({session});

    // ========== STEP 8: GHI LOG ORDER STATUS ==========
    await createStatusLog(
      order._id,
      oldStatus,
      newStatus,
      req.user?.id,
      "Khách hàng đã cọc",
      `Đã nhận tiền cọc ${deposit_amount.toLocaleString()}đ. ${
        stockCheckResult.hasStock
          ? "Xe có sẵn, đã trừ stock để giữ chỗ."
          : `Xe hết hàng, đã tạo request ${orderRequest?.code} lên hãng.`
      }`,
      {
        changed_by_name: req.user?.full_name || "System",
        ip_address: req.ip,
        user_agent: req.get("User-Agent"),
        payment_id: payment[0]._id,
        deposit_amount,
        has_stock: stockCheckResult.hasStock,
      }
    );

    // ========== COMMIT TRANSACTION ==========
    await session.commitTransaction();

    // ========== POPULATE & RETURN ==========
    const populatedOrder = await Order.findById(order._id)
      .populate("customer_id", "full_name email phone")
      .populate("dealership_id", "name")
      .populate("salesperson_id", "full_name email")
      .populate("order_request_id")
      .lean();

    // ✅ NEW: Build response message based on order.payment_method
    let responseMessage = "";
    if (order.payment_method === "installment") {
      responseMessage = stockCheckResult.hasStock
        ? "✅ Tiền cọc thành công (Trả góp). Bước tiếp: Gửi hồ sơ vay ngân hàng (submitBankLoanApplication)."
        : "✅ Tiền cọc thành công (Trả góp). Xe hết hàng, đã request từ hãng. Sau khi hãng duyệt sẽ gửi hồ sơ vay.";
    } else {
      responseMessage = stockCheckResult.hasStock
        ? "Xe có sẵn, đã giữ chỗ cho khách. Vài ngày sau sẽ gọi khách thanh toán số tiền còn lại."
        : "Xe hết hàng, đã tạo request lên hãng. Chờ hãng approve sẽ thông báo khách.";
    }

    return success(res, "Đã nhận tiền cọc thành công!", {
      order: populatedOrder,
      payment: payment[0],
      has_stock: stockCheckResult.hasStock,
      order_request: orderRequest || null,
      payment_method: order.payment_method || "cash",
      message: responseMessage,
      next_step:
        order.payment_method === "installment"
          ? "POST /api/bank-loans/submit (submit loan application)"
          : "POST /api/orders/:id/pay-final (pay remaining amount)",
    });
  } catch (err) {
    await session.abortTransaction();
    console.error("❌ Pay Deposit Error:", err);
    next(err);
  } finally {
    session.endSession();
  }
}

// ==================== Mark Vehicle Ready ====================
/**
 * Đánh dấu xe đã sẵn sàng, thông báo khách đến thanh toán phần còn lại
 * Luồng:
 *   - deposit_paid → vehicle_ready (xe có sẵn, đã chuẩn bị xong)
 *   - waiting_vehicle_request → vehicle_ready (hãng đã approve, xe đã về)
 *
 * Chức năng:
 * 1. Validate order (phải ở trạng thái deposit_paid hoặc waiting_vehicle_request)
 * 2. Upload ảnh xe đã chuẩn bị (optional)
 * 3. Cập nhật thông tin xe sẵn sàng
 * 4. Chuyển status → vehicle_ready
 * 5. Ghi log order status
 *
 * NOTE: Sau khi xe ready, gọi khách đến thanh toán số tiền còn lại
 */
export async function markVehicleReady(req, res, next) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {id} = req.params;
    const {
      vehicle_images, // Array URL ảnh xe đã chuẩn bị (optional)
      preparation_notes, // Ghi chú về việc chuẩn bị xe
      expected_pickup_date, // Ngày dự kiến khách có thể đến lấy xe
    } = req.body;

    // ========== STEP 1: VALIDATE ORDER ==========

    // 1.1. Tìm order
    const order = await Order.findById(id).session(session);
    if (!order) {
      await session.abortTransaction();
      return errorRes(res, "Không tìm thấy đơn hàng!", 404);
    }

    // 1.2. Validate status phải là "deposit_paid" hoặc "waiting_vehicle_request"
    const allowedStatuses = ["deposit_paid", "waiting_vehicle_request"];
    if (!allowedStatuses.includes(order.status)) {
      await session.abortTransaction();
      return errorRes(
        res,
        "Không thể đánh dấu xe sẵn sàng. " +
          `Đơn hàng phải ở trạng thái "deposit_paid" hoặc "waiting_vehicle_request" (hiện tại: ${order.status})`,
        400
      );
    }

    // 1.2b. ✅ NEW: Nếu installment, phải là status="fully_paid" (sau khi bank giải ngân)
    if (
      order.payment_method === "installment" &&
      order.status !== "fully_paid"
    ) {
      // ℹ️ Nếu installment chưa fully_paid, reject
      if (
        order.status === "waiting_bank_approval" ||
        order.status === "deposit_paid"
      ) {
        await session.abortTransaction();
        return errorRes(
          res,
          `❌ Đơn hàng trả góp không thể mark ready ở trạng thái "${order.status}". ` +
            "Phải chờ ngân hàng giải ngân (status=\"fully_paid\") trước.",
          400
        );
      }
    }

    // ========== STEP 2: CẬP NHẬT THÔNG TIN XE SẴN SÀNG ==========

    // Nếu trạng thái cũ là waiting_vehicle_request thì thực hiện giảm trừ stock
    if (order.status === "waiting_vehicle_request") {
      try {
        await deductStockForOrder(order.items, order.dealership_id, session);
        // Sau khi trừ stock, đối trừ công nợ phần cọc (nếu có)
        const depositPayment = await Payment.findOne({
          order_id: order._id,
          reference: {$regex: /^DEPOSIT_/},
        }).session(session);
        if (depositPayment) {
          try {
            const {settleDealerManufacturerByOrderPayment} = await import(
              "./debtController.js"
            );
            await settleDealerManufacturerByOrderPayment(
              order,
              depositPayment,
              session
            );
            console.log(
              `✅ Settled dealer-manufacturer debt for deposit (OOS) on Order ${order.code}`
            );
          } catch (debtErr) {
            console.error(
              "⚠️ Failed to settle dealer-manufacturer debt for deposit (OOS):",
              debtErr
            );
          }
        }
      } catch (stockErr) {
        await session.abortTransaction();
        return errorRes(
          res,
          `Lỗi khi trừ xe vào kho đại lý: ${stockErr.message}`,
          400
        );
      }
    }

    // Khởi tạo vehicle_ready_info nếu chưa có
    if (!order.vehicle_ready_info) {
      order.vehicle_ready_info = {};
    }

    // Chỉ lưu vehicle_images nếu có ảnh thực sự
    const readyInfo = {
      marked_ready_at: new Date(),
      marked_ready_by: req.user?.id,
      preparation_notes: preparation_notes || "",
      expected_pickup_date: expected_pickup_date
        ? new Date(expected_pickup_date)
        : null,
    };

    // Thêm vehicle_images nếu có
    if (vehicle_images && vehicle_images.length > 0) {
      readyInfo.vehicle_images = vehicle_images;
    }

    order.vehicle_ready_info = readyInfo;

    // ========== STEP 3: UPDATE ORDER STATUS ==========
    const oldStatus = order.status;
    const newStatus = "vehicle_ready";
    order.status = newStatus;

    await order.save({session});

    // ========== STEP 4: GHI LOG ORDER STATUS ==========
    let logDescription = "";
    if (oldStatus === "deposit_paid") {
      logDescription =
        "Xe có sẵn tại đại lý, đã chuẩn bị xong. Thông báo khách đến thanh toán số tiền còn lại.";
    } else if (oldStatus === "waiting_vehicle_request") {
      logDescription =
        "Hãng xe đã duyệt yêu cầu, xe đã về đại lý và chuẩn bị xong. Thông báo khách đến thanh toán.";
    }

    await createStatusLog(
      order._id,
      oldStatus,
      newStatus,
      req.user?.id,
      "Xe đã sẵn sàng",
      logDescription,
      {
        changed_by_name: req.user?.full_name || "System",
        ip_address: req.ip,
        user_agent: req.get("User-Agent"),
        has_images: vehicle_images?.length > 0,
        expected_pickup_date,
      }
    );

    // ========== COMMIT TRANSACTION ==========
    await session.commitTransaction();

    // ========== POPULATE & RETURN ==========
    const populatedOrder = await Order.findById(order._id)
      .populate("customer_id", "full_name email phone")
      .populate("dealership_id", "name")
      .populate("salesperson_id", "full_name email")
      .populate("order_request_id")
      .lean();

    return success(res, "Xe đã được đánh dấu sẵn sàng!", {
      order: populatedOrder,
      message:
        "Xe đã sẵn sàng. Hãy liên hệ khách hàng để thông báo đến thanh toán số tiền còn lại và nhận xe.",
      remaining_amount: order.final_amount - order.paid_amount,
    });
  } catch (err) {
    await session.abortTransaction();
    console.error("❌ Mark Vehicle Ready Error:", err);
    next(err);
  } finally {
    session.endSession();
  }
}

// ==================== Pay Final Amount ====================
/**
 * Khách thanh toán số tiền còn lại
 * Luồng: Order (vehicle_ready) → fully_paid
 *
 * Chức năng:
 * 1. Validate order (phải ở trạng thái vehicle_ready)
 * 2. Tính số tiền còn lại (final_amount - paid_amount)
 * 3. Nhận tiền thanh toán từ khách
 * 4. Tạo Payment record
 * 5. Cập nhật Debt thành "settled" (đã thanh toán xong)
 * 6. Update Order (paid_amount = final_amount, status = fully_paid)
 * 7. Ghi log order status
 *
 * NOTE: Sau khi fully_paid, xe sẵn sàng để giao cho khách
 */
export async function payFinalAmount(req, res, next) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {id} = req.params;
    const {
      payment_method, // "cash", "bank", "qr", "card"
      notes,
    } = req.body;

    // ========== STEP 1: VALIDATE ORDER ==========

    // 1.1. Tìm order
    const order = await Order.findById(id).session(session);
    if (!order) {
      await session.abortTransaction();
      return errorRes(res, "Không tìm thấy đơn hàng!", 404);
    }

    // 1.2a. ⚡ NEW: Reject installment orders - trả góp không được phép dùng API này
    if (order.payment_method === "installment") {
      await session.abortTransaction();
      return errorRes(
        res,
        "❌ Không thể sử dụng payFinalAmount cho đơn hàng trả góp (installment)! " +
          "Vui lòng sử dụng Bank Loan API thay thế: POST /api/bank-loans/disburse. " +
          "Đối với trả góp, tiền còn lại sẽ được ngân hàng giải ngân.",
        400
      );
    }

    // 1.2b. Validate status phải là "vehicle_ready"
    if (order.status !== "vehicle_ready") {
      await session.abortTransaction();
      return errorRes(
        res,
        `Không thể thanh toán. Đơn hàng phải ở trạng thái "vehicle_ready" (hiện tại: ${order.status})`,
        400
      );
    }

    // 1.3. Tính số tiền còn lại
    const remainingAmount = order.final_amount - order.paid_amount;

    if (remainingAmount <= 0) {
      await session.abortTransaction();
      return errorRes(res, "Đơn hàng đã được thanh toán đủ rồi!", 400);
    }

    // 1.4. Validate payment_method
    const allowedMethods = ["cash", "bank", "qr", "card"];
    if (!allowedMethods.includes(payment_method)) {
      await session.abortTransaction();
      return errorRes(
        res,
        `Payment method phải là: ${allowedMethods.join(", ")}`,
        400
      );
    }

    // ========== STEP 2: TẠO PAYMENT RECORD (TIỀN THANH TOÁN CUỐI) ==========
    const payment = await Payment.create(
      [
        {
          order_id: order._id,
          customer_id: order.customer_id,
          method: payment_method,
          amount: remainingAmount,
          reference: `FINAL_${order.code}`,
          notes: notes || "Thanh toán số tiền còn lại",
          paid_at: new Date(),
        },
      ],
      {session}
    );
    console.log("[payFinalAmount] Payment created:", payment[0]?._id);

    // ========== STEP 3: CẬP NHẬT DEBT KHÁCH HÀNG THÀNH "SETTLED" ==========
    const debt = await Debt.findOne({order_id: order._id}).session(session);
    if (debt) {
      debt.status = "settled"; // Đã thanh toán xong
      debt.paid_amount = order.final_amount; // Cập nhật số tiền đã trả
      debt.remaining_amount = 0;
      debt.paid_at = new Date();
      await debt.save({session});
    }

    // ========== STEP 3b: ĐỐI TRỪ CÔNG NỢ ĐẠI LÝ → HÃNG ==========
    // ✅ FIX: Khi khách thanh toán → Đại lý phải trả công nợ cho hãng
    try {
      const {settleDealerManufacturerByOrderPayment} = await import(
        "./debtController.js"
      );
      await settleDealerManufacturerByOrderPayment(order, payment[0], session);
      console.log(
        `✅ Settled dealer-manufacturer debt for Order ${order.code}`
      );
    } catch (debtErr) {
      console.error("⚠️ Failed to settle dealer-manufacturer debt:", debtErr);
      // ⚠️ Không throw error để không block luồng thanh toán
      // Có thể fix debt sau bằng cách chạy lại settlement
    }

    // ========== STEP 4: UPDATE ORDER ==========
    const oldStatus = order.status;
    order.paid_amount = order.final_amount; // Đã thanh toán đủ
    order.status = "fully_paid";
    await order.save({session});

    // ========== STEP 5: GHI LOG ORDER STATUS ==========
    await createStatusLog(
      order._id,
      oldStatus,
      "fully_paid",
      req.user?.id,
      "Khách đã thanh toán đủ",
      `Đã nhận thanh toán số tiền còn lại ${remainingAmount.toLocaleString()}đ. ` +
        `Tổng đã thanh toán: ${order.final_amount.toLocaleString()}đ. ` +
        "Xe sẵn sàng để giao cho khách.",
      {
        changed_by_name: req.user?.full_name || "System",
        ip_address: req.ip,
        user_agent: req.get("User-Agent"),
        payment_id: payment[0]._id,
        final_payment_amount: remainingAmount,
        total_paid: order.final_amount,
      }
    );

    // ========== STEP 6: LẤY LẠI ORDER ĐẦY ĐỦ (POPULATED) ==========
    const populatedOrder = await Order.findById(order._id)
      .populate("customer_id", "full_name email phone")
      .populate("dealership_id", "name")
      .populate("salesperson_id", "full_name email")
      .populate("order_request_id")
      .lean();

    const commitResult = await session.commitTransaction();
    console.log("[payFinalAmount] Transaction committed", commitResult);

    return success(res, "Đã thanh toán đủ thành công!", {
      order: populatedOrder,
      payment: payment[0],
      debt_status: debt?.status,
      message:
        "Khách hàng đã thanh toán đủ. Tiến hành chuẩn bị giao xe cho khách.",
    });
  } catch (err) {
    await session.abortTransaction();
    console.error("❌ Pay Final Amount Error:", err);
    next(err);
  } finally {
    session.endSession();
  }
}

// ==================== Deliver Order ====================
/**
 * Giao xe cho khách hàng
 * Luồng: Order (fully_paid) → delivered
 *
 * Chức năng:
 * 1. Validate order (phải ở trạng thái fully_paid)
 * 2. Cập nhật thông tin giao xe (delivery info):
 *    - Người giao xe
 *    - Người nhận
 *    - Giấy tờ xe
 *    - Thời gian giao
 * 3. Upload ảnh biên bản bàn giao
 * 4. Update Order status → delivered
 * 5. Ghi log order status
 *
 * NOTE: Sau khi delivered, chờ 1-2 ngày để complete order
 */
export async function deliverOrder(req, res, next) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {id} = req.params;
    let {
      delivery_person, // { name, phone, id_card }
      recipient_info, // { name, phone, relationship }
      delivery_documents, // [{ name, type, file_url }]
      delivery_notes,
      actual_delivery_date, // Ngày thực tế giao xe
    } = req.body;

    // ========== FIX: Auto-parse if delivery_documents is stringified ==========
    if (delivery_documents && typeof delivery_documents === "string") {
      try {
        delivery_documents = JSON.parse(delivery_documents);
        console.log("✅ Auto-parsed delivery_documents from string to array");
      } catch (parseErr) {
        await session.abortTransaction();
        return errorRes(
          res,
          "delivery_documents format không hợp lệ! Phải là array hoặc JSON string hợp lệ.",
          400
        );
      }
    }

    // ========== STEP 1: VALIDATE ORDER ==========

    // 1.1. Tìm order
    const order = await Order.findById(id).session(session);
    if (!order) {
      await session.abortTransaction();
      return errorRes(res, "Không tìm thấy đơn hàng!", 404);
    }

    // 1.2. Validate status phải là "fully_paid"
    if (order.status !== "fully_paid") {
      await session.abortTransaction();
      return errorRes(
        res,
        `Không thể giao xe. Đơn hàng phải ở trạng thái "fully_paid" (hiện tại: ${order.status})`,
        400
      );
    }

    // 1.2b. Check duplicate delivery - Nếu đã giao xe rồi
    if (order.delivery && order.delivery.status === "delivered") {
      await session.abortTransaction();
      return errorRes(
        res,
        "Đơn hàng đã được giao xe rồi! " +
          `Thời gian giao: ${order.delivery.actual_date?.toLocaleString(
            "vi-VN"
          )}. ` +
          `Người nhận: ${order.delivery.recipient_info?.name}`,
        400
      );
    }

    // 1.3. Validate recipient_info (bắt buộc)
    if (!recipient_info || !recipient_info.name || !recipient_info.phone) {
      await session.abortTransaction();
      return errorRes(
        res,
        "Thông tin người nhận (name, phone) là bắt buộc!",
        400
      );
    }

    // 1.4. Validate delivery_documents format (nếu có)
    if (delivery_documents) {
      // Validate phải là array
      if (!Array.isArray(delivery_documents)) {
        await session.abortTransaction();
        return errorRes(res, "delivery_documents phải là array!", 400);
      }

      // Validate từng document
      for (const doc of delivery_documents) {
        if (!doc.file_url) {
          await session.abortTransaction();
          return errorRes(
            res,
            `Document "${doc.name || "Unknown"}" thiếu file_url!`,
            400
          );
        }
      }
    }

    // ========== STEP 2: CẬP NHẬT THÔNG TIN GIAO XE ==========

    // Khởi tạo delivery nếu chưa có
    if (!order.delivery) {
      order.delivery = {};
    }

    // Cập nhật thông tin giao xe
    order.delivery.status = "delivered";
    order.delivery.actual_date = actual_delivery_date
      ? new Date(actual_delivery_date)
      : new Date();

    // Thông tin người giao xe
    if (delivery_person) {
      order.delivery.delivery_person = {
        name: delivery_person.name || "",
        phone: delivery_person.phone || "",
        id_card: delivery_person.id_card || "",
      };
    }

    // Thông tin người nhận
    order.delivery.recipient_info = {
      name: recipient_info.name,
      phone: recipient_info.phone,
      relationship: recipient_info.relationship || "Chính chủ",
    };

    // Ghi chú giao hàng
    if (delivery_notes) {
      order.delivery.delivery_notes = delivery_notes;
    }

    // Upload tài liệu giao xe (biên bản, giấy tờ)
    if (
      delivery_documents &&
      Array.isArray(delivery_documents) &&
      delivery_documents.length > 0
    ) {
      // Ensure uploaded_at for each document
      order.delivery.delivery_documents = delivery_documents.map((doc) => ({
        name: doc.name || "Tài liệu",
        type: doc.type || "other",
        file_url: doc.file_url,
        uploaded_at: doc.uploaded_at || new Date(),
      }));
    }

    // Thời gian ký nhận
    order.delivery.signed_at = new Date();
    order.delivery.signed_by = recipient_info.name;

    // ========== STEP 3: UPDATE ORDER STATUS ==========
    const oldStatus = order.status;
    order.status = "delivered";
    await order.save({session});

    // ========== STEP 4: GHI LOG ORDER STATUS ==========
    await createStatusLog(
      order._id,
      oldStatus,
      "delivered",
      req.user?.id,
      "Đã giao xe cho khách",
      "Xe đã được giao cho khách hàng. " +
        `Người nhận: ${recipient_info.name} (${recipient_info.phone}). ` +
        `Thời gian giao: ${order.delivery.actual_date.toLocaleString("vi-VN")}`,
      {
        changed_by_name: req.user?.full_name || "System",
        ip_address: req.ip,
        user_agent: req.get("User-Agent"),
        recipient_name: recipient_info.name,
        delivery_date: order.delivery.actual_date,
        has_documents: delivery_documents?.length > 0,
      }
    );

    // ========== COMMIT TRANSACTION ==========
    await session.commitTransaction();

    // ========== POPULATE & RETURN ==========
    const populatedOrder = await Order.findById(order._id)
      .populate("customer_id", "full_name email phone")
      .populate("dealership_id", "name")
      .populate("salesperson_id", "full_name email")
      .lean();

    return success(res, "Đã giao xe thành công!", {
      order: populatedOrder,
      message:
        "Xe đã được giao cho khách hàng. Sau 1-2 ngày, hãy hoàn tất đơn hàng (complete order).",
    });
  } catch (err) {
    await session.abortTransaction();
    console.error("❌ Deliver Order Error:", err);
    next(err);
  } finally {
    session.endSession();
  }
}

// ==================== Complete Order ====================
/**
 * Hoàn tất đơn hàng (đóng hồ sơ)
 * Luồng: Order (delivered) → completed
 *
 * Chức năng:
 * 1. Validate order (phải ở trạng thái delivered)
 * 2. Validate đã giao xe ít nhất 1 ngày
 * 3. Update Order status → completed
 * 4. Ghi log order status
 * 5. (Optional) Tạo feedback request cho khách
 *
 * NOTE: Đây là bước cuối cùng, đóng hoàn toàn đơn hàng
 */
export async function completeOrder(req, res, next) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {id} = req.params;
    const {completion_notes} = req.body;

    // ========== STEP 1: VALIDATE ORDER ==========

    // 1.1. Tìm order
    const order = await Order.findById(id).session(session);
    if (!order) {
      await session.abortTransaction();
      return errorRes(res, "Không tìm thấy đơn hàng!", 404);
    }

    // 1.2. Validate status phải là "delivered"
    if (order.status !== "delivered") {
      await session.abortTransaction();
      return errorRes(
        res,
        `Không thể hoàn tất đơn hàng. Đơn hàng phải ở trạng thái "delivered" (hiện tại: ${order.status})`,
        400
      );
    }

    // 1.3. Validate đã giao xe ít nhất 1 ngày (optional, có thể bỏ nếu không cần)
    if (order.delivery?.actual_date) {
      const deliveryDate = new Date(order.delivery.actual_date);
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      if (deliveryDate > oneDayAgo) {
        await session.abortTransaction();
        return errorRes(
          res,
          "Đơn hàng chỉ có thể hoàn tất sau ít nhất 1 ngày kể từ khi giao xe.",
          400
        );
      }
    }

    // ========== STEP 2: UPDATE ORDER STATUS ==========
    const oldStatus = order.status;
    order.status = "completed";

    // Thêm ghi chú hoàn tất (nếu có)
    if (completion_notes) {
      if (!order.notes) {
        order.notes = "";
      }
      order.notes += `\n[COMPLETED] ${completion_notes}`;
    }

    await order.save({session});

    // ========== STEP 3: GHI LOG ORDER STATUS ==========
    await createStatusLog(
      order._id,
      oldStatus,
      "completed",
      req.user?.id,
      "Hoàn tất đơn hàng",
      "Đơn hàng đã được hoàn tất. Tất cả giấy tờ và thủ tục đã hoàn thành. " +
        "Khách hàng đã nhận xe và hài lòng với dịch vụ.",
      {
        changed_by_name: req.user?.full_name || "System",
        ip_address: req.ip,
        user_agent: req.get("User-Agent"),
        completion_notes: completion_notes || "",
        total_amount: order.final_amount,
        completed_at: new Date(),
      }
    );

    // ========== COMMIT TRANSACTION ==========
    await session.commitTransaction();

    // ========== POPULATE & RETURN ==========
    const populatedOrder = await Order.findById(order._id)
      .populate("customer_id", "full_name email phone")
      .populate("dealership_id", "name")
      .populate("salesperson_id", "full_name email")
      .lean();

    return success(res, "Đơn hàng đã hoàn tất!", {
      order: populatedOrder,
      message:
        "Đơn hàng đã hoàn tất thành công. Cảm ơn quý khách đã tin tùng và sử dụng dịch vụ!",
    });
  } catch (err) {
    await session.abortTransaction();
    console.error("❌ Complete Order Error:", err);
    next(err);
  } finally {
    session.endSession();
  }
}

// ========== HELPER: Check stock có đủ không ==========
/**
 * Kiểm tra tồn kho tại đại lý có đủ để giao cho khách không
 *
 * NOTE: Khách BẮT BUỘC phải chọn màu xe khi đặt cọc.
 * Không có trường hợp "không chọn màu" trong thực tế kinh doanh.
 *
 * @returns { hasStock: boolean, details: [] }
 */
async function checkStockForOrder(items, dealership_id) {
  const details = [];
  let hasStock = true;

  for (const item of items) {
    // Validate: Khách PHẢI chọn màu
    if (!item.color || item.color.trim() === "") {
      throw new Error(
        `Xe ${item.vehicle_name || item.vehicle_id} chưa chọn màu! ` +
          "Khách hàng bắt buộc phải chọn màu xe trước khi đặt cọc."
      );
    }

    const vehicle = await Vehicle.findById(item.vehicle_id).lean();
    if (!vehicle) {
      throw new Error(`Không tìm thấy xe: ${item.vehicle_id}`);
    }

    // ✅ FIX: Tìm TẤT CẢ dealer stocks phù hợp (còn hàng, active)
    // Logic giống deductStockForOrder để đảm bảo consistency
    const eligibleStocks = (vehicle.stocks || []).filter((s) => {
      const sameDealer = String(s.owner_id) === String(dealership_id);
      const sameColor =
        s.color && item.color
          ? s.color.trim().toLowerCase() === item.color.trim().toLowerCase()
          : false;
      const isActive = !s.status || s.status.toLowerCase() === "active";
      const availableQty = s.remaining_quantity ?? s.quantity ?? 0;

      return (
        s.owner_type === "dealer" &&
        sameDealer &&
        sameColor &&
        availableQty > 0 &&
        isActive
      );
    });

    const totalAvailable = eligibleStocks.reduce(
      (sum, s) => sum + (s.remaining_quantity ?? s.quantity ?? 0),
      0
    );

    console.log("DEBUG STOCK CHECK:", {
      dealership_id,
      item,
      eligibleStocksCount: eligibleStocks.length,
      eligibleStocks,
      totalAvailable,
    });

    const requested = item.quantity || 1;

    details.push({
      vehicle_id: item.vehicle_id,
      vehicle_name: item.vehicle_name,
      color: item.color,
      requested_quantity: requested,
      available_quantity: totalAvailable,
    });

    // Nếu bất kỳ xe nào không đủ → hasStock = false
    if (totalAvailable < requested) {
      hasStock = false;
    }
  }

  return {hasStock, details};
}

// ========== HELPER: Trừ stock khi có xe (giữ chỗ) ==========
/**
 * Trừ stock tại đại lý khi xe có sẵn (giữ chỗ cho khách đã cọc)
 *
 * ✨ SOLUTION 2: FIFO + Tracking
 * - Trừ stock theo FIFO (lô cũ nhất trước - delivered_at sớm nhất)
 * - Track chi tiết lô nào được dùng → used_stocks[]
 * - Update sold_quantity, remaining_quantity, status cho từng lô
 * - Backward compatible với old stocks (không có tracking fields)
 *
 * NOTE: Màu xe đã được validate trong checkStockForOrder(),
 * nên ở đây chắc chắn item.color tồn tại.
 */
async function deductStockForOrder(items, dealership_id, session) {
  for (const item of items) {
    const requestedQuantity = item.quantity || 1;

    // ✅ 1. VALIDATE màu
    if (!item.color) {
      throw new Error(
        `Lỗi hệ thống: Xe ${item.vehicle_name} không có thông tin màu khi trừ stock!`
      );
    }

    // ✅ 2. FETCH Vehicle (cần full document để access stocks array)
    const vehicle = await Vehicle.findById(item.vehicle_id).session(session);

    if (!vehicle) {
      throw new Error(`Vehicle ${item.vehicle_id} not found`);
    }

    // ✅ 3. TÌM TẤT CẢ DEALER STOCKS phù hợp (còn hàng)
    const eligibleStocks = vehicle.stocks
      .filter(
        (s) =>
          s.owner_type === "dealer" &&
          s.owner_id.toString() === dealership_id.toString() &&
          s.color === item.color &&
          (s.remaining_quantity !== undefined
            ? s.remaining_quantity > 0 // New stock with tracking
            : s.quantity > 0) && // Old stock (backward compatible)
          (!s.status || s.status === "active") // No status = old stock, treat as active
      )
      .sort((a, b) => {
        // ✅ FIFO: Lô CŨ NHẤT trước (delivered_at sớm hơn)
        const dateA = a.delivered_at || a.createdAt || new Date(0);
        const dateB = b.delivered_at || b.createdAt || new Date(0);
        return dateA - dateB;
      });

    // ✅ 4. VALIDATE: Đủ stock không?
    const totalAvailable = eligibleStocks.reduce(
      (sum, s) =>
        sum +
        (s.remaining_quantity !== undefined
          ? s.remaining_quantity
          : s.quantity),
      0
    );

    if (totalAvailable < requestedQuantity) {
      throw new Error(
        `Insufficient stock! Requested: ${requestedQuantity}, ` +
          `Available: ${totalAvailable} of ${vehicle.name} (${item.color})`
      );
    }

    // ✅ 5. DEDUCT THEO FIFO VÀ TRACK
    let remainingToDeduct = requestedQuantity;
    const usedStocks = []; // ✅ Track lô nào được dùng

    for (const stock of eligibleStocks) {
      if (remainingToDeduct <= 0) break;

      // Lấy số lượng còn lại của lô này
      const currentRemaining =
        stock.remaining_quantity !== undefined
          ? stock.remaining_quantity
          : stock.quantity;

      // Trừ tối đa = min(còn cần trừ, còn trong lô)
      const deductFromThisStock = Math.min(remainingToDeduct, currentRemaining);

      // ✅ UPDATE stock fields
      if (stock.sold_quantity !== undefined) {
        // New stock with tracking (Solution 2)
        stock.sold_quantity = (stock.sold_quantity || 0) + deductFromThisStock;
        stock.remaining_quantity =
          (stock.remaining_quantity || stock.quantity) - deductFromThisStock;

        // Update status nếu hết hàng
        if (stock.remaining_quantity === 0) {
          stock.status = "depleted";
        }
      } else {
        // Old stock (backward compatible) - chỉ trừ quantity
        stock.quantity -= deductFromThisStock;
      }

      // ✅ TRACK: Lô này được dùng bao nhiêu
      usedStocks.push({
        stock_entry_id: stock._id, // ✅ Subdocument _id
        source_request_id: stock.source_request_id || null,
        quantity: deductFromThisStock,
        unit_cost: stock.unit_cost || vehicle.price || 0,
        allocated_at: new Date(),
        notes: `FIFO deduct from stock batch ${stock._id}${
          stock.source_request_id
            ? ` (from Request ${stock.source_request_id})`
            : ""
        }`,
      });

      remainingToDeduct -= deductFromThisStock;

      console.log(
        `  📦 [FIFO] Deducted ${deductFromThisStock} from stock ${stock._id} ` +
          `(delivered: ${
            stock.delivered_at
              ? stock.delivered_at.toISOString().split("T")[0]
              : "N/A"
          }, ` +
          `remaining: ${
            stock.remaining_quantity !== undefined
              ? stock.remaining_quantity
              : stock.quantity
          })`
      );
    }

    // ✅ 6. DOUBLE CHECK
    if (remainingToDeduct > 0) {
      throw new Error(
        `Failed to deduct stock! Still need ${remainingToDeduct} more of ${vehicle.name} (${item.color})`
      );
    }

    // ✅ 7. SAVE used_stocks vào item
    item.used_stocks = usedStocks;

    // ✅ 8. SAVE vehicle với stocks đã update
    await vehicle.save({session});

    console.log(
      `✅ [FIFO] Successfully deducted ${requestedQuantity} of ${vehicle.name} (${item.color}) ` +
        `from ${usedStocks.length} stock batch(es)`
    );
  }
}

// ========== 7. CANCEL ORDER - HUỶ ĐƠN HÀNG VỚI REFUND ==========
/**
 * API: POST /api/orders/:id/cancel
 * Cho phép huỷ đơn hàng ở bất kỳ trạng thái nào (trừ completed)
 *
 * **Luồng hoàn tiền:**
 * - Nếu đã cọc/thanh toán → Tạo payment refund
 * - Nếu đã trừ stock → Hoàn lại stock
 * - Nếu có debt → Cancel debt
 * - Nếu có OrderRequest → Cancel request
 *
 * **Yêu cầu:**
 * - Order không được ở trạng thái "completed" hoặc "canceled"
 * - Cần lý do huỷ (cancellation_reason)
 */
export async function cancelOrder(req, res, next) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {id} = req.params;
    const {cancellation_reason, refund_method = "cash"} = req.body;

    // Validate reason
    if (!cancellation_reason || cancellation_reason.trim() === "") {
      return errorRes(res, "Vui lòng cung cấp lý do huỷ đơn hàng", 400);
    }

    // Fetch order
    const order = await Order.findById(id).session(session);
    if (!order) {
      await session.abortTransaction();
      return errorRes(res, "Không tìm thấy đơn hàng", 404);
    }

    // Check status - không cho huỷ nếu đã completed hoặc đã canceled
    if (order.status === "completed") {
      await session.abortTransaction();
      return errorRes(
        res,
        "Không thể huỷ đơn hàng đã hoàn tất. Vui lòng liên hệ quản lý.",
        400
      );
    }

    if (order.status === "canceled") {
      await session.abortTransaction();
      return errorRes(res, "Đơn hàng đã bị huỷ trước đó", 400);
    }

    console.log(`🚫 Cancelling Order ${order.code} - Status: ${order.status}`);

    const refundPayments = [];
    let stockRestored = false;
    let debtCanceled = false;
    let requestCanceled = false;

    // ========== 1. HOÀN TIỀN NẾU ĐÃ THANH TOÁN ==========
    if (order.paid_amount > 0) {
      console.log(`💰 Creating refund payment: ${order.paid_amount} VND`);

      const refundPayment = new Payment({
        order_id: order._id,
        customer_id: order.customer_id,
        dealership_id: order.dealership_id,
        amount: order.paid_amount,
        payment_type: "refund",
        payment_method: refund_method,
        status: "completed",
        notes: `Hoàn tiền do huỷ đơn hàng ${order.code}. Lý do: ${cancellation_reason}`,
      });

      await refundPayment.save({session});
      refundPayments.push(refundPayment);

      console.log(`✅ Refund payment created: ${refundPayment._id}`);
    }

    // ========== 2. HOÀN LẠI STOCK NẾU ĐÃ TRỪ ==========
    // Chỉ hoàn stock nếu order đã trừ stock (deposit_paid, vehicle_ready, fully_paid)
    const stockDeductedStatuses = [
      "deposit_paid",
      "vehicle_ready",
      "fully_paid",
      "delivered",
    ];

    if (stockDeductedStatuses.includes(order.status)) {
      console.log(`📦 Restoring stock for ${order.items.length} items`);

      for (const item of order.items) {
        if (!item.color) {
          console.warn(
            `⚠️ Item ${item.vehicle_id} has no color, skipping stock restore`
          );
          continue;
        }

        const quantity = item.quantity || 1;

        // ✅ CHECK: Có used_stocks tracking không?
        if (item.used_stocks && item.used_stocks.length > 0) {
          // ========== SOLUTION 2: Restore theo tracking ==========
          console.log("✅ Item has used_stocks tracking, restoring by batch");

          const vehicle = await Vehicle.findById(item.vehicle_id).session(
            session
          );

          if (!vehicle) {
            console.warn(
              `⚠️ Vehicle ${item.vehicle_id} not found, skip restore`
            );
            continue;
          }

          for (const usedStock of item.used_stocks) {
            // Tìm stock entry bằng subdocument _id
            const stockEntry = vehicle.stocks.id(usedStock.stock_entry_id);

            if (!stockEntry) {
              console.warn(
                `⚠️ Stock entry ${usedStock.stock_entry_id} not found in Vehicle ${vehicle._id}`
              );
              continue;
            }

            // Restore quantity
            if (stockEntry.sold_quantity !== undefined) {
              // New stock with tracking
              stockEntry.sold_quantity = Math.max(
                0,
                stockEntry.sold_quantity - usedStock.quantity
              );
              stockEntry.remaining_quantity =
                (stockEntry.remaining_quantity || 0) + usedStock.quantity;

              // Update status
              if (
                stockEntry.remaining_quantity > 0 &&
                stockEntry.status === "depleted"
              ) {
                stockEntry.status = "active";
              }
            } else {
              // Old stock (backward compatible)
              stockEntry.quantity =
                (stockEntry.quantity || 0) + usedStock.quantity;
            }

            console.log(
              `  ✅ Restored ${usedStock.quantity} to stock ${usedStock.stock_entry_id} ` +
                `(remaining: ${
                  stockEntry.remaining_quantity !== undefined
                    ? stockEntry.remaining_quantity
                    : stockEntry.quantity
                })`
            );
          }

          await vehicle.save({session});
          stockRestored = true;
        } else {
          // ========== FALLBACK: Old logic (no tracking) ==========
          console.log("⚠️ No used_stocks tracking, using fallback restore");

          const updateResult = await Vehicle.updateOne(
            {_id: item.vehicle_id},
            {
              $inc: {"stocks.$[elem].quantity": quantity}, // Cộng lại
            },
            {
              arrayFilters: [
                {
                  "elem.owner_type": "dealer",
                  "elem.owner_id": order.dealership_id,
                  "elem.color": item.color,
                },
              ],
              session,
            }
          );

          if (updateResult.modifiedCount > 0) {
            console.log(
              `✅ Restored ${quantity}x ${item.vehicle_name} (${item.color}) - Fallback`
            );
            stockRestored = true;
          }
        }
      }
    }

    // ========== 3. HUỶ DEBT NẾU CÓ ==========
    const debt = await Debt.findOne({
      order_id: order._id,
      status: {$in: ["pending", "partial"]},
    }).session(session);

    if (debt) {
      console.log(`📝 Cancelling debt: ${debt._id}`);
      debt.status = "canceled";
      debt.notes = debt.notes
        ? `${debt.notes}\n[Canceled] ${cancellation_reason}`
        : `[Canceled] ${cancellation_reason}`;
      await debt.save({session});
      debtCanceled = true;
      console.log("✅ Debt canceled");
    }

    // ========== 4. HUỶ ORDER REQUEST NẾU CÓ ==========
    if (order.status === "waiting_vehicle_request") {
      const orderRequest = await OrderRequest.findOne({
        order_id: order._id,
        status: "pending",
      }).session(session);

      if (orderRequest) {
        console.log(`📮 Cancelling OrderRequest: ${orderRequest._id}`);
        orderRequest.status = "canceled";
        orderRequest.notes = orderRequest.notes
          ? `${orderRequest.notes}\n[Canceled] ${cancellation_reason}`
          : `[Canceled] ${cancellation_reason}`;
        await orderRequest.save({session});
        requestCanceled = true;
        console.log("✅ OrderRequest canceled");
      }
    }

    // ========== 5. CẬP NHẬT ORDER STATUS ==========
    const oldStatus = order.status;
    order.status = "canceled";
    order.canceled_at = new Date();
    order.cancellation_reason = cancellation_reason;

    // Add note to order
    const cancelNote = `[${new Date().toISOString()}] Đơn hàng bị huỷ. Lý do: ${cancellation_reason}`;
    order.notes = order.notes ? `${order.notes}\n${cancelNote}` : cancelNote;

    await order.save({session});

    // ========== 6. TẠO STATUS LOG ==========
    await createStatusLog(
      {
        order_id: order._id,
        customer_id: order.customer_id,
        dealership_id: order.dealership_id,
        old_status: oldStatus,
        new_status: "canceled",
        notes: `Order canceled. Reason: ${cancellation_reason}`,
        changed_by: req.user?.user_id,
      },
      session
    );

    await session.commitTransaction();
    console.log(`✅ Order ${order.code} canceled successfully`);

    // ========== RESPONSE ==========
    const populatedOrder = await Order.findById(order._id)
      .populate("customer_id", "name phone email")
      .populate("dealership_id", "name")
      .lean();

    return success(res, "Đơn hàng đã được huỷ thành công", {
      order: populatedOrder,
      refund_summary: {
        refunded: order.paid_amount > 0,
        refund_amount: order.paid_amount,
        refund_payments: refundPayments,
      },
      stock_restored: stockRestored,
      debt_canceled: debtCanceled,
      request_canceled: requestCanceled,
      message:
        order.paid_amount > 0
          ? `Đơn hàng đã huỷ. Số tiền ${order.paid_amount.toLocaleString()} VND sẽ được hoàn lại cho khách hàng.`
          : "Đơn hàng đã huỷ thành công.",
    });
  } catch (err) {
    await session.abortTransaction();
    console.error("❌ Cancel Order Error:", err);
    next(err);
  } finally {
    session.endSession();
  }
}

// ========== 8. GET ORDER STATUS HISTORY - TRACKING TIMELINE ==========
/**
 * API: GET /api/orders/:id/status-history
 * Lấy lịch sử thay đổi trạng thái của đơn hàng (timeline tracking)
 *
 * **Response:**
 * - Danh sách các sự kiện thay đổi trạng thái
 * - Thời gian, người thực hiện, ghi chú
 * - Sắp xếp theo thời gian (mới nhất → cũ nhất)
 */
export async function getOrderStatusHistory(req, res, next) {
  try {
    const {id} = req.params;

    // Validate order exists
    const order = await Order.findById(id).lean();
    if (!order) {
      return errorRes(res, "Không tìm thấy đơn hàng", 404);
    }

    // Import OrderStatusLog model
    const OrderStatusLog = mongoose.model("OrderStatusLog");

    // Fetch status history
    const statusHistory = await OrderStatusLog.find({order_id: id})
      .populate("changed_by", "username email role_id")
      .sort({createdAt: -1}) // Mới nhất trước
      .lean();

    // Format timeline
    const timeline = statusHistory.map((log) => ({
      _id: log._id,
      timestamp: log.createdAt,
      old_status: log.old_status || null,
      new_status: log.new_status,
      status_label: getStatusLabel(log.new_status),
      old_delivery_status: log.old_delivery_status || null,
      new_delivery_status: log.new_delivery_status || null,
      changed_by: log.changed_by
        ? {
            _id: log.changed_by._id,
            username: log.changed_by.username,
            email: log.changed_by.email,
          }
        : null,
      notes: log.notes || "",
      elapsed_time: log.createdAt ? formatElapsedTime(log.createdAt) : null,
    }));

    return success(res, "Lịch sử trạng thái đơn hàng", {
      order_code: order.code,
      current_status: order.status,
      total_events: timeline.length,
      timeline,
    });
  } catch (err) {
    console.error("❌ Get Order Status History Error:", err);
    next(err);
  }
}

// Helper: Get human-readable status label
function getStatusLabel(status) {
  const labels = {
    pending: "Chờ xử lý",
    deposit_paid: "Đã đặt cọc",
    waiting_vehicle_request: "Chờ xe từ hãng",
    vehicle_ready: "Xe đã sẵn sàng",
    fully_paid: "Đã thanh toán đủ",
    delivered: "Đã giao xe",
    completed: "Hoàn tất",
    canceled: "Đã huỷ",
  };
  return labels[status] || status;
}

// Helper: Format elapsed time
function formatElapsedTime(timestamp) {
  const now = new Date();
  const past = new Date(timestamp);
  const diffMs = now - past;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays} ngày trước`;
  if (diffHours > 0) return `${diffHours} giờ trước`;
  if (diffMins > 0) return `${diffMins} phút trước`;
  return "Vừa xong";
}

// Helper: Get payment type label
function getPaymentTypeLabel(type) {
  const labels = {
    deposit: "Tiền cọc",
    final: "Thanh toán cuối",
    refund: "Hoàn tiền",
    installment: "Trả góp",
  };
  return labels[type] || type;
}
