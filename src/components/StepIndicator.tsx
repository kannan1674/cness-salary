const STEPS = [
  { id: 1, label: "Upload" },
  { id: 2, label: "Send" },
] as const;

export function StepIndicator({
  current,
  uploadDone,
  sendDone,
}: {
  current: 1 | 2;
  uploadDone: boolean;
  sendDone: boolean;
}) {
  return (
    <nav className="flex items-center justify-center gap-2 sm:gap-4">
      {STEPS.map((step, i) => {
        const done =
          (step.id === 1 && uploadDone) || (step.id === 2 && sendDone);
        const active = current === step.id;
        const reachable = step.id === 1 || uploadDone;

        return (
          <div key={step.id} className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2">
              <span
                className={`
                  flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all
                  ${active ? "bg-[var(--cness-navy)] text-white shadow-md" : ""}
                  ${done && !active ? "bg-[var(--cness-gold)]/20 text-[var(--cness-navy)]" : ""}
                  ${!active && !done ? "bg-white border border-[var(--border)] text-[var(--text-muted)]" : ""}
                `}
              >
                {done && !active ? (
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  step.id
                )}
              </span>
              <span
                className={`hidden text-sm font-medium sm:inline ${active ? "text-[var(--cness-navy)]" : "text-[var(--text-muted)]"} ${!reachable ? "opacity-50" : ""}`}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`h-px w-8 sm:w-16 ${uploadDone ? "bg-[var(--cness-gold)]" : "bg-[var(--border)]"}`}
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}
