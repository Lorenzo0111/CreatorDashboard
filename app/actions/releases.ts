"use server"

import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { failure, requireUser, type ActionResult } from "@/app/actions/session"
import { contextFor, getCredentialMap } from "@/lib/credentials"
import { db } from "@/lib/db"
import { platformIdentifiers, releases, releaseTargets, trackedPlugins } from "@/lib/db/schema"
import { providerAdapters } from "@/lib/providers"
import { platforms, releaseChannels, type Platform, type ReleaseArtifact, type ReleaseInput } from "@/lib/providers/types"

const MAX_ARTIFACT_BYTES = 100 * 1024 * 1024

const releaseSchema = z.object({
  pluginId: z.string().min(1),
  version: z.string().trim().min(1, "Enter a version."),
  title: z.string().trim(),
  channel: z.enum(releaseChannels),
  changelog: z.string().trim(),
  gameVersions: z.array(z.string()),
  loaders: z.array(z.string()),
  targets: z.array(z.enum(platforms)).min(1, "Pick at least one platform."),
  artifactUrl: z.union([z.literal(""), z.url({ protocol: /^https$/, error: "The file URL must start with https://." })]),
})

export type TargetOutcome = {
  platform: Platform
  status: "published" | "manual" | "failed"
  url?: string
  message?: string
}

function list(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(/[\s,]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

async function loadArtifact(file: FormDataEntryValue | null, url: string): Promise<ReleaseArtifact | undefined> {
  if (file instanceof File && file.size > 0) {
    return { name: file.name, data: file }
  }
  if (!url) return undefined

  const response = await fetch(url, { redirect: "follow" })
  if (!response.ok) throw new Error(`The file URL answered ${response.status} ${response.statusText}.`)
  const data = await response.blob()
  if (data.size > MAX_ARTIFACT_BYTES) throw new Error("That file is larger than 100 MB.")
  const name = decodeURIComponent(new URL(response.url).pathname.split("/").pop() || "plugin.jar")
  return { name, data, url }
}

/**
 * Publishes one release to the chosen platforms. This writes to third-party sites and cannot be
 * undone from here, so the form always asks for confirmation before calling it.
 */
export async function publishRelease(formData: FormData): Promise<ActionResult<{ outcomes: TargetOutcome[] }>> {
  const user = await requireUser()
  const parsed = releaseSchema.safeParse({
    pluginId: formData.get("pluginId"),
    version: formData.get("version"),
    title: formData.get("title") ?? "",
    channel: formData.get("channel"),
    changelog: formData.get("changelog") ?? "",
    gameVersions: list(formData.get("gameVersions")),
    loaders: formData.getAll("loaders").map(String),
    targets: formData.getAll("targets").map(String),
    artifactUrl: String(formData.get("artifactUrl") ?? "").trim(),
  })
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }
  const input = parsed.data

  try {
    const [plugin] = await db
      .select()
      .from(trackedPlugins)
      .where(and(eq(trackedPlugins.id, input.pluginId), eq(trackedPlugins.userId, user.id)))
      .limit(1)
    if (!plugin) return { ok: false, error: "That plugin no longer exists." }

    const identifiers = await db.select().from(platformIdentifiers).where(eq(platformIdentifiers.pluginId, plugin.id))
    const externalIds = new Map(identifiers.map((row) => [row.platform, row.externalId]))
    const unlinked = input.targets.find((platform) => !externalIds.has(platform) || !providerAdapters[platform].publish)
    if (unlinked) return { ok: false, error: `${unlinked} cannot be published to for this plugin.` }

    const artifact = await loadArtifact(formData.get("file"), input.artifactUrl)
    const needsFile = input.targets.find((platform) => providerAdapters[platform].publish!.needsArtifact)
    if (needsFile && !artifact) return { ok: false, error: "Attach a file or give a file URL." }

    const release: ReleaseInput = {
      version: input.version,
      title: input.title || `${plugin.name} ${input.version}`,
      changelog: input.changelog,
      channel: input.channel,
      gameVersions: input.gameVersions,
      loaders: input.loaders,
      artifact,
    }

    const record = {
      title: release.title,
      changelog: release.changelog,
      channel: release.channel,
      gameVersions: release.gameVersions,
      loaders: release.loaders,
      artifactName: artifact?.name ?? null,
      artifactUrl: artifact?.url ?? null,
    }
    const [saved] = await db
      .insert(releases)
      .values({ pluginId: plugin.id, version: release.version, ...record })
      .onConflictDoUpdate({ target: [releases.pluginId, releases.version], set: record })
      .returning()

    const credentials = await getCredentialMap(user.id)
    const outcomes = await Promise.all(
      input.targets.map(async (platform): Promise<TargetOutcome> => {
        try {
          const result = await providerAdapters[platform].publish!.run(
            externalIds.get(platform)!,
            release,
            contextFor(platform, credentials)
          )
          return { platform, ...result }
        } catch (error) {
          return { platform, status: "failed", message: failure(error, "Publishing failed.").error }
        }
      })
    )

    for (const outcome of outcomes) {
      const row = { status: outcome.status, url: outcome.url ?? null, message: outcome.message ?? null, updatedAt: new Date() }
      await db
        .insert(releaseTargets)
        .values({ releaseId: saved.id, platform: outcome.platform, ...row })
        .onConflictDoUpdate({ target: [releaseTargets.releaseId, releaseTargets.platform], set: row })
    }

    revalidatePath("/dashboard", "layout")
    return { ok: true, outcomes }
  } catch (error) {
    return failure(error, "The release could not be published.")
  }
}
