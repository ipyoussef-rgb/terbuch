import { NextRequest, NextResponse, after } from "next/server";
import { db } from "@/lib/db";
import { getTransactionStatus } from "@/lib/kobil/pay-client";

export const maxDuration = 60;

/**
 * KOBIL Pay merchantCallback target.
 * Pay POSTs status updates here once the user finalises (or cancels) the
 * transaction in their KOBIL Pay app. We acknowledge fast (≤100ms) and do
 * the DB + Pay status fetch in `after()` so the Pay platform isn't held
 * waiting on us.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  console.log(
    `[pay-cb] inbound (${rawBody.length} bytes): ${rawBody.slice(0, 1000)}`,
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

  // Optional shortcut: status field from the callback body, if present.
  const callbackStatus = (dto?.status ?? dto?.transactionStatus) as
    | string
    | undefined;

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

    // Always re-query Pay to get the canonical normalized status.
    const callbackUrl = `${process.env.APP_BASE_URL ?? ""}/api/admin/payment-callback`;
    try {
      const status = await getTransactionStatus(transactionId, callbackUrl);
      await db.appointment.update({
        where: { id: a.id },
        data: {
          paymentStatus: status.normalized,
          paymentRawStatus: status.rawStatus ?? callbackStatus ?? null,
          paymentLastCheckedAt: new Date(),
        },
      });
      console.log(
        `[pay-cb] appointment=${a.id} status=${status.normalized} raw=${status.rawStatus}`,
      );
    } catch (e) {
      console.warn("[pay-cb] getStatus failed, falling back to body status", e);
      if (callbackStatus) {
        await db.appointment.update({
          where: { id: a.id },
          data: {
            paymentRawStatus: callbackStatus,
            paymentLastCheckedAt: new Date(),
          },
        });
      }
    }
  });

  return NextResponse.json({ ok: true });
}

// Pay sometimes uses GET for callbacks too — accept both.
export async function GET(req: NextRequest) {
  return POST(req);
}
