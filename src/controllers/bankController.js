import Bank from "../models/Bank.js";
import AppError from "../utils/AppError.js";

// ========== 1. LIST BANKS ==========
export const listBanks = async (req, res, next) => {
  try {
    const { is_active } = req.query;

    // Build filter
    const filter = {};
    if (is_active !== undefined) {
      filter.is_active = is_active === "true";
    }

    const banks = await Bank.find(filter)
      .sort({ created_at: -1 })
      .select("-api_config.api_key -api_config.api_secret");

    res.status(200).json({
      success: true,
      count: banks.length,
      data: banks,
    });
  } catch (error) {
    next(error);
  }
};

// ========== 2. GET BANK BY ID ==========
export const getBankById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const bank = await Bank.findById(id).select(
      "-api_config.api_key -api_config.api_secret"
    );

    if (!bank) {
      return next(new AppError("Bank not found", 404));
    }

    res.status(200).json({
      success: true,
      data: bank,
    });
  } catch (error) {
    next(error);
  }
};

// ========== 3. CREATE BANK ==========
export const createBank = async (req, res, next) => {
  try {
    const {
      name,
      code,
      logo_url,
      website,
      contact_email,
      contact_phone,
      default_settings,
      relationship_managers,
      notes,
    } = req.body;

    // Validation
    if (!name || !code) {
      return next(
        new AppError("Bank name and code are required", 400)
      );
    }

    // Check if bank already exists
    const existingBank = await Bank.findOne({
      $or: [{ name }, { code }],
    });

    if (existingBank) {
      return next(
        new AppError("Bank with this name or code already exists", 409)
      );
    }

    // Create bank
    const bank = await Bank.create({
      name: name.trim(),
      code: code.toUpperCase().trim(),
      logo_url,
      website,
      contact_email,
      contact_phone,
      default_settings: default_settings || {},
      relationship_managers: relationship_managers || [],
      notes,
      created_by: req.user._id,
      updated_by: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: "Bank created successfully",
      data: bank,
    });
  } catch (error) {
    next(error);
  }
};

// ========== 4. UPDATE BANK ==========
export const updateBank = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      code,
      logo_url,
      website,
      contact_email,
      contact_phone,
      default_settings,
      relationship_managers,
      is_active,
      notes,
    } = req.body;

    const bank = await Bank.findById(id);

    if (!bank) {
      return next(new AppError("Bank not found", 404));
    }

    // Check if new name/code already exists
    if (name && name !== bank.name) {
      const existingBank = await Bank.findOne({ name });
      if (existingBank) {
        return next(new AppError("Bank with this name already exists", 409));
      }
    }

    if (code && code !== bank.code) {
      const existingBank = await Bank.findOne({
        code: code.toUpperCase(),
      });
      if (existingBank) {
        return next(new AppError("Bank with this code already exists", 409));
      }
    }

    // Update fields
    if (name) bank.name = name.trim();
    if (code) bank.code = code.toUpperCase().trim();
    if (logo_url !== undefined) bank.logo_url = logo_url;
    if (website !== undefined) bank.website = website;
    if (contact_email !== undefined) bank.contact_email = contact_email;
    if (contact_phone !== undefined) bank.contact_phone = contact_phone;

    if (default_settings) {
      bank.default_settings = {
        ...bank.default_settings,
        ...default_settings,
      };
    }

    if (relationship_managers !== undefined) {
      bank.relationship_managers = relationship_managers;
    }

    if (is_active !== undefined) bank.is_active = is_active;
    if (notes !== undefined) bank.notes = notes;

    bank.updated_by = req.user._id;
    bank.updated_at = new Date();

    await bank.save();

    res.status(200).json({
      success: true,
      message: "Bank updated successfully",
      data: bank,
    });
  } catch (error) {
    next(error);
  }
};

// ========== 5. DEACTIVATE BANK ==========
export const deactivateBank = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const bank = await Bank.findById(id);

    if (!bank) {
      return next(new AppError("Bank not found", 404));
    }

    if (!bank.is_active) {
      return next(new AppError("Bank is already inactive", 400));
    }

    bank.is_active = false;
    if (reason) {
      bank.notes = `${bank.notes || ""}\nDeactivated: ${reason}`;
    }
    bank.updated_by = req.user._id;
    bank.updated_at = new Date();

    await bank.save();

    res.status(200).json({
      success: true,
      message: "Bank deactivated successfully",
      data: bank,
    });
  } catch (error) {
    next(error);
  }
};

// ========== 6. ACTIVATE BANK ==========
export const activateBank = async (req, res, next) => {
  try {
    const { id } = req.params;

    const bank = await Bank.findById(id);

    if (!bank) {
      return next(new AppError("Bank not found", 404));
    }

    if (bank.is_active) {
      return next(new AppError("Bank is already active", 400));
    }

    bank.is_active = true;
    bank.updated_by = req.user._id;
    bank.updated_at = new Date();

    await bank.save();

    res.status(200).json({
      success: true,
      message: "Bank activated successfully",
      data: bank,
    });
  } catch (error) {
    next(error);
  }
};

// ========== 7. UPDATE BANK SETTINGS ==========
export const updateBankSettings = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { default_settings } = req.body;

    if (!default_settings) {
      return next(new AppError("default_settings is required", 400));
    }

    const bank = await Bank.findById(id);

    if (!bank) {
      return next(new AppError("Bank not found", 404));
    }

    // Validate settings
    if (
      default_settings.min_loan_amount &&
      default_settings.max_loan_amount &&
      default_settings.min_loan_amount > default_settings.max_loan_amount
    ) {
      return next(
        new AppError(
          "min_loan_amount must be less than max_loan_amount",
          400
        )
      );
    }

    if (
      default_settings.min_interest_rate &&
      default_settings.max_interest_rate &&
      default_settings.min_interest_rate > default_settings.max_interest_rate
    ) {
      return next(
        new AppError(
          "min_interest_rate must be less than max_interest_rate",
          400
        )
      );
    }

    if (
      default_settings.min_tenure_months &&
      default_settings.max_tenure_months &&
      default_settings.min_tenure_months > default_settings.max_tenure_months
    ) {
      return next(
        new AppError(
          "min_tenure_months must be less than max_tenure_months",
          400
        )
      );
    }

    // Update settings
    bank.default_settings = {
      ...bank.default_settings,
      ...default_settings,
    };
    bank.updated_by = req.user._id;
    bank.updated_at = new Date();

    await bank.save();

    res.status(200).json({
      success: true,
      message: "Bank settings updated successfully",
      data: bank,
    });
  } catch (error) {
    next(error);
  }
};
