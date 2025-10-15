import puppeteer from "puppeteer-core";
import Handlebars from "handlebars";

// --- Helpers ---
Handlebars.registerHelper("formatDate", function (date) {
  if (!date) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date));
});

Handlebars.registerHelper("formatCurrency", function (amount) {
  if (!amount) return "0";
  return new Intl.NumberFormat("vi-VN").format(amount);
});

// --- Template PDF Báo giá ---
const DEFAULT_QUOTE_TEMPLATE = `
<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<title>Báo giá xe điện</title>
<style>
  body { font-family: Arial, sans-serif; color: #333; margin: 30px; font-size: 13px; line-height: 1.5; }
  .header { text-align: center; margin-bottom: 20px; }
  .title { font-size: 18px; font-weight: bold; text-transform: uppercase; }
  .quote-info p { margin: 5px 0; }
  .info-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
  .info-table th, .info-table td { border: 1px solid #ccc; padding: 8px; }
  .info-table th { background-color: #f5f5f5; text-align: left; }
  .total { text-align: right; font-weight: bold; margin-top: 15px; }
  .notes { margin-top: 20px; padding: 10px; border: 1px solid #ddd; background: #fafafa; }
</style>
</head>
<body>

<div class="header">
  <div class="title">BÁO GIÁ XE ĐIỆN</div>
</div>

<div class="quote-info">
  <p><strong>Mã báo giá:</strong> {{code}}</p>
  <p><strong>Ngày tạo:</strong> {{formatDate createdAt}}</p>
  <p><strong>Hạn hiệu lực:</strong> {{formatDate endDate}}</p>
  <p><strong>Trạng thái:</strong> {{status}}</p>
</div>

<table class="info-table">
  <thead>
    <tr>
      <th>#</th>
      <th>Tên xe</th>
      <th>Màu</th>
      <th>Giá xe (VNĐ)</th>
      <th>Số lượng</th>
      <th>Options</th>
      <th>Phụ kiện</th>
      <th>Giảm giá (VNĐ)</th>
      <th>Thành tiền (VNĐ)</th>
    </tr>
  </thead>
  <tbody>
    {{#each items}}
    <tr>
      <td>{{@index}}</td>
      <td>{{vehicle_name}}</td>
      <td>{{color}}</td>
      <td>{{formatCurrency vehicle_price}}</td>
      <td>{{quantity}}</td>
      <td>
        {{#if options}}
          {{#each options}}{{name}} ({{formatCurrency price}}){{#unless @last}}, {{/unless}}{{/each}}
        {{else}}-{{/if}}
      </td>
      <td>
        {{#if accessories}}
          {{#each accessories}}{{name}} x {{quantity}} ({{formatCurrency price}} VNĐ){{#unless @last}}, {{/unless}}{{/each}}
        {{else}}-{{/if}}
      </td>
      <td>{{formatCurrency discount}}</td>
      <td>{{formatCurrency final_amount}}</td>
    </tr>
    {{/each}}
  </tbody>
</table>

<div class="total">
  Tổng giá trị báo giá: {{formatCurrency final_amount}} VNĐ
</div>

{{#if notes}}
<div class="notes"><strong>Ghi chú:</strong> {{notes}}</div>
{{/if}}

</body>
</html>
`;

/**
 * Generate Quote PDF
 * @param {Object} quote - Object quote đầy đủ (code, createdAt, endDate, status, final_amount, items, notes)
 * @param {Object} templateData - { html: "..." } nếu muốn override template
 * @returns {Buffer} PDF buffer
 */
export async function generateQuotePDF(quote, templateData = {}) {
  let browser;
  try {
    // Chuẩn bị dữ liệu: đảm bảo items, options, accessories là array
    const data = {
      ...quote,
      items: (quote.items || []).map((i) => ({
        ...i,
        options: i.options || [],
        accessories: i.accessories || [],
      })),
    };

    const template = Handlebars.compile(
      templateData.html || DEFAULT_QUOTE_TEMPLATE
    );
    const html = template(data);

    // --- Đây là phần quan trọng: dùng puppeteer-core với Chromium có sẵn ---
    browser = await puppeteer.launch({
      executablePath: "/usr/bin/chromium-browser",
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setContent(html, {waitUntil: "networkidle0"});

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {top: "20mm", right: "15mm", bottom: "20mm", left: "15mm"},
    });

    return pdfBuffer;
  } catch (error) {
    console.error("Error generating quote PDF:", error);
    throw new Error(`Failed to generate quote PDF: ${error.message}`);
  } finally {
    if (browser) await browser.close();
  }
}
