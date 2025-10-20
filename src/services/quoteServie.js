import pdf from "html-pdf";
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

Handlebars.registerHelper("inc", (value) => parseInt(value) + 1);

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
  body {
    font-family: 'DejaVu Sans', Arial, sans-serif;
    color: #333;
    font-size: 13px;
    background: #f8f9fb;
    margin: 0;
    padding: 0;
  }

  .quote-container {
    background: #fff;
    padding: 20px 30px;
    margin: 0 auto;
    border: 1px solid #ddd;
  }

  .header {
    text-align: center;
    padding-bottom: 10px;
    border-bottom: 2px solid #0077b6;
    margin-bottom: 20px;
  }

  .header .title {
    font-size: 22px;
    font-weight: bold;
    color: #0077b6;
    text-transform: uppercase;
    margin: 0;
  }

  .quote-info {
    margin-bottom: 20px;
  }

  .quote-info p {
    margin: 5px 0;
    font-weight: 500;
  }

  table.info-table {
  width: 100%;
  border-collapse: collapse; /* để border liền nhau */
  margin-top: 10px;
  }

  table.info-table th {
    color: #0077b6;         /* text header màu xanh */
    font-weight: 600;
    text-align: center;
    font-size: 14px;
    border: 1px solid #0077b6; /* tạo đường kẻ xung quanh */
    background: #fff;            /* bỏ background cũ */
    padding: 8px 10px;
  }

  table.info-table td {
  border: 1px solid #ccc;      /* đường kẻ cho nội dung */
  padding: 8px 10px;
  font-size: 13px;
  vertical-align: top;
  white-space: normal;          /* cho options/accessories xuống dòng */
  word-break: break-word;
  }

  /* Chỉ cell options và accessories mới xuống dòng */
  td.options, td.accessories {
  white-space: normal; /* <br> sẽ xuống dòng */
  word-break: break-word;
  }

  table.info-table tr:nth-child(even) {
    background: #f9f9f9;
  }

  .total {
    margin-top: 15px;
    text-align: right;
    font-weight: bold;
    color: #004b70;
    border-top: 2px solid #0077b6;
    padding-top: 10px;
  }

  .notes {
    margin-top: 20px;
    padding: 10px;
    border: 1px dashed #0077b6;
    background: #f1faff;
  }

  .notes strong {
    color: #005f8e;
  }
</style>
</head>
<body>

<div class="quote-container">
  <div class="header">
    <div class="title">BÁO GIÁ XE ĐIỆN</div>
  </div>

  <div class="quote-info">
    <p><strong>Mã báo giá:</strong> {{code}}</p>
    <p><strong>Ngày tạo:</strong> {{formatDate createdAt}}</p>
    <p><strong>Hạn hiệu lực:</strong> {{formatDate endDate}}</p>
  </div>

  <table class="info-table">
    <thead>
      <tr>
        <th>STT</th>
        <th>Tên xe</th>
        <th>Màu</th>
        <th>Giá xe (VNĐ)</th>
        <th>Số lượng</th>
        <th>Tuỳ chọn thêm</th>
        <th>Phụ kiện</th>
        <th>Giảm giá (VNĐ)</th>
        <th>Thành tiền (VNĐ)</th>
      </tr>
    </thead>
    <tbody>
      {{#each items}}
      <tr>
        <td>{{inc @index}}</td>
        <td>{{vehicle_name}}</td>
        <td>{{color}}</td>
        <td>{{formatCurrency vehicle_price}}</td>
        <td>{{quantity}}</td>
       <td class="options">
        {{#if options}}
          {{#each options}}
            <div>{{name}} ({{formatCurrency price}})</div>
            {{/each}}
        {{else}}-
        {{/if}}
      </td>

      <td class="accessories">
        {{#if accessories}}
          {{#each accessories}}
            <div>{{name}} x {{quantity}} ({{formatCurrency price}})</div>
          {{/each}}
        {{else}}-
        {{/if}}
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
  <div class="notes">
    <strong>Ghi chú:</strong> {{notes}}
  </div>
  {{/if}}
</div>

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
