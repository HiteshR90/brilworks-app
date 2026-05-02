import { NextResponse } from "next/server";
import { getHealth } from "@/lib/health";

export const dynamic = "force-static";

export function GET() {
  return NextResponse.json(getHealth());
}
