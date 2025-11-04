# ERD (Entity Relationship Diagram) - Electric Dealer Backend

## ERD Diagram - MermaidJS Format

```mermaid
erDiagram
    %% ========== CORE ENTITIES ==========
    
    User ||--o{ Role : "has"
    User }o--o| Dealership : "belongs to"
    User }o--o| Manufacturer : "belongs to"
    
    Customer }o--|| Dealership : "belongs to"
    Customer ||--o{ Order : "places"
    Customer ||--o{ Quote : "requests"
    Customer ||--o{ Debt : "owes"
    Customer ||--o{ TestDrive : "schedules"
    Customer ||--o{ Feedback : "submits"
    Customer ||--o{ BankLoan : "applies for"
    Customer ||--o{ BankProfile : "has"
    Customer ||--o{ PromotionUsage : "uses"
    
    Vehicle }o--|| Manufacturer : "produced by"
    Vehicle ||--o{ Order : "included in"
    Vehicle ||--o{ Quote : "quoted in"
    Vehicle ||--o{ RequestVehicle : "requested"
    Vehicle ||--o{ TestDrive : "tested"
    Vehicle ||--o{ PromotionUsage : "promoted"
    
    %% ========== ORDER MANAGEMENT ==========
    
    Order }o--|| Customer : "for"
    Order }o--|| Dealership : "processed by"
    Order }o--o| User : "sold by (salesperson)"
    Order }o--o| Quote : "created from"
    Order ||--o{ Payment : "has"
    Order ||--o| Debt : "generates"
    Order ||--o| BankLoan : "has"
    Order ||--o| OrderRequest : "creates"
    Order ||--o{ RequestVehicle : "fulfilled by"
    Order ||--o{ OrderStatusLog : "logged"
    Order }o--o| Promotion : "applies"
    Order }o--o{ Accessory : "includes"
    Order }o--o{ Option : "includes"
    
    Quote ||--o{ Order : "converted to"
    Quote }o--o| Promotion : "applies"
    Quote }o--o{ Accessory : "includes"
    Quote }o--o{ Option : "includes"
    
    Payment }o--|| Order : "for"
    Payment }o--|| Customer : "from"
    
    Debt }o--|| Order : "from"
    Debt }o--|| Customer : "owed by"
    
    OrderRequest ||--o{ RequestVehicle : "creates"
    OrderRequest }o--o| Order : "fulfills"
    OrderRequest }o--|| Dealership : "requested by"
    OrderRequest }o--|| User : "requested by"
    OrderRequest }o--o| User : "approved by"
    OrderRequest }o--o| User : "rejected by"
    
    RequestVehicle }o--|| Vehicle : "requests"
    RequestVehicle }o--|| Dealership : "requested by"
    RequestVehicle }o--o| DealerManufacturerDebt : "creates"
    RequestVehicle }o--o| OrderRequest : "from"
    RequestVehicle }o--o| Order : "fulfills"
    
    OrderStatusLog }o--|| Order : "tracks"
    OrderStatusLog }o--|| Customer : "for"
    OrderStatusLog }o--|| Dealership : "at"
    OrderStatusLog }o--|| User : "changed by"
    
    %% ========== INVENTORY MANAGEMENT ==========
    
    Vehicle ||--o{ VehicleStock : "has (embedded)"
    VehicleStock }o--o| RequestVehicle : "from"
    VehicleStock }o--o| Dealership : "owned by"
    VehicleStock }o--o| Manufacturer : "owned by"
    
    %% ========== DEBT MANAGEMENT ==========
    
    DealerManufacturerDebt }o--|| Dealership : "owed by"
    DealerManufacturerDebt }o--|| Manufacturer : "owed to"
    DealerManufacturerDebt ||--o{ RequestVehicle : "from"
    DealerManufacturerDebt ||--o{ Order : "settled by"
    DealerManufacturerDebt ||--o{ Payment : "paid via"
    
    %% ========== PROMOTION MANAGEMENT ==========
    
    Promotion ||--o{ PromotionUsage : "used in"
    Promotion }o--o{ Dealership : "allocated to"
    Promotion }o--o{ Order : "applied to"
    Promotion }o--o{ Quote : "applied to"
    
    PromotionUsage }o--|| Customer : "for"
    PromotionUsage }o--|| Vehicle : "for"
    PromotionUsage }o--|| Promotion : "uses"
    PromotionUsage }o--o| Order : "in"
    PromotionUsage }o--o| Quote : "in"
    
    %% ========== BANKING & LOANS ==========
    
    Bank ||--o{ BankLoan : "provides"
    Bank ||--o{ BankProfile : "has profile"
    
    BankLoan }o--|| Order : "for"
    BankLoan }o--|| Customer : "for"
    BankLoan }o--|| Dealership : "at"
    BankLoan }o--|| Bank : "from"
    BankLoan }o--o| Payment : "disbursed via"
    BankLoan }o--o| User : "created by"
    BankLoan }o--o| User : "submitted by"
    BankLoan }o--o| User : "approved by"
    BankLoan }o--o| User : "rejected by"
    
    BankProfile }o--|| Order : "for"
    BankProfile }o--|| Customer : "for"
    BankProfile }o--|| Dealership : "at"
    
    Installment }o--|| Order : "for"
    Installment }o--|| Customer : "for"
    
    %% ========== ADDITIONAL FEATURES ==========
    
    TestDrive }o--|| Customer : "for"
    TestDrive }o--|| Vehicle : "of"
    TestDrive }o--|| Dealership : "at"
    TestDrive }o--o| User : "assigned to"
    
    Feedback }o--|| Customer : "from"
    Feedback }o--|| Dealership : "to"
    Feedback }o--o{ User : "commented by"
    
    Dealership }o--|| Manufacturer : "represents"
    Dealership ||--o{ User : "has staff"
    Dealership ||--o{ Customer : "serves"
    Dealership ||--o{ Order : "processes"
    Dealership ||--o{ OrderRequest : "makes"
    Dealership ||--o{ RequestVehicle : "requests"
    Dealership ||--o{ DealerManufacturerDebt : "owes"
    Dealership ||--o{ Promotion : "allocated"
    Dealership ||--o{ TestDrive : "provides"
    Dealership ||--o{ Feedback : "receives"
    
    Manufacturer ||--o{ Vehicle : "produces"
    Manufacturer ||--o{ Dealership : "has"
    Manufacturer ||--o{ User : "has staff"
    Manufacturer ||--o{ DealerManufacturerDebt : "owed by"
    
    %% ========== ENTITY DEFINITIONS ==========
    
    User {
        ObjectId _id PK
        String full_name
        String email UK
        String phone
        String password
        ObjectId role_id FK
        ObjectId dealership_id FK
        ObjectId manufacturer_id FK
    }
    
    Role {
        ObjectId _id PK
        String name UK "Dealer Staff|Dealer Manager|EVM Staff|Admin"
    }
    
    Customer {
        ObjectId _id PK
        String full_name
        String phone
        String email
        ObjectId dealership_id FK
    }
    
    Vehicle {
        ObjectId _id PK
        String name
        String sku UK
        String category "car|motorbike"
        ObjectId manufacturer_id FK
        Number price
        Array stocks "embedded"
        Array images
    }
    
    Order {
        ObjectId _id PK
        String code UK
        ObjectId customer_id FK
        ObjectId dealership_id FK
        ObjectId salesperson_id FK
        ObjectId quote_id FK
        Array items "embedded"
        Number final_amount
        Number paid_amount
        String status
        ObjectId bank_loan_id FK
        ObjectId order_request_id FK
    }
    
    Quote {
        ObjectId _id PK
        String code UK
        ObjectId customer_id FK
        Array items "embedded"
        Number final_amount
        String status
    }
    
    Payment {
        ObjectId _id PK
        ObjectId order_id FK
        ObjectId customer_id FK
        String method "cash|bank|qr|card"
        Number amount
        Date paid_at
    }
    
    Debt {
        ObjectId _id PK
        ObjectId customer_id FK
        ObjectId order_id FK
        Number total_amount
        Number paid_amount
        Number remaining_amount
        String status
    }
    
    RequestVehicle {
        ObjectId _id PK
        ObjectId vehicle_id FK
        ObjectId dealership_id FK
        String color
        Number quantity
        String status
        ObjectId debt_id FK
        ObjectId order_request_id FK
        ObjectId order_id FK
    }
    
    OrderRequest {
        ObjectId _id PK
        String code UK
        ObjectId requested_by FK
        ObjectId approved_by FK
        ObjectId rejected_by FK
        ObjectId dealership_id FK
        ObjectId order_id FK
        Array items "embedded"
        String status
    }
    
    OrderStatusLog {
        ObjectId _id PK
        ObjectId order_id FK
        ObjectId customer_id FK
        ObjectId dealership_id FK
        String old_status
        String new_status
        ObjectId changed_by FK
    }
    
    DealerManufacturerDebt {
        ObjectId _id PK
        ObjectId dealership_id FK
        ObjectId manufacturer_id FK
        Number total_amount
        Number paid_amount
        Number remaining_amount
        String status
        Array items "embedded"
        Array payments "embedded"
    }
    
    Promotion {
        ObjectId _id PK
        String name
        String type "service|gift"
        Number value
        Date start_date
        Date end_date
        Boolean is_active
        Array dealerships "FK"
    }
    
    PromotionUsage {
        ObjectId _id PK
        ObjectId customer_id FK
        ObjectId vehicle_id FK
        ObjectId promotion_id FK
        ObjectId order_id FK
        ObjectId quote_id FK
        String status
    }
    
    Bank {
        ObjectId _id PK
        String name UK
        String code UK
        Object default_settings "embedded"
    }
    
    BankLoan {
        ObjectId _id PK
        ObjectId order_id FK UK
        ObjectId customer_id FK
        ObjectId dealership_id FK
        ObjectId bank_id FK
        Number loan_amount
        Number down_payment
        Number loan_term_months
        Number interest_rate
        String status
    }
    
    BankProfile {
        ObjectId _id PK
        ObjectId order_id FK
        ObjectId customer_id FK
        ObjectId dealership_id FK
        String bank_name
        Number loan_amount
        String status
    }
    
    Installment {
        ObjectId _id PK
        ObjectId order_id FK
        ObjectId customer_id FK
        Number loan_amount
        Number tenure_months
        String status
    }
    
    TestDrive {
        ObjectId _id PK
        ObjectId customer_id FK
        ObjectId vehicle_id FK
        ObjectId dealership_id FK
        Date schedule_at
        String status
        ObjectId assigned_staff_id FK
    }
    
    Feedback {
        ObjectId _id PK
        ObjectId customer_id FK
        ObjectId dealership_id FK
        String content
        String status
        Array comments "embedded"
    }
    
    Accessory {
        ObjectId _id PK
        String name
        Number price
        String type
    }
    
    Option {
        ObjectId _id PK
        String name
        Number price
        String category
    }
    
    Dealership {
        ObjectId _id PK
        String code UK
        String company_name
        String tax_code UK
        ObjectId manufacturer_id FK
        Object address "embedded"
        Object contact "embedded"
        String status
    }
    
    Manufacturer {
        ObjectId _id PK
        String name
        String code UK
        String country
    }
    
    RefreshToken {
        ObjectId _id PK
        ObjectId user FK
        String token UK
        Date createdAt
    }
```

