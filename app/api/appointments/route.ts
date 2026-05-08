import { NextRequest, NextResponse, after } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

// Allow longer execution: client_credentials + 2 Mercury POSTs can cumulatively
// exceed Vercel's default 10s. `after()` continues running until this limit.
export const maxDuration = 60;
import { getSession } from "@/lib/auth/session";
import {
  ChatChoice,
  sendChoiceRequest,
  sendPlainText,
} from "@/lib/kobil/chat-client";
import { greetingText } from "@/lib/kobil/messages";

const BodySchema = z.object({
  slotId: z.string().min(1),
  serviceOptionId: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional().nullable(),
  birthdate: z.string().optional().nullable(),
  street: z.string().min(1),
  postalCode: z.string().min(1),
  city: z.string().min(1),
  privacyAccepted: z.literal(true),
});

export async function POST(req: NextRequest) {
  const session = await getSession("user");
  if (!session || session.role !== "user") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const data = parsed.data;

  const appointment = await db.$transaction(async (tx) => {
    const slot = await tx.slot.findUnique({
      where: { id: data.slotId },
      include: { service: true, office: true },
    });
    if (!slot) throw new Response("Slot not found", { status: 404 });
    if (slot.status !== "FREE") {
      throw new Response("Slot no longer free", { status: 409 });
    }

    const opt = await tx.serviceOption.findUnique({
      where: { id: data.serviceOptionId },
    });
    if (!opt || opt.serviceId !== slot.serviceId) {
      throw new Response("Service option mismatch", { status: 400 });
    }

    await tx.slot.update({
      where: { id: slot.id },
      data: { status: "PENDING" },
    });

    return tx.appointment.create({
      data: {
        slotId: slot.id,
        serviceOptionId: opt.id,
        kobilSub: session.user.sub,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone || null,
        birthdate: data.birthdate ? new Date(data.birthdate) : null,
        street: data.street,
        postalCode: data.postalCode,
        city: data.city,
        privacyAccepted: true,
        status: "PENDING",
      },
      include: {
        slot: { include: { office: true, service: true } },
        serviceOption: true,
      },
    });
  }).catch((e) => {
    if (e instanceof Response) throw e;
    throw e;
  });

  // Send the chat after the response goes back to the user.
  // `after()` keeps the function alive on Vercel until maxDuration, unlike
  // a bare `void promise` which can be killed the moment we return.
  after(async () => {
    try {
      await initChat(appointment.id);
    } catch (err) {
      const msg = err instanceof Error ? `${err.message}` : String(err);
      console.error(`[chat init] FAILED for appointment ${appointment.id}:`, msg);
      if (err instanceof Error && err.stack) console.error(err.stack);
      try {
        await db.appointment.update({
          where: { id: appointment.id },
          data: { chatInitError: msg.slice(0, 1000) },
        });
      } catch (e) {
        console.error("[chat init] could not persist error:", e);
      }
    }
  });

  return NextResponse.json({ id: appointment.id });
}

async function initChat(appointmentId: string): Promise<void> {
  console.log(`[chat init] start for appointment ${appointmentId}`);
  const a = await db.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      slot: { include: { office: true, service: true } },
      serviceOption: true,
    },
  });
  if (!a) {
    console.warn(`[chat init] appointment ${appointmentId} not found`);
    return;
  }

  // Mercury addresses recipients by username/email (the user's KOBIL identity)
  // — not by the OIDC `sub` UUID. Use the email captured at booking time.
  const recipient = a.email;

  console.log(
    `[chat init] recipient=${recipient} sub=${a.kobilSub} office=${a.slot.office.name} startsAt=${a.slot.startsAt.toISOString()}`,
  );

  const summary = {
    serviceName: a.slot.service.name,
    optionName: a.serviceOption.name,
    officeName: a.slot.office.name,
    officeAddress: `${a.slot.office.street}, ${a.slot.office.postalCode} ${a.slot.office.city}`,
    startsAt: a.slot.startsAt,
    firstName: a.firstName,
  };

  // Single combined message (greeting text + buttons) — fewer round-trips
  // and less for the user's KOBIL Chat to refresh when they reopen it.
  const combined = `${greetingText(summary)}\n\nTermin bestätigen?`;
  console.log(`[chat init] sendChoiceRequest (combined)`);
  await sendChoiceRequest(recipient, combined, [
    ChatChoice.CONFIRM,
    ChatChoice.CANCEL,
  ]);
  await db.chatMessage.create({
    data: {
      appointmentId: a.id,
      direction: "OUT",
      type: "choiceRequest",
      body: combined,
    },
  });

  await db.appointment.update({
    where: { id: a.id },
    data: { chatInitError: null },
  });

  console.log(`[chat init] done for appointment ${appointmentId}`);
}
