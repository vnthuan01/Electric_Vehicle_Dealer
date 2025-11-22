import Vehicle from "../models/Vehicle.js";
import DealerManufacturerDebt from "../models/DealerManufacturerDebt.js";
import RequestVehicle from "../models/RequestVehicle.js";
import {created, success, error as errorRes} from "../utils/response.js";
import {DealerMessage} from "../utils/MessageRes.js";
import {paginate} from "../utils/pagination.js";
import {emitRequestStatusUpdate} from "../config/socket.js";
import Dealership from "../models/Dealership.js";
import {capitalizeVietnamese} from "../utils/validateWord.js";
import mongoose from "mongoose";
import Order from "../models/Order.js";
import OrderRequest from "../models/OrderRequest.js";
import Payment from "../models/Payment.js";
import Debt from "../models/Debt.js";
import {createStatusLog} from "./orderStatusLogController.js";

//Dealer gửi request nhập xe (PENDING)
export async function requestVehicleFromManufacturer(req, res, next) {
  try {
    const {vehicle_id, quantity, notes, color} = req.body;

    if (!vehicle_id || !quantity || !color) {
      return errorRes(res, DealerMessage.MISSING_FIELDS, 400);
    }

    const dealership = await Dealership.findById(req.user.dealership_id);
    if (!dealership) {
      return errorRes(res, DealerMessage.NOT_FOUND);
    }

    const vehicle = await Vehicle.findOne({
      _id: vehicle_id,
      status: "active",
      is_deleted: false,
    });

    if (!vehicle) {
      return errorRes(res, DealerMessage.VEHICLE_NOT_FOUND, 404);
    }

    //Chuẩn hoá màu khi lưu request
    const normalizedColor = capitalizeVietnamese(color.trim());

    // Check duplicate request
    const existingRequest = await RequestVehicle.findOne({
      vehicle_id,
      dealership_id: req.user.dealership_id,
      color: normalizedColor,
      status: {$in: ["pending"]},
    });

    if (existingRequest) {
      return errorRes(res, DealerMessage.DUPLICATE_REQUEST, 400);
    }

    const request = await RequestVehicle.create({
      vehicle_id,
      dealership_id: req.user.dealership_id,
      quantity,
      color: normalizedColor,
      notes,
      status: "pending",
    });

    // Emit socket notification
    if (req.app.get("io")) {
      emitRequestStatusUpdate(req.app.get("io"), {
        requestId: request._id,
        status: "pending",
        dealershipId: req.user.dealership_id,
        vehicle: {
          id: vehicle._id,
          name: vehicle.name,
          sku: vehicle.sku,
          color: normalizedColor,
        },
        quantity,
      });
    }

    return created(res, DealerMessage.REQUEST_CREATED_PENDING, request);
  } catch (err) {
    next(err);
  }
}

