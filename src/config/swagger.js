import swaggerJsdoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "EVM Vehicle Sales Management API",
      version: "1.0.0",
      description: `
        Backend for managing electric vehicle sales using Node.js, Express, and MongoDB (Mongoose).
        Features include:
        - User authentication (JWT) and role-based access control (RBAC)
        - Vehicle catalog management (models, versions, stock, prices)
        - Orders, contracts, and promotions
        - Payments (cash, transfer, installments) and debts
        - Customer management (profiles, complaints, feedback)
        - Test drive scheduling
        - Reports & analytics (Excel export, sales, debts)
        - Notifications via Email and SMS
      `,
    },
    servers: [
      { url: "http://localhost:3000/", description: "Local Development" },
      {
        url: "https://electric-vehicle-dealer.onrender.com/api",
        description: "Staging",
      },
      {
        url: "https://electric-vehicle-dealer.onrender.com/",
        description: "Production",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        ApiResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Request successful" },
            data: { type: "object" },
            error: { type: "string", example: "Unauthorized" },
          },
        },
        // Placeholder schemas (expand later for 14 tables: User, Role, Vehicle, Order, Payment, Debt, etc.)
        User: {
          type: "object",
          properties: {
            _id: { type: "string" },
            full_name: { type: "string" },
            email: { type: "string" },
            role: {
              type: "string",
              enum: ["Dealer Staff", "Dealer Manager", "EVM Staff", "Admin"],
            },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        Vehicle: {
          type: "object",
          properties: {
            _id: { type: "string" },
            sku: { type: "string" },
            name: { type: "string" },
            version: { type: "string" },
            color: { type: "string" },
            price: { type: "number" },
            status: {
              type: "string",
              enum: ["in_stock", "allocated", "sold"],
            },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ["./src/routes/*.js", "./src/controllers/*.js"],
};

export const swaggerSpec = swaggerJsdoc(options);
