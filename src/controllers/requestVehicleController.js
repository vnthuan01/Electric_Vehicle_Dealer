import Vehicle from "../models/Vehicle.js";
import DealerManufacturerDebt from "../models/DealerManufacturerDebt.js";
import {created, error as errorRes} from "../utils/response.js";
import {DealerMessage} from "../utils/MessageRes.js";

/**
 * Dealer gửi request nhập xe từ Manufacturer
 * req.body: { vehicle_id, quantity, dealership_id }
 */
export async function requestVehicleFromManufacturer(req, res, next) {
  try {
    const {vehicle_id, quantity, dealership_id} = req.body;

    if (!vehicle_id || !quantity || !dealership_id) {
      return errorRes(res, DealerMessage.MISSING_FIELDS, 400);
    }

    // Lấy thông tin xe
    const vehicle = await Vehicle.findById(vehicle_id);
    if (!vehicle) return errorRes(res, DealerMessage.VEHICLE_NOT_FOUND, 404);

    // Kiểm tra stock manufacturer
    const manufacturerStock = vehicle.stocks.find(
      (s) => s.owner_type === "manufacturer"
    );
    if (!manufacturerStock || manufacturerStock.quantity < quantity) {
      return errorRes(res, DealerMessage.INSUFFICIENT_STOCK, 400);
    }

    // Trừ stock manufacturer
    manufacturerStock.quantity -= quantity;

    // Cập nhật stock dealer
    let dealerStock = vehicle.stocks.find(
      (s) =>
        s.owner_type === "dealer" &&
        s.owner_id.toString() === dealership_id.toString()
    );
    if (dealerStock) {
      dealerStock.quantity += quantity;
    } else {
      vehicle.stocks.push({
        owner_type: "dealer",
        owner_id: dealership_id,
        quantity,
      });
    }

    await vehicle.save();

    // Tính tổng tiền
    const total_amount = vehicle.price * quantity;

    // Cập nhật hoặc tạo Dealer-Manufacturer debt
    let debt = await DealerManufacturerDebt.findOne({
      dealership_id,
      manufacturer_id: vehicle.manufacturer_id,
    });

    if (debt) {
      debt.total_amount += total_amount;
      debt.remaining_amount += total_amount;
      debt.status = "open";
      await debt.save();
    } else {
      debt = await DealerManufacturerDebt.create({
        dealership_id,
        manufacturer_id: vehicle.manufacturer_id,
        total_amount,
        paid_amount: 0,
        remaining_amount: total_amount,
        status: "open",
      });
    }

    return created(res, DealerMessage.REQUEST_APPROVED, {
      vehicle,
      quantity,
      debt,
    });
  } catch (err) {
    next(err);
  }
}
