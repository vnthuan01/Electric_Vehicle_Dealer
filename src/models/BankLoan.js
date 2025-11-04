import mongoose from "mongoose";

const bankLoanSchema = new mongoose.Schema(
  {
    // ========== LIÊN KẾT ==========
    order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      unique: true, // Mỗi order chỉ có 1 bank loan
      index: true,
    },
    customer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    dealership_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dealership",
      required: true,
      index: true,
    },
    bank_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bank",
      required: true,
      index: true,
      // ⭐ Link tới Bank model
    },

    // ========== THÔNG TIN KHOẢN VAY ==========
    // Được copy từ Bank.default_settings khi submit
    loan_amount: {
      type: Number,
      required: true,
      min: 0,
    },
    down_payment: {
      type: Number,
      required: true,
      min: 0,
      // Từ Order.paid_amount (tiền cọc)
    },
    loan_term_months: {
      type: Number,
      required: true,
      min: 1,
      // Thời hạn vay (12-60 tháng)
    },
    interest_rate: {
      type: Number,
      required: true,
      min: 0,
      // Lãi suất áp dụng (% / năm)
    },
    monthly_payment: {
      type: Number,
      required: true,
      min: 0,
      // Số tiền trả hàng tháng
    },
    processing_fee: {
      type: Number,
      default: 0,
      // Phí thẩm định khoản vay
    },
    total_interest: {
      type: Number,
      default: 0,
      // Tổng lãi suất phải trả
    },

    // ========== HỒ SƠ KHOẢN VAY ==========
    documents: [
      {
        name: {
          type: String,
          // Tên tài liệu: CMND, Bảng lương, etc.
        },
        type: {
          type: String,
          // Loại: id_card, salary_statement, tax_document, etc.
        },
        file_url: {
          type: String,
          // URL file upload
        },
        uploaded_date: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    customer_income: {
      type: Number,
      default: 0,
      // Thu nhập hàng tháng của khách
    },
    credit_score: {
      type: String,
      enum: ["Poor", "Fair", "Good", "Very Good", "Excellent"],
      default: "Fair",
      // Xếp hạng tín dụng
    },
    co_signer: {
      name: {
        type: String,
        default: null,
      },
      phone: {
        type: String,
        default: null,
      },
      relationship: {
        type: String,
        // Mối quan hệ: "Spouse", "Parent", "Sibling", etc.
        default: null,
      },
      is_required: {
        type: Boolean,
        default: false,
      },
    },

    // ========== TRẠNG THÁI HỒ SƠ ==========
    status: {
      type: String,
      enum: [
        "pending", // Chờ nộp hồ sơ
        "submitted", // Đã nộp cho ngân hàng
        "under_review", // Đang xét duyệt
        "approved", // Ngân hàng đã duyệt
        "rejected", // Ngân hàng từ chối
        "funded", // Đã giải ngân
        "completed", // Hoàn thành khoản vay
        "canceled", // Hủy khoản vay
      ],
      default: "pending",
      index: true,
    },

    // ========== NỘP HỒ SƠ ==========
    submission: {
      submitted_at: {
        type: Date,
        default: null,
      },
      submitted_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
        // Nhân viên đại lý nộp hồ sơ
      },
      submission_reference: {
        type: String,
        default: null,
        // Mã tham chiếu nộp hồ sơ: LOAN_2025_001
      },
      submission_notes: {
        type: String,
        default: null,
      },
    },

    // ========== DUYỆT HỒ SƠ ==========
    approval: {
      status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending",
      },
      approved_at: {
        type: Date,
        default: null,
      },
      approved_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
        // Nhân viên đại lý xác nhận duyệt
      },
      approved_amount: {
        type: Number,
        default: 0,
        // Số tiền ngân hàng duyệt (có thể khác với yêu cầu)
      },
      approval_reference_code: {
        type: String,
        default: null,
        // Mã từ ngân hàng: TCB_2025_001
      },
      approval_notes: {
        type: String,
        default: null,
      },
      rejection_reason: {
        type: String,
        default: null,
        // Lý do từ chối (nếu bị từ chối)
      },
      rejected_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
        // Nhân viên đại lý xác nhận từ chối
      },
      rejected_at: {
        type: Date,
        default: null,
      },
    },

    // ========== GIẢI NGÂN ==========
    disbursement: {
      disbursed_at: {
        type: Date,
        default: null,
      },
      disbursed_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
        // Nhân viên đại lý xác nhận giải ngân
      },
      disbursed_amount: {
        type: Number,
        default: 0,
        // Số tiền ngân hàng chuyển
      },
      disbursement_reference_code: {
        type: String,
        default: null,
        // Mã giao dịch: TXN_2025_001
      },
      disbursement_notes: {
        type: String,
        default: null,
      },
      payment_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Payment",
        default: null,
        // Link tới Payment record khi ngân hàng giải ngân
      },
    },

    // ========== LIÊN KẾT VỚI ORDER ==========
    order_payment_info: {
      first_payment_date: {
        type: Date,
        default: null,
        // Ngày khách bắt đầu trả ngân hàng
      },
      disbursement_payment_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Payment",
        default: null,
        // Payment ID từ ngân hàng giải ngân
      },
    },

    // ========== GHI CHÚ ==========
    notes: {
      type: String,
      default: null,
    },

    // ========== AUDIT ==========
    created_at: {
      type: Date,
      default: Date.now,
      index: true,
    },
    updated_at: {
      type: Date,
      default: Date.now,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
bankLoanSchema.index({ order_id: 1 });
bankLoanSchema.index({ customer_id: 1 });
bankLoanSchema.index({ bank_id: 1 });
bankLoanSchema.index({ dealership_id: 1 });
bankLoanSchema.index({ status: 1 });
bankLoanSchema.index({ created_at: -1 });
bankLoanSchema.index({ "submission.submitted_at": 1 });
bankLoanSchema.index({ "approval.approved_at": 1 });
bankLoanSchema.index({ "disbursement.disbursed_at": 1 });

export default mongoose.model("BankLoan", bankLoanSchema);