//EVM Staff / Admin duyệt request
export async function approveRequest(req, res, next) {
  try {
    const {id} = req.params;
    const request = await RequestVehicle.findById(id).populate("vehicle_id");
    if (!request) return errorRes(res, DealerMessage.REQUEST_NOT_FOUND, 404);

    if (request.status !== "pending") {
      return errorRes(res, DealerMessage.REQUEST_ALREADY_PROCESSED, 400);
    }

    const statusOrder = [
      "pending",
      "approved",
      "in_progress",
      "delivered",
      "rejected",
    ];
    const currIdx = statusOrder.indexOf(request.status);
    const nextIdx = statusOrder.indexOf("approved");
    if (nextIdx < currIdx) {
      return errorRes(res, "Cannot revert to previous status", 400);
    }

    // Kiểm tra xe tồn tại
    const vehicle = await Vehicle.findById(request.vehicle_id);
    if (!vehicle) return errorRes(res, DealerMessage.VEHICLE_NOT_FOUND, 404);

    // Kiểm tra còn đủ stock của hãng không
    const manufacturerStock = vehicle.stocks.find(
      (s) =>
        s.owner_type === "manufacturer" &&
        (!request.color || s.color === request.color)
    );

    if (!manufacturerStock || manufacturerStock.quantity < request.quantity) {
      request.status = "rejected";
      request.notes =
        "Tự động từ chối do không đủ stock hãng khi duyệt yêu cầu.";
      await request.save();
      if (request.order_request_id) {
        await OrderRequest.updateOne(
          {_id: request.order_request_id},
          {
            $set: {
              status: "rejected",
              notes:
                "Tự động từ chối do không đủ stock hãng khi duyệt yêu cầu (RequestVehicle liên quan bị từ chối).",
            },
          }
        );
      }
      return errorRes(res, DealerMessage.INSUFFICIENT_STOCK, 400);
    }

    // Chỉ approve, KHÔNG cập nhật stock
    request.status = "approved";
    await request.save();

    // Emit socket
    if (req.app.get("io")) {
      emitRequestStatusUpdate(req.app.get("io"), {
        requestId: request._id,
        status: "approved",
        dealershipId: request.dealership_id,
        vehicle: {
          id: vehicle._id,
          name: vehicle.name,
          sku: vehicle.sku,
        },
        quantity: request.quantity,
      });
    }

    return success(res, DealerMessage.REQUEST_APPROVED, request);
  } catch (err) {
    next(err);
  }
}

//In-progress request
export async function inProgressRequest(req, res, next) {
  try {
    const {id} = req.params;
    const request = await RequestVehicle.findById(id).populate("vehicle_id");
    if (!request) return errorRes(res, DealerMessage.REQUEST_NOT_FOUND, 404);

    if (request.status !== "pending" && request.status !== "approved") {
      return errorRes(res, DealerMessage.REQUEST_ALREADY_PROCESSED, 400);
    }
    const statusOrder = [
      "pending",
      "approved",
      "in_progress",
      "delivered",
      "rejected",
    ];
    const currIdx = statusOrder.indexOf(request.status);
    const nextIdx = statusOrder.indexOf("in_progress");
    if (nextIdx < currIdx) {
      return errorRes(res, "Cannot revert to previous status", 400);
    }

    request.status = "in_progress";
    await request.save();

    // Emit socket notification for rejected request

    return success(res, "Request in progress", request);
  } catch (err) {
    next(err);
  }
}

//Reject request
export async function rejectRequest(req, res, next) {
  try {
    const {id} = req.params;
    const {reason} = req.body;
    console.log(reason);
    const request = await RequestVehicle.findById(id).populate("vehicle_id");
    if (!request) return errorRes(res, DealerMessage.REQUEST_NOT_FOUND, 404);

    // if (request.status !== "pending") {
    //   return errorRes(res, DealerMessage.REQUEST_ALREADY_PROCESSED, 400);
    // }

    request.status = "rejected";
    request.notes = reason;
    if (request.order_request_id) {
      await OrderRequest.updateOne(
        {_id: request.order_request_id},
        {
          $set: {
            status: "rejected",
            notes:
              "Tự động từ chối do không đủ stock hãng khi duyệt yêu cầu (RequestVehicle liên quan bị từ chối).",
          },
        }
      );
    }
    await request.save();

    // Emit socket notification for rejected request
    if (req.app.get("io")) {
      emitRequestStatusUpdate(req.app.get("io"), {
        requestId: request._id,
        status: "rejected",
        dealershipId: request.dealership_id,
        vehicle: {
          id: request.vehicle_id._id,
          name: request.vehicle_id.name,
          sku: request.vehicle_id.sku,
        },
        quantity: request.quantity,
        reason: "Request rejected by EVM Staff",
      });
    }

    return success(res, DealerMessage.REQUEST_REJECTED, request);
  } catch (err) {
    next(err);
  }
}

