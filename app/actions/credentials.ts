"use server"

import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { failure, requireUser, type ActionResult } from "@/app/actions/session"
import { encryptSecret } from "@/lib/crypto"
import { db } from "@/lib/db"
import { encryptedCredentials } from "@/lib/db/schema"
import { credentialMeta } from "@/lib/platforms"
import { credentialKeys, type CredentialKey } from "@/lib/providers/types"

const keySchema = z.enum(credentialKeys)

export async function saveCredential(key: CredentialKey, value: string): Promise<ActionResult> {
  const user = await requireUser()
  const parsedKey = keySchema.safeParse(key)
  const secret = value.trim()
  if (!parsedKey.success) return { ok: false, error: "Unknown credential." }
  if (secret.length < 8) return { ok: false, error: "That key looks too short." }

  try {
    const row = { encryptedValue: encryptSecret(secret), label: credentialMeta[parsedKey.data].label, updatedAt: new Date() }
    await db
      .insert(encryptedCredentials)
      .values({ userId: user.id, platform: parsedKey.data, ...row })
      .onConflictDoUpdate({ target: [encryptedCredentials.userId, encryptedCredentials.platform], set: row })
    revalidatePath("/dashboard", "layout")
    return { ok: true }
  } catch (error) {
    return failure(error, "The key could not be saved.")
  }
}

export async function deleteCredential(key: CredentialKey): Promise<ActionResult> {
  const user = await requireUser()
  const parsedKey = keySchema.safeParse(key)
  if (!parsedKey.success) return { ok: false, error: "Unknown credential." }
  await db
    .delete(encryptedCredentials)
    .where(and(eq(encryptedCredentials.userId, user.id), eq(encryptedCredentials.platform, parsedKey.data)))
  revalidatePath("/dashboard", "layout")
  return { ok: true }
}
