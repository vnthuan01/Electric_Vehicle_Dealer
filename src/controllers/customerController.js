import Customer from "../models/Customer.js";
import User from "../models/User.js"; // model User có dealership_id
import {success, created, error as errorRes} from "../utils/response.js";
import {paginate} from "../utils/pagination.js";
import {CustomerMessage} from "../utils/MessageRes.js";

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

    const item = await Customer.findOneAndDelete({
      _id: req.params.id,
      dealership_id,
    });

    if (!item) return errorRes(res, CustomerMessage.NOT_FOUND, 404);
    return success(res, CustomerMessage.DELETE_SUCCESS, {id: item._id});
  } catch (e) {
    next(e);
  }
}
