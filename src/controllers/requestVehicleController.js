import Vehicle from "../models/Vehicle.js";
import DealerManufacturerDebt from "../models/DealerManufacturerDebt.js";
import RequestVehicle from "../models/RequestVehicle.js";
import {created, success, error as errorRes} from "../utils/response.js";
import {DealerMessage} from "../utils/MessageRes.js";
import {paginate} from "../utils/pagination.js";
import {emitRequestStatusUpdate} from "../config/socket.js";
import Dealership from "../models/Dealership.js";
import {capitalizeVietnamese} from "../utils/validateWord.js";

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
      return errorRes(res, DealerMessage.REQUEST_APPROVED, 400);
    }

    //Tìm xe và check stock của hãng
    const vehicle = await Vehicle.findById(request.vehicle_id);
    if (!vehicle) return errorRes(res, DealerMessage.VEHICLE_NOT_FOUND, 404);
    const manufacturerStock = vehicle.stocks.find(
      (s) =>
        s.owner_type === "manufacturer" &&
        (!request.color || s.color === request.color)
    );

    //Nếu stock nhỏ hơn số lượng request mà Admin, EVM Staff lỡ approved thì nó sẽ báo lỗi
    if (!manufacturerStock || manufacturerStock.quantity < request.quantity) {
      request.status = "rejected";
      await request.save();
      return errorRes(res, DealerMessage.INSUFFICIENT_STOCK, 400);
    }

    //Trừ stock manufacturer
    manufacturerStock.quantity -= request.quantity;

    //Cộng stock dealer
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
    await vehicle.save();

    //Tạo/cập nhật debt
    const total_amount = vehicle.price * request.quantity;
    let debt = await DealerManufacturerDebt.findOne({
      dealership_id: request.dealership_id,
      manufacturer_id: vehicle.manufacturer_id,
    });

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
      await debt.save();
    } else {
      debt = await DealerManufacturerDebt.create({
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
      });
    }

    request.status = "approved";
    request.debt_id = debt._id;
    await request.save();

    // Emit socket notification for approved request
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

//Reject request
export async function rejectRequest(req, res, next) {
  try {
    const {id} = req.params;
    const request = await RequestVehicle.findById(id).populate("vehicle_id");
    if (!request) return errorRes(res, DealerMessage.REQUEST_NOT_FOUND, 404);

    if (request.status !== "pending") {
      return errorRes(res, DealerMessage.REQUEST_ALREADY_PROCESSED, 400);
    }

    request.status = "rejected";
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
