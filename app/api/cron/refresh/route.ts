import { timingSafeEqual } from "node:crypto"

import { ensureDatabase } from "@/lib/db/bootstrap"
import { refreshAllPlugins } from "@/lib/refresh"

export const maxDuration = 300

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const given = Buffer.from(request.headers.get("authorization") ?? "")
  const expected = Buffer.from(`Bearer ${secret}`)
  return given.length === expected.length && timingSafeEqual(given, expected)
}

// Vercel Cron calls this with "Authorization: Bearer $CRON_SECRET"; any other scheduler can do the same.
export async function GET(request: Request) {
  if (!authorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  await ensureDatabase()
  const outcomes = await refreshAllPlugins()
  return Response.json({ refreshed: outcomes.length, outcomes })
}
