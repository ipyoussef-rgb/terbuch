import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

const Body = z.object({
  status: z.enum(["FREE", "BLOCKED"]),
});

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSession("admin");
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const slot = await db.slot.findUnique({ where: { id } });
  if (!slot) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (slot.status === "PENDING" || slot.status === "BOOKED") {
    return NextResponse.json(
      { error: "Slot has an appointment" },
      { status: 409 },
    );
  }

  await db.slot.update({
    where: { id },
    data: { status: parsed.data.status },
  });
  return NextResponse.json({ ok: true });
}
