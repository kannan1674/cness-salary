# CNESS Salary Slip Generator

Next.js web app to upload an Excel file with employee salary and attendance, generate payslips matching the **CNESS Software India** template, and email each employee a PDF attachment.

## Features

- Upload `.xlsx` / `.xls` / `.csv` with employee data
- Auto-calculate earnings (Basic, HRA, Other Allowance) and deductions
- Pro-rate salary by **Present Days / Working Days**
- Preview payslips in the browser
- Fill your **official PDF template** (`CNESS Payslip - .pdf`) with employee data — layout/logo unchanged
- Bulk email PDF to each employee via SMTP

## Quick start

```bash
cd salary-slip-app
npm install
cp .env.example .env.local
# Edit .env.local with your SMTP credentials
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Excel format

**Required columns**

| Column        | Aliases accepted                          |
|---------------|-------------------------------------------|
| Employee Name | name, employee                            |
| Email         | email id, mail                            |
| Salary        | gross salary, monthly salary, gross         |
| Present Days  | days present, attendance                  |

**Optional columns** (recommended for full payslip)

Employee ID, Designation, Department, Date of Joining, PAN Number, Bank Name, Account Number, IFSC Code, Pay Period, Working Days, Basic, HRA, Other Allowance, Professional Tax, TDS

You can also use **CTC** (annual) instead of Salary — the app divides by 12.

Download a sample file from the app UI (**Download sample Excel template**) or:

```
GET /api/sample-excel
```

## Salary calculation

- **Salary** = monthly gross earnings (before deductions), matching total earnings on the sample payslip (e.g. ₹70,200).
- Earnings split (if not provided in Excel): Basic 49.9%, HRA 24.9%, Other Allowance remainder — same ratios as the CNESS sample PDF.
- Amounts are pro-rated: `(Present Days ÷ Working Days) × monthly amount`.
- Default Professional Tax: ₹200 (pro-rated).
- **Net Pay** = Total Earnings − Total Deductions.

## Email setup (Gmail example)

1. Enable 2FA on your Google account.
2. Create an [App Password](https://myaccount.google.com/apppasswords).
3. Add to `.env.local`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=hr@cness.com
SMTP_PASS=your-16-char-app-password
SMTP_FROM="CNESS HR <hr@cness.com>"
```

Use **Dry run** first to verify PDF generation without sending emails.

## API routes

| Route               | Method | Description                    |
|---------------------|--------|--------------------------------|
| `/api/parse`        | POST   | Parse Excel, return preview    |
| `/api/send`         | POST   | Generate PDFs and send emails  |
| `/api/sample-excel` | GET    | Download template Excel        |

## Payslip HTML template

**Single design file:** `salary-template.html` (project root)

- **Local HTML PDF** (Puppeteer): uses `salary-template.html` directly.
- **Netlify / production PDF**: same file, bundled into the app — **identical output** (not a separate react-pdf layout).

`PayslipDocument.tsx` (@react-pdf/renderer) is only a fallback if Chromium fails.

After editing `salary-template.html`, run:

```bash
npm run sync-template
```

This updates `templates/salary-template.html` and the Netlify bundle (`src/lib/salary-template.bundled.ts`). `npm run build` runs sync automatically.

Placeholders: `{{employeeName}}`, `{{basicSalary}}`, etc. — see `buildPayslipTemplateVars()` in `src/lib/payslip-template-spec.ts`.

## Production

```bash
npm run build
npm start
```

## Deploy to Netlify **without Git**

You do not need Git. Upload the project from your Mac using **Netlify CLI** (recommended).

### 1. Prepare on your computer

```bash
cd "/Users/meikannan/Downloads/Salary Slip/salary-slip-app"
npm install
npm run sync-template
npm run verify-deploy
```

`verify-deploy` must print **OK**. You do **not** need to run `npm run build` before upload — Netlify builds for you.

### Upload without `.next` or `node_modules`

**Option A — ZIP (easiest)**

```bash
npm run package-netlify
```

This creates:

`salary-slip-app/dist/salary-slip-app-netlify.zip`

Upload that zip to Netlify (drag folder after unzip, or manual deploy). The zip **excludes**:

- `.next` (Netlify creates this on build)
- `node_modules` (Netlify runs `npm install`)
- `.env.local` (secrets — set SMTP in Netlify dashboard instead)

**Option B — Netlify CLI** (also skips uploading `.next` — only sends source files)

```bash
netlify deploy --build --prod
```

### What must be in the upload

Include the **full** app:

- `src/` (all files)
- `scripts/`
- `public/` (cness.png, sign.png, stamp.png)
- `salary-template.html`
- `package.json`, `package-lock.json`
- `next.config.ts`, `tsconfig.json`, `netlify.toml`

**Never required in upload:** `.next`, `node_modules`

```bash
npm install -g netlify-cli
netlify login
```

### 3. Deploy (no Git)

```bash
cd "/Users/meikannan/Downloads/Salary Slip/salary-slip-app"
netlify init
```

Choose **Create & configure a new project**, then:

```bash
netlify deploy --build --prod
```

Netlify builds on their servers from the files on your machine (`npm run build`).

### 4. Environment variables (Netlify dashboard)

Site → **Project configuration** → **Environment variables**:

| Variable | Example |
|----------|---------|
| `PDF_RENDERER` | `html` |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `465` |
| `SMTP_SECURE` | `true` |
| `SMTP_USER` | your email |
| `SMTP_PASS` | Gmail app password |
| `SMTP_FROM` | `CNESS HR <your@email.com>` |

### 5. Test

Open `https://YOUR-SITE.netlify.app/api/health` — should return JSON with `"ok": true`.

### If you upload a ZIP manually

Use `npm run package-netlify` — it excludes `.next` and `node_modules` automatically.

After unzip on Netlify, set **Base directory** to the folder that contains `package.json` (e.g. `salary-slip-app-upload`).

Do **not** set Publish directory to `.next` in the Netlify UI.

### Netlify (100% template match)

PDFs are rendered from **`salary-template.html`** using headless Chrome (`@sparticuz/chromium`). This is the only way to get a pixel-perfect match with your HTML design. The `@react-pdf/renderer` package cannot render HTML/CSS and is only used if Chromium fails.

1. Include `netlify.toml` in the folder you deploy.
2. In **Site settings → Environment variables**, set:
   - `PDF_RENDERER` = `html` (or leave unset — default is `html`; `react-pdf` also uses the HTML template)
   - All `SMTP_*` variables from `.env.example`
3. After deploy, open `https://your-site.netlify.app/api/health` — expect:
   ```json
   { "pdfRenderer": "html", "pdfEngine": "salary-template.html (Puppeteer)", "bundledTemplate": true }
   ```
4. Redeploy after any change to `salary-template.html` (`npm run build` runs `sync-template`).

**Note:** First PDF send may take 15–30s on Netlify while Chromium starts.

For Vercel/serverless, ensure SMTP provider allows connections from your host. Some teams use SendGrid/Resend instead of raw SMTP — swap `src/lib/email.ts` if needed.
