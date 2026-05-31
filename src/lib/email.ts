import nodemailer from "nodemailer";

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

function stripEnvQuotes(value: string | undefined): string {
  if (!value) return "";
  return value.replace(/^["']|["']$/g, "").trim();
}

export function getEmailConfig(): EmailConfig | null {
  const host = stripEnvQuotes(
    process.env.SMTP_HOST || process.env.SMTP_SERVER
  );
  const user = stripEnvQuotes(process.env.SMTP_USER);
  const pass = stripEnvQuotes(
    process.env.SMTP_PASS || process.env.SMTP_PASSWORD
  );
  const from = stripEnvQuotes(process.env.SMTP_FROM) || user;

  if (!host || !user || !pass || !from) return null;

  return {
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    user,
    pass,
    from,
  };
}

function createTransporter(config: EmailConfig) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
  });
}

export async function sendTestEmail(): Promise<void> {
  const config = getEmailConfig();
  if (!config) {
    throw new Error("SMTP is not configured.");
  }

  const transporter = createTransporter(config);
  await transporter.verify();

  await transporter.sendMail({
    from: config.from,
    to: config.user,
    subject: "CNESS Payslip — SMTP test",
    html: `
      <p>This is a test email from the CNESS Salary Slip app.</p>
      <p>If you received this, SMTP is working. Payslips will be sent to addresses in your Excel <strong>Email</strong> column.</p>
    `,
  });
}

export async function verifySmtpConnection(): Promise<EmailConfig> {
  const config = getEmailConfig();
  if (!config) {
    throw new Error(
      "SMTP is not configured. Put .env.local in the project root (salary-slip-app/.env.local), not in src/."
    );
  }
  const transporter = createTransporter(config);
  await transporter.verify();
  return config;
}

export async function sendPayslipEmail(
  params: {
    to: string;
    employeeName: string;
    payPeriod: string;
    pdfBuffer: Buffer;
    fileName: string;
  },
  config?: EmailConfig
): Promise<void> {
  const cfg = config ?? getEmailConfig();
  if (!cfg) {
    throw new Error(
      "SMTP is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS in salary-slip-app/.env.local"
    );
  }

  const transporter = createTransporter(cfg);

  await transporter.sendMail({
    from: cfg.from,
    to: params.to,
    bcc: cfg.user,
    subject: `Salary Payslip - ${params.payPeriod} | CNESS Software India`,
    html: `
      <p>Dear ${params.employeeName},</p>
      <p>Please find attached your salary payslip for <strong>${params.payPeriod}</strong>.</p>
      <p>This is a system-generated email from CNESS Software India Private Limited.</p>
      <p>Regards,<br/>HR Team<br/>CNESS Software India Pvt. Ltd.</p>
    `,
    attachments: [
      {
        filename: params.fileName,
        content: params.pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  });
}