//Get all requests
export async function getAllRequests(req, res, next) {
  try {
    const {status, dealership_id, vehicle_id} = req.query;

    const extraQuery = {};
    if (status) extraQuery.status = status;
    if (dealership_id) extraQuery.dealership_id = dealership_id;
    if (vehicle_id) extraQuery.vehicle_id = vehicle_id;

    const result = await paginate(RequestVehicle, req, [], extraQuery);

    // populate sau khi paginate
    result.data = await RequestVehicle.find(result.sort ? {} : extraQuery)
      .find(extraQuery)
      .sort(result.sort)
      .skip((result.page - 1) * result.limit)
      .limit(result.limit)
      .populate("vehicle_id dealership_id");

    return success(res, DealerMessage.REQUEST_LIST_SUCCESS, result);
  } catch (err) {
    next(err);
  }
}

export async function getAllRequestVehicleForDealer(req, res, next) {
  try {
    const {status, vehicle_id} = req.query;

    // Lấy dealership_id từ user và ép ObjectId
    const dealership_id = req.user?.dealership_id;
    if (!dealership_id) {
      return res.status(400).json({message: "Dealership ID is required"});
    }

    let dealershipObjectId;
    try {
      dealershipObjectId = new mongoose.Types.ObjectId(dealership_id);
    } catch {
      return res.status(400).json({message: "Invalid dealership ID"});
    }

    // Build query
    const extraQuery = {dealership_id: dealershipObjectId};
    if (status) extraQuery.status = status;
    if (vehicle_id) {
      try {
        extraQuery.vehicle_id = new mongoose.Types.ObjectId(vehicle_id);
      } catch {
        return res.status(400).json({message: "Invalid vehicle ID"});
      }
    }

    // Paginate
    const result = await paginate(RequestVehicle, req, [], extraQuery);

    // Populate với select field cụ thể
    result.data = await RequestVehicle.find(extraQuery)
      .sort(result.sort)
      .skip((result.page - 1) * result.limit)
      .limit(result.limit)
      .populate({
        path: "vehicle_id",
        select: "name model price year", // chỉ lấy các trường mong muốn
      })
      .populate({
        path: "dealership_id",
        select: "company_name address phone email", // chỉ lấy các trường mong muốn
      });

    return success(res, DealerMessage.REQUEST_LIST_SUCCESS, result);
  } catch (err) {
    next(err);
  }
}

//Delete request (chỉ khi pending, chưa approved)
export async function deleteRequest(req, res, next) {
  try {
    const request = await RequestVehicle.findById(req.params.id);
    if (!request) return errorRes(res, DealerMessage.REQUEST_NOT_FOUND, 404);

    if (request.status !== "pending" && request.status !== "rejected") {
      return errorRes(res, DealerMessage.REQUEST_CANNOT_DELETE, 400);
    }

    await request.deleteOne();
    return success(res, DealerMessage.DELETE_REQUEST_SUCCESS);
  } catch (err) {
    next(err);
  }
}

