"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowUpRightIcon } from "lucide-react"
import { toast } from "sonner"

import { importListing, saveListing } from "@/app/actions/listing"
import { Panel, PlatformMark, Status } from "@/components/dashboard/primitives"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { bbcodeToMarkdown, markdownToBbcode } from "@/lib/bbcode"
import { platformMeta } from "@/lib/platforms"
import type { ListingField, Platform } from "@/lib/providers/types"

export type ListingTarget = {
  platform: Platform
  sync: { does: string; fields: ListingField[]; canImport: boolean; credentialLabel: string; ready: boolean } | null
  manualUrl: string | null
  last: { status: "synced" | "failed"; message: string | null; at: string } | null
}

export function ListingForm({
  pluginId,
  pluginName,
  initial,
  targets,
}: {
  pluginId: string
  pluginName: string
  initial: { summary: string; body: string }
  targets: ListingTarget[]
}) {
  const router = useRouter()
  const [summary, setSummary] = useState(initial.summary)
  const [body, setBody] = useState(initial.body)
  const [selected, setSelected] = useState<Platform[]>([])
  const [confirming, setConfirming] = useState(false)
  const [isSaving, startSaving] = useTransition()
  const [importing, setImporting] = useState<Platform | null>(null)

  const syncable = targets.filter((target) => target.sync)
  const manual = targets.filter((target) => !target.sync && target.manualUrl)
  const importable = targets.filter((target) => target.sync?.canImport)
  const chosen = syncable.filter((target) => selected.includes(target.platform))

  function save(platforms: Platform[]) {
    setConfirming(false)
    startSaving(async () => {
      const result = await saveListing({ pluginId, summary, body, targets: platforms })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      const failed = result.outcomes.filter((outcome) => outcome.status === "failed")
      if (!platforms.length) toast.success("Draft saved")
      else if (failed.length) toast.warning(`Saved, but ${failed.length} of ${platforms.length} did not sync`, { description: failed[0].message })
      else toast.success(`Synced to ${platforms.length} ${platforms.length === 1 ? "marketplace" : "marketplaces"}`)
      setSelected([])
      router.refresh()
    })
  }

  async function importFrom(platform: Platform) {
    setImporting(platform)
    const result = await importListing(pluginId, platform)
    setImporting(null)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    setSummary(result.listing.summary ?? summary)
    setBody(result.listing.body ?? body)
    toast.success(`Loaded the listing from ${platformMeta[platform].label}. Nothing is saved until you save.`)
  }

  // A description pasted from SpigotMC or BuiltByBit arrives as BBCode.
  const looksLikeBbcode = /\[(?:b|i|url|img|list|size|color|center|code|quote)\b[^\]]*\]/i.test(body)

  async function copyAsBbcode(platform: Platform) {
    try {
      await navigator.clipboard.writeText(markdownToBbcode(body))
      toast.success(`Description copied as BBCode for ${platformMeta[platform].label}`)
    } catch {
      toast.error("The browser blocked copying. Check its clipboard permission.")
    }
  }

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <FieldSet>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <FieldLegend className="mb-0">Listing</FieldLegend>
          {importable.length ? (
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              Start from
              {importable.map((target) => (
                <Button key={target.platform} type="button" size="sm" variant="outline" disabled={importing !== null} onClick={() => importFrom(target.platform)}>
                  {importing === target.platform ? "Loading" : platformMeta[target.platform].label}
                </Button>
              ))}
            </div>
          ) : null}
        </div>
        <FieldGroup className="gap-4">
          <Field>
            <FieldLabel htmlFor="summary">Summary</FieldLabel>
            <Input id="summary" value={summary} maxLength={300} onChange={(event) => setSummary(event.target.value)} />
            <FieldDescription>One line, shown in search results and under the title.</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="body">Full description</FieldLabel>
            <Textarea id="body" value={body} className="min-h-96 font-mono text-[0.8rem]" onChange={(event) => setBody(event.target.value)} />
            <FieldDescription>
              Markdown. It is converted to BBCode for the marketplaces that use it.
            </FieldDescription>
            {looksLikeBbcode ? (
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="text-muted-foreground">This looks like BBCode.</span>
                <Button type="button" size="sm" variant="outline" onClick={() => setBody(bbcodeToMarkdown(body))}>
                  Convert to Markdown
                </Button>
              </div>
            ) : null}
          </Field>
        </FieldGroup>
      </FieldSet>

      <FieldSet>
        <FieldLegend>Sync to</FieldLegend>
        <FieldDescription>Syncing replaces what is live on the marketplace with the text above. Empty fields are never sent.</FieldDescription>
        <Panel className="divide-y">
          {syncable.map((target) => {
            const sync = target.sync!
            const id = `listing-${target.platform}`
            return (
              <div key={target.platform} className="flex items-start gap-3 px-4 py-3">
                <Checkbox
                  id={id}
                  className="mt-0.5"
                  disabled={!sync.ready}
                  checked={selected.includes(target.platform)}
                  onCheckedChange={(checked) =>
                    setSelected((current) => (checked === true ? [...current, target.platform] : current.filter((item) => item !== target.platform)))
                  }
                />
                <div className="min-w-0 flex-1 text-sm">
                  <label htmlFor={id} className="font-medium">
                    <PlatformMark platform={target.platform} />
                  </label>
                  <p className="text-muted-foreground">
                    {sync.ready ? (
                      `Replaces: ${sync.does.toLowerCase()}.`
                    ) : (
                      <>
                        Needs a {sync.credentialLabel}.{" "}
                        <Link href="/dashboard/integrations" className="text-primary underline-offset-4 hover:underline">
                          Add it in Integrations
                        </Link>
                      </>
                    )}
                  </p>
                  {target.last?.status === "failed" && target.last.message ? (
                    <p className="mt-1 text-destructive">{target.last.message}</p>
                  ) : null}
                </div>
                {target.last ? (
                  <Status tone={target.last.status} className="text-muted-foreground">
                    {target.last.status === "synced" ? "Synced" : "Failed"} {target.last.at}
                  </Status>
                ) : null}
              </div>
            )
          })}
          {manual.map((target) => (
            <div key={target.platform} className="flex items-start gap-3 px-4 py-3">
              <span className="mt-0.5 size-4 shrink-0" />
              <div className="min-w-0 flex-1 text-sm">
                <span className="font-medium">
                  <PlatformMark platform={target.platform} />
                </span>
                <p className="text-muted-foreground">No API for listing edits. Copy the text over by hand.</p>
              </div>
              {platformMeta[target.platform].bbcode ? (
                <Button type="button" size="sm" variant="outline" disabled={!body.trim()} onClick={() => copyAsBbcode(target.platform)}>
                  Copy as BBCode
                </Button>
              ) : null}
              <a href={target.manualUrl!} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                Open editor
                <ArrowUpRightIcon className="size-3.5" />
              </a>
            </div>
          ))}
          {!targets.length ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">This plugin is not linked to any marketplace. Add IDs in Settings first.</p>
          ) : null}
        </Panel>
      </FieldSet>

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="lg" disabled={isSaving || !chosen.length} onClick={() => setConfirming(true)}>
          {isSaving ? "Saving" : chosen.length ? `Save and sync to ${chosen.length}` : "Save and sync"}
        </Button>
        <Button type="button" size="lg" variant="outline" disabled={isSaving} onClick={() => save([])}>
          Save draft only
        </Button>
      </div>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace the live listing for {pluginName}?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="flex flex-col gap-3 text-sm text-muted-foreground">
                <p>The current text on these marketplaces is overwritten. The dashboard keeps no copy of what was there.</p>
                <ul className="flex flex-col gap-1.5 text-foreground">
                  {chosen.map((target) => (
                    <li key={target.platform} className="flex flex-wrap gap-x-2">
                      <PlatformMark platform={target.platform} className="font-medium" />
                      <span className="text-muted-foreground">{target.sync!.does}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go back</AlertDialogCancel>
            <AlertDialogAction onClick={() => save(chosen.map((target) => target.platform))}>Save and sync</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
