import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ServicePage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const service = await db.service.findUnique({
    where: { slug },
    include: { options: { orderBy: { name: "asc" } } },
  });
  if (!service) notFound();

  return (
    <div className="space-y-8">
      <div>
        <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-900">
          ← zurück
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight mt-2">{service.name}</h1>
        <p className="text-neutral-600 mt-2">
          Was möchten Sie genau erledigen?
        </p>
      </div>

      <ul className="divide-y divide-neutral-200 bg-white rounded-lg border border-neutral-200">
        {service.options.map((o) => (
          <li key={o.id}>
            <Link
              href={`/office?option=${o.id}`}
              className="flex items-center justify-between p-4 hover:bg-neutral-50"
            >
              <div>
                <div className="font-medium">{o.name}</div>
                <div className="text-sm text-neutral-500">
                  ca. {o.durationMin} Minuten
                </div>
              </div>
              <span className="text-neutral-400">→</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
