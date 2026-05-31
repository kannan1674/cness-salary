type Variant = "info" | "success" | "warning" | "error";

const styles: Record<Variant, string> = {
  info: "border-[var(--border)] bg-white text-[var(--text)]",
  success: "border-emerald-200/80 bg-emerald-50/90 text-emerald-900",
  warning: "border-amber-200/80 bg-amber-50/90 text-amber-950",
  error: "border-red-200/80 bg-red-50/90 text-red-900",
};

export function StatusBanner({
  variant = "info",
  title,
  children,
}: {
  variant?: Variant;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`animate-fade-up rounded-xl border px-5 py-4 text-sm ${styles[variant]}`}
    >
      {title && <p className="mb-1 font-semibold">{title}</p>}
      <div className="text-[0.925rem] leading-relaxed opacity-95">{children}</div>
    </div>
  );
}
