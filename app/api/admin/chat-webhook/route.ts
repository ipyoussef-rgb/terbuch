import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Vercel Hobby allows up to 60s when explicitly configured (default 10s).
// Token + Mercury calls can take 5-10s combined.
export const maxDuration = 60;
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
    from?: { userId?: string; [k: string]: unknown };
    content?: {
      messageType?: string;
      messageContent?: {
        messageText?: string;
        choices?: { text: string }[];
      };
    };
    [k: string]: unknown;
  };
  [k: string]: unknown;
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
    console.warn("[webhook] rejected: secret mismatch");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawBody = await req.text();
  console.log(`[webhook] inbound payload (${rawBody.length} bytes): ${rawBody.slice(0, 1500)}`);

  let dto: CallbackDto | null;
  try {
    dto = rawBody ? (JSON.parse(rawBody) as CallbackDto) : null;
  } catch {
    console.warn("[webhook] could not parse JSON body");
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const userId = dto?.message?.from?.userId;
  const messageType = dto?.message?.content?.messageType;
  const messageText = dto?.message?.content?.messageContent?.messageText;

  console.log(
    `[webhook] parsed userId=${userId} messageType=${messageType} messageText=${JSON.stringify(messageText)}`,
  );

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  // KOBIL Mercury identifies recipients by username/email, but OIDC stored
  // the `sub` as kobilSub. Try both: email first (case-insensitive), then sub.
  let appointment = await db.appointment.findFirst({
    where: {
      OR: [{ email: { equals: userId, mode: "insensitive" } }, { kobilSub: userId }],
    },
    orderBy: { createdAt: "desc" },
    include: {
      slot: { include: { office: true, service: true } },
      serviceOption: true,
      messages: { take: 1 },
    },
  });

  // Fallback: if no exact match, take the most recent PENDING appointment from
  // the last 30 minutes — KOBIL Chat may use a different identifier than the
  // OIDC `sub` we stored. We re-bind the appointment to this chat userId so
  // future webhook calls match by primary lookup.
  if (!appointment && messageType === "init") {
    const since = new Date(Date.now() - 30 * 60 * 1000);
    const recent = await db.appointment.findFirst({
      where: { status: "PENDING", createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      include: {
        slot: { include: { office: true, service: true } },
        serviceOption: true,
        messages: { take: 1 },
      },
    });
    if (recent) {
      console.log(
        `[webhook] no kobilSub match for ${userId}; rebinding most-recent PENDING appointment ${recent.id} (was kobilSub=${recent.kobilSub})`,
      );
      await db.appointment.update({
        where: { id: recent.id },
        data: { kobilSub: userId },
      });
      appointment = { ...recent, kobilSub: userId };
    }
  }

  if (!appointment) {
    console.log(`[webhook] no appointment found for userId=${userId}; sending fallback`);
    if (messageType === "init") {
      await sendPlainText(
        userId,
        "Hallo! Sie haben aktuell keine offene Reservierung in unserer App.",
      );
    }
    return NextResponse.json({ ok: true });
  }

  console.log(
    `[webhook] matched appointment ${appointment.id} status=${appointment.status}`,
  );

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
