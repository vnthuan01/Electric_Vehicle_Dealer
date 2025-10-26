import Handlebars from "handlebars";
import fs from "fs";
import path from "path";
import {fileURLToPath} from "url";
import pdf from "html-pdf";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Template PDF Hợp Đồng ---
const DEFAULT_CONTRACT_TEMPLATE = `
<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<title>Hợp Đồng Mua Bán Xe Điện</title>
<style>
  body {
    font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
    margin: 20px;
    font-size: 14px;
    line-height: 1.6;
    color: #333;
    background-color: #f5f6fa;
  }

  h1,h2,h3 { margin: 0; }

  .header {
    text-align: center;
    margin-bottom: 20px;
  }
  .header h1 {
    font-size: 22px;
    color: #1a73e8;
    margin-bottom: 5px;
  }
  .header h2 {
    font-size: 14px;
    color: #555;
  }

  .contract-info {
    text-align: center;
    margin-bottom: 20px;
  }

  .contract-info strong {
    color: #1a73e8;
  }

  .section {
    margin-bottom: 20px;
  }

  .section-title {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 8px;
    color: #1a73e8;
    border-bottom: 1px solid #1a73e8;
    padding-bottom: 4px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 15px;
  }

  th, td {
    border: 1px solid #ccc;
    padding: 8px 10px;
    text-align: left;
    vertical-align: top;
    word-break: break-word;
    white-space: normal;
  }

  th {
    background-color: #e8f0fe;
    font-weight: 600;
    color: #1a73e8;
  }

  .vehicle-card {
    border: 1px solid #ddd;
    border-radius: 6px;
    padding: 12px;
    margin-bottom: 12px;
    background-color: #fff;
  }

  .vehicle-card p {
    font-weight: 600;
    margin-bottom: 6px;
  }

  .vehicle-card ul {
    padding-left: 20px;
    margin: 0;
  }

  .vehicle-card li {
    margin-bottom: 4px;
  }

  .highlight {
    font-weight: 600;
    color: #1a73e8;
  }

  .amount {
    font-weight: bold;
    color: #d93025;
  }

  .note {
    background-color: #eef7ff;
    border-left: 4px solid #1a73e8;
    padding: 8px 12px;
    margin-top: 10px;
    font-style: italic;
    border-radius: 4px;
    color: #333;
  }

  .signature-table {
    width: 100%;
    margin-top: 30px;
    text-align: center;
  }

  .signature-table td {
    height: 80px;
    vertical-align: bottom;
  }

  .signature-table th {
    font-weight: normal;
    padding-bottom: 5px;
  }

  .payment-summary {
    margin-top: 10px;
    border: 1px solid #ccc;
    padding: 10px;
    border-radius: 6px;
    background-color: #fff;
  }

  /* Options / Accessories xuống dòng */
  .vehicle-card li span {
    display: block;
  }
</style>
</head>
<body>
  <div class="header">
    <h2>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h2>
    <h2>Độc Lập – Tự Do – Hạnh Phúc</h2>
    <h1>HỢP ĐỒNG MUA BÁN XE ĐIỆN</h1>
  </div>

  <p class="contract-info">
    Số hợp đồng: <strong>{{contractNumber}}</strong><br/>
    Địa điểm: {{location}}, Ngày {{day}} tháng {{month}} năm {{year}}
  </p>

  <div class="section">
    <div class="section-title">ĐIỀU 1: THÔNG TIN CÁC BÊN</div>
    <table>
      <tr>
        <th style="width:50%">Bên A (Bên bán)</th>
        <th>Bên B (Bên mua)</th>
      </tr>
      <tr>
        <td>
          <div><span class="highlight">Tên đại lý:</span> {{dealership.name}}</div>
          <div><span class="highlight">Địa chỉ:</span> {{dealership.address}}</div>
          <div><span class="highlight">Điện thoại:</span> {{dealership.phone}}</div>
          <div><span class="highlight">MST:</span> {{dealership.tax_code}}</div>
          <div><span class="highlight">Người đại diện:</span> {{dealership.representative}}</div>
        </td>
        <td>
          <div><span class="highlight">Họ và tên:</span> {{customer.full_name}}</div>
          <div><span class="highlight">Địa chỉ:</span> {{customer.address}}</div>
          <div><span class="highlight">Điện thoại:</span> {{customer.phone}}</div>
          <div><span class="highlight">Email:</span> {{customer.email}}</div>
        </td>
      </tr>
    </table>
  </div>

  <div class="section">
    <div class="section-title">ĐIỀU 2: THÔNG TIN XE VÀ GIÁ BÁN</div>
    {{#each vehicles}}
      <div class="vehicle-card">
        <p>Xe {{index}}: {{name}} (Màu: {{#if color}}{{color}}{{else}}Không rõ{{/if}})</p>
        <ul>
          <li>Giá: <span class="amount">{{formatCurrencyVND unit_price}} VNĐ</span></li>
          <li>Số lượng: {{quantity}}</li>
          <li>Khuyến mãi: {{#if promotion}}{{promotion.name}} ({{promotion.type}}){{else}}Không có{{/if}}</li>
          <li>Phụ kiện:
            {{#if accessories.length}}
              {{#each accessories}}
                <span>• {{name}} x{{quantity}} ({{formatCurrencyVND price}} VNĐ/cái = {{formatCurrencyVND total}} VNĐ)</span>
              {{/each}}
            {{else}}Không có{{/if}}
          </li>
          <li>Tùy chọn thêm:
            {{#if options.length}}
              {{#each options}}
                <span>• {{name}} ({{formatCurrencyVND price}} VNĐ)</span>
              {{/each}}
            {{else}}Không có{{/if}}
          </li>
          <li><strong>Tổng giá trị:</strong> <span class="amount">{{formatCurrencyVND final_amount}} VNĐ</span></li>
        </ul>
      </div>
    {{/each}}

    <div class="payment-summary">
      <div><strong>Phương thức thanh toán:</strong> {{paymentMethodText}}</div>
      <div><strong>Đã thanh toán:</strong> <span class="amount">{{formatCurrencyVND paidAmount}} VNĐ</span></div>
      <div><strong>Còn lại:</strong> <span class="amount">{{formatCurrencyVND remainingAmount}} VNĐ</span></div>
    </div>
  </div>
  <div class="section">
  <div class="section-title">ĐIỀU 3: NHẬN XE</div>
  <p>
    Xe sẽ được giao tại địa chỉ đại lý: {{dealership.address}}<br />
    Hoặc giao xe đến địa chỉ: {{deliveryAddress}}<br />
    Ngày giao xe dự kiến: {{deliveryDate}}<br />
    Khách hàng chịu trách nhiệm nhận xe và các giấy tờ liên quan.
  </p>
</div>

<div class="section">
  <div class="section-title">ĐIỀU 4: BẢO HÀNH VÀ TRÁCH NHIỆM</div>
  <ol>
    <li>Bên A cam kết cung cấp bảo hành chính hãng theo quy định.</li>
    <li>Bên B có trách nhiệm sử dụng xe đúng hướng dẫn và bảo quản xe.</li>
    <li>Xe chỉ hoạt động tốt khi sử dụng pin và thiết bị sạc chính hãng.</li>
    <li>Mọi tranh chấp sẽ được giải quyết thông qua đàm phán, hòa giải.</li>
  </ol>
</div>

<div class="section">
  <div class="section-title">ĐIỀU 5: CHUYỂN RỦI RO VÀ QUYỀN SỞ HỮU</div>
  <p>
    Toàn bộ quyền sở hữu, rủi ro và lợi ích liên quan đến xe sẽ chuyển giao cho Khách hàng khi xe được bàn giao hoặc khi Khách hàng thanh toán đầy đủ giá trị hợp đồng.
  </p>
</div>

<div class="section">
  <div class="section-title">ĐIỀU 6: BẢO VỆ DỮ LIỆU CÁ NHÂN</div>
  <p>
    Khách hàng đồng ý cho Bên bán xử lý dữ liệu cá nhân liên quan đến việc vận hành, bảo trì và các tính năng thông minh của xe theo quy định pháp luật hiện hành.
  </p>
</div>

<div class="section">
  <div class="section-title">ĐIỀU 7: CÁC ĐIỀU KHOẢN KHÁC</div>
  <ol>
    <li>Hợp đồng có hiệu lực kể từ ngày ký.</li>
    <li>Mọi thay đổi hợp đồng phải được thỏa thuận bằng văn bản.</li>
    <li>Hợp đồng được lập thành 2 bản có giá trị pháp lý như nhau.</li>
  </ol>
</div>
  {{#if notes}}
    <p class="note"><strong>Ghi chú:</strong> {{notes}}</p>
  {{/if}}

  <table class="signature-table">
    <tr>
      <th>ĐẠI DIỆN BÊN A</th>
      <th>ĐẠI DIỆN BÊN B</th>
    </tr>
    <tr>
      <td>(Ký, ghi rõ họ tên)</td>
      <td>(Ký, ghi rõ họ tên)</td>
    </tr>
  </table>
  <p style="text-align: center; margin-top: 15px; font-style: italic; color: #555;">
    <strong>Hợp đồng mẫu</strong> {{template_name}}
  </p>
</body>
</html>
`;
// Helper để format tiền tệ
Handlebars.registerHelper("formatCurrencyVND", function (amount) {
  if (!amount) return "0";
  return new Intl.NumberFormat("vi-VN").format(amount);
});

/**
 * Tạo hợp đồng PDF từ template
 * @param {Object} orderData - Dữ liệu đơn hàng
 * @param {Object} templateData - Dữ liệu template (tùy chọn)
 * @returns {Buffer} - PDF buffer
 */

// Hàm generate PDF
export async function generateContractPDF(
  orderData,
  templateData = {},
  template_name
) {
  const contractData = {
    contractNumber: orderData.code || `HD${Date.now()}`,
    location: templateData.location || "Thành phố Hồ Chí Minh",
    day: new Date().getDate(),
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),

    dealership: {
      name: templateData.dealership?.name || "Đại lý xe điện ABC",
      address:
        templateData.dealership?.address || "123 Đường ABC, Quận 1, TP.HCM",
      phone: templateData.dealership?.phone || "0123 456 789",
      tax_code: templateData.dealership?.tax_code || "0123456789",
      representative: templateData.dealership?.representative || "Nguyễn Văn A",
    },

    customer: {
      full_name: orderData.customer_id?.full_name || "Khách hàng",
      address: orderData.customer_id?.address || "Chưa có địa chỉ",
      phone: orderData.customer_id?.phone || "",
      email: orderData.customer_id?.email || "",
    },

    vehicles:
      orderData.items?.map((item, index) => ({
        index: index + 1, // số thứ tự xe
        name: item.vehicle_name || "Xe điện",
        color: item.color || "Không rõ",
        unit_price: item.vehicle_price || 0,
        quantity: item.quantity || 1,
        discount: item.discount || 0,
        final_amount: item.final_amount || 0,
        accessories:
          item.accessories?.map((a) => ({
            name: a.name,
            quantity: a.quantity,
            price: a.price,
            total: a.price * a.quantity,
          })) || [],
        options:
          item.options?.map((o) => ({
            name: o.name,
            price: o.price,
          })) || [],
        promotion: item.promotion_id
          ? {
              name: item.promotion_id.name,
              type: item.promotion_id.type,
            }
          : null,
      })) || [],

    totalAmount: orderData.final_amount || 0,
    paidAmount: orderData.paid_amount || 0,
    remainingAmount:
      (orderData.final_amount || 0) - (orderData.paid_amount || 0),

    paymentMethodText:
      orderData.payment_method === "installment"
        ? "Trả góp qua ngân hàng"
        : "Thanh toán tiền mặt",

    deliveryAddress:
      orderData.delivery?.delivery_address?.full_address ||
      "Địa chỉ giao xe theo thỏa thuận",
    deliveryDate: orderData.delivery?.scheduled_date
      ? new Date(orderData.delivery.scheduled_date).toLocaleDateString("vi-VN")
      : "Theo thỏa thuận",
    deliveryNotes: orderData.delivery?.notes || "Không có ghi chú",

    notes: orderData.notes || "",
  };

  let templateHtml;

  if (typeof template_name === "string") {
    const templatePath = path.join(
      __dirname,
      "../templates/contracts",
      `${template_name}.html`
    );
    if (fs.existsSync(templatePath)) {
      templateHtml = fs.readFileSync(templatePath, "utf8");
    } else {
      console.warn(`Template ${template_name} không tồn tại, dùng mặc định`);
      templateHtml = DEFAULT_CONTRACT_TEMPLATE;
    }
  } else if (template_name?.html) {
    templateHtml = template_name.html;
  } else {
    templateHtml = DEFAULT_CONTRACT_TEMPLATE;
  }

  const template = Handlebars.compile(templateHtml);
  const html = template(contractData);

  return new Promise((resolve, reject) => {
    pdf
      .create(html, {
        format: "A4",
        border: {top: "20mm", right: "15mm", bottom: "20mm", left: "15mm"},
        type: "pdf",
        timeout: 30000,
      })
      .toBuffer((err, buffer) => {
        if (err) return reject(err);
        resolve(buffer);
      });
  });
}

