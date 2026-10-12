import { ArrowUpRightIcon } from "lucide-react"

import { DownloadsChart } from "@/components/dashboard/downloads-chart"
import { DeltaValue, EmptyState, Panel, PlatformMark, Section, Stat, StatRail, Status } from "@/components/dashboard/primitives"
import { UsageChart } from "@/components/dashboard/usage-chart"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getCurrentUser } from "@/lib/auth"
import { formatDate, formatNumber, formatRelative } from "@/lib/format"
import { providerAdapters } from "@/lib/providers"
import { fetchUsageHistory } from "@/lib/providers/bstats"
import { getPlugin, getVersions } from "@/lib/queries"

export default async function PluginStatsPage({ params }: { params: Promise<{ pluginId: string }> }) {
  const user = await getCurrentUser()
  if (!user) return null
  const { pluginId } = await params
  const plugin = await getPlugin(user.id, pluginId)
  if (!plugin) return null

  const [versions, usage] = await Promise.all([
    getVersions(plugin.id),
    plugin.bstatsPluginId ? fetchUsageHistory(plugin.bstatsPluginId, 30).catch(() => null) : null,
  ])

  if (!plugin.platforms.length && !plugin.bstatsPluginId) {
    return (
      <EmptyState title="Not linked to anything yet">
        Open Settings and add at least one marketplace ID or a bStats ID to start collecting numbers.
      </EmptyState>
    )
  }

  const incomplete = [plugin.delta7, plugin.delta30].some((delta) => delta && !delta.complete)

  return (
    <>
      <div className="flex flex-col gap-3">
        <StatRail>
          <Stat label="Downloads" value={formatNumber(plugin.totalDownloads)} detail={`across ${plugin.platforms.length} ${plugin.platforms.length === 1 ? "marketplace" : "marketplaces"}`} />
          <Stat label="Last 7 days" value={<DeltaValue delta={plugin.delta7} />} detail="new downloads" />
          <Stat label="Last 30 days" value={<DeltaValue delta={plugin.delta30} />} detail="new downloads" />
          <Stat label="Servers" value={formatNumber(plugin.servers)} detail={plugin.bstatsPluginId ? "running now" : "no bStats ID set"} />
          <Stat label="Players" value={formatNumber(plugin.players)} detail={plugin.bstatsPluginId ? "online now" : "no bStats ID set"} />
        </StatRail>
        <div className="flex flex-wrap justify-between gap-x-6 gap-y-1 text-xs text-muted-foreground">
          {incomplete ? <p>* Snapshots do not go back the whole period yet, so this counts from the first one.</p> : <span />}
          {plugin.lastRefresh ? (
            <Status tone={plugin.lastRefresh.status} className="text-xs">
              Refreshed {formatRelative(plugin.lastRefresh.at)}
              {plugin.lastRefresh.status !== "success" && plugin.lastRefresh.message ? `: ${plugin.lastRefresh.message}` : ""}
            </Status>
          ) : null}
        </div>
      </div>

      {plugin.platforms.length ? (
        <Section title="Marketplaces">
          <Panel className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">Marketplace</TableHead>
                  <TableHead className="text-right">Downloads</TableHead>
                  <TableHead className="text-right">7 days</TableHead>
                  <TableHead className="text-right">Followers</TableHead>
                  <TableHead className="text-right">Rating</TableHead>
                  <TableHead>Live version</TableHead>
                  <TableHead className="pr-4" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {plugin.platforms.map((row) => (
                  <TableRow key={row.platform}>
                    <TableCell className="pl-4">
                      <PlatformMark platform={row.platform} />
                    </TableCell>
                    <TableCell className="num text-right">{formatNumber(row.downloads)}</TableCell>
                    <TableCell className="text-right">
                      <DeltaValue delta={row.delta7} />
                    </TableCell>
                    <TableCell className="num text-right">{formatNumber(row.followers)}</TableCell>
                    <TableCell className="num text-right">{row.rating ? row.rating.toFixed(1) : "–"}</TableCell>
                    <TableCell>
                      <span className="font-mono text-[0.8rem]">{row.latestVersion ?? "–"}</span>
                      {row.behind ? <span className="ml-2 text-warning">behind</span> : null}
                      {row.latestVersionDate ? (
                        <span className="ml-2 text-muted-foreground">{formatDate(row.latestVersionDate)}</span>
                      ) : null}
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <a
                        href={providerAdapters[row.platform].publicUrl(row.externalId)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                      >
                        Open
                        <ArrowUpRightIcon className="size-3.5" />
                      </a>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Panel>
        </Section>
      ) : null}

      <div className="grid gap-8 xl:grid-cols-2">
        <Section title="New downloads per day" description="By marketplace.">
          <Panel>
            <DownloadsChart data={plugin.daily} />
          </Panel>
        </Section>
        <Section title="Servers and players" description="Daily peak over 30 days, via bStats.">
          <Panel>
            {usage?.length ? (
              <UsageChart data={usage} />
            ) : (
              <div className="flex h-64 items-center justify-center px-6 text-center text-sm text-muted-foreground">
                {plugin.bstatsPluginId
                  ? "bStats did not answer. The chart returns when it does."
                  : "Add a bStats plugin ID in Settings to chart server and player counts."}
              </div>
            )}
          </Panel>
        </Section>
      </div>

      {versions.length ? (
        <Section title="Versions" description="As listed on each marketplace.">
          <Panel className="max-h-96 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">Version</TableHead>
                  <TableHead>Marketplace</TableHead>
                  <TableHead>Released</TableHead>
                  <TableHead className="pr-4 text-right">Downloads</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {versions.map((version, index) => (
                  <TableRow key={`${version.platform}-${version.version}-${index}`}>
                    <TableCell className="pl-4 font-mono text-[0.8rem]">{version.version}</TableCell>
                    <TableCell>
                      <PlatformMark platform={version.platform} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(version.releaseDate)}</TableCell>
                    <TableCell className="num pr-4 text-right">{formatNumber(version.downloads)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Panel>
        </Section>
      ) : null}
    </>
  )
}
