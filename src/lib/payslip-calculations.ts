import { amountToIndianWords } from "./amount-words";
import type { EmployeeRow, PayslipData } from "./types";

/** Shown on payslip only — not subtracted from net pay */
const DISPLAY_PROFESSIONAL_TAX = 0;

function resolveMonthlyEarnings(employee: EmployeeRow): {
  basic: number;
  hra: number;
  other: number;
} {
  return {
    basic: employee.basicSalary ?? 0,
    hra: employee.houseRentAllowance ?? 0,
    other: employee.otherAllowance ?? 0,
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
  const monthlyNetPay = employee.netPay ?? 0;
  const netPay = round2(monthlyNetPay * factor);

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
