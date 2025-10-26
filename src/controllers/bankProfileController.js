import BankProfile from "../models/BankProfile.js";
import Order from "../models/Order.js";
import {success, created, error as errorRes} from "../utils/response.js";
import {paginate} from "../utils/pagination.js";

// ==================== CREATE BANK PROFILE ====================
export async function createBankProfile(req, res, next) {
  try {
    const {
      order_id,
      bank_name,
      bank_code,
      loan_officer,
      loan_amount,
      down_payment,
      loan_term_months,
      interest_rate,
      monthly_payment,
      customer_income,
      credit_score,
      co_signer,
      documents = [],
      notes,
    } = req.body;

    if (!order_id || !bank_name || !loan_amount || !down_payment) {
      return errorRes(res, "Missing required fields", 400);
    }

    // Kiểm tra order tồn tại và thuộc dealership
    const order = await Order.findById(order_id);
    if (!order) return errorRes(res, "Order not found", 404);

    const dealership_id = req.user?.dealership_id;
    if (String(order.dealership_id) !== String(dealership_id)) {
      return errorRes(res, "Access denied", 403);
    }

    // Kiểm tra đã có bank profile chưa
    const existingProfile = await BankProfile.findOne({order_id});
    if (existingProfile) {
      return errorRes(res, "Bank profile already exists for this order", 400);
    }

    const bankProfile = await BankProfile.create({
      order_id,
      customer_id: order.customer_id,
      dealership_id,
      bank_name,
      bank_code,
      loan_officer,
      loan_amount,
      down_payment,
      loan_term_months,
      interest_rate,
      monthly_payment,
      customer_income,
      credit_score,
      co_signer,
      documents,
      notes,
      status: "pending",
    });

    return created(res, "Bank profile created successfully", bankProfile);
  } catch (e) {
    next(e);
  }
}

// ==================== GET BANK PROFILES ====================
export async function getBankProfiles(req, res, next) {
  try {
    const dealership_id = req.user?.dealership_id;
    const {status} = req.query;

    const cond = {dealership_id};
    if (status) cond.status = status;

    const result = await paginate(
      BankProfile,
      req,
      ["bank_name", "status"],
      cond
    );

    // Populate thông tin order và customer
    const populatedData = await BankProfile.populate(result.data, [
      {path: "order_id", select: "code final_amount"},
      {path: "customer_id", select: "full_name phone email"},
    ]);

    return success(res, "Bank profiles retrieved", {
      ...result,
      data: populatedData,
    });
  } catch (e) {
    next(e);
  }
}

// ==================== GET BANK PROFILE BY ID ====================
export async function getBankProfileById(req, res, next) {
  try {
    const {id} = req.params;
    const dealership_id = req.user?.dealership_id;

    const bankProfile = await BankProfile.findOne({
      _id: id,
      dealership_id,
    })
      .populate("order_id")
      .populate("customer_id");

    if (!bankProfile) return errorRes(res, "Bank profile not found", 404);

    return success(res, "Bank profile retrieved", bankProfile);
  } catch (e) {
    next(e);
  }
}

// ==================== UPDATE BANK PROFILE ====================
export async function updateBankProfile(req, res, next) {
  try {
    const {id} = req.params;
    const {
      bank_name,
      bank_code,
      loan_officer,
      loan_amount,
      down_payment,
      loan_term_months,
      interest_rate,
      monthly_payment,
      customer_income,
      credit_score,
      co_signer,
      documents,
      notes,
    } = req.body;

    const dealership_id = req.user?.dealership_id;

    const bankProfile = await BankProfile.findOne({
      _id: id,
      dealership_id,
    });

    if (!bankProfile) return errorRes(res, "Bank profile not found", 404);

    // Chỉ cho phép update khi status là pending hoặc submitted
    if (!["pending", "submitted"].includes(bankProfile.status)) {
      return errorRes(res, "Cannot update bank profile in current status", 400);
    }

    // Update fields
    if (bank_name !== undefined) bankProfile.bank_name = bank_name;
    if (bank_code !== undefined) bankProfile.bank_code = bank_code;
    if (loan_officer !== undefined) bankProfile.loan_officer = loan_officer;
    if (loan_amount !== undefined) bankProfile.loan_amount = loan_amount;
    if (down_payment !== undefined) bankProfile.down_payment = down_payment;
    if (loan_term_months !== undefined)
      bankProfile.loan_term_months = loan_term_months;
    if (interest_rate !== undefined) bankProfile.interest_rate = interest_rate;
    if (monthly_payment !== undefined)
      bankProfile.monthly_payment = monthly_payment;
    if (customer_income !== undefined)
      bankProfile.customer_income = customer_income;
    if (credit_score !== undefined) bankProfile.credit_score = credit_score;
    if (co_signer !== undefined) bankProfile.co_signer = co_signer;
    if (documents !== undefined) bankProfile.documents = documents;
    if (notes !== undefined) bankProfile.notes = notes;

    await bankProfile.save();

    return success(res, "Bank profile updated successfully", bankProfile);
  } catch (e) {
    next(e);
  }
}

// ==================== UPDATE BANK PROFILE STATUS ====================
export async function updateBankProfileStatus(req, res, next) {
  try {
    const {id} = req.params;
    const {status, notes, rejection_reason} = req.body;

    const allowedStatuses = [
      "pending",
      "submitted",
      "under_review",
      "approved",
      "rejected",
      "funded",
      "canceled",
    ];

    if (!allowedStatuses.includes(status)) {
      return errorRes(res, "Invalid status", 400);
    }

    const dealership_id = req.user?.dealership_id;

    const bankProfile = await BankProfile.findOne({
      _id: id,
      dealership_id,
    });

    if (!bankProfile) return errorRes(res, "Bank profile not found", 404);

    bankProfile.status = status;

    // Set timestamps based on status
    const now = new Date();
    switch (status) {
      case "submitted":
        bankProfile.submitted_at = now;
        break;
      case "under_review":
        bankProfile.reviewed_at = now;
        break;
      case "approved":
        bankProfile.approved_at = now;
        break;
      case "funded":
        bankProfile.funded_at = now;
        break;
      case "rejected":
        bankProfile.rejection_reason = rejection_reason;
        break;
    }

    if (notes !== undefined) bankProfile.notes = notes;

    await bankProfile.save();

    return success(
      res,
      "Bank profile status updated successfully",
      bankProfile
    );
  } catch (e) {
    next(e);
  }
}

// ==================== DELETE BANK PROFILE ====================
export async function deleteBankProfile(req, res, next) {
  try {
    const {id} = req.params;
    const dealership_id = req.user?.dealership_id;

    const bankProfile = await BankProfile.findOneAndDelete({
      _id: id,
      dealership_id,
      status: "pending", // Chỉ cho phép xóa khi status là pending
    });

    if (!bankProfile) {
      return errorRes(res, "Bank profile not found or cannot be deleted", 404);
    }

    return success(res, "Bank profile deleted successfully", {id});
  } catch (e) {
    next(e);
  }
}
