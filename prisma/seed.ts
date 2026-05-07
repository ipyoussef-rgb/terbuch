import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}
const db = new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });

type ServiceSeed = {
  slug: string;
  name: string;
  options: { name: string; durationMin: number }[];
};

const SERVICES: ServiceSeed[] = [
  {
    slug: "buergerservice",
    name: "Bürgerservicebüro / Zulassungsstelle",
    options: [
      { name: "Personalausweis beantragen", durationMin: 20 },
      { name: "Reisepass beantragen", durationMin: 20 },
      { name: "Meldebescheinigung abholen", durationMin: 10 },
      { name: "An- / Ummeldung Wohnsitz", durationMin: 30 },
      { name: "Führungszeugnis beantragen", durationMin: 15 },
      { name: "KFZ-Zulassung / Ummeldung", durationMin: 30 },
    ],
  },
  {
    slug: "fahrerlaubnis",
    name: "Fahrerlaubnis",
    options: [
      { name: "Führerschein beantragen (Erstantrag)", durationMin: 30 },
      { name: "Führerschein-Umtausch", durationMin: 20 },
      { name: "Verlustanzeige Führerschein", durationMin: 15 },
      { name: "Internationaler Führerschein", durationMin: 20 },
      { name: "Führerschein-Erweiterung", durationMin: 30 },
    ],
  },
  {
    slug: "standesamt",
    name: "Standesamt",
    options: [
      { name: "Eheschließung anmelden", durationMin: 45 },
      { name: "Geburtsurkunde beantragen", durationMin: 15 },
      { name: "Sterbefall anzeigen", durationMin: 30 },
      { name: "Vaterschaftsanerkennung", durationMin: 30 },
      { name: "Namensänderung", durationMin: 30 },
    ],
  },
];

type OfficeSeed = {
  name: string;
  city: string;
  street: string;
  postalCode: string;
  lat: number;
  lng: number;
  serviceSlugs: string[];
};

const OFFICES: OfficeSeed[] = [
  {
    name: "Bürgerbüro Worms",
    city: "Worms",
    street: "Marktplatz 2",
    postalCode: "67547",
    lat: 49.6308,
    lng: 8.3658,
    serviceSlugs: ["buergerservice", "standesamt"],
  },
  {
    name: "KFZ-Zulassungsstelle Worms",
    city: "Worms",
    street: "Klosterstraße 11",
    postalCode: "67547",
    lat: 49.6402,
    lng: 8.3501,
    serviceSlugs: ["buergerservice", "fahrerlaubnis"],
  },
  {
    name: "Bürgerservice Mainz",
    city: "Mainz",
    street: "Stadthausstraße 1",
    postalCode: "55116",
    lat: 49.9929,
    lng: 8.2473,
    serviceSlugs: ["buergerservice", "standesamt", "fahrerlaubnis"],
  },
  {
    name: "Fahrerlaubnisbehörde Mainz",
    city: "Mainz",
    street: "Kaiser-Friedrich-Straße 7",
    postalCode: "55116",
    lat: 50.0011,
    lng: 8.2731,
    serviceSlugs: ["fahrerlaubnis"],
  },
  {
    name: "Bürgerbüro Speyer",
    city: "Speyer",
    street: "Maximilianstraße 100",
    postalCode: "67346",
    lat: 49.317,
    lng: 8.4376,
    serviceSlugs: ["buergerservice", "standesamt"],
  },
];

async function main() {
  console.log("Seeding services & options…");
  for (const s of SERVICES) {
    await db.service.upsert({
      where: { slug: s.slug },
      update: { name: s.name },
      create: {
        slug: s.slug,
        name: s.name,
        options: { create: s.options },
      },
    });
  }

  console.log("Seeding offices…");
  for (const o of OFFICES) {
    const services = await db.service.findMany({
      where: { slug: { in: o.serviceSlugs } },
    });
    await db.office.upsert({
      where: { id: `${o.city}-${o.name}` },
      update: {
        name: o.name,
        city: o.city,
        street: o.street,
        postalCode: o.postalCode,
        lat: o.lat,
        lng: o.lng,
        services: { set: services.map((s) => ({ id: s.id })) },
      },
      create: {
        id: `${o.city}-${o.name}`,
        name: o.name,
        city: o.city,
        street: o.street,
        postalCode: o.postalCode,
        lat: o.lat,
        lng: o.lng,
        services: { connect: services.map((s) => ({ id: s.id })) },
      },
    });
  }

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