// Cập nhật trạng thái giao xe cho request xe
export async function updateRequestVehicleStatus(req, res, next) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {id} = req.params;
    const {notes} = req.body;
    const status = "delivered";
    if (!status) {
      return errorRes(res, "Invalid status", 400);
    }

    const request = await RequestVehicle.findById(id).session(session);
    if (!request) {
      await session.abortTransaction();
      return errorRes(res, DealerMessage.REQUEST_NOT_FOUND, 404);
    }

    // ✅ KIỂM TRA: Nếu có order_id → BẮT BUỘC dùng handleManufacturerApprove
    if (request.order_id) {
      await session.abortTransaction();
      return errorRes(
        res,
        " RequestVehicle này liên kết với Order. " +
          "Vui lòng dùng POST /api/request-vehicles/:id/manufacturer-approve thay vì API này.",
        400
      );
    }

    if (["rejected"].includes(request.status)) {
      await session.abortTransaction();
      return errorRes(res, "Cannot update rejected request", 400);
    }

    const statusOrder = [
      "pending",
      "approved",
      "in_progress",
      "delivered",
      "rejected",
    ];
    const currIdx = statusOrder.indexOf(request.status);
    const nextIdx = statusOrder.indexOf(status);
    if (nextIdx < currIdx) {
      await session.abortTransaction();
      return errorRes(res, "Cannot revert to previous status", 400);
    }

    // Nếu là delivered -> cập nhật stock & debt
    if (status === "delivered") {
      const vehicle = await Vehicle.findById(request.vehicle_id).session(
        session
      );
      if (!vehicle) {
        await session.abortTransaction();
        return errorRes(res, DealerMessage.VEHICLE_NOT_FOUND, 404);
      }

      const manufacturerStock = vehicle.stocks.find(
        (s) =>
          s.owner_type === "manufacturer" &&
          (!request.color || s.color === request.color)
      );

      if (!manufacturerStock || manufacturerStock.quantity < request.quantity) {
        await session.abortTransaction();
        return errorRes(res, DealerMessage.INSUFFICIENT_STOCK, 400);
      }

      // Trừ stock của hãng
      manufacturerStock.quantity -= request.quantity;

      // Cộng stock cho đại lý
      let dealerStock = vehicle.stocks.find(
        (s) =>
          s.owner_type === "dealer" &&
          s.owner_id.toString() === request.dealership_id.toString() &&
          (!request.color || s.color === request.color)
      );

      if (dealerStock) {
        dealerStock.quantity += request.quantity;
      } else {
        vehicle.stocks.push({
          owner_type: "dealer",
          owner_id: request.dealership_id,
          quantity: request.quantity,
          color: request.color,
        });
      }

      await vehicle.save({session}); //  Với transaction

      // Tạo/cập nhật debt
      const total_amount = vehicle.price * request.quantity;
      let debt = await DealerManufacturerDebt.findOne({
        dealership_id: request.dealership_id,
        manufacturer_id: vehicle.manufacturer_id,
      }).session(session);

      if (debt) {
        debt.total_amount += total_amount;
        debt.remaining_amount += total_amount;
        debt.status = "open";
        debt.items = debt.items || [];
        debt.items.push({
          request_id: request._id,
          vehicle_id: vehicle._id,
          vehicle_name: vehicle.name,
          color: request.color,
          unit_price: vehicle.price,
          quantity: request.quantity,
          amount: total_amount,
          delivered_at: new Date(),
        });
        await debt.save({session}); //  Với transaction
      } else {
        debt = await DealerManufacturerDebt.create(
          [
            {
              dealership_id: request.dealership_id,
              manufacturer_id: vehicle.manufacturer_id,
              total_amount,
              paid_amount: 0,
              remaining_amount: total_amount,
              status: "open",
              items: [
                {
                  request_id: request._id,
                  vehicle_id: vehicle._id,
                  vehicle_name: vehicle.name,
                  color: request.color,
                  unit_price: vehicle.price,
                  quantity: request.quantity,
                  amount: total_amount,
                  delivered_at: new Date(),
                },
              ],
            },
          ],
          {session} // Với transaction
        );
        debt = debt[0];
      }

      request.debt_id = debt._id;
      request.delivered_at = new Date();
    }

    request.status = status;
    if (notes !== undefined) {
      request.notes = notes;
    }

    await request.save({session}); // ✅ Với transaction

    await session.commitTransaction(); // ✅ COMMIT TRANSACTION

    return success(res, "Vehicle request status updated", request);
  } catch (err) {
    await session.abortTransaction(); // ✅ ROLLBACK ON ERROR
    console.error("❌ Update Request Status Error:", err);
    next(err);
  } finally {
    session.endSession(); // ✅ CLEANUP
  }
}

/**
 * Hãng approve và giao xe cho đại lý
 * Xử lý CẢ 2 CASES:
 *   - Case 1: RequestVehicle có order_id → Update Order
 *   - Case 2: RequestVehicle KHÔNG có order_id → Chỉ xử lý stock + debt
 */
