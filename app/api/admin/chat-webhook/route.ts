import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  ChatChoice,
  sendChoiceRequest,
  sendPlainText,
  sendProcessChatMessage,
} from "@/lib/kobil/chat-client";
import {
  cancellationText,
  confirmationText,
  greetingText,
} from "@/lib/kobil/messages";

type CallbackDto = {
  message?: {
    serviceUuid?: string;
    from?: { userId?: string };
    content?: {
      messageType?: string;
      messageContent?: {
        messageText?: string;
        choices?: { text: string }[];
      };
    };
  };
};

function checkSecret(req: NextRequest): boolean {
  const expected = process.env.KOBIL_WEBHOOK_SECRET;
  if (!expected) return true;
  const got =
    req.headers.get("x-webhook-secret") ??
    req.headers.get("x-kobil-secret") ??
    req.nextUrl.searchParams.get("secret");
  return got === expected;
}

export async function POST(req: NextRequest) {
  if (!checkSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dto = (await req.json().catch(() => null)) as CallbackDto | null;
  const userId = dto?.message?.from?.userId;
  const messageType = dto?.message?.content?.messageType;
  const messageText = dto?.message?.content?.messageContent?.messageText;
  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  // Find the most recent appointment for this user
  const appointment = await db.appointment.findFirst({
    where: { kobilSub: userId },
    orderBy: { createdAt: "desc" },
    include: {
      slot: { include: { office: true, service: true } },
      serviceOption: true,
    },
  });

  if (!appointment) {
    if (messageType === "init") {
      await sendPlainText(
        userId,
        "Hallo! Sie haben aktuell keine offene Reservierung in unserer App.",
      );
    }
    return NextResponse.json({ ok: true });
  }

  const summary = {
    serviceName: appointment.slot.service.name,
    optionName: appointment.serviceOption.name,
    officeName: appointment.slot.office.name,
    officeAddress: `${appointment.slot.office.street}, ${appointment.slot.office.postalCode} ${appointment.slot.office.city}`,
    startsAt: appointment.slot.startsAt,
    firstName: appointment.firstName,
  };

  await db.chatMessage.create({
    data: {
      appointmentId: appointment.id,
      direction: "IN",
      type: messageType ?? "unknown",
      body: messageText ?? "",
    },
  });

  if (messageType === "init") {
    if (appointment.status === "PENDING") {
      await sendPlainText(userId, greetingText(summary));
      await sendChoiceRequest(userId, "Termin bestätigen?", [
        ChatChoice.CONFIRM,
        ChatChoice.CANCEL,
      ]);
      await db.chatMessage.create({
        data: {
          appointmentId: appointment.id,
          direction: "OUT",
          type: "choiceRequest",
          body: `${ChatChoice.CONFIRM} | ${ChatChoice.CANCEL}`,
        },
      });
    } else if (appointment.status === "CONFIRMED") {
      await sendPlainText(userId, confirmationText(summary));
    }
    return NextResponse.json({ ok: true });
  }

  if (appointment.status !== "PENDING") {
    return NextResponse.json({ ok: true });
  }

  if (messageText === ChatChoice.CONFIRM) {
    await db.$transaction([
      db.appointment.update({
        where: { id: appointment.id },
        data: { status: "CONFIRMED", confirmedAt: new Date() },
      }),
      db.slot.update({
        where: { id: appointment.slotId },
        data: { status: "BOOKED" },
      }),
    ]);
    await sendProcessChatMessage(userId, confirmationText(summary));
    await db.chatMessage.create({
      data: {
        appointmentId: appointment.id,
        direction: "OUT",
        type: "processChatMessage",
        body: confirmationText(summary),
      },
    });
  } else if (messageText === ChatChoice.CANCEL) {
    await db.$transaction([
      db.appointment.update({
        where: { id: appointment.id },
        data: { status: "CANCELLED", cancelledAt: new Date() },
      }),
      db.slot.update({
        where: { id: appointment.slotId },
        data: { status: "FREE" },
      }),
    ]);
    await sendProcessChatMessage(userId, cancellationText());
    await db.chatMessage.create({
      data: {
        appointmentId: appointment.id,
        direction: "OUT",
        type: "processChatMessage",
        body: cancellationText(),
      },
    });
  } else {
    await sendChoiceRequest(userId, "Bitte wählen Sie eine Option:", [
      ChatChoice.CONFIRM,
      ChatChoice.CANCEL,
    ]);
  }

  return NextResponse.json({ ok: true });
}
