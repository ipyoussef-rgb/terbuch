import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { getSession } from "@/lib/auth/session";
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
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-6">
        <h1 className="text-lg font-medium">Dieser Termin ist nicht mehr verfügbar.</h1>
        <p className="text-sm text-neutral-700 mt-2">
          Bitte wählen Sie einen anderen Termin aus.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Reservierung</h1>
        <div className="mt-3 rounded-lg border border-neutral-200 bg-white p-4 text-sm">
          <div>
            <span className="text-neutral-500">Service:</span> {opt.service.name} ·{" "}
            <span className="font-medium">{opt.name}</span>
          </div>
          <div>
            <span className="text-neutral-500">Amt:</span> {off.name},{" "}
            {off.street}, {off.postalCode} {off.city}
          </div>
          <div>
            <span className="text-neutral-500">Termin:</span>{" "}
            {format(sl.startsAt, "EEEE, d. MMMM yyyy 'um' HH:mm 'Uhr'", {
              locale: de,
            })}
          </div>
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
