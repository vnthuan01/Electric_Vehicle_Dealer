import mongoose from "mongoose";
import Order from "../models/Order.js";
import Vehicle from "../models/Vehicle.js";
import {success} from "../utils/response.js";
import {AuthMessage} from "../utils/MessageRes.js";
import {generateReportExcelSingle} from "../services/reportService.js";
import fs from "fs";
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
    const {dealership_id, startDate, endDate} = req.query;
    const match = {
      is_deleted: false,
      status: {$in: ["delivered", "fully_paid", "completed"]},
    };

    if (dealership_id)
      match.dealership_id = new mongoose.Types.ObjectId(dealership_id);
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
    const {startDate, endDate, dealership_id} = req.query;
    const match = {
      is_deleted: false,
      status: {$in: ["delivered", "fully_paid", "completed"]},
    };
    if (dealership_id)
      match.dealership_id = new mongoose.Types.ObjectId(dealership_id);
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
