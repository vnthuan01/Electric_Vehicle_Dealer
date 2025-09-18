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
};
