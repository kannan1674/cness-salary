import * as XLSX from "xlsx";
import type { EmployeeRow, ParseResult } from "./types";

const COLUMN_ALIASES: Record<
  keyof Omit<EmployeeRow, "monthlyGross"> | "salary" | "annualCtc" | "gross",
  string[]
> = {
  employeeName: [
    "employee name",
    "name",
    "employee",
    "emp name",
    "staff name",
    "full name",
    "name of employee",
    "empname",
  ],
  email: [
    "email",
    "email id",
    "e-mail",
    "e mail",
    "mail",
    "mail id",
    "email address",
    "official email",
    "company email",
  ],
  employeeId: ["employee id", "emp id", "id", "cness id", "emp code", "code"],
  designation: ["designation", "role", "title", "position"],
  department: ["department", "dept"],
  dateOfJoining: ["date of joining", "doj", "joining date", "join date"],
  panNumber: ["pan", "pan number", "pan no"],
  bankName: ["bank", "bank name"],
  accountNumber: ["account number", "account no", "account", "bank account"],
  ifscCode: ["ifsc", "ifsc code"],
  payPeriod: [
    "pay period",
    "payslip month",
    "salary month",
    "payroll month",
    "month year",
    "salary for month",
    "pay month",
  ],
  workingDays: [
    "working days",
    "work days",
    "total days",
    "month days",
    "total working days",
  ],
  presentDays: [
    "present days",
    "days present",
    "present",
    "present day",
    "days worked",
    "attendance",
    "no of days present",
    "no of present days",
    "attended days",
    "p days",
  ],
  basicSalary: ["basic", "basic salary", "ctc", "monthly ctc"],
  houseRentAllowance: [
    "hra",
    "house rent",
    "house rent allowance",
    "house ren",
  ],
  otherAllowance: [
    "other allowance",
    "special allowance",
    "other",
    "other allow",
  ],
  tds: ["tds", "tax deducted", "income tax"],
  otherDeductions: ["other deductions", "deductions other"],
  salary: [
    "salary",
    "gross salary",
    "monthly salary",
    "gross",
    "total salary",
    "salary amount",
    "pay",
    "pay amount",
    "monthly pay",
    "gross pay",
    "earnings",
    "total earnings",
    "amount",
  ],
  annualCtc: ["annual ctc", "yearly ctc", "annual salary", "yearly salary"],
  gross: ["gross earnings", "monthly gross"],
};

export interface ParseOptions {
  /** Used when Excel has no Email column */
  fallbackEmail?: string;
}

function normalizeHeader(h: string): string {
  return String(h ?? "")
    .replace(/^\ufeff/, "")
    .replace(/[\u200b-\u200d\ufeff]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[_]+/g, " ")
    .replace(/\s+/g, " ");
}

function cellValue(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object" && v !== null) {
    if ("text" in v) return String((v as { text: string }).text).trim();
    if ("w" in v) return String((v as { w: string }).w).trim();
    if ("v" in v) return String((v as { v: unknown }).v).trim();
  }
  return String(v).trim();
}

/** Short aliases only match exact header text (avoids "Bank Name" → name). */
const EXACT_ONLY_ALIASES = new Set([
  "name",
  "id",
  "pan",
  "dept",
  "pay",
  "hra",
  "pt",
  "mail",
  "present",
  "employee",
  "gross",
  "amount",
]);

function findColumnIndex(
  headers: string[],
  aliases: string[]
): number | undefined {
  const normalized = headers.map(normalizeHeader);
  for (const alias of aliases) {
    const idx = normalized.indexOf(alias);
    if (idx >= 0) return idx;
  }
  for (let i = 0; i < normalized.length; i++) {
    const h = normalized[i];
    if (!h || h === "s.no" || h === "s no" || h === "sr no" || h === "sl no")
      continue;
    for (const alias of aliases) {
      if (EXACT_ONLY_ALIASES.has(alias)) {
        if (h === alias) return i;
      } else if (h === alias || h.includes(alias)) {
        return i;
      }
    }
  }
  return undefined;
}

