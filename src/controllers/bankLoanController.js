import mongoose from "mongoose";
import BankLoan from "../models/BankLoan.js";
import Bank from "../models/Bank.js";
import Order from "../models/Order.js";
import Payment from "../models/Payment.js";
import Debt from "../models/Debt.js";
import AppError from "../utils/AppError.js";
import logger from "../utils/logger.js";

// ========== 1. SUBMIT BANK LOAN APPLICATION ==========
/**
 * POST /api/bank-loans/submit
 * Nhân viên nộp hồ sơ vay cho ngân hàng
 */
export const submitBankLoanApplication = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      order_id,
      bank_id,
      loan_term_months,
      documents,
      customer_income,
      credit_score,
      co_signer,
      notes,
    } = req.body;

    // ========== VALIDATIONS ==========
    if (!order_id || !bank_id) {
      return next(new AppError("order_id and bank_id are required", 400));
    }

    // Check Order exists and valid
    const order = await Order.findById(order_id).session(session);
    if (!order) {
      await session.abortTransaction();
      return next(new AppError("Order not found", 404));
    }

    // Check payment_method = "installment"
    if (order.payment_method !== "installment") {
      await session.abortTransaction();
      return next(
        new AppError("Order payment_method must be installment", 400)
      );
    }

    // Check order status = "deposit_paid"
    if (order.status !== "deposit_paid") {
      await session.abortTransaction();
      return next(
        new AppError(
          "Order status must be deposit_paid to submit loan application",
          400
        )
      );
    }

    // Check Bank exists
    const bank = await Bank.findById(bank_id).session(session);
    if (!bank) {
      await session.abortTransaction();
      return next(new AppError("Bank not found", 404));
    }

    if (!bank.is_active) {
      await session.abortTransaction();
      return next(new AppError("Bank is not active", 400));
    }

    // Check no active BankLoan already exists
    const existingLoan = await BankLoan.findOne({
      order_id,
      status: {$nin: ["rejected", "canceled"]},
    }).session(session);

    if (existingLoan) {
      await session.abortTransaction();
      return next(
        new AppError("Active bank loan already exists for this order", 409)
      );
    }

    // ========== CALCULATIONS ==========
    const loan_amount = order.final_amount - order.paid_amount;
    const interest_rate = bank.default_settings.min_interest_rate;

    // Calculate monthly payment using loan formula
    // P = L[r(1+r)^n]/[(1+r)^n-1]
    // L = loan amount, r = monthly rate, n = months
    const monthly_rate = interest_rate / 12 / 100;
    const numerator =
      monthly_rate * Math.pow(1 + monthly_rate, loan_term_months);
    const denominator = Math.pow(1 + monthly_rate, loan_term_months) - 1;
    const monthly_payment = Math.round(loan_amount * (numerator / denominator));

    const total_interest = monthly_payment * loan_term_months - loan_amount;
    const processing_fee = Math.round(
      loan_amount * (bank.default_settings.processing_fee / 100)
    );

    // ========== CREATE BANK LOAN ==========
    const bankLoan = await BankLoan.create(
      [
        {
          order_id,
          customer_id: order.customer_id,
          dealership_id: order.dealership_id,
          bank_id,
          loan_amount,
          down_payment: order.paid_amount,
          loan_term_months,
          interest_rate,
          monthly_payment,
          processing_fee,
          total_interest,
          documents: documents || [],
          customer_income: customer_income || 0,
          credit_score: credit_score || "Fair",
          co_signer: co_signer || {},
          status: "submitted",
          submission: {
            submitted_at: new Date(),
            submitted_by: req.user._id,
            submission_reference: `LOAN_${Date.now()}_${Math.random()
              .toString(36)
              .substr(2, 9)
              .toUpperCase()}`,
            submission_notes: notes,
          },
          notes,
          created_by: req.user._id,
        },
      ],
      {session}
    );

    // ========== UPDATE ORDER ==========
    order.status = "waiting_bank_approval";
    order.bank_loan_id = bankLoan[0]._id;
    order.installment_info = {
      loan_amount,
      tenure_months: loan_term_months,
      monthly_payment,
      first_payment_date: null,
      disbursement_payment_id: null,
    };
    await order.save({session});

    // ========== LOGGING ==========
    logger.info(`Bank loan submitted: Order ${order.code}, Bank ${bank.name}`, {
      order_id,
      bank_loan_id: bankLoan[0]._id,
      loan_amount,
      user_id: req.user._id,
    });

    await session.commitTransaction();

    res.status(201).json({
      success: true,
      message: "Bank loan application submitted successfully",
      data: {
        bank_loan: bankLoan[0],
        order: {
          _id: order._id,
          status: order.status,
          bank_loan_id: order.bank_loan_id,
        },
      },
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// ========== 2. APPROVE BANK LOAN ==========
/**
 * PUT /api/bank-loans/:loan_id/approve
 * Nhân viên xác nhận ngân hàng đã duyệt hồ sơ
 */
export const approveBankLoan = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {id: loan_id} = req.params;
    const {approved_amount, approval_reference_code, approval_notes} = req.body;

    if (!approved_amount || !approval_reference_code) {
      return next(
        new AppError(
          "approved_amount and approval_reference_code are required",
          400
        )
      );
    }

    // Check BankLoan exists
    const bankLoan = await BankLoan.findById(loan_id).session(session);
    if (!bankLoan) {
      await session.abortTransaction();
      return next(new AppError("Bank loan not found", 404));
    }

    // Check status = "submitted"
    if (bankLoan.status !== "submitted") {
      await session.abortTransaction();
      return next(
        new AppError("Bank loan status must be \"submitted\" to approve", 400)
      );
    }

    // ========== UPDATE BANK LOAN ==========
    bankLoan.status = "approved";
    bankLoan.approval = {
      status: "approved",
      approved_at: new Date(),
      approved_by: req.user._id,
      approved_amount,
      approval_reference_code,
      approval_notes: approval_notes || null,
      rejection_reason: null,
      rejected_by: null,
      rejected_at: null,
    };
    await bankLoan.save({session});

    // ========== LOGGING ==========
    logger.info(`Bank loan approved: ${loan_id}`, {
      approved_amount,
      user_id: req.user._id,
    });

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "Bank loan approved successfully",
      data: bankLoan,
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// ========== 3. REJECT BANK LOAN ==========
/**
 * PUT /api/bank-loans/:loan_id/reject
 * Nhân viên xác nhận ngân hàng từ chối hồ sơ
 */
export const rejectBankLoan = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {id: loan_id} = req.params;
    const {rejection_reason} = req.body;

    if (!rejection_reason) {
      return next(new AppError("rejection_reason is required", 400));
    }

    // Check BankLoan exists
    const bankLoan = await BankLoan.findById(loan_id).session(session);
    if (!bankLoan) {
      await session.abortTransaction();
      return next(new AppError("Bank loan not found", 404));
    }

    // Check status = "submitted"
    if (bankLoan.status !== "submitted") {
      await session.abortTransaction();
      return next(
        new AppError("Bank loan status must be \"submitted\" to reject", 400)
      );
    }

    // ========== UPDATE BANK LOAN ==========
    bankLoan.status = "rejected";
    bankLoan.approval = {
      status: "rejected",
      approved_at: null,
      approved_by: null,
      approved_amount: 0,
      approval_reference_code: null,
      approval_notes: null,
      rejection_reason,
      rejected_by: req.user._id,
      rejected_at: new Date(),
    };
    await bankLoan.save({session});

    // ========== UPDATE ORDER ==========
    const order = await Order.findById(bankLoan.order_id).session(session);
    order.status = "deposit_paid"; // Revert to deposit_paid
    await order.save({session});

    // ========== LOGGING ==========
    logger.info(`Bank loan rejected: ${loan_id}`, {
      rejection_reason,
      user_id: req.user._id,
    });

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "Bank loan rejected successfully",
      data: {
        bank_loan: bankLoan,
        order: {_id: order._id, status: order.status},
      },
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// ========== 4. DISBURSE BANK LOAN ==========
/**
 * POST /api/bank-loans/:loan_id/disburse
 * Nhân viên xác nhận ngân hàng đã giải ngân
 */
export const disburseBankLoan = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {id: loan_id} = req.params;
    const {
      disbursed_amount,
      disbursement_reference_code,
      disbursement_notes,
      first_payment_date,
    } = req.body;

    if (!disbursed_amount || !disbursement_reference_code) {
      return next(
        new AppError(
          "disbursed_amount and disbursement_reference_code are required",
          400
        )
      );
    }

    // Check BankLoan exists
    const bankLoan = await BankLoan.findById(loan_id).session(session);
    if (!bankLoan) {
      await session.abortTransaction();
      return next(new AppError("Bank loan not found", 404));
    }

    // Check status = "approved"
    if (bankLoan.status !== "approved") {
      await session.abortTransaction();
      return next(
        new AppError("Bank loan status must be \"approved\" to disburse", 400)
      );
    }

    // ========== CREATE PAYMENT FROM BANK ==========
    const payment = await Payment.create(
      [
        {
          order_id: bankLoan.order_id,
          payment_type: "bank_disbursement",
          payment_method: "bank_transfer",
          amount: disbursed_amount,
          paid_by: bankLoan.bank_id,
          status: "completed",
          reference_code: disbursement_reference_code,
          notes: disbursement_notes || null,
          paid_at: new Date(),
          recorded_by: req.user._id,
        },
      ],
      {session}
    );

    // ========== UPDATE ORDER ==========
    const order = await Order.findById(bankLoan.order_id).session(session);
    order.paid_amount += disbursed_amount;
    order.status = "fully_paid";
    order.installment_info.first_payment_date =
      first_payment_date || new Date();
    order.installment_info.disbursement_payment_id = payment[0]._id;
    await order.save({session});

    // ========== SETTLE CUSTOMER DEBT ==========
    const debt = await Debt.findOne({
      order_id: bankLoan.order_id,
      debt_type: "customer_payment",
    }).session(session);

    if (debt) {
      debt.status = "settled";
      debt.settled_amount = debt.remaining_amount;
      debt.settled_at = new Date();
      debt.settled_by = req.user._id;
      debt.remaining_amount = 0;
      await debt.save({session});
    }

    // ========== UPDATE BANK LOAN ==========
    bankLoan.status = "funded";
    bankLoan.disbursement = {
      disbursed_at: new Date(),
      disbursed_by: req.user._id,
      disbursed_amount,
      disbursement_reference_code,
      disbursement_notes: disbursement_notes || null,
      payment_id: payment[0]._id,
    };
    bankLoan.order_payment_info = {
      first_payment_date: first_payment_date || new Date(),
      disbursement_payment_id: payment[0]._id,
    };
    await bankLoan.save({session});

    // ========== LOGGING ==========
    logger.info(
      `Bank loan disbursed: Order ${order.code}, Amount ${disbursed_amount}`,
      {
        loan_id,
        payment_id: payment[0]._id,
        user_id: req.user._id,
      }
    );

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "Bank loan disbursed successfully",
      data: {
        bank_loan: bankLoan,
        payment: payment[0],
        order: {
          _id: order._id,
          status: order.status,
          paid_amount: order.paid_amount,
        },
      },
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// ========== 5. GET BANK LOAN BY ID ==========
export const getBankLoanById = async (req, res, next) => {
  try {
    const {id} = req.params;

    const bankLoan = await BankLoan.findById(id)
      .populate("order_id", "code final_amount paid_amount status")
      .populate("customer_id", "name phone email")
      .populate("bank_id", "name code default_settings")
      .populate("submitted_by", "name email")
      .populate("approval.approved_by", "name email")
      .populate("approval.rejected_by", "name email")
      .populate("disbursement.disbursed_by", "name email");

    if (!bankLoan) {
      return next(new AppError("Bank loan not found", 404));
    }

    res.status(200).json({
      success: true,
      data: bankLoan,
    });
  } catch (error) {
    next(error);
  }
};

// ========== 6. LIST BANK LOANS ==========
export const listBankLoans = async (req, res, next) => {
  try {
    const {status, bank_id, customer_id, dealership_id} = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const filter = {};
    if (status) filter.status = status;
    if (bank_id) filter.bank_id = bank_id;
    if (customer_id) filter.customer_id = customer_id;
    if (dealership_id) filter.dealership_id = dealership_id;

    const skip = (page - 1) * limit;

    const bankLoans = await BankLoan.find(filter)
      .populate("bank_id", "name code")
      .populate("order_id", "code final_amount")
      .populate("customer_id", "name phone")
      .sort({created_at: -1})
      .skip(skip)
      .limit(limit);

    const total = await BankLoan.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: bankLoans.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: bankLoans,
    });
  } catch (error) {
    next(error);
  }
};
