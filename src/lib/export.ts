import ExcelJS from "exceljs";
import { GENDER_LABELS } from "./types";
import { formatSeatLabel } from "./types";

interface ExportRow {
  row: number;
  col: number;
  type: string;
  studentName: string;
  gender: string;
}

export async function buildClassExcel(
  className: string,
  rows: ExportRow[]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("座位表");

  sheet.columns = [
    { header: "行", key: "row", width: 8 },
    { header: "列", key: "col", width: 8 },
    { header: "座位", key: "label", width: 12 },
    { header: "类型", key: "type", width: 10 },
    { header: "姓名", key: "studentName", width: 16 },
    { header: "性别", key: "gender", width: 8 },
  ];

  sheet.getRow(1).font = { bold: true };

  for (const r of rows) {
    sheet.addRow({
      row: r.row,
      col: r.col,
      label: formatSeatLabel(r.row, r.col),
      type: r.type,
      studentName: r.studentName,
      gender: r.gender,
    });
  }

  sheet.insertRow(1, [`班级：${className}`]);
  sheet.mergeCells("A1:F1");

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export function genderLabel(gender: string): string {
  return GENDER_LABELS[gender as keyof typeof GENDER_LABELS] ?? gender;
}
