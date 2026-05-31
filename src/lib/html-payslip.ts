import { existsSync } from "fs";
import fs from "fs/promises";
import path from "path";
import { SALARY_TEMPLATE_HTML } from "./salary-template.bundled";
import { buildPayslipTemplateVars } from "./payslip-template-spec";
import type { EmployeeRow } from "./types";

const TEMPLATES_DIR = path.join(process.cwd(), "templates");
const TEMPLATE_FILE = "salary-template.html";
const ASSETS_DIR = path.join(TEMPLATES_DIR, "assets");

import { PAYSLIP_LOGO_URL, PAYSLIP_SIGN_URL, PAYSLIP_STAMP_URL } from "./payslip-template-spec";

/** Remote URL → file under templates/assets/ (offline fallback) */
const REMOTE_ASSET_FILES: Record<string, string> = {
  [PAYSLIP_LOGO_URL]: "cness.png",
  [PAYSLIP_SIGN_URL]: "sign.png",
  [PAYSLIP_STAMP_URL]: "stamp.png",
  "https://nandhiji.com/wp-content/uploads/2026/Outsource/Cness%20HQ%20Logo.png":
    "cness-hq-logo.png",
  "https://nandhiji.com/wp-content/uploads/2026/Outsource/Cness HQ Logo.png":
    "cness-hq-logo.png",
  "https://nandhiji.com/wp-content/uploads/2026/Outsource/sign.jpeg":
    "sign.jpeg",
  "https://nandhiji.com/wp-content/uploads/2026/Outsource/stamp.jpeg":
    "stamp.jpeg",
};

async function loadTemplateHtml(): Promise<string> {
  if (SALARY_TEMPLATE_HTML?.length > 0) {
    return SALARY_TEMPLATE_HTML;
  }

  const rootPath = path.join(process.cwd(), "salary-template.html");
  const templatesPath = path.join(TEMPLATES_DIR, TEMPLATE_FILE);

  try {
    return await fs.readFile(rootPath, "utf-8");
  } catch {
    return fs.readFile(templatesPath, "utf-8");
  }
}

function mimeFromPath(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".gif") return "image/gif";
  if (ext === ".webp") return "image/webp";
  if (ext === ".svg") return "image/svg+xml";
  return "application/octet-stream";
}

function bufferToDataUrl(buffer: Buffer, mime: string): string {
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

async function readLocalImage(src: string): Promise<Buffer | null> {
  const basename = path.basename(src);
  const candidates = [
    path.join(process.cwd(), src),
    path.join(TEMPLATES_DIR, src),
    path.join(ASSETS_DIR, basename),
    path.join(TEMPLATES_DIR, basename),
    path.join(process.cwd(), "public", basename),
  ];

  for (const filePath of candidates) {
    if (existsSync(filePath)) {
      return fs.readFile(filePath);
    }
  }
  return null;
}

async function readRemoteImage(url: string): Promise<Buffer | null> {
  const assetFile = REMOTE_ASSET_FILES[url];
  if (assetFile) {
    const localPath = path.join(ASSETS_DIR, assetFile);
    if (existsSync(localPath)) {
      return fs.readFile(localPath);
    }
  }

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; CNESS-Payslip/1.0)" },
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

async function srcToDataUrl(src: string): Promise<string | null> {
  let buffer: Buffer | null = null;
  let mime = "image/png";

  if (/^https?:\/\//i.test(src)) {
    buffer = await readRemoteImage(src);
    mime = mimeFromPath(src.split("?")[0] ?? src);
  } else if (!src.startsWith("data:")) {
    buffer = await readLocalImage(src);
    if (buffer) mime = mimeFromPath(src);
  }

  if (!buffer?.length) return null;
  return bufferToDataUrl(buffer, mime);
}

async function embedImages(html: string): Promise<string> {
  const srcRegex = /\ssrc=["']([^"']+)["']/gi;
  const sources = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = srcRegex.exec(html)) !== null) {
    const src = match[1];
    if (!src.startsWith("data:")) sources.add(src);
  }

  let out = html;
  for (const src of sources) {
    const dataUrl = await srcToDataUrl(src);
    if (dataUrl) {
      out = out.split(src).join(dataUrl);
    }
  }
  return out;
}

