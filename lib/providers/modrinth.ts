import { asDate, fetchJson, request, requireKey } from "@/lib/providers/http"
import type { ProviderAdapter } from "@/lib/providers/types"

const API = "https://api.modrinth.com/v2"

type ModrinthProject = {
  id: string
  slug: string
  title: string
  description?: string
  body?: string
  downloads?: number
  followers?: number
}

type ModrinthVersion = {
  id: string
  version_number: string
  downloads?: number
  date_published?: string
}

function auth(apiKey?: string) {
  return { Authorization: requireKey(apiKey, "Add a Modrinth personal access token in Integrations.") }
}

function getProject(externalId: string) {
  return fetchJson<ModrinthProject>(`${API}/project/${encodeURIComponent(externalId)}`)
}

export const modrinthAdapter: ProviderAdapter = {
  platform: "modrinth",
  publicUrl: (externalId) => `https://modrinth.com/plugin/${externalId}`,
  async fetchProject(externalId) {
    const project = await getProject(externalId)
    return {
      id: project.slug,
      name: project.title,
      description: project.description,
      url: `https://modrinth.com/plugin/${project.slug}`,
    }
  },
  async fetchVersions(externalId) {
    const versions = await fetchJson<ModrinthVersion[]>(`${API}/project/${encodeURIComponent(externalId)}/version`)
    return versions.map((version) => ({
      version: version.version_number,
      downloads: version.downloads,
      releaseDate: asDate(version.date_published),
    }))
  },
  async fetchDownloadStats(externalId) {
    const project = await getProject(externalId)
    return {
      downloads: project.downloads ?? 0,
      followers: project.followers,
    }
  },
  publish: {
    does: "Uploads the file as a new version",
    needsArtifact: true,
    credential: "modrinth",
    async run(externalId, release, context) {
      const headers = auth(context.apiKey)
      if (!release.artifact) throw new Error("Modrinth needs a file to publish.")
      if (!release.gameVersions.length) throw new Error("Modrinth needs at least one game version.")
      if (!release.loaders.length) throw new Error("Modrinth needs at least one loader.")

      // The version endpoint only accepts the project's ID, never its slug.
      const project = await getProject(externalId)
      const form = new FormData()
      form.set(
        "data",
        JSON.stringify({
          project_id: project.id,
          name: release.title,
          version_number: release.version,
          changelog: release.changelog,
          version_type: release.channel,
          game_versions: release.gameVersions,
          loaders: release.loaders,
          dependencies: [],
          featured: false,
          file_parts: ["file"],
          primary_file: "file",
        })
      )
      form.set("file", release.artifact.data, release.artifact.name)

      const response = await request(`${API}/version`, { method: "POST", headers, body: form })
      const version = (await response.json()) as ModrinthVersion
      return {
        status: "published",
        url: `https://modrinth.com/plugin/${project.slug}/version/${version.id}`,
      }
    },
  },
  listing: {
    fields: ["summary", "body"],
    does: "Summary and full description",
    credential: "modrinth",
    async read(externalId) {
      const project = await getProject(externalId)
      return { summary: project.description, body: project.body }
    },
    async run(externalId, listing, context) {
      const patch: Record<string, string> = {}
      if (listing.summary !== undefined) patch.description = listing.summary
      if (listing.body !== undefined) patch.body = listing.body
      await request(`${API}/project/${encodeURIComponent(externalId)}`, {
        method: "PATCH",
        headers: { ...auth(context.apiKey), "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      })
    },
  },
}
