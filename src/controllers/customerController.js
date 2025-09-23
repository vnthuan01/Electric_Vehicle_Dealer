import Customer from "../models/Customer.js";
import {success, created, error as errorRes} from "../utils/response.js";
import {paginate} from "../utils/pagination.js";
import {CustomerMessage} from "../utils/MessageRes.js";

export async function createCustomer(req, res, next) {
  try {
    const customer = await Customer.create(req.body);
    return created(res, CustomerMessage.CREATE_SUCCESS, customer);
  } catch (e) {
    next(e);
  }
}

export async function getCustomers(req, res, next) {
  try {
    const {q} = req.query;
    const cond = {};
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

export async function getCustomerById(req, res, next) {
  try {
    const item = await Customer.findById(req.params.id);
    if (!item) return errorRes(res, CustomerMessage.NOT_FOUND, 404);
    return success(res, CustomerMessage.DETAIL_RETRIEVED, item);
  } catch (e) {
    next(e);
  }
}

export async function updateCustomer(req, res, next) {
  try {
    const item = await Customer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!item) return errorRes(res, CustomerMessage.NOT_FOUND, 404);
    return success(res, CustomerMessage.UPDATE_SUCCESS, item);
  } catch (e) {
    next(e);
  }
}

export async function deleteCustomer(req, res, next) {
  try {
    const item = await Customer.findByIdAndDelete(req.params.id);
    if (!item) return errorRes(res, CustomerMessage.NOT_FOUND, 404);
    return success(res, CustomerMessage.DELETE_SUCCESS, {id: item._id});
  } catch (e) {
    next(e);
  }
}
