import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Stepper } from "@/components/Stepper";
import OfficePicker from "./OfficePicker";

export const dynamic = "force-dynamic";

export default async function OfficePage(props: {
  searchParams: Promise<{ option?: string }>;
}) {
  const { option } = await props.searchParams;
  if (!option) redirect("/");

  const opt = await db.serviceOption.findUnique({
    where: { id: option },
    include: { service: { include: { offices: true } } },
  });
  if (!opt) redirect("/");

  const offices = opt.service.offices.map((o) => ({
    id: o.id,
    name: o.name,
    city: o.city,
    street: o.street,
    postalCode: o.postalCode,
    lat: o.lat,
    lng: o.lng,
  }));

  return (
    <div className="space-y-6 sm:space-y-8 max-w-3xl">
      <Link
        href={`/service/${opt.service.slug}`}
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
        <Stepper step={2} />
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-4">
          Amt auswählen
        </h1>
        <p className="text-[var(--color-kobil-navy)]/60 mt-2 text-sm sm:text-base">
          {opt.service.name} ·{" "}
          <span className="font-medium text-[var(--color-kobil-navy)]">
            {opt.name}
          </span>
        </p>
      </div>

      <OfficePicker offices={offices} optionId={opt.id} />
    </div>
  );
}
