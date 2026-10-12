export const platforms = ["modrinth", "hangar", "spigot", "curseforge", "builtbybit", "github"] as const
export type Platform = (typeof platforms)[number]

// CurseForge issues a separate token for uploads, so credentials are keyed more finely than platforms.
export const credentialKeys = [...platforms, "curseforge-upload"] as const
export type CredentialKey = (typeof credentialKeys)[number]

export const releaseChannels = ["release", "beta", "alpha"] as const
export type ReleaseChannel = (typeof releaseChannels)[number]

export type ProviderContext = {
  apiKey?: string
  uploadKey?: string
}

export type ProviderProject = {
  id: string
  name: string
  description?: string
  url?: string
}

export type ProviderVersion = {
  version: string
  downloads?: number
  releaseDate?: Date
}

export type ProviderDownloadStats = {
  downloads: number
  followers?: number
  rating?: number
}

export type ProviderUsagePoint = {
  chartId: string
  label: string
  value: number
}

export type ReleaseArtifact = {
  name: string
  data: Blob
  /** Set when the artifact came from a public URL rather than an upload. */
  url?: string
}

export type ReleaseInput = {
  version: string
  title: string
  changelog: string
  channel: ReleaseChannel
  gameVersions: string[]
  loaders: string[]
  artifact?: ReleaseArtifact
}

export type PublishResult = {
  /** "manual" means the platform accepted part of the release and the rest has to be done by hand. */
  status: "published" | "manual"
  url?: string
  message?: string
}

export type ListingInput = {
  summary?: string
  body?: string
}

export type ListingField = keyof ListingInput

export type PublishCapability = {
  /** What a publish does on this platform, in the user's terms. */
  does: string
  needsArtifact: boolean
  credential: CredentialKey
}

export type ListingCapability = {
  fields: ListingField[]
  /** Where each field ends up on the platform. */
  does: string
  credential: CredentialKey
}

export type ProviderAdapter = {
  platform: Platform
  needsApiKey?: boolean
  fetchProject: (externalId: string, context: ProviderContext) => Promise<ProviderProject>
  fetchVersions: (externalId: string, context: ProviderContext) => Promise<ProviderVersion[]>
  fetchDownloadStats: (externalId: string, context: ProviderContext) => Promise<ProviderDownloadStats>
  publicUrl: (externalId: string) => string
  /** Pages for doing by hand what the platform's API cannot. */
  manualReleaseUrl?: (externalId: string) => string
  manualListingUrl?: (externalId: string) => string
  publish?: PublishCapability & {
    run: (externalId: string, release: ReleaseInput, context: ProviderContext) => Promise<PublishResult>
  }
  listing?: ListingCapability & {
    /** Reads the live listing so it can be imported as a starting point. */
    read?: (externalId: string, context: ProviderContext) => Promise<ListingInput>
    run: (externalId: string, listing: ListingInput, context: ProviderContext) => Promise<void>
  }
}

export type UsageAdapter = {
  fetchUsageStats: (pluginId: string, context: ProviderContext) => Promise<ProviderUsagePoint[]>
}
