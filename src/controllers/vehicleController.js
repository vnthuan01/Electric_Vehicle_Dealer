import Vehicle from "../models/Vehicle.js";
import Option from "../models/Option.js";
import Accessory from "../models/Accessory.js";
import Promotion from "../models/Promotion.js";
import {success, created, error as errorRes} from "../utils/response.js";
import {paginate} from "../utils/pagination.js";
import {VehicleMessage} from "../utils/MessageRes.js";

// Create one or multiple vehicles (EVM Staff, Admin only)
export async function createVehicle(req, res, next) {
  try {
    const vehiclesData = Array.isArray(req.body) ? req.body : [req.body];

    const errors = [];
    const validVehicles = [];

    for (const v of vehiclesData) {
      const {
        sku,
        name,
        category,
        price,
        manufacturer_id,
        version,
        status,
        on_road_price,
        battery_type,
        battery_capacity,
        range_km,
        charging_fast,
        charging_slow,
        motor_power,
        top_speed,
        acceleration,
        dimensions,
        weight,
        payload,
        trunk_type,
        safety_features,
        interior_features,
        driving_modes,
        software_version,
        ota_update,
        stock,
        warranty_years,
        color_options,
        images,
        description,
        options,
        accessories,
        promotions,
      } = v;

      // Basic validation
      if (!sku || !name || !category || !price || !manufacturer_id) {
        errors.push({
          sku: sku || null,
          message: VehicleMessage.MISSING_REQUIRED_FIELDS,
        });
        continue;
      }

      const exists = await Vehicle.findOne({sku});
      if (exists) {
        errors.push({sku, message: VehicleMessage.SKU_ALREADY_EXISTS});
        continue;
      }

      // Validate interior_features phải là object { name, description }
      let formattedInteriorFeatures = [];
      if (Array.isArray(interior_features)) {
        formattedInteriorFeatures = interior_features
          .filter((f) => f && f.name) // bỏ mấy item rỗng
          .map((f) => ({
            name: f.name,
            description: f.description || "",
          }));
      }

      validVehicles.push({
        sku,
        name,
        category,
        price,
        on_road_price,
        manufacturer_id,
        version,
        status,
        battery_type,
        battery_capacity,
        range_km,
        charging_fast,
        charging_slow,
        motor_power,
        top_speed,
        acceleration,
        dimensions,
        weight,
        payload,
        trunk_type,
        interior_features: formattedInteriorFeatures,
        safety_features,
        interior_features,
        driving_modes,
        software_version,
        ota_update,
        stock,
        warranty_years,
        color_options,
        images,
        description,
        options,
        accessories,
        promotions,
        price_history: [{price}],
      });
    }

    if (validVehicles.length === 0) {
      return errorRes(res, VehicleMessage.INVALID_REQUEST, 400, errors);
    }

    const createdVehicles = await Vehicle.insertMany(validVehicles);

    return created(res, VehicleMessage.CREATE_SUCCESS, {
      created: createdVehicles,
      errors,
    });
  } catch (err) {
    next(err);
  }
}

// Get vehicle list with filter/search
export async function getVehicles(req, res, next) {
  try {
    // --- Extra filters ---
    const cond = {};
    if (req.query.category) cond.category = req.query.category;
    if (req.query.status) cond.status = req.query.status;
    if (req.query.manufacturer_id)
      cond.manufacturer_id = req.query.manufacturer_id;

    // --- Price range ---
    if (req.query["price[min]"] || req.query["price[max]"]) {
      cond.price = {};
      if (req.query["price[min]"])
        cond.price.$gte = Number(req.query["price[min]"]);
      if (req.query["price[max]"])
        cond.price.$lte = Number(req.query["price[max]"]);
    }

    // --- Range filter ---
    if (req.query["range_km[min]"] || req.query["range_km[max]"]) {
      cond.range_km = {};
      if (req.query["range_km[min]"])
        cond.range_km.$gte = Number(req.query["range_km[min]"]);
      if (req.query["range_km[max]"])
        cond.range_km.$lte = Number(req.query["range_km[max]"]);
    }

    // --- Battery type ---
    if (req.query.battery_type) cond.battery_type = req.query.battery_type;

    // --- Color options ---
    if (req.query.color_options) cond.color_options = req.query.color_options;

    // --- Paginate with search ---
    const result = await paginate(
      Vehicle.find()
        .populate("manufacturer_id", "name address")
        .populate("options")
        .populate("accessories")
        .populate("promotions"), // <--- populate luôn
      req,
      ["name", "model", "version"], // searchFields
      cond // extraQuery
    );

    return res.json({
      success: true,
      message: VehicleMessage.LIST_SUCCESS,
      ...result,
    });
  } catch (err) {
    next(err);
  }
}

// Get vehicle detail
export async function getVehicleById(req, res, next) {
  try {
    const vehicle = await Vehicle.findById(req.params.id)
      .populate("manufacturer_id", "name address")
      .populate("options")
      .populate("accessories")
      .populate("promotions");

    if (!vehicle) return errorRes(res, "Vehicle not found", 404);

    return success(res, VehicleMessage.DETAIL_SUCCESS, vehicle);
  } catch (err) {
    next(err);
  }
}

// Update vehicle (EVM Staff, Admin only)
export async function updateVehicle(req, res, next) {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return errorRes(res, "Vehicle not found", 404);

    // Track price changes
    if (req.body.price && req.body.price !== vehicle.price) {
      vehicle.price_history.push({price: req.body.price});
    }

    // Update all fields
    Object.assign(vehicle, req.body);
    await vehicle.save();

    return success(res, VehicleMessage.UPDATE_SUCCESS, vehicle);
  } catch (err) {
    next(err);
  }
}

// Delete vehicle (EVM Staff, Admin only)
export async function deleteVehicle(req, res, next) {
  try {
    const vehicle = await Vehicle.findByIdAndDelete(req.params.id);
    if (!vehicle) return errorRes(res, "Vehicle not found", 404);

    return success(res, VehicleMessage.DELETE_SUCCESS, {id: vehicle._id});
  } catch (err) {
    next(err);
  }
}