## ERD Key Relationships

### 1. User Management
- **User** → **Role** (Many-to-One): Mỗi user có một role
- **User** → **Dealership** (Many-to-One, optional): User thuộc đại lý
- **User** → **Manufacturer** (Many-to-One, optional): User thuộc hãng xe

### 2. Order Processing Flow
1. **Customer** tạo **Quote**
2. **Quote** được convert thành **Order**
3. **Order** tạo **Debt** (công nợ khách hàng)
4. **Customer** thanh toán → **Payment**
5. **Payment** cập nhật **Debt**
6. **Order** có thể tạo **OrderRequest** nếu hết xe
7. **OrderRequest** tạo nhiều **RequestVehicle**
8. **RequestVehicle** được approve → tạo stock trong **Vehicle**
9. **Order** sử dụng stock từ **Vehicle.stocks[]**

### 3. Inventory Management
- **Vehicle** có embedded **stocks[]** array
- Mỗi stock entry có `owner_type` (manufacturer/dealer) và `owner_id`
- **RequestVehicle** khi được approve → tạo stock entry
- **Order** sử dụng stock và track trong `items[].used_stocks[]`

### 4. Debt Management
- **Customer Debt**: **Debt** model (khách hàng → đại lý)
- **Dealer-Manufacturer Debt**: **DealerManufacturerDebt** model
- **RequestVehicle** tạo **DealerManufacturerDebt** items
- **Order** payments settle **DealerManufacturerDebt** items
- Tracking chi tiết qua `settled_by_orders[]`

