"use client";

import { useEffect, useState } from "react";
import type { EmployeeRow } from "@/lib/types";

function previewKey(employee: EmployeeRow): string {
  return `${employee.employeeId}-${employee.payPeriod}-${employee.presentDays}`;
}

export function PayslipPreview({ employee }: { employee: EmployeeRow }) {
  return (
    <PayslipPreviewInner
      key={previewKey(employee)}
      employee={employee}
    />
  );
}

function PayslipPreviewInner({ employee }: { employee: EmployeeRow }) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/preview-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ employee }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Preview failed");
        }
        const blob = await res.blob();
        url = URL.createObjectURL(blob);
        if (!cancelled) setPdfUrl(url);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Preview failed");
        }
      }
    })();

    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [employee]);

  if (error) {
    return (
      <div className="bg-red-50 px-6 py-8 text-center text-sm text-red-800">
        {error}
      </div>
    );
  }

  if (!pdfUrl) {
    return (
      <div className="flex flex-col items-center justify-center bg-[var(--surface-muted)] py-20">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--cness-navy)]/20 border-t-[var(--cness-navy)]" />
        <p className="mt-4 text-sm text-[var(--text-muted)]">
          Rendering payslip from HTML template…
        </p>
      </div>
    );
  }

  return (
    <iframe
      src={pdfUrl}
      title={`Payslip — ${employee.employeeName}`}
      className="h-[min(720px,75vh)] w-full bg-white"
    />
  );
}
