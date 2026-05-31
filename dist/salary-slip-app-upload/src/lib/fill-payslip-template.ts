import fs from "fs/promises";
import {
  PDFDocument,
  rgb,
  StandardFonts,
  type PDFPage,
  type RGB,
} from "pdf-lib";
import { buildPayslip } from "./payslip-calculations";
import { formatCurrency, formatDays } from "./format";
import { getPayslipAssetPath } from "./payslip-assets";
import type { EmployeeRow } from "./types";
import type { PayslipData } from "./types";

const PAGE_HEIGHT = 792;
const TEMPLATE_FILE = "cness-payslip-template.pdf";

const COLORS = {
  white: rgb(1, 1, 1),
  /** Matches template alternating gray rows in EMPLOYEE DETAILS */
  rowStripe: rgb(0.945, 0.949, 0.973),
  black: rgb(0.1, 0.1, 0.1),
  red: rgb(0.83, 0.2, 0.2),
  barBlue: rgb(0.12, 0.16, 0.42),
  barDark: rgb(0.09, 0.12, 0.32),
};

/** Position on PDF: x & top from page edges, h = row height (points). */
type Pos = { x: number; top: number; h?: number };

type EraseZone = Pos & {
  /** white row vs gray stripe row in template */
  bg?: "white" | "stripe";
};

const DEFAULT_H = 14;

/** Labels end ~x=125; only erase VALUE cells (never label column). */
const VALUE_LEFT_X = 132;
const VALUE_RIGHT_X = 388;
const VALUE_LEFT_WIDTH = 178;
const VALUE_RIGHT_WIDTH = 138;

/**
 * Erase old placeholder text in VALUE columns only.
 * Labels (Designation, Bank Name, etc.) stay untouched.
 */
const ERASE_ZONES: EraseZone[] = [
  // Row: name / employee id
  { x: VALUE_LEFT_X, top: 210, h: 18, bg: "white" },
  { x: VALUE_RIGHT_X, top: 208, h: 18, bg: "white" },
  // Row: designation / department (gray stripe)
  { x: VALUE_LEFT_X, top: 234, h: 18, bg: "stripe" },
  { x: VALUE_RIGHT_X, top: 234, h: 18, bg: "stripe" },
  // Row: DOJ / PAN
  { x: VALUE_LEFT_X, top: 253, h: 18, bg: "white" },
  { x: VALUE_RIGHT_X, top: 253, h: 18, bg: "white" },
  // Row: bank / account (gray stripe)
  { x: VALUE_LEFT_X, top: 272, h: 18, bg: "stripe" },
  { x: VALUE_RIGHT_X, top: 272, h: 18, bg: "stripe" },
  // Row: IFSC / pay period
  { x: VALUE_LEFT_X, top: 291, h: 18, bg: "white" },
  { x: VALUE_RIGHT_X, top: 291, h: 18, bg: "white" },
  // Row: working days / present (gray stripe)
  { x: VALUE_LEFT_X, top: 310, h: 18, bg: "stripe" },
  { x: VALUE_RIGHT_X, top: 310, h: 18, bg: "stripe" },
  // Salary amounts
  { x: 218, top: 418, h: 20, bg: "white" },
  { x: 218, top: 437, h: 20, bg: "white" },
  { x: 218, top: 456, h: 20, bg: "white" },
  { x: 468, top: 418, h: 20, bg: "white" },
  { x: 468, top: 437, h: 20, bg: "white" },
  { x: 468, top: 456, h: 20, bg: "white" },
];

type FieldKey =
  | "employeeName"
  | "employeeId"
  | "designation"
  | "department"
  | "dateOfJoining"
  | "panNumber"
  | "bankName"
  | "accountNumber"
  | "ifscCode"
  | "payPeriod"
  | "workingDays"
  | "daysPresent"
  | "basicSalary"
  | "hra"
  | "otherAllowance"
  | "professionalTax"
  | "tds"
  | "otherDeductions"
  | "totalEarnings"
  | "totalDeductions"
  | "netPayWords"
  | "netPay";

type TextField = Pos & {
  key: FieldKey;
  size?: number;
  bold?: boolean;
  color?: RGB;
  alignRight?: boolean;
  onBlueBar?: boolean;
  onDarkBar?: boolean;
};

const TEXT_FIELDS: TextField[] = [
  { key: "employeeName", x: 132, top: 209 },
  { key: "employeeId", x: 392, top: 209 },
  { key: "designation", x: 138, top: 234 },
  { key: "department", x: 395, top: 234 },
  { key: "dateOfJoining", x: 150, top: 256 },
  { key: "panNumber", x: 392, top: 256 },
  { key: "bankName", x: 132, top: 275 },
  { key: "accountNumber", x: 392, top: 275 },
  { key: "ifscCode", x: 132, top: 294 },
  { key: "payPeriod", x: 375, top: 294 },
  { key: "workingDays", x: 145, top: 313 },
  { key: "daysPresent", x: 380, top: 313 },
  { key: "basicSalary", x: 218, top: 424, alignRight: true },
  { key: "hra", x: 218, top: 443, alignRight: true },
  { key: "otherAllowance", x: 218, top: 462, alignRight: true },
  { key: "professionalTax", x: 468, top: 424, alignRight: true, color: COLORS.red },
  { key: "tds", x: 468, top: 443, alignRight: true, color: COLORS.red },
  { key: "otherDeductions", x: 468, top: 462, alignRight: true, color: COLORS.red },
  { key: "totalEarnings", x: 258, top: 519, alignRight: true, bold: true, onBlueBar: true },
  { key: "totalDeductions", x: 455, top: 519, alignRight: true, bold: true, onBlueBar: true },
  { key: "netPayWords", x: 172, top: 559, onBlueBar: true },
  { key: "netPay", x: 438, top: 559, alignRight: true, bold: true, onDarkBar: true },
];

