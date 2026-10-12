import { credentialMeta } from "@/lib/platforms"
import { providerAdapters } from "@/lib/providers"
import type { CredentialKey, ListingField, Platform } from "@/lib/providers/types"

type Linked = { platform: Platform; externalId: string }

/** What a release can do on each linked marketplace, given the credentials saved so far. */
export function releaseTargets(linked: Linked[], saved: Map<CredentialKey, Date>) {
  return linked.map(({ platform, externalId }) => {
    const adapter = providerAdapters[platform]
    return {
      platform,
      publish: adapter.publish
        ? {
            does: adapter.publish.does,
            needsArtifact: adapter.publish.needsArtifact,
            credentialLabel: credentialMeta[adapter.publish.credential].label,
            ready: saved.has(adapter.publish.credential),
          }
        : null,
      manualUrl: adapter.manualReleaseUrl?.(externalId) ?? null,
    }
  })
}

export function listingTargets(linked: Linked[], saved: Map<CredentialKey, Date>) {
  return linked.map(({ platform, externalId }) => {
    const adapter = providerAdapters[platform]
    return {
      platform,
      sync: adapter.listing
        ? {
            does: adapter.listing.does,
            fields: adapter.listing.fields as ListingField[],
            canImport: Boolean(adapter.listing.read),
            credentialLabel: credentialMeta[adapter.listing.credential].label,
            ready: saved.has(adapter.listing.credential),
          }
        : null,
      manualUrl: adapter.manualListingUrl?.(externalId) ?? null,
    }
  })
}
