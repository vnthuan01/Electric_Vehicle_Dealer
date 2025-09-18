import mongoose from "mongoose";

const vehicleSchema = new mongoose.Schema(
  {
    // Thông tin cơ bản
    name: {type: String, required: true}, // VD: VinFast VF3
    model: {type: String}, // VD: 2025 Premium
    category: {type: String, enum: ["car", "motorbike"], required: true}, // loại xe
    manufacturer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Manufacturer",
    },

    // SKU & quản lý phiên bản
    sku: {type: String, unique: true, index: true}, // SKU riêng từng cấu hình
    version: {type: String}, // Eco, Plus, Pro...
    status: {type: String, enum: ["active", "inactive"], default: "active"},

    // Giá bán
    price: {type: Number, required: true}, // giá niêm yết
    on_road_price: {type: Number}, // giá lăn bánh tạm tính
    price_history: [
      {
        price: Number,
        updated_at: {type: Date, default: Date.now},
      },
    ],

    // Thông số pin & vận hành
    battery_type: {type: String, enum: ["LFP", "NMC", "other"]}, // loại pin
    battery_capacity: {type: Number}, // kWh
    range_km: {type: Number}, // quãng đường tối đa
    charging_fast: {type: Number}, // phút (10%-70%)
    charging_slow: {type: Number}, // giờ (sạc thường)
    motor_power: {type: Number}, // kW
    top_speed: {type: Number}, // km/h
    acceleration: {type: Number}, // giây 0-100km/h

    // Kích thước & tải trọng
    dimensions: {
      length: Number,
      width: Number,
      height: Number,
      wheelbase: Number, // chiều dài cơ sở
      ground_clearance: Number, // khoảng sáng gầm xe
    },
    weight: {type: Number}, // trọng lượng xe
    payload: {type: Number}, // tải trọng tối đa

    // Trang bị & tính năng
    safety_features: [{type: String}], // ABS, túi khí, radar...
    interior_features: [{type: String}], // ghế da, màn hình, điều hòa...
    driving_modes: [{type: String}], // Eco, Sport, Normal
    software_version: {type: String}, // bản phần mềm hiện tại
    ota_update: {type: Boolean, default: true}, // hỗ trợ FOTA/SOTA

    // Thông tin thương mại & quản lý
    stock: {type: Number, default: 0},
    warranty_years: {type: Number},
    color_options: [{type: String}],
    images: [{type: String}],
    description: {type: String},

    // Options & phụ kiện
    options: [{type: mongoose.Schema.Types.ObjectId, ref: "Option"}],
    accessories: [{type: mongoose.Schema.Types.ObjectId, ref: "Accessory"}],
    promotions: [{type: mongoose.Schema.Types.ObjectId, ref: "Promotion"}],
  },
  {timestamps: true}
);

export default mongoose.model("Vehicle", vehicleSchema);
