import { NextRequest, NextResponse } from "next/server";
import { generatePayslipPdf } from "@/lib/pdf";
import type { EmployeeRow } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const employee = body.employee as EmployeeRow | undefined;

    if (!employee?.employeeName) {
      return NextResponse.json({ error: "Missing employee data" }, { status: 400 });
    }

    const pdfBuffer = await generatePayslipPdf(employee);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="payslip-preview.pdf"`,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
