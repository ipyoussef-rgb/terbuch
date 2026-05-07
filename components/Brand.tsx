import type { SVGProps } from "react";

type Variant = "blue" | "white" | "navy";

const COLOR: Record<Variant, string> = {
  blue: "var(--color-kobil-blue)",
  white: "#ffffff",
  navy: "var(--color-kobil-navy)",
};

export function KobilSignal({
  variant = "blue",
  className,
  ...rest
}: { variant?: Variant; className?: string } & SVGProps<SVGSVGElement>) {
  const c = COLOR[variant];
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      {...rest}
    >
      <rect x="4" y="20" width="6" height="8" rx="1.5" fill={c} />
      <rect x="13" y="14" width="6" height="14" rx="1.5" fill={c} />
      <rect x="22" y="6" width="6" height="22" rx="1.5" fill={c} />
    </svg>
  );
}

export function KobilLogo({
  variant = "blue",
  size = "md",
  className = "",
}: {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const c = COLOR[variant];
  const sizes = {
    sm: { h: "h-6", text: "text-base", icon: "h-5 w-5" },
    md: { h: "h-7", text: "text-lg", icon: "h-6 w-6" },
    lg: { h: "h-10", text: "text-2xl", icon: "h-8 w-8" },
  }[size];
  return (
    <span className={`inline-flex items-center gap-2 ${sizes.h} ${className}`}>
      <KobilSignal variant={variant} className={sizes.icon} />
      <span
        className={`font-bold tracking-tight ${sizes.text}`}
        style={{ color: c, letterSpacing: "0.02em" }}
      >
        KOBIL
      </span>
    </span>
  );
}

export function EngineeredInGermany({
  variant = "navy",
  className = "",
}: {
  variant?: "navy" | "white";
  className?: string;
}) {
  const textColor =
    variant === "white" ? "text-white/80" : "text-[var(--color-kobil-navy)]/70";
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span
        className="inline-block h-3 w-1 rounded-sm"
        style={{
          background:
            "linear-gradient(to bottom, #000 0 33.3%, #DD0000 33.3% 66.6%, #FFCE00 66.6% 100%)",
        }}
        aria-hidden="true"
      />
      <span className={`text-[10px] leading-tight ${textColor}`}>
        Engineered
        <br />
        in Germany
      </span>
    </span>
  );
}

export function Tagline({
  variant = "blue",
  className = "",
}: {
  variant?: Variant;
  className?: string;
}) {
  return (
    <span
      className={`font-semibold tracking-tight ${className}`}
      style={{ color: COLOR[variant] }}
    >
      Shift. Thrive. Win.
    </span>
  );
}
