import Vehicle from "../models/Vehicle.js";
import Promotion from "../models/Promotion.js";
import DealerManufacturerDebt from "../models/DealerManufacturerDebt.js";
import {success, created, error as errorRes} from "../utils/response.js";
import {paginate} from "../utils/pagination.js";
import {VehicleMessage} from "../utils/MessageRes.js";
import fetch from "node-fetch";
import {cleanEmpty} from "../utils/cleanEmpty.js";
import {emitVehicleDistribution} from "../config/socket.js";

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
        model,
        category,
        manufacturer_id,
        price,

        version,
        release_status,
        release_date,
        status,

        on_road_price,
        battery_type,
        battery_capacity,
        range_km,
        wltp_range_km,
        charging_fast,
        charging_slow,
        charging_port_type,
        motor_power,
        top_speed,
        acceleration,
        drivetrain,

        dimensions,
        weight,
        payload,
        seating_capacity,
        tire_size,
        trunk_type,

        safety_features,
        interior_features,
        driving_modes,
        software_version,
        ota_update,

        stock,
        warranty_years,
        battery_warranty_years,
        color_options,
        description,
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

      let uploadedImages = [];
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          uploadedImages.push(file.path);
        }
      }

      // Interior_features phải đúng định dạng { name, description }
      let formattedInteriorFeatures = [];
      if (Array.isArray(interior_features)) {
        formattedInteriorFeatures = interior_features
          .filter((f) => f && f.name)
          .map((f) => ({
            name: f.name,
            description: f.description || "",
          }));
      }

      const stocks = [];
      if (stock && manufacturer_id) {
        stocks.push({
          owner_type: "manufacturer",
          owner_id: manufacturer_id,
          quantity: stock,
        });
      }

      validVehicles.push(
        cleanEmpty({
          sku,
          name,
          model,
          category,
          manufacturer_id,
          price,

          version,
          release_status,
          release_date,
          status,

          on_road_price,
          battery_type,
          battery_capacity,
          range_km,
          wltp_range_km,
          charging_fast,
          charging_slow,
          charging_port_type,
          motor_power,
          top_speed,
          acceleration,
          drivetrain,

          dimensions,
          weight,
          payload,
          seating_capacity,
          tire_size,
          trunk_type,

          safety_features,
          interior_features: formattedInteriorFeatures,
          driving_modes,
          software_version,
          ota_update,

          stocks,
          warranty_years,
          battery_warranty_years,
          color_options,
          images: uploadedImages,
          description,
          promotions,
        })
      );
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
    const cond = {};
    if (req.query.category) cond.category = req.query.category;
    if (req.query.status) cond.status = req.query.status;
    if (req.query.manufacturer_id)
      cond.manufacturer_id = req.query.manufacturer_id;

    if (req.query["price[min]"] || req.query["price[max]"]) {
      cond.price = {};
      if (req.query["price[min]"])
        cond.price.$gte = Number(req.query["price[min]"]);
      if (req.query["price[max]"])
        cond.price.$lte = Number(req.query["price[max]"]);
    }

    if (req.query["range_km[min]"] || req.query["range_km[max]"]) {
      cond.range_km = {};
      if (req.query["range_km[min]"])
        cond.range_km.$gte = Number(req.query["range_km[min]"]);
      if (req.query["range_km[max]"])
        cond.range_km.$lte = Number(req.query["range_km[max]"]);
    }

    if (req.query.battery_type) cond.battery_type = req.query.battery_type;

    if (req.query.color_options)
      cond.color_options = {$in: req.query.color_options.split(",")};

    const result = await paginate(
      Vehicle,
      req,
      ["name", "model", "version"],
      cond
    );

    const dataWithPopulate = await Vehicle.populate(result.data, [
      {path: "manufacturer_id", select: "name address"},
      {path: "promotions"},
    ]);

    return res.json({
      success: true,
      message: VehicleMessage.LIST_SUCCESS,
      ...result,
      data: dataWithPopulate,
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
      .populate("promotions");

    if (!vehicle) return errorRes(res, "Vehicle not found", 404);

    return success(res, VehicleMessage.DETAIL_SUCCESS, vehicle);
  } catch (err) {
    next(err);
  }
}

// Update vehicle
export async function updateVehicle(req, res, next) {
  try {
    req.body = cleanEmpty(req.body);
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({message: "Vehicle not found"});

    const {imagesToRemove} = req.body;
    if (imagesToRemove && imagesToRemove.length > 0) {
      vehicle.images = vehicle.images.filter(
        (img) => !imagesToRemove.includes(img)
      );
    }

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        vehicle.images.push(file.path);
      }
    }

    Object.assign(vehicle, req.body);
    await vehicle.save();

    return res.json({success: true, vehicle});
  } catch (err) {
    next(err);
  }
}

// Soft delete vehicle
export async function deleteVehicle(req, res, next) {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return errorRes(res, "Vehicle not found", 404);

    if (vehicle.status === "inactive") {
      return errorRes(res, "Vehicle already inactive", 400);
    }

    vehicle.status = "inactive";
    await vehicle.save();

    return success(res, VehicleMessage.DELETE_SUCCESS, {id: vehicle._id});
  } catch (err) {
    next(err);
  }
}

