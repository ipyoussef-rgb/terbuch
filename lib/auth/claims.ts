import type { UserClaims } from "./session";

type RawClaims = Record<string, unknown>;

function s(v: unknown): string | undefined {
  if (typeof v === "string" && v.length > 0) return v;
  return undefined;
}

export function mapUserClaims(raw: RawClaims): UserClaims {
  const sub = s(raw.sub) ?? "";
  const address = (raw.address ?? {}) as RawClaims;
  const street =
    s(address.street_address) ??
    ([s(address.street), s(address.house_number)].filter(Boolean).join(" ") ||
      undefined);
  return {
    sub,
    firstName: s(raw.given_name) ?? s(raw.firstName),
    lastName: s(raw.family_name) ?? s(raw.lastName),
    email: s(raw.email),
    phone: s(raw.phone_number) ?? s(raw.phone),
    birthdate: s(raw.birthdate),
    street: street,
    postalCode: s(address.postal_code),
    city: s(address.locality) ?? s(address.city),
  };
}
