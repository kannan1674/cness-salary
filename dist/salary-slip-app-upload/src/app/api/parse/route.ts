import { NextRequest, NextResponse } from "next/server";
import { parseSalaryExcel } from "@/lib/excel";
import { buildPayslip } from "@/lib/payslip-calculations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const fallbackEmail = String(formData.get("fallbackEmail") ?? "");
    const result = parseSalaryExcel(buffer, { fallbackEmail });

    const preview = result.employees.map((emp) => {
      const payslip = buildPayslip(emp);
      return {
        employeeName: emp.employeeName,
        email: emp.email,
        employeeId: emp.employeeId,
        payPeriod: emp.payPeriod,
        presentDays: emp.presentDays,
        workingDays: emp.workingDays,
        netPay: payslip.netPay,
        totalEarnings: payslip.totalEarnings,
      };
    });

    return NextResponse.json({
      ...result,
      preview,
      count: result.employees.length,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to parse Excel" },
      { status: 500 }
    );
  }
}
