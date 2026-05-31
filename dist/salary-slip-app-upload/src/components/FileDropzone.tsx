"use client";

import { useCallback, useRef, useState } from "react";

interface FileDropzoneProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
}

export function FileDropzone({ file, onFileChange, disabled }: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const f = files?.[0];
      if (f && /\.(xlsx|xls|csv)$/i.test(f.name)) {
        onFileChange(f);
      }
    },
    [onFileChange]
  );

  return (
    <div
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (!disabled) handleFiles(e.dataTransfer.files);
      }}
      className={`
        group relative cursor-pointer rounded-2xl border-2 border-dashed px-8 py-12 text-center transition-all duration-300
        ${dragOver ? "border-[var(--cness-gold)] bg-[var(--cness-gold-soft)]/40 scale-[1.01]" : "border-[var(--border)] bg-white/60 hover:border-[var(--cness-navy-light)]/40 hover:bg-white"}
        ${disabled ? "pointer-events-none opacity-50" : ""}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        disabled={disabled}
        onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
      />

      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--cness-navy)]/5 text-[var(--cness-navy)] transition group-hover:bg-[var(--cness-navy)]/10">
        <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
      </div>

      {file ? (
        <>
          <p className="font-medium text-[var(--cness-navy)]">{file.name}</p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {(file.size / 1024).toFixed(1)} KB · Click or drop to replace
          </p>
        </>
      ) : (
        <>
          <p className="font-medium text-[var(--cness-navy)]">
            Drop your Excel file here
          </p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            or click to browse · .xlsx, .xls, .csv
          </p>
        </>
      )}
    </div>
  );
}