// Helper summarize
function summarizeCar(car) {
  return `
      Name: ${car.name} ${car.model || ""}
      Category: ${car.category || "N/A"}
      Version: ${car.version || "N/A"}
      
      Price: ${car.price?.toLocaleString() || "N/A"} VND
      Battery: ${car.battery_type || "N/A"}, ${
    car.battery_capacity || "N/A"
  } kWh
      Range: ${car.range_km || "N/A"} km
      Charging: Fast ${car.charging_fast || "N/A"} mins, Slow ${
    car.charging_slow || "N/A"
  } hrs
      Motor: ${car.motor_power || "N/A"} kW, Drivetrain: ${
    car.drivetrain || "N/A"
  }
      Top speed: ${car.top_speed || "N/A"} km/h
      Accel 0-100: ${car.acceleration || "N/A"} s
      
      Dimensions (mm): ${car.dimensions?.length || "?"} x ${
    car.dimensions?.width || "?"
  } x ${car.dimensions?.height || "?"}
      Wheelbase: ${car.dimensions?.wheelbase || "N/A"} mm
      Ground clearance: ${car.dimensions?.ground_clearance || "N/A"} mm
      Seating: ${car.seating_capacity || "N/A"}
      
      Safety: ${car.safety_features?.join(", ") || "N/A"}
      Driving modes: ${car.driving_modes?.join(", ") || "N/A"}
      OTA update: ${car.ota_update ? "Yes" : "No"}
      
      Warranty: ${car.warranty_years || "N/A"} yrs (Battery: ${
    car.battery_warranty_years || "N/A"
  } yrs)
      `;
}

export async function compareCars(req, res) {
  try {
    const {id1, id2} = req.params;

    const [car1, car2] = await Promise.all([
      Vehicle.findById(id1),
      Vehicle.findById(id2),
    ]);

    if (!car1 || !car2) {
      return res.status(404).json({message: "Không tìm thấy 1 hoặc cả 2 xe"});
    }

    const prompt = `
      So sánh hai chiếc xe sau dựa trên trải nghiệm đời sống người dùng:
      - Xe A: ${summarizeCar(car1)}
      - Xe B: ${summarizeCar(car2)}

      Hãy phân tích chi tiết cho từng xe:
      1. Ưu điểm
      2. Nhược điểm
      3. Nhu cầu phát triển trong tương lai
      4. Gợi ý lựa chọn phù hợp cho khách hàng.
      `;

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [{role: "user", content: prompt}],
          temperature: 0.7,
        }),
      }
    );

    const data = await response.json();

    res.json({
      car1: summarizeCar(car1),
      car2: summarizeCar(car2),
      analysis: data?.choices?.[0]?.message?.content || "Không có phản hồi",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({error: err.message});
  }
}

// Distribute vehicles to dealer (Manufacturer/EVM Staff/Admin only)
export async function distributeVehicleToDealer(req, res, next) {
  try {
    const {vehicle_id, dealership_id, quantity, notes} = req.body;

    // Validate required fields
    if (!vehicle_id || !dealership_id || !quantity) {
      return errorRes(
        res,
        "Missing required fields: vehicle_id, dealership_id, quantity",
        400
      );
    }

    if (quantity <= 0) {
      return errorRes(res, "Quantity must be greater than 0", 400);
    }

    // Find vehicle
    const vehicle = await Vehicle.findById(vehicle_id);
    if (!vehicle) {
      return errorRes(res, "Vehicle not found", 404);
    }

    // Check manufacturer stock
    const manufacturerStock = vehicle.stocks.find(
      (s) => s.owner_type === "manufacturer"
    );

    if (!manufacturerStock) {
      return errorRes(
        res,
        "No manufacturer stock available for this vehicle",
        400
      );
    }

    if (manufacturerStock.quantity < quantity) {
      return errorRes(
        res,
        `Insufficient manufacturer stock. Available: ${manufacturerStock.quantity}, Requested: ${quantity}`,
        400
      );
    }

    // Update manufacturer stock
    manufacturerStock.quantity -= quantity;

    // Update or create dealer stock
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
        quantity: quantity,
      });
    }

    await vehicle.save();

    // Create or update debt
    const total_amount = vehicle.price * quantity;
    let debt = await DealerManufacturerDebt.findOne({
      dealership_id: dealership_id,
      manufacturer_id: vehicle.manufacturer_id,
    });

    if (debt) {
      debt.total_amount += total_amount;
      debt.remaining_amount += total_amount;
      debt.status = "open";
      await debt.save();
    } else {
      debt = await DealerManufacturerDebt.create({
        dealership_id: dealership_id,
        manufacturer_id: vehicle.manufacturer_id,
        total_amount,
        paid_amount: 0,
        remaining_amount: total_amount,
        status: "open",
        notes: notes || `Vehicle distribution: ${vehicle.name} x${quantity}`,
      });
    }

    // Emit socket notification for vehicle distribution
    if (req.app.get("io")) {
      emitVehicleDistribution(req.app.get("io"), {
        dealershipId: dealership_id,
        manufacturerId: vehicle.manufacturer_id,
        vehicle: {
          id: vehicle._id,
          name: vehicle.name,
          sku: vehicle.sku,
          price: vehicle.price,
        },
        quantity,
        totalAmount: total_amount,
      });
    }

    return success(res, "Vehicle distributed successfully", {
      vehicle: {
        id: vehicle._id,
        name: vehicle.name,
        sku: vehicle.sku,
      },
      dealership_id,
      quantity,
      total_amount,
      debt_id: debt._id,
      remaining_manufacturer_stock: manufacturerStock.quantity,
      dealer_stock: dealerStock ? dealerStock.quantity : quantity,
    });
  } catch (err) {
    next(err);
  }
}
