/**
 * Single source of truth for payslip layout — mirrors salary-template.html.
 * Edit salary-template.html, then run: npm run sync-template
 */
import { buildPayslip } from "./payslip-calculations";
import { formatCurrency, formatDays } from "./format";
import type { EmployeeRow } from "./types";

/** HTML design width (px) → scale to A4 PDF points */
export const HTML_PAGE_WIDTH_PX = 794;
export const PDF_PAGE_WIDTH_PT = 595.28;

export function pxToPt(px: number): number {
  return (px * PDF_PAGE_WIDTH_PT) / HTML_PAGE_WIDTH_PX;
}

export const PAYSLIP_COLORS = {
  purple: "#332b82",
  navy: "#213b57",
  yellow: "#ffc20e",
  stripeDetail: "#f2f2f2",
  stripeSalary: "#f3f3f3",
  tableHead: "#e8eef7",
  border: "#d7dce5",
  black: "#000000",
  textDark: "#111111",
  muted: "#777777",
  white: "#ffffff",
} as const;

export const PAYSLIP_LOGO_URL =
  "https://nandhiji.com/wp-content/uploads/2026/Outsource/cness.png";
export const PAYSLIP_SIGN_URL =
  "https://nandhiji.com/wp-content/uploads/2026/Outsource/sign.png";
export const PAYSLIP_STAMP_URL =
  "https://nandhiji.com/wp-content/uploads/2026/Outsource/stamp.png";

export const PAYSLIP_COPY = {
  employeeSection: "Employee Details",
  salarySection: "Salary Breakdown",
  earningsHeader: "EARNINGS",
  deductionsHeader: "DEDUCTIONS",
  amountHeader: "Amount (₹)",
  descriptionHeader: "Description",
  totalEarnings: "TOTAL EARNINGS",
  totalDeductions: "TOTAL DEDUCTIONS",
  netPayPrefix: "Net Pay (In Words):",
  netPayLabel: "NET PAY:",
  systemNote: "This is a system-generated payslip",
  signatoryTitle: "Authorized Signatory",
  signatoryRole: "Additional Director - CNESS Software India Pvt. Ltd.",
  footer: "CNESS Software India Private Limited",
} as const;

/** Row order matches salary-template.html <table class="details"> */
export const PAYSLIP_DETAIL_ROWS: {
  leftLabel: string;
  leftField: keyof EmployeeRow | "employeeName";
  rightLabel: string;
  rightField: keyof EmployeeRow | "employeeName";
}[] = [
  {
    leftLabel: "Employee\nName",
    leftField: "employeeName",
    rightLabel: "Employee ID",
    rightField: "employeeId",
  },
  {
    leftLabel: "Designation",
    leftField: "designation",
    rightLabel: "Department",
    rightField: "department",
  },
  {
    leftLabel: "Date of Joining",
    leftField: "dateOfJoining",
    rightLabel: "PAN Number",
    rightField: "panNumber",
  },
  {
    leftLabel: "Bank Name",
    leftField: "bankName",
    rightLabel: "Account Number",
    rightField: "accountNumber",
  },
  {
    leftLabel: "IFSC Code",
    leftField: "ifscCode",
    rightLabel: "Pay Period",
    rightField: "payPeriod",
  },
  {
    leftLabel: "Working Days",
    leftField: "workingDays",
    rightLabel: "Days Present",
    rightField: "presentDays",
  },
];

function fieldValue(
  employee: EmployeeRow,
  field: keyof EmployeeRow | "employeeName"
): string {
  if (field === "workingDays") return formatDays(employee.workingDays);
  if (field === "presentDays") return formatDays(employee.presentDays);
  const v = employee[field as keyof EmployeeRow];
  return v === undefined || v === null ? "" : String(v);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Placeholders for salary-template.html — same values react-pdf uses */
export function buildPayslipTemplateVars(
  employee: EmployeeRow
): Record<string, string> {
  const payslip = buildPayslip(employee);
  const [basic, hra, other] = payslip.earnings;
  const [profTax, tds, otherDed] = payslip.deductions;

  return {
    employeeName: escapeHtml(employee.employeeName),
    employeeId: escapeHtml(employee.employeeId),
    designation: escapeHtml(employee.designation),
    department: escapeHtml(employee.department),
    dateOfJoining: escapeHtml(employee.dateOfJoining),
    panNumber: escapeHtml(employee.panNumber),
    bankName: escapeHtml(employee.bankName),
    accountNumber: escapeHtml(employee.accountNumber),
    ifscCode: escapeHtml(employee.ifscCode),
    payPeriod: escapeHtml(employee.payPeriod),
    workingDays: escapeHtml(formatDays(employee.workingDays)),
    daysPresent: escapeHtml(formatDays(employee.presentDays)),
    basicSalary: formatCurrency(basic.amount),
    hra: formatCurrency(hra.amount),
    otherAllowance: formatCurrency(other.amount),
    professionalTax: formatCurrency(profTax.amount),
    tds: formatCurrency(tds.amount),
    otherDeductions: formatCurrency(otherDed.amount),
    totalEarnings: formatCurrency(payslip.totalEarnings),
    totalDeductions: formatCurrency(payslip.totalDeductions),
    netPayWords: escapeHtml(payslip.netPayInWords),
    netPay: formatCurrency(payslip.netPay),
  };
}

export function formatTotalLine(amount: number): string {
  return `₹ ${formatCurrency(amount)}`;
}

export function formatNetPayLine(amount: number): string {
  return `₹${formatCurrency(amount)}`;
}

export function getDetailRowCells(
  employee: EmployeeRow,
  row: (typeof PAYSLIP_DETAIL_ROWS)[number]
): [string, string, string, string] {
  return [
    row.leftLabel,
    fieldValue(employee, row.leftField),
    row.rightLabel,
    fieldValue(employee, row.rightField),
  ];
}
