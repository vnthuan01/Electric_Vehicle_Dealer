import Customer from "../models/Customer.js";
import {AppError} from "../utils/AppError.js";

export async function createCustomer(req, res, next) {
  try {
    const customer = await Customer.create(req.body);
    return res.status(201).json({success: true, data: customer});
  } catch (e) {
    next(e);
  }
}

export async function getCustomers(req, res, next) {
  try {
    const list = await Customer.find();
    return res.json({success: true, data: list});
  } catch (e) {
    next(e);
  }
}

export async function getCustomerById(req, res, next) {
  try {
    const item = await Customer.findById(req.params.id);
    if (!item) throw new AppError("Khách hàng không tồn tại", 404, 1007);
    return res.json({success: true, data: item});
  } catch (e) {
    next(e);
  }
}

export async function updateCustomer(req, res, next) {
  try {
    const item = await Customer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!item) throw new AppError("Khách hàng không tồn tại", 404, 1007);
    return res.json({success: true, data: item});
  } catch (e) {
    next(e);
  }
}

export async function deleteCustomer(req, res, next) {
  try {
    const item = await Customer.findByIdAndDelete(req.params.id);
    if (!item) throw new AppError("Khách hàng không tồn tại", 404, 1007);
    return res.json({success: true, data: true});
  } catch (e) {
    next(e);
  }
}
