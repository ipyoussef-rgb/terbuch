import Link from "next/link";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const services = await db.service.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Termin buchen</h1>
        <p className="text-neutral-600 mt-2">
          Wählen Sie zunächst, wofür Sie einen Termin benötigen.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((s) => (
          <Link
            key={s.id}
            href={`/service/${s.slug}`}
            className="block rounded-lg border border-neutral-200 bg-white p-6 hover:border-neutral-900 hover:shadow-sm transition"
          >
            <div className="text-lg font-medium">{s.name}</div>
            <div className="text-sm text-neutral-500 mt-2">
              Termin auswählen →
            </div>
          </Link>
        ))}
        {services.length === 0 ? (
          <div className="col-span-full text-neutral-500 text-sm">
            Noch keine Services konfiguriert. Bitte führen Sie{" "}
            <code className="bg-neutral-100 px-1 rounded">npm run db:seed</code>{" "}
            aus.
          </div>
        ) : null}
      </div>
    </div>
  );
}
