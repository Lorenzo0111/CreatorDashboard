import { bbcodeToMarkdown, markdownToBbcode } from "@/lib/bbcode"
import { asDate, fetchJson, requireKey, sendJson } from "@/lib/providers/http"
import type { ProviderAdapter } from "@/lib/providers/types"

const API = "https://api.builtbybit.com/v1"

type Envelope<T> = { result: string; data: T }

type BuiltByBitResource = {
  resource_id: number
  title?: string
  tag_line?: string
  description?: string
  download_count?: number
  review_count?: number
  review_average?: number
}

type BuiltByBitVersion = { name?: string; download_count?: number; release_date?: number }

function headers(apiKey?: string) {
  return { Authorization: `Private ${requireKey(apiKey, "Add a BuiltByBit API key in Integrations.")}` }
}

async function getResource(externalId: string, apiKey?: string) {
  const { data } = await fetchJson<Envelope<BuiltByBitResource>>(`${API}/resources/creator/${externalId}`, {
    headers: headers(apiKey),
  })
  return data
}

export const builtByBitAdapter: ProviderAdapter = {
  platform: "builtbybit",
  needsApiKey: true,
  publicUrl: (externalId) => `https://builtbybit.com/resources/${externalId}/`,
  manualReleaseUrl: (externalId) => `https://builtbybit.com/resources/${externalId}/post-update`,
  manualListingUrl: (externalId) => `https://builtbybit.com/resources/${externalId}/edit`,
  async fetchProject(externalId, context) {
    const resource = await getResource(externalId, context.apiKey)
    return {
      id: String(resource.resource_id ?? externalId),
      name: resource.title ?? `BuiltByBit ${externalId}`,
      description: resource.tag_line,
      url: `https://builtbybit.com/resources/${externalId}/`,
    }
  },
  async fetchVersions(externalId, context) {
    const { data } = await fetchJson<Envelope<BuiltByBitVersion[]>>(`${API}/resources/creator/${externalId}/versions`, {
      headers: headers(context.apiKey),
    })
    return (data ?? []).map((version) => ({
      version: version.name ?? "unknown",
      downloads: version.download_count,
      releaseDate: version.release_date ? new Date(version.release_date * 1000) : asDate(undefined),
    }))
  },
  async fetchDownloadStats(externalId, context) {
    const resource = await getResource(externalId, context.apiKey)
    return {
      downloads: resource.download_count ?? 0,
      followers: resource.review_count,
      rating: resource.review_average ? Math.round(resource.review_average * 100) : undefined,
    }
  },
  publish: {
    does: "Posts the changelog as an update. The file still has to be uploaded on BuiltByBit",
    needsArtifact: false,
    credential: "builtbybit",
    async run(externalId, release, context) {
      await sendJson(
        `${API}/resources/creator/${externalId}/updates`,
        "POST",
        { title: release.title, message: markdownToBbcode(release.changelog) },
        headers(context.apiKey)
      )
      return {
        status: "manual",
        url: `https://builtbybit.com/resources/${externalId}/post-update`,
        message: "Update posted. Upload the file on BuiltByBit to finish.",
      }
    },
  },
  listing: {
    fields: ["summary", "body"],
    does: "Summary (tag line) and full description, converted to BBCode",
    credential: "builtbybit",
    async read(externalId, context) {
      const resource = await getResource(externalId, context.apiKey)
      return {
        summary: resource.tag_line,
        body: resource.description ? bbcodeToMarkdown(resource.description) : undefined,
      }
    },
    async run(externalId, listing, context) {
      const patch: Record<string, string> = {}
      if (listing.summary !== undefined) patch.tag_line = listing.summary
      // The description there is BBCode, so the Markdown draft is converted on the way out.
      if (listing.body !== undefined) patch.description = markdownToBbcode(listing.body)
      if (!Object.keys(patch).length) return
      await sendJson(`${API}/resources/creator/${externalId}`, "PATCH", patch, headers(context.apiKey))
    },
  },
}
