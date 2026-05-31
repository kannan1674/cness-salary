/**
 * Run before uploading to Netlify (no Git): node scripts/verify-deploy-files.mjs
 */
import { existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const required = [
  "salary-template.html",
  "netlify.toml",
  "package.json",
  "package-lock.json",
  "next.config.ts",
  "tsconfig.json",
  "scripts/sync-salary-template.mjs",
  "src/lib/pdf.tsx",
  "src/lib/html-payslip.ts",
  "src/lib/email.ts",
  "src/lib/excel.ts",
  "src/lib/payslip-template-spec.ts",
  "src/lib/salary-template.bundled.ts",
  "src/app/api/health/route.ts",
  "src/app/api/send/route.ts",
  "src/app/api/parse/route.ts",
  "src/app/page.tsx",
];

const missing = required.filter((f) => !existsSync(join(root, f)));

if (missing.length) {
  console.error("Missing files — upload the FULL salary-slip-app folder:\n");
  missing.forEach((f) => console.error("  -", f));
  console.error("\nFix: run  npm run sync-template  then verify again.");
  process.exit(1);
}

console.log("OK — all required files present. Safe to deploy to Netlify.");
