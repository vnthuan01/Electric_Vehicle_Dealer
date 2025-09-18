import ExcelJS from "exceljs";

export async function exportToExcel({
  sheetName = "Report",
  columns = [],
  rows = [],
}) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);
  sheet.columns = columns;
  sheet.addRows(rows);
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}
