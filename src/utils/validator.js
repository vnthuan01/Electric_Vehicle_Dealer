import Joi from "joi";
import {AppError} from "./AppError.js";
import {ROLES} from "../enum/roleEnum.js";

export function validateBody(schema) {
  return (req, res, next) => {
    const {error, value} = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      const message = error.details.map((d) => d.message).join(", ");
      return next(new AppError(message, 400, 1005));
    }
    req.body = value;
    return next();
  };
}

export const schemas = {
  register: Joi.object({
    full_name: Joi.string().min(2).required(),
    email: Joi.string().email().required(),
    phone: Joi.string().allow(null, ""),
    password: Joi.string().min(6).required(),
    role_name: Joi.string()
      .valid(...ROLES)
      .default("Dealer Staff"),
    dealership_id: Joi.string().optional(),
    manufacturer_id: Joi.string().optional(),
  }),
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),

  dealershipApplication: Joi.object({
    company_name: Joi.string().min(2).max(100).required(),
    business_license: Joi.string().min(5).max(50).required(),
    tax_code: Joi.string().min(5).max(50).required(),
    contact_person: Joi.string().min(2).max(100).required(),
    phone: Joi.string().pattern(/^[0-9+\-\s()]+$/).min(10).max(20).required(),
    email: Joi.string().email().required(),
    address: Joi.string().min(10).max(500).required(),
    business_type: Joi.string().valid("retail", "wholesale", "both").required(),
    expected_sales_volume: Joi.number().integer().min(0).max(10000).optional(),
    showroom_area: Joi.number().min(0).max(100000).optional(),
    warehouse_area: Joi.number().min(0).max(100000).optional(),
    registered_capital: Joi.number().min(0).optional(),
    annual_revenue: Joi.number().min(0).optional(),
    years_in_business: Joi.number().integer().min(0).max(100).optional(),
    automotive_experience: Joi.boolean().default(false),
    ev_experience: Joi.boolean().default(false),
    manufacturer_id: Joi.string().hex().length(24).required(),
    documents: Joi.array().items(
      Joi.object({
        type: Joi.string().valid("business_license", "tax_certificate", "showroom_photos", "financial_statement", "other").required(),
        url: Joi.string().uri().required(),
        name: Joi.string().min(1).max(200).required()
      })
    ).optional()
  }),

  approveApplication: Joi.object({
    review_notes: Joi.string().max(1000).optional(),
    dealership_code: Joi.string().min(2).max(20).optional()
  }),

  rejectApplication: Joi.object({
    rejection_reason: Joi.string().min(10).max(500).required(),
    review_notes: Joi.string().max(1000).optional()
  })
};
