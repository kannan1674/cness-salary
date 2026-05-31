/**
 * Zip project for Netlify — excludes .next, node_modules, .env.local
 * Output: dist/salary-slip-app-netlify.zip
 */
import { execSync } from "child_process";
import { existsSync, mkdirSync, rmSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = join(root, "dist");
const zipPath = join(distDir, "salary-slip-app-netlify.zip");

execSync("node scripts/sync-salary-template.mjs", { cwd: root, stdio: "inherit" });
execSync("node scripts/verify-deploy-files.mjs", { cwd: root, stdio: "inherit" });

mkdirSync(distDir, { recursive: true });
if (existsSync(zipPath)) rmSync(zipPath, { force: true });

const excludes = [
  "node_modules/*",
  ".next/*",
  "out/*",
  "dist/*",
  ".git/*",
  ".env.local",
  ".DS_Store",
  "salary-slip-app@*",
  "CNESS Payslip*.pdf",
  "*.zip",
];

const excludeFlags = excludes.map((x) => `-x "${x}"`).join(" ");

execSync(`zip -r "${zipPath}" . ${excludeFlags}`, { cwd: root, stdio: "inherit" });

console.log("\n✓ Zip ready (no .next, no node_modules):");
console.log(" ", zipPath);
console.log("\nUpload to Netlify, then set:");
console.log("  Base directory: (folder with package.json after unzip)");
console.log("  Build command: npm run build");
console.log("  Publish directory: leave EMPTY");
