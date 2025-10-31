import mongoose from "mongoose";

const stockSchema = new mongoose.Schema(
  {
    owner_type: {
      type: String,
      enum: ["manufacturer", "dealer"],
      required: true,
    },
    owner_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "stocks.owner_type",
    },
    color: { type: String, required: true }, // ✅ Required for tracking
    quantity: { type: Number, default: 0 }, // Tổng số lượng nhập vào

    // ========== TRACKING FIELDS (Solution 2) ==========
    source_request_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RequestVehicle",
      default: null,
      // RequestVehicle nào tạo ra lô này (null = lô cũ/manual)
    },

    delivered_at: {
      type: Date,
      default: Date.now,
      // Ngày xe về (để sort FIFO)
    },

    unit_cost: {
      type: Number,
      default: 0,
      // Giá vốn khi nhập
    },

    sold_quantity: {
      type: Number,
      default: 0,
      // Số lượng đã bán từ lô này
    },

    remaining_quantity: {
      type: Number,
      // Số lượng còn lại = quantity - sold_quantity
    },

    status: {
      type: String,
      enum: ["active", "depleted", "reserved"],
      default: "active",
    },

    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    notes: String,
  },
  {
    timestamps: true, // createdAt, updatedAt
    _id: true, // ✅ Đảm bảo mỗi stock entry có _id riêng
  }
);

const vehicleSchema = new mongoose.Schema(
  {
    // Thông tin cơ bản
    name: { type: String, required: true }, // VD: VinFast VF3
    model: { type: String }, // VD: 2025 Premium
    category: { type: String, enum: ["car", "motorbike"], required: true },
    manufacturer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Manufacturer",
      required: true,
    },

    // SKU & quản lý phiên bản, hoạt động
    sku: { type: String, unique: true, index: true },
    version: { type: String }, // Eco, Plus, Pro...
    release_status: {
      type: String,
      enum: ["coming_soon", "available", "discontinued"],
      default: "available",
    },
    release_date: { type: Date },
    status: { type: String, enum: ["active", "inactive"], default: "active" },

    // Giá bán
    price: { type: Number, required: true },
    on_road_price: { type: Number },

    // Thông số pin & vận hành
    battery_type: { type: String, enum: ["LFP", "NMC", "Li-ion", "other"] },
    battery_capacity: { type: Number }, // kWh
    range_km: { type: Number },
    wltp_range_km: { type: Number },
    charging_fast: { type: Number }, // phút (10%-70%)
    charging_slow: { type: Number }, // giờ (AC)
    charging_port_type: {
      type: String,
      enum: ["CCS2", "Type2", "CHAdeMO", "Tesla", "Other"],
    },
    motor_power: { type: Number }, // kW
    top_speed: { type: Number },
    acceleration: { type: Number }, // 0–100 km/h (giây)
    drivetrain: { type: String, enum: ["FWD", "RWD", "AWD"] },

    // Kích thước & tải trọng
    dimensions: {
      length: Number,
      width: Number,
      height: Number,
      wheelbase: Number,
      ground_clearance: Number,
    },
    weight: { type: Number },
    payload: { type: Number },
    seating_capacity: { type: Number },
    tire_size: { type: String },
    trunk_type: { type: String, enum: ["manual", "electric", "auto"] },

    // Trang bị & tính năng
    safety_features: [{ type: String }],
    interior_features: [
      {
        name: { type: String, required: true },
        description: { type: String },
      },
    ],
    driving_modes: [{ type: String }],
    software_version: { type: String },
    ota_update: { type: Boolean, default: true },

    // Thông tin thương mại & quản lý
    stocks: [stockSchema],
    warranty_years: { type: Number },
    battery_warranty_years: { type: Number },
    color_options: [{ type: String }],
    images: [{ type: String }],
    description: { type: String },

    //Delete
    is_deleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("Vehicle", vehicleSchema);
