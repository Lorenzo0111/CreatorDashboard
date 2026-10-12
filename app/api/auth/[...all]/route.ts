import { toNextJsHandler } from "better-auth/next-js"

import { auth } from "@/lib/auth"
import { ensureDatabase } from "@/lib/db/bootstrap"

const handlers = toNextJsHandler(auth)

export async function GET(request: Request) {
  await ensureDatabase()
  return handlers.GET(request)
}

export async function POST(request: Request) {
  await ensureDatabase()
  return handlers.POST(request)
}
