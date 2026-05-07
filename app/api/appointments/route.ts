import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
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

  // Fire-and-forget chat init (don't block the booking on chat errors).
  void initChat(appointment.id).catch((err) => {
    console.error("[chat init] failed", err);
  });

  return NextResponse.json({ id: appointment.id });
}

async function initChat(appointmentId: string): Promise<void> {
  const a = await db.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      slot: { include: { office: true, service: true } },
      serviceOption: true,
    },
  });
  if (!a) return;

  const summary = {
    serviceName: a.slot.service.name,
    optionName: a.serviceOption.name,
    officeName: a.slot.office.name,
    officeAddress: `${a.slot.office.street}, ${a.slot.office.postalCode} ${a.slot.office.city}`,
    startsAt: a.slot.startsAt,
    firstName: a.firstName,
  };

  await sendPlainText(a.kobilSub, greetingText(summary));
  await db.chatMessage.create({
    data: {
      appointmentId: a.id,
      direction: "OUT",
      type: "plainText",
      body: greetingText(summary),
    },
  });

  await sendChoiceRequest(a.kobilSub, "Termin bestätigen?", [
    ChatChoice.CONFIRM,
    ChatChoice.CANCEL,
  ]);
  await db.chatMessage.create({
    data: {
      appointmentId: a.id,
      direction: "OUT",
      type: "choiceRequest",
      body: `${ChatChoice.CONFIRM} | ${ChatChoice.CANCEL}`,
    },
  });
}
