import { existsSync } from "fs";
import path from "path";
import {
  PAYSLIP_LOGO_URL,
  PAYSLIP_SIGN_URL,
  PAYSLIP_STAMP_URL,
} from "./payslip-template-spec";

export function getPayslipAssetPath(filename: string): string {
  return path.join(process.cwd(), "public", filename);
}

export function getPayslipTemplatePath(): string {
  return getPayslipAssetPath("templates/cness-payslip-template.pdf");
}

export const PAYSLIP_HEADER_LOGO_URL = PAYSLIP_LOGO_URL;

export const PAYSLIP_HEADER_IMAGE = "cness.png";
export const PAYSLIP_SIGN_IMAGE = "sign.png";
export const PAYSLIP_STAMP_IMAGE = "stamp.png";

async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; CNESS-Payslip/1.0)" },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    const bytes = Buffer.from(await res.arrayBuffer());
    const ext = path.extname(url.split("?")[0] ?? url).toLowerCase();
    const mime =
      ext === ".jpg" || ext === ".jpeg"
        ? "image/jpeg"
        : ext === ".webp"
          ? "image/webp"
          : "image/png";
    return `data:${mime};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function resolvePayslipImageSrc(
  filename: string,
  remoteUrl: string
): Promise<string> {
  const localPath = getPayslipAssetPath(filename);
  if (existsSync(localPath)) return localPath;

  const assetPath = path.join(process.cwd(), "templates", "assets", filename);
  if (existsSync(assetPath)) return assetPath;

  const dataUrl = await fetchImageAsDataUrl(remoteUrl);
  if (dataUrl) return dataUrl;

  return localPath;
}

export async function resolvePayslipHeaderImageSrc(): Promise<string> {
  return resolvePayslipImageSrc(PAYSLIP_HEADER_IMAGE, PAYSLIP_HEADER_LOGO_URL);
}

export async function resolvePayslipSignImageSrc(): Promise<string> {
  return resolvePayslipImageSrc(PAYSLIP_SIGN_IMAGE, PAYSLIP_SIGN_URL);
}

export async function resolvePayslipStampImageSrc(): Promise<string> {
  return resolvePayslipImageSrc(PAYSLIP_STAMP_IMAGE, PAYSLIP_STAMP_URL);
}

/** Brand colors from official CNESS payslip */
export const CNESS_COLORS = {
  primary: "#1c2566",
  primaryDark: "#151d4f",
  label: "#2b3d9a",
  accentYellow: "#f0b429",
  stripe: "#f4f5f8",
  border: "#dde1ea",
  deduction: "#d32f2f",
  muted: "#6b7280",
};
