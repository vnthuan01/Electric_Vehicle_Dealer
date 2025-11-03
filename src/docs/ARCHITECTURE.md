# Architecture Documentation - Electric Dealer Backend

## 1. Tổng quan

**Electric Dealer Backend** là hệ thống quản lý bán hàng xe điện cho đại lý, được xây dựng bằng **Node.js/Express.js** với **MongoDB** và **Mongoose ODM**.

### Tech Stack
- **Runtime**: Node.js 18+
- **Framework**: Express.js 5.1
- **Database**: MongoDB (via Mongoose 8.18)
- **Authentication**: JWT (jsonwebtoken)
- **File Upload**: Multer + Cloudinary
- **Documentation**: Swagger (swagger-jsdoc + swagger-ui-express)
- **Real-time**: Socket.IO
- **Email**: Nodemailer
- **SMS**: Twilio
- **Excel Export**: ExcelJS
- **PDF Generation**: Puppeteer
- **Validation**: Joi
- **Password Hashing**: bcrypt

## 2. Kiến trúc tổng thể

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Applications                     │
│              (Web, Mobile, Admin Dashboard)                 │
└────────────────────────────┬────────────────────────────────┘
                             │
                             │ HTTP/WebSocket
                             │
┌────────────────────────────▼────────────────────────────────┐
│                      Express Server                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Middleware Layer                       │  │
│  │  - CORS, JSON Parser                                 │  │
│  │  - Authentication (JWT)                              │  │
│  │  - Role-based Access Control (RBAC)                  │  │
│  │  - Error Handling                                    │  │
│  │  - Request Logging                                   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                  Route Layer                         │  │
│  │  /api/auth, /api/orders, /api/vehicles, etc.         │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Controller Layer                        │  │
│  │  - Business Logic                                    │  │
│  │  - Request/Response Handling                         │  │
│  │  - Transaction Management                            │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                  Service Layer                        │  │
│  │  - Complex Business Logic                            │  │
│  │  - Report Generation                                 │  │
│  │  - Contract Generation                                │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │               Utility Layer                          │  │
│  │  - JWT, Password, Validation, Pagination             │  │
│  │  - Email, SMS, File Upload, Excel Export             │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────┘
                             │
                             │ Mongoose ODM
                             │
┌────────────────────────────▼────────────────────────────────┐
│                      MongoDB Database                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Collections (27 Models)                 │  │
│  │  - Users, Roles, Customers, Vehicles                 │  │
│  │  - Orders, Payments, Debts, Quotes                   │  │
│  │  - RequestVehicle, OrderRequest, etc.                 │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 3. Cấu trúc thư mục

```
electric-dealer-backend/
├── src/
│   ├── app.js                    # Express app setup
│   ├── server.js                 # Server entry point
│   │
│   ├── config/                   # Configuration files
│   │   ├── db.js                # MongoDB connection
│   │   ├── swagger.js           # Swagger documentation
│   │   ├── socket.js            # Socket.IO setup
│   │   ├── cloudinary.js        # Cloudinary config
│   │   └── twilioClient.js      # Twilio SMS config
│   │
│   ├── controllers/              # Business logic controllers
│   │   ├── orderController.js
│   │   ├── paymentController.js
│   │   ├── debtController.js
│   │   ├── vehicleController.js
│   │   └── ... (20+ controllers)
│   │
│   ├── models/                   # Mongoose schemas (27 models)
│   │   ├── User.js
│   │   ├── Role.js
│   │   ├── Customer.js
│   │   ├── Vehicle.js
│   │   ├── Order.js
│   │   └── ... (22+ models)
│   │
│   ├── routes/                   # Express route definitions
│   │   ├── orderRoutes.js
│   │   ├── paymentRoutes.js
│   │   └── ... (20+ route files)
│   │
│   ├── middlewares/              # Express middlewares
│   │   ├── authMiddleware.js    # JWT authentication
│   │   ├── checkRole.js         # RBAC authorization
│   │   └── errorHandler.js      # Global error handler
│   │
│   ├── services/                 # Business services
│   │   ├── contractService.js   # Contract generation
│   │   ├── quoteServie.js       # Quote generation
│   │   └── reportService.js     # Report generation
│   │
│   ├── utils/                    # Utility functions
│   │   ├── response.js          # Standardized responses
│   │   ├── jwt.js               # JWT helpers
│   │   ├── password.js          # Password hashing
│   │   ├── pagination.js        # Pagination helper
│   │   ├── validator.js         # Joi validation
│   │   ├── mailer.js            # Email service
│   │   ├── sms.js               # SMS service
│   │   ├── fileUpload.js        # Multer + Cloudinary
│   │   ├── excelExport.js       # Excel generation
│   │   └── MessageRes.js        # Centralized messages
│   │
│   ├── enum/                     # Enumerations
│   │   └── roleEnum.js          # Role definitions
│   │
│   ├── jobs/                     # Background jobs
│   │   └── autoDeactivePromotions.js  # Cron jobs
│   │
│   ├── templates/                # Email/Contract templates
│   │   ├── authTemplate.js
│   │   └── contracts/
│   │
│   └── docs/                     # Documentation
│       └── ARCHITECTURE.md       # This file
│
├── uploads/                      # Uploaded files (local storage)
├── .env                          # Environment variables
├── package.json
└── README.md
```

