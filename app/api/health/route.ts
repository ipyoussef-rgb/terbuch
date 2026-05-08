import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Lightweight warm-up endpoint. Hitting this:
 *  - Wakes the Vercel function
 *  - Establishes the Neon Postgres connection (free tier scales to zero
 *    after ~5 min idle and the first query takes 1-3s on wake)
 *
 * Useful as a cron target or as a manual ping before a demo.
 */
export async function GET() {
  const t0 = Date.now();
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, dbMs: Date.now() - t0 });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 503 },
    );
  }
}
