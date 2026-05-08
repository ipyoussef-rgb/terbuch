import Link from "next/link";
import { db } from "@/lib/db";
import { format, startOfDay, endOfDay } from "date-fns";
import { de } from "date-fns/locale";
import { cleanupStalePending } from "@/lib/cleanup";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  await cleanupStalePending(5).catch((e) =>
    console.warn("[cleanup] stale PENDING failed:", e),
  );
  const today = new Date();
  const [todays, pendingCount, confirmedCount, cancelledCount] =
    await Promise.all([
      db.appointment.findMany({
        where: {
          status: { in: ["PENDING", "CONFIRMED"] },
          slot: {
            startsAt: { gte: startOfDay(today), lte: endOfDay(today) },
          },
        },
        include: {
          slot: { include: { office: true, service: true } },
          serviceOption: true,
        },
        orderBy: { slot: { startsAt: "asc" } },
        take: 50,
      }),
      db.appointment.count({ where: { status: "PENDING" } }),
      db.appointment.count({ where: { status: "CONFIRMED" } }),
      db.appointment.count({ where: { status: "CANCELLED" } }),
    ]);

  return (
    <div className="space-y-8">
      <div>
        <span className="inline-block text-xs font-semibold uppercase tracking-wider text-[var(--color-kobil-blue)]">
          {format(today, "EEEE, d. MMMM yyyy", { locale: de })}
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-2">
          Dashboard
        </h1>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <Stat
          label="Bestätigt"
          value={confirmedCount}
          tone="green"
        />
        <Stat
          label="Offen"
          value={pendingCount}
          tone="amber"
        />
        <Stat
          label="Abgebrochen"
          value={cancelledCount}
          tone="rose"
        />
      </div>

      <div>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-base sm:text-lg font-semibold tracking-tight">
            Termine heute
          </h2>
          <Link
            href="/admin/appointments"
            className="text-xs sm:text-sm text-[var(--color-kobil-blue)] hover:underline"
          >
            Alle Termine →
          </Link>
        </div>
        {todays.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--color-kobil-line)] bg-white p-8 text-center text-sm text-[var(--color-kobil-navy)]/60">
            Heute sind keine Termine geplant.
          </div>
        ) : (
          <ul className="bg-white rounded-2xl border border-[var(--color-kobil-line)] divide-y divide-[var(--color-kobil-line)] overflow-hidden">
            {todays.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/admin/appointments/${a.id}`}
                  className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 hover:bg-[var(--color-kobil-mist-50)] transition-colors"
                >
                  <div className="shrink-0 w-14 sm:w-16 text-center">
                    <div className="text-base sm:text-lg font-semibold tabular-nums">
                      {format(a.slot.startsAt, "HH:mm")}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm sm:text-base font-medium truncate">
                      {a.firstName} {a.lastName}
                    </div>
                    <div className="text-xs text-[var(--color-kobil-navy)]/55 truncate">
                      {a.serviceOption.name} · {a.slot.office.name}
                    </div>
                  </div>
                  <StatusBadge status={a.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "green" | "amber" | "rose";
}) {
  const accent =
    tone === "green"
      ? "bg-emerald-500"
      : tone === "amber"
        ? "bg-amber-500"
        : "bg-rose-500";
  return (
    <div className="rounded-2xl border border-[var(--color-kobil-line)] bg-white p-4 sm:p-5 relative overflow-hidden">
      <span className={`absolute left-0 top-0 bottom-0 w-1 ${accent}`} />
      <div className="text-2xl sm:text-3xl font-bold tabular-nums">{value}</div>
      <div className="text-[10px] sm:text-xs text-[var(--color-kobil-navy)]/60 mt-1 uppercase tracking-wider font-medium">
        {label}
      </div>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
}) {
  const cfg =
    status === "CONFIRMED"
      ? { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Bestätigt" }
      : status === "CANCELLED"
        ? { cls: "bg-rose-50 text-rose-700 border-rose-200", label: "Storno" }
        : { cls: "bg-amber-50 text-amber-700 border-amber-200", label: "Offen" };
  return (
    <span
      className={`shrink-0 text-[10px] sm:text-xs rounded-full px-2 sm:px-2.5 py-0.5 sm:py-1 border font-medium ${cfg.cls}`}
    >
      {cfg.label}
    </span>
  );
}
