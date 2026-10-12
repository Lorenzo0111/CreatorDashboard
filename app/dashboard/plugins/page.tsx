import type { Metadata } from "next"
import Link from "next/link"
import { PlusIcon } from "lucide-react"

import { DeltaValue, EmptyState, PageHeader, Panel, PlatformMark, Status } from "@/components/dashboard/primitives"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getCurrentUser } from "@/lib/auth"
import { formatNumber, formatRelative } from "@/lib/format"
import { getPluginStats } from "@/lib/queries"

export const metadata: Metadata = { title: "Plugins" }

export default async function PluginsPage() {
  const user = await getCurrentUser()
  if (!user) return null
  const plugins = await getPluginStats(user.id)

  const addButton = (
    <Button asChild>
      <Link href="/dashboard/plugins/new">
        <PlusIcon data-icon="inline-start" />
        Add a plugin
      </Link>
    </Button>
  )

  return (
    <>
      <PageHeader title="Plugins">{addButton}</PageHeader>
      {plugins.length ? (
        <Panel className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">Plugin</TableHead>
                <TableHead>Listed on</TableHead>
                <TableHead className="text-right">Downloads</TableHead>
                <TableHead className="text-right">7 days</TableHead>
                <TableHead className="text-right">Servers</TableHead>
                <TableHead className="pr-4">Last refresh</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plugins.map((plugin) => (
                <TableRow key={plugin.id}>
                  <TableCell className="pl-4">
                    <Link href={`/dashboard/plugins/${plugin.id}`} className="font-medium underline-offset-4 hover:underline">
                      {plugin.name}
                    </Link>
                    <div className="font-mono text-xs text-muted-foreground">{plugin.newestVersion ?? plugin.slug}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-muted-foreground">
                      {plugin.platforms.length
                        ? plugin.platforms.map((row) => <PlatformMark key={row.platform} platform={row.platform} />)
                        : "nowhere yet"}
                    </div>
                  </TableCell>
                  <TableCell className="num text-right">{formatNumber(plugin.totalDownloads)}</TableCell>
                  <TableCell className="text-right">
                    <DeltaValue delta={plugin.delta7} />
                  </TableCell>
                  <TableCell className="num text-right">{formatNumber(plugin.servers)}</TableCell>
                  <TableCell className="pr-4">
                    {plugin.lastRefresh ? (
                      <Status tone={plugin.lastRefresh.status}>{formatRelative(plugin.lastRefresh.at)}</Status>
                    ) : (
                      <Status tone="idle" />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>
      ) : (
        <EmptyState title="No plugins yet" action={addButton}>
          Add one and link it to the marketplaces it is listed on.
        </EmptyState>
      )}
    </>
  )
}
