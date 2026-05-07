import { db } from "@/lib/db";
import { addDays, format, startOfDay } from "date-fns";
import { de } from "date-fns/locale";
import SlotGrid from "./SlotGrid";

export const dynamic = "force-dynamic";

export default async function AdminSlotsPage(props: {
  searchParams: Promise<{ office?: string; service?: string }>;
}) {
  const sp = await props.searchParams;
  const offices = await db.office.findMany({ orderBy: { name: "asc" } });
  const services = await db.service.findMany({ orderBy: { name: "asc" } });

  const officeId = sp.office ?? offices[0]?.id;
  const serviceId = sp.service ?? services[0]?.id;

  const from = startOfDay(new Date());
  const to = addDays(from, 14);

  const slots =
    officeId && serviceId
      ? await db.slot.findMany({
          where: {
            officeId,
            serviceId,
            startsAt: { gte: from, lte: to },
          },
          orderBy: { startsAt: "asc" },
        })
      : [];

  const byDay = new Map<
    string,
    { id: string; startsAt: Date; status: string }[]
  >();
  for (const s of slots) {
    const k = format(s.startsAt, "yyyy-MM-dd");
    const arr = byDay.get(k) ?? [];
    arr.push({ id: s.id, startsAt: s.startsAt, status: s.status });
    byDay.set(k, arr);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Slots</h1>
        <p className="text-sm text-neutral-600 mt-1">
          Auto-generierte Slots werden täglich erzeugt. Sie können Slots
          blockieren oder freigeben.
        </p>
      </div>

      <form className="flex flex-wrap items-end gap-4 bg-white border border-neutral-200 rounded-lg p-4" method="GET">
        <label className="text-sm">
          <span className="block text-neutral-600 mb-1">Amt</span>
          <select
            name="office"
            defaultValue={officeId}
            className="rounded border border-neutral-300 bg-white px-3 py-2 text-sm"
          >
            {offices.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="block text-neutral-600 mb-1">Service</span>
          <select
            name="service"
            defaultValue={serviceId}
            className="rounded border border-neutral-300 bg-white px-3 py-2 text-sm"
          >
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded bg-neutral-900 text-white px-4 py-2 text-sm font-medium"
        >
          Anzeigen
        </button>
      </form>

      {!officeId || !serviceId ? (
        <div className="rounded-lg border border-neutral-200 bg-white p-6 text-sm text-neutral-600">
          Bitte zunächst Daten seeden (npm run db:seed).
        </div>
      ) : (
        <div className="space-y-6">
          {[...byDay.entries()].map(([day, daySlots]) => (
            <div key={day}>
              <h2 className="text-sm font-medium text-neutral-500 mb-2">
                {format(new Date(day), "EEEE, d. MMMM yyyy", { locale: de })}
              </h2>
              <SlotGrid
                slots={daySlots.map((s) => ({
                  id: s.id,
                  time: format(s.startsAt, "HH:mm"),
                  status: s.status as
                    | "FREE"
                    | "PENDING"
                    | "BOOKED"
                    | "BLOCKED",
                }))}
              />
            </div>
          ))}
          {byDay.size === 0 ? (
            <div className="rounded-lg border border-neutral-200 bg-white p-6 text-sm text-neutral-600">
              Noch keine Slots im Zeitraum. Cron oder{" "}
              <code className="bg-neutral-100 px-1 rounded">npm run slots:generate</code>{" "}
              ausführen.
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
