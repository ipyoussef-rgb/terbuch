import { NextRequest, NextResponse } from "next/server";
import { clearSession } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  await clearSession("user");
  return NextResponse.redirect(new URL("/", req.url));
}

export async function GET(req: NextRequest) {
  await clearSession("user");
  return NextResponse.redirect(new URL("/", req.url));
}
