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
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Slots</h1>
        <p className="text-sm text-[var(--color-kobil-navy)]/60 mt-1.5">
          Auto-generierte Slots werden täglich erzeugt. Klick auf einen freien
          oder blockierten Slot, um den Status zu wechseln.
        </p>
      </div>

      <form
        className="rounded-2xl bg-white border border-[var(--color-kobil-line)] p-4 sm:p-5 grid sm:grid-cols-3 gap-3 sm:items-end"
        method="GET"
      >
        <SelectField name="office" label="Amt" defaultValue={officeId}>
          {offices.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </SelectField>
        <SelectField name="service" label="Service" defaultValue={serviceId}>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </SelectField>
        <button
          type="submit"
          className="rounded-full bg-[var(--color-kobil-blue)] text-white px-4 py-2.5 text-sm font-semibold hover:bg-[var(--color-kobil-blue-600)] sm:mt-0 mt-1"
        >
          Anzeigen
        </button>
      </form>

      <Legend />

      {!officeId || !serviceId ? (
        <Empty>Bitte zunächst Daten seeden (npm run db:seed).</Empty>
      ) : byDay.size === 0 ? (
        <Empty>
          Noch keine Slots im Zeitraum. Cron oder{" "}
          <code className="bg-[var(--color-kobil-mist)] px-1.5 py-0.5 rounded text-[var(--color-kobil-blue)]">
            npm run slots:generate
          </code>{" "}
          ausführen.
        </Empty>
      ) : (
        <div className="space-y-4">
          {[...byDay.entries()].map(([day, daySlots]) => (
            <div
              key={day}
              className="rounded-2xl bg-white border border-[var(--color-kobil-line)] p-4 sm:p-5"
            >
              <h2 className="text-sm font-semibold text-[var(--color-kobil-navy)] mb-3">
                {format(new Date(day), "EEEE, d. MMMM yyyy", { locale: de })}
              </h2>
              <SlotGrid
                slots={daySlots.map((s) => ({
                  id: s.id,
                  time: format(s.startsAt, "HH:mm"),
                  status: s.status as "FREE" | "PENDING" | "BOOKED" | "BLOCKED",
                }))}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SelectField({
  name,
  label,
  defaultValue,
  children,
}: {
  name: string;
  label: string;
  defaultValue: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-kobil-navy)]/55 mb-1.5">
        {label}
      </span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="w-full rounded-lg border border-[var(--color-kobil-line)] bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--color-kobil-blue)] focus:ring-2 focus:ring-[var(--color-kobil-blue)]/20"
      >
        {children}
      </select>
    </label>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-3 text-xs text-[var(--color-kobil-navy)]/70">
      <LegendItem color="bg-white border-[var(--color-kobil-line)]" label="Frei" />
      <LegendItem color="bg-amber-50 border-amber-200" label="Wartet" />
      <LegendItem color="bg-emerald-50 border-emerald-200" label="Gebucht" />
      <LegendItem color="bg-[var(--color-kobil-mist)] border-[var(--color-kobil-line)]" label="Blockiert" />
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block w-3 h-3 rounded border ${color}`} />
      {label}
    </span>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--color-kobil-line)] bg-white p-8 text-center text-sm text-[var(--color-kobil-navy)]/60">
      {children}
    </div>
  );
}
