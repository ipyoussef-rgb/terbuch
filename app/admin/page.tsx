import Link from "next/link";
import { db } from "@/lib/db";
import { format, startOfDay, endOfDay } from "date-fns";
import { de } from "date-fns/locale";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const today = new Date();
  const [todays, pendingCount, confirmedCount, cancelledCount] =
    await Promise.all([
      db.appointment.findMany({
        where: {
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
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-neutral-600 mt-1 text-sm">
          {format(today, "EEEE, d. MMMM yyyy", { locale: de })}
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Stat label="Bestätigt" value={confirmedCount} />
        <Stat label="Wartet auf Bestätigung" value={pendingCount} />
        <Stat label="Abgebrochen" value={cancelledCount} />
      </div>

      <div>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-lg font-medium">Termine heute</h2>
          <Link
            href="/admin/appointments"
            className="text-sm text-neutral-500 hover:text-neutral-900"
          >
            Alle Termine →
          </Link>
        </div>
        {todays.length === 0 ? (
          <div className="rounded-lg border border-neutral-200 bg-white p-6 text-sm text-neutral-600">
            Heute sind keine Termine geplant.
          </div>
        ) : (
          <ul className="divide-y divide-neutral-200 bg-white rounded-lg border border-neutral-200">
            {todays.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/admin/appointments/${a.id}`}
                  className="flex items-center justify-between p-4 hover:bg-neutral-50"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium tabular-nums w-14">
                      {format(a.slot.startsAt, "HH:mm")}
                    </span>
                    <span className="text-sm">
                      {a.firstName} {a.lastName}
                    </span>
                    <span className="text-xs text-neutral-500">
                      {a.slot.service.name} · {a.serviceOption.name} · {a.slot.office.name}
                    </span>
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-neutral-500 mt-1">{label}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: "PENDING" | "CONFIRMED" | "CANCELLED" }) {
  const cls =
    status === "CONFIRMED"
      ? "bg-green-100 text-green-800"
      : status === "CANCELLED"
        ? "bg-red-100 text-red-800"
        : "bg-amber-100 text-amber-800";
  const label =
    status === "CONFIRMED" ? "Bestätigt" : status === "CANCELLED" ? "Abgebrochen" : "Offen";
  return <span className={`text-xs rounded px-2 py-0.5 ${cls}`}>{label}</span>;
}
