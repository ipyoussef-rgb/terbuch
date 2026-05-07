type Props = { step: 1 | 2 | 3 | 4 };

const STEPS = ["Service", "Amt", "Termin", "Daten"] as const;

export function Stepper({ step }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-2 text-xs">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const active = n === step;
        const done = n < step;
        return (
          <div key={label} className="flex items-center gap-2">
            <span
              className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-semibold transition-colors ${
                active
                  ? "bg-[var(--color-kobil-blue)] text-white"
                  : done
                    ? "bg-[var(--color-kobil-mist)] text-[var(--color-kobil-blue)]"
                    : "bg-[var(--color-kobil-line)] text-[var(--color-kobil-navy)]/40"
              }`}
            >
              {done ? (
                <svg viewBox="0 0 12 12" className="w-2.5 h-2.5" aria-hidden="true">
                  <path
                    d="M2.5 6 5 8.5 9.5 4"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                n
              )}
            </span>
            <span
              className={`${
                active
                  ? "text-[var(--color-kobil-navy)] font-medium"
                  : "text-[var(--color-kobil-navy)]/40"
              }`}
            >
              {label}
            </span>
            {n < STEPS.length && (
              <span className="hidden sm:inline-block w-4 h-px bg-[var(--color-kobil-line)] mx-1" />
            )}
          </div>
        );
      })}
    </div>
  );
}
