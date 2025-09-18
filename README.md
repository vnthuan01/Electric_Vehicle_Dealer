# Electric Dealer Backend

Backend chuẩn cho hệ thống quản lý bán hàng xe điện cho đại lý.

## Tính năng

- Auth: đăng ký, đăng nhập (JWT)
- Quản lý sản phẩm, khách hàng, hóa đơn, bảo hành (CRUD)
- Upload file, gửi email, gửi SMS, xuất Excel
- Log HTTP, chuẩn lỗi JSON

## Yêu cầu

- Node.js 18+
- MongoDB (Atlas hoặc Docker)

## Cài đặt

```bash
npm install
cp .env.example .env
# chỉnh sửa .env
```

## Chạy local

```bash
npm run dev
# API: http://localhost:5000
# Swagger-UI: http://localhost:5000/api-docs
```

## Cấu hình .env

```env
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/electric-dealer
JWT_SECRET=supersecretkey
MAIL_USER=yourmail@gmail.com
MAIL_PASS=yourpassword
TWILIO_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_auth
TWILIO_PHONE=+1234567890
```

## API chính

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET/POST/PUT/DELETE /api/products`
- `GET/POST/PUT/DELETE /api/customers`
- `GET/POST/PUT/DELETE /api/invoices`
- `GET/POST/PUT/DELETE /api/warranty`

Chuẩn lỗi JSON:

```json
{"success": false, "errorCode": 1003, "message": "Sản phẩm không tồn tại"}
```

## Docker

```bash
docker compose up --build
# Backend: http://localhost:5000
# Mongo Express: http://localhost:8081
```

## Deploy

- PM2: `pm2 start src/server.js --name electric-dealer`
- Docker image: build từ Dockerfile
- CI/CD: GitHub Actions/GitLab CI (tùy chọn)

## License

ISC