function findHeaderRowIndex(rows: unknown[][]): number {
  let bestRow = 0;
  let bestScore = 0;

  for (let r = 0; r < Math.min(rows.length, 20); r++) {
    const headers = (rows[r] as unknown[]).map((h) => String(h));
    let score = 0;
    if (findColumnIndex(headers, COLUMN_ALIASES.employeeName) !== undefined)
      score += 2;
    if (
      findColumnIndex(headers, COLUMN_ALIASES.salary) !== undefined ||
      findColumnIndex(headers, COLUMN_ALIASES.annualCtc) !== undefined ||
      findColumnIndex(headers, COLUMN_ALIASES.gross) !== undefined
    )
      score += 2;
    if (findColumnIndex(headers, COLUMN_ALIASES.presentDays) !== undefined)
      score += 2;
    if (findColumnIndex(headers, COLUMN_ALIASES.email) !== undefined) score += 1;

    if (score > bestScore) {
      bestScore = score;
      bestRow = r;
    }
  }

  return bestScore >= 4 ? bestRow : 0;
}

function cell(row: unknown[], idx?: number): string {
  if (idx === undefined || idx < 0) return "";
  return cellValue(row[idx]);
}

function formatDateObj(d: Date): string {
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

/** Excel serial (e.g. 46023) or Date object → DD/MM/YYYY */
function cellDate(row: unknown[], idx?: number): string {
  if (idx === undefined || idx < 0) return "";
  const v = row[idx];
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return formatDateObj(v);
  }
  if (typeof v === "number" && v > 20000 && v < 60000) {
    return formatDateObj(new Date((v - 25569) * 86400 * 1000));
  }
  const s = cell(row, idx);
  if (/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(s)) return s;
  const n = Number(s.replace(/,/g, ""));
  if (Number.isFinite(n) && n > 20000 && n < 60000) {
    return formatDateObj(new Date((n - 25569) * 86400 * 1000));
  }
  return s;
}

function cellNumber(row: unknown[], idx?: number): number | undefined {
  if (idx === undefined || idx < 0) return undefined;
  const v = row[idx];
  if (typeof v === "number" && Number.isFinite(v)) return v;

  const s = cell(row, idx)
    .replace(/,/g, "")
    .replace(/₹/g, "")
    .replace(/\s*days?\s*/gi, "")
    .trim();
  if (!s) return undefined;

  const n = Number(s);
  if (Number.isFinite(n)) return n;

  const match = s.match(/[\d.]+/);
  if (match) {
    const parsed = Number(match[0]);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function defaultPayPeriod(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toLocaleString("en-IN", { month: "long", year: "numeric" });
}

/** Reject values like "22", "22 Days" mistaken from attendance columns */
function looksLikeDaysCount(value: string): boolean {
  const t = value.trim().toLowerCase();
  return /^\d+\s*days?$/.test(t) || /^\d+$/.test(t);
}

function isValidPayPeriod(value: string): boolean {
  const t = value.trim();
  if (!t || looksLikeDaysCount(t)) return false;
  if (
    /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\b/i.test(
      t
    )
  ) {
    return true;
  }
  if (/\d{4}/.test(t) && /[a-zA-Z]/.test(t)) return true;
  if (/^\d{1,2}[/-]\d{4}$/.test(t)) return true;
  return false;
}

function formatPayPeriodDisplay(value: string): string {
  const t = value.trim();
  const mmyyyy = t.match(/^(\d{1,2})[/-](\d{4})$/);
  if (mmyyyy) {
    const d = new Date(Number(mmyyyy[2]), Number(mmyyyy[1]) - 1, 1);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleString("en-IN", { month: "long", year: "numeric" });
    }
  }
  const parsed = new Date(t);
  if (!Number.isNaN(parsed.getTime()) && parsed.getFullYear() > 2000) {
    return parsed.toLocaleString("en-IN", { month: "long", year: "numeric" });
  }
  return t;
}

function resolvePayPeriod(raw: string | undefined, fallback: string): string {
  const base = fallback.trim() || defaultPayPeriod();
  const candidate = raw?.trim() ?? "";
  if (!candidate || !isValidPayPeriod(candidate)) {
    return formatPayPeriodDisplay(base);
  }
  return formatPayPeriodDisplay(candidate);
}

function daysInMonthFromPeriod(period: string): number {
  const parsed = new Date(period);
  if (!Number.isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = parsed.getMonth();
    return new Date(y, m + 1, 0).getDate();
  }
  const match = period.match(/(\w+)\s+(\d{4})/i);
  if (match) {
    const d = new Date(`${match[1]} 1, ${match[2]}`);
    if (!Number.isNaN(d.getTime())) {
      return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    }
  }
  return 24;
}

function isEmptyRow(row: unknown[]): boolean {
  return row.every((c) => cellValue(c) === "");
}

function readAllRows(workbook: XLSX.WorkBook): {
  rows: unknown[][];
  sheetName: string;
} {
  let bestRows: unknown[][] = [];
  let bestSheet = workbook.SheetNames[0] ?? "Sheet1";
  let bestDataRows = 0;

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: "",
      raw: true,
    }) as unknown[][];

    const headerRowIndex = findHeaderRowIndex(rows);
    let dataRows = 0;
    for (let r = headerRowIndex + 1; r < rows.length; r++) {
      if (!isEmptyRow(rows[r] as unknown[])) dataRows++;
    }

    if (dataRows > bestDataRows || (dataRows === bestDataRows && rows.length > bestRows.length)) {
      bestDataRows = dataRows;
      bestRows = rows;
      bestSheet = sheetName;
    }
  }

  return { rows: bestRows, sheetName: bestSheet };
}