export async function handleManufacturerDelivered(req, res, next) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {id} = req.params; // RequestVehicle ID (THAY ĐỔI!)
    const {delivery_notes, actual_delivery_date} = req.body;

    // 1. Validate RequestVehicle
    const requestVehicle = await RequestVehicle.findById(id)
      .populate("vehicle_id")
      .session(session);

    if (!requestVehicle) {
      await session.abortTransaction();
      return errorRes(res, "Request vehicle not found", 404);
    }

    // ✅ ACCEPT: "pending", "approved", hoặc "in_progress"
    // Manager approve OrderRequest → tạo RequestVehicle với status "pending"
    // EVM có thể approve trực tiếp từ "pending" mà không cần intermediate step
    if (
      !["pending", "approved", "in_progress"].includes(requestVehicle.status)
    ) {
      await session.abortTransaction();
      return errorRes(
        res,
        `RequestVehicle must be 'pending', 'approved' or 'in_progress' (current: ${requestVehicle.status})`,
        400
      );
    }

    console.log(
      `🏭 Processing Manufacturer Approve for RequestVehicle ${requestVehicle._id}`
    );

    // 2. Check stock hãng
    const vehicle = await Vehicle.findById(requestVehicle.vehicle_id).session(
      session
    );
    if (!vehicle) {
      await session.abortTransaction();
      return errorRes(res, "Vehicle not found", 404);
    }

    const manufacturerStock = vehicle.stocks.find(
      (s) => s.owner_type === "manufacturer" && s.color === requestVehicle.color
    );

    if (
      !manufacturerStock ||
      manufacturerStock.quantity < requestVehicle.quantity
    ) {
      await session.abortTransaction();
      return errorRes(
        res,
        `Insufficient manufacturer stock. Need: ${
          requestVehicle.quantity
        }, Available: ${manufacturerStock?.quantity || 0}`,
        400
      );
    }

    // 3. Transfer stock: manufacturer → dealer
    // ✨ SOLUTION 2: ALWAYS create NEW stock entry (don't merge)
    manufacturerStock.quantity -= requestVehicle.quantity;

    // ✅ ALWAYS PUSH NEW STOCK ENTRY (for FIFO tracking)
    vehicle.stocks.push({
      owner_type: "dealer",
      owner_id: requestVehicle.dealership_id,
      quantity: requestVehicle.quantity,
      color: requestVehicle.color,

      // ========== TRACKING FIELDS (Solution 2) ==========
      source_request_id: requestVehicle._id, // ✅ Link to RequestVehicle
      delivered_at: actual_delivery_date || new Date(), // ✅ For FIFO sorting
      unit_cost: vehicle.price || 0, // ✅ Cost basis
      sold_quantity: 0, // ✅ Initial
      remaining_quantity: requestVehicle.quantity, // ✅ Initial = quantity
      status: "active", // ✅ Initial status
      created_by: req.user?.id || req.user?._id, // ✅ Who approved
      notes:
        delivery_notes ||
        `Stock from Request ${requestVehicle.code || requestVehicle._id}`,
    });

    await vehicle.save({session});
    console.log(
      `✅ [FIFO] Created NEW stock batch: ${requestVehicle.quantity}x ${vehicle.name} ` +
        `(color: ${requestVehicle.color}, source: ${requestVehicle._id})`
    );

    // 4. Tạo/cập nhật DealerManufacturerDebt
    const totalAmount = vehicle.price * requestVehicle.quantity;

    let dealerDebt = await DealerManufacturerDebt.findOne({
      dealership_id: requestVehicle.dealership_id,
      manufacturer_id: vehicle.manufacturer_id,
    }).session(session);

    const debtItem = {
      request_id: requestVehicle._id,
      vehicle_id: vehicle._id,
      vehicle_name: vehicle.name,
      color: requestVehicle.color,
      unit_price: vehicle.price,
      quantity: requestVehicle.quantity,
      amount: totalAmount,
      delivered_at: actual_delivery_date || new Date(),
      notes: delivery_notes || "",

      // ========== TRACKING FIELDS (Solution 2) ==========
      settled_amount: 0, // ✅ Initial
      remaining_amount: totalAmount, // ✅ Initial = amount
      sold_quantity: 0, // ✅ Initial
      settled_by_orders: [], // ✅ Empty array
      status: "pending_payment", // ✅ Initial status
    };

    if (dealerDebt) {
      dealerDebt.total_amount += totalAmount;
      dealerDebt.remaining_amount += totalAmount;
      dealerDebt.status = "open";
      dealerDebt.items.push(debtItem);
      await dealerDebt.save({session});
      console.log(`💰 Updated DealerManufacturerDebt: +${totalAmount}`);
    } else {
      dealerDebt = await DealerManufacturerDebt.create(
        [
          {
            dealership_id: requestVehicle.dealership_id,
            manufacturer_id: vehicle.manufacturer_id,
            total_amount: totalAmount,
            paid_amount: 0,
            remaining_amount: totalAmount,
            status: "open",
            items: [debtItem],
          },
        ],
        {session}
      );
      dealerDebt = dealerDebt[0];
      console.log(`💰 Created DealerManufacturerDebt: ${totalAmount}`);
    }

    // 5. Cập nhật RequestVehicle
    requestVehicle.status = "delivered";
    requestVehicle.delivered_at = actual_delivery_date || new Date();
    requestVehicle.debt_id = dealerDebt._id;
    requestVehicle.notes = requestVehicle.notes
      ? `${requestVehicle.notes}\n[Delivered] ${delivery_notes || ""}`
      : `[Delivered] ${delivery_notes || ""}`;
    await requestVehicle.save({session});

    // 6. ✅ NẾU CÓ ORDER → CẬP NHẬT ORDER
    let orderUpdated = false;
    let orderData = null;

    if (requestVehicle.order_id) {
      const order = await Order.findById(requestVehicle.order_id).session(
        session
      );

      if (order && order.status === "waiting_vehicle_request") {
        // const oldStatus = order.status;
        // order.status = "vehicle_ready";

        // ✅ LINK RequestVehicle vào Order
        if (!order.related_request_vehicles) {
          order.related_request_vehicles = [];
        }
        if (!order.related_request_vehicles.includes(requestVehicle._id)) {
          order.related_request_vehicles.push(requestVehicle._id);
        }

        // Cập nhật vehicle_ready_info
        if (!order.vehicle_ready_info) {
          order.vehicle_ready_info = {};
        }
        order.vehicle_ready_info.marked_ready_at = new Date();
        order.vehicle_ready_info.marked_ready_by = req.user?.user_id;
        order.vehicle_ready_info.preparation_notes = `Xe đã được giao từ hãng. ${
          delivery_notes || ""
        }`;

        await order.save({session});

        orderUpdated = true;
        orderData = order;
        console.log(`✅ Order ${order.code} updated to vehicle_ready`);
      }
    }

    await session.commitTransaction();
    console.log("✅ Manufacturer approval processed successfully");

    return success(res, "Manufacturer approved and vehicles delivered", {
      request_vehicle: requestVehicle,
      dealer_debt: {
        debt_id: dealerDebt._id,
        total_amount: dealerDebt.total_amount,
        new_debt_amount: totalAmount,
      },
      order_updated: orderUpdated,
      order: orderData
        ? {
            id: orderData._id,
            code: orderData.code,
            status: orderData.status,
          }
        : null,
      message: orderUpdated
        ? "Xe đã được giao và Order đã chuyển sang vehicle_ready. Có thể gọi khách thanh toán."
        : "Xe đã được giao vào kho đại lý.",
    });
  } catch (err) {
    await session.abortTransaction();
    console.error("❌ Manufacturer Approve Error:", err);
    next(err);
  } finally {
    session.endSession();
  }
}

