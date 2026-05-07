import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import OfficePicker from "./OfficePicker";

export const dynamic = "force-dynamic";

export default async function OfficePage(props: {
  searchParams: Promise<{ option?: string }>;
}) {
  const { option } = await props.searchParams;
  if (!option) redirect("/");

  const opt = await db.serviceOption.findUnique({
    where: { id: option },
    include: {
      service: {
        include: { offices: true },
      },
    },
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
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Amt auswählen</h1>
        <p className="text-neutral-600 mt-2">
          {opt.service.name} · <span className="font-medium">{opt.name}</span>
        </p>
      </div>
      <OfficePicker offices={offices} optionId={opt.id} />
    </div>
  );
}
