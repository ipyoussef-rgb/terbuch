import type { UserClaims } from "./session";

type RawClaims = Record<string, unknown>;

/**
 * Read a claim that may appear in any of these shapes:
 * - flat string  (standard OIDC after Protocol Mappers): { phone: "..." }
 * - flat array   (some Keycloak responses):              { phone: ["..."] }
 * - wrapped under "attributes" (KOBIL Keycloak format):  { attributes: { phone: ["..."] } }
 *
 * Tries each candidate name in order and returns the first non-empty value.
 */
function read(raw: RawClaims, ...names: string[]): string | undefined {
  const attrs = (raw.attributes ?? {}) as Record<string, unknown>;
  for (const name of names) {
    for (const v of [raw[name], attrs[name]]) {
      if (typeof v === "string" && v.length > 0) return v;
      if (Array.isArray(v)) {
        const first = v[0];
        if (typeof first === "string" && first.length > 0) return first;
      }
    }
  }
  return undefined;
}

export function mapUserClaims(raw: RawClaims): UserClaims {
  // Some KOBIL responses nest the user object under a `data` key.
  const node = (raw.data && typeof raw.data === "object"
    ? (raw.data as RawClaims)
    : raw) as RawClaims;

  // Standard OIDC may also expose address as a nested object — keep as final fallback.
  const oidcAddress = (node.address ?? {}) as RawClaims;
  const oidcAddressGet = (k: string): string | undefined => {
    const v = oidcAddress[k];
    return typeof v === "string" && v.length > 0 ? v : undefined;
  };

  return {
    sub: read(node, "sub", "id") ?? "",
    firstName: read(node, "given_name", "firstName"),
    lastName: read(node, "family_name", "lastName"),
    email: read(node, "email"),
    phone: read(node, "phone", "phone_number", "phoneNumber"),
    birthdate: read(node, "bod", "birthdate", "birthDate"),
    street:
      read(node, "street", "street_address") ?? oidcAddressGet("street_address"),
    postalCode: read(node, "postal_code", "postalCode") ?? oidcAddressGet("postal_code"),
    city: read(node, "locality", "city") ?? oidcAddressGet("locality"),
  };
}
