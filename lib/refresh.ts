import { and, eq } from "drizzle-orm"

import { contextFor, getCredentialMap, type CredentialMap } from "@/lib/credentials"
import { db } from "@/lib/db"
import {
  bstatsChartSnapshots,
  downloadSnapshots,
  platformIdentifiers,
  refreshJobs,
  trackedPlugins,
  versionSnapshots,
} from "@/lib/db/schema"
import { platformMeta } from "@/lib/platforms"
import { providerAdapters } from "@/lib/providers"
import { bstatsAdapter } from "@/lib/providers/bstats"

export type RefreshOutcome = { status: "success" | "partial" | "failed"; message: string }

type Plugin = typeof trackedPlugins.$inferSelect

function reason(error: unknown) {
  return error instanceof Error ? error.message : "request failed"
}

/** Takes one snapshot of every linked platform. A failing platform never blocks the others. */
export async function refreshPlugin(plugin: Plugin, credentials?: CredentialMap): Promise<RefreshOutcome> {
  const startedAt = new Date()
  const keys = credentials ?? (await getCredentialMap(plugin.userId))
  const identifiers = await db.select().from(platformIdentifiers).where(eq(platformIdentifiers.pluginId, plugin.id))

  const failures: string[] = []
  let successes = 0

  await Promise.all(
    identifiers.map(async (identifier) => {
      const adapter = providerAdapters[identifier.platform]
      try {
        const context = contextFor(identifier.platform, keys)
        const [stats, versions] = await Promise.all([
          adapter.fetchDownloadStats(identifier.externalId, context),
          adapter.fetchVersions(identifier.externalId, context),
        ])

        await db.insert(downloadSnapshots).values({
          pluginId: plugin.id,
          platform: identifier.platform,
          downloads: stats.downloads,
          followers: stats.followers,
          rating: stats.rating,
        })

        // Versions are current state rather than history, so each refresh replaces them.
        await db
          .delete(versionSnapshots)
          .where(and(eq(versionSnapshots.pluginId, plugin.id), eq(versionSnapshots.platform, identifier.platform)))
        if (versions.length) {
          await db.insert(versionSnapshots).values(
            versions.slice(0, 20).map((version) => ({
              pluginId: plugin.id,
              platform: identifier.platform,
              version: version.version,
              downloads: version.downloads,
              releaseDate: version.releaseDate,
            }))
          )
        }
        successes += 1
      } catch (error) {
        failures.push(`${platformMeta[identifier.platform].label}: ${reason(error)}`)
      }
    })
  )

  if (plugin.bstatsPluginId) {
    try {
      const usage = await bstatsAdapter.fetchUsageStats(plugin.bstatsPluginId, {})
      if (usage.length) {
        await db.insert(bstatsChartSnapshots).values(usage.map((point) => ({ pluginId: plugin.id, ...point })))
      }
      successes += 1
    } catch (error) {
      failures.push(`bStats: ${reason(error)}`)
    }
  }

  const status = failures.length === 0 ? "success" : successes === 0 ? "failed" : "partial"
  const message = failures.length ? failures.join(" | ") : "All platforms refreshed."
  await db.insert(refreshJobs).values({
    userId: plugin.userId,
    pluginId: plugin.id,
    status,
    startedAt,
    finishedAt: new Date(),
    message,
  })

  return { status, message }
}

export async function refreshAllPlugins() {
  const plugins = await db.select().from(trackedPlugins)
  const credentialsByUser = new Map<string, CredentialMap>()
  const outcomes: Array<RefreshOutcome & { plugin: string }> = []

  // One plugin at a time keeps a large install inside the platforms' rate limits.
  for (const plugin of plugins) {
    if (!credentialsByUser.has(plugin.userId)) {
      credentialsByUser.set(plugin.userId, await getCredentialMap(plugin.userId))
    }
    const outcome = await refreshPlugin(plugin, credentialsByUser.get(plugin.userId))
    outcomes.push({ plugin: plugin.slug, ...outcome })
  }

  return outcomes
}
