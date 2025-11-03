# Documentation - Electric Dealer Backend

## Overview

Thư mục này chứa tài liệu kỹ thuật về kiến trúc và database design của Electric Dealer Backend.

## Files

### 1. `ARCHITECTURE.md`
Tài liệu chi tiết về kiến trúc của hệ thống:
- Tổng quan hệ thống
- Tech stack
- Cấu trúc thư mục
- Design patterns
- Luồng xử lý yêu cầu
- Database design
- Security
- API design
- Real-time features
- Background jobs
- External services integration
- Error handling
- Testing strategy
- Deployment
- Performance considerations
- Scalability
- Monitoring & logging
- Best practices

### 2. `ERD.md`
Tài liệu về Entity Relationship Diagram:
- ERD diagram (MermaidJS format)
- Relationship definitions
- Entity descriptions
- Key relationships
- Embedded documents notes

### 3. `ERD.mermaid`
File MermaidJS thuần túy chứa ERD diagram:
- Có thể copy/paste vào [Mermaid Live Editor](https://mermaid.live)
- Có thể render trong GitHub (tự động render trong markdown)
- Có thể render trong VS Code với Mermaid extension
- Có thể render trong Jira, Confluence, Notion (nếu hỗ trợ Mermaid)

## Usage

### View ERD in GitHub
ERD sẽ tự động render trong `ERD.md` khi xem trên GitHub.

### View ERD in Mermaid Live Editor
1. Mở [Mermaid Live Editor](https://mermaid.live)
2. Copy nội dung từ `ERD.mermaid`
3. Paste vào editor
4. ERD sẽ tự động render

### View ERD in VS Code
1. Cài đặt extension "Markdown Preview Mermaid Support" hoặc "Mermaid Preview"
2. Mở `ERD.md` hoặc `ERD.mermaid`
3. Preview diagram

### View ERD in Markdown Editors
Nhiều markdown editors hỗ trợ Mermaid:
- Typora
- Obsidian
- Notion (nếu có Mermaid support)

## ERD Key

### Relationship Types
- `||--o{` : One-to-Many (1:N)
- `}o--||` : Many-to-One (N:1)
- `}o--o{` : Many-to-Many (N:M)
- `||--||` : One-to-One (1:1)
- `}o--o|` : Optional relationship

### Entity Attributes
- **PK**: Primary Key
- **FK**: Foreign Key
- **UK**: Unique Key

## Models Overview

Hệ thống có **27 models**:

### Core Models
1. **User** - Người dùng hệ thống
2. **Role** - Vai trò (Admin, EVM Staff, Dealer Manager, Dealer Staff)
3. **Customer** - Khách hàng
4. **Dealership** - Đại lý
5. **Manufacturer** - Hãng xe

### Product Models
6. **Vehicle** - Xe điện (ô tô/xe máy điện)
7. **Accessory** - Phụ kiện
8. **Option** - Tùy chọn

### Order Management Models
9. **Order** - Đơn hàng
10. **Quote** - Báo giá
11. **OrderRequest** - Yêu cầu đơn hàng
12. **OrderStatusLog** - Lịch sử thay đổi trạng thái đơn hàng

### Payment & Debt Models
13. **Payment** - Thanh toán
14. **Debt** - Công nợ khách hàng
15. **DealerManufacturerDebt** - Công nợ đại lý ↔ hãng
16. **Installment** - Trả góp (deprecated, dùng BankLoan)

### Inventory Models
17. **RequestVehicle** - Yêu cầu nhập xe

### Promotion Models
18. **Promotion** - Khuyến mãi
19. **PromotionUsage** - Sử dụng khuyến mãi

### Banking Models
20. **Bank** - Ngân hàng
21. **BankLoan** - Khoản vay ngân hàng
22. **BankProfile** - Hồ sơ ngân hàng (deprecated)

### Additional Models
23. **TestDrive** - Lái thử xe
24. **Feedback** - Phản hồi/khuyến nại
25. **RefreshToken** - Refresh token cho JWT

## Main Relationships

### 1. User Management
- User → Role (Many-to-One)
- User → Dealership (Many-to-One, optional)
- User → Manufacturer (Many-to-One, optional)

### 2. Order Processing
- Customer → Quote → Order → Payment
- Order → Debt (Customer Debt)
- Order → BankLoan (if installment)
- Order → OrderRequest → RequestVehicle (if out of stock)
- RequestVehicle → DealerManufacturerDebt (Dealer-Manufacturer Debt)

### 3. Inventory Management
- Vehicle has embedded stocks[] array
- RequestVehicle creates stock entries in Vehicle.stocks[]
- Order tracks used stocks via items[].used_stocks[]

### 4. Debt Management
- Customer Debt: Customer → Order → Debt
- Dealer-Manufacturer Debt: RequestVehicle → DealerManufacturerDebt
- Order payments settle DealerManufacturerDebt items

### 5. Promotion System
- Promotion → PromotionUsage (track usage)
- Promotion can be applied to Quote and Order

## Notes

- Tất cả models có `timestamps: true` (createdAt, updatedAt)
- Nhiều models sử dụng soft delete pattern với `is_deleted` flag
- Embedded documents: Vehicle.stocks[], Order.items[], DealerManufacturerDebt.items[]
- FIFO stock tracking via `used_stocks[]` in Order.items[]

