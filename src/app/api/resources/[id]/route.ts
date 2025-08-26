import { NextResponse } from "next/server";
import { db } from "@/lib/mock/db";

interface Params { params: { id: string } }

export async function GET(_: Request, { params }: Params) {
  const r = db.getResource(params.id);
  if (!r) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(r);
}

export async function PATCH(req: Request, { params }: Params) {
  const body = await req.json();
  const r = db.updateResource(params.id, { description: body.description });
  if (!r) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(r);
}