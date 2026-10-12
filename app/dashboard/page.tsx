import type { Metadata } from "next"
import Link from "next/link"

import { CoverageMatrix } from "@/components/dashboard/coverage-matrix"
import { DownloadsChart } from "@/components/dashboard/downloads-chart"
import { DeltaValue, EmptyState, PageHeader, Panel, Section, Stat, StatRail, Status } from "@/components/dashboard/primitives"
import { RefreshButton } from "@/components/dashboard/refresh-button"
import { Button } from "@/components/ui/button"
import { getCurrentUser } from "@/lib/auth"
import { formatNumber, formatRelative } from "@/lib/format"
import { getActivity, getPluginStats, mergeDaily, sumDeltas } from "@/lib/queries"

export const metadata: Metadata = { title: "Overview" }

export default async function DashboardPage() {
  const user = await getCurrentUser()
  if (!user) return null

  const [plugins, activity] = await Promise.all([getPluginStats(user.id), getActivity(user.id)])

  if (!plugins.length) {
    return (
      <>
        <PageHeader title="Overview" />
        <EmptyState
          title="Add your first plugin"
          action={
            <Button asChild>
              <Link href="/dashboard/plugins/new">Add a plugin</Link>
            </Button>
          }
        >
          Link it to the marketplaces it is listed on. Downloads, versions and server counts are collected from
          there, and you can publish releases to all of them from one form.
        </EmptyState>
      </>
    )
  }

  const total = plugins.reduce((sum, plugin) => sum + plugin.totalDownloads, 0)
  const delta7 = sumDeltas(plugins.map((plugin) => plugin.delta7))
  const delta30 = sumDeltas(plugins.map((plugin) => plugin.delta30))
  const withUsage = plugins.filter((plugin) => plugin.servers !== null)
  const servers = withUsage.reduce((sum, plugin) => sum + (plugin.servers ?? 0), 0)
  const players = withUsage.reduce((sum, plugin) => sum + (plugin.players ?? 0), 0)
  const behind = plugins.flatMap((plugin) => plugin.platforms.filter((row) => row.behind)).length
  const incomplete = [delta7, delta30].some((delta) => delta && !delta.complete)

  return (
    <>
      <PageHeader title="Overview">
        <RefreshButton />
      </PageHeader>

      <StatRail>
        <Stat label="Downloads" value={formatNumber(total)} detail={`${plugins.length} ${plugins.length === 1 ? "plugin" : "plugins"}`} />
        <Stat label="Last 7 days" value={<DeltaValue delta={delta7} />} detail="new downloads" />
        <Stat label="Last 30 days" value={<DeltaValue delta={delta30} />} detail="new downloads" />
        <Stat label="Servers" value={withUsage.length ? formatNumber(servers) : "–"} detail={withUsage.length ? "running now, via bStats" : "no bStats ID set"} />
        <Stat label="Players" value={withUsage.length ? formatNumber(players) : "–"} detail={withUsage.length ? "online now, via bStats" : "no bStats ID set"} />
      </StatRail>
      {incomplete ? (
        <p className="-mt-5 text-xs text-muted-foreground">
          * Snapshots do not go back the whole period yet, so this counts from the first one.
        </p>
      ) : null}

      <Section
        title="Where each plugin stands"
        description={behind ? `${behind} ${behind === 1 ? "listing is" : "listings are"} behind the newest version.` : "Every listing is on the newest version."}
      >
        <Panel className="overflow-hidden">
          <CoverageMatrix plugins={plugins} />
        </Panel>
      </Section>

      <Section title="New downloads per day" description="All plugins, by marketplace.">
        <Panel>
          <DownloadsChart data={mergeDaily(plugins)} />
        </Panel>
      </Section>

      <Section title="Recent activity">
        {activity.length ? (
          <Panel className="divide-y">
            {activity.map((item) => (
              <div key={`${item.kind}-${item.id}`} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-4 py-2.5 text-sm">
                <Status tone={item.status} className="w-32">
                  {item.title}
                </Status>
                {item.pluginId ? (
                  <Link href={`/dashboard/plugins/${item.pluginId}`} className="font-medium underline-offset-4 hover:underline">
                    {item.pluginName}
                  </Link>
                ) : null}
                {item.detail ? <span className="min-w-0 flex-1 truncate text-muted-foreground" title={item.detail}>{item.detail}</span> : <span className="flex-1" />}
                <time className="text-muted-foreground" dateTime={item.at.toISOString()}>
                  {formatRelative(item.at)}
                </time>
              </div>
            ))}
          </Panel>
        ) : (
          <p className="text-sm text-muted-foreground">Nothing yet. Refreshes and releases show up here.</p>
        )}
      </Section>
    </>
  )
}
