import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getEffectivePdfRenderer(): string {
  const configured = process.env.PDF_RENDERER?.toLowerCase().trim();
  if (configured === "react-pdf" || configured === "template") {
    return "html";
  }
  if (configured) return configured;
  return "html";
}

function isServerlessDeployment(): boolean {
  return Boolean(
    process.env.NETLIFY ||
      process.env.NETLIFY_DEV ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.VERCEL ||
      process.env.CF_PAGES
  );
}

export async function GET() {
  let bundledTemplate = false;
  try {
    const { SALARY_TEMPLATE_HTML } = await import("@/lib/salary-template.bundled");
    bundledTemplate = SALARY_TEMPLATE_HTML.length > 100;
  } catch {
    bundledTemplate = false;
  }

  return NextResponse.json({
    ok: true,
    pdfRenderer: getEffectivePdfRenderer(),
    pdfRendererEnv: process.env.PDF_RENDERER ?? null,
    pdfEngine: "salary-template.html (Puppeteer)",
    bundledTemplate,
    serverless: isServerlessDeployment(),
    nodeEnv: process.env.NODE_ENV ?? "unknown",
  });
}
