import Link from "next/link";
import { getSession } from "@/lib/auth/session";

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
        "Angemeldet"
      : null;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-neutral-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="font-semibold text-lg tracking-tight">
            Terbuch <span className="text-neutral-400 font-normal">· Terminbuchung</span>
          </Link>
          {name ? (
            <div className="flex items-center gap-4 text-sm text-neutral-600">
              <span>{name}</span>
              <a
                href="/api/auth/user/logout"
                className="text-neutral-500 hover:text-neutral-900 underline-offset-2 hover:underline"
              >
                Abmelden
              </a>
            </div>
          ) : null}
        </div>
      </header>
      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-6 py-10">{children}</div>
      </main>
      <footer className="border-t border-neutral-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 py-4 text-xs text-neutral-500 flex justify-between">
          <span>© Terbuch</span>
          <Link href="/datenschutz" className="hover:text-neutral-900">
            Datenschutz
          </Link>
        </div>
      </footer>
    </div>
  );
}
