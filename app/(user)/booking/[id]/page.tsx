import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { getSession } from "@/lib/auth/session";
import StatusPoller from "./StatusPoller";

export const dynamic = "force-dynamic";

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
      <StatusHero status={a.status} />

      <div className="rounded-2xl border border-[var(--color-kobil-line)] bg-white p-5 sm:p-6 shadow-[var(--shadow-card)]">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-kobil-navy)]/60 mb-4">
          Termin-Details
        </h2>
        <dl className="space-y-4 text-sm">
          <Row label="Service">
            <div className="font-medium">{a.slot.service.name}</div>
            <div className="text-[var(--color-kobil-navy)]/70">{a.serviceOption.name}</div>
          </Row>
          <Row label="Amt">
            <div className="font-medium">{a.slot.office.name}</div>
            <div className="text-[var(--color-kobil-navy)]/70">
              {a.slot.office.street}, {a.slot.office.postalCode} {a.slot.office.city}
            </div>
          </Row>
          <Row label="Datum & Uhrzeit">
            <div className="font-medium">
              {format(a.slot.startsAt, "EEEE, d. MMMM yyyy", { locale: de })}
            </div>
            <div className="text-[var(--color-kobil-navy)]/70 tabular-nums">
              {format(a.slot.startsAt, "HH:mm")} Uhr
            </div>
          </Row>
          <Row label="Name">
            {a.firstName} {a.lastName}
          </Row>
        </dl>
      </div>

      {a.status === "PENDING" ? (
        <div className="rounded-2xl border border-[var(--color-kobil-line)] bg-[var(--color-kobil-mist-50)] p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-10 h-10 rounded-full bg-[var(--color-kobil-blue)] text-white flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" aria-hidden="true">
                <path
                  d="M5 7a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3h-3l-4 3v-3H8a3 3 0 0 1-3-3V7Z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="flex-1 text-sm text-[var(--color-kobil-navy)]">
              <p className="font-semibold">Bitte im KOBIL Chat bestätigen</p>
              <p className="mt-1 text-[var(--color-kobil-navy)]/70 leading-relaxed">
                Wir haben Ihnen eine Nachricht in Ihren KOBIL Chat gesendet.
                Tippen Sie auf <strong>„Ja, bestätigen"</strong>, um den Termin
                fest zu reservieren.
              </p>
            </div>
          </div>
          <StatusPoller appointmentId={a.id} initialStatus={a.status} />
        </div>
      ) : null}

      {a.status === "CANCELLED" ? (
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--color-kobil-blue)] text-white px-5 py-3 text-sm font-semibold hover:bg-[var(--color-kobil-blue-600)]"
        >
          Neuen Termin buchen
        </Link>
      ) : null}
    </div>
  );
}

function StatusHero({
  status,
}: {
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
}) {
  if (status === "CONFIRMED") {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white p-6 sm:p-8 shadow-[var(--shadow-card-lg)]">
        <CheckIcon />
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-3">
          Termin bestätigt
        </h1>
        <p className="text-white/85 mt-2 text-sm sm:text-base">
          Ihre Reservierung ist fest gebucht. Wir sehen uns vor Ort.
        </p>
      </div>
    );
  }
  if (status === "CANCELLED") {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 text-white p-6 sm:p-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Termin abgebrochen
        </h1>
        <p className="text-white/85 mt-2 text-sm sm:text-base">
          Sie können jederzeit einen neuen Termin buchen.
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-2xl kobil-wave-dark text-white p-6 sm:p-8 shadow-[var(--shadow-card-lg)]">
      <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
        Wartet auf Bestätigung
      </span>
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-4">
        Fast geschafft!
      </h1>
      <p className="text-white/85 mt-2 text-sm sm:text-base">
        Bestätigen Sie Ihren Termin jetzt im KOBIL Chat.
      </p>
    </div>
  );
}

function CheckIcon() {
  return (
    <span className="inline-flex w-10 h-10 rounded-full bg-white/20 items-center justify-center">
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" aria-hidden="true">
        <path
          d="m5 12 5 5L20 7"
          stroke="white"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:gap-4">
      <dt className="text-xs uppercase tracking-wider text-[var(--color-kobil-navy)]/50 font-medium sm:w-32 sm:pt-0.5">
        {label}
      </dt>
      <dd className="flex-1 mt-0.5 sm:mt-0">{children}</dd>
    </div>
  );
}
