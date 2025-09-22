import TestDrive from "../models/TestDrive.js";
import Customer from "../models/Customer.js";
import Vehicle from "../models/Vehicle.js";
import {created, success, error as errorRes} from "../utils/response.js";
import {TestDriveMessage} from "../utils/MessageRes.js";

export async function createTestDrive(req, res, next) {
  try {
    const {customer_id, vehicle_id, dealership_id, schedule_at, notes} =
      req.body;

    if (!customer_id || !vehicle_id || !schedule_at) {
      return errorRes(res, TestDriveMessage.MISSING_REQUIRED_FIELDS, 400);
    }

    const customer = await Customer.findById(customer_id);
    const vehicle = await Vehicle.findById(vehicle_id);

    if (!customer)
      return errorRes(res, TestDriveMessage.CUSTOMER_NOT_FOUND, 404);
    if (!vehicle) return errorRes(res, TestDriveMessage.VEHICLE_NOT_FOUND, 404);

    const testDrive = await TestDrive.create({
      customer_id,
      vehicle_id,
      dealership_id,
      schedule_at,
      notes,
    });
    const populated = await testDrive.populate(
      "customer_id vehicle_id dealership_id"
    );

    return created(res, TestDriveMessage.CREATE_SUCCESS, populated);
  } catch (err) {
    next(err);
  }
}

export async function getTestDrives(req, res, next) {
  try {
    const list = await TestDrive.find().populate(
      "customer_id vehicle_id dealership_id"
    );
    return success(res, list);
  } catch (err) {
    next(err);
  }
}

export async function getTestDriveById(req, res, next) {
  try {
    const item = await TestDrive.findById(req.params.id).populate(
      "customer_id vehicle_id dealership_id"
    );
    if (!item) return errorRes(res, TestDriveMessage.INVALID_REQUEST, 404);
    return success(res, item);
  } catch (err) {
    next(err);
  }
}

export async function updateTestDrive(req, res, next) {
  try {
    const updated = await TestDrive.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    }).populate("customer_id vehicle_id dealership_id");
    if (!updated) return errorRes(res, TestDriveMessage.INVALID_REQUEST, 404);
    return success(res, updated);
  } catch (err) {
    next(err);
  }
}

export async function deleteTestDrive(req, res, next) {
  try {
    const deleted = await TestDrive.findByIdAndDelete(req.params.id);
    if (!deleted) return errorRes(res, TestDriveMessage.INVALID_REQUEST, 404);
    return success(res, true);
  } catch (err) {
    next(err);
  }
}
