import { and, asc, desc, eq, inArray } from "drizzle-orm"

import { db } from "@/lib/db"
import { ensureDatabase } from "@/lib/db/bootstrap"
import {
  bstatsChartSnapshots,
  downloadSnapshots,
  encryptedCredentials,
  listingSyncs,
  platformIdentifiers,
  refreshJobs,
  releases,
  releaseTargets,
  trackedPlugins,
  versionSnapshots,
} from "@/lib/db/schema"
import { platforms, type CredentialKey, type Platform } from "@/lib/providers/types"

const DAY = 86_400_000
export const HISTORY_DAYS = 90

export type Delta = {
  value: number
  /** False when snapshots do not reach back the whole window; `since` then says how far they do. */
  complete: boolean
  since: Date
}

export type PlatformStats = {
  platform: Platform
  externalId: string
  downloads: number | null
  followers: number | null
  /** Average rating out of 5. */
  rating: number | null
  delta7: Delta | null
  latestVersion: string | null
  latestVersionDate: Date | null
  /** True when another platform already has a newer version. */
  behind: boolean
  capturedAt: Date | null
}

export type DailyPoint = { date: string } & Partial<Record<Platform, number>>

export type PluginStats = {
  id: string
  name: string
  slug: string
  description: string | null
  longDescription: string | null
  bstatsPluginId: string | null
  totalDownloads: number
  delta7: Delta | null
  delta30: Delta | null
  servers: number | null
  players: number | null
  newestVersion: string | null
  platforms: PlatformStats[]
  daily: DailyPoint[]
  lastRefresh: { status: "success" | "partial" | "failed"; message: string | null; at: Date } | null
}

export type VersionRow = { platform: Platform; version: string; downloads: number | null; releaseDate: Date | null }

type Series = Array<typeof downloadSnapshots.$inferSelect>

/**
 * Running total at a point in time. Between two snapshots the total is interpolated, so a long gap
 * in snapshots is not counted as if it all happened after the gap.
 */
function totalAt(series: Series, time: number) {
  const after = series.findIndex((snapshot) => snapshot.capturedAt.getTime() > time)
  if (after === 0) return null
  if (after === -1) return series[series.length - 1].downloads

  const from = series[after - 1]
  const to = series[after]
  const progress = (time - from.capturedAt.getTime()) / (to.capturedAt.getTime() - from.capturedAt.getTime())
  return from.downloads + (to.downloads - from.downloads) * progress
}

function deltaOver(seriesList: Series[], days: number, now: number): Delta | null {
  const active = seriesList.filter((series) => series.length > 0)
  // One snapshot says nothing about change.
  if (!active.some((series) => series.length > 1)) return null

  const start = now - days * DAY
  let value = 0
  let since = now
  for (const series of active) {
    const base = totalAt(series, start) ?? series[0].downloads
    value += series[series.length - 1].downloads - base
    since = Math.min(since, Math.max(start, series[0].capturedAt.getTime()))
  }

  return { value: Math.round(value), complete: since <= start, since: new Date(since) }
}

function dayKey(time: number) {
  return new Date(time).toISOString().slice(0, 10)
}

/**
 * New downloads per day. Platforms only report running totals, so a gap between two snapshots is
 * spread evenly over the days it covers.
 */
function dailyDownloads(byPlatform: Map<Platform, Series>, now: number): DailyPoint[] {
  const today = Math.floor(now / DAY)
  const days = Array.from({ length: HISTORY_DAYS }, (_, index) => today - (HISTORY_DAYS - 1 - index))
  const points = new Map<number, DailyPoint>(days.map((day) => [day, { date: dayKey(day * DAY) }]))

  for (const [platform, series] of byPlatform) {
    for (let index = 1; index < series.length; index++) {
      const from = series[index - 1]
      const to = series[index]
      const gained = Math.max(0, to.downloads - from.downloads)
      const fromTime = from.capturedAt.getTime()
      const span = to.capturedAt.getTime() - fromTime
      if (span <= 0) continue

      const firstDay = Math.floor(fromTime / DAY)
      const lastDay = Math.floor(to.capturedAt.getTime() / DAY)
      for (let day = Math.max(firstDay, days[0]); day <= lastDay; day++) {
        const point = points.get(day)
        if (!point) continue
        const overlap = Math.min((day + 1) * DAY, to.capturedAt.getTime()) - Math.max(day * DAY, fromTime)
        point[platform] = (point[platform] ?? 0) + (gained * overlap) / span
      }
    }
  }

  return days.map((day) => {
    const point = points.get(day)!
    for (const platform of platforms) {
      if (point[platform] !== undefined) point[platform] = Math.round(point[platform]!)
    }
    return point
  })
}

/** Platforms format versions differently ("v2.1.4", "MyPlugin 2.1.4"), so compare the numeric part. */
export function normalizeVersion(version: string) {
  return version.match(/\d+(?:\.\d+)+(?:[-+][\w.]+)?/)?.[0] ?? version.trim().toLowerCase()
}

