import { NextRequest, NextResponse, after } from "next/server";
import { db } from "@/lib/db";
import { getTransactionStatus } from "@/lib/kobil/pay-client";
import { appUrl } from "@/lib/app-url";

export const maxDuration = 60;

/**
 * KOBIL Pay merchantCallback target.
 *
 * Per the Pay docs:
 *   - "Accepts POST Request", "Accepts JSON Body"
 *   - "Shouldn't ask for Authorization"   ← proxy.ts whitelists this path
 *   - Body fields: transactionId, operationId, status, message,
 *     transactionStatus, transactionMessage, gateway
 *
 * Strategy: ack ≤100ms, then update DB in `after()`. We trust the
 * callback's status field as source of truth, and re-query Pay only
 * if the body lacks usable info.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  console.log(
    `[pay-cb] inbound (${rawBody.length} bytes): ${rawBody.slice(0, 1500)}`,
  );

  let dto: Record<string, unknown> | null = null;
  try {
    dto = rawBody ? (JSON.parse(rawBody) as Record<string, unknown>) : null;
  } catch {
    /* keep raw, don't fail */
  }

  const transactionId =
    (dto?.transactionId as string | undefined) ??
    (dto?.paymentTransactionId as string | undefined) ??
    (dto?.id as string | undefined) ??
    req.nextUrl.searchParams.get("transactionId") ??
    null;

  // Per docs the most reliable status field is `transactionStatus`,
  // with `status` as a related field.
  const bodyStatus =
    (dto?.transactionStatus as string | undefined) ??
    (dto?.status as string | undefined);

  after(async () => {
    if (!transactionId) {
      console.warn("[pay-cb] no transactionId in callback");
      return;
    }
    const a = await db.appointment.findFirst({
      where: { paymentTransactionId: transactionId },
      select: { id: true },
    });
    if (!a) {
      console.warn(
        `[pay-cb] no appointment found for transactionId=${transactionId}`,
      );
      return;
    }

    // Trust the callback body if it has a usable status; otherwise re-query.
    const fromBody = bodyStatus ? normalize(bodyStatus) : "UNKNOWN";
    if (fromBody !== "UNKNOWN") {
      await db.appointment.update({
        where: { id: a.id },
        data: {
          paymentStatus: fromBody,
          paymentRawStatus: bodyStatus ?? null,
          paymentLastCheckedAt: new Date(),
        },
      });
      console.log(
        `[pay-cb] appointment=${a.id} status=${fromBody} (from callback body raw=${bodyStatus})`,
      );
      return;
    }

    try {
      const status = await getTransactionStatus(
        transactionId,
        appUrl("/api/admin/payment-callback"),
      );
      await db.appointment.update({
        where: { id: a.id },
        data: {
          paymentStatus: status.normalized,
          paymentRawStatus: status.rawStatus ?? bodyStatus ?? null,
          paymentLastCheckedAt: new Date(),
        },
      });
      console.log(
        `[pay-cb] appointment=${a.id} status=${status.normalized} (from re-query, raw=${status.rawStatus})`,
      );
    } catch (e) {
      console.warn("[pay-cb] getStatus failed", e);
    }
  });

  return NextResponse.json({ ok: true });
}

// Pay sometimes uses GET — accept both.
export async function GET(req: NextRequest) {
  return POST(req);
}

function normalize(
  s: string,
):
  | "PENDING"
  | "INITIATED"
  | "SUCCESS"
  | "FAILED"
  | "CANCELLED"
  | "TIMEOUT"
  | "UNKNOWN" {
  const u = s.toUpperCase();
  // Pay sends "finished" / "Payment complete." for the success case.
  if (
    u.includes("SUCCESS") ||
    u.includes("COMPLETE") ||
    u.includes("FINISH") ||
    u.includes("PAID") ||
    u.includes("DONE")
  )
    return "SUCCESS";
  if (
    u.includes("FAIL") ||
    u.includes("ERROR") ||
    u.includes("REJECT") ||
    u.includes("DECLIN")
  )
    return "FAILED";
  if (u.includes("CANCEL") || u.includes("VOID") || u.includes("ABORT"))
    return "CANCELLED";
  if (u.includes("TIMEOUT") || u.includes("EXPIRE")) return "TIMEOUT";
  if (u.includes("INIT")) return "INITIATED";
  if (
    u.includes("INQUIR") ||
    u.includes("PEND") ||
    u.includes("PROCESS") ||
    u.includes("WAIT")
  )
    return "PENDING";
  return "UNKNOWN";
}
