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
    quote_id: {type: mongoose.Schema.Types.ObjectId, ref: "Quote"}, // Link đến báo giá gốc

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
        category: String, // "car", "motorcycle", etc.

        quantity: {type: Number, min: 1, max: 100, default: 1},
        discount: {type: Number, default: 0},
        promotion_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Promotion",
        },

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

        // ========== TRACKING FIELD (Solution 2) ==========
        used_stocks: [
          {
            stock_entry_id: {
              type: mongoose.Schema.Types.ObjectId,
              required: true,
              // Reference đến Vehicle.stocks[].id
            },

            source_request_id: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "RequestVehicle",
              default: null,
            },

            quantity: {
              type: Number,
              required: true,
              min: 1,
            },

            unit_cost: {
              type: Number,
              default: 0,
            },

            allocated_at: {
              type: Date,
              default: Date.now,
            },

            notes: String,
          },
        ],
      },
    ],

    final_amount: {type: Number, required: true},
    paid_amount: {type: Number, default: 0},

    // Hình thức thanh toán: cash (tiền mặt/trả thẳng) hoặc installment (trả góp)
    payment_method: {
      type: String,
      enum: ["cash", "installment"],
      default: "cash",
    },

    // ========== BANK LOAN (cho payment_method = "installment") ==========
    bank_loan_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BankLoan",
      default: null,
      // Link tới BankLoan nếu payment_method = "installment"
    },

    installment_info: {
      loan_amount: {
        type: Number,
        default: 0,
        // Số tiền vay = final_amount - down_payment
      },
      tenure_months: {
        type: Number,
        default: 0,
        // Thời hạn vay (tháng)
      },
      monthly_payment: {
        type: Number,
        default: 0,
        // Số tiền trả hàng tháng
      },
      first_payment_date: {
        type: Date,
        default: null,
        // Ngày khách bắt đầu trả cho ngân hàng
      },
      disbursement_payment_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Payment",
        default: null,
        // Payment ID khi ngân hàng giải ngân
      },
    },

    // Thông tin kiểm tra tồn kho
    stock_check: {
      checked: {type: Boolean, default: false},
      checked_at: Date,
      checked_by: {type: mongoose.Schema.Types.ObjectId, ref: "User"},
      has_stock: {type: Boolean, default: false}, // true = có xe, false = hết xe
      stock_details: [
        {
          vehicle_id: mongoose.Schema.Types.ObjectId,
          color: String,
          requested_quantity: Number,
          available_quantity: Number,
        },
      ],
    },

    // Thông tin hoàn tiền (khi hủy đơn)
    refund_info: {
      refunded: {type: Boolean, default: false},
      refunded_at: Date,
      refund_amount: Number,
      refund_reason: String,
      refund_payment_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Payment",
      },
    },

    // Link đến OrderRequest (nếu hết xe cần request)
    order_request_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OrderRequest",
    },

    // ✅ Tracking nguồn gốc stock
    stock_source: {
      type: String,
      enum: ["in_stock", "requested"],
      default: "in_stock",
      // "in_stock": Xe có sẵn trong kho (CASE 2 trước đó)
      // "requested": Xe phải request từ hãng (CASE 1)
    },

    // ✅ Link đến các RequestVehicle liên quan (nếu có)
    related_request_vehicles: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "RequestVehicle",
      },
    ],

    // Thông tin xe sẵn sàng
    vehicle_ready_info: {
      marked_ready_at: Date, // Thời điểm đánh dấu xe sẵn sàng
      marked_ready_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      vehicle_images: [String], // Array URL ảnh xe đã chuẩn bị
      preparation_notes: String, // Ghi chú về việc chuẩn bị xe
      expected_pickup_date: Date, // Ngày dự kiến khách có thể đến lấy xe
    },

    // status: {
    //   type: String,
    //   enum: [
    //     "pending",
    //     "confirmed",
    //     "halfPayment",
    //     "fullyPayment",
    //     "closed",
    //     "contract_signed",
    //     "delivered",
    //   ],
    //   default: "pending",
    //   index: true,
    // },

    status: {
      type: String,
      enum: [
        "pending", // Mới tạo, chưa check stock
        "deposit_paid", // Đã cọc, stock đã trừ nếu có xe
        "waiting_vehicle_request", // (Case hết xe) Đã request, chờ Hãng approve
        "waiting_bank_approval", // (payment_method=installment) Chờ ngân hàng duyệt & giải ngân
        "vehicle_ready", // Xe sẵn sàng, chờ khách trả nốt
        "fully_paid", // Đã thanh toán đủ, sẵn sàng giao xe
        "delivered", // Đã giao xe
        "completed", // Hoàn tất
        "canceled", // Hủy đơn (do Hãng reject hoặc khách hủy)
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
      signed_contract_urls: [
        {
          url: {type: String, required: true},
          type: {type: String, required: true},
          uploaded_at: {type: Date, default: Date.now},
        },
      ],
      signed_at: Date,
      signed_by: String,
      uploaded_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      template_used: String,
    },
    notes: String,
    is_deleted: {type: Boolean, default: false},
    deleted_at: {type: Date},
    deleted_by: {type: mongoose.Schema.Types.ObjectId, ref: "User"},
  },
  {timestamps: true}
);

export default mongoose.model("Order", orderSchema);
