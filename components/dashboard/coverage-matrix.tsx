import Link from "next/link"

import { PlatformMark } from "@/components/dashboard/primitives"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatNumber } from "@/lib/format"
import { platforms } from "@/lib/providers/types"
import type { PluginStats } from "@/lib/queries"

/**
 * Every plugin against every marketplace: how many downloads it has there and which version is
 * live. A version that trails the newest one elsewhere is marked, because that is the thing to fix.
 */
export function CoverageMatrix({ plugins }: { plugins: PluginStats[] }) {
  const columns = platforms.filter((platform) => plugins.some((plugin) => plugin.platforms.some((row) => row.platform === platform)))

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="pl-4">Plugin</TableHead>
          {columns.map((platform) => (
            <TableHead key={platform} className="text-right font-normal">
              <PlatformMark platform={platform} className="text-foreground" />
            </TableHead>
          ))}
          <TableHead className="pr-4 text-right">Total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {plugins.map((plugin) => (
          <TableRow key={plugin.id}>
            <TableCell className="pl-4 align-top">
              <Link href={`/dashboard/plugins/${plugin.id}`} className="font-medium underline-offset-4 hover:underline">
                {plugin.name}
              </Link>
              <div className="font-mono text-xs text-muted-foreground">{plugin.newestVersion ?? "no versions seen"}</div>
            </TableCell>
            {columns.map((platform) => {
              const row = plugin.platforms.find((item) => item.platform === platform)
              if (!row) {
                return (
                  <TableCell key={platform} className="text-right align-top text-muted-foreground/60">
                    not listed
                  </TableCell>
                )
              }
              return (
                <TableCell key={platform} className="text-right align-top">
                  <div className="num">{formatNumber(row.downloads)}</div>
                  <div className={row.behind ? "font-mono text-xs text-warning" : "font-mono text-xs text-muted-foreground"}>
                    {row.latestVersion ?? "–"}
                    {row.behind ? <span className="font-sans"> behind</span> : null}
                  </div>
                </TableCell>
              )
            })}
            <TableCell className="num pr-4 text-right align-top font-medium">{formatNumber(plugin.totalDownloads)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
