import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    code: {type: String, required: true, unique: true, index: true},

    customer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },

    dealership_id: {type: mongoose.Schema.Types.ObjectId, ref: "Dealership"},
    salesperson_id: {type: mongoose.Schema.Types.ObjectId, ref: "User"},

    items: [
      {
        vehicle_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Vehicle",
          required: true,
        },

        // --- snapshot vehicle ---
        vehicle_name: String,
        vehicle_price: Number,
        color: String,

        quantity: {type: Number, min: 1, max: 100, default: 1},
        discount: {type: Number, default: 0},
        promotion_id: {type: mongoose.Schema.Types.ObjectId, ref: "Promotion"},

        // --- snapshot accessories ---
        accessories: [
          {
            accessory_id: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "Accessory",
              required: true,
            },
            name: String,
            price: Number,
            quantity: {type: Number, default: 1},
          },
        ],

        // --- snapshot options ---
        options: [
          {
            option_id: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "Option",
              required: true,
            },
            name: String,
            price: Number,
          },
        ],

        final_amount: {type: Number, required: true},
      },
    ],

    final_amount: {type: Number, required: true},
    paid_amount: {type: Number, default: 0},

    payment_method: {
      type: String,
      enum: ["cash", "installment"],
      default: "cash",
    },

    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "halfPayment",
        "fullyPayment",
        "contract_signed",
        "delivered",
      ],
      default: "pending",
      index: true,
    },

    // Thông tin giao xe
    delivery: {
      status: {
        type: String,
        enum: ["pending", "scheduled", "in_transit", "delivered", "failed"],
        default: "pending",
      },
      scheduled_date: Date, // Ngày dự kiến giao
      actual_date: Date, // Ngày thực tế giao
      delivery_person: {
        name: String,
        phone: String,
        id_card: String,
      },
      delivery_address: {
        street: String,
        ward: String,
        district: String,
        city: String,
        full_address: String,
      },
      recipient_info: {
        name: String,
        phone: String,
        relationship: String, // Mối quan hệ với khách hàng
      },
      delivery_notes: String,
      delivery_documents: [
        {
          name: String, // Tên tài liệu
          type: String, // Loại: receipt, inspection_report, etc.
          file_url: String,
          uploaded_at: {type: Date, default: Date.now},
        },
      ],
      signed_at: Date, // Thời điểm ký nhận
      signed_by: String, // Tên người ký nhận
    },

    // Thông tin hợp đồng
    contract: {
      signed_contract_url: String, // URL file hợp đồng đã ký
      signed_at: Date, // Thời điểm ký
      signed_by: String, // Tên người ký
      uploaded_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      template_used: String, // Template đã sử dụng
    },

    notes: String,
    is_deleted: {type: Boolean, default: false},
    deleted_at: {type: Date},
    deleted_by: {type: mongoose.Schema.Types.ObjectId, ref: "User"},
  },
  {timestamps: true}
);

export default mongoose.model("Order", orderSchema);
