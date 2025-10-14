import Customer from "../models/Customer.js";
import mongoose from "mongoose";
import User from "../models/User.js";
import {success, created, error as errorRes} from "../utils/response.js";
import {paginate} from "../utils/pagination.js";
import {CustomerMessage, PaymentMessage} from "../utils/MessageRes.js";
import Order from "../models/Order.js";
import Payment from "../models/Payment.js";
import TestDrive from "../models/TestDrive.js";
import {OrderMessage, TestDriveMessage} from "../utils/MessageRes.js";

// Helper lấy dealership_id từ user.id
async function getDealershipId(userId) {
  const user = await User.findById(userId);
  if (!user || !user.dealership_id)
    throw new Error("User or dealership not found");
  return user.dealership_id;
}

// Tạo khách hàng
export async function createCustomer(req, res, next) {
  try {
    const dealership_id = await getDealershipId(req.user.id);
    const payload = {...req.body, dealership_id};
    const customer = await Customer.create(payload);

    return created(res, CustomerMessage.CREATE_SUCCESS, customer);
  } catch (e) {
    next(e);
  }
}

// Lấy danh sách khách hàng thuộc dealership
export async function getCustomers(req, res, next) {
  try {
    const dealership_id = await getDealershipId(req.user.id);
    const {q} = req.query;

    const cond = {dealership_id};
    if (q) {
      cond.$or = [
        {full_name: {$regex: q, $options: "i"}},
        {email: {$regex: q, $options: "i"}},
        {phone: {$regex: q, $options: "i"}},
      ];
    }

    const result = await paginate(
      Customer,
      req,
      ["full_name", "email", "phone"],
      cond
    );
    return success(res, CustomerMessage.LIST_RETRIEVED, result);
  } catch (e) {
    next(e);
  }
}

export async function getCustomersOfYourself(req, res, next) {
  try {
    const user_id = new mongoose.Types.ObjectId(req.user.id);
    const {q, page = 1, limit = 10} = req.query;

    const matchStage = {salesperson_id: user_id};

    // Nếu có search text
    if (q) {
      matchStage.$or = [
        {"customer.full_name": {$regex: q, $options: "i"}},
        {"customer.email": {$regex: q, $options: "i"}},
        {"customer.phone": {$regex: q, $options: "i"}},
      ];
    }

    const pipeline = [
      // Join Customer
      {
        $lookup: {
          from: "customers",
          localField: "customer_id",
          foreignField: "_id",
          as: "customer",
        },
      },
      {$unwind: "$customer"},

      // Lọc theo người sale
      {$match: {salesperson_id: user_id}},

      // Nếu có query search, áp dụng sau unwind
      ...(q
        ? [
            {
              $match: {
                $or: [
                  {"customer.full_name": {$regex: q, $options: "i"}},
                  {"customer.email": {$regex: q, $options: "i"}},
                  {"customer.phone": {$regex: q, $options: "i"}},
                ],
              },
            },
          ]
        : []),

      // Nhóm theo customer và lấy đơn gần nhất
      {
        $group: {
          _id: "$customer._id",
          customer: {$first: "$customer"},
          recent_order: {
            $first: {
              id: "$_id",
              code: "$code",
              status: "$status",
              final_amount: "$final_amount",
              paid_amount: "$paid_amount",
              createdAt: "$createdAt",
            },
          },
        },
      },

      // Sắp xếp theo ngày đơn mới nhất
      {$sort: {"recent_order.createdAt": -1}},

      // Pagination
      {$skip: (parseInt(page) - 1) * parseInt(limit)},
      {$limit: parseInt(limit)},
    ];

    const result = await Order.aggregate(pipeline);

    // Tổng số customer (count riêng)
    const totalRecords = await Order.aggregate([
      {$match: {salesperson_id: user_id}},
      {$group: {_id: "$customer_id"}},
      {$count: "count"},
    ]);

    const total = totalRecords[0]?.count || 0;

    return success(res, CustomerMessage.LIST_RETRIEVED, {
      data: result.map((r) => ({
        _id: r.customer._id,
        full_name: r.customer.full_name,
        email: r.customer.email,
        phone: r.customer.phone,
        recent_order: r.recent_order,
      })),
      totalRecords: total,
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit),
      page: parseInt(page),
    });
  } catch (e) {
    next(e);
  }
}

