import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { UploadIcon } from "lucide-react"

import { PluginTabs } from "@/components/dashboard/plugin-tabs"
import { RefreshButton } from "@/components/dashboard/refresh-button"
import { Button } from "@/components/ui/button"
import { getCurrentUser } from "@/lib/auth"
import { getPlugin } from "@/lib/queries"

export async function generateMetadata({ params }: { params: Promise<{ pluginId: string }> }): Promise<Metadata> {
  const user = await getCurrentUser()
  const { pluginId } = await params
  const plugin = user ? await getPlugin(user.id, pluginId) : null
  return { title: plugin?.name ?? "Plugin" }
}

export default async function PluginLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ pluginId: string }>
}) {
  const user = await getCurrentUser()
  if (!user) return null
  const { pluginId } = await params
  const plugin = await getPlugin(user.id, pluginId)
  if (!plugin) notFound()

  return (
    <>
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-3">
              <h1 className="text-xl font-semibold tracking-tight">{plugin.name}</h1>
              {plugin.newestVersion ? <span className="font-mono text-sm text-muted-foreground">{plugin.newestVersion}</span> : null}
            </div>
            {plugin.description ? <p className="mt-1 max-w-[70ch] text-sm text-muted-foreground">{plugin.description}</p> : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <RefreshButton pluginId={plugin.id} />
            <Button asChild>
              <Link href={`/dashboard/plugins/${plugin.id}/releases/new`}>
                <UploadIcon data-icon="inline-start" />
                New release
              </Link>
            </Button>
          </div>
        </div>
        <PluginTabs pluginId={plugin.id} />
      </div>
      {children}
    </>
  )
}
