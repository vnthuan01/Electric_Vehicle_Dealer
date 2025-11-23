/**
 * Order Request Controller
 * Quản lý yêu cầu đặt hàng nội bộ (Staff → Manager)
 */

import mongoose from "mongoose";
import OrderRequest from "../models/OrderRequest.js";
import Order from "../models/Order.js";
import Vehicle from "../models/Vehicle.js";
import Dealership from "../models/Dealership.js";
import RequestVehicle from "../models/RequestVehicle.js";
import {success, created, error as errorRes} from "../utils/response.js";
import {paginate} from "../utils/pagination.js";
import {capitalizeVietnamese} from "../utils/validateWord.js";
import {emitRequestStatusUpdate} from "../config/socket.js";
import {ROLE} from "../enum/roleEnum.js";

/**
 * Generate request code theo timestamp
 * @returns {String} Request code (e.g., REQ251028162045)
 */
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

/**
 * Staff tạo yêu cầu đặt hàng theo nhu cầu
 * POST /api/order-requests
 *
 * CASE 1: Staff tạo với order_id (Order hết xe)
 * CASE 2: Staff tạo manual (không có order_id) - Đặt hàng trước cho kho
 */
export async function createOrderRequest(req, res, next) {
  try {
    const user = req.user;
    const {items = [], notes, order_id} = req.body;

    // ✅ 1. VALIDATE ROLE - Chỉ DEALER_STAFF hoặc DEALER_MANAGER
    if (![ROLE.DEALER_STAFF, ROLE.DEALER_MANAGER].includes(user.role)) {
      return errorRes(
        res,
        "Only dealer staff or manager can create order request",
        403
      );
    }

    // ✅ 2. VALIDATE ITEMS
    if (!items.length) {
      return errorRes(res, "At least one vehicle must be requested", 400);
    }

    // ✅ 3. VALIDATE DEALERSHIP
    if (!user.dealership_id) {
      return errorRes(res, "User must belong to a dealership", 400);
    }

    // ✅ 4. VALIDATE ORDER (nếu có)
    let order = null;
    if (order_id) {
      order = await Order.findById(order_id);

      if (!order) {
        return errorRes(res, "Order not found", 404);
      }

      // ✅ Check dealership khớp
      if (order.dealership_id.toString() !== user.dealership_id.toString()) {
        return errorRes(res, "Order does not belong to your dealership", 403);
      }

      // ✅ Check status hợp lệ
      if (
        !["pending", "deposit_paid", "waiting_vehicle_request"].includes(
          order.status
        )
      ) {
        return errorRes(
          res,
          `Order status invalid for creating request. Current: ${order.status}`,
          400
        );
      }

      // ✅ CHECK DUPLICATE - Order chỉ có 1 OrderRequest pending
      const existingRequest = await OrderRequest.findOne({
        order_id: order._id,
        status: "pending",
      });

      if (existingRequest) {
        return errorRes(
          res,
          `Order already has a pending request: ${existingRequest.code}`,
          400
        );
      }
    }

    // ✅ 5. VALIDATE & PREPARE ITEMS
    const preparedItems = [];
    for (const item of items) {
      // ✅ Validate color bắt buộc (CASE 2: Manual request cần rõ màu)
      if (!item.color || item.color.trim() === "") {
        return errorRes(
          res,
          "Color is required for all vehicles in request",
          400
        );
      }

      // ✅ Validate quantity > 0
      if (!item.quantity || item.quantity <= 0) {
        return errorRes(res, "Quantity must be greater than 0", 400);
      }

      const vehicle = await Vehicle.findById(item.vehicle_id)
        .select("_id name manufacturer_id status is_deleted")
        .lean();

      if (!vehicle) {
        return errorRes(res, `Vehicle not found: ${item.vehicle_id}`, 404);
      }

      // ✅ Check vehicle active
      if (vehicle.status !== "active" || vehicle.is_deleted) {
        return errorRes(
          res,
          `Vehicle "${vehicle.name}" is not available for order`,
          400
        );
      }

      preparedItems.push({
        vehicle_id: vehicle._id,
        vehicle_name: vehicle.name,
        manufacturer_id: vehicle.manufacturer_id,
        color: item.color.trim(),
        quantity: item.quantity,
      });
    }

    const code = generateRequestCode();

    // ✅ 6. TẠO ORDER REQUEST
    const request = await OrderRequest.create({
      code,
      requested_by: user.id,
      dealership_id: user.dealership_id,
      order_id: order_id || null,
      items: preparedItems,
      notes: notes || "",
      status: "pending",
    });

    // ✅ 7. POPULATE RESPONSE
    await request.populate([
      {path: "requested_by", select: "full_name email role"},
      {path: "dealership_id", select: "name"},
      {path: "order_id", select: "code status"},
    ]);

    return created(res, "Order request created successfully", {
      request,
      message: order_id
        ? "Request created for Order. Waiting for manager approval."
        : "Manual request created. Waiting for manager approval to order vehicles from manufacturer.",
    });
  } catch (err) {
    next(err);
  }
}

