"use server"

import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { failure, requireUser, type ActionResult } from "@/app/actions/session"
import { contextFor, getCredentialMap } from "@/lib/credentials"
import { db } from "@/lib/db"
import { platformIdentifiers, trackedPlugins } from "@/lib/db/schema"
import { providerAdapters } from "@/lib/providers"
import { platforms, type Platform } from "@/lib/providers/types"
import { refreshAllPlugins, refreshPlugin, type RefreshOutcome } from "@/lib/refresh"

const identifier = z.string().trim().max(200)

const pluginSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Give the plugin a name."),
  slug: z
    .string()
    .trim()
    .min(2, "Give the plugin a slug.")
    .regex(/^[a-z0-9][a-z0-9-]*$/, "Slugs use lowercase letters, numbers and dashes."),
  description: z.string().trim().max(300).optional(),
  bstatsPluginId: z
    .string()
    .trim()
    .regex(/^\d*$/, "The bStats ID is a number.")
    .optional(),
  identifiers: z.object(Object.fromEntries(platforms.map((platform) => [platform, identifier.optional()])) as Record<
    Platform,
    z.ZodOptional<typeof identifier>
  >),
})

export type PluginInput = z.input<typeof pluginSchema>

async function ownedPlugin(userId: string, pluginId: string) {
  const [plugin] = await db
    .select()
    .from(trackedPlugins)
    .where(and(eq(trackedPlugins.id, pluginId), eq(trackedPlugins.userId, userId)))
    .limit(1)
  return plugin
}

export async function savePlugin(input: PluginInput): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser()
  const parsed = pluginSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }

  const { id, identifiers, ...fields } = parsed.data
  const values = {
    name: fields.name,
    slug: fields.slug,
    description: fields.description || null,
    bstatsPluginId: fields.bstatsPluginId || null,
  }

  try {
    let plugin
    if (id) {
      if (!(await ownedPlugin(user.id, id))) return { ok: false, error: "That plugin no longer exists." }
      ;[plugin] = await db
        .update(trackedPlugins)
        .set({ ...values, updatedAt: new Date() })
        .where(eq(trackedPlugins.id, id))
        .returning()
    } else {
      ;[plugin] = await db.insert(trackedPlugins).values({ userId: user.id, ...values }).returning()
    }

    for (const platform of platforms) {
      const externalId = identifiers[platform]
      const match = and(eq(platformIdentifiers.pluginId, plugin.id), eq(platformIdentifiers.platform, platform))
      if (!externalId) {
        await db.delete(platformIdentifiers).where(match)
        continue
      }
      await db
        .insert(platformIdentifiers)
        .values({ pluginId: plugin.id, platform, externalId, publicUrl: providerAdapters[platform].publicUrl(externalId) })
        .onConflictDoUpdate({
          target: [platformIdentifiers.pluginId, platformIdentifiers.platform],
          set: { externalId, publicUrl: providerAdapters[platform].publicUrl(externalId) },
        })
    }

    // A first snapshot straight away, so the plugin page is never empty after saving.
    await refreshPlugin(plugin)
    revalidatePath("/dashboard", "layout")
    return { ok: true, id: plugin.id }
  } catch (error) {
    return failure(error, "The plugin could not be saved.")
  }
}

export async function deletePlugin(pluginId: string): Promise<ActionResult> {
  const user = await requireUser()
  if (!(await ownedPlugin(user.id, pluginId))) return { ok: false, error: "That plugin no longer exists." }
  await db.delete(trackedPlugins).where(eq(trackedPlugins.id, pluginId))
  revalidatePath("/dashboard", "layout")
  return { ok: true }
}

export async function refreshPluginStats(pluginId: string): Promise<ActionResult<RefreshOutcome>> {
  const user = await requireUser()
  const plugin = await ownedPlugin(user.id, pluginId)
  if (!plugin) return { ok: false, error: "That plugin no longer exists." }
  const outcome = await refreshPlugin(plugin)
  revalidatePath("/dashboard", "layout")
  return { ok: true, ...outcome }
}

export async function refreshAllStats(): Promise<ActionResult<{ failed: number; total: number }>> {
  await requireUser()
  const outcomes = await refreshAllPlugins()
  revalidatePath("/dashboard", "layout")
  return { ok: true, total: outcomes.length, failed: outcomes.filter((outcome) => outcome.status !== "success").length }
}

/** Looks a project up on a platform so the add form can fill in the name and summary. */
export async function lookupProject(
  platform: Platform,
  externalId: string
): Promise<ActionResult<{ name: string; description: string | null }>> {
  const user = await requireUser()
  if (!platforms.includes(platform) || !externalId.trim()) return { ok: false, error: "Enter an ID first." }
  try {
    const credentials = await getCredentialMap(user.id)
    const project = await providerAdapters[platform].fetchProject(externalId.trim(), contextFor(platform, credentials))
    return { ok: true, name: project.name, description: project.description ?? null }
  } catch (error) {
    return failure(error, "Nothing found for that ID.")
  }
}
