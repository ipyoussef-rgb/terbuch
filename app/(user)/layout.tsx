import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { EngineeredInGermany, KobilLogo, Tagline } from "@/components/Brand";

export default async function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession("user");
  const name =
    session?.role === "user"
      ? [session.user.firstName, session.user.lastName].filter(Boolean).join(" ") ||
        session.user.email ||
        null
      : null;

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-kobil-mist-50)]">
      <header className="bg-white border-b border-[var(--color-kobil-line)] sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2 sm:gap-3 min-w-0">
            <KobilLogo size="md" />
            <span className="hidden sm:inline-block w-px h-6 bg-[var(--color-kobil-line)]" />
            <span className="hidden sm:inline-block text-sm font-medium text-[var(--color-kobil-navy)]/70">
              Terminbuchung
            </span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            {name ? (
              <>
                <span className="hidden sm:inline text-[var(--color-kobil-navy)]/70 truncate max-w-[180px]">
                  {name}
                </span>
                <a
                  href="/api/auth/user/logout"
                  className="rounded-full border border-[var(--color-kobil-line)] px-3 py-1.5 text-xs sm:text-sm font-medium text-[var(--color-kobil-navy)] hover:border-[var(--color-kobil-blue)] hover:text-[var(--color-kobil-blue)] transition-colors"
                >
                  Abmelden
                </a>
              </>
            ) : null}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
          {children}
        </div>
      </main>

      <footer className="bg-white border-t border-[var(--color-kobil-line)] mt-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <KobilLogo size="sm" />
            <Tagline className="text-xs sm:text-sm" />
          </div>
          <div className="flex items-center gap-6">
            <Link
              href="/datenschutz"
              className="text-xs sm:text-sm text-[var(--color-kobil-navy)]/70 hover:text-[var(--color-kobil-blue)]"
            >
              Datenschutz
            </Link>
            <EngineeredInGermany />
          </div>
        </div>
      </footer>
    </div>
  );
}
