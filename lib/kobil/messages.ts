import { format } from "date-fns";
import { de } from "date-fns/locale";

type AppointmentSummary = {
  serviceName: string;
  optionName: string;
  officeName: string;
  officeAddress: string;
  startsAt: Date;
  firstName?: string;
};

export function greetingText(a: AppointmentSummary): string {
  const when = format(a.startsAt, "EEEE, d. MMMM yyyy 'um' HH:mm 'Uhr'", {
    locale: de,
  });
  const name = a.firstName ? `Hallo ${a.firstName}, ` : "Hallo, ";
  return (
    `${name}Sie sind fast fertig mit Ihrer Reservierung.\n\n` +
    `Service: ${a.serviceName} – ${a.optionName}\n` +
    `Amt: ${a.officeName}, ${a.officeAddress}\n` +
    `Termin: ${when}\n\n` +
    `Bitte bestätigen Sie den Termin unten.`
  );
}

export function confirmationText(a: AppointmentSummary): string {
  const when = format(a.startsAt, "EEEE, d. MMMM yyyy 'um' HH:mm 'Uhr'", {
    locale: de,
  });
  return (
    `Vielen Dank! Ihr Termin ist bestätigt.\n\n` +
    `${a.serviceName} – ${a.optionName}\n` +
    `${a.officeName}, ${a.officeAddress}\n` +
    `${when}\n\n` +
    `Wir sehen uns dort.`
  );
}

export function cancellationText(): string {
  return (
    "Ihr Termin wurde abgebrochen. " +
    "Sie können jederzeit einen neuen Termin in der App buchen."
  );
}
