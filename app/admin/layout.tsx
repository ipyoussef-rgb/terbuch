import Link from "next/link";
import { getSession } from "@/lib/auth/session";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession("admin");

  if (!session || session.role !== "admin") {
    return <div className="min-h-screen">{children}</div>;
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-60 border-r border-neutral-200 bg-white flex flex-col">
        <div className="px-4 py-4 border-b border-neutral-200">
          <Link href="/admin" className="font-semibold tracking-tight">
            Terbuch · Admin
          </Link>
        </div>
        <nav className="flex-1 p-2 text-sm space-y-1">
          <NavItem href="/admin">Dashboard</NavItem>
          <NavItem href="/admin/appointments">Termine</NavItem>
          <NavItem href="/admin/slots">Slots</NavItem>
        </nav>
        <div className="p-4 border-t border-neutral-200 text-xs text-neutral-500 space-y-2">
          <div className="truncate">
            {session.admin.email ?? session.admin.name ?? session.admin.sub}
          </div>
          <a
            href="/api/auth/admin/logout"
            className="text-neutral-600 hover:text-neutral-900 underline-offset-2 hover:underline"
          >
            Abmelden
          </a>
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <div className="max-w-6xl mx-auto px-8 py-8">{children}</div>
      </main>
    </div>
  );
}

function NavItem({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="block rounded px-3 py-2 hover:bg-neutral-100 text-neutral-700"
    >
      {children}
    </Link>
  );
}