function buildTemplateVars(employee: EmployeeRow) {
  return buildPayslipTemplateVars(employee);
}

function fillTemplate(html: string, vars: Record<string, string>): string {
  let out = html;
  for (const [key, value] of Object.entries(vars)) {
    out = out.replaceAll(`{{${key}}}`, value);
  }
  return out;
}

const SYSTEM_CHROME_PATHS = [
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/google-chrome",
  "/opt/google/chrome/chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
];

async function resolveChromeCandidates(): Promise<string[]> {
  const candidates: string[] = [];
  const envPath = process.env.PUPPETEER_EXECUTABLE_PATH?.trim();
  if (envPath && existsSync(envPath)) {
    candidates.push(envPath);
  }

  for (const candidate of SYSTEM_CHROME_PATHS) {
    if (existsSync(candidate)) candidates.push(candidate);
  }

  return Array.from(new Set(candidates));
}

function isRetryableLaunchError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = String(error.message || "");
  return (
    msg.includes("ENOEXEC") ||
    msg.includes("ENOENT") ||
    msg.includes("EACCES") ||
    msg.includes("spawn")
  );
}

// async function launchBrowserWithFallback() {
//   const puppeteer = await import("puppeteer-core");
//   const candidates = await resolveChromeCandidates();
//   if (!candidates.length) {
//     throw new Error(
//       "Chrome executable not found. Set PUPPETEER_EXECUTABLE_PATH to your server Chrome binary (example: /usr/bin/chromium-browser)."
//     );
//   }

//   const launchArgs = ["--no-sandbox", "--disable-setuid-sandbox"];
//   let lastError: unknown;
//   for (const executablePath of candidates) {
//     try {
//       return await puppeteer.default.launch({
//         headless: true,
//         executablePath,
//         args: launchArgs,
//       });
//     } catch (error) {
//       lastError = error;
//       if (!isRetryableLaunchError(error)) {
//         throw error;
//       }
//     }
//   }

//   throw new Error(
//     `Unable to launch Chrome with available candidates (${candidates.join(", ")}). Last error: ${
//       lastError instanceof Error ? lastError.message : String(lastError)
//     }`
//   );
// }

async function launchBrowserWithFallback() {
  const puppeteer = await import("puppeteer-core");

  if (
    process.env.NETLIFY ||
    process.env.NETLIFY_DEV ||
    process.env.AWS_LAMBDA_FUNCTION_NAME
  ) {
    const chromiumMod = await import("@sparticuz/chromium");
    const chromium = chromiumMod.default;
    chromium.setGraphicsMode = false;

    return puppeteer.default.launch({
      args: [...chromium.args, "--disable-dev-shm-usage"],
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }

  const candidates = await resolveChromeCandidates();

  if (!candidates.length) {
    throw new Error(
      "Chrome executable not found. Set PUPPETEER_EXECUTABLE_PATH."
    );
  }

  const launchArgs = ["--no-sandbox", "--disable-setuid-sandbox"];

  let lastError: unknown;

  for (const executablePath of candidates) {
    try {
      return await puppeteer.default.launch({
        headless: true,
        executablePath,
        args: launchArgs,
      });
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(
    `Unable to launch Chrome. Last error: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`
  );
}

export async function generatePayslipPdfFromHtml(
  employee: EmployeeRow
): Promise<Buffer> {
  let html = await loadTemplateHtml();
  html = fillTemplate(html, buildTemplateVars(employee));
  html = await embedImages(html);

  const browser = await launchBrowserWithFallback();

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 1 });
    await page.setContent(html, {
      waitUntil: "load",
      timeout: 90_000,
    });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
