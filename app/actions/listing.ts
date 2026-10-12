"use server"

import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { failure, requireUser, type ActionResult } from "@/app/actions/session"
import { contextFor, getCredentialMap } from "@/lib/credentials"
import { db } from "@/lib/db"
import { listingSyncs, platformIdentifiers, trackedPlugins } from "@/lib/db/schema"
import { providerAdapters } from "@/lib/providers"
import { platforms, type ListingInput, type Platform } from "@/lib/providers/types"

const listingSchema = z.object({
  pluginId: z.string().min(1),
  summary: z.string().trim().max(300, "Keep the summary under 300 characters."),
  body: z.string(),
  targets: z.array(z.enum(platforms)),
})

export type ListingOutcome = { platform: Platform; status: "synced" | "failed"; message?: string }

async function ownedIdentifiers(userId: string, pluginId: string) {
  const [plugin] = await db
    .select()
    .from(trackedPlugins)
    .where(and(eq(trackedPlugins.id, pluginId), eq(trackedPlugins.userId, userId)))
    .limit(1)
  if (!plugin) return null
  const identifiers = await db.select().from(platformIdentifiers).where(eq(platformIdentifiers.pluginId, pluginId))
  return new Map(identifiers.map((row) => [row.platform, row.externalId]))
}

/**
 * Saves the listing here and, for every platform in `targets`, overwrites the live listing there.
 * With no targets it only saves the draft.
 */
export async function saveListing(input: z.input<typeof listingSchema>): Promise<ActionResult<{ outcomes: ListingOutcome[] }>> {
  const user = await requireUser()
  const parsed = listingSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }
  const { pluginId, summary, body, targets } = parsed.data

  try {
    const externalIds = await ownedIdentifiers(user.id, pluginId)
    if (!externalIds) return { ok: false, error: "That plugin no longer exists." }

    await db
      .update(trackedPlugins)
      .set({ description: summary || null, longDescription: body || null, updatedAt: new Date() })
      .where(eq(trackedPlugins.id, pluginId))

    const credentials = await getCredentialMap(user.id)
    const outcomes = await Promise.all(
      targets.map(async (platform): Promise<ListingOutcome> => {
        const capability = providerAdapters[platform].listing
        const externalId = externalIds.get(platform)
        if (!capability || !externalId) return { platform, status: "failed", message: "Not linked for this plugin." }

        // Only send fields that have content, so an empty draft never blanks a live listing.
        const listing: ListingInput = {}
        if (capability.fields.includes("summary") && summary) listing.summary = summary
        if (capability.fields.includes("body") && body.trim()) listing.body = body
        if (!Object.keys(listing).length) return { platform, status: "failed", message: "Nothing to send: the fields it accepts are empty." }

        try {
          await capability.run(externalId, listing, contextFor(platform, credentials))
          return { platform, status: "synced" }
        } catch (error) {
          return { platform, status: "failed", message: failure(error, "Sync failed.").error }
        }
      })
    )

    for (const outcome of outcomes) {
      const row = { status: outcome.status, message: outcome.message ?? null, syncedAt: new Date() }
      await db
        .insert(listingSyncs)
        .values({ pluginId, platform: outcome.platform, ...row })
        .onConflictDoUpdate({ target: [listingSyncs.pluginId, listingSyncs.platform], set: row })
    }

    revalidatePath("/dashboard", "layout")
    return { ok: true, outcomes }
  } catch (error) {
    return failure(error, "The listing could not be saved.")
  }
}

export async function importListing(pluginId: string, platform: Platform): Promise<ActionResult<{ listing: ListingInput }>> {
  const user = await requireUser()
  try {
    const externalIds = await ownedIdentifiers(user.id, pluginId)
    const externalId = externalIds?.get(platform)
    const read = providerAdapters[platform]?.listing?.read
    if (!externalId || !read) return { ok: false, error: "That platform has nothing to import." }
    const credentials = await getCredentialMap(user.id)
    return { ok: true, listing: await read(externalId, contextFor(platform, credentials)) }
  } catch (error) {
    return failure(error, "The listing could not be imported.")
  }
}