export function parseSalaryExcel(
  buffer: ArrayBuffer,
  options: ParseOptions = {}
): ParseResult {
  const workbook = XLSX.read(buffer, { type: "array" });
  const { rows, sheetName } = readAllRows(workbook);

  const errors: string[] = [];
  if (rows.length < 2) {
    return {
      employees: [],
      payPeriod: defaultPayPeriod(),
      workingDaysDefault: 24,
      errors: ["Excel file has no data rows."],
      detectedColumns: {},
      headerRow: 1,
    };
  }

  const headerRowIndex = findHeaderRowIndex(rows);
  const headers = (rows[headerRowIndex] as unknown[]).map((h) => cellValue(h));
  const col = (key: keyof typeof COLUMN_ALIASES) =>
    findColumnIndex(headers, COLUMN_ALIASES[key]);

  const nameIdx = col("employeeName");
  const emailIdx = col("email");
  const salaryIdx = col("salary");
  const annualCtcIdx = col("annualCtc");
  const grossIdx = col("gross");
  const presentIdx = col("presentDays");
  const workingIdx = col("workingDays");
  const periodIdx = col("payPeriod");

  const detectedColumns: Record<string, string> = {};
  if (nameIdx !== undefined) detectedColumns.name = headers[nameIdx];
  if (emailIdx !== undefined) detectedColumns.email = headers[emailIdx];
  if (salaryIdx !== undefined) detectedColumns.salary = headers[salaryIdx];
  else if (annualCtcIdx !== undefined)
    detectedColumns.annualCtc = headers[annualCtcIdx];
  else if (grossIdx !== undefined) detectedColumns.gross = headers[grossIdx];
  if (presentIdx !== undefined)
    detectedColumns.presentDays = headers[presentIdx];
  if (workingIdx !== undefined)
    detectedColumns.workingDays = headers[workingIdx];
  if (periodIdx !== undefined)
    detectedColumns.payPeriod = headers[periodIdx];

  if (nameIdx === undefined) {
    errors.push(
      `Missing name column. Found headers (row ${headerRowIndex + 1}): ${headers.filter(Boolean).join(", ") || "(empty)"}`
    );
  }
  if (emailIdx === undefined && !options.fallbackEmail?.trim()) {
    errors.push(
      'Missing "Email" column. Add an Email column to Excel, or enter a fallback email below.'
    );
  }
  if (
    salaryIdx === undefined &&
    annualCtcIdx === undefined &&
    grossIdx === undefined
  ) {
    errors.push(
      `Missing salary column. Found headers: ${headers.filter(Boolean).join(", ")}`
    );
  }
  if (presentIdx === undefined) {
    errors.push(
      `Missing present days column. Found headers: ${headers.filter(Boolean).join(", ")}`
    );
  }

  const fallbackPeriod = defaultPayPeriod();
  const globalPeriod = resolvePayPeriod(
    periodIdx !== undefined
      ? cell(rows[headerRowIndex + 1], periodIdx)
      : undefined,
    fallbackPeriod
  );
  const workingDaysDefault = daysInMonthFromPeriod(globalPeriod);
  const fallbackEmail = options.fallbackEmail?.trim() ?? "";

  const employees: EmployeeRow[] = [];

  for (let r = headerRowIndex + 1; r < rows.length; r++) {
    const row = rows[r] as unknown[];
    if (isEmptyRow(row)) continue;

    const name = cell(row, nameIdx);
    if (!name) continue;

    const email = cell(row, emailIdx) || fallbackEmail;
    const monthlyGross =
      cellNumber(row, salaryIdx) ??
      cellNumber(row, grossIdx) ??
      (cellNumber(row, annualCtcIdx) !== undefined
        ? (cellNumber(row, annualCtcIdx) as number) / 12
        : undefined);

    const presentDays = cellNumber(row, presentIdx);
    const workingDays =
      cellNumber(row, workingIdx) ?? workingDaysDefault;

    const rowNum = r + 1;
    if (!email)
      errors.push(`Row ${rowNum} (${name}): missing email.`);
    if (monthlyGross === undefined)
      errors.push(`Row ${rowNum} (${name}): missing or invalid salary.`);
    if (presentDays === undefined)
      errors.push(`Row ${rowNum} (${name}): missing or invalid present days.`);

    if (!email || monthlyGross === undefined || presentDays === undefined) {
      continue;
    }

    employees.push({
      employeeName: name,
      email,
      employeeId: cell(row, col("employeeId")) || `EMP-${r}`,
      designation: cell(row, col("designation")) || "—",
      department: cell(row, col("department")) || "—",
      dateOfJoining: cellDate(row, col("dateOfJoining")) || "—",
      panNumber: cell(row, col("panNumber")) || "—",
      bankName: cell(row, col("bankName")) || "—",
      accountNumber: cell(row, col("accountNumber")) || "—",
      ifscCode: cell(row, col("ifscCode")) || "—",
      payPeriod: resolvePayPeriod(cell(row, periodIdx), globalPeriod),
      workingDays,
      presentDays,
      monthlyGross,
      basicSalary: cellNumber(row, col("basicSalary")),
      houseRentAllowance: cellNumber(row, col("houseRentAllowance")),
      otherAllowance: cellNumber(row, col("otherAllowance")),
      tds: cellNumber(row, col("tds")),
      otherDeductions: cellNumber(row, col("otherDeductions")),
    });
  }

  const headersOk =
    nameIdx !== undefined &&
    (emailIdx !== undefined || !!fallbackEmail) &&
    (salaryIdx !== undefined ||
      annualCtcIdx !== undefined ||
      grossIdx !== undefined) &&
    presentIdx !== undefined;

  if (employees.length === 0) {
    if (headersOk) {
      errors.push(
        `Headers OK on row ${headerRowIndex + 1} (sheet "${sheetName}"), but no employee data rows found. Add rows below the header with Name, Email, Salary, and Present Days filled in.`
      );
    } else if (errors.length === 0) {
      errors.push(
        `No employee rows found in sheet "${sheetName}". Check headers and data.`
      );
    }
  }

  return {
    employees,
    payPeriod: globalPeriod,
    workingDaysDefault,
    errors,
    detectedColumns,
    headerRow: headerRowIndex + 1,
    sheetName,
  };
}

