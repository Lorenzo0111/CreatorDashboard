import { ListingForm } from "@/components/dashboard/listing-form"
import { getCurrentUser } from "@/lib/auth"
import { formatRelative } from "@/lib/format"
import { getListingSyncs, getPlugin, getSavedCredentials } from "@/lib/queries"
import { listingTargets } from "@/lib/targets"

export default async function ListingPage({ params }: { params: Promise<{ pluginId: string }> }) {
  const user = await getCurrentUser()
  if (!user) return null
  const { pluginId } = await params
  const plugin = await getPlugin(user.id, pluginId)
  if (!plugin) return null

  const [saved, syncs] = await Promise.all([getSavedCredentials(user.id), getListingSyncs(plugin.id)])
  const targets = listingTargets(plugin.platforms, saved).map((target) => {
    const last = syncs.get(target.platform)
    return {
      ...target,
      last: last ? { status: last.status, message: last.message, at: formatRelative(last.syncedAt) } : null,
    }
  })

  return (
    <ListingForm
      pluginId={plugin.id}
      pluginName={plugin.name}
      initial={{ summary: plugin.description ?? "", body: plugin.longDescription ?? "" }}
      targets={targets}
    />
  )
}
