import puppeteer from "puppeteer-core";
import Handlebars from "handlebars";
import fs from "fs";
import path from "path";
import {fileURLToPath} from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Template mẫu cho hợp đồng mua bán xe điện
const DEFAULT_CONTRACT_TEMPLATE = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Hợp đồng mua bán xe điện</title>
    <style>
        body {
            font-family: 'Times New Roman', serif;
            font-size: 13px;
            line-height: 1.5;
            margin: 40px;
            color: #333;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .title {
            font-size: 18px;
            font-weight: bold;
            text-transform: uppercase;
            margin-bottom: 10px;
        }
        .subtitle {
            font-size: 14px;
            font-style: italic;
        }
        .section {
            margin-bottom: 20px;
        }
        .section-title {
            font-weight: bold;
            margin-bottom: 10px;
            text-decoration: underline;
        }
        .info-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
        }
        .info-table td {
            padding: 5px 10px;
            border: 1px solid #ddd;
            vertical-align: top;
        }
        .label {
            font-weight: bold;
            width: 30%;
            background-color: #f5f5f5;
        }
        .signature-section {
            margin-top: 40px;
            display: flex;
            justify-content: space-between;
        }
        .signature-box {
            text-align: center;
            width: 45%;
        }
        .date-location {
            margin-bottom: 30px;
            text-align: right;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="title">Hợp đồng mua bán xe điện</div>
        <div class="subtitle">Số: {{contractNumber}}</div>
    </div>

    <div class="date-location">
        <strong>{{location}}</strong>, ngày {{day}} tháng {{month}} năm {{year}}
    </div>

    <div class="section">
        <div class="section-title">ĐIỀU 1: THÔNG TIN CÁC BÊN</div>
        
        <p><strong>Bên A (Bên bán):</strong></p>
        <table class="info-table">
            <tr>
                <td class="label">Tên đại lý:</td>
                <td>{{dealership.name}}</td>
            </tr>
            <tr>
                <td class="label">Địa chỉ:</td>
                <td>{{dealership.address}}</td>
            </tr>
            <tr>
                <td class="label">Điện thoại:</td>
                <td>{{dealership.phone}}</td>
            </tr>
            <tr>
                <td class="label">Mã số thuế:</td>
                <td>{{dealership.tax_code}}</td>
            </tr>
            <tr>
                <td class="label">Người đại diện:</td>
                <td>{{dealership.representative}}</td>
            </tr>
        </table>

        <p><strong>Bên B (Bên mua):</strong></p>
        <table class="info-table">
            <tr>
                <td class="label">Họ và tên:</td>
                <td>{{customer.full_name}}</td>
            </tr>
            <tr>
                <td class="label">Ngày sinh:</td>
                <td>{{customer.date_of_birth}}</td>
            </tr>
            <tr>
                <td class="label">Số CMND/CCCD:</td>
                <td>{{customer.id_card}}</td>
            </tr>
            <tr>
                <td class="label">Địa chỉ:</td>
                <td>{{customer.address}}</td>
            </tr>
            <tr>
                <td class="label">Điện thoại:</td>
                <td>{{customer.phone}}</td>
            </tr>
            <tr>
                <td class="label">Email:</td>
                <td>{{customer.email}}</td>
            </tr>
        </table>
    </div>

    <div class="section">
        <div class="section-title">ĐIỀU 2: THÔNG TIN XE ĐIỆN</div>
        <table class="info-table">
            {{#each vehicles}}
            <tr>
                <td class="label">Xe {{@index}}</td>
                <td>
                    <strong>{{vehicle_name}}</strong><br>
                    Giá: {{formatCurrency vehicle_price}} VNĐ<br>
                    Số lượng: {{quantity}}<br>
                    {{#if options}}
                    Tùy chọn: {{#each options}}{{name}} ({{formatCurrency price}} VNĐ){{#unless @last}}, {{/unless}}{{/each}}<br>
                    {{/if}}
                    {{#if accessories}}
                    Phụ kiện: {{#each accessories}}{{name}} x {{quantity}} ({{formatCurrency price}} VNĐ){{#unless @last}}, {{/unless}}{{/each}}<br>
                    {{/if}}
                    {{#if discount}}
                    Giảm giá: {{formatCurrency discount}} VNĐ<br>
                    {{/if}}
                    <strong>Thành tiền: {{formatCurrency final_amount}} VNĐ</strong>
                </td>
            </tr>
            {{/each}}
        </table>
    </div>

    <div class="section">
        <div class="section-title">ĐIỀU 3: GIÁ TRỊ VÀ PHƯƠNG THỨC THANH TOÁN</div>
        <table class="info-table">
            <tr>
                <td class="label">Tổng giá trị hợp đồng:</td>
                <td><strong>{{formatCurrency totalAmount}} VNĐ</strong></td>
            </tr>
            <tr>
                <td class="label">Phương thức thanh toán:</td>
                <td>{{paymentMethodText}}</td>
            </tr>
            {{#if downPayment}}
            <tr>
                <td class="label">Số tiền đặt cọc:</td>
                <td>{{formatCurrency downPayment}} VNĐ</td>
            </tr>
            {{/if}}
            {{#if remainingAmount}}
            <tr>
                <td class="label">Số tiền còn lại:</td>
                <td>{{formatCurrency remainingAmount}} VNĐ</td>
            </tr>
            {{/if}}
        </table>
    </div>

    <div class="section">
        <div class="section-title">ĐIỀU 4: THỜI HẠN VÀ ĐỊA ĐIỂM GIAO XE</div>
        <p>Bên A cam kết giao xe cho Bên B tại địa chỉ: <strong>{{deliveryAddress}}</strong></p>
        <p>Thời gian giao xe dự kiến: <strong>{{deliveryDate}}</strong></p>
        {{#if deliveryNotes}}
        <p>Ghi chú giao xe: {{deliveryNotes}}</p>
        {{/if}}
    </div>

    <div class="section">
        <div class="section-title">ĐIỀU 5: BẢO HÀNH VÀ TRÁCH NHIỆM</div>
        <p>1. Bên A cam kết cung cấp bảo hành chính hãng theo quy định của nhà sản xuất.</p>
        <p>2. Bên B có trách nhiệm sử dụng xe đúng mục đích và bảo quản xe theo hướng dẫn.</p>
        <p>3. Mọi tranh chấp sẽ được giải quyết thông qua đàm phán, hòa giải.</p>
    </div>

    <div class="section">
        <div class="section-title">ĐIỀU 6: ĐIỀU KHOẢN CHUNG</div>
        <p>1. Hợp đồng này có hiệu lực kể từ ngày ký và có giá trị pháp lý.</p>
        <p>2. Mọi thay đổi về nội dung hợp đồng phải được thỏa thuận bằng văn bản.</p>
        <p>3. Hợp đồng được lập thành 02 bản có giá trị pháp lý như nhau.</p>
        {{#if notes}}
        <p><strong>Ghi chú thêm:</strong> {{notes}}</p>
        {{/if}}
    </div>

    <div class="signature-section">
        <div class="signature-box">
            <p><strong>BÊN A (BÊN BÁN)</strong></p>
            <br><br><br>
            <p><em>(Ký tên và đóng dấu)</em></p>
            <p><strong>{{dealership.representative}}</strong></p>
        </div>
        <div class="signature-box">
            <p><strong>BÊN B (BÊN MUA)</strong></p>
            <br><br><br>
            <p><em>(Ký tên)</em></p>
            <p><strong>{{customer.full_name}}</strong></p>
        </div>
    </div>
</body>
</html>
`;

// Helper để format tiền tệ
Handlebars.registerHelper("formatCurrency", function (amount) {
  if (!amount) return "0";
  return new Intl.NumberFormat("vi-VN").format(amount);
});

/**
 * Tạo hợp đồng PDF từ template
 * @param {Object} orderData - Dữ liệu đơn hàng
 * @param {Object} templateData - Dữ liệu template (tùy chọn)
 * @returns {Buffer} - PDF buffer
 */
export async function generateContractPDF(orderData, templateData = {}) {
  let browser;
  try {
    // Chuẩn bị dữ liệu cho template
    const now = new Date();
    const contractData = {
      contractNumber: orderData.code || `HD${Date.now()}`,
      location: templateData.location || "Thành phố Hồ Chí Minh",
      day: now.getDate(),
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      dealership: {
        name: templateData.dealership?.name || "Đại lý xe điện ABC",
        address:
          templateData.dealership?.address || "123 Đường ABC, Quận 1, TP.HCM",
        phone: templateData.dealership?.phone || "0123 456 789",
        tax_code: templateData.dealership?.tax_code || "0123456789",
        representative:
          templateData.dealership?.representative || "Nguyễn Văn A",
      },
      customer: {
        full_name: orderData.customer?.full_name || "Khách hàng",
        date_of_birth: orderData.customer?.date_of_birth || "",
        id_card: orderData.customer?.id_card || "",
        address: orderData.customer?.address || "",
        phone: orderData.customer?.phone || "",
        email: orderData.customer?.email || "",
      },
      vehicles: orderData.items || [],
      totalAmount: orderData.final_amount || 0,
      paymentMethodText:
        orderData.payment_method === "installment"
          ? "Trả góp qua ngân hàng"
          : "Thanh toán tiền mặt",
      downPayment: templateData.downPayment || 0,
      remainingAmount: orderData.final_amount - (templateData.downPayment || 0),
      deliveryAddress:
        orderData.delivery?.delivery_address?.full_address ||
        orderData.customer?.address ||
        "Địa chỉ giao hàng",
      deliveryDate: orderData.delivery?.scheduled_date
        ? new Date(orderData.delivery.scheduled_date).toLocaleDateString(
            "vi-VN"
          )
        : "Theo thỏa thuận",
      deliveryNotes: orderData.delivery?.delivery_notes || "",
      notes: orderData.notes || "",
    };

    // Compile template
    const template = Handlebars.compile(
      templateData.html || DEFAULT_CONTRACT_TEMPLATE
    );
    const html = template(contractData);

    // Khởi tạo Puppeteer
    // --- Đây là phần quan trọng: dùng puppeteer-core với Chromium có sẵn ---
    browser = await puppeteer.launch({
      executablePath: "/usr/bin/chromium-browser",
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();

    // Set content và generate PDF
    await page.setContent(html, {waitUntil: "networkidle0"});
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "20mm",
        right: "15mm",
        bottom: "20mm",
        left: "15mm",
      },
    });

    return pdf;
  } catch (error) {
    console.error("Error generating contract PDF:", error);
    throw new Error(`Failed to generate contract PDF: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
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
    const templatePath = path.join(
      __dirname,
      "../templates/contracts",
      `${templateName}.html`
    );

    // Tạo thư mục nếu chưa có
    const templateDir = path.dirname(templatePath);
    if (!fs.existsSync(templateDir)) {
      fs.mkdirSync(templateDir, {recursive: true});
    }

    // Lưu template
    fs.writeFileSync(templatePath, htmlContent);

    // Lưu metadata
    const metadataPath = path.join(templateDir, `${templateName}.json`);
    const metadata = {
      name: templateName,
      description: description,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    return {success: true, path: templatePath};
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

        let metadata = {name: templateName, description: ""};
        if (fs.existsSync(metadataPath)) {
          metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
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
    return [{name: "default", description: "Template mặc định"}];
  }
}
