import type { Metadata } from "next"

import { CredentialRow } from "@/components/dashboard/credential-row"
import { PageHeader, Panel, PlatformMark, Section } from "@/components/dashboard/primitives"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getCurrentUser } from "@/lib/auth"
import { formatRelative } from "@/lib/format"
import { credentialMeta } from "@/lib/platforms"
import { providerAdapters } from "@/lib/providers"
import { credentialKeys, platforms } from "@/lib/providers/types"
import { getSavedCredentials } from "@/lib/queries"

export const metadata: Metadata = { title: "Integrations" }

export default async function IntegrationsPage() {
  const user = await getCurrentUser()
  if (!user) return null
  const saved = await getSavedCredentials(user.id)
  const keys = credentialKeys.filter((key) => credentialMeta[key].createUrl)

  return (
    <>
      <PageHeader
        title="Integrations"
        description="Keys are encrypted before they are stored and are only ever sent to the marketplace they belong to."
      />

      <Section title="What works where">
        <Panel className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">Marketplace</TableHead>
                <TableHead>Stats</TableHead>
                <TableHead>Publishing a release</TableHead>
                <TableHead className="pr-4">Editing the listing</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {platforms.map((platform) => {
                const adapter = providerAdapters[platform]
                return (
                  <TableRow key={platform}>
                    <TableCell className="pl-4 align-top font-medium">
                      <PlatformMark platform={platform} />
                    </TableCell>
                    <TableCell className="align-top text-muted-foreground">
                      {adapter.needsApiKey ? "Needs a key" : "No key needed"}
                    </TableCell>
                    <TableCell className="align-top whitespace-normal text-muted-foreground">
                      {adapter.publish ? adapter.publish.does : "By hand: no API"}
                    </TableCell>
                    <TableCell className="pr-4 align-top whitespace-normal text-muted-foreground">
                      {adapter.listing ? adapter.listing.does : "By hand: no API"}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Panel>
      </Section>

      <Section title="Keys">
        <Panel className="divide-y">
          {keys.map((key) => {
            const meta = credentialMeta[key]
            const savedAt = saved.get(key)
            return (
              <CredentialRow
                key={key}
                credential={key}
                label={meta.label}
                unlocks={meta.unlocks}
                createUrl={meta.createUrl}
                savedAt={savedAt ? formatRelative(savedAt) : null}
              />
            )
          })}
        </Panel>
      </Section>
    </>
  )
}
