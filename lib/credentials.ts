import { eq } from "drizzle-orm"

import { decryptSecret } from "@/lib/crypto"
import { db } from "@/lib/db"
import { encryptedCredentials } from "@/lib/db/schema"
import type { CredentialKey, Platform, ProviderContext } from "@/lib/providers/types"

export type CredentialMap = Map<CredentialKey, string>

export async function getCredentialMap(userId: string): Promise<CredentialMap> {
  const rows = await db.select().from(encryptedCredentials).where(eq(encryptedCredentials.userId, userId))
  const map: CredentialMap = new Map()
  for (const row of rows) {
    try {
      map.set(row.platform, decryptSecret(row.encryptedValue))
    } catch {
      // An undecryptable credential is treated as missing; the provider then reports what it needs.
    }
  }
  return map
}

export function contextFor(platform: Platform, credentials: CredentialMap): ProviderContext {
  return {
    apiKey: credentials.get(platform),
    uploadKey: platform === "curseforge" ? credentials.get("curseforge-upload") : undefined,
  }
}