/**
 * List order requests với filter
 * GET /api/order-requests
 */
export async function listOrderRequests(req, res, next) {
  try {
    const {status, q, startDate, endDate} = req.query;
    const dealership_id = req.user?.dealership_id;
    const extraQuery = {};

    // Lọc theo đại lý
    if (dealership_id) {
      extraQuery.dealership_id = dealership_id;
    }

    // Lọc theo trạng thái
    if (status) extraQuery.status = status;

    // Tìm kiếm theo mã
    if (q) {
      extraQuery.code = {$regex: q, $options: "i"};
      extraQuery.requested_by = {$regex: q, $options: "i"};
    }

    // Lọc theo ngày tạo
    if (startDate || endDate) {
      extraQuery.createdAt = {};
      if (startDate) extraQuery.createdAt.$gte = new Date(startDate);
      if (endDate) extraQuery.createdAt.$lte = new Date(endDate);
    }

    // Phân trang + tìm kiếm
    const result = await paginate(OrderRequest, req, ["code"], extraQuery);

    // Populate các trường liên kết
    const populatedData = await OrderRequest.populate(result.data, [
      {path: "requested_by", select: "full_name email"},
      {path: "approved_by", select: "full_name email"},
      {path: "rejected_by", select: "full_name email"},
      {path: "dealership_id", select: "name"},
      {path: "order_id", select: "code status"},
    ]);

    return success(res, "Order requests retrieved successfully", {
      ...result,
      data: populatedData,
    });
  } catch (err) {
    next(err);
  }
}
/**
 * List order requests của chính người dùng hiện tại
 * GET /api/order-requests/my
 */