/**
 * Hãng từ chối request
 */
export async function handleManufacturerReject(req, res, next) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {id} = req.params; // RequestVehicle ID (THAY ĐỔI!)
    const {rejection_reason, refund_method = "bank"} = req.body;

    if (!rejection_reason || rejection_reason.trim() === "") {
      return errorRes(res, "Rejection reason is required", 400);
    }

    const requestVehicle = await RequestVehicle.findById(id).session(session);
    if (!requestVehicle) {
      await session.abortTransaction();
      return errorRes(res, "Request vehicle not found", 404);
    }

    // ✅ ACCEPT: "pending", "approved", hoặc "in_progress"
    // Có thể reject từ bất kỳ status nào trong quá trình chờ xử lý
    if (
      !["pending", "approved", "in_progress"].includes(requestVehicle.status)
    ) {
      await session.abortTransaction();
      return errorRes(
        res,
        `Can only reject 'pending', 'approved' or 'in_progress' requests (current: ${requestVehicle.status})`,
        400
      );
    }

    console.log(
      `🚫 Processing Manufacturer Reject for RequestVehicle ${requestVehicle._id}`
    );

    // Cập nhật RequestVehicle
    requestVehicle.status = "rejected";
    requestVehicle.notes = requestVehicle.notes
      ? `${requestVehicle.notes}\n[Rejected by Manufacturer] ${rejection_reason}`
      : `[Rejected by Manufacturer] ${rejection_reason}`;
    await requestVehicle.save({session});

    // ✅ NẾU CÓ ORDER → XỬ LÝ ORDER
    let orderCanceled = false;
    let refundPayment = null;
    let orderData = null;

    if (requestVehicle.order_id) {
      const order = await Order.findById(requestVehicle.order_id).session(
        session
      );

      if (order && order.status === "waiting_vehicle_request") {
        const oldStatus = order.status;
        order.status = "canceled";
        order.canceled_at = new Date();
        order.cancellation_reason = `Manufacturer rejected vehicle request: ${rejection_reason}`;
        await order.save({session});

        // Hoàn tiền nếu đã cọc
        if (order.paid_amount > 0) {
          refundPayment = await Payment.create(
            [
              {
                order_id: order._id,
                customer_id: order.customer_id,
                dealership_id: order.dealership_id,
                amount: order.paid_amount,
                payment_type: "refund",
                payment_method: refund_method,
                status: "completed",
                notes: `Refund due to manufacturer rejection: ${rejection_reason}`,
              },
            ],
            {session}
          );
          refundPayment = refundPayment[0];
          console.log(`💰 Refund payment created: ${order.paid_amount} VND`);
        }

        // Hủy customer debt
        const customerDebt = await Debt.findOne({
          order_id: order._id,
          status: {$in: ["pending", "partial"]},
        }).session(session);

        if (customerDebt) {
          customerDebt.status = "canceled";
          customerDebt.notes = "Canceled: Manufacturer rejected request";
          await customerDebt.save({session});
          console.log("📝 Customer debt canceled");
        }

        // Tạo status log
        await createStatusLog(
          {
            order_id: order._id,
            customer_id: order.customer_id,
            dealership_id: order.dealership_id,
            old_status: oldStatus,
            new_status: "canceled",
            notes: `Order canceled due to manufacturer rejection: ${rejection_reason}`,
            changed_by: req.user?.user_id,
          },
          session
        );

        orderCanceled = true;
        orderData = order;
        console.log(`✅ Order ${order.code} canceled`);
      }
    }

    await session.commitTransaction();
    console.log("✅ Manufacturer rejection processed successfully");

    return success(res, "Manufacturer rejected request", {
      request_vehicle: requestVehicle,
      order_canceled: orderCanceled,
      order: orderData
        ? {
            id: orderData._id,
            code: orderData.code,
            status: orderData.status,
          }
        : null,
      refund_payment: refundPayment,
      message: orderCanceled
        ? `Hãng từ chối. Đơn hàng đã bị huỷ${
            order.paid_amount > 0 ? " và hoàn tiền" : ""
          }.`
        : "Hãng từ chối yêu cầu nhập xe.",
    });
  } catch (err) {
    await session.abortTransaction();
    console.error("❌ Manufacturer Reject Error:", err);
    next(err);
  } finally {
    session.endSession();
  }
}

