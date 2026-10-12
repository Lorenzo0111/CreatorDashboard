import { createClient } from "@libsql/client"
import { drizzle } from "drizzle-orm/libsql"
import { mkdirSync } from "node:fs"
import { dirname, resolve } from "node:path"

import * as schema from "@/lib/db/schema"

const url = process.env.DATABASE_URL ?? "file:./data/creator-dashboard.db"

if (url.startsWith("file:")) {
  const filePath = url.replace("file:", "")
  mkdirSync(dirname(resolve(filePath)), { recursive: true })
}

export const client = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN })
export const db = drizzle(client, { schema })
export type Db = typeof db
