import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { getSession } from "@/lib/auth/session";
import { Stepper } from "@/components/Stepper";
import BookingForm from "./BookingForm";

export const dynamic = "force-dynamic";

export default async function BookPage(props: {
  searchParams: Promise<{ option?: string; office?: string; slot?: string }>;
}) {
  const { option, office, slot } = await props.searchParams;
  if (!option || !office || !slot) redirect("/");

  const session = await getSession("user");
  if (!session || session.role !== "user") redirect("/");

  const [opt, off, sl] = await Promise.all([
    db.serviceOption.findUnique({
      where: { id: option },
      include: { service: true },
    }),
    db.office.findUnique({ where: { id: office } }),
    db.slot.findUnique({ where: { id: slot } }),
  ]);
  if (!opt || !off || !sl) redirect("/");

  if (sl.status !== "FREE") {
    return (
      <div className="max-w-2xl space-y-6">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <h1 className="text-lg font-semibold text-amber-900">
            Dieser Termin ist nicht mehr verfügbar.
          </h1>
          <p className="text-sm text-amber-900/80 mt-2">
            Bitte wählen Sie einen anderen Termin aus.
          </p>
          <Link
            href={`/slots?option=${opt.id}&office=${off.id}`}
            className="inline-block mt-4 rounded-full bg-[var(--color-kobil-blue)] text-white px-4 py-2 text-sm font-medium hover:bg-[var(--color-kobil-blue-600)]"
          >
            Andere Termine ansehen
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 max-w-3xl">
      <Link
        href={`/slots?option=${opt.id}&office=${off.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-[var(--color-kobil-navy)]/60 hover:text-[var(--color-kobil-blue)]"
      >
        <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" aria-hidden="true">
          <path
            d="M13 8H3m0 0 4 4M3 8l4-4"
            stroke="currentColor"
            strokeWidth="1.6"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        zurück
      </Link>

      <div>
        <Stepper step={4} />
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-4">
          Reservierung
        </h1>
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-[var(--color-kobil-blue)] to-[#5B72FF] text-white p-5 sm:p-6 shadow-[var(--shadow-card)]">
        <div className="text-xs font-medium text-white/70 uppercase tracking-wide">
          Termin-Übersicht
        </div>
        <div className="mt-3 grid sm:grid-cols-2 gap-3 sm:gap-5">
          <Detail label="Service">
            <span className="font-medium">{opt.service.name}</span>
            <br />
            <span className="text-white/80 text-sm">{opt.name}</span>
          </Detail>
          <Detail label="Termin">
            <span className="font-medium">
              {format(sl.startsAt, "EEE, d. MMM yyyy", { locale: de })}
            </span>
            <br />
            <span className="text-white/80 text-sm tabular-nums">
              {format(sl.startsAt, "HH:mm")} Uhr
            </span>
          </Detail>
          <Detail label="Amt" full>
            <span className="font-medium">{off.name}</span>
            <br />
            <span className="text-white/80 text-sm">
              {off.street}, {off.postalCode} {off.city}
            </span>
          </Detail>
        </div>
      </div>

      <BookingForm
        slotId={sl.id}
        optionId={opt.id}
        prefill={{
          firstName: session.user.firstName ?? "",
          lastName: session.user.lastName ?? "",
          email: session.user.email ?? "",
          phone: session.user.phone ?? "",
          birthdate: session.user.birthdate ?? "",
          street: session.user.street ?? "",
          postalCode: session.user.postalCode ?? "",
          city: session.user.city ?? "",
        }}
      />
    </div>
  );
}

function Detail({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <div className="text-[10px] uppercase tracking-wider text-white/60 font-medium mb-1">
        {label}
      </div>
      <div className="text-sm leading-snug">{children}</div>
    </div>
  );
}
