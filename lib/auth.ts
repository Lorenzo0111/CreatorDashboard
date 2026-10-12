import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { APIError } from "better-auth/api"
import { count } from "drizzle-orm"
import { headers } from "next/headers"
import { cache } from "react"

import { db } from "@/lib/db"
import { ensureDatabase } from "@/lib/db/bootstrap"
import * as schema from "@/lib/db/schema"

/** This is a single-owner install: whoever signs up first owns it, and sign-up closes after that. */
export async function hasOwner() {
  await ensureDatabase()
  const [row] = await db.select({ total: count() }).from(schema.user)
  return row.total > 0
}

export const auth = betterAuth({
  appName: "Creator Dashboard",
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  secret:
    process.env.BETTER_AUTH_SECRET ??
    "development-only-creator-dashboard-secret-change-me-before-deploying",
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  databaseHooks: {
    user: {
      create: {
        before: async () => {
          if (await hasOwner()) {
            throw new APIError("FORBIDDEN", { message: "This dashboard already has an owner. Sign in instead." })
          }
        },
      },
    },
  },
})

export const getSession = cache(async () => {
  await ensureDatabase()
  return auth.api.getSession({
    headers: await headers(),
  })
})

export async function getCurrentUser() {
  const session = await getSession()
  return session?.user ?? null
}
