/**
 * Resolves the app's external base URL for things like server-to-server
 * callback URLs (KOBIL Pay merchantCallback, OIDC redirect_uri building).
 *
 * Priority:
 *   1. APP_BASE_URL (explicitly set in Vercel project settings)
 *   2. VERCEL_PROJECT_PRODUCTION_URL (Vercel sets this on prod deployments)
 *   3. VERCEL_URL (Vercel sets this on every deployment, includes the
 *      preview-deployment hash — only useful as last resort)
 *   4. http://localhost:3000 (local dev)
 */
export function appUrl(path = ""): string {
  const explicit = process.env.APP_BASE_URL?.replace(/\/$/, "");
  const prod =
    process.env.VERCEL_PROJECT_PRODUCTION_URL &&
    `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  const fallback =
    process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`;
  const base = explicit || prod || fallback || "http://localhost:3000";
  return `${base}${path.startsWith("/") ? path : path ? `/${path}` : ""}`;
}
