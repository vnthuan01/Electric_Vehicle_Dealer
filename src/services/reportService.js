import XLSX from "xlsx-js-style";
import fs from "fs";
import path from "path";
import {fileURLToPath} from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EXPORT_DIR = path.join(__dirname, "../exports");

if (!fs.existsSync(EXPORT_DIR)) fs.mkdirSync(EXPORT_DIR);

/**
 * Căn độ rộng cột tự động theo nội dung
 */
function autoFitColumns(data, worksheet) {
  const headers = Object.keys(data[0]);
  const maxLen = headers.map((header) => header.length + 2); // tính header trước

  data.forEach((row) =>
    Object.keys(row).forEach((key, i) => {
      const len = row[key] ? row[key].toString().length + 2 : 10;
      maxLen[i] = Math.max(maxLen[i] || 10, len);
    })
  );

  // Áp dụng width theo cả header + data
  worksheet["!cols"] = maxLen.map((wch) => ({
    wch: Math.min(Math.max(wch, 12), 40), // min 12, max 40 ký tự
  }));
}

/**
 * Style cho header — nền xanh, chữ trắng, căn giữa
 */
function styleHeader(ws, headers) {
  headers.forEach((_, i) => {
    const cell = ws[XLSX.utils.encode_cell({r: 0, c: i})];
    if (cell) {
      cell.s = {
        font: {bold: true, color: {rgb: "FFFFFF"}, sz: 12},
        fill: {fgColor: {rgb: "007ACC"}},
        alignment: {horizontal: "center", vertical: "center"},
        border: {
          top: {style: "thin", color: {rgb: "CCCCCC"}},
          bottom: {style: "thin", color: {rgb: "CCCCCC"}},
          left: {style: "thin", color: {rgb: "CCCCCC"}},
          right: {style: "thin", color: {rgb: "CCCCCC"}},
        },
      };
    }
  });
}

/**
 * Style cho nội dung body — border + căn giữa
 */
function styleBody(ws, dataLength, colCount, headers) {
  for (let r = 1; r < dataLength + 1; r++) {
    for (let c = 0; c < colCount; c++) {
      const cell = ws[XLSX.utils.encode_cell({r, c})];
      if (cell) {
        const headerName = headers[c];
        const isCurrency = headerName.includes("Tổng doanh thu (VNĐ"); // cột cần format tiền

        cell.s = {
          alignment: {horizontal: "center", vertical: "center"},
          border: {
            top: {style: "thin", color: {rgb: "DDDDDD"}},
            bottom: {style: "thin", color: {rgb: "DDDDDD"}},
            left: {style: "thin", color: {rgb: "DDDDDD"}},
            right: {style: "thin", color: {rgb: "DDDDDD"}},
          },
          ...(isCurrency && {
            numFmt: "#,##0 \"₫\"", // Format: 1,000 ₫
            alignment: {horizontal: "right", vertical: "center"},
            font: {color: {rgb: "008000"}}, // màu xanh nhẹ cho tiền
          }),
        };
      }
    }
  }
}

/**
 * Mapping field tiếng Anh → tiếng Việt
 */
const FIELD_LABELS = {
  vehicle_name: "Tên xe",
  model: "Mẫu xe",
  totalQuantity: "Số lượng",
  totalRevenue: "Tổng doanh thu (VNĐ)",
  dealership_name: "Đại lý",
  color: "Màu sắc",
  quantity: "Số lượng tồn kho",
  staff_name: "Tên nhân viên",
  email: "Email",
  totalOrders: "Tổng đơn hàng",
  totalVehicles: "Tổng số xe",
  dealership: "Đại lý",
};

/**
 * Tạo file Excel (1 sheet) — tự thêm STT + tên cột tiếng Việt
 */
export function generateReportExcelSingle(data, sheetName, fileName) {
  if (!data?.length) throw new Error("Không có dữ liệu để xuất Excel.");

  // Thêm STT & đổi sang tiếng Việt
  const formatted = data.map((item, i) => {
    const translated = {};
    Object.keys(item).forEach((key) => {
      const label = FIELD_LABELS[key] || key;
      translated[label] = item[key];
    });
    return {STT: i + 1, ...translated};
  });

  const workbook = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(formatted);

  autoFitColumns(formatted, ws);
  const headers = Object.keys(formatted[0]);
  styleHeader(ws, headers);
  styleBody(ws, formatted.length, headers.length, headers);

  XLSX.utils.book_append_sheet(workbook, ws, sheetName);

  const date = new Date().toISOString().split("T")[0];
  const fullFileName = `${fileName}_${date}.xlsx`;
  const filePath = path.join(EXPORT_DIR, fullFileName);

  XLSX.writeFile(workbook, filePath);
  return filePath;
}