export async function listMyOrderRequests(req, res, next) {
  try {
    const {status, q, startDate, endDate} = req.query;
    const dealership_id = req.user?.dealership_id;
    const user_id = req.user?.id;
    console.log(user_id);

    const extraQuery = {
      requested_by: user_id,
    };

    // Lọc theo đại lý (chỉ lấy trong phạm vi của user)
    if (dealership_id) {
      extraQuery.dealership_id = dealership_id;
    }

    // Lọc theo trạng thái
    if (status) extraQuery.status = status;

    // Tìm kiếm theo mã
    if (q) {
      extraQuery.code = {$regex: q, $options: "i"};
    }

    // Lọc theo ngày tạo
    if (startDate || endDate) {
      extraQuery.createdAt = {};
      if (startDate) extraQuery.createdAt.$gte = new Date(startDate);
      if (endDate) extraQuery.createdAt.$lte = new Date(endDate);
    }

    // Phân trang + tìm kiếm
    const result = await paginate(OrderRequest, req, ["code"], extraQuery);

    // Populate các trường liên kết
    const populatedData = await OrderRequest.populate(result.data, [
      {path: "requested_by", select: "full_name email"},
      {path: "approved_by", select: "full_name email"},
      {path: "rejected_by", select: "full_name email"},
      {path: "dealership_id", select: "name"},
      {path: "order_id", select: "code status"},
    ]);

    return success(res, "My order requests retrieved successfully", {
      ...result,
      data: populatedData,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Manager duyệt OrderRequest → Tạo RequestVehicles
 * PATCH /api/order-requests/:id/approve
 *
 * Áp dụng cho cả CASE 1 (có Order) và CASE 2 (manual request)
 */
export async function approveOrderRequest(req, res, next) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = req.user;
    const {id} = req.params;

    // ✅ 1. VALIDATE ROLE - Chỉ DEALER_MANAGER hoặc ADMIN
    if (user.role !== ROLE.DEALER_MANAGER && user.role !== ROLE.ADMIN) {
      await session.abortTransaction();
      return errorRes(
        res,
        "Only dealer manager can approve order request",
        403
      );
    }

    // ✅ 2. VALIDATE DEALERSHIP
    if (!user.dealership_id) {
      await session.abortTransaction();
      return errorRes(res, "User must belong to a dealership", 400);
    }

    // ✅ 3. TÌM ORDER REQUEST
    const request = await OrderRequest.findById(id)
      .populate("items.vehicle_id")
      .session(session);

    if (!request) {
      await session.abortTransaction();
      return errorRes(res, "Order request not found", 404);
    }

    // ✅ Check dealership khớp
    if (request.dealership_id.toString() !== user.dealership_id.toString()) {
      await session.abortTransaction();
      return errorRes(res, "Request does not belong to your dealership", 403);
    }

    // ✅ 4. VALIDATE STATUS
    if (request.status !== "pending") {
      await session.abortTransaction();
      return errorRes(
        res,
        `Request already ${request.status}. Cannot approve.`,
        400
      );
    }

    // ✅ 5. VALIDATE ĐÃ TẠO REQUEST VEHICLE CHƯA
    const existingVehicleRequests = await RequestVehicle.find({
      order_request_id: request._id,
    }).session(session);

    if (existingVehicleRequests.length > 0) {
      await session.abortTransaction();
      return errorRes(
        res,
        "RequestVehicles already created for this OrderRequest",
        400
      );
    }

    // ✅ 6. CẬP NHẬT ORDER REQUEST
    request.status = "approved";
    request.approved_by = user.id;
    request.approved_at = new Date();
    await request.save({session});

    // ✅ 7. TẠO REQUEST VEHICLES CHO TỪNG ITEM
    const createdRequests = [];
    const skippedItems = [];

    for (const item of request.items) {
      const vehicle = await Vehicle.findOne({
        _id: item.vehicle_id,
        status: "active",
        is_deleted: false,
      }).session(session);

      if (!vehicle) {
        skippedItems.push({
          vehicle_id: item.vehicle_id,
          reason: "Vehicle not found or inactive",
        });
        continue;
      }

      const normalizedColor = capitalizeVietnamese(item.color?.trim() || "");

      // ✅ Validate color không rỗng
      if (!normalizedColor) {
        skippedItems.push({
          vehicle_id: item.vehicle_id,
          vehicle_name: vehicle.name,
          reason: "Color is required",
        });
        continue;
      }

      // ✅ Check duplicate RequestVehicle - chỉ check những RequestVehicle chưa bị soft delete
      // Cho phép tạo RequestVehicle mới nếu RequestVehicle cũ đã bị soft delete (is_deleted: true)
      const existing = await RequestVehicle.findOne({
        vehicle_id: item.vehicle_id,
        dealership_id: request.dealership_id,
        color: normalizedColor,
        status: {$nin: ["delivered", "rejected", "canceled"]},
        $or: [{is_deleted: false}, {is_deleted: {$exists: false}}],
      }).session(session);
      console.log(existing);
      if (existing) {
        skippedItems.push({
          vehicle_id: item.vehicle_id,
          vehicle_name: vehicle.name,
          color: normalizedColor,
          reason: `Duplicate request already exists (status: ${existing.status})`,
        });
        continue;
      }

      // ✅ Tạo RequestVehicle mới với link về OrderRequest và Order
      const newReq = await RequestVehicle.create(
        [
          {
            vehicle_id: item.vehicle_id,
            dealership_id: request.dealership_id,
            quantity: item.quantity,
            color: normalizedColor,
            notes: request.notes || "",
            status: "pending",
            order_request_id: request._id, // ✅ Link về OrderRequest
            order_id: request.order_id || null, // ✅ Link về Order (nếu có - CASE 1)
          },
        ],
        {session}
      );

      createdRequests.push(newReq[0]);

      // Socket notification
      if (req.app.get("io")) {
        emitRequestStatusUpdate(req.app.get("io"), {
          requestId: newReq[0]._id,
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

    // ✅ 8. NẾU CÓ ORDER LIÊN KẾT (CASE 1), CẬP NHẬT STATUS
    if (request.order_id) {
      const order = await Order.findById(request.order_id).session(session);

      if (order) {
        // ✅ Check dealership khớp
        if (
          order.dealership_id.toString() !== request.dealership_id.toString()
        ) {
          await session.abortTransaction();
          return errorRes(res, "Order dealership mismatch", 400);
        }

        // ✅ Chỉ update nếu Order đang đợi
        if (order.status === "deposit_paid") {
          order.status = "waiting_vehicle_request";
          await order.save({session});
        }
      }
    }

    // ✅ 9. COMMIT TRANSACTION
    await session.commitTransaction();

    // ✅ 10. POPULATE & RETURN
    await request.populate([
      {path: "requested_by", select: "full_name email role"},
      {path: "approved_by", select: "full_name email role"},
      {path: "dealership_id", select: "name"},
      {path: "order_id", select: "code status"},
    ]);

    return success(res, "Order request approved successfully", {
      orderRequest: request,
      createdVehicleRequests: createdRequests,
      skippedItems: skippedItems.length > 0 ? skippedItems : undefined,
      message:
        `Created ${createdRequests.length} vehicle request(s) to manufacturer. ` +
        `${
          skippedItems.length > 0
            ? `Skipped ${skippedItems.length} item(s).`
            : ""
        }` +
        `${
          request.order_id
            ? " Order updated to waiting status."
            : " Manual request - no Order linked."
        }`,
    });
  } catch (err) {
    await session.abortTransaction();
    next(err);
  } finally {
    session.endSession();
  }
}

/**
 * Manager từ chối OrderRequest
 * PATCH /api/order-requests/:id/reject
 *
 * CASE 1 (có Order): Manager reject → Order vẫn active, có thể tạo request mới
 * CASE 2 (manual): Manager reject → Request bị hủy, không ảnh hưởng Order
 */
export async function rejectOrderRequest(req, res, next) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = req.user;
    const {id} = req.params;
    const {reason} = req.body;

    // ✅ 1. VALIDATE ROLE
    if (user.role !== ROLE.DEALER_MANAGER && user.role !== ROLE.ADMIN) {
      await session.abortTransaction();
      return errorRes(res, "Only dealer manager can reject order request", 403);
    }

    // ✅ 2. VALIDATE REASON
    if (!reason || reason.trim() === "") {
      await session.abortTransaction();
      return errorRes(res, "Rejection reason is required", 400);
    }

    // ✅ 3. TÌM ORDER REQUEST
    const request = await OrderRequest.findById(id).session(session);

    if (!request) {
      await session.abortTransaction();
      return errorRes(res, "Order request not found", 404);
    }

    // ✅ Check dealership khớp
    if (request.dealership_id.toString() !== user.dealership_id.toString()) {
      await session.abortTransaction();
      return errorRes(res, "Request does not belong to your dealership", 403);
    }

    // ✅ 4. VALIDATE STATUS
    if (request.status !== "pending") {
      await session.abortTransaction();
      return errorRes(
        res,
        `Only pending requests can be rejected. Current status: ${request.status}`,
        400
      );
    }

    // ✅ 5. UPDATE ORDER REQUEST
    request.status = "rejected";
    request.rejected_by = user.id;
    request.rejected_at = new Date();
    request.rejection_reason = reason;
    await request.save({session});

    // ✅ 6. NẾU CÓ ORDER (CASE 1), XỬ LÝ ORDER
    let orderUpdated = false;
    if (request.order_id) {
      const order = await Order.findById(request.order_id).session(session);

      if (order) {
        // ⚠️ KHÔNG tự động cancel Order
        // Để manager quyết định: Tạo request mới hoặc cancel Order thủ công
        if (order.status === "waiting_vehicle_request") {
          order.notes =
            (order.notes || "") +
            `\n[${new Date().toISOString()}] OrderRequest ${
              request.code
            } rejected by manager. ` +
            `Reason: ${reason}. Order is still active - create new request or cancel manually.`;
          await order.save({session});
          orderUpdated = true;
        }
      }
    }

    // ✅ 7. COMMIT TRANSACTION
    await session.commitTransaction();

    // ✅ 8. POPULATE & RETURN
    await request.populate([
      {path: "requested_by", select: "full_name email role"},
      {path: "rejected_by", select: "full_name email role"},
      {path: "dealership_id", select: "name"},
      {path: "order_id", select: "code status"},
    ]);

    return success(res, "Order request rejected", {
      orderRequest: request,
      orderUpdated,
      message: request.order_id
        ? "CASE 1: OrderRequest rejected. Order is still active - you can create a new request or cancel Order manually."
        : "CASE 2: Manual request rejected. No Order affected.",
    });
  } catch (err) {
    await session.abortTransaction();
    console.error("❌ Reject OrderRequest Error:", err);
    next(err);
  } finally {
    session.endSession();
  }
}

export async function getOrderRequestById(req, res, next) {
  try {
    const request = await OrderRequest.findById(req.params.id)
      .populate("requested_by", "full_name email")
      .populate("approved_by", "full_name email")
      .populate("rejected_by", "full_name email")
      .populate("dealership_id", "company_name")
      .populate("order_id", "code")
      .lean();

    if (!request) {
      return errorRes(res, "Order request not found", 404);
    }

    return success(res, "Order request detail", request);
  } catch (err) {
    next(err);
  }
}
