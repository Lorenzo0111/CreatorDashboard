import { DeletePlugin } from "@/components/dashboard/delete-plugin"
import { PluginForm } from "@/components/dashboard/plugin-form"
import { Section } from "@/components/dashboard/primitives"
import { getCurrentUser } from "@/lib/auth"
import { getPlugin } from "@/lib/queries"

export default async function PluginSettingsPage({ params }: { params: Promise<{ pluginId: string }> }) {
  const user = await getCurrentUser()
  if (!user) return null
  const { pluginId } = await params
  const plugin = await getPlugin(user.id, pluginId)
  if (!plugin) return null

  return (
    <>
      <PluginForm
        initial={{
          id: plugin.id,
          name: plugin.name,
          slug: plugin.slug,
          description: plugin.description ?? "",
          bstatsPluginId: plugin.bstatsPluginId ?? "",
          identifiers: Object.fromEntries(plugin.platforms.map((row) => [row.platform, row.externalId])),
        }}
      />
      <Section title="Remove" className="max-w-2xl border-t pt-6">
        <p className="text-sm text-muted-foreground">
          Deletes this plugin and its history from the dashboard. The marketplaces are not touched.
        </p>
        <div>
          <DeletePlugin pluginId={plugin.id} name={plugin.name} />
        </div>
      </Section>
    </>
  )
}
