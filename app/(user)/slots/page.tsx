import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { addDays, format, startOfDay } from "date-fns";
import { de } from "date-fns/locale";

export const dynamic = "force-dynamic";

export default async function SlotsPage(props: {
  searchParams: Promise<{ option?: string; office?: string }>;
}) {
  const { option, office } = await props.searchParams;
  if (!option || !office) redirect("/");

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
    <div className="space-y-8">
      <div>
        <Link
          href={`/office?option=${opt.id}`}
          className="text-sm text-neutral-500 hover:text-neutral-900"
        >
          ← zurück
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight mt-2">
          Freien Termin auswählen
        </h1>
        <p className="text-neutral-600 mt-2">
          {opt.service.name} · {opt.name} · {off.name}
        </p>
      </div>

      {slots.length === 0 ? (
        <div className="rounded-lg border border-neutral-200 bg-white p-6 text-neutral-600">
          Aktuell keine freien Termine in den nächsten 14 Tagen.
        </div>
      ) : (
        <div className="space-y-6">
          {[...byDay.entries()].map(([day, daySlots]) => (
            <div key={day}>
              <h2 className="text-sm font-medium text-neutral-500 mb-2">
                {format(new Date(day), "EEEE, d. MMMM yyyy", { locale: de })}
              </h2>
              <div className="flex flex-wrap gap-2">
                {daySlots.map((s) => (
                  <Link
                    key={s.id}
                    href={`/book?option=${opt.id}&office=${off.id}&slot=${s.id}`}
                    className="rounded border border-neutral-300 bg-white px-3 py-2 text-sm hover:border-neutral-900 hover:bg-neutral-50 tabular-nums"
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