/**
 * Lưu template hợp đồng tùy chỉnh
 * @param {string} templateName - Tên template
 * @param {string} htmlContent - Nội dung HTML template
 * @param {string} description - Mô tả template
 */
export async function saveCustomTemplate(
  templateName,
  htmlContent,
  description
) {
  try {
    // 🔹 Chuẩn hóa tên file
    const safeName = templateName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");

    // Đường dẫn lưu file
    const templateDir = path.join(__dirname, "../templates/contracts");
    const templatePath = path.join(templateDir, `${safeName}.html`);

    // Tạo thư mục nếu chưa có
    if (!fs.existsSync(templateDir)) {
      fs.mkdirSync(templateDir, { recursive: true });
    }

    // Lưu file HTML
    fs.writeFileSync(templatePath, htmlContent);

    // Lưu metadata
    const metadata = {
      name: templateName,
      file: `${safeName}.html`,
      description,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    fs.writeFileSync(
      path.join(templateDir, `${safeName}.json`),
      JSON.stringify(metadata, null, 2)
    );

    return { success: true, path: templatePath };
  } catch (error) {
    console.error("Error saving custom template:", error);
    throw new Error(`Failed to save template: ${error.message}`);
  }
}

/**
 * Lấy danh sách templates có sẵn
 */
export async function getAvailableTemplates() {
  try {
    const templatesDir = path.join(__dirname, "../templates/contracts");
    const templates = [];

    if (fs.existsSync(templatesDir)) {
      const files = fs.readdirSync(templatesDir);
      const htmlFiles = files.filter((file) => file.endsWith(".html"));

      for (const htmlFile of htmlFiles) {
        const templateName = htmlFile.replace(".html", "");
        const metadataPath = path.join(templatesDir, `${templateName}.json`);

        let metadata = {
          name: templateName,
          description: "",
          created_at: null,
          updated_at: null,
        };

        if (fs.existsSync(metadataPath)) {
          try {
            const fileContent = fs.readFileSync(metadataPath, "utf8");
            const parsed = JSON.parse(fileContent);
            console.log(`Loaded metadata for ${templateName}:`, parsed);
            metadata = { ...metadata, ...parsed };
          } catch (err) {
            console.warn(`Lỗi đọc metadata của ${templateName}:`, err.message);
          }
        } else {
          console.warn(`Không tìm thấy file metadata cho ${templateName}`);
        }

        templates.push(metadata);
      }
    }

    // Thêm template mặc định
    templates.unshift({
      name: "default",
      description: "Template mặc định cho hợp đồng mua bán xe điện",
    });

    return templates;
  } catch (error) {
    console.error("Error getting available templates:", error);
    return [{ name: "default", description: "Template mặc định" }];
  }
}