function groupBy<T, K>(items: T[], key: (item: T) => K) {
  const groups = new Map<K, T[]>()
  for (const item of items) {
    const group = groups.get(key(item))
    if (group) group.push(item)
    else groups.set(key(item), [item])
  }
  return groups
}

export async function getPluginStats(userId: string, pluginId?: string): Promise<PluginStats[]> {
  await ensureDatabase()
  const plugins = await db
    .select()
    .from(trackedPlugins)
    .where(pluginId ? and(eq(trackedPlugins.userId, userId), eq(trackedPlugins.id, pluginId)) : eq(trackedPlugins.userId, userId))
    .orderBy(asc(trackedPlugins.name))
  if (!plugins.length) return []

  const ids = plugins.map((plugin) => plugin.id)
  const [identifiers, snapshots, versions, usage, jobs] = await Promise.all([
    db.select().from(platformIdentifiers).where(inArray(platformIdentifiers.pluginId, ids)),
    db.select().from(downloadSnapshots).where(inArray(downloadSnapshots.pluginId, ids)).orderBy(asc(downloadSnapshots.capturedAt)),
    db.select().from(versionSnapshots).where(inArray(versionSnapshots.pluginId, ids)),
    db.select().from(bstatsChartSnapshots).where(inArray(bstatsChartSnapshots.pluginId, ids)).orderBy(desc(bstatsChartSnapshots.capturedAt)),
    db.select().from(refreshJobs).where(inArray(refreshJobs.pluginId, ids)).orderBy(desc(refreshJobs.startedAt)),
  ])

  const now = Date.now()
  const identifiersByPlugin = groupBy(identifiers, (row) => row.pluginId)
  const snapshotsByPlugin = groupBy(snapshots, (row) => row.pluginId)
  const versionsByPlugin = groupBy(versions, (row) => row.pluginId)
  const usageByPlugin = groupBy(usage, (row) => row.pluginId)
  const jobsByPlugin = groupBy(jobs, (row) => row.pluginId)

  return plugins.map((plugin) => {
    const linked = (identifiersByPlugin.get(plugin.id) ?? []).sort(
      (a, b) => platforms.indexOf(a.platform) - platforms.indexOf(b.platform)
    )
    const linkedPlatforms = new Set(linked.map((row) => row.platform))
    const seriesByPlatform = groupBy(
      (snapshotsByPlugin.get(plugin.id) ?? []).filter((row) => linkedPlatforms.has(row.platform)),
      (row) => row.platform
    )

    const latestVersions = new Map<Platform, VersionRow>()
    for (const row of versionsByPlugin.get(plugin.id) ?? []) {
      const current = latestVersions.get(row.platform)
      if (!current || (row.releaseDate?.getTime() ?? 0) > (current.releaseDate?.getTime() ?? 0)) {
        latestVersions.set(row.platform, row)
      }
    }
    const newest = [...latestVersions.values()].sort(
      (a, b) => (b.releaseDate?.getTime() ?? 0) - (a.releaseDate?.getTime() ?? 0)
    )[0]
    const newestVersion = newest ? normalizeVersion(newest.version) : null

    const platformStats: PlatformStats[] = linked.map((identifier) => {
      const series = seriesByPlatform.get(identifier.platform) ?? []
      const latest = series.at(-1)
      const version = latestVersions.get(identifier.platform)
      return {
        platform: identifier.platform,
        externalId: identifier.externalId,
        downloads: latest?.downloads ?? null,
        followers: latest?.followers ?? null,
        rating: latest?.rating ? latest.rating / 100 : null,
        delta7: deltaOver([series], 7, now),
        latestVersion: version?.version ?? null,
        latestVersionDate: version?.releaseDate ?? null,
        behind: Boolean(version && newestVersion && normalizeVersion(version.version) !== newestVersion),
        capturedAt: latest?.capturedAt ?? null,
      }
    })

    const allSeries = [...seriesByPlatform.values()]
    const usageRows = usageByPlugin.get(plugin.id) ?? []
    const job = jobsByPlugin.get(plugin.id)?.[0]

    return {
      id: plugin.id,
      name: plugin.name,
      slug: plugin.slug,
      description: plugin.description,
      longDescription: plugin.longDescription,
      bstatsPluginId: plugin.bstatsPluginId,
      totalDownloads: platformStats.reduce((sum, row) => sum + (row.downloads ?? 0), 0),
      delta7: deltaOver(allSeries, 7, now),
      delta30: deltaOver(allSeries, 30, now),
      servers: usageRows.find((row) => row.chartId === "servers")?.value ?? null,
      players: usageRows.find((row) => row.chartId === "players")?.value ?? null,
      newestVersion: newest?.version ?? null,
      platforms: platformStats,
      daily: dailyDownloads(seriesByPlatform, now),
      lastRefresh: job ? { status: job.status, message: job.message, at: job.finishedAt ?? job.startedAt } : null,
    }
  })
}

export async function getPlugin(userId: string, pluginId: string) {
  const [plugin] = await getPluginStats(userId, pluginId)
  return plugin ?? null
}

