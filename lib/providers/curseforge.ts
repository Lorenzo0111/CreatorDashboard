import { asDate, fetchJson, request, requireKey } from "@/lib/providers/http"
import type { ProviderAdapter } from "@/lib/providers/types"

const CORE_API = "https://api.curseforge.com/v1"
// Uploads go through a separate author API with its own token.
const UPLOAD_API = "https://minecraft.curseforge.com/api"
const BUKKIT_VERSION_TYPE = 1

type CurseForgeMod = {
  data: {
    id: number
    name: string
    summary?: string
    links?: { websiteUrl?: string }
    downloadCount?: number
    thumbsUpCount?: number
  }
}

type CurseForgeFiles = {
  data: Array<{
    displayName?: string
    fileName?: string
    downloadCount?: number
    fileDate?: string
  }>
}

type CurseForgeGameVersion = { id: number; gameVersionTypeID: number; name: string }

function headers(apiKey?: string) {
  return { "x-api-key": requireKey(apiKey, "Add a CurseForge API key in Integrations.") }
}

function getMod(externalId: string, apiKey?: string) {
  return fetchJson<CurseForgeMod>(`${CORE_API}/mods/${externalId}`, { headers: headers(apiKey) })
}

export const curseforgeAdapter: ProviderAdapter = {
  platform: "curseforge",
  needsApiKey: true,
  publicUrl: (externalId) => `https://www.curseforge.com/projects/${externalId}`,
  manualListingUrl: (externalId) => `https://authors.curseforge.com/#/projects/${externalId}/description`,
  async fetchProject(externalId, context) {
    const mod = await getMod(externalId, context.apiKey)
    return {
      id: String(mod.data.id),
      name: mod.data.name,
      description: mod.data.summary,
      url: mod.data.links?.websiteUrl,
    }
  },
  async fetchVersions(externalId, context) {
    const files = await fetchJson<CurseForgeFiles>(`${CORE_API}/mods/${externalId}/files?pageSize=20`, {
      headers: headers(context.apiKey),
    })
    return files.data.map((file) => ({
      version: file.displayName ?? file.fileName ?? "unknown",
      downloads: file.downloadCount,
      releaseDate: asDate(file.fileDate),
    }))
  },
  async fetchDownloadStats(externalId, context) {
    const mod = await getMod(externalId, context.apiKey)
    return { downloads: mod.data.downloadCount ?? 0, followers: mod.data.thumbsUpCount }
  },
  publish: {
    does: "Uploads the file as a new project file",
    needsArtifact: true,
    credential: "curseforge-upload",
    async run(externalId, release, context) {
      const token = requireKey(context.uploadKey, "Add a CurseForge upload token in Integrations.")
      if (!release.artifact) throw new Error("CurseForge needs a file to publish.")

      // CurseForge wants its own numeric IDs for game versions, and the same name exists under several types.
      const known = await fetchJson<CurseForgeGameVersion[]>(`${UPLOAD_API}/game/versions`, {
        headers: { "X-Api-Token": token },
      })
      const gameVersions = release.gameVersions.map((name) => {
        const matches = known.filter((version) => version.name === name)
        const match = matches.find((version) => version.gameVersionTypeID === BUKKIT_VERSION_TYPE) ?? matches[0]
        if (!match) throw new Error(`CurseForge does not know game version ${name}.`)
        return match.id
      })
      if (!gameVersions.length) throw new Error("CurseForge needs at least one game version.")

      const form = new FormData()
      form.set(
        "metadata",
        JSON.stringify({
          changelog: release.changelog,
          changelogType: "markdown",
          displayName: release.title,
          gameVersions,
          releaseType: release.channel,
        })
      )
      form.set("file", release.artifact.data, release.artifact.name)

      await request(`${UPLOAD_API}/projects/${externalId}/upload-file`, {
        method: "POST",
        headers: { "X-Api-Token": token },
        body: form,
      })
      return { status: "published", message: "Files appear once CurseForge has reviewed them." }
    },
  },
}
