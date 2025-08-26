import { NextResponse } from "next/server";
import { db } from "@/lib/mock/db";

export async function GET() {
  return NextResponse.json({ resources: db.listResources() });
}

export async function POST() {
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}