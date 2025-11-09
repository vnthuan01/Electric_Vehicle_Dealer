import OrderStatusLog from "../models/OrderStatusLog.js";
import Order from "../models/Order.js";
import {success, error as errorRes} from "../utils/response.js";
import {paginate} from "../utils/pagination.js";

// ==================== CREATE STATUS LOG ====================
export async function createStatusLog(
  order_id,
  old_status,
  new_status,
  changed_by,
  reason = "",
  notes = "",
  additional_info = {}
) {
  try {
    const order = await Order.findById(order_id).lean();
    if (!order) throw new Error("Order not found");

    const logData = {
      order_id,
      customer_id: order.customer_id,
      dealership_id: order.dealership_id,
      old_status,
      new_status,
      old_delivery_status: additional_info.old_delivery_status,
      new_delivery_status: additional_info.new_delivery_status,
      changed_by,
      changed_by_name: additional_info.changed_by_name || "System",
      reason,
      notes,
      ip_address: additional_info.ip_address,
      user_agent: additional_info.user_agent,
      payment_info: additional_info.payment_info,
      delivery_info: additional_info.delivery_info,
    };

    const log = await OrderStatusLog.create(logData);
    return log;
  } catch (error) {
    console.error("Error creating status log:", error);
    return null;
  }
}

// ==================== GET ORDER STATUS LOGS ====================
export async function getOrderStatusLogs(req, res, next) {
  try {
    const {order_id} = req.params;
    const dealership_id = req.user?.dealership_id;

    // Kiểm tra order thuộc dealership
    const order = await Order.findById(order_id).select("dealership_id").lean();
    if (!order) return errorRes(res, "Order not found", 404);

    if (String(order.dealership_id) !== String(dealership_id)) {
      return errorRes(res, "Access denied", 403);
    }

    const cond = {order_id};
    const result = await paginate(
      OrderStatusLog,
      req,
      ["reason", "notes"],
      cond,
      {created_at: -1} // Sắp xếp theo thời gian mới nhất
    );

    // Populate thông tin người thay đổi
    const populatedData = await OrderStatusLog.populate(result.data, [
      {path: "changed_by", select: "full_name email"},
    ]);

    return success(res, "Order status logs retrieved", {
      ...result,
      data: populatedData,
    });
  } catch (e) {
    next(e);
  }
}

// ==================== GET DEALERSHIP STATUS LOGS ====================
export async function getDealershipStatusLogs(req, res, next) {
  try {
    const dealership_id = req.user?.dealership_id;
    const {status, date_from, date_to, customer_id} = req.query;

    const cond = {dealership_id};

    // Filter theo status
    if (status) {
      cond.new_status = status;
    }

    // Filter theo customer
    if (customer_id) {
      cond.customer_id = customer_id;
    }

    // Filter theo thời gian
    if (date_from || date_to) {
      cond.created_at = {};
      if (date_from) cond.created_at.$gte = new Date(date_from);
      if (date_to) cond.created_at.$lte = new Date(date_to);
    }

    const result = await paginate(
      OrderStatusLog,
      req,
      ["reason", "notes"],
      cond,
      {created_at: -1}
    );

    // Populate thông tin order, customer và người thay đổi
    const populatedData = await OrderStatusLog.populate(result.data, [
      {path: "order_id", select: "code final_amount"},
      {path: "customer_id", select: "full_name phone"},
      {path: "changed_by", select: "full_name email"},
    ]);

    return success(res, "Dealership status logs retrieved", {
      ...result,
      data: populatedData,
    });
  } catch (e) {
    next(e);
  }
}

// ==================== GET STATUS LOG BY ID ====================
export async function getStatusLogById(req, res, next) {
  try {
    const {id} = req.params;
    const dealership_id = req.user?.dealership_id;

    const log = await OrderStatusLog.findOne({
      _id: id,
      dealership_id,
    })
      .populate("order_id")
      .populate("customer_id")
      .populate("changed_by");

    if (!log) return errorRes(res, "Status log not found", 404);

    return success(res, "Status log retrieved", log);
  } catch (e) {
    next(e);
  }
}

// ==================== GET ORDER STATUS HISTORY ====================
// ==================== GET ORDER STATUS HISTORY ====================
export async function getOrderStatusHistory(req, res, next) {
  try {
    const {order_id} = req.params;
    const dealership_id = req.user?.dealership_id;

    // Kiểm tra order thuộc dealership
    const order = await Order.findById(order_id)
      .select("dealership_id status delivery.status createdAt updatedAt")
      .lean();
    if (!order) return errorRes(res, "Order not found", 404);

    if (String(order.dealership_id) !== String(dealership_id)) {
      return errorRes(res, "Access denied", 403);
    }

    // Lấy logs theo timeline
    const logs = await OrderStatusLog.find({order_id})
      .sort({created_at: 1})
      .populate("changed_by", "full_name email")
      .lean();

    // Tạo timeline
    const timeline = logs.map((log) => ({
      id: log._id,
      created_at: log.createdAt, // thời điểm log được tạo
      updated_at: log.updatedAt || log.createdAt, // nếu chưa có updated_at thì dùng created_at
      status_change:
        log.old_status !== log.new_status
          ? {
              from: log.old_status,
              to: log.new_status,
            }
          : null,
      changed_by: log.changed_by,
      reason: log.reason,
      notes: log.notes,
      payment_info: log.payment_info,
      delivery_info: log.delivery_info,
    }));

    // Thêm trạng thái hiện tại
    timeline.push({
      id: "current",
      created_at: order.createdAt,
      updated_at: order.updatedAt,
      current_status: order.status,
      current_delivery_status: order.delivery?.status,
      is_current: true,
    });

    return success(res, "Order status history retrieved", {
      order_id,
      current_status: order.status,
      current_delivery_status: order.delivery?.status,
      timeline,
    });
  } catch (e) {
    next(e);
  }
}

// ==================== GET STATUS STATISTICS ====================
export async function getStatusStatistics(req, res, next) {
  try {
    const dealership_id = req.user?.dealership_id;
    const {date_from, date_to} = req.query;

    const matchCond = {dealership_id};
    if (date_from || date_to) {
      matchCond.created_at = {};
      if (date_from) matchCond.created_at.$gte = new Date(date_from);
      if (date_to) matchCond.created_at.$lte = new Date(date_to);
    }

    // Thống kê theo status
    const statusStats = await OrderStatusLog.aggregate([
      {$match: matchCond},
      {
        $group: {
          _id: "$new_status",
          count: {$sum: 1},
          last_updated: {$max: "$created_at"},
        },
      },
      {$sort: {count: -1}},
    ]);

    // Thống kê theo thời gian (7 ngày gần nhất)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailyStats = await OrderStatusLog.aggregate([
      {
        $match: {
          ...matchCond,
          created_at: {$gte: sevenDaysAgo},
        },
      },
      {
        $group: {
          _id: {
            date: {$dateToString: {format: "%Y-%m-%d", date: "$created_at"}},
            status: "$new_status",
          },
          count: {$sum: 1},
        },
      },
      {$sort: {"_id.date": -1, "_id.status": 1}},
    ]);

    return success(res, "Status statistics retrieved", {
      status_stats: statusStats,
      daily_stats: dailyStats,
    });
  } catch (e) {
    next(e);
  }
}
