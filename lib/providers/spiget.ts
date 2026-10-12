import { fetchJson } from "@/lib/providers/http"
import type { ProviderAdapter } from "@/lib/providers/types"

type SpigetResource = {
  id: number
  name: string
  tag?: string
  downloads?: number
  likes?: number
  rating?: { average?: number }
}

type SpigetVersion = {
  name?: string
  downloads?: number
  releaseDate?: number
}

// SpigotMC has no write API. Stats come from Spiget; releases and listing edits are done by hand.
export const spigetAdapter: ProviderAdapter = {
  platform: "spigot",
  publicUrl: (externalId) => `https://www.spigotmc.org/resources/${externalId}/`,
  manualReleaseUrl: (externalId) => `https://www.spigotmc.org/resources/${externalId}/add-version`,
  manualListingUrl: (externalId) => `https://www.spigotmc.org/resources/${externalId}/edit`,
  async fetchProject(externalId) {
    const resource = await fetchJson<SpigetResource>(`https://api.spiget.org/v2/resources/${externalId}`)
    return {
      id: String(resource.id),
      name: resource.name,
      description: resource.tag,
      url: `https://www.spigotmc.org/resources/${resource.id}/`,
    }
  },
  async fetchVersions(externalId) {
    const versions = await fetchJson<SpigetVersion[]>(
      `https://api.spiget.org/v2/resources/${externalId}/versions?size=20&sort=-releaseDate`
    )
    return versions.map((version) => ({
      version: version.name ?? "unknown",
      downloads: version.downloads,
      releaseDate: version.releaseDate ? new Date(version.releaseDate * 1000) : undefined,
    }))
  },
  async fetchDownloadStats(externalId) {
    const resource = await fetchJson<SpigetResource>(`https://api.spiget.org/v2/resources/${externalId}`)
    return {
      downloads: resource.downloads ?? 0,
      followers: resource.likes,
      rating: resource.rating?.average ? Math.round(resource.rating.average * 100) : undefined,
    }
  },
}
