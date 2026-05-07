import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

export const metadata = { title: "Admin Login — Terbuch" };

export default async function AdminLoginPage(props: {
  searchParams: Promise<{ returnTo?: string; err?: string }>;
}) {
  const session = await getSession("admin");
  if (session?.role === "admin") redirect("/admin");
  const { returnTo, err } = await props.searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-100 px-6">
      <div className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white p-8 space-y-6">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">
            Terbuch · Admin
          </h1>
          <p className="text-sm text-neutral-600">
            Anmeldung mit Ihrem KOBIL Identity Konto.
          </p>
        </div>
        {err ? (
          <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
            Anmeldung fehlgeschlagen. Bitte erneut versuchen.
          </div>
        ) : null}
        <a
          href={`/api/auth/admin/login${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`}
          className="block w-full rounded bg-neutral-900 text-white px-4 py-2 text-sm font-medium text-center"
        >
          Mit KOBIL Identity anmelden
        </a>
      </div>
    </div>
  );
}
