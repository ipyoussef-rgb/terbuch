import { NextRequest, NextResponse } from "next/server";
import { generateSlots } from "@/lib/slots";

function isAuthorized(req: NextRequest): boolean {
  // Vercel Cron sets Authorization: Bearer <CRON_SECRET>
  const auth = req.headers.get("authorization");
  if (auth && process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`) {
    return true;
  }
  if (process.env.NODE_ENV !== "production") return true;
  return false;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await generateSlots();
  return NextResponse.json({ ok: true, ...result });
}

export async function POST(req: NextRequest) {
  return GET(req);
}
