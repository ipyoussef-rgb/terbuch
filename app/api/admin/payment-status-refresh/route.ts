import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { getTransactionStatus } from "@/lib/kobil/pay-client";

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
    select: { id: true, paymentTransactionId: true },
  });
  if (!a) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!a.paymentTransactionId) {
    return NextResponse.json(
      { error: "Keine Transaktion gestartet" },
      { status: 400 },
    );
  }

  const callback = `${process.env.APP_BASE_URL ?? ""}/api/admin/payment-callback`;
  const status = await getTransactionStatus(a.paymentTransactionId, callback);

  await db.appointment.update({
    where: { id: a.id },
    data: {
      paymentStatus: status.normalized,
      paymentRawStatus: status.rawStatus ?? null,
      paymentLastCheckedAt: new Date(),
    },
  });

  return NextResponse.json({
    ok: true,
    status: status.normalized,
    rawStatus: status.rawStatus,
  });
}
