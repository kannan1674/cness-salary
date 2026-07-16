import { amountToIndianWords } from "./amount-words";
import type { EmployeeRow, PayslipData } from "./types";

/** Monthly split: Basic 50%, HRA 25%, Other 25% (e.g. ₹70,000 → 35,000 / 17,500 / 17,500) */
const BASIC_RATIO = 0.5;
const HRA_RATIO = 0.25;
const OTHER_RATIO = 0.25;

/** Shown on payslip only — not subtracted from net pay */
const DISPLAY_PROFESSIONAL_TAX = 200;

function resolveMonthlyEarnings(employee: EmployeeRow): {
  basic: number;
  hra: number;
  other: number;
} {
  const gross = employee.monthlyGross;

  return {
    basic: employee.basicSalary ?? gross * BASIC_RATIO,
    hra: employee.houseRentAllowance ?? gross * HRA_RATIO,
    other: employee.otherAllowance ?? gross * OTHER_RATIO,
  };
}

export function buildPayslip(employee: EmployeeRow): PayslipData {
  const factor =
    employee.workingDays > 0
      ? Math.min(employee.presentDays / employee.workingDays, 1)
      : 1;

  const { basic: monthlyBasic, hra: monthlyHra, other: monthlyOther } =
    resolveMonthlyEarnings(employee);

  const basic = round2(monthlyBasic * factor);
  const hra = round2(monthlyHra * factor);
  const other = round2(monthlyOther * factor);

  const earnings = [
    { label: "Basic Salary (CTC / 12)", amount: basic },
    { label: "House Rent Allowance", amount: hra },
    { label: "Other Allowance (Special)", amount: other },
  ];

  const tds = round2(employee.tds ?? 0);
  const otherDeductions = round2(employee.otherDeductions ?? 0);

  const deductions = [
    { label: "Professional Tax", amount: DISPLAY_PROFESSIONAL_TAX },
    { label: "TDS (if applicable)", amount: tds },
    { label: "Other Deductions", amount: otherDeductions },
  ];

  const totalEarnings = round2(basic + hra + other);
  const totalDeductions = round2(
    DISPLAY_PROFESSIONAL_TAX + tds + otherDeductions
  );
  const netPay = totalEarnings;

  return {
    employee,
    earnings,
    deductions,
    totalEarnings,
    totalDeductions,
    netPay,
    netPayInWords: amountToIndianWords(netPay),
    proRateFactor: factor,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
