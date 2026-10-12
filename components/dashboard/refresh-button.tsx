"use client"

import { useTransition } from "react"
import { RefreshCwIcon } from "lucide-react"
import { toast } from "sonner"

import { refreshAllStats, refreshPluginStats } from "@/app/actions/plugins"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function RefreshButton({ pluginId }: { pluginId?: string }) {
  const [isPending, startTransition] = useTransition()

  function refresh() {
    startTransition(async () => {
      if (pluginId) {
        const result = await refreshPluginStats(pluginId)
        if (!result.ok) toast.error(result.error)
        else if (result.status === "success") toast.success("Stats refreshed")
        else toast.warning(result.status === "failed" ? "Refresh failed" : "Refreshed, with problems", { description: result.message })
        return
      }

      const result = await refreshAllStats()
      if (!result.ok) toast.error(result.error)
      else if (result.failed) toast.warning(`Refreshed, with problems on ${result.failed} of ${result.total} plugins`)
      else toast.success("Stats refreshed")
    })
  }

  return (
    <Button type="button" variant="outline" disabled={isPending} onClick={refresh}>
      <RefreshCwIcon data-icon="inline-start" className={cn(isPending && "animate-spin")} />
      {isPending ? "Refreshing" : pluginId ? "Refresh stats" : "Refresh all"}
    </Button>
  )
}
