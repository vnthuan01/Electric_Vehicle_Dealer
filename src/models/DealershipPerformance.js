/*
  Model này dùng để lưu trữ: thông tin hiệu suất của đại lý
  - Doanh số bán hàng theo thời gian
  - Chất lượng dịch vụ khách hàng
  - Hiệu quả vận hành
*/
import mongoose from "mongoose";

const dealershipPerformanceSchema = new mongoose.Schema(
  {
    // === LIÊN KẾT VỚI DEALERSHIP ===
    dealership_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dealership",
      required: true,
      index: true,
    },

    // === THỜI GIAN BÁO CÁO ===
    period: {
      year: { type: Number, required: true },
      month: { type: Number, required: true, min: 1, max: 12 },
      quarter: { type: Number, min: 1, max: 4 }, // Tự động tính từ month
    },

    // === DOANH SỐ BÁN HÀNG ===
    sales_performance: {
      vehicles_sold: { type: Number, default: 0 }, // Số xe bán được
      total_revenue: { type: Number, default: 0 }, // Tổng doanh thu
      avg_selling_price: { type: Number, default: 0 }, // Giá bán trung bình

      // So sánh với chỉ tiêu
      monthly_target: { type: Number, default: 0 }, // Chỉ tiêu tháng
      target_achievement_rate: { type: Number, default: 0 }, // % hoàn thành

      // Phân tích theo sản phẩm
      top_selling_models: [
        {
          model_name: { type: String },
          quantity_sold: { type: Number },
          revenue: { type: Number },
        },
      ],
    },

    // === CHẤT LƯỢNG DỊCH VỤ ===
    service_quality: {
      customer_satisfaction_score: { type: Number, default: 0, min: 0, max: 5 },
      total_customers_served: { type: Number, default: 0 },

      // Khiếu nại
      complaint_count: { type: Number, default: 0 },
      resolved_complaints: { type: Number, default: 0 },
      complaint_resolution_rate: { type: Number, default: 0 }, // %
      avg_resolution_time_hours: { type: Number, default: 0 },

      // Test drive
      test_drive_requests: { type: Number, default: 0 },
      test_drive_conversion_rate: { type: Number, default: 0 }, // %

      // Dịch vụ sau bán hàng
      warranty_claims: { type: Number, default: 0 },
      warranty_completion_rate: { type: Number, default: 0 }, // %
    },

    // === HIỆU QUẢ VẬN HÀNH ===
    operational_efficiency: {
      // Thời gian phản hồi
      avg_response_time_hours: { type: Number, default: 24 },
      avg_quote_processing_time_hours: { type: Number, default: 2 },

      // Giao xe
      vehicles_delivered: { type: Number, default: 0 },
      on_time_delivery_rate: { type: Number, default: 0 }, // %
      avg_delivery_time_days: { type: Number, default: 0 },

      // Tồn kho
      inventory_turnover_rate: { type: Number, default: 0 }, // Vòng quay tồn kho
      avg_inventory_days: { type: Number, default: 0 }, // Số ngày tồn kho trung bình

      // Nhân sự
      staff_productivity_score: { type: Number, default: 0 }, // Điểm hiệu suất nhân viên
      training_completion_rate: { type: Number, default: 0 }, // % hoàn thành đào tạo
    },

    // === ĐÁNH GIÁ TỔNG QUAN ===
    overall_rating: {
      performance_score: { type: Number, default: 0, min: 0, max: 100 }, // Điểm tổng
      ranking_in_region: { type: Number }, // Xếp hạng trong khu vực
      ranking_nationally: { type: Number }, // Xếp hạng toàn quốc

      // Badges/Awards
      achievements: [
        {
          name: { type: String }, // Tên thành tích
          description: { type: String },
          earned_date: { type: Date },
        },
      ],
    },

    // === METADATA ===
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewed_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    review_date: { type: Date },

    notes: { type: String }, // Ghi chú về hiệu suất
    action_items: [
      {
        // Các hành động cần cải thiện
        description: { type: String },
        priority: { type: String, enum: ["low", "medium", "high"] },
        due_date: { type: Date },
        status: {
          type: String,
          enum: ["pending", "in_progress", "completed"],
          default: "pending",
        },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// === INDEXES ===
dealershipPerformanceSchema.index({
  dealership_id: 1,
  "period.year": -1,
  "period.month": -1,
});
dealershipPerformanceSchema.index({ "period.year": 1, "period.month": 1 });
dealershipPerformanceSchema.index({ "sales_performance.vehicles_sold": -1 });
dealershipPerformanceSchema.index({ "overall_rating.performance_score": -1 });

// === VIRTUALS ===
dealershipPerformanceSchema.virtual("period_display").get(function () {
  return `${this.period.month}/${this.period.year}`;
});

dealershipPerformanceSchema.virtual("is_top_performer").get(function () {
  return this.overall_rating.performance_score >= 80;
});

// === MIDDLEWARE ===
// Tự động tính quarter từ month
dealershipPerformanceSchema.pre("save", function (next) {
  if (this.period.month) {
    this.period.quarter = Math.ceil(this.period.month / 3);
  }
  next();
});

// === STATIC METHODS ===
dealershipPerformanceSchema.statics.getTopPerformers = function (
  year,
  month,
  limit = 10
) {
  return this.find({
    "period.year": year,
    "period.month": month,
  })
    .sort({ "overall_rating.performance_score": -1 })
    .limit(limit);
};

dealershipPerformanceSchema.statics.getPerformanceTrend = function (
  dealershipId,
  months = 6
) {
  return this.find({ dealership_id })
    .sort({ "period.year": -1, "period.month": -1 })
    .limit(months);
};

export default mongoose.model(
  "DealershipPerformance",
  dealershipPerformanceSchema
);
