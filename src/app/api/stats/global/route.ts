import { NextResponse } from "next/server";
import { db } from "@/lib/mock/db";

export async function GET() {
  return NextResponse.json({ stats: db.getGlobalStats() });
}