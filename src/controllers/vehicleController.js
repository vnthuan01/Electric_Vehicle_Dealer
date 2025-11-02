import Vehicle from "../models/Vehicle.js";
import DealerManufacturerDebt from "../models/DealerManufacturerDebt.js";
import {success, created, error as errorRes} from "../utils/response.js";
import {paginate} from "../utils/pagination.js";
import {
  DealerMessage,
  ManufacturerMessage,
  VehicleMessage,
} from "../utils/MessageRes.js";
import fetch from "node-fetch";
import {cleanEmpty} from "../utils/cleanEmpty.js";
import {emitVehicleDistribution} from "../config/socket.js";
import User from "../models/User.js";
import Dealership from "../models/Dealership.js";
import Manufacturer from "../models/Manufacturer.js";
import {capitalizeVietnamese} from "../utils/validateWord.js";
import mongoose from "mongoose";

// Create one or multiple vehicles (EVM Staff, Admin only)
export async function createVehicle(req, res, next) {
  try {
    const vehiclesData = Array.isArray(req.body) ? req.body : [req.body];
    const user = await User.findById(req.user.id);
    const manufacturer_id = String(user.manufacturer_id);
    console.log(manufacturer_id);
    const errors = [];
    const validVehicles = [];

    for (const v of vehiclesData) {
      const {
        sku,
        name,
        model,
        category,
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

        warranty_years,
        battery_warranty_years,
        color_options,
        description,
      } = v;

      // Basic validation
      if (!sku || !name || !category || !price) {
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

      // Upload images
      let uploadedImages = [];
      if (req.files && req.files.length > 0) {
        uploadedImages = req.files.map((file) => file.path);
      }

      // Format interior_features
      let formattedInteriorFeatures = [];
      if (Array.isArray(interior_features)) {
        formattedInteriorFeatures = interior_features
          .filter((f) => f && f.name)
          .map((f) => ({name: f.name, description: f.description || ""}));
      }

      // Parse stocks_by_color from multipart/form-data JSON string
      let stocks_by_color = [];
      if (req.body.stocks_by_color) {
        try {
          stocks_by_color = JSON.parse(req.body.stocks_by_color);
        } catch (err) {
          stocks_by_color = [];
        }
      }

      const stocks = stocks_by_color.map((sc) => ({
        owner_type: "manufacturer",
        owner_id: manufacturer_id,
        color: sc.color,
        quantity: sc.quantity || 0,
        sold_quantity: 0,
        remaining_quantity: sc.quantity || 0,
        status: "active",
        delivered_at: new Date(),
        unit_cost: sc.unit_cost || 0,
        created_by: req.user.id,
      }));

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
    const vehicle = await Vehicle.findById(req.params.id).populate(
      "manufacturer_id",
      "name address"
    );

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

    // --- Remove images if requested ---
    const {imagesToRemove} = req.body;
    if (imagesToRemove && imagesToRemove.length > 0) {
      vehicle.images = vehicle.images.filter(
        (img) => !imagesToRemove.includes(img)
      );
    }

    // --- Add uploaded images ---
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        vehicle.images.push(file.path);
      }
    }

    // --- Parse stocks_by_color JSON string if needed ---
    let stocks_by_color = req.body.stocks_by_color;
    if (typeof stocks_by_color === "string") {
      try {
        stocks_by_color = JSON.parse(stocks_by_color);
      } catch (err) {
        stocks_by_color = [];
      }
    }

    // --- Upsert manufacturer stocks by color ---
    if (Array.isArray(stocks_by_color)) {
      for (const sc of stocks_by_color) {
        if (!sc || !sc.color) continue;
        const qty = Number(sc.quantity || 0);
        const col = sc.color;
        const unitCost = Number(sc.unit_cost || 0);

        // Tìm stock manufacturer đã tồn tại với color này
        const idx = vehicle.stocks?.findIndex(
          (s) => s.owner_type === "manufacturer" && s.color === col
        );

        if (idx >= 0) {
          // Cập nhật quantity và remaining_quantity
          const oldQuantity = vehicle.stocks[idx].quantity || 0;
          const oldSold = vehicle.stocks[idx].sold_quantity || 0;
          vehicle.stocks[idx].quantity = qty;

          // Tính remaining dựa trên quantity mới và sold cũ
          vehicle.stocks[idx].remaining_quantity = Math.max(0, qty - oldSold);

          // Update unit_cost if provided
          if (unitCost > 0) {
            vehicle.stocks[idx].unit_cost = unitCost;
          }

          // Update status
          if (vehicle.stocks[idx].remaining_quantity === 0) {
            vehicle.stocks[idx].status = "depleted";
          } else if (vehicle.stocks[idx].status === "depleted") {
            vehicle.stocks[idx].status = "active";
          }
        } else {
          // Thêm mới stock manufacturer
          vehicle.stocks.push({
            owner_type: "manufacturer",
            owner_id: vehicle.manufacturer_id,
            color: col,
            quantity: qty,
            sold_quantity: 0,
            remaining_quantity: qty,
            status: qty > 0 ? "active" : "depleted",
            delivered_at: new Date(),
            unit_cost: unitCost,
            created_by: req.user.id,
          });
        }
      }
    }

    // --- Update other fields ---
    const skipFields = ["stocks_by_color", "imagesToRemove"];
    for (const key of Object.keys(req.body)) {
      if (!skipFields.includes(key)) {
        vehicle[key] = req.body[key];
      }
    }

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
    (vehicle.is_deleted = true), (vehicle.status = "inactive");
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
    const {vehicle_id, dealership_id, quantity, notes, color} = req.body;
    console.log(req.body);
    // Validate required fields
    if (!vehicle_id || !dealership_id || !quantity || !color) {
      return errorRes(
        res,
        VehicleMessage.MISSING_REQUIRED_FIELDS_DISTRIBUTE,
        400
      );
    }

    if (quantity <= 0) {
      return errorRes(res, VehicleMessage.QUANTITY_MUST_BE_GREATER_THAN_0, 400);
    }

    const dealership = await Dealership.findById({_id: dealership_id});

    if (!dealership) {
      return errorRes(res, DealerMessage.NOT_FOUND);
    }

    // Find vehicle
    const vehicle = await Vehicle.findOne({
      _id: vehicle_id,
      status: "active",
      is_deleted: false,
    });

    if (!vehicle || vehicle.is_deleted || vehicle.status !== "active") {
      return errorRes(res, DealerMessage.VEHICLE_NOT_FOUND, 404);
    }

    const normalizedColor = capitalizeVietnamese(color || "");
    // Check manufacturer stock (use remaining_quantity if available)
    const manufacturerStock = vehicle.stocks.find((s) => {
      if (s.owner_type !== "manufacturer") return false;
      if (!normalizedColor) return true;

      const stockColor = s.color?.trim() || "";
      return stockColor === normalizedColor;
    });

    if (!manufacturerStock) {
      return errorRes(
        res,
        ManufacturerMessage.NO_STOCK_AVAILABLE,
        400,
        "Stock color is not available"
      );
    }

    // Check available quantity (remaining_quantity if available, otherwise quantity)
    const availableQuantity =
      manufacturerStock.remaining_quantity !== undefined
        ? manufacturerStock.remaining_quantity
        : manufacturerStock.quantity || 0;

    if (availableQuantity < quantity) {
      return errorRes(
        res,
        `Insufficient manufacturer stock. Available: ${availableQuantity}, Requested: ${quantity}`,
        400
      );
    }

    // Update manufacturer stock (remaining_quantity)
    if (manufacturerStock.remaining_quantity !== undefined) {
      manufacturerStock.remaining_quantity = Math.max(
        0,
        manufacturerStock.remaining_quantity - quantity
      );

      // Update status nếu hết hàng
      if (manufacturerStock.remaining_quantity === 0) {
        manufacturerStock.status = "depleted";
      }
    } else {
      // Backward compatible: old stock không có remaining_quantity
      manufacturerStock.quantity = Math.max(
        0,
        manufacturerStock.quantity - quantity
      );
    }

    // Update or create dealer stock
    let dealerStock = vehicle.stocks.find(
      (s) =>
        s.owner_type === "dealer" &&
        s.owner_id.toString() === dealership_id.toString() &&
        s.color === normalizedColor
    );

    if (dealerStock) {
      // Cập nhật dealer stock
      const oldQuantity = dealerStock.quantity || 0;
      const oldSold = dealerStock.sold_quantity || 0;
      dealerStock.quantity = oldQuantity + quantity;
      dealerStock.remaining_quantity =
        (dealerStock.remaining_quantity || oldQuantity - oldSold) + quantity;

      // Update status
      if (
        dealerStock.remaining_quantity > 0 &&
        dealerStock.status === "depleted"
      ) {
        dealerStock.status = "active";
      }
    } else {
      // Thêm mới dealer stock
      vehicle.stocks.push({
        owner_type: "dealer",
        owner_id: dealership_id,
        quantity: quantity,
        sold_quantity: 0,
        remaining_quantity: quantity,
        status: "active",
        color: normalizedColor,
        delivered_at: new Date(),
        unit_cost: vehicle.price,
        created_by: req.user.id,
        notes: notes || "Distribution",
      });
      dealerStock = vehicle.stocks[vehicle.stocks.length - 1];
    }

    await vehicle.save();

    // Create or update debt with item detail
    const total_amount = vehicle.price * quantity;
    let debt = await DealerManufacturerDebt.findOne({
      dealership_id: dealership_id,
      manufacturer_id: vehicle.manufacturer_id,
    });

    if (debt) {
      debt.total_amount += total_amount;
      debt.remaining_amount += total_amount;
      debt.status = "open";
      debt.items = debt.items || [];
      debt.items.push({
        request_id: null,
        vehicle_id: vehicle._id,
        vehicle_name: vehicle.name,
        color: color.trim(),
        unit_price: vehicle.price,
        quantity,
        amount: total_amount,
        delivered_at: new Date(),
        notes: notes || "Distribution",
      });
      await debt.save();
    } else {
      debt = await DealerManufacturerDebt.create({
        dealership_id: dealership_id,
        manufacturer_id: vehicle.manufacturer_id,
        total_amount,
        paid_amount: 0,
        remaining_amount: total_amount,
        status: "open",
        items: [
          {
            request_id: null,
            vehicle_id: vehicle._id,
            vehicle_name: vehicle.name,
            color: normalizedColor,
            unit_price: vehicle.price,
            quantity,
            amount: total_amount,
            delivered_at: new Date(),
            notes: notes || "Distribution",
          },
        ],
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
          color: normalizedColor,
          price: vehicle.price,
        },
        quantity,
        totalAmount: total_amount,
      });
    }

    return success(res, VehicleMessage.VEHICLE_DISTRIBUTED_SUCCESS, {
      vehicle: {
        id: vehicle._id,
        name: vehicle.name,
        sku: vehicle.sku,
        color: normalizedColor,
      },
      dealership_id,
      quantity,
      total_amount,
      debt_id: debt._id,
      remaining_manufacturer_stock:
        manufacturerStock.remaining_quantity !== undefined
          ? manufacturerStock.remaining_quantity
          : manufacturerStock.quantity,
      dealer_stock: dealerStock
        ? dealerStock.remaining_quantity !== undefined
          ? dealerStock.remaining_quantity
          : dealerStock.quantity
        : quantity,
    });
  } catch (err) {
    next(err);
  }
}

