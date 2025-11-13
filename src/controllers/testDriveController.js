import TestDrive from "../models/TestDrive.js";
import Customer from "../models/Customer.js";
import Vehicle from "../models/Vehicle.js";
import {created, success, error as errorRes} from "../utils/response.js";
import {TestDriveMessage} from "../utils/MessageRes.js";
import {paginate} from "../utils/pagination.js";

export async function createTestDrive(req, res, next) {
  try {
    const {customer_id, vehicle_id, schedule_at, notes} = req.body;
    const dealership_id = req.user?.dealership_id;
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
      "customer_id vehicle_id dealership_id assigned_staff_id"
    );

    return created(res, TestDriveMessage.CREATE_SUCCESS, populated);
  } catch (err) {
    next(err);
  }
}

export async function getTestDrives(req, res, next) {
  try {
    // paginate dựa trên trường schedule_at + notes
    const dealership_id = req.user?.dealership_id;
    const result = await paginate(TestDrive, req, ["notes"], {dealership_id});

    // populate dữ liệu quan hệ
    const populatedData = await Promise.all(
      result.data.map((td) =>
        TestDrive.findById(td._id).populate(
          "customer_id vehicle_id dealership_id assigned_staff_id"
        )
      )
    );

    return success(res, TestDriveMessage.LIST_SUCCESS, {
      ...result,
      data: populatedData,
    });
  } catch (err) {
    next(err);
  }
}

export async function getTestDrivesByStaff(req, res, next) {
  try {
    const staff_id = req.user?._id;
    const dealership_id = req.user?.dealership_id;

    if (!staff_id) {
      return errorRes(res, TestDriveMessage.INVALID_REQUEST, 400);
    }

    const result = await paginate(TestDrive, req, ["notes"], {
      assigned_staff_id: staff_id,
      dealership_id,
    });

    const populatedData = await Promise.all(
      result.data.map((td) =>
        TestDrive.findById(td._id).populate(
          "customer_id vehicle_id dealership_id assigned_staff_id"
        )
      )
    );

    return success(res, TestDriveMessage.LIST_SUCCESS, {
      ...result,
      data: populatedData,
    });
  } catch (err) {
    next(err);
  }
}

export async function getTestDrivesByCustomer(req, res, next) {
  try {
    const {customer_id} = req.params;
    const dealership_id = req.user?.dealership_id;

    if (!customer_id) {
      return errorRes(res, TestDriveMessage.MISSING_REQUIRED_FIELDS, 400);
    }

    const result = await paginate(TestDrive, req, ["notes"], {
      customer_id,
      dealership_id,
    });

    const populatedData = await Promise.all(
      result.data.map((td) =>
        TestDrive.findById(td._id).populate(
          "customer_id vehicle_id dealership_id assigned_staff_id"
        )
      )
    );

    return success(res, TestDriveMessage.LIST_SUCCESS, {
      ...result,
      data: populatedData,
    });
  } catch (err) {
    next(err);
  }
}

export async function getTestDriveById(req, res, next) {
  try {
    const item = await TestDrive.findById(req.params.id).populate(
      "customer_id vehicle_id dealership_id assigned_staff_id"
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
    }).populate("customer_id vehicle_id dealership_id assigned_staff_id");
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

// Assign a staff to handle the test drive
export async function assignTestDriveStaff(req, res, next) {
  try {
    const {assigned_staff_id} = req.body;
    if (!assigned_staff_id) {
      return errorRes(res, TestDriveMessage.MISSING_REQUIRED_FIELDS, 400);
    }
    const updated = await TestDrive.findByIdAndUpdate(
      req.params.id,
      {assigned_staff_id},
      {new: true}
    ).populate("customer_id vehicle_id dealership_id assigned_staff_id");
    if (!updated) return errorRes(res, TestDriveMessage.INVALID_REQUEST, 404);
    return success(res, TestDriveMessage.ASSIGN_SUCCESS, updated);
  } catch (err) {
    next(err);
  }
}

// Update only status field for a test drive
export async function updateTestDriveStatus(req, res, next) {
  try {
    const {status} = req.body;
    const allowed = ["pending", "confirmed", "completed", "canceled"];
    if (!status || !allowed.includes(status)) {
      return errorRes(res, TestDriveMessage.INVALID_REQUEST, 400);
    }
    const updated = await TestDrive.findByIdAndUpdate(
      req.params.id,
      {status},
      {new: true}
    ).populate("customer_id vehicle_id dealership_id assigned_staff_id");
    if (!updated) return errorRes(res, TestDriveMessage.INVALID_REQUEST, 404);
    return success(res, TestDriveMessage.STATUS_UPDATE_SUCCESS, updated);
  } catch (err) {
    next(err);
  }
}
