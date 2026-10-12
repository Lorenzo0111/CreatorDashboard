import { asDate, fetchJson, request, requireKey, sendJson } from "@/lib/providers/http"
import type { ProviderAdapter } from "@/lib/providers/types"

const API = "https://api.github.com"

type GitHubRepo = {
  full_name: string
  name: string
  description?: string | null
  html_url: string
  stargazers_count?: number
}

type GitHubRelease = {
  id: number
  tag_name: string
  html_url: string
  upload_url: string
  published_at?: string
  assets: Array<{ download_count: number }>
}

function headers(apiKey?: string): Record<string, string> {
  return {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
  }
}

function writeHeaders(apiKey?: string) {
  return headers(requireKey(apiKey, "Add a GitHub token in Integrations."))
}

function repoPath(externalId: string) {
  const [owner, repo] = externalId.replace(/^https?:\/\/github\.com\//, "").split("/")
  if (!owner || !repo) throw new Error("GitHub repositories are written as owner/repo.")
  return `${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`
}

function getReleases(externalId: string, apiKey?: string) {
  return fetchJson<GitHubRelease[]>(`${API}/repos/${repoPath(externalId)}/releases?per_page=100`, {
    headers: headers(apiKey),
  })
}

function assetDownloads(release: GitHubRelease) {
  return release.assets.reduce((sum, asset) => sum + asset.download_count, 0)
}

export const githubAdapter: ProviderAdapter = {
  platform: "github",
  publicUrl: (externalId) => `https://github.com/${externalId}`,
  async fetchProject(externalId, context) {
    const repo = await fetchJson<GitHubRepo>(`${API}/repos/${repoPath(externalId)}`, { headers: headers(context.apiKey) })
    return {
      id: repo.full_name,
      name: repo.name,
      description: repo.description ?? undefined,
      url: repo.html_url,
    }
  },
  async fetchVersions(externalId, context) {
    const releases = await getReleases(externalId, context.apiKey)
    return releases.map((release) => ({
      version: release.tag_name,
      downloads: assetDownloads(release),
      releaseDate: asDate(release.published_at),
    }))
  },
  async fetchDownloadStats(externalId, context) {
    const [repo, releases] = await Promise.all([
      fetchJson<GitHubRepo>(`${API}/repos/${repoPath(externalId)}`, { headers: headers(context.apiKey) }),
      getReleases(externalId, context.apiKey),
    ])
    return {
      // Counts release asset downloads from the 100 most recent releases.
      downloads: releases.reduce((sum, release) => sum + assetDownloads(release), 0),
      followers: repo.stargazers_count,
    }
  },
  publish: {
    does: "Creates a release tagged with the version and attaches the file",
    needsArtifact: false,
    credential: "github",
    async run(externalId, release, context) {
      const auth = writeHeaders(context.apiKey)
      const created = await sendJson<GitHubRelease>(
        `${API}/repos/${repoPath(externalId)}/releases`,
        "POST",
        {
          tag_name: release.version,
          name: release.title,
          body: release.changelog,
          prerelease: release.channel !== "release",
        },
        auth
      )

      if (release.artifact) {
        const uploadUrl = `${created.upload_url.replace(/\{.*$/, "")}?name=${encodeURIComponent(release.artifact.name)}`
        await request(uploadUrl, {
          method: "POST",
          headers: { ...auth, "Content-Type": "application/octet-stream" },
          body: release.artifact.data,
        })
      }

      return { status: "published", url: created.html_url }
    },
  },
  listing: {
    fields: ["summary"],
    does: "Summary (repository description)",
    credential: "github",
    async run(externalId, listing, context) {
      if (listing.summary === undefined) return
      await sendJson(`${API}/repos/${repoPath(externalId)}`, "PATCH", { description: listing.summary }, writeHeaders(context.apiKey))
    },
  },
}
