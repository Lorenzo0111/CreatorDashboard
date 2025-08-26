import { NextResponse } from "next/server";
import { db } from "@/lib/mock/db";

interface Params { params: { id: string } }

export async function GET(_: Request, { params }: Params) {
  const stats = db.getStats(params.id);
  return NextResponse.json({ stats });
}