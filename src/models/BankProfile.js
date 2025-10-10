import mongoose from "mongoose";

const bankProfileSchema = new mongoose.Schema(
  {
    // Liên kết với order
    order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    customer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    dealership_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dealership",
      required: true,
    },

    // Thông tin ngân hàng
    bank_name: {
      type: String,
      required: true,
    },
    bank_code: {
      type: String, // Mã ngân hàng
    },
    loan_officer: {
      name: String,
      phone: String,
      email: String,
    },

    // Thông tin khoản vay
    loan_amount: {
      type: Number,
      required: true,
    },
    down_payment: {
      type: Number,
      required: true, // Số tiền đặt cọc
    },
    loan_term_months: {
      type: Number,
      required: true, // Thời hạn vay (tháng)
    },
    interest_rate: {
      type: Number,
      required: true, // Lãi suất (%)
    },
    monthly_payment: {
      type: Number,
      required: true, // Số tiền trả hàng tháng
    },

    // Trạng thái hồ sơ
    status: {
      type: String,
      enum: [
        "pending", // Chờ duyệt
        "submitted", // Đã nộp hồ sơ
        "under_review", // Đang xét duyệt
        "approved", // Đã duyệt
        "rejected", // Từ chối
        "funded", // Đã giải ngân
        "cancelled", // Hủy bỏ
      ],
      default: "pending",
      index: true,
    },

    // Ngày tháng quan trọng
    submitted_at: {
      type: Date,
    },
    reviewed_at: {
      type: Date,
    },
    approved_at: {
      type: Date,
    },
    funded_at: {
      type: Date,
    },

    // Giấy tờ và tài liệu
    documents: [
      {
        name: String, // Tên tài liệu
        type: String, // Loại: id_card, income_proof, bank_statement, etc.
        file_url: String, // URL file đã upload
        uploaded_at: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Ghi chú và lý do từ chối
    notes: String,
    rejection_reason: String,

    // Thông tin bổ sung
    customer_income: Number, // Thu nhập khách hàng
    credit_score: String, // Điểm tín dụng
    co_signer: {
      name: String,
      phone: String,
      relationship: String,
    },
  },
  {timestamps: true}
);

// Indexes
bankProfileSchema.index({order_id: 1, status: 1});
bankProfileSchema.index({customer_id: 1, status: 1});
bankProfileSchema.index({dealership_id: 1, status: 1});

export default mongoose.model("BankProfile", bankProfileSchema);
