import { SALARY_TEMPLATE_HTML } from "./salary-template.bundled";
import type { EmployeeRow } from "./types";

/** True on Netlify, Vercel, AWS Lambda, etc. */
export function isServerlessDeployment(): boolean {
  return Boolean(
    process.env.NETLIFY ||
      process.env.NETLIFY_DEV ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.VERCEL ||
      process.env.CF_PAGES
  );
}

export function hasBundledSalaryTemplate(): boolean {
  return SALARY_TEMPLATE_HTML.length > 100;
}

/**
 * PDF renderer mode.
 * - html / template: salary-template.html via Puppeteer (100% layout match)
 * - react-pdf: legacy alias → also uses salary-template.html
 */
export function getEffectivePdfRenderer(): string {
  const configured = process.env.PDF_RENDERER?.toLowerCase().trim();
  if (configured === "react-pdf" || configured === "template") {
    return "html";
  }
  if (configured) return configured;
  return "html";
}

async function generateFromSalaryTemplate(
  employee: EmployeeRow
): Promise<Buffer> {
  const { generatePayslipPdfFromHtml } = await import("./html-payslip");
  return generatePayslipPdfFromHtml(employee);
}

async function generateFromReactPdfFallback(
  employee: EmployeeRow
): Promise<Buffer> {
  const { generatePayslipPdfFromReactPdf } = await import("./react-pdf-payslip");
  return generatePayslipPdfFromReactPdf(employee);
}

/**
 * Payslip PDF — always uses salary-template.html when possible (100% UI match).
 * @react-pdf/renderer is only used if HTML/Chromium fails.
 */
export async function generatePayslipPdf(employee: EmployeeRow): Promise<Buffer> {
  const mode = getEffectivePdfRenderer();

  if (mode === "html") {
    return generateFromSalaryTemplate(employee);
  }

  try {
    return await generateFromSalaryTemplate(employee);
  } catch (error) {
    console.error(
      "salary-template.html PDF failed, falling back to @react-pdf/renderer:",
      error
    );
    return generateFromReactPdfFallback(employee);
  }
}

export function payslipFileName(employeeName: string, payPeriod: string): string {
  const safeName = employeeName.replace(/[^\w\s-]/g, "").trim();
  const safePeriod = payPeriod.replace(/\s+/g, "_");
  return `CNESS Payslip - ${safeName} - ${safePeriod}.pdf`;
}
