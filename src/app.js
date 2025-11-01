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
// import smsRoutes from "./routes/smsRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
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
import roleRoutes from "./routes/roleRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import quoteRoutes from "./routes/quoteRoutes.js";
import bankProfileRoutes from "./routes/bankProfileRoutes.js";
import contractRoutes from "./routes/contractRoutes.js";
import orderStatusLogRoutes from "./routes/orderStatusLogRoutes.js";
import orderRequestRoutes from "./routes/orderRequestRoutes.js";
import bankRoutes from "./routes/bankRoutes.js";
import bankLoanRoutes from "./routes/bankLoanRoutes.js";

dotenv.config();

const app = express();

// --- Middleware ---
// app.use(
//   cors({
//     origin: "*",
//   })
// );
app.use(cors());
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
app.use(`${apiPrefix}/reports`, reportRoutes);
app.use(`${apiPrefix}/order-request`, orderRequestRoutes);
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
app.use(`${apiPrefix}/roles`, roleRoutes);
app.use(`${apiPrefix}/payments`, paymentRoutes);
app.use(`${apiPrefix}/quotes`, quoteRoutes);
app.use(`${apiPrefix}/bank-profiles`, bankProfileRoutes);
app.use(`${apiPrefix}/contracts`, contractRoutes);
app.use(`${apiPrefix}/order-status-logs`, orderStatusLogRoutes);
app.use(`${apiPrefix}/banks`, bankRoutes);
app.use(`${apiPrefix}/bank-loans`, bankLoanRoutes);

console.log(`All routes mounted under prefix ${apiPrefix}`);

// --- Error handlers ---
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
