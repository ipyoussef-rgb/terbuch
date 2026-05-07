import Link from "next/link";
import { EngineeredInGermany, KobilLogo, Tagline } from "@/components/Brand";

export const metadata = { title: "Datenschutz — Terbuch" };

export default function DatenschutzPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-kobil-mist-50)]">
      <header className="bg-white border-b border-[var(--color-kobil-line)]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <KobilLogo size="md" />
          </Link>
          <Link
            href="/"
            className="text-sm text-[var(--color-kobil-navy)]/70 hover:text-[var(--color-kobil-blue)]"
          >
            ← zurück
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14 prose prose-neutral">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--color-kobil-navy)]">
            Datenschutzerklärung
          </h1>
          <p className="text-[var(--color-kobil-navy)]/70 leading-relaxed mt-4">
            Diese Anwendung ist ein Demonstrations-Service zur Terminbuchung. Im
            Rahmen der Buchung werden die folgenden personenbezogenen Daten
            verarbeitet: Vor- und Nachname, E-Mail-Adresse, Telefonnummer,
            Geburtsdatum, Anschrift sowie der gewählte Termin und das gewählte
            Amt.
          </p>
          <p className="text-[var(--color-kobil-navy)]/70 leading-relaxed mt-4">
            Die Daten werden ausschließlich zur Durchführung der Terminbuchung
            und zur Kommunikation rund um den Termin verwendet. Eine Weitergabe
            an Dritte erfolgt nur, soweit dies zur Erbringung der angefragten
            Dienstleistung erforderlich ist (z.&nbsp;B. an das zuständige Amt).
          </p>
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 mt-6 text-sm text-amber-900">
            <strong>Hinweis:</strong> Dies ist ein Platzhalter. In einer
            produktiven Umgebung muss eine vollständige, datenschutzrechtlich
            geprüfte Erklärung hinterlegt werden.
          </div>
        </article>
      </main>

      <footer className="bg-white border-t border-[var(--color-kobil-line)]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <KobilLogo size="sm" />
            <Tagline className="text-xs sm:text-sm" />
          </div>
          <EngineeredInGermany />
        </div>
      </footer>
    </div>
  );
}
