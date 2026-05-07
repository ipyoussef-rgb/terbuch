import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const session = await getSession("user");
  if (!session || session.role !== "user") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const a = await db.appointment.findUnique({
    where: { id },
    select: { id: true, status: true, kobilSub: true },
  });
  if (!a || a.kobilSub !== session.user.sub) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ id: a.id, status: a.status });
}
