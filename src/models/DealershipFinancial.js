/*
  Model này dùng để lưu trữ: thông tin tài chính của đại lý
  - Chính sách kinh doanh (hoa hồng, chiết khấu, hạn mức)
  - Tình trạng tài chính hiện tại (công nợ, xếp hạng tín dụng)
  - Lịch sử giao dịch tài chính
*/
import mongoose from "mongoose";

const dealershipFinancialSchema = new mongoose.Schema(
  {
    // === LIÊN KẾT VỚI DEALERSHIP ===
    dealership_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dealership",
      required: true,
      unique: true, // Mỗi đại lý chỉ có 1 record tài chính
      index: true,
    },

    // === CHÍNH SÁCH KINH DOANH ===
    business_policy: {
      annual_sales_target: {type: Number, required: true}, // Chỉ tiêu năm
      dealer_margin_percent: {type: Number, required: true}, // % hoa hồng
      payment_terms_days: {type: Number, default: 30}, // Hạn thanh toán
      credit_limit: {type: Number, required: true}, // Hạn mức tín dụng

      // Chiết khấu theo khối lượng
      volume_discounts: [
        {
          min_quantity: {type: Number, required: true},
          discount_percent: {type: Number, required: true},
          description: {type: String},
        },
      ],
    },

    // === TÌNH TRẠNG TÀI CHÍNH ===
    current_status: {
      total_debt: {type: Number, default: 0}, // Tổng công nợ
      overdue_amount: {type: Number, default: 0}, // Quá hạn
      next_payment_due: {type: Date}, // Ngày đến hạn
      last_payment_date: {type: Date},
      last_payment_amount: {type: Number, default: 0},

      credit_rating: {
        type: String,
        enum: ["excellent", "good", "fair", "poor", "default"],
        default: "good",
      },
      credit_score: {type: Number, min: 0, max: 1000, default: 700}, // Điểm tín dụng

      financial_health: {
        type: String,
        enum: ["healthy", "warning", "critical"],
        default: "healthy",
      },
    },

    // === THỐNG KÊ GIAO DỊCH ===
    transaction_summary: {
      total_payments_made: {type: Number, default: 0},
      total_amount_paid: {type: Number, default: 0},
      on_time_payment_rate: {type: Number, default: 100}, // %
      total_commission_earned: {type: Number, default: 0},
    },

    // === METADATA ===
    created_by: {type: mongoose.Schema.Types.ObjectId, ref: "User"},
    last_review_date: {type: Date},
    notes: {type: String},
  },
  {
    timestamps: true,
    toJSON: {virtuals: true},
    toObject: {virtuals: true},
  }
);

// === VIRTUALS ===
dealershipFinancialSchema.virtual("debt_ratio").get(function () {
  if (!this.business_policy?.credit_limit) return 0;
  return Math.round(
    (this.current_status.total_debt / this.business_policy.credit_limit) * 100
  );
});

dealershipFinancialSchema.virtual("available_credit").get(function () {
  return Math.max(
    0,
    this.business_policy.credit_limit - this.current_status.total_debt
  );
});

// === METHODS ===
dealershipFinancialSchema.methods.canTakeCredit = function (amount) {
  return (
    this.available_credit >= amount &&
    this.current_status.financial_health !== "critical"
  );
};

dealershipFinancialSchema.methods.addDebt = function (amount) {
  this.current_status.total_debt += amount;
  return this.save();
};

dealershipFinancialSchema.methods.makePayment = function (amount) {
  this.current_status.total_debt = Math.max(
    0,
    this.current_status.total_debt - amount
  );
  this.current_status.last_payment_date = new Date();
  this.current_status.last_payment_amount = amount;
  this.transaction_summary.total_payments_made += 1;
  this.transaction_summary.total_amount_paid += amount;
  return this.save();
};

export default mongoose.model("DealershipFinancial", dealershipFinancialSchema);