/**
 * GET /api/request-vehicles/:id
 * Lấy chi tiết 1 request cụ thể
 */
export async function getRequestVehicleById(req, res, next) {
  try {
    const {id} = req.params;

    const request = await RequestVehicle.findById(id)
      .populate(
        "vehicle_id",
        "name model manufacturer_id price images specifications"
      )
      .populate("dealership_id", "company_name address phone email")
      .lean();

    if (!request) {
      return errorRes(res, DealerMessage.REQUEST_NOT_FOUND, 404);
    }

    // Populate manufacturer info từ vehicle
    if (request.vehicle_id && request.vehicle_id.manufacturer_id) {
      const manufacturer = await mongoose
        .model("Manufacturer")
        .findById(request.vehicle_id.manufacturer_id)
        .select("name address phone email")
        .lean();
      request.manufacturer_info = manufacturer;
    }

    // Nếu có order_id, populate Order info
    if (request.order_id) {
      const order = await Order.findById(request.order_id)
        .select("code status customer_id final_amount paid_amount created_at")
        .populate("customer_id", "full_name phone email")
        .lean();
      request.order_info = order;
    }

    // Nếu có order_request_id, populate OrderRequest info
    if (request.order_request_id) {
      const orderRequest = await OrderRequest.findById(request.order_request_id)
        .select("code status quantity color notes created_at")
        .lean();
      request.order_request_info = orderRequest;
    }

    // Nếu đã giao xe (delivered), lấy thông tin công nợ
    if (request.status === "delivered" && request.debt_id) {
      const debt = await DealerManufacturerDebt.findById(request.debt_id)
        .select(
          "total_amount paid_amount remaining_amount status items payments"
        )
        .lean();

      // Tìm debt item tương ứng với request này
      if (debt && debt.items) {
        const debtItem = debt.items.find(
          (item) =>
            item.request_id &&
            item.request_id.toString() === request._id.toString()
        );

        if (debtItem) {
          request.debt_info = {
            debt_id: debt._id,
            debt_status: debt.status,
            debt_item: {
              amount: debtItem.amount,
              settled_amount: debtItem.settled_amount,
              remaining_amount: debtItem.remaining_amount,
              sold_quantity: debtItem.sold_quantity,
              status: debtItem.status,
              settled_by_orders: debtItem.settled_by_orders || [],
            },
            total_debt_amount: debt.total_amount,
            total_paid_amount: debt.paid_amount,
            total_remaining_amount: debt.remaining_amount,
          };
        }
      }
    }

    return success(res, "Request details retrieved successfully", request);
  } catch (err) {
    next(err);
  }
}

export async function getRequestVehiclesByOrderRequest(req, res, next) {
  try {
    const {id} = req.params;
    console.log(id);
    const requests = await RequestVehicle.findOne({
      order_request_id: id,
    })
      .populate(
        "vehicle_id",
        "name model manufacturer_id price images specifications"
      )
      .populate("dealership_id", "company_name address phone email")
      .populate("order_id", "code")
      .lean();

    if (!requests || requests.length === 0) {
      return errorRes(
        res,
        "Không tìm thấy yêu cầu xe nào cho Order Request này",
        404
      );
    }

    return success(res, "Danh sách yêu cầu xe theo Order Request ID", requests);
  } catch (err) {
    next(err);
  }
}
