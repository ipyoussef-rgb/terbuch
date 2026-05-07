import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Stepper } from "@/components/Stepper";

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
    <div className="space-y-6 sm:space-y-8 max-w-3xl">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--color-kobil-navy)]/60 hover:text-[var(--color-kobil-blue)]"
      >
        <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" aria-hidden="true">
          <path
            d="M13 8H3m0 0 4 4M3 8l4-4"
            stroke="currentColor"
            strokeWidth="1.6"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        zurück
      </Link>

      <div>
        <Stepper step={1} />
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-4">
          {service.name}
        </h1>
        <p className="text-[var(--color-kobil-navy)]/60 mt-2">
          Was möchten Sie genau erledigen?
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-[var(--color-kobil-line)] divide-y divide-[var(--color-kobil-line)] overflow-hidden">
        {service.options.map((o) => (
          <Link
            key={o.id}
            href={`/office?option=${o.id}`}
            className="group flex items-center justify-between p-4 sm:p-5 hover:bg-[var(--color-kobil-mist-50)] transition-colors"
          >
            <div>
              <div className="font-medium text-[var(--color-kobil-navy)]">
                {o.name}
              </div>
              <div className="text-xs sm:text-sm text-[var(--color-kobil-navy)]/55 mt-0.5">
                ca. {o.durationMin} Minuten
              </div>
            </div>
            <span className="text-[var(--color-kobil-blue)] group-hover:translate-x-1 transition-transform">
              <svg viewBox="0 0 16 16" className="w-4 h-4" aria-hidden="true">
                <path
                  d="M3 8h10m0 0L9 4m4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

