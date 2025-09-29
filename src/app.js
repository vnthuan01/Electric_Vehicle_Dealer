// src/app.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import {fileURLToPath} from "url";

import {httpLogger} from "./utils/logger.js";
import {notFoundHandler, errorHandler} from "./middlewares/errorHandler.js";
import swaggerUi from "swagger-ui-express";
import {swaggerSpec} from "./config/swagger.js";

// Routes imports
import smsRoutes from "./routes/smsRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import debtRoutes from "./routes/debtRoutes.js";
import requestVehicleRoutes from "./routes/requestVehicleRoutes.js";
import vehicleRoutes from "./routes/vehicleRoutes.js";
import testDriveRoutes from "./routes/testDriveRoutes.js";
import feedbackRoutes from "./routes/feedbackRoutes.js";
import customerRoutes from "./routes/customerRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import promotionRoutes from "./routes/promotionRoutes.js";
import dealershipRoutes from "./routes/dealershipRoutes.js";
import manufacturerRoutes from "./routes/manufacturerRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import accessoryRoutes from "./routes/accessoryRoutes.js";
import optionRoutes from "./routes/optionRoutes.js";

dotenv.config();

const app = express();

// --- Middleware ---
app.use(
  cors({
    origin: [
      // "http://localhost:5173",
      // "https://electric-vehicle-dealer.onrender.com/",
      "*",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(httpLogger);

// --- Static files ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// --- Health check ---
app.get("/health", (req, res) => res.json({status: "ok"}));

// --- Swagger docs ---
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// --- Mount routes with /api prefix ---
const apiPrefix = "/api";
app.use(`${apiPrefix}/sms`, smsRoutes);
app.use(`${apiPrefix}/users`, userRoutes);
app.use(`${apiPrefix}/debts`, debtRoutes);
app.use(`${apiPrefix}/request-vehicles`, requestVehicleRoutes);
app.use(`${apiPrefix}/vehicles`, vehicleRoutes);
app.use(`${apiPrefix}/testdrives`, testDriveRoutes);
app.use(`${apiPrefix}/feedbacks`, feedbackRoutes);
app.use(`${apiPrefix}/customers`, customerRoutes);
app.use(`${apiPrefix}/orders`, orderRoutes);
app.use(`${apiPrefix}/promotions`, promotionRoutes);
app.use(`${apiPrefix}/accessories`, accessoryRoutes);
app.use(`${apiPrefix}/options`, optionRoutes);
app.use(`${apiPrefix}/dealerships`, dealershipRoutes);
app.use(`${apiPrefix}/manufacturers`, manufacturerRoutes);
app.use(`${apiPrefix}/auth`, authRoutes);

console.log(`All routes mounted under prefix ${apiPrefix}`);

// --- Error handlers ---
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
