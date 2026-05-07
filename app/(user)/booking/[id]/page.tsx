import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { getSession } from "@/lib/auth/session";
import StatusPoller from "./StatusPoller";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<"PENDING" | "CONFIRMED" | "CANCELLED", string> = {
  PENDING: "Wartet auf Bestätigung im KOBIL Chat",
  CONFIRMED: "Bestätigt",
  CANCELLED: "Abgebrochen",
};

export default async function BookingDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const session = await getSession("user");
  if (!session || session.role !== "user") notFound();

  const a = await db.appointment.findUnique({
    where: { id },
    include: {
      slot: { include: { office: true, service: true } },
      serviceOption: true,
    },
  });
  if (!a || a.kobilSub !== session.user.sub) notFound();

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-3xl font-semibold tracking-tight">
        {a.status === "CONFIRMED"
          ? "Termin bestätigt"
          : a.status === "CANCELLED"
            ? "Termin abgebrochen"
            : "Termin reserviert"}
      </h1>

      <div className="rounded-lg border border-neutral-200 bg-white p-6 space-y-2 text-sm">
        <Row label="Status">
          <span
            className={
              a.status === "CONFIRMED"
                ? "inline-block rounded bg-green-100 text-green-800 px-2 py-0.5"
                : a.status === "CANCELLED"
                  ? "inline-block rounded bg-red-100 text-red-800 px-2 py-0.5"
                  : "inline-block rounded bg-amber-100 text-amber-800 px-2 py-0.5"
            }
          >
            {STATUS_LABEL[a.status]}
          </span>
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
        <Row label="Name">
          {a.firstName} {a.lastName}
        </Row>
      </div>

      {a.status === "PENDING" ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-6 text-sm text-amber-900">
          Wir haben Ihnen eine Nachricht in Ihrem <strong>KOBIL Chat</strong>{" "}
          gesendet. Bitte bestätigen Sie den Termin dort mit „Ja". Sobald die
          Bestätigung eingegangen ist, sehen Sie hier den Status.
          <StatusPoller appointmentId={a.id} initialStatus={a.status} />
        </div>
      ) : null}

      {a.status === "CONFIRMED" ? (
        <div className="rounded-lg border border-green-300 bg-green-50 p-6 text-sm text-green-900">
          Der Termin ist bestätigt. Bitte erscheinen Sie pünktlich.
        </div>
      ) : null}

      {a.status === "CANCELLED" ? (
        <a
          href="/"
          className="inline-block rounded bg-neutral-900 text-white px-4 py-2 text-sm font-medium"
        >
          Neuen Termin buchen
        </a>
      ) : null}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="w-28 text-neutral-500">{label}</div>
      <div className="flex-1">{children}</div>
    </div>
  );
}
