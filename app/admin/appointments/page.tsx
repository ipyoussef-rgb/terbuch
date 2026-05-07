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
      <h1 className="text-3xl font-semibold tracking-tight">Termine</h1>

      <div className="flex gap-2 text-sm">
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={s === "ALL" ? "/admin/appointments" : `/admin/appointments?status=${s}`}
            className={`rounded px-3 py-1 border ${
              filter === s
                ? "bg-neutral-900 text-white border-neutral-900"
                : "bg-white text-neutral-700 border-neutral-300 hover:border-neutral-900"
            }`}
          >
            {labelFor(s)}
          </Link>
        ))}
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-neutral-500">
            <tr>
              <th className="px-4 py-2 font-medium">Termin</th>
              <th className="px-4 py-2 font-medium">Person</th>
              <th className="px-4 py-2 font-medium">Service</th>
              <th className="px-4 py-2 font-medium">Amt</th>
              <th className="px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {appointments.map((a) => (
              <tr key={a.id} className="hover:bg-neutral-50">
                <td className="px-4 py-2">
                  <Link href={`/admin/appointments/${a.id}`} className="hover:underline">
                    {format(a.slot.startsAt, "EEE d. MMM yyyy HH:mm", { locale: de })}
                  </Link>
                </td>
                <td className="px-4 py-2">
                  {a.firstName} {a.lastName}
                </td>
                <td className="px-4 py-2 text-neutral-600">
                  {a.slot.service.name} · {a.serviceOption.name}
                </td>
                <td className="px-4 py-2 text-neutral-600">{a.slot.office.name}</td>
                <td className="px-4 py-2">
                  <StatusBadge status={a.status} />
                </td>
              </tr>
            ))}
            {appointments.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-neutral-500">
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

function labelFor(s: StatusFilter): string {
  switch (s) {
    case "ALL":
      return "Alle";
    case "PENDING":
      return "Offen";
    case "CONFIRMED":
      return "Bestätigt";
    case "CANCELLED":
      return "Abgebrochen";
  }
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
