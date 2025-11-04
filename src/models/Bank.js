import mongoose from "mongoose";

const bankSchema = new mongoose.Schema(
  {
    // Thông tin cơ bản
    name: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      // SWIFT code: TCB, VCB, ACB, etc.
    },
    logo_url: {
      type: String,
      default: null,
    },
    website: {
      type: String,
      default: null,
    },

    // Liên hệ
    contact_email: {
      type: String,
      default: null,
    },
    contact_phone: {
      type: String,
      default: null,
    },

    // Điều kiện vay mặc định (dễ update)
    default_settings: {
      min_loan_amount: {
        type: Number,
        default: 20000000, // 20 triệu VNĐ
      },
      max_loan_amount: {
        type: Number,
        default: 500000000, // 500 triệu VNĐ
      },
      min_interest_rate: {
        type: Number,
        default: 7.5, // 7.5% / năm
      },
      max_interest_rate: {
        type: Number,
        default: 12.5, // 12.5% / năm
      },
      min_tenure_months: {
        type: Number,
        default: 12, // 12 tháng tối thiểu
      },
      max_tenure_months: {
        type: Number,
        default: 60, // 60 tháng tối đa
      },
      processing_fee: {
        type: Number,
        default: 1.5, // 1.5% phí thẩm định
      },
    },

    // Nhân viên liên hệ từ ngân hàng
    relationship_managers: [
      {
        name: {
          type: String,
          default: null,
        },
        phone: {
          type: String,
          default: null,
        },
        email: {
          type: String,
          default: null,
        },
        position: {
          type: String,
          default: "Loan Officer",
        },
        is_active: {
          type: Boolean,
          default: true,
        },
      },
    ],

    // API Configuration (nếu tích hợp API sau)
    api_config: {
      provider: {
        type: String,
        default: null,
        // Ví dụ: "techcombank_api_v2", "vietcombank_api_v3", etc.
      },
      api_key: {
        type: String,
        default: null,
        select: false, // Không lấy trong query thường
      },
      api_secret: {
        type: String,
        default: null,
        select: false, // Không lấy trong query thường
      },
      webhook_url: {
        type: String,
        default: null,
      },
      is_active: {
        type: Boolean,
        default: false,
      },
    },

    // Trạng thái
    is_active: {
      type: Boolean,
      default: true,
      index: true,
    },
    notes: {
      type: String,
      default: null,
    },

    // Audit
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
    updated_by: {
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
bankSchema.index({ name: 1 });
bankSchema.index({ code: 1 });
bankSchema.index({ is_active: 1 });
bankSchema.index({ created_at: -1 });

export default mongoose.model("Bank", bankSchema);