/** Right edge for right-aligned amount columns (no w in config). */
function rightEdgeX(key: FieldKey): number {
  if (key === "basicSalary" || key === "hra" || key === "otherAllowance") return 310;
  if (key === "professionalTax" || key === "tds" || key === "otherDeductions") return 544;
  if (key === "totalEarnings") return 343;
  if (key === "totalDeductions") return 543;
  if (key === "netPay") return 538;
  return 0;
}

/** Erase rectangle width — value columns only. */
function eraseWidth(x: number): number {
  if (x >= VALUE_RIGHT_X) return VALUE_RIGHT_WIDTH;
  if (x >= VALUE_LEFT_X) return VALUE_LEFT_WIDTH;
  if (x < 350) return 95;
  if (x > 460) return 78;
  return VALUE_RIGHT_WIDTH;
}

function yFromTop(top: number, fontSize: number): number {
  return PAGE_HEIGHT - top - fontSize * 0.85;
}

function sanitizeForPdfFont(text: string): string {
  return text
    .replace(/₹/g, "Rs.")
    .replace(/\u00a0/g, " ")
    .replace(/[^\x09\x0a\x0d\x20-\x7e]/g, "");
}

async function loadTemplate(): Promise<Uint8Array> {
  const path = getPayslipAssetPath(`templates/${TEMPLATE_FILE}`);
  return fs.readFile(path);
}

export async function fillPayslipTemplate(
  employee: EmployeeRow
): Promise<Buffer> {
  const payslip = buildPayslip(employee);
  const templateBytes = await loadTemplate();
  const pdfDoc = await PDFDocument.load(templateBytes);
  const page = pdfDoc.getPage(0);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const values = mapPayslipToFields(employee, payslip);

  for (const zone of ERASE_ZONES) {
    const bg = zone.bg === "stripe" ? COLORS.rowStripe : COLORS.white;
    paintRect(page, zone, bg, eraseWidth(zone.x));
  }

  paintRect(page, { x: 255, top: 514, h: 22 }, COLORS.barBlue, 95);
  paintRect(page, { x: 450, top: 514, h: 22 }, COLORS.barBlue, 95);
  paintRect(page, { x: 168, top: 554, h: 24 }, COLORS.barBlue, 275);
  paintRect(page, { x: 430, top: 554, h: 24 }, COLORS.barDark, 115);

  for (const field of TEXT_FIELDS) {
    const text = values[field.key];
    if (!text) continue;

    const size = field.size ?? (field.bold ? 9.5 : 9);
    const f = field.bold ? fontBold : font;
    let color = field.color ?? COLORS.black;
    if (field.onBlueBar || field.onDarkBar) {
      color = COLORS.white;
    }

    writeText(page, text, field, { font: f, size, color });
  }

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}

function mapPayslipToFields(
  e: EmployeeRow,
  payslip: PayslipData
): Record<FieldKey, string> {
  const [basic, hra, other] = payslip.earnings;
  const [profTax, tds, otherDed] = payslip.deductions;

  return {
    employeeName: e.employeeName,
    employeeId: e.employeeId,
    designation: e.designation,
    department: e.department,
    dateOfJoining: e.dateOfJoining,
    panNumber: e.panNumber,
    bankName: e.bankName,
    accountNumber: e.accountNumber,
    ifscCode: e.ifscCode,
    payPeriod: e.payPeriod,
    workingDays: formatDays(e.workingDays),
    daysPresent: formatDays(e.presentDays),
    basicSalary: formatCurrency(basic.amount),
    hra: formatCurrency(hra.amount),
    otherAllowance: formatCurrency(other.amount),
    professionalTax: formatCurrency(profTax.amount),
    tds: formatCurrency(tds.amount),
    otherDeductions: formatCurrency(otherDed.amount),
    totalEarnings: formatCurrency(payslip.totalEarnings),
    totalDeductions: formatCurrency(payslip.totalDeductions),
    netPayWords: payslip.netPayInWords,
    netPay: formatCurrency(payslip.netPay),
  };
}

function paintRect(page: PDFPage, spec: Pos, color: RGB, width: number) {
  const h = spec.h ?? DEFAULT_H;
  page.drawRectangle({
    x: spec.x,
    y: PAGE_HEIGHT - spec.top - h,
    width,
    height: h,
    color,
    borderWidth: 0,
  });
}

function writeText(
  page: PDFPage,
  text: string,
  spec: TextField,
  opts: { font: Awaited<ReturnType<PDFDocument["embedFont"]>>; size: number; color: RGB }
) {
  const display = sanitizeForPdfFont(text);

  let x = spec.x;
  if (spec.alignRight) {
    const edge = rightEdgeX(spec.key);
    const textWidth = opts.font.widthOfTextAtSize(display, opts.size);
    x = edge - textWidth;
  }

  page.drawText(display, {
    x,
    y: yFromTop(spec.top, opts.size),
    size: opts.size,
    font: opts.font,
    color: opts.color,
  });
}
