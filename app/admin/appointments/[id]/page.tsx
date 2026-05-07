import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import ChatPanel from "./ChatPanel";

export const dynamic = "force-dynamic";

export default async function AdminAppointmentDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const a = await db.appointment.findUnique({
    where: { id },
    include: {
      slot: { include: { office: true, service: true } },
      serviceOption: true,
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!a) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/appointments"
          className="text-sm text-neutral-500 hover:text-neutral-900"
        >
          ← Termine
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight mt-2">
          Termin: {format(a.slot.startsAt, "EEE d. MMM yyyy HH:mm", { locale: de })}
        </h1>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="rounded-lg border border-neutral-200 bg-white p-6 space-y-3 text-sm">
          <h2 className="font-medium text-base mb-2">Termindaten</h2>
          <Row label="Status">
            <StatusBadge status={a.status} />
          </Row>
          <Row label="Service">
            {a.slot.service.name} · {a.serviceOption.name}
          </Row>
          <Row label="Amt">
            {a.slot.office.name}, {a.slot.office.street}, {a.slot.office.postalCode}{" "}
            {a.slot.office.city}
          </Row>
          <Row label="Termin">
            {format(a.slot.startsAt, "EEEE, d. MMMM yyyy 'um' HH:mm 'Uhr'", {
              locale: de,
            })}
          </Row>
          <hr className="my-2" />
          <h2 className="font-medium text-base mt-4 mb-2">Person</h2>
          <Row label="Name">
            {a.firstName} {a.lastName}
          </Row>
          <Row label="E-Mail">{a.email}</Row>
          {a.phone ? <Row label="Telefon">{a.phone}</Row> : null}
          {a.birthdate ? (
            <Row label="Geburtsdatum">
              {format(a.birthdate, "d. MMMM yyyy", { locale: de })}
            </Row>
          ) : null}
          <Row label="Adresse">
            {a.street}, {a.postalCode} {a.city}
          </Row>
          <Row label="KOBIL Sub" mono>
            {a.kobilSub}
          </Row>
        </section>

        <section className="rounded-lg border border-neutral-200 bg-white p-6 flex flex-col">
          <h2 className="font-medium text-base mb-3">KOBIL Chat</h2>
          <ChatPanel
            appointmentId={a.id}
            initialMessages={a.messages.map((m) => ({
              id: m.id,
              direction: m.direction,
              type: m.type,
              body: m.body,
              createdAt: m.createdAt.toISOString(),
            }))}
          />
        </section>
      </div>
    </div>
  );
}

function Row({
  label,
  children,
  mono,
}: {
  label: string;
  children: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <div className="w-32 text-neutral-500">{label}</div>
      <div className={`flex-1 ${mono ? "font-mono text-xs break-all" : ""}`}>
        {children}
      </div>
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