export function sumDeltas(deltas: Array<Delta | null>): Delta | null {
  const present = deltas.filter((delta): delta is Delta => delta !== null)
  if (!present.length) return null
  return {
    value: present.reduce((sum, delta) => sum + delta.value, 0),
    complete: present.every((delta) => delta.complete),
    since: new Date(Math.max(...present.map((delta) => delta.since.getTime()))),
  }
}

export function mergeDaily(plugins: PluginStats[]): DailyPoint[] {
  const merged = new Map<string, DailyPoint>()
  for (const plugin of plugins) {
    for (const point of plugin.daily) {
      const target = merged.get(point.date) ?? { date: point.date }
      for (const platform of platforms) {
        if (point[platform] !== undefined) target[platform] = (target[platform] ?? 0) + point[platform]!
      }
      merged.set(point.date, target)
    }
  }
  return [...merged.values()].sort((a, b) => a.date.localeCompare(b.date))
}

export async function getVersions(pluginId: string): Promise<VersionRow[]> {
  const rows = await db.select().from(versionSnapshots).where(eq(versionSnapshots.pluginId, pluginId))
  return rows.sort((a, b) => (b.releaseDate?.getTime() ?? 0) - (a.releaseDate?.getTime() ?? 0))
}

export type ReleaseWithTargets = typeof releases.$inferSelect & {
  targets: Array<typeof releaseTargets.$inferSelect>
}

export async function getReleases(pluginId: string): Promise<ReleaseWithTargets[]> {
  const rows = await db.select().from(releases).where(eq(releases.pluginId, pluginId)).orderBy(desc(releases.createdAt))
  if (!rows.length) return []
  const targets = await db
    .select()
    .from(releaseTargets)
    .where(inArray(releaseTargets.releaseId, rows.map((row) => row.id)))
  const byRelease = groupBy(targets, (row) => row.releaseId)
  return rows.map((row) => ({
    ...row,
    targets: (byRelease.get(row.id) ?? []).sort((a, b) => platforms.indexOf(a.platform) - platforms.indexOf(b.platform)),
  }))
}

export async function getListingSyncs(pluginId: string) {
  const rows = await db.select().from(listingSyncs).where(eq(listingSyncs.pluginId, pluginId))
  return new Map(rows.map((row) => [row.platform, row]))
}

export async function getSavedCredentials(userId: string) {
  await ensureDatabase()
  const rows = await db
    .select({ key: encryptedCredentials.platform, updatedAt: encryptedCredentials.updatedAt })
    .from(encryptedCredentials)
    .where(eq(encryptedCredentials.userId, userId))
  return new Map<CredentialKey, Date>(rows.map((row) => [row.key, row.updatedAt]))
}

export type ActivityItem = {
  id: string
  kind: "refresh" | "release"
  pluginId: string | null
  pluginName: string
  status: "success" | "partial" | "failed"
  title: string
  detail: string | null
  at: Date
}

export async function getActivity(userId: string, limit = 8): Promise<ActivityItem[]> {
  await ensureDatabase()
  const [jobs, published] = await Promise.all([
    db
      .select({ job: refreshJobs, pluginName: trackedPlugins.name })
      .from(refreshJobs)
      .innerJoin(trackedPlugins, eq(refreshJobs.pluginId, trackedPlugins.id))
      .where(eq(refreshJobs.userId, userId))
      .orderBy(desc(refreshJobs.startedAt))
      .limit(limit),
    db
      .select({ release: releases, pluginName: trackedPlugins.name })
      .from(releases)
      .innerJoin(trackedPlugins, eq(releases.pluginId, trackedPlugins.id))
      .where(eq(trackedPlugins.userId, userId))
      .orderBy(desc(releases.createdAt))
      .limit(limit),
  ])

  const targets = published.length
    ? await db
        .select()
        .from(releaseTargets)
        .where(inArray(releaseTargets.releaseId, published.map((row) => row.release.id)))
    : []
  const targetsByRelease = groupBy(targets, (row) => row.releaseId)

  const items: ActivityItem[] = [
    ...jobs.map(({ job, pluginName }) => ({
      id: job.id,
      kind: "refresh" as const,
      pluginId: job.pluginId,
      pluginName,
      status: job.status,
      title: "Stats refreshed",
      detail: job.status === "success" ? null : job.message,
      at: job.finishedAt ?? job.startedAt,
    })),
    ...published.map(({ release, pluginName }) => {
      const rows = targetsByRelease.get(release.id) ?? []
      const failed = rows.filter((row) => row.status === "failed").length
      return {
        id: release.id,
        kind: "release" as const,
        pluginId: release.pluginId,
        pluginName,
        status: failed === 0 ? ("success" as const) : failed === rows.length ? ("failed" as const) : ("partial" as const),
        title: `Published ${release.version}`,
        detail: rows.length ? `${rows.length - failed} of ${rows.length} platforms` : null,
        at: release.createdAt,
      }
    }),
  ]

  return items.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, limit)
}