## 4. Design Patterns

### 4.1 MVC Pattern (Model-View-Controller)
- **Models**: Mongoose schemas trong `src/models/`
- **Views**: JSON responses (REST API), Swagger UI
- **Controllers**: Business logic trong `src/controllers/`

### 4.2 Service Layer Pattern
- Tách business logic phức tạp vào `src/services/`
- Controllers gọi services khi cần

### 4.3 Middleware Pattern
- Authentication middleware: JWT verification
- Authorization middleware: RBAC checks
- Error handling middleware: Global error handler

### 4.4 Repository Pattern (implicit)
- Models đóng vai trò repositories
- Controllers tương tác trực tiếp với models

## 5. Luồng xử lý yêu cầu

### 5.1 Authentication Flow
```
1. Client → POST /api/auth/login
2. authController.login()
3. Validate credentials
4. Generate JWT token
5. Return token + user info
```

### 5.2 Protected Route Flow
```
1. Client → GET /api/orders (with JWT token)
2. authMiddleware → Verify JWT
3. checkRole → Verify user role
4. orderController.getOrders()
5. Query MongoDB via Order model
6. Return standardized JSON response
```

### 5.3 Order Creation Flow
```
1. Client → POST /api/orders
2. authenticate → Verify JWT
3. checkRole → Verify DEALER_ROLES
4. orderController.createOrder()
5. Start MongoDB transaction
6. Validate Quote
7. Create Order
8. Update PromotionUsage
9. Commit transaction
10. Return order data
```

## 6. Database Design

### 6.1 Database: MongoDB
- **Type**: NoSQL Document Database
- **ODM**: Mongoose 8.18
- **Collections**: 27 collections tương ứng với 27 models

### 6.2 Relationships
- **One-to-Many**: User → Orders, Customer → Orders
- **Many-to-One**: Orders → Customer, Orders → Dealership
- **Many-to-Many**: Vehicles ↔ Dealerships (via stocks)
- **Embedded Documents**: Order.items[], Vehicle.stocks[]

### 6.3 Indexing Strategy
- **Unique Indexes**: email, code, sku, tax_code
- **Compound Indexes**: dealership_id + status, customer_id + status
- **Text Indexes**: name, full_name (for search)

## 7. Security

### 7.1 Authentication
- **JWT-based**: Access tokens + Refresh tokens
- **Password Hashing**: bcrypt (10 rounds)
- **Token Expiry**: Configurable (default 7 days)

### 7.2 Authorization
- **RBAC**: Role-based access control
- **Roles**: Admin, EVM Staff, Dealer Manager, Dealer Staff
- **Middleware**: `checkRole([...])` per route

### 7.3 Data Validation
- **Input Validation**: Joi schemas
- **Sanitization**: Mongoose built-in
- **SQL Injection**: Not applicable (NoSQL)
- **XSS Protection**: Input sanitization

## 8. API Design

### 8.1 RESTful Principles
- **Resources**: `/api/orders`, `/api/customers`, etc.
- **HTTP Methods**: GET, POST, PUT, PATCH, DELETE
- **Status Codes**: 200, 201, 400, 401, 403, 404, 500