// Xem chi tiết khách hàng
export async function getCustomerById(req, res, next) {
  try {
    const dealership_id = await getDealershipId(req.user.id);

    const item = await Customer.findOne({
      _id: req.params.id,
      dealership_id,
    });

    if (!item) return errorRes(res, CustomerMessage.NOT_FOUND, 404);
    return success(res, CustomerMessage.DETAIL_RETRIEVED, item);
  } catch (e) {
    next(e);
  }
}

// Cập nhật khách hàng
export async function updateCustomer(req, res, next) {
  try {
    const dealership_id = await getDealershipId(req.user.id);

    const item = await Customer.findOneAndUpdate(
      {_id: req.params.id, dealership_id},
      req.body,
      {new: true}
    );

    if (!item) return errorRes(res, CustomerMessage.NOT_FOUND, 404);
    return success(res, CustomerMessage.UPDATE_SUCCESS, item);
  } catch (e) {
    next(e);
  }
}

// Xóa khách hàng
export async function deleteCustomer(req, res, next) {
  try {
    const dealership_id = await getDealershipId(req.user.id);

    const item = await Customer.findOneAndUpdate(
      {_id: req.params.id, dealership_id},
      {$set: {active: false}},
      {new: true}
    );

    if (!item) return errorRes(res, CustomerMessage.NOT_FOUND, 404);
    return success(res, CustomerMessage.DELETE_SUCCESS, {id: item._id});
  } catch (e) {
    next(e);
  }
}

export async function reActiveCustomer(req, res, next) {
  try {
    const dealership_id = await getDealershipId(req.user.id);

    const item = await Customer.findOneAndUpdate(
      {_id: req.params.id, dealership_id},
      {$set: {active: true}},
      {new: true}
    );

    if (!item) return errorRes(res, CustomerMessage.NOT_FOUND, 404);
    return success(res, CustomerMessage.UPDATE_SUCCESS, {id: item._id});
  } catch (e) {
    next(e);
  }
}

// Lịch sử đơn hàng của khách hàng (đại lý)
export async function getCustomerOrders(req, res, next) {
  try {
    const dealership_id = await getDealershipId(req.user.id);
    const customer_id = req.params.id;
    const extraQuery = {dealership_id, customer_id};
    const result = await paginate(Order, req, ["code", "status"], extraQuery);
    return success(res, OrderMessage.LIST_SUCCESS, result);
  } catch (e) {
    next(e);
  }
}

// Lịch sử thanh toán của khách hàng (đại lý)
export async function getCustomerPayments(req, res, next) {
  try {
    const dealership_id = await getDealershipId(req.user.id);
    const customer_id = req.params.id;

    // Lấy danh sách order thuộc customer này và dealership hiện tại
    const orders = await Order.find({customer_id, dealership_id}).select("_id");

    const orderIds = orders.map((o) => o._id);

    const cond = {order_id: {$in: orderIds}};

    const result = await paginate(Payment, req, ["reference", "method"], cond);

    return success(res, PaymentMessage.LIST_SUCCESS, result);
  } catch (e) {
    next(e);
  }
}

// Lịch sử lái thử của khách hàng (đại lý)
export async function getCustomerTestDrives(req, res, next) {
  try {
    const dealership_id = await getDealershipId(req.user.id);
    const customer_id = req.params.id;
    const extraQuery = {dealership_id, customer_id};
    const result = await paginate(TestDrive, req, ["status"], extraQuery);
    return success(res, TestDriveMessage.LIST_SUCCESS, result);
  } catch (e) {
    next(e);
  }
}