// Get vehicle stock by dealership_id (for dealer users)
export async function getVehicleStock(req, res, next) {
  try {
    const user = await User.findById(req.user.id);

    if (!user.dealership_id) {
      return errorRes(res, "User không thuộc đại lý nào", 403);
    }

    const dealership_id = user.dealership_id;
    const {vehicle_id, color, status} = req.query;

    // Build query
    const vehicleQuery = {};
    if (vehicle_id) vehicleQuery._id = vehicle_id;
    if (req.query.category) vehicleQuery.category = req.query.category;
    if (req.query.status) vehicleQuery.status = req.query.status;
    if (req.query.manufacturer_id)
      vehicleQuery.manufacturer_id = req.query.manufacturer_id;

    // Get vehicles (must include stocks field)
    // If no vehicle_id specified, use aggregation to filter vehicles with dealer stocks
    let vehicles;
    if (!vehicle_id) {
      // Use aggregation to only get vehicles that have stocks for this dealership
      const pipeline = [
        {$match: vehicleQuery},
        {
          $match: {
            "stocks.owner_type": "dealer",
            "stocks.owner_id": new mongoose.Types.ObjectId(dealership_id),
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            model: 1,
            category: 1,
            sku: 1,
            manufacturer_id: 1,
            price: 1,
            images: 1,
            color_options: 1,
            stocks: 1,
          },
        },
      ];
      vehicles = await Vehicle.aggregate(pipeline);
      // Populate manufacturer_id manually after aggregation
      const manufacturerIds = [
        ...new Set(vehicles.map((v) => v.manufacturer_id).filter((id) => id)),
      ];
      const manufacturers = await Manufacturer.find({
        _id: {$in: manufacturerIds},
      })
        .select("name code")
        .lean();
      const manufacturerMap = new Map(
        manufacturers.map((m) => [String(m._id), m])
      );
      vehicles = vehicles.map((v) => ({
        ...v,
        manufacturer_id: v.manufacturer_id
          ? manufacturerMap.get(String(v.manufacturer_id)) || v.manufacturer_id
          : null,
      }));
    } else {
      // When vehicle_id is specified, use regular find
      vehicles = await Vehicle.find(vehicleQuery)
        .select(
          "_id name model category sku manufacturer_id price images color_options stocks"
        )
        .populate("manufacturer_id", "name code")
        .lean();
    }

    // Filter and format stocks by dealership
    const stockResults = [];

    for (const vehicle of vehicles) {
      // Filter stocks for this dealership
      let dealerStocks =
        vehicle.stocks?.filter(
          (s) =>
            s &&
            s.owner_type === "dealer" &&
            s.owner_id &&
            s.owner_id.toString() === dealership_id.toString()
        ) || [];

      // Filter by color if provided
      if (color) {
        dealerStocks = dealerStocks.filter(
          (s) => s.color && s.color.toLowerCase() === color.toLowerCase()
        );
      }

      // Filter by status if provided
      if (status) {
        dealerStocks = dealerStocks.filter(
          (s) => s.status === status || (!s.status && status === "active")
        );
      }

      // Calculate totals for this vehicle
      const totalQuantity = dealerStocks.reduce(
        (sum, s) => sum + (s.quantity || 0),
        0
      );
      const totalSold = dealerStocks.reduce(
        (sum, s) => sum + (s.sold_quantity || 0),
        0
      );
      const totalRemaining = dealerStocks.reduce(
        (sum, s) =>
          sum +
          (s.remaining_quantity !== undefined
            ? s.remaining_quantity
            : s.quantity - (s.sold_quantity || 0)),
        0
      );

      // Format stock details by color
      const stocksByColor = {};
      for (const stock of dealerStocks) {
        const stockColor = stock.color || "Unknown";
        if (!stocksByColor[stockColor]) {
          stocksByColor[stockColor] = {
            color: stockColor,
            total_quantity: 0,
            total_sold: 0,
            total_remaining: 0,
            batches: [],
          };
        }

        const remaining =
          stock.remaining_quantity !== undefined
            ? stock.remaining_quantity
            : stock.quantity - (stock.sold_quantity || 0);

        stocksByColor[stockColor].total_quantity += stock.quantity || 0;
        stocksByColor[stockColor].total_sold += stock.sold_quantity || 0;
        stocksByColor[stockColor].total_remaining += remaining;

        stocksByColor[stockColor].batches.push({
          stock_entry_id: stock._id,
          quantity: stock.quantity || 0,
          sold_quantity: stock.sold_quantity || 0,
          remaining_quantity: remaining,
          status: stock.status || "active",
          delivered_at: stock.delivered_at || stock.createdAt,
          unit_cost: stock.unit_cost || 0,
          source_request_id: stock.source_request_id || null,
          notes: stock.notes || null,
        });
      }

      // Only include vehicles that have dealer stocks
      if (dealerStocks.length > 0 || vehicle_id) {
        stockResults.push({
          vehicle: {
            id: vehicle._id,
            name: vehicle.name,
            model: vehicle.model,
            category: vehicle.category,
            sku: vehicle.sku,
            manufacturer: vehicle.manufacturer_id,
            price: vehicle.price,
            images: vehicle.images || [],
            color_options: vehicle.color_options || [],
          },
          summary: {
            total_quantity: totalQuantity,
            total_sold: totalSold,
            total_remaining: totalRemaining,
            batches_count: dealerStocks.length,
          },
          stocks_by_color: Object.values(stocksByColor),
        });
      }
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const totalRecords = stockResults.length;
    const paginatedResults = stockResults.slice(skip, skip + limit);

    return success(res, "Lấy thông tin tồn kho thành công", {
      data: paginatedResults,
      pagination: {
        page,
        limit,
        total: totalRecords,
        totalPages: Math.ceil(totalRecords / limit),
      },
      dealership_id: dealership_id.toString(),
    });
  } catch (err) {
    next(err);
  }
}