### 5. Promotion System
- **Promotion** được allocate cho **Dealerships**
- **PromotionUsage** track việc sử dụng promotion cho từng customer+vehicle
- **Quote** và **Order** có thể apply promotion
- Mỗi promotion chỉ dùng 1 lần per customer+vehicle

### 6. Banking & Loans
- **Bank** cung cấp **BankLoan**
- **Order** có `payment_method = "installment"` → tạo **BankLoan**
- **BankLoan** có workflow: pending → submitted → approved → funded
- **BankProfile** (deprecated, dùng **BankLoan** thay thế)

## Relationship Types

- **One-to-Many (1:N)**: `||--o{` - Một entity có nhiều related entities
- **Many-to-One (N:1)**: `}o--||` - Nhiều entities thuộc về một entity
- **Many-to-Many (N:M)**: `}o--o{` - Nhiều-to-nhiều relationship
- **One-to-One (1:1)**: `||--||` - Một-to-một relationship
- **Optional**: `}o--o|` - Optional relationship

## Embedded Documents

Một số fields là embedded documents (không có collection riêng):

1. **Vehicle.stocks[]**: Stock entries embedded trong Vehicle
2. **Order.items[]**: Order items với used_stocks tracking
3. **Quote.items[]**: Quote items
4. **DealerManufacturerDebt.items[]**: Debt items với settled_by_orders
5. **Feedback.comments[]**: Comments embedded trong Feedback

## Notes

- **PK**: Primary Key
- **FK**: Foreign Key
- **UK**: Unique Key
- Tất cả models có `timestamps: true` (createdAt, updatedAt)
- Nhiều models có `is_deleted` flag cho soft delete pattern

