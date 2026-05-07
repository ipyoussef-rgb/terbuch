import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { EngineeredInGermany, KobilLogo, Tagline } from "@/components/Brand";

export const metadata = { title: "Admin Login — Terbuch" };

export default async function AdminLoginPage(props: {
  searchParams: Promise<{ returnTo?: string; err?: string }>;
}) {
  const session = await getSession("admin");
  if (session?.role === "admin") redirect("/admin");
  const { returnTo, err } = await props.searchParams;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left brand panel */}
      <div className="lg:w-1/2 kobil-wave-dark text-white px-6 sm:px-10 py-10 lg:py-16 flex flex-col justify-between">
        <KobilLogo variant="white" size="md" />
        <div className="hidden lg:block">
          <Tagline variant="white" className="text-sm opacity-80" />
          <h1 className="text-3xl xl:text-5xl font-bold tracking-tight mt-3 leading-tight">
            Terbuch — Admin
          </h1>
          <p className="text-white/80 mt-4 text-base xl:text-lg max-w-md leading-relaxed">
            Termine verwalten, Bürger:innen über den KOBIL Chat erreichen,
            Slot-Verfügbarkeit steuern.
          </p>
        </div>
        <EngineeredInGermany variant="white" />
      </div>

      {/* Right login panel */}
      <div className="lg:w-1/2 flex items-center justify-center px-6 sm:px-10 py-10 lg:py-16 bg-white">
        <div className="w-full max-w-sm space-y-7">
          <div>
            <span className="inline-block rounded-full bg-[var(--color-kobil-mist)] px-3 py-1 text-xs font-semibold text-[var(--color-kobil-blue)] uppercase tracking-wider">
              Sachbearbeiter:in
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mt-3">
              Anmelden
            </h2>
            <p className="text-sm text-[var(--color-kobil-navy)]/60 mt-2">
              Authentifizieren Sie sich mit Ihrer KOBIL Identity, um auf das
              Admin-Portal zuzugreifen.
            </p>
          </div>

          {err ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Anmeldung fehlgeschlagen. Bitte erneut versuchen.
            </div>
          ) : null}

          <a
            href={`/api/auth/admin/login${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`}
            className="flex items-center justify-center gap-2 w-full rounded-full bg-[var(--color-kobil-blue)] text-white px-4 py-3 text-sm font-semibold shadow-[var(--shadow-card)] hover:bg-[var(--color-kobil-blue-600)] active:bg-[var(--color-kobil-blue-700)] transition-colors"
          >
            Mit KOBIL Identity anmelden
            <svg viewBox="0 0 16 16" className="w-4 h-4" aria-hidden="true">
              <path
                d="M3 8h10m0 0L9 4m4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.8"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>

          <p className="text-xs text-[var(--color-kobil-navy)]/55 text-center">
            Bürger:innen-Anmeldung:{" "}
            <a href="/" className="text-[var(--color-kobil-blue)] hover:underline">
              hier
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
