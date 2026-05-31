import { NextRequest, NextResponse } from "next/server";
import { parseSalaryExcel } from "@/lib/excel";
import { generatePayslipPdf, payslipFileName } from "@/lib/pdf";
import {
  sendPayslipEmail,
  getEmailConfig,
  verifySmtpConnection,
} from "@/lib/email";
import type { EmployeeRow } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    if (!getEmailConfig()) {
      return NextResponse.json(
        {
          error:
            "Email not configured. Add SMTP settings to .env.local (see .env.example).",
        },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const dryRun = formData.get("dryRun") === "true";
    const employeesJson = formData.get("employees");

    if (
      (!employeesJson || typeof employeesJson !== "string") &&
      (!file || !(file instanceof Blob))
    ) {
      return NextResponse.json(
        { error: "No employee data. Upload Excel and try again." },
        { status: 400 }
      );
    }

    const fallbackEmail = String(formData.get("fallbackEmail") ?? "");

    let employees: EmployeeRow[];
    let errors: string[] = [];
    let detectedColumns: Record<string, string> = {};
    let headerRow = 1;

    if (employeesJson && typeof employeesJson === "string") {
      try {
        employees = JSON.parse(employeesJson) as EmployeeRow[];
      } catch {
        return NextResponse.json(
          { error: "Invalid employee data." },
          { status: 400 }
        );
      }
    } else if (file instanceof Blob) {
      const buffer = await file.arrayBuffer();
      const parsed = parseSalaryExcel(buffer, { fallbackEmail });
      employees = parsed.employees;
      errors = parsed.errors;
      detectedColumns = parsed.detectedColumns;
      headerRow = parsed.headerRow;
    } else {
      return NextResponse.json(
        { error: "No employee data. Upload Excel and try again." },
        { status: 400 }
      );
    }

    if (employees.length === 0) {
      return NextResponse.json(
        {
          error: "No valid employees found",
          errors,
          detectedColumns,
          headerRow,
          hint: "Ensure Excel has: Employee Name, Salary, Present Days, and Email (or set fallback email). Column names are flexible.",
        },
        { status: 400 }
      );
    }

    const results: {
      employeeName: string;
      email: string;
      status: "sent" | "skipped" | "failed";
      message?: string;
    }[] = [];

    let smtpConfig: Awaited<ReturnType<typeof verifySmtpConnection>> | null =
      null;
    if (!dryRun) {
      smtpConfig = await verifySmtpConnection();
    }

    for (const employee of employees) {
      try {
        const pdfBuffer = await generatePayslipPdf(employee);
        const fileName = payslipFileName(
          employee.employeeName,
          employee.payPeriod
        );

        if (dryRun) {
          results.push({
            employeeName: employee.employeeName,
            email: employee.email,
            status: "skipped",
            message: `PDF generated (${fileName}), email not sent (dry run)`,
          });
          continue;
        }

        await sendPayslipEmail(
          {
            to: employee.email,
            employeeName: employee.employeeName,
            payPeriod: employee.payPeriod,
            pdfBuffer,
            fileName,
          },
          smtpConfig ?? undefined
        );

        results.push({
          employeeName: employee.employeeName,
          email: employee.email,
          status: "sent",
        });
      } catch (err) {
        results.push({
          employeeName: employee.employeeName,
          email: employee.email,
          status: "failed",
          message: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    const sent = results.filter((r) => r.status === "sent").length;
    const failed = results.filter((r) => r.status === "failed").length;

    return NextResponse.json({
      sent,
      failed,
      total: employees.length,
      results,
      errors,
      dryRun,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to send payslips" },
      { status: 500 }
    );
  }
}
