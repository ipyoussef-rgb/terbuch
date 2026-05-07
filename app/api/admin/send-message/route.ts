import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { sendPlainText } from "@/lib/kobil/chat-client";

const Body = z.object({
  appointmentId: z.string().min(1),
  text: z.string().min(1).max(2000),
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

  const a = await db.appointment.findUnique({
    where: { id: parsed.data.appointmentId },
    select: { id: true, email: true },
  });
  if (!a) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await sendPlainText(a.email, parsed.data.text);
  } catch (e) {
    console.error("[admin send] failed", e);
    return NextResponse.json(
      { error: "Mercury delivery failed" },
      { status: 502 },
    );
  }

  await db.chatMessage.create({
    data: {
      appointmentId: a.id,
      direction: "OUT",
      type: "plainText",
      body: parsed.data.text,
    },
  });

  return NextResponse.json({ ok: true });
}
