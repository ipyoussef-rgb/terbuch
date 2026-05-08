import { NextRequest, NextResponse, after } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { sendChoiceRequest } from "@/lib/kobil/chat-client";
import {
  PAYMENT_CHOICE_ONLINE,
  PAYMENT_CHOICE_ONSITE,
} from "@/lib/kobil/payment-choices";

export const maxDuration = 60;

const Body = z.object({
  appointmentId: z.string().min(1),
  amountCents: z.number().int().positive(),
  currency: z.string().min(2).max(8).default("EUR"),
  description: z.string().min(1).max(200).default("Bearbeitungsgebühr"),
});

export async function POST(req: NextRequest) {
  const session = await getSession("admin");
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { appointmentId, amountCents, currency, description } = parsed.data;

  const a = await db.appointment.findUnique({
    where: { id: appointmentId },
    select: { id: true, email: true, status: true, firstName: true },
  });
  if (!a) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (a.status !== "CONFIRMED") {
    return NextResponse.json(
      { error: "Termin ist nicht bestätigt" },
      { status: 409 },
    );
  }

  const major = (amountCents / 100).toFixed(2);
  const text =
    `Hallo ${a.firstName ?? ""}, für Ihren Termin fallen Gebühren in Höhe von ` +
    `${major} ${currency} (${description}) an.\n\n` +
    `Möchten Sie direkt online bezahlen oder vor Ort?`;

  // Persist sync so admin UI flips immediately on refresh.
  await db.appointment.update({
    where: { id: a.id },
    data: {
      paymentAmountCents: amountCents,
      paymentCurrency: currency,
      paymentRequestedAt: new Date(),
      paymentStatus: null,
      paymentChoice: null,
      paymentTransactionId: null,
      paymentTransactionCreatedAt: null,
      paymentRawStatus: null,
      paymentLastCheckedAt: null,
    },
  });

  // Mercury call after the response.
  after(async () => {
    try {
      await sendChoiceRequest(a.email, text, [
        PAYMENT_CHOICE_ONLINE,
        PAYMENT_CHOICE_ONSITE,
      ]);
      await db.chatMessage.create({
        data: {
          appointmentId: a.id,
          direction: "OUT",
          type: "choiceRequest",
          body: text,
        },
      });
    } catch (e) {
      console.error("[payment-request] chat send failed", e);
    }
  });

  return NextResponse.json({ ok: true });
}
