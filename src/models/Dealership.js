/* 
  Model này dùng để lưu trữ:
  - Thông tin cơ bản của đại lý
  - Thông tin hợp đồng & pháp lý kinh doanh
  - Trạng thái hoạt động
*/
import mongoose from "mongoose";

const dealershipSchema = new mongoose.Schema(
  {
    // === THÔNG TIN CƠ BẢN ===
    code: { type: String, required: true, unique: true, index: true }, // Mã đại lý
    company_name: { type: String, required: true, index: true }, // Tên đại lý
    business_license: { type: String, required: true }, // Giấy phép kinh doanh (số giấy phép)
    tax_code: { type: String, required: true, unique: true }, // Mã số thuế
    legal_representative: { type: String, required: true }, // Đại diện pháp lý

    // === QUAN HỆ VỚI HÃNG XE ===
    manufacturer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Manufacturer",
      required: true,
      index: true,
    },
    dealer_level: {
      type: String,
      enum: ["1S", "2S", "3S"], // 1S: Bán hàng; 2S: Bán hàng + Dịch vụ; 3S: Bán hàng + Dịch vụ + Phụ tùng
      default: "3S",
    },
    product_distribution: {
      type: String,
      enum: ["Ô tô", "Xe máy điện", "Ô tô và Xe máy điện"],
      default: "Ô tô và Xe máy điện",
    },

    // === HỢP ĐỒNG & ỦY QUYỀN ===
    contract: {
      contract_number: { type: String, required: true, unique: true }, // Số hợp đồng
      signed_date: { type: Date, required: true }, // Ngày ký hợp đồng
      expiry_date: { type: Date, required: true }, // Ngày hết hạn hợp đồng
      territory: { type: String, required: true }, // Khu vực kinh doanh
      exclusive_territory: { type: Boolean, default: false }, // Khu vực độc quyền
    },

    // === ĐỊA CHỈ & LIÊN HỆ ===
    address: {
      street: { type: String, required: true },
      district: { type: String },
      city: { type: String, required: true },
      province: { type: String, required: true, index: true }, // Tỉnh/Thành phố để filter
      full_address: { type: String, required: true },
    },

    contact: {
      phone: { type: String, required: true },
      email: { type: String, required: true, lowercase: true },
      hotline: { type: String },
    },

    // === NĂNG LỰC & DỊCH VỤ ===
    capabilities: {
      showroom_area: { type: Number, required: true }, // diện tích showroom (m2)
      display_capacity: { type: Number, required: true }, // số xe có thể trưng bày

      // === 3 DỊCH VỤ CHÍNH CỦA HỆ THỐNG ===
      services: {
        vehicle_sales: { type: Boolean, default: true }, // Bán xe - dịch vụ cốt lõi
        test_drive: { type: Boolean, default: false }, // Lái thử xe
        spare_parts_sales: { type: Boolean, default: false }, // Bán phụ tùng
      },

      // === NHÂN SỰ ===
      total_staff: { type: Number, required: true },
      sales_staff: { type: Number, required: true }, // nhân viên bán hàng
      support_staff: { type: Number, default: 0 }, // nhân viên hỗ trợ (lái thử, phụ tùng)
    },

    // === TRẠNG THÁI ===
    status: {
      type: String,
      enum: ["active", "inactive", "terminated"],
      default: "active",
      index: true,
    },
    isActive: { type: Boolean, default: true, index: true },

    // Quản lý chất lượng (được thực hiện bởi Hãng) - Cập nhật sau
    last_audit_date: { type: Date }, // lần kiểm tra cuối cùng
    next_audit_date: { type: Date }, // lần kiểm tra tiếp theo
    audit_score: { type: Number, min: 0, max: 100 }, // điểm đánh giá chất lượng

    // === METADATA ===
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    notes: { type: String },
  },
  { timestamps: true }
);

// === INDEXES ===
dealershipSchema.index({ manufacturer_id: 1, status: 1 });
dealershipSchema.index({ "address.city": 1, isActive: 1 });

export default mongoose.model("Dealership", dealershipSchema);
