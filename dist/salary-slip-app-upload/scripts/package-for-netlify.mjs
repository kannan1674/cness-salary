/**
 * Zip project for Netlify upload — excludes .next, node_modules, .env.local
 * Output: salary-slip-app/dist/salary-slip-app-netlify.zip
 */
import { execSync } from "child_process";
import { existsSync, mkdirSync, rmSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = join(root, "dist");
const staging = join(distDir, "salary-slip-app-upload");
const zipPath = join(distDir, "salary-slip-app-netlify.zip");

const EXCLUDE_DIRS = new Set([
  "node_modules",
  ".next",
  "out",
  "dist",
  ".git",
]);

const EXCLUDE_FILES = new Set([
  ".env.local",
  ".DS_Store",
]);

execSync("node scripts/sync-salary-template.mjs", { cwd: root, stdio: "inherit" });
execSync("node scripts/verify-deploy-files.mjs", { cwd: root, stdio: "inherit" });

mkdirSync(distDir, { recursive: true });
if (existsSync(staging)) {
  rmSync(staging, { recursive: true, force: true });
}

// rsync-like copy with exclusions (macOS)
const excludeArgs = [
  ...[...EXCLUDE_DIRS].map((d) => `--exclude=${d}`),
  ...[...EXCLUDE_FILES].map((f) => `--exclude=${f}`),
  "--exclude=salary-slip-app@*",
  '--exclude=CNESS Payslip*.pdf',
].join(" ");

execSync(`mkdir -p "${staging}" && rsync -a ${excludeArgs} "${root}/" "${staging}/"`, {
  stdio: "inherit",
});

if (existsSync(zipPath)) rmSync(zipPath, { force: true });
execSync(`cd "${distDir}" && zip -r "${zipPath}" salary-slip-app-upload`, {
  stdio: "inherit",
});

console.log("\n✓ Zip ready (no .next, no node_modules):");
console.log(" ", zipPath);
console.log("\nNetlify dashboard:");
console.log("  Base directory: (leave empty if zip root is salary-slip-app-upload)");
console.log("  Or unzip and set Base directory: salary-slip-app-upload");
console.log("  Build command: npm run build");
console.log("  Publish directory: (empty — use @netlify/plugin-nextjs)");
