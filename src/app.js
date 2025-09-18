import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import {fileURLToPath} from "url";
import {httpLogger} from "./utils/logger.js";
import authRoutes from "./routes/authRoutes.js";
import vehicleRoutes from "./routes/vehicleRoutes.js";
import customerRoutes from "./routes/customerRoutes.js";
import promotionRoutes from "./routes/promotionRoutes.js";
import dealershipRoutes from "./routes/dealershipRoutes.js";
import manufacturerRoutes from "./routes/manufacturerRoutes.js";
import {notFoundHandler, errorHandler} from "./middlewares/errorHandler.js";
import orderRoutes from "./routes/orderRoutes.js";
import swaggerUi from "swagger-ui-express";
import {swaggerSpec} from "./config/swagger.js";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(httpLogger);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.get("/health", (req, res) => res.json({status: "ok"}));

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use("/api/auth", authRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/promotions", promotionRoutes);
app.use("/api/dealerships", dealershipRoutes);
app.use("/api/manufacturers", manufacturerRoutes);
app.use("/api/orders", orderRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
