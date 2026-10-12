import Link from "next/link"
import { ArrowUpRightIcon } from "lucide-react"

import { EmptyState, Panel, PlatformMark, Status } from "@/components/dashboard/primitives"
import { Button } from "@/components/ui/button"
import { getCurrentUser } from "@/lib/auth"
import { formatDate } from "@/lib/format"
import { getPlugin, getReleases } from "@/lib/queries"

export default async function ReleasesPage({ params }: { params: Promise<{ pluginId: string }> }) {
  const user = await getCurrentUser()
  if (!user) return null
  const { pluginId } = await params
  const plugin = await getPlugin(user.id, pluginId)
  if (!plugin) return null
  const releases = await getReleases(plugin.id)

  if (!releases.length) {
    return (
      <EmptyState
        title="No releases published from here yet"
        action={
          <Button asChild>
            <Link href={`/dashboard/plugins/${plugin.id}/releases/new`}>New release</Link>
          </Button>
        }
      >
        Write the changelog once, attach the file, and send it to every marketplace that accepts uploads. Versions
        published elsewhere are listed on the Stats tab.
      </EmptyState>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {releases.map((release) => {
        const failed = release.targets.some((target) => target.status === "failed")
        return (
          <Panel key={release.id}>
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b px-4 py-3">
              <h2 className="font-mono text-sm font-medium">{release.version}</h2>
              <span className="text-sm">{release.title}</span>
              {release.channel !== "release" ? <span className="text-sm text-warning capitalize">{release.channel}</span> : null}
              <span className="ml-auto text-sm text-muted-foreground">{formatDate(release.createdAt)}</span>
              {failed ? (
                <Button asChild size="sm" variant="outline">
                  <Link href={`/dashboard/plugins/${plugin.id}/releases/new?from=${release.id}`}>Try failed again</Link>
                </Button>
              ) : null}
            </div>
            <div className="divide-y">
              {release.targets.map((target) => (
                <div key={target.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-4 py-2 text-sm">
                  <PlatformMark platform={target.platform} className="w-32" />
                  <Status tone={target.status} />
                  {target.message ? <span className="min-w-0 flex-1 text-muted-foreground">{target.message}</span> : <span className="flex-1" />}
                  {target.url ? (
                    <a href={target.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                      {target.status === "manual" ? "Finish there" : "View"}
                      <ArrowUpRightIcon className="size-3.5" />
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
            {release.changelog ? (
              <details className="border-t px-4 py-2 text-sm">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Changelog</summary>
                <pre className="mt-2 max-h-64 overflow-auto font-mono text-[0.8rem] whitespace-pre-wrap">{release.changelog}</pre>
              </details>
            ) : null}
          </Panel>
        )
      })}
    </div>
  )
}