### 8.2 Response Format
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### 8.3 Error Format
```json
{
  "success": false,
  "message": "Error message",
  "error": "Detailed error information"
}
```

## 9. Real-time Features

### 9.1 Socket.IO
- **Use Cases**: Order status updates, RequestVehicle status changes
- **Events**: `requestStatusUpdate`, `orderStatusUpdate`
- **Authentication**: Socket.IO JWT authentication

## 10. Background Jobs

### 10.1 Cron Jobs
- **Auto Deactivate Promotions**: Deactivate expired promotions
- **Scheduled**: Via node-cron

## 11. External Services Integration

### 11.1 Cloudinary
- **Purpose**: Image/file storage
- **Usage**: Vehicle images, contract documents

### 11.2 Twilio
- **Purpose**: SMS notifications
- **Usage**: Test drive confirmations, payment confirmations

### 11.3 Nodemailer
- **Purpose**: Email notifications
- **Usage**: Contract generation, order confirmations

## 12. Error Handling

### 12.1 Centralized Error Handling
- **AppError**: Custom error class
- **Global Handler**: Catches all unhandled errors
- **Logging**: Via utils/logger
- **Response**: Standardized error format

## 13. Testing Strategy

### 13.1 Unit Testing
- **Framework**: Jest (to be implemented)
- **Scope**: Utility functions, helpers

### 13.2 Integration Testing
- **Framework**: Supertest (to be implemented)
- **Scope**: API endpoints, database operations

## 14. Deployment

### 14.1 Environment
- **Development**: `npm run dev` (nodemon)
- **Production**: `npm start` (node)
- **Process Manager**: PM2 (recommended)

### 14.2 Docker
- **Dockerfile**: Multi-stage build
- **docker-compose.yml**: MongoDB + Backend setup

## 15. Performance Considerations

### 15.1 Database
- **Indexing**: Strategic indexes on frequently queried fields
- **Pagination**: All list endpoints support pagination
- **Lean Queries**: Use `.lean()` for read-only operations

### 15.2 Caching
- **Current**: None (can be added with Redis)
- **Future**: Redis for session tokens, query results

### 15.3 Optimization
- **Batch Operations**: Where possible (e.g., bulk debt updates)
- **Transaction Management**: For critical operations
- **Connection Pooling**: Mongoose default pooling

## 16. Scalability

### 16.1 Horizontal Scaling
- **Stateless**: JWT-based auth enables horizontal scaling
- **Load Balancer**: Can run multiple instances
- **Database**: MongoDB Atlas supports sharding

### 16.2 Vertical Scaling
- **Node.js**: Single-threaded, can scale vertically
- **MongoDB**: Vertical scaling for read-heavy workloads

## 17. Monitoring & Logging

### 17.1 Logging
- **HTTP Requests**: Morgan middleware
- **Errors**: Centralized error logger
- **Console**: Development
- **Future**: Winston for production logging

### 17.2 Monitoring
- **Health Check**: `/health` endpoint
- **Future**: APM tools (New Relic, Datadog)

## 18. Documentation

### 18.1 API Documentation
- **Swagger UI**: `/api-docs`
- **OpenAPI Spec**: Generated from JSDoc comments
- **Auto-generated**: From route definitions

### 18.2 Code Documentation
- **JSDoc**: Function-level documentation
- **Comments**: Inline code comments (English)

## 19. Best Practices

### 19.1 Code Style
- **ES Modules**: Import/export syntax
- **Async/Await**: Preferred over callbacks
- **Error Handling**: Try/catch with AppError
- **Validation**: Joi schemas for input validation

### 19.2 Security Best Practices
- **Environment Variables**: Sensitive data in `.env`
- **Password Hashing**: bcrypt (never store plain text)
- **JWT Secrets**: Strong, unique secrets
- **CORS**: Configured appropriately

### 19.3 Database Best Practices
- **Transactions**: For multi-document operations
- **Indexes**: Strategic indexing
- **Soft Deletes**: `is_deleted` flag pattern
- **Timestamps**: Automatic `createdAt`, `updatedAt`

