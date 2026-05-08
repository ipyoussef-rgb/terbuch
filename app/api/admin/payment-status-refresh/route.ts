import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { getTransactionStatus } from "@/lib/kobil/pay-client";
import { PAY_DEADLINE_MS } from "@/lib/kobil/payment-config";
import { appUrl } from "@/lib/app-url";

export const maxDuration = 60;

const Body = z.object({ appointmentId: z.string().min(1) });

export async function POST(req: NextRequest) {
  const session = await getSession("admin");
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const a = await db.appointment.findUnique({
    where: { id: parsed.data.appointmentId },
    select: {
      id: true,
      paymentTransactionId: true,
      paymentTransactionCreatedAt: true,
      paymentStatus: true,
    },
  });
  if (!a) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!a.paymentTransactionId) {
    return NextResponse.json(
      { error: "Keine Transaktion gestartet" },
      { status: 400 },
    );
  }

  const callback = appUrl("/api/admin/payment-callback");

  // Already in a final state? Skip the round-trip.
  const FINAL = ["SUCCESS", "FAILED", "CANCELLED", "TIMEOUT"];
  if (a.paymentStatus && FINAL.includes(a.paymentStatus)) {
    return NextResponse.json({
      ok: true,
      status: a.paymentStatus,
      final: true,
    });
  }

  let liveStatus: { normalized: string; rawStatus?: string };
  try {
    liveStatus = await getTransactionStatus(a.paymentTransactionId, callback);
  } catch (e) {
    console.warn("[payment-status-refresh] Pay API error", e);
    liveStatus = { normalized: a.paymentStatus ?? "UNKNOWN" };
  }

  // Pay's /status endpoint typically returns "inquiring status" — only the
  // merchantCallback push gives us SUCCESS/FAILED/CANCELLED. So:
  //   - if Pay returned a final status, take it
  //   - if Pay returned UNKNOWN, keep whatever we already had
  //   - else keep current and just bump lastCheckedAt
  let normalized = a.paymentStatus ?? "PENDING";
  if (FINAL.includes(liveStatus.normalized)) {
    normalized = liveStatus.normalized;
  } else if (liveStatus.normalized !== "UNKNOWN") {
    normalized = liveStatus.normalized;
  }

  // After the Pay timeout window has passed without a final status, mark TIMEOUT.
  if (!FINAL.includes(normalized)) {
    const startedMs = a.paymentTransactionCreatedAt?.getTime();
    const expired =
      startedMs == null || Date.now() - startedMs > PAY_DEADLINE_MS;
    if (expired) normalized = "TIMEOUT";
  }

  await db.appointment.update({
    where: { id: a.id },
    data: {
      paymentStatus: normalized,
      paymentRawStatus: liveStatus.rawStatus ?? null,
      paymentLastCheckedAt: new Date(),
    },
  });

  return NextResponse.json({
    ok: true,
    status: normalized,
    rawStatus: liveStatus.rawStatus,
    final: FINAL.includes(normalized),
  });
}
