import { ReleaseForm, type ReleaseDefaults } from "@/components/dashboard/release-form"
import { getCurrentUser } from "@/lib/auth"
import { getPlugin, getReleases, getSavedCredentials } from "@/lib/queries"
import { releaseTargets } from "@/lib/targets"

export default async function NewReleasePage({
  params,
  searchParams,
}: {
  params: Promise<{ pluginId: string }>
  searchParams: Promise<{ from?: string }>
}) {
  const user = await getCurrentUser()
  if (!user) return null
  const [{ pluginId }, { from }] = await Promise.all([params, searchParams])
  const plugin = await getPlugin(user.id, pluginId)
  if (!plugin) return null

  const [releases, saved] = await Promise.all([getReleases(plugin.id), getSavedCredentials(user.id)])
  const targets = releaseTargets(plugin.platforms, saved)
  const ready = targets.filter((target) => target.publish?.ready).map((target) => target.platform)

  // Retrying reopens a past release with only its failed marketplaces ticked.
  const retry = from ? releases.find((release) => release.id === from) : undefined
  const previous = retry ?? releases[0]
  const defaults: ReleaseDefaults = {
    version: retry?.version ?? "",
    title: retry?.title ?? "",
    channel: retry?.channel ?? "release",
    changelog: retry?.changelog ?? "",
    gameVersions: previous?.gameVersions.join(", ") ?? "",
    loaders: previous?.loaders ?? ["paper", "spigot"],
    artifactUrl: retry?.artifactUrl ?? "",
    targets: retry
      ? retry.targets.filter((target) => target.status === "failed" && ready.includes(target.platform)).map((target) => target.platform)
      : ready,
  }

  return <ReleaseForm pluginId={plugin.id} pluginName={plugin.name} targets={targets} defaults={defaults} />
}
