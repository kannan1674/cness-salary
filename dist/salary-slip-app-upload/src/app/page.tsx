"use client";

import Image from "next/image";
import { useCallback, useMemo, useState } from "react";
import { FileDropzone } from "@/components/FileDropzone";
import { StatusBanner } from "@/components/StatusBanner";
import { StepIndicator } from "@/components/StepIndicator";
import { fetchJson } from "@/lib/fetch-json";
import type { EmployeeRow } from "@/lib/types";

interface PreviewRow {
  employeeName: string;
  email: string;
  employeeId: string;
  payPeriod: string;
  presentDays: number;
  workingDays: number;
  netPay: number;
  totalEarnings: number;
}

interface ParseResponse {
  employees: EmployeeRow[];
  preview: PreviewRow[];
  errors: string[];
  count: number;
  detectedColumns?: Record<string, string>;
  headerRow?: number;
}

interface SendResult {
  employeeName: string;
  email: string;
  status: string;
  message?: string;
}

function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "gold";
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold tracking-wide transition-all duration-200 disabled:pointer-events-none disabled:opacity-45";
  const variants = {
    primary:
      "bg-[var(--cness-navy)] text-white shadow-[0_8px_24px_-6px_rgba(26,36,86,0.45)] hover:bg-[var(--cness-navy-light)] hover:shadow-[0_12px_28px_-6px_rgba(26,36,86,0.5)] active:scale-[0.98]",
    secondary:
      "border border-[var(--border)] bg-white text-[var(--cness-navy)] shadow-sm hover:border-[var(--cness-navy)]/25 hover:bg-[var(--surface-muted)]",
    ghost:
      "text-[var(--cness-navy)] hover:bg-white/90",
    gold:
      "bg-gradient-to-r from-[var(--cness-gold)] via-[#e4b422] to-[#e8b830] text-[var(--cness-navy)] shadow-[0_8px_24px_-6px_rgba(212,160,18,0.45)] hover:shadow-[0_12px_28px_-6px_rgba(212,160,18,0.5)] active:scale-[0.98]",
  };
  return (
    <button
      type="button"
      className={`${base} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

function StepBadge({ n }: { n: number }) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--cness-navy)] to-[var(--cness-navy-light)] text-sm font-bold text-white shadow-md">
      {n}
    </span>
  );
}

const EXCEL_HINTS = [
  "Employee Name",
  "Email",
  "Salary",
  "Present Days",
];

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [parseData, setParseData] = useState<ParseResponse | null>(null);
  const [loading, setLoading] = useState<"parse" | "send" | null>(null);
  const [dryRun, setDryRun] = useState(false);
  const [testEmailLoading, setTestEmailLoading] = useState(false);
  const [sendResults, setSendResults] = useState<SendResult[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageVariant, setMessageVariant] = useState<
    "info" | "success" | "warning" | "error"
  >("info");
  const [fallbackEmail] = useState("");
  const [parseErrors, setParseErrors] = useState<string[]>([]);

  const currentStep = useMemo((): 1 | 2 => {
    if (sendResults || parseData?.count || file) return 2;
    return 1;
  }, [parseData, sendResults, file]);

  const totalNetPay = useMemo(() => {
    if (!parseData?.preview.length) return 0;
    return parseData.preview.reduce((sum, row) => sum + row.netPay, 0);
  }, [parseData]);

  const onFileChange = (f: File | null) => {
    setFile(f);
    setParseData(null);
    setSendResults(null);
    setMessage(null);
    setParseErrors([]);
  };

  const parseEmployees = useCallback(
    async (showStatusMessage: boolean): Promise<ParseResponse | null> => {
      if (!file) {
        setMessage("Please upload an Excel file first.");
        setMessageVariant("warning");
        return null;
      }

      const formData = new FormData();
      formData.append("file", file);
      if (fallbackEmail.trim()) {
        formData.append("fallbackEmail", fallbackEmail.trim());
      }

      const { data, response: res } = await fetchJson<
        ParseResponse & { error?: string }
      >("/api/parse", { method: "POST", body: formData });
      if (!res.ok) throw new Error(data.error || "Parse failed");

      setParseData(data);
      setParseErrors(data.errors ?? []);

      if (showStatusMessage) {
        const fakeEmails = (data.employees as EmployeeRow[] | undefined)?.filter(
          (e) =>
            /@example\.(com|org|net)$/i.test(e.email) ||
            e.email.includes("test@")
        );

        if (data.count === 0) {
          setMessage("No employees found. Check the details below.");
          setMessageVariant("warning");
        } else if (fakeEmails?.length) {
          setMessage(
            `Loaded ${data.count} employee(s). Some rows use placeholder emails — use real addresses before sending.`
          );
          setMessageVariant("warning");
        } else if (data.errors?.length) {
          setMessage(`Loaded ${data.count} employee(s) with minor warnings.`);
          setMessageVariant("info");
        } else {
          setMessage(`Ready — ${data.count} employee(s) loaded for sending.`);
          setMessageVariant("success");
        }
      }

      return data;
    },
    [file, fallbackEmail]
  );

  const parseFile = useCallback(async () => {
    setLoading("parse");
    setMessage(null);
    try {
      await parseEmployees(true);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Parse failed");
      setMessageVariant("error");
    } finally {
      setLoading(null);
    }
  }, [parseEmployees]);

  const sendTestEmail = useCallback(async () => {
    setTestEmailLoading(true);
    setMessage(null);
    try {
      const { data, response: res } = await fetchJson<{ error?: string; message?: string }>(
        "/api/test-email",
        { method: "POST" }
      );
      if (!res.ok) throw new Error(data.error || "Test failed");
      setMessage(data.message ?? "Test email sent.");
      setMessageVariant("success");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Test email failed");
      setMessageVariant("error");
    } finally {
      setTestEmailLoading(false);
    }
  }, []);

  const sendPayslips = useCallback(async () => {
    if (!file && !parseData?.employees?.length) {
      setMessage("Please upload an Excel file first.");
      setMessageVariant("warning");
      return;
    }
    setLoading("send");
    setMessage(null);
    setSendResults(null);
    try {
      let employees = parseData?.employees;
      if (!employees?.length) {
        const parsed = await parseEmployees(false);
        employees = parsed?.employees;
      }
      if (!employees?.length) {
        throw new Error("No employees found to send payslips.");
      }

      const formData = new FormData();
      formData.append("employees", JSON.stringify(employees));
      formData.append("dryRun", String(dryRun));
      if (fallbackEmail.trim()) {
        formData.append("fallbackEmail", fallbackEmail.trim());
      }
      const { data, response: res } = await fetchJson<{
        error?: string;
        errors?: string[];
        results?: SendResult[];
        sent?: number;
        failed?: number;
        total?: number;
      }>("/api/send", { method: "POST", body: formData });
      if (!res.ok) {
        setParseErrors(data.errors ?? []);
        const details = (data.errors as string[] | undefined)?.join(" ");
        throw new Error(
          details ? `${data.error}: ${details}` : data.error || "Send failed"
        );
      }
      setSendResults(data.results ?? null);
      setMessage(
        dryRun
          ? `Dry run complete — ${data.total} PDF(s) generated. No emails sent.`
          : `Delivered ${data.sent} of ${data.total} payslip(s).`
      );
      setMessageVariant(dryRun ? "info" : data.failed ? "warning" : "success");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Send failed");
      setMessageVariant("error");
    } finally {
      setLoading(null);
    }
  }, [file, parseData, parseEmployees, dryRun, fallbackEmail]);

  const allErrors =
    parseErrors.length > 0 ? parseErrors : (parseData?.errors ?? []);

  return (
    <div className="page-bg min-h-screen">
      {/* Header */}
      <header className="relative overflow-hidden border-b border-white/10 bg-[var(--cness-navy)] text-white">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--cness-navy-light)]/60 via-transparent to-[#0f1638]/80" />
        <div
          className="absolute -right-24 -top-24 h-80 w-80 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(212,160,18,0.35) 0%, transparent 68%)",
          }}
        />
        <div
          className="absolute -bottom-32 left-1/4 h-64 w-64 rounded-full opacity-20"
          style={{
            background:
              "radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 70%)",
          }}
        />

        <div className="relative mx-auto max-w-6xl px-6 py-11 sm:py-14">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-white/80 backdrop-blur-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--cness-gold)] shadow-[0_0_8px_var(--cness-gold)]" />
                HR Payroll
              </div>
              <div className="mb-4 flex items-center gap-4">
                <div className="rounded-xl bg-white/95 p-2 shadow-lg ring-1 ring-white/20">
                  <Image
                    src="/cness-hq-logo.png"
                    alt="CNESS"
                    width={160}
                    height={56}
                    className="h-10 w-auto object-contain object-left"
                    priority
                  />
                </div>
              </div>
              <h1 className="display-title text-4xl font-semibold leading-tight sm:text-[2.75rem]">
                Payslip Studio
              </h1>
              <p className="mt-3 text-[15px] leading-relaxed text-white/72 sm:text-base">
                Upload payroll data and send official PDF payslips directly to
                your team in one refined workflow.
              </p>
            </div>

            <div className="w-full max-w-md rounded-2xl border border-white/12 bg-white/[0.07] px-6 py-5 shadow-2xl shadow-black/20 backdrop-blur-md lg:shrink-0">
              <p className="mb-4 text-center text-[10px] font-semibold uppercase tracking-[0.25em] text-white/50">
                Your progress
              </p>
              <StepIndicator
                current={currentStep}
                uploadDone={!!file || !!parseData?.count}
                sendDone={!!sendResults}
              />
            </div>
          </div>
        </div>
        <div className="gold-accent-line mx-auto max-w-6xl" />
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        {parseData?.count ? (
          <div className="mb-8 grid gap-4 sm:grid-cols-3 animate-fade-up">
            <div className="rounded-2xl border border-[var(--border)] bg-white px-5 py-4 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Employees
              </p>
              <p className="display-title mt-1 text-3xl font-semibold text-[var(--cness-navy)]">
                {parseData.count}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-white px-5 py-4 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Combined net pay
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--cness-navy)] sm:text-3xl">
                ₹{totalNetPay.toLocaleString("en-IN")}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--cness-gold-soft)]/60 to-white px-5 py-4 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Pay period
              </p>
              <p className="mt-1 truncate text-lg font-semibold text-[var(--cness-navy)]">
                {parseData.preview[0]?.payPeriod ?? "—"}
              </p>
            </div>
          </div>
        ) : null}

        <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
          {/* Left column — actions */}
          <div className="space-y-6 lg:col-span-12">
            {/* Step 1 */}
            <section className="section-card section-card-accent animate-fade-up p-6 pl-7 sm:p-8 sm:pl-9">
              <div className="mb-6 flex items-start gap-4">
                <StepBadge n={1} />
                <div>
                  <h2 className="display-title text-xl font-semibold text-[var(--cness-navy)]">
                    Import data
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">
                    Excel with name, salary &amp; attendance
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {EXCEL_HINTS.map((hint) => (
                      <span key={hint} className="chip">
                        {hint}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <FileDropzone
                file={file}
                onFileChange={onFileChange}
                disabled={loading !== null}
              />

              {/* <div className="mt-5">
                <label className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                  Fallback email
                </label>
                <input
                  type="email"
                  value={fallbackEmail}
                  onChange={(e) => setFallbackEmail(e.target.value)}
                  placeholder="Optional — if sheet has no Email column"
                  className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm outline-none transition focus:border-[var(--cness-navy)]/40 focus:ring-2 focus:ring-[var(--cness-navy)]/10"
                />
              </div> */}

              <div className="mt-7 flex flex-wrap items-center gap-3 border-t border-[var(--border)] pt-6">
                <Button
                  onClick={parseFile}
                  disabled={!file || loading !== null}
                  variant="primary"
                >
                  {loading === "parse" ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Processing…
                    </>
                  ) : (
                    <>
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                      Load employees
                    </>
                  )}
                </Button>
                <a
                  href="/api/sample-excel"
                  className="text-sm font-medium text-[var(--cness-navy)] underline decoration-[var(--cness-gold)]/60 underline-offset-4 hover:decoration-[var(--cness-gold)]"
                >
                  {/* Sample template */}
                </a>
              </div>
            </section>

            {/* Step 3 — Send */}
            <section
              className={`section-card section-card-accent p-6 pl-7 sm:p-8 sm:pl-9 ${!file && !parseData?.count ? "opacity-55" : "animate-fade-up"}`}
            >
              <div className="mb-6 flex items-start gap-4">
                <StepBadge n={2} />
                <div>
                  <h2 className="display-title text-xl font-semibold text-[var(--cness-navy)]">
                    Deliver
                  </h2>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    Email PDF payslips via Gmail
                  </p>
                </div>
              </div>

              <label
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                  dryRun
                    ? "border-amber-200 bg-amber-50/80"
                    : "border-[var(--border)] bg-[var(--surface-muted)]/50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={dryRun}
                  onChange={(e) => setDryRun(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-[var(--border)] text-[var(--cness-navy)]"
                />
                <div>
                  <span className="text-sm font-medium text-[var(--cness-navy)]">
                    Dry run
                  </span>
                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                    Generate PDFs only — no emails sent
                  </p>
                </div>
              </label>

              <div className="mt-6 flex flex-col gap-3 border-t border-[var(--border)] pt-6">
                <Button
                  variant="secondary"
                  onClick={sendTestEmail}
                  disabled={testEmailLoading || loading !== null}
                  className="w-full"
                >
                  {testEmailLoading ? "Sending…" : "Test SMTP connection"}
                </Button>
                <Button
                  variant="gold"
                  onClick={sendPayslips}
                  disabled={(!file && !parseData?.count) || loading !== null}
                  className="w-full"
                >
                  {loading === "send" ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--cness-navy)]/20 border-t-[var(--cness-navy)]" />
                      Sending…
                    </>
                  ) : dryRun ? (
                    "Generate all PDFs"
                  ) : (
                    <>
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                      Send all payslips
                    </>
                  )}
                </Button>
              </div>
            </section>

            {message && (
              <StatusBanner variant={messageVariant}>{message}</StatusBanner>
            )}

            {allErrors.length > 0 && (
              <StatusBanner
                variant={parseData?.count === 0 ? "warning" : "info"}
                title={parseData?.count === 0 ? "Import issue" : "Notes"}
              >
                {parseData?.detectedColumns &&
                  Object.keys(parseData.detectedColumns).length > 0 && (
                    <p className="mb-2 text-xs opacity-80">
                      Columns detected (row {parseData.headerRow}):{" "}
                      {Object.entries(parseData.detectedColumns)
                        .map(([k, v]) => `${k}="${v}"`)
                        .join(", ")}
                    </p>
                  )}
                <ul className="list-inside list-disc space-y-1 text-xs">
                  {allErrors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </StatusBanner>
            )}

            {sendResults && (
              <section className="section-card p-6 sm:p-7">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Delivery log
                </h3>
                <ul className="mt-4 max-h-52 space-y-2 overflow-y-auto text-xs">
                  {sendResults.map((r, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]/60 px-4 py-3"
                    >
                      <span
                        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                          r.status === "sent"
                            ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]"
                            : r.status === "failed"
                              ? "bg-red-500"
                              : "bg-amber-400"
                        }`}
                      />
                      <span>
                        <strong className="text-[var(--cness-navy)]">
                          {r.employeeName}
                        </strong>
                        <span className="text-[var(--text-muted)]">
                          {" "}
                          · {r.email}
                        </span>
                        <span
                          className={
                            r.status === "sent"
                              ? " text-emerald-700"
                              : r.status === "failed"
                                ? " text-red-700"
                                : ""
                          }
                        >
                          {" "}
                          — {r.status}
                        </span>
                        {r.message && (
                          <span className="mt-0.5 block text-[var(--text-muted)]">
                            {r.message}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>
      </main>

      <footer className="border-t border-[var(--border)] bg-white/50 py-10 text-center backdrop-blur-sm">
        <p className="text-xs font-medium tracking-wide text-[var(--text-muted)]">
          CNESS Software India Private Limited
        </p>
        <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]/70">
          Payslip Studio
        </p>
      </footer>
    </div>
  );
}
