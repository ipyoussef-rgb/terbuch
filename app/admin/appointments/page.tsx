import Link from "next/link";
import { db } from "@/lib/db";
import { format } from "date-fns";
import { de } from "date-fns/locale";

export const dynamic = "force-dynamic";

const STATUSES = ["ALL", "PENDING", "CONFIRMED", "CANCELLED"] as const;
type StatusFilter = (typeof STATUSES)[number];

export default async function AppointmentsListPage(props: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await props.searchParams;
  const filter: StatusFilter = (
    STATUSES.includes(sp.status as StatusFilter) ? sp.status : "ALL"
  ) as StatusFilter;

  const appointments = await db.appointment.findMany({
    where: filter === "ALL" ? {} : { status: filter },
    include: {
      slot: { include: { office: true, service: true } },
      serviceOption: true,
    },
    orderBy: { slot: { startsAt: "asc" } },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Termine</h1>

      <div className="flex gap-2 text-sm overflow-x-auto -mx-4 px-4 pb-2 sm:mx-0 sm:px-0 sm:pb-0">
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={s === "ALL" ? "/admin/appointments" : `/admin/appointments?status=${s}`}
            className={`shrink-0 rounded-full px-4 py-1.5 border font-medium transition-colors ${
              filter === s
                ? "bg-[var(--color-kobil-blue)] text-white border-[var(--color-kobil-blue)]"
                : "bg-white text-[var(--color-kobil-navy)]/70 border-[var(--color-kobil-line)] hover:border-[var(--color-kobil-blue)] hover:text-[var(--color-kobil-blue)]"
            }`}
          >
            {labelFor(s)}
          </Link>
        ))}
      </div>

      {/* Mobile: cards */}
      <div className="space-y-2 sm:hidden">
        {appointments.length === 0 ? (
          <Empty />
        ) : (
          appointments.map((a) => (
            <Link
              key={a.id}
              href={`/admin/appointments/${a.id}`}
              className="block bg-white rounded-xl border border-[var(--color-kobil-line)] p-4 hover:border-[var(--color-kobil-blue)] transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold tabular-nums">
                    {format(a.slot.startsAt, "EEE d. MMM HH:mm", { locale: de })}
                  </div>
                  <div className="text-sm mt-1">
                    {a.firstName} {a.lastName}
                  </div>
                  <div className="text-xs text-[var(--color-kobil-navy)]/55 mt-1 truncate">
                    {a.serviceOption.name} · {a.slot.office.name}
                  </div>
                </div>
                <StatusBadge status={a.status} />
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Desktop: table */}
      <div className="hidden sm:block rounded-2xl border border-[var(--color-kobil-line)] bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-kobil-mist-50)] text-left text-[var(--color-kobil-navy)]/60 text-xs uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3 font-semibold">Termin</th>
              <th className="px-4 py-3 font-semibold">Person</th>
              <th className="px-4 py-3 font-semibold">Service</th>
              <th className="px-4 py-3 font-semibold">Amt</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-kobil-line)]">
            {appointments.map((a) => (
              <tr key={a.id} className="hover:bg-[var(--color-kobil-mist-50)] transition-colors">
                <td className="px-4 py-3 tabular-nums">
                  <Link href={`/admin/appointments/${a.id}`} className="hover:text-[var(--color-kobil-blue)]">
                    {format(a.slot.startsAt, "EEE d. MMM yyyy HH:mm", { locale: de })}
                  </Link>
                </td>
                <td className="px-4 py-3 font-medium">
                  {a.firstName} {a.lastName}
                </td>
                <td className="px-4 py-3 text-[var(--color-kobil-navy)]/70">
                  <div>{a.slot.service.name}</div>
                  <div className="text-xs text-[var(--color-kobil-navy)]/50">
                    {a.serviceOption.name}
                  </div>
                </td>
                <td className="px-4 py-3 text-[var(--color-kobil-navy)]/70">{a.slot.office.name}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={a.status} />
                </td>
              </tr>
            ))}
            {appointments.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-[var(--color-kobil-navy)]/50">
                  Keine Termine.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Empty() {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--color-kobil-line)] bg-white p-8 text-center text-sm text-[var(--color-kobil-navy)]/60">
      Keine Termine.
    </div>
  );
}

function labelFor(s: StatusFilter): string {
  switch (s) {
    case "ALL":
      return "Alle";
    case "PENDING":
      return "Offen";
    case "CONFIRMED":
      return "Bestätigt";
    case "CANCELLED":
      return "Storno";
  }
}

function StatusBadge({ status }: { status: "PENDING" | "CONFIRMED" | "CANCELLED" }) {
  const cfg =
    status === "CONFIRMED"
      ? { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Bestätigt" }
      : status === "CANCELLED"
        ? { cls: "bg-rose-50 text-rose-700 border-rose-200", label: "Storno" }
        : { cls: "bg-amber-50 text-amber-700 border-amber-200", label: "Offen" };
  return (
    <span
      className={`text-[10px] sm:text-xs rounded-full px-2.5 py-0.5 border font-medium ${cfg.cls}`}
    >
      {cfg.label}
    </span>
  );
}
