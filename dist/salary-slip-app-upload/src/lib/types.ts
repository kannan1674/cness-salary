export interface EmployeeRow {
  employeeName: string;
  email: string;
  employeeId: string;
  designation: string;
  department: string;
  dateOfJoining: string;
  panNumber: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  payPeriod: string;
  workingDays: number;
  presentDays: number;
  /** Monthly gross earnings before pro-rating (or CTC/12 if ctc provided) */
  monthlyGross: number;
  basicSalary?: number;
  houseRentAllowance?: number;
  otherAllowance?: number;
  tds?: number;
  otherDeductions?: number;
}

export interface PayslipLineItem {
  label: string;
  amount: number;
}

export interface PayslipData {
  employee: EmployeeRow;
  earnings: PayslipLineItem[];
  deductions: PayslipLineItem[];
  totalEarnings: number;
  totalDeductions: number;
  netPay: number;
  netPayInWords: string;
  proRateFactor: number;
}

export interface ParseResult {
  employees: EmployeeRow[];
  payPeriod: string;
  workingDaysDefault: number;
  errors: string[];
  detectedColumns: Record<string, string>;
  headerRow: number;
  sheetName?: string;
}
