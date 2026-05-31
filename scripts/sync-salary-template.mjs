/**
 * Copies salary-template.html into the JS bundle (Netlify) and templates/.
 * Run automatically before build, or manually: npm run sync-template
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "salary-template.html");
const html = readFileSync(source, "utf8");

const bundledOut = join(root, "src/lib/salary-template.bundled.ts");
writeFileSync(
  bundledOut,
  `/* eslint-disable */\n/** Auto-generated from salary-template.html — run npm run sync-template */\nexport const SALARY_TEMPLATE_HTML: string = ${JSON.stringify(html)};\n`,
  "utf8"
);

const templatesDir = join(root, "templates");
mkdirSync(templatesDir, { recursive: true });
writeFileSync(join(templatesDir, "salary-template.html"), html, "utf8");

console.log("Synced salary-template.html → src/lib/salary-template.bundled.ts + templates/");
