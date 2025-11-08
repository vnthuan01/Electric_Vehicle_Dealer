import mongoose from "mongoose";
import Order from "../models/Order.js";
import Vehicle from "../models/Vehicle.js";
import {success} from "../utils/response.js";
import {
  AuthMessage,
  DealerMessage,
  ManufacturerMessage,
} from "../utils/MessageRes.js";
import {generateReportExcelSingle} from "../services/reportService.js";
import fs from "fs";
import DealerManufacturerDebt from "../models/DealerManufacturerDebt.js";
import Debt from "../models/Debt.js";
import {AppError} from "../utils/AppError.js";
/**
 * Doanh số theo thời gian / sản phẩm / đại lý
 */
export async function getSalesReport(req, res, next) {
  try {
    const {startDate, endDate, dealership_id} = req.query;
    const match = {
      is_deleted: false,
      status: {$in: ["delivered", "fully_paid", "completed"]},
    };

    if (startDate && endDate)
      match.createdAt = {$gte: new Date(startDate), $lte: new Date(endDate)};
    if (dealership_id)
      match.dealership_id = new mongoose.Types.ObjectId(dealership_id);

    const pipeline = [
      {$match: match},
      {$unwind: "$items"},
      {
        $group: {
          _id: {
            vehicle: "$items.vehicle_id",
            dealership: "$dealership_id",
          },
          totalQuantity: {$sum: "$items.quantity"},
          totalRevenue: {$sum: "$items.final_amount"},
        },
      },
      {
        $lookup: {
          from: "vehicles",
          localField: "_id.vehicle",
          foreignField: "_id",
          as: "vehicle",
        },
      },
      {$unwind: "$vehicle"},
      {
        $lookup: {
          from: "dealerships",
          localField: "_id.dealership",
          foreignField: "_id",
          as: "dealership",
        },
      },
      {$unwind: {path: "$dealership", preserveNullAndEmptyArrays: true}},
      {
        $project: {
          vehicle_name: "$vehicle.name",
          model: "$vehicle.model",
          dealership_name: "$dealership.company_name",
          totalQuantity: 1,
          totalRevenue: 1,
        },
      },
      {$sort: {totalRevenue: -1}},
    ];

    const report = await Order.aggregate(pipeline);

    return success(res, AuthMessage.FETCH_SUCCESS, report);
  } catch (err) {
    next(err);
  }
}

/**
 * Top sản phẩm bán chạy (theo thời gian)
 */
export async function getTopSellingVehicles(req, res, next) {
  try {
    const {startDate, endDate, limit = 5} = req.query;
    const match = {
      is_deleted: false,
      status: {$in: ["delivered", "fully_paid", "completed"]},
    };

    if (startDate && endDate)
      match.createdAt = {$gte: new Date(startDate), $lte: new Date(endDate)};

    const pipeline = [
      {$match: match},
      {$unwind: "$items"},
      {
        $group: {
          _id: "$items.vehicle_id",
          totalQuantity: {$sum: "$items.quantity"},
          totalRevenue: {$sum: "$items.final_amount"},
        },
      },
      {$sort: {totalQuantity: -1}},
      {$limit: Number(limit)},
      {
        $lookup: {
          from: "vehicles",
          localField: "_id",
          foreignField: "_id",
          as: "vehicle",
        },
      },
      {$unwind: "$vehicle"},
      {
        $project: {
          vehicle_name: "$vehicle.name",
          model: "$vehicle.model",
          totalQuantity: 1,
          totalRevenue: 1,
        },
      },
    ];

    const result = await Order.aggregate(pipeline);
    return success(res, AuthMessage.FETCH_SUCCESS, result);
  } catch (err) {
    next(err);
  }
}

/**
 * Tồn kho mỗi Đại lý (lấy từ Vehicle.stocks)
 */
export async function getDealerStock(req, res, next) {
  try {
    const pipeline = [
      {$unwind: "$stocks"},
      {$match: {"stocks.owner_type": "dealer"}},
      {
        $lookup: {
          from: "dealerships",
          localField: "stocks.owner_id",
          foreignField: "_id",
          as: "dealership",
        },
      },
      {$unwind: "$dealership"},
      {
        $group: {
          _id: "$stocks.owner_id",
          dealership_name: {$first: "$dealership.company_name"},
          totalVehicles: {$sum: "$stocks.quantity"},
          details: {
            $push: {
              vehicle_name: "$name",
              color: "$stocks.color",
              quantity: "$stocks.quantity",
              remaining_quantity: "$stocks.remaining_quantity",
            },
          },
        },
      },
      {$sort: {totalVehicles: -1}},
    ];

    const result = await Vehicle.aggregate(pipeline);
    return success(res, AuthMessage.FETCH_SUCCESS, result);
  } catch (err) {
    next(err);
  }
}

