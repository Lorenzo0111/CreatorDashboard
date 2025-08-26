import { NextResponse } from "next/server";
import { db } from "@/lib/mock/db";

interface Params { params: { id: string } }

export async function POST(req: Request, { params }: Params) {
  const body = await req.json();
  const version = body.version || "0.0.0";
  const r = db.addRelease(params.id, version);
  if (!r) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(r);
}