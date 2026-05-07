import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { EngineeredInGermany, KobilLogo } from "@/components/Brand";
import AdminMobileNav from "./AdminMobileNav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession("admin");

  if (!session || session.role !== "admin") {
    return <div className="min-h-screen">{children}</div>;
  }

  const userLabel =
    session.admin.email ?? session.admin.name ?? session.admin.sub;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[var(--color-kobil-mist-50)]">
      {/* Mobile top bar */}
      <header className="lg:hidden bg-white border-b border-[var(--color-kobil-line)] sticky top-0 z-30">
        <div className="px-4 h-14 flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2">
            <KobilLogo size="sm" />
            <span className="text-xs font-medium text-[var(--color-kobil-navy)]/60">
              Admin
            </span>
          </Link>
          <AdminMobileNav userLabel={userLabel} />
        </div>
      </header>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-64 xl:w-72 bg-white border-r border-[var(--color-kobil-line)] flex-col">
        <div className="px-6 py-5 border-b border-[var(--color-kobil-line)]">
          <Link href="/admin" className="flex items-center gap-2">
            <KobilLogo size="md" />
          </Link>
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-kobil-navy)]/60 mt-2">
            Terbuch · Admin
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          <NavItem
            href="/admin"
            icon={
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" aria-hidden="true">
                <path
                  d="M3 12 12 4l9 8M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            }
          >
            Dashboard
          </NavItem>
          <NavItem
            href="/admin/appointments"
            icon={
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" aria-hidden="true">
                <path
                  d="M8 4v3m8-3v3M4 9h16M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            }
          >
            Termine
          </NavItem>
          <NavItem
            href="/admin/slots"
            icon={
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
                <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            }
          >
            Slots
          </NavItem>
        </nav>

        <div className="px-4 py-4 border-t border-[var(--color-kobil-line)] space-y-3">
          <div className="text-xs">
            <div className="text-[var(--color-kobil-navy)]/50 uppercase tracking-wider">
              Angemeldet
            </div>
            <div className="text-[var(--color-kobil-navy)] font-medium truncate mt-0.5">
              {userLabel}
            </div>
          </div>
          <a
            href="/api/auth/admin/logout"
            className="block w-full text-center rounded-full border border-[var(--color-kobil-line)] px-3 py-1.5 text-xs font-medium text-[var(--color-kobil-navy)] hover:border-[var(--color-kobil-blue)] hover:text-[var(--color-kobil-blue)]"
          >
            Abmelden
          </a>
          <EngineeredInGermany className="pt-2" />
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 min-w-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
          {children}
        </div>
      </main>
    </div>
  );
}

function NavItem({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--color-kobil-navy)]/75 hover:bg-[var(--color-kobil-mist-50)] hover:text-[var(--color-kobil-blue)] transition-colors"
    >
      <span className="text-[var(--color-kobil-navy)]/55">{icon}</span>
      {children}
    </Link>
  );
}
