import { asDate, fetchJson, request, requireKey } from "@/lib/providers/http"
import type { ProviderAdapter, ProviderContext } from "@/lib/providers/types"

const API = "https://hangar.papermc.io/api/v1"

type HangarProject = {
  name: string
  namespace?: { owner: string; slug: string }
  description?: string
  mainPageContent?: string
  stats?: { downloads?: number; watchers?: number; stars?: number }
}

type HangarVersion = {
  name?: string
  createdAt?: string
  stats?: { downloads?: number; totalDownloads?: number }
}

type HangarVersionsResponse = HangarVersion[] | { result?: HangarVersion[] }

const HANGAR_PLATFORMS: Record<string, string> = {
  paper: "PAPER",
  purpur: "PAPER",
  folia: "PAPER",
  spigot: "PAPER",
  bukkit: "PAPER",
  velocity: "VELOCITY",
  waterfall: "WATERFALL",
  bungeecord: "WATERFALL",
}

const HANGAR_CHANNELS = { release: "Release", beta: "Beta", alpha: "Alpha" } as const

// Hangar API keys are exchanged for a short-lived JWT; the key itself is never a bearer token.
async function authenticate(context: ProviderContext) {
  const apiKey = requireKey(context.apiKey, "Add a Hangar API key in Integrations.")
  const { token } = await fetchJson<{ token: string }>(`${API}/authenticate?apiKey=${encodeURIComponent(apiKey)}`, {
    method: "POST",
  })
  return { Authorization: `Bearer ${token}` }
}

/** Hangar addresses projects by slug; older identifiers were stored as "owner/slug". */
function slugOf(externalId: string) {
  return encodeURIComponent(externalId.split("/").pop() ?? externalId)
}

function getProject(externalId: string) {
  return fetchJson<HangarProject>(`${API}/projects/${slugOf(externalId)}`)
}

function projectUrl(project: HangarProject, externalId: string) {
  return project.namespace
    ? `https://hangar.papermc.io/${project.namespace.owner}/${project.namespace.slug}`
    : `https://hangar.papermc.io/${externalId}`
}

export const hangarAdapter: ProviderAdapter = {
  platform: "hangar",
  publicUrl: (externalId) => `https://hangar.papermc.io/${externalId}`,
  async fetchProject(externalId) {
    const project = await getProject(externalId)
    return {
      id: project.namespace ? `${project.namespace.owner}/${project.namespace.slug}` : externalId,
      name: project.name,
      description: project.description,
      url: projectUrl(project, externalId),
    }
  },
  async fetchVersions(externalId) {
    const response = await fetchJson<HangarVersionsResponse>(`${API}/projects/${slugOf(externalId)}/versions?limit=25`)
    const versions = Array.isArray(response) ? response : (response.result ?? [])
    return versions.map((version) => ({
      version: version.name ?? "unknown",
      downloads: version.stats?.totalDownloads ?? version.stats?.downloads,
      releaseDate: asDate(version.createdAt),
    }))
  },
  async fetchDownloadStats(externalId) {
    const project = await getProject(externalId)
    return {
      downloads: project.stats?.downloads ?? 0,
      followers: project.stats?.watchers,
    }
  },
  publish: {
    does: "Uploads the file as a new version",
    needsArtifact: true,
    credential: "hangar",
    async run(externalId, release, context) {
      if (!release.artifact) throw new Error("Hangar needs a file to publish.")
      if (!release.gameVersions.length) throw new Error("Hangar needs at least one game version.")

      const targets = [...new Set(release.loaders.map((loader) => HANGAR_PLATFORMS[loader]).filter(Boolean))]
      if (!targets.length) throw new Error("None of the selected loaders exist on Hangar.")

      const headers = await authenticate(context)
      const form = new FormData()
      form.set(
        "versionUpload",
        new Blob(
          [
            JSON.stringify({
              version: release.version,
              description: release.changelog,
              channel: HANGAR_CHANNELS[release.channel],
              pluginDependencies: Object.fromEntries(targets.map((target) => [target, []])),
              platformDependencies: Object.fromEntries(targets.map((target) => [target, release.gameVersions])),
              files: [{ platforms: targets }],
            }),
          ],
          { type: "application/json" }
        )
      )
      form.append("files", release.artifact.data, release.artifact.name)

      const response = await request(`${API}/projects/${slugOf(externalId)}/upload`, {
        method: "POST",
        headers,
        body: form,
      })
      const { url } = (await response.json()) as { url?: string }
      return { status: "published", url }
    },
  },
  listing: {
    fields: ["body"],
    does: "Full description (project main page)",
    credential: "hangar",
    async read(externalId) {
      const project = await getProject(externalId)
      return { summary: project.description, body: project.mainPageContent }
    },
    async run(externalId, listing, context) {
      if (listing.body === undefined) return
      const headers = await authenticate(context)
      await request(`${API}/pages/editmain/${slugOf(externalId)}`, {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ content: listing.body }),
      })
    },
  },
}
