import { fetchJson } from "@/lib/providers/http"
import type { UsageAdapter } from "@/lib/providers/types"

const API = "https://bstats.org/api/v1"
const USAGE_CHARTS = ["servers", "players"] as const

type BStatsPoint = [timestamp: number, value: number]

export const bstatsAdapter: UsageAdapter = {
  async fetchUsageStats(pluginId) {
    const points = await Promise.all(
      USAGE_CHARTS.map(async (chartId) => {
        const data = await fetchJson<BStatsPoint[]>(`${API}/plugins/${pluginId}/charts/${chartId}/data?maxElements=1`)
        return { chartId, label: chartId === "servers" ? "Servers" : "Players", value: Number(data.at(-1)?.[1] ?? 0) }
      })
    )
    return points.filter((point) => Number.isFinite(point.value))
  },
}

export type UsageHistoryPoint = { date: string; servers: number; players: number }

/** bStats keeps its own history at 30-minute resolution, so it is read live instead of snapshotted. */
export async function fetchUsageHistory(pluginId: string, days: number): Promise<UsageHistoryPoint[]> {
  const [servers, players] = await Promise.all(
    USAGE_CHARTS.map((chartId) =>
      fetchJson<BStatsPoint[]>(`${API}/plugins/${pluginId}/charts/${chartId}/data?maxElements=${days * 48}`, {
        next: { revalidate: 3600 },
      })
    )
  )

  // Daily peak: a server count dips overnight, and the peak is what creators compare.
  const byDay = new Map<string, UsageHistoryPoint>()
  const fold = (series: BStatsPoint[], key: "servers" | "players") => {
    for (const [timestamp, value] of series) {
      const date = new Date(timestamp).toISOString().slice(0, 10)
      const day = byDay.get(date) ?? { date, servers: 0, players: 0 }
      day[key] = Math.max(day[key], value)
      byDay.set(date, day)
    }
  }
  fold(servers, "servers")
  fold(players, "players")

  return [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date))
}
