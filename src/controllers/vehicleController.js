import Vehicle from "../models/Vehicle.js";
import Option from "../models/Option.js";
import Accessory from "../models/Accessory.js";
import Promotion from "../models/Promotion.js";
import {success, created, error as errorRes} from "../utils/response.js";
import {paginate} from "../utils/pagination.js";
import {VehicleMessage} from "../utils/MessageRes.js";
import fetch from "node-fetch";

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

      let uploadedImages = [];
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          uploadedImages.push(file.path);
        }
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

      const stocks = [];
      if (stock && manufacturer_id) {
        stocks.push({
          owner_type: "manufacturer",
          owner_id: manufacturer_id,
          quantity: stock,
        });
      }

      validVehicles.push({
        sku,
        name,
        model,
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
        stocks,
        warranty_years,
        color_options,
        images: uploadedImages,
        description,
        options,
        accessories,
        promotions,
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
    // ----- Build filters -----
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

    // ----- Paginate -----
    const result = await paginate(
      Vehicle,
      req,
      ["name", "model", "version"],
      cond
    );

    // ----- Populate after paginate -----
    const dataWithPopulate = await Vehicle.populate(result.data, [
      {path: "manufacturer_id", select: "name address"},
      {path: "options"},
      {path: "accessories"},
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
    if (!vehicle) return res.status(404).json({message: "Vehicle not found"});

    // ----- 1. Xóa ảnh cũ nếu có -----
    const {imagesToRemove} = req.body; // mảng URL hoặc public_id
    if (imagesToRemove && imagesToRemove.length > 0) {
      // Xóa trên Cloudinary
      // await deleteImagesFromCloudinary(imagesToRemove);

      // Xóa khỏi vehicle.images
      vehicle.images = vehicle.images.filter(
        (img) => !imagesToRemove.includes(img)
      );
    }

    // ----- 2. Upload ảnh mới nếu có -----
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        vehicle.images.push(file.path); // thêm ảnh mới
      }
    }

    // ----- 3. Update các field khác -----
    Object.assign(vehicle, req.body);
    await vehicle.save();

    return res.json({success: true, vehicle});
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

// Tạo helper summarize
function summarizeCar(car) {
  return `Name: ${car.name} ${car.model || ""}
  Price: ${car.price} VND
  Battery: ${car.battery_type || "N/A"}, ${car.battery_capacity || "N/A"} kWh
Range: ${car.range_km || "N/A"} km
Motor: ${car.motor_power || "N/A"} kW
Top speed: ${car.top_speed || "N/A"} km/h
Acceleration 0-100 km/h: ${car.acceleration || "N/A"} s
Safety features: ${car.safety_features?.join(", ") || "N/A"}
Interior: ${car.interior_features?.map((f) => f.name).join(", ") || "N/A"}
OTA update: ${car.ota_update ? "Yes" : "No"}
Warranty: ${car.warranty_years || "N/A"} years
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

Phân tích ưu điểm, nhược điểm và gợi ý lựa chọn.
`;

    // Gọi Grok AI Free
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROK_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "grok-3",
        messages: [{role: "user", content: prompt}],
      }),
    });

    const data = await response.json();

    res.json({
      car1: summarizeCar(car1),
      car2: summarizeCar(car2),
      data,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({error: err.message});
  }
}
