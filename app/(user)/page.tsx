import Link from "next/link";
import { db } from "@/lib/db";
import { Tagline } from "@/components/Brand";

export const dynamic = "force-dynamic";

const SERVICE_DECOR: Record<
  string,
  { gradient: string; icon: React.ReactNode }
> = {
  buergerservice: {
    gradient: "from-[#2E4FFF] to-[#5B72FF]",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" aria-hidden="true">
        <path
          d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"
          stroke="currentColor"
          strokeWidth="1.7"
        />
        <path
          d="M3 10h18M8 15h3"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  fahrerlaubnis: {
    gradient: "from-[#1E34B8] to-[#2E4FFF]",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" aria-hidden="true">
        <path
          d="M5 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0Zm10 0a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z"
          stroke="currentColor"
          strokeWidth="1.7"
        />
        <path
          d="M3 17h2m4 0h6m4 0h2v-4l-2-3h-4M3 17V8a1 1 0 0 1 1-1h12l3 4"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  standesamt: {
    gradient: "from-[#3D5BFF] to-[#7A8DFF]",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" aria-hidden="true">
        <path
          d="M12 21s-7-4.35-7-10a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 5.65-7 10-7 10h-4Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
};

export default async function HomePage() {
  const services = await db.service.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="space-y-8 sm:space-y-12">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl kobil-wave-dark text-white px-6 sm:px-10 py-10 sm:py-16 shadow-[var(--shadow-card-lg)]">
        <div className="relative z-10 max-w-2xl">
          <Tagline variant="white" className="text-sm sm:text-base mb-3 opacity-90" />
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight leading-tight">
            Termin buchen.
            <br />
            <span className="text-white/80">Schnell. Sicher. Digital.</span>
          </h1>
          <p className="mt-4 sm:mt-5 text-base sm:text-lg text-white/85 max-w-xl">
            Wählen Sie einen Service, finden Sie Ihr nächstgelegenes Amt und
            bestätigen Sie Ihren Termin direkt im KOBIL Chat.
          </p>
        </div>
        <svg
          className="absolute -right-16 -bottom-16 w-72 sm:w-[520px] opacity-20"
          viewBox="0 0 600 600"
          aria-hidden="true"
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <path
              key={i}
              d={`M0 ${300 + i * 22} Q 150 ${260 + i * 22} 300 ${300 + i * 22} T 600 ${300 + i * 22}`}
              stroke="white"
              strokeOpacity={0.55 - i * 0.05}
              fill="none"
              strokeWidth={1.4}
            />
          ))}
        </svg>
      </section>

      {/* Service grid */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">
            Service wählen
          </h2>
          <p className="text-sm text-[var(--color-kobil-navy)]/60 mt-1">
            Wofür benötigen Sie einen Termin?
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((s) => {
            const decor =
              SERVICE_DECOR[s.slug] ?? {
                gradient: "from-[#2E4FFF] to-[#5B72FF]",
                icon: null,
              };
            return (
              <Link
                key={s.id}
                href={`/service/${s.slug}`}
                className="group block bg-white rounded-2xl border border-[var(--color-kobil-line)] p-6 hover:border-[var(--color-kobil-blue)] hover:shadow-[var(--shadow-card-lg)] transition-all"
              >
                <div
                  className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${decor.gradient} text-white mb-5`}
                >
                  {decor.icon}
                </div>
                <div className="text-lg font-semibold tracking-tight">
                  {s.name}
                </div>
                <div className="mt-2 text-sm text-[var(--color-kobil-navy)]/60 flex items-center gap-1.5 group-hover:text-[var(--color-kobil-blue)]">
                  Termin auswählen
                  <svg
                    viewBox="0 0 16 16"
                    className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1"
                    aria-hidden="true"
                  >
                    <path
                      d="M3 8h10m0 0L9 4m4 4-4 4"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </Link>
            );
          })}

          {services.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-dashed border-[var(--color-kobil-line)] bg-white p-8 text-center">
              <p className="text-sm text-[var(--color-kobil-navy)]/60">
                Noch keine Services konfiguriert. Stamm­daten werden beim
                nächsten Deploy automatisch geladen.
              </p>
            </div>
          ) : null}
        </div>
      </section>

      {/* Trust line */}
      <section className="grid sm:grid-cols-3 gap-4">
        <Feature
          title="KOBIL Identity"
          desc="Einmal anmelden mit deiner sicheren KOBIL-Identität — ohne Formularstress."
        />
        <Feature
          title="Bestätigung im Chat"
          desc="Du bestätigst den Termin direkt im KOBIL Chat. Kein Spam, keine E-Mails."
        />
        <Feature
          title="Engineered in Germany"
          desc="Datenschutz nach deutschem Standard — Hosting in der EU."
        />
      </section>
    </div>
  );
}

function Feature({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-xl bg-white border border-[var(--color-kobil-line)] p-5">
      <div className="text-sm font-semibold text-[var(--color-kobil-blue)]">
        {title}
      </div>
      <div className="text-sm text-[var(--color-kobil-navy)]/70 mt-1.5 leading-relaxed">
        {desc}
      </div>
    </div>
  );
}
