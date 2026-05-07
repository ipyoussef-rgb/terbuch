export const metadata = { title: "Datenschutz — Terbuch" };

export default function DatenschutzPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12 space-y-4 text-sm leading-6 text-neutral-700">
      <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
        Datenschutzerklärung
      </h1>
      <p>
        Diese Anwendung ist ein Demonstrations-Service zur Terminbuchung. Im
        Rahmen der Buchung werden die folgenden personenbezogenen Daten
        verarbeitet: Vor- und Nachname, E-Mail-Adresse, Telefonnummer,
        Geburtsdatum, Anschrift sowie der gewählte Termin und das gewählte
        Amt.
      </p>
      <p>
        Die Daten werden ausschließlich zur Durchführung der Terminbuchung und
        zur Kommunikation rund um den Termin verwendet. Eine Weitergabe an
        Dritte erfolgt nur, soweit dies zur Erbringung der angefragten
        Dienstleistung erforderlich ist (z. B. an das zuständige Amt).
      </p>
      <p>
        <strong>Hinweis:</strong> Dies ist ein Platzhalter. In einer
        produktiven Umgebung muss eine vollständige, datenschutzrechtlich
        geprüfte Erklärung hinterlegt werden.
      </p>
    </div>
  );
}
