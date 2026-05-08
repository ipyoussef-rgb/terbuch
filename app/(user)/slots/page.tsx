import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { addDays, format, startOfDay } from "date-fns";
import { de } from "date-fns/locale";
import { Stepper } from "@/components/Stepper";
import { cleanupStalePending } from "@/lib/cleanup";

export const dynamic = "force-dynamic";

export default async function SlotsPage(props: {
  searchParams: Promise<{ option?: string; office?: string }>;
}) {
  const { option, office } = await props.searchParams;
  if (!option || !office) redirect("/");

  // Free up slots whose PENDING booking expired (>5 min unconfirmed).
  await cleanupStalePending(5).catch((e) =>
    console.warn("[cleanup] stale PENDING failed:", e),
  );

  const opt = await db.serviceOption.findUnique({
    where: { id: option },
    include: { service: true },
  });
  const off = await db.office.findUnique({ where: { id: office } });
  if (!opt || !off) redirect("/");

  const from = startOfDay(new Date());
  const to = addDays(from, 14);

  const slots = await db.slot.findMany({
    where: {
      officeId: off.id,
      serviceId: opt.serviceId,
      status: "FREE",
      startsAt: { gte: from, lte: to },
    },
    orderBy: { startsAt: "asc" },
    take: 500,
  });

  const byDay = new Map<string, typeof slots>();
  for (const s of slots) {
    const key = format(s.startsAt, "yyyy-MM-dd");
    const arr = byDay.get(key) ?? [];
    arr.push(s);
    byDay.set(key, arr);
  }

  return (
    <div className="space-y-6 sm:space-y-8 max-w-3xl">
      <Link
        href={`/office?option=${opt.id}`}
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
        <Stepper step={3} />
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-4">
          Freien Termin auswählen
        </h1>
        <p className="text-[var(--color-kobil-navy)]/60 mt-2 text-sm sm:text-base">
          {opt.service.name} · {opt.name}
          <br className="sm:hidden" />
          <span className="text-[var(--color-kobil-navy)]/40 sm:ml-1"> bei </span>
          <span className="font-medium text-[var(--color-kobil-navy)]">
            {off.name}
          </span>
        </p>
      </div>

      {slots.length === 0 ? (
        <div className="rounded-2xl border border-[var(--color-kobil-line)] bg-white p-8 text-center">
          <div className="text-[var(--color-kobil-navy)]/60 text-sm">
            Aktuell keine freien Termine in den nächsten 14 Tagen.
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {[...byDay.entries()].map(([day, daySlots]) => (
            <div key={day} className="bg-white rounded-2xl border border-[var(--color-kobil-line)] p-4 sm:p-5">
              <h2 className="text-sm font-semibold text-[var(--color-kobil-navy)] mb-3">
                {format(new Date(day), "EEEE, d. MMMM yyyy", { locale: de })}
              </h2>
              <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-2">
                {daySlots.map((s) => (
                  <Link
                    key={s.id}
                    href={`/book?option=${opt.id}&office=${off.id}&slot=${s.id}`}
                    className="rounded-lg border border-[var(--color-kobil-line)] bg-white px-3 py-2.5 text-sm font-medium text-center tabular-nums hover:border-[var(--color-kobil-blue)] hover:bg-[var(--color-kobil-mist-50)] hover:text-[var(--color-kobil-blue)] transition-colors"
                  >
                    {format(s.startsAt, "HH:mm")}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
