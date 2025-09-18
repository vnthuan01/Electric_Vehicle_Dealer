import Vehicle from "../models/Vehicle.js";
import Option from "../models/Option.js";
import Accessory from "../models/Accessory.js";
import Promotion from "../models/Promotion.js";
import {success, created, error as errorRes} from "../utils/response.js";

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
          message:
            "Missing required fields: sku, name, category, price, manufacturer_id",
        });
        continue;
      }

      const exists = await Vehicle.findOne({sku});
      if (exists) {
        errors.push({sku, message: "Vehicle with this SKU already exists"});
        continue;
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
      return errorRes(res, "No valid vehicles to create", 400, errors);
    }

    const createdVehicles = await Vehicle.insertMany(validVehicles);

    return created(res, "Vehicles created successfully", {
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
    const {q, status, category, manufacturer_id} = req.query;
    const cond = {};

    if (q) {
      cond.$or = [
        {name: {$regex: q, $options: "i"}},
        {model: {$regex: q, $options: "i"}},
        {version: {$regex: q, $options: "i"}},
      ];
    }
    if (status) cond.status = status;
    if (category) cond.category = category;
    if (manufacturer_id) cond.manufacturer_id = manufacturer_id;

    const vehicles = await Vehicle.find(cond)
      .populate("manufacturer_id", "name address")
      .populate("options")
      .populate("accessories")
      .populate("promotions")
      .sort({createdAt: -1});

    return success(res, "Vehicle list retrieved successfully", vehicles);
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

    return success(res, "Vehicle detail retrieved successfully", vehicle);
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

    return success(res, "Vehicle updated successfully", vehicle);
  } catch (err) {
    next(err);
  }
}

// Delete vehicle (EVM Staff, Admin only)
export async function deleteVehicle(req, res, next) {
  try {
    const vehicle = await Vehicle.findByIdAndDelete(req.params.id);
    if (!vehicle) return errorRes(res, "Vehicle not found", 404);

    return success(res, "Vehicle deleted successfully", {id: vehicle._id});
  } catch (err) {
    next(err);
  }
}