export function createSampleWorkbook(): ArrayBuffer {
  const data = [
    [
      "Employee Name",
      "Email",
      "Employee ID",
      "Designation",
      "Department",
      "Date of Joining",
      "PAN Number",
      "Bank Name",
      "Account Number",
      "IFSC Code",
      "Pay Period",
      "Working Days",
      "Present Days",
      "Salary",
      "CTC",
      "House Rent",
      "Other",
    ],
    [
      "Vimal Paulson Pinheiro",
      "vimal@example.com",
      "CNESS#0020",
      "Sr. Associate - Flutter Development",
      "Development",
      "17/12/2025",
      "BQBPV0910N",
      "State Bank of India",
      "38375328524",
      "SBIN0009121",
      "January 2026",
      24,
      24,
      70000,
      35000,
      17500,
      17500,
    ],
    [
      "Jane Doe",
      "jane@example.com",
      "CNESS#0021",
      "Software Engineer",
      "Development",
      "01/06/2024",
      "ABCDE1234F",
      "HDFC Bank",
      "12345678901",
      "HDFC0001234",
      "January 2026",
      24,
      22,
      60000,
      30000,
      15000,
      15000,
    ],
  ];
  const sheet = XLSX.utils.aoa_to_sheet(data);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Employees");
  return XLSX.write(book, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}