/**
 * oanh số theo nhân viên bán hàng (Dealer)
 */
export async function getSalesByStaff(req, res, next) {
  try {
    const {startDate, endDate} = req.query;
    const dealership_id = req.user?.dealership_id;
    const match = {
      dealership_id: new mongoose.Types.ObjectId(dealership_id),
      is_deleted: false,
      status: {$in: ["delivered", "fully_paid", "completed"]},
    };

    if (startDate && endDate)
      match.createdAt = {$gte: new Date(startDate), $lte: new Date(endDate)};

    const pipeline = [
      {$match: match},
      {
        $group: {
          _id: "$salesperson_id",
          totalRevenue: {$sum: "$final_amount"},
          totalOrders: {$sum: 1},
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "staff",
        },
      },
      {$unwind: "$staff"},
      {
        $project: {
          staff_name: "$staff.full_name",
          email: "$staff.email",
          totalRevenue: 1,
          totalOrders: 1,
        },
      },
      {$sort: {totalRevenue: -1}},
    ];

    const result = await Order.aggregate(pipeline);
    return success(res, AuthMessage.FETCH_SUCCESS, result);
  } catch (err) {
    next(err);
  }
}

/**
 * Lấy công nợ giữa dealer đang login và các manufacturer
 */
export async function getDealerManufacturerDebts(req, res, next) {
  try {
    const dealership_id = req.user?.dealership_id;
    if (!dealership_id) return next(new Error("Missing dealership_id"));

    // Lọc chỉ công nợ còn dư
    const extraQuery = {
      dealership_id: dealership_id,
      remaining_amount: {$gt: 0},
      is_deleted: false,
    };

    // Phân trang
    const page = parseInt(req.query.page || 1);
    const limit = parseInt(req.query.limit || 10);
    const skip = (page - 1) * limit;

    const [data, totalCount] = await Promise.all([
      DealerManufacturerDebt.find(extraQuery)
        .populate({path: "manufacturer_id", select: "name"})
        .skip(skip)
        .limit(limit),
      DealerManufacturerDebt.countDocuments(extraQuery),
    ]);

    // Tổng công nợ
    const totals = await DealerManufacturerDebt.aggregate([
      {$match: extraQuery},
      {
        $group: {
          _id: null,
          totalAmount: {$sum: {$ifNull: ["$total_amount", 0]}},
          remainingAmount: {$sum: {$ifNull: ["$remaining_amount", 0]}},
        },
      },
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return success(res, DealerMessage.DEBTS_RETRIEVED, {
      page,
      limit,
      totalPages,
      totalItems: totalCount,
      data,
    });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/debts/dealer-customer
 * Lấy công nợ giữa dealer đang login và khách hàng
 */
export async function getDealerCustomerDebts(req, res, next) {
  try {
    const dealership_id = req.user?.dealership_id;
    if (!dealership_id) return next(new Error("Missing dealership_id"));

    // Lọc theo trạng thái công nợ
    let statusFilter = ["partial", "settled"];
    if (req.query.status) {
      statusFilter = req.query.status
        .split(",")
        .map((s) => s.trim().toLowerCase());
    }

    const matchStage = {
      status: {$in: statusFilter},
    };

    // --- Pipeline ---
    const pipeline = [
      {$match: {is_deleted: false}},
      {
        $lookup: {
          from: "orders",
          localField: "order_id",
          foreignField: "_id",
          as: "order",
        },
      },
      {$unwind: "$order"},
      {
        $match: {
          ...matchStage,
          "order.dealership_id": dealership_id,
        },
      },
      {
        $lookup: {
          from: "customers",
          localField: "customer_id",
          foreignField: "_id",
          as: "customer",
        },
      },
      {$unwind: "$customer"},
      {
        $project: {
          total_amount: 1,
          remaining_amount: 1,
          status: 1,
          order_id: "$order._id",
          customer_id: "$customer._id",
          order: {
            code: "$order.code",
            final_amount: "$order.final_amount",
            status: "$order.status",
            paid_amount: "$order.paid_amount",
          },
          customer: {
            full_name: "$customer.full_name",
            phone: "$customer.phone",
            email: "$customer.email",
          },
        },
      },
    ];

    const page = parseInt(req.query.page || 1);
    const limit = parseInt(req.query.limit || 10);
    const skip = (page - 1) * limit;

    const [data, totalCount] = await Promise.all([
      Debt.aggregate([...pipeline, {$skip: skip}, {$limit: limit}]),
      Debt.aggregate([...pipeline, {$count: "count"}]),
    ]);

    const totalItems = totalCount[0]?.count || 0;
    const totalPages = Math.ceil(totalItems / limit);

    return success(res, DealerMessage.DEBTS_RETRIEVED, {
      page,
      limit,
      totalPages,
      totalItems,
      filters: {status: statusFilter},
      data,
    });
  } catch (e) {
    next(e);
  }
}

/**
 * Tốc độ tiêu thụ xe theo Manufacturer
 */
export async function getManufacturerVehicleConsumption(req, res, next) {
  try {
    const {startDate, endDate, manufacturer_id} = req.query;

    const end = endDate ? new Date(endDate) : new Date();
    if (Number.isNaN(end.getTime())) {
      return next(new AppError("Invalid endDate", 400));
    }

    const start = startDate ? new Date(startDate) : new Date(end);
    if (Number.isNaN(start.getTime())) {
      return next(new AppError("Invalid startDate", 400));
    }

    if (!startDate) {
      start.setDate(start.getDate() - 29);
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    if (start > end) {
      return next(new AppError("startDate must be before endDate", 400));
    }

    const match = {
      is_deleted: false,
      status: {$in: ["delivered", "fully_paid", "completed"]},
      createdAt: {$gte: start, $lte: end},
    };

    const pipeline = [
      {$match: match},
      {$unwind: "$items"},
      {
        $lookup: {
          from: "vehicles",
          localField: "items.vehicle_id",
          foreignField: "_id",
          as: "vehicle",
        },
      },
      {$unwind: "$vehicle"},
      {$match: {"vehicle.is_deleted": false}},
    ];

    if (manufacturer_id) {
      pipeline.push({
        $match: {
          "vehicle.manufacturer_id": new mongoose.Types.ObjectId(
            manufacturer_id
          ),
        },
      });
    }

    pipeline.push(
      {
        $group: {
          _id: "$vehicle.manufacturer_id",
          totalQuantity: {$sum: "$items.quantity"},
          totalRevenue: {$sum: "$items.final_amount"},
          vehicles: {
            $addToSet: {
              vehicle_id: "$vehicle._id",
              vehicle_name: "$vehicle.name",
              model: "$vehicle.model",
            },
          },
        },
      },
      {
        $lookup: {
          from: "manufacturers",
          localField: "_id",
          foreignField: "_id",
          as: "manufacturer",
        },
      },
      {$unwind: {path: "$manufacturer", preserveNullAndEmptyArrays: true}},
      {
        $project: {
          _id: 0,
          manufacturer_id: "$_id",
          manufacturer_name: "$manufacturer.name",
          totalQuantity: 1,
          totalRevenue: 1,
          vehicles: 1,
        },
      },
      {$sort: {totalQuantity: -1}}
    );

    const consumption = await Order.aggregate(pipeline);

    const dayMs = 1000 * 60 * 60 * 24;
    const totalDays = Math.max(
      1,
      Math.floor((end.getTime() - start.getTime()) / dayMs) + 1
    );

    const data = consumption.map((item) => ({
      ...item,
      averageDailySales: Number((item.totalQuantity / totalDays).toFixed(2)),
      averageDailyRevenue: Number((item.totalRevenue / totalDays).toFixed(2)),
    }));

    return success(res, ManufacturerMessage.VEHICLE_CONSUMPTION_RETRIEVED, {
      timeframe: {
        start: start.toISOString(),
        end: end.toISOString(),
        totalDays,
      },
      data,
    });
  } catch (err) {
    next(err);
  }
}

/** ===============================
 *  Doanh số theo thời gian / sản phẩm / đại lý
 * =============================== */
export async function exportSalesReport(req, res, next) {
  try {
    const {startDate, endDate, dealership_id} = req.query;
    const match = {
      is_deleted: false,
      status: {$in: ["delivered", "fully_paid", "completed"]},
    };
    if (startDate && endDate)
      match.createdAt = {$gte: new Date(startDate), $lte: new Date(endDate)};
    if (dealership_id)
      match.dealership_id = new mongoose.Types.ObjectId(dealership_id);

    const data = await Order.aggregate([
      {$match: match},
      {$unwind: "$items"},
      {
        $lookup: {
          from: "vehicles",
          localField: "items.vehicle_id",
          foreignField: "_id",
          as: "vehicle",
        },
      },
      {$unwind: {path: "$vehicle", preserveNullAndEmptyArrays: true}},
      {
        $group: {
          _id: {
            vehicle: "$vehicle.name",
            model: "$vehicle.model",
          },
          totalQuantity: {$sum: "$items.quantity"},
          totalRevenue: {$sum: "$items.final_amount"},
        },
      },
      {
        $project: {
          _id: 0,
          Vehicle: "$_id.vehicle",
          Model: "$_id.model",
          "Total Quantity": "$totalQuantity",
          "Total Revenue (VND)": "$totalRevenue",
        },
      },
      {$sort: {"Total Revenue (VND)": -1}},
    ]);

    if (!data.length)
      return res.status(404).json({message: "Không có dữ liệu để xuất Excel"});

    const filePath = generateReportExcelSingle(
      data,
      "Sales Report",
      "Sales_Report"
    );

    return res.download(filePath, (err) => {
      if (err) console.error("Download error:", err);
      setTimeout(() => fs.unlinkSync(filePath), 10_000);
    });
  } catch (err) {
    next(err);
  }
}

/** ===============================
 *  Top xe bán chạy
 * =============================== */
export async function exportTopSelling(req, res, next) {
  try {
    const {startDate, endDate, limit = 10} = req.query;
    const match = {
      is_deleted: false,
      status: {$in: ["delivered", "fully_paid", "completed"]},
    };
    if (startDate && endDate)
      match.createdAt = {$gte: new Date(startDate), $lte: new Date(endDate)};

    const data = await Order.aggregate([
      {$match: match},
      {$unwind: "$items"},
      {
        $group: {
          _id: "$items.vehicle_id",
          totalQuantity: {$sum: "$items.quantity"},
          totalRevenue: {$sum: "$items.final_amount"},
        },
      },
      {$sort: {totalQuantity: -1}},
      {$limit: Number(limit)},
      {
        $lookup: {
          from: "vehicles",
          localField: "_id",
          foreignField: "_id",
          as: "vehicle",
        },
      },
      {$unwind: "$vehicle"},
      {
        $project: {
          _id: 0,
          vehicle_name: "$vehicle.name",
          model: "$vehicle.model",
          totalQuantity: 1,
          totalRevenue: 1,
        },
      },
    ]);

    if (!data.length)
      return res.status(404).json({message: "Không có dữ liệu để xuất"});

    const filePath = generateReportExcelSingle(
      data,
      "Top Selling",
      "Top_Selling"
    );
    res.download(filePath, () =>
      setTimeout(() => fs.unlinkSync(filePath), 15000)
    );
  } catch (err) {
    next(err);
  }
}

/** ===============================
 *  Tồn kho đại lý
 * =============================== */
export async function exportDealerStock(req, res, next) {
  try {
    const data = await Vehicle.aggregate([
      {$unwind: "$stocks"},
      {$match: {"stocks.owner_type": "dealer"}},
      {
        $lookup: {
          from: "dealerships",
          localField: "stocks.owner_id",
          foreignField: "_id",
          as: "dealer",
        },
      },
      {$unwind: "$dealer"},
      {
        $project: {
          _id: 0,
          dealership: "$dealer.company_name",
          vehicle_name: "$name",
          color: "$stocks.color",
          quantity: "$stocks.remaining_quantity",
        },
      },
      {$sort: {dealership: 1}},
    ]);

    if (!data.length)
      return res.status(404).json({message: "Không có dữ liệu để xuất"});

    const filePath = generateReportExcelSingle(
      data,
      "Dealer Stock",
      "Dealer_Stock"
    );
    res.download(filePath, () =>
      setTimeout(() => fs.unlinkSync(filePath), 15000)
    );
  } catch (err) {
    next(err);
  }
}

/** ===============================
 *  Doanh số theo nhân viên
 * =============================== */
export async function exportSalesByStaff(req, res, next) {
  try {
    const {startDate, endDate} = req.query;
    const dealership_id = req.user?.dealership_id;
    const match = {
      dealership_id: new mongoose.Types.ObjectId(dealership_id),
      is_deleted: false,
      status: {$in: ["delivered", "fully_paid", "completed"]},
    };
    if (startDate && endDate)
      match.createdAt = {$gte: new Date(startDate), $lte: new Date(endDate)};

    const data = await Order.aggregate([
      {$match: match},
      {
        $group: {
          _id: "$salesperson_id",
          totalRevenue: {$sum: "$final_amount"},
          totalOrders: {$sum: 1},
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "staff",
        },
      },
      {$unwind: "$staff"},
      {
        $project: {
          _id: 0,
          staff_name: "$staff.full_name",
          email: "$staff.email",
          totalRevenue: 1,
          totalOrders: 1,
        },
      },
      {$sort: {totalRevenue: -1}},
    ]);

    if (!data.length)
      return res.status(404).json({message: "Không có dữ liệu để xuất"});

    const filePath = generateReportExcelSingle(
      data,
      "Sales by Staff",
      "Sales_By_Staff"
    );
    res.download(filePath, () =>
      setTimeout(() => fs.unlinkSync(filePath), 15000)
    );
  } catch (err) {
    next(err);
  }
}
