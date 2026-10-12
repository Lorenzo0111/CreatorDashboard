import { redirect } from "next/navigation"

import { getCurrentUser } from "@/lib/auth"
import { ensureDatabase } from "@/lib/db/bootstrap"

export type ActionResult<T = unknown> = ({ ok: true } & T) | { ok: false; error: string }

export async function requireUser() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  await ensureDatabase()
  return user
}

export function failure(error: unknown, fallback: string): { ok: false; error: string } {
  if (error instanceof Error && error.message) return { ok: false, error: error.message }
  return { ok: false, error: fallback }
}
