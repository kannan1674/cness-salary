import { renderToBuffer } from "@react-pdf/renderer";
import { PayslipDocument } from "@/components/PayslipDocument";
import {
  resolvePayslipHeaderImageSrc,
  resolvePayslipSignImageSrc,
  resolvePayslipStampImageSrc,
} from "./payslip-assets";
import { buildPayslip } from "./payslip-calculations";
import type { EmployeeRow } from "./types";

/** Fallback PDF — used only if salary-template.html + Chromium fails. */
export async function generatePayslipPdfFromReactPdf(
  employee: EmployeeRow
): Promise<Buffer> {
  const payslip = buildPayslip(employee);
  const [headerImageSrc, signImageSrc, stampImageSrc] = await Promise.all([
    resolvePayslipHeaderImageSrc(),
    resolvePayslipSignImageSrc(),
    resolvePayslipStampImageSrc(),
  ]);
  const pdf = await renderToBuffer(
    <PayslipDocument
      payslip={payslip}
      headerImageSrc={headerImageSrc}
      signImageSrc={signImageSrc}
      stampImageSrc={stampImageSrc}
    />
  );
  return Buffer.from(pdf);
}
