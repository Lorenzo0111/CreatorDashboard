"use client"

import { useRef, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowUpRightIcon } from "lucide-react"
import { toast } from "sonner"

import { publishRelease, type TargetOutcome } from "@/app/actions/releases"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { markdownToBbcode } from "@/lib/bbcode"
import { loaders, platformMeta } from "@/lib/platforms"
import { cn } from "@/lib/utils"
import { releaseChannels, type Platform, type ReleaseChannel } from "@/lib/providers/types"

export type ReleaseTarget = {
  platform: Platform
  /** Null when the marketplace has no publishing API. */
  publish: { does: string; needsArtifact: boolean; credentialLabel: string; ready: boolean } | null
  manualUrl: string | null
}

export type ReleaseDefaults = {
  version: string
  title: string
  channel: ReleaseChannel
  changelog: string
  gameVersions: string
  loaders: string[]
  artifactUrl: string
  targets: Platform[]
}

function toggle<T>(items: T[], item: T, on: boolean) {
  return on ? [...new Set([...items, item])] : items.filter((current) => current !== item)
}

export function ReleaseForm({
  pluginId,
  pluginName,
  targets,
  defaults,
}: {
  pluginId: string
  pluginName: string
  targets: ReleaseTarget[]
  defaults: ReleaseDefaults
}) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [values, setValues] = useState(defaults)
  const [fileName, setFileName] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [outcomes, setOutcomes] = useState<TargetOutcome[] | null>(null)
  const [isPublishing, startPublishing] = useTransition()

  const publishable = targets.filter((target) => target.publish)
  const manual = targets.filter((target) => !target.publish && target.manualUrl)
  const chosen = publishable.filter((target) => values.targets.includes(target.platform))
  const needsFile = chosen.some((target) => target.publish!.needsArtifact)
  const hasFile = Boolean(fileName || values.artifactUrl.trim())

  function set<K extends keyof ReleaseDefaults>(key: K, value: ReleaseDefaults[K]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function review(event: React.FormEvent) {
    event.preventDefault()
    if (!chosen.length) return toast.error("Pick at least one marketplace to publish to.")
    if (needsFile && !hasFile) return toast.error("Attach the file, or give a URL to it.")
    setConfirming(true)
  }

  function publish() {
    setConfirming(false)
    const data = new FormData()
    data.set("pluginId", pluginId)
    data.set("version", values.version)
    data.set("title", values.title)
    data.set("channel", values.channel)
    data.set("changelog", values.changelog)
    data.set("gameVersions", values.gameVersions)
    data.set("artifactUrl", values.artifactUrl)
    for (const loader of values.loaders) data.append("loaders", loader)
    for (const target of chosen) data.append("targets", target.platform)
    const file = fileRef.current?.files?.[0]
    if (file) data.set("file", file)

    startPublishing(async () => {
      const result = await publishRelease(data)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setOutcomes(result.outcomes)
      const failed = result.outcomes.filter((outcome) => outcome.status === "failed").length
      if (failed === result.outcomes.length) toast.error("Nothing was published")
      else if (failed) toast.warning(`Published, but ${failed} of ${result.outcomes.length} failed`)
      else toast.success(`Published ${values.version}`)
      router.refresh()
    })
  }

  if (outcomes) {
    const failed = outcomes.filter((outcome) => outcome.status === "failed").map((outcome) => outcome.platform)
    return (
      <div className="flex max-w-2xl flex-col gap-6">
        <div>
          <h2 className="text-sm font-semibold">
            {pluginName} {values.version}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Here is what happened on each marketplace.</p>
        </div>
        <Panel className="divide-y">
          {outcomes.map((outcome) => (
            <div key={outcome.platform} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-4 py-3 text-sm">
              <PlatformMark platform={outcome.platform} className="w-32 font-medium" />
              <Status tone={outcome.status} />
              {outcome.message ? <p className="basis-full text-muted-foreground sm:pl-36">{outcome.message}</p> : null}
              {outcome.url ? (
                <a href={outcome.url} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline">
                  {outcome.status === "manual" ? "Finish there" : "View"}
                  <ArrowUpRightIcon className="size-3.5" />
                </a>
              ) : null}
            </div>
          ))}
          {manual.map((target) => (
            <div key={target.platform} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-4 py-3 text-sm">
              <PlatformMark platform={target.platform} className="w-32 font-medium" />
              <Status tone="manual">Upload by hand</Status>
              {platformMeta[target.platform].bbcode && values.changelog.trim() ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="ml-auto"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(markdownToBbcode(values.changelog))
                      toast.success("Changelog copied as BBCode")
                    } catch {
                      toast.error("The browser blocked copying. Check its clipboard permission.")
                    }
                  }}
                >
                  Copy changelog as BBCode
                </Button>
              ) : null}
              <a href={target.manualUrl!} target="_blank" rel="noreferrer" className={cn("inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline", !(platformMeta[target.platform].bbcode && values.changelog.trim()) && "ml-auto")}>
                Open upload page
                <ArrowUpRightIcon className="size-3.5" />
              </a>
            </div>
          ))}
        </Panel>
        <div className="flex gap-2">
          {failed.length ? (
            <Button
              onClick={() => {
                set("targets", failed)
                setOutcomes(null)
              }}
            >
              Try the failed ones again
            </Button>
          ) : null}
          <Button asChild variant="outline">
            <Link href={`/dashboard/plugins/${pluginId}/releases`}>Back to releases</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={review} className="flex max-w-2xl flex-col gap-8">
      <FieldSet>
        <FieldLegend>Release</FieldLegend>
        <FieldGroup className="gap-4">
          <div className="grid gap-4 sm:grid-cols-[10rem_1fr_9rem]">
            <Field>
              <FieldLabel htmlFor="version">Version</FieldLabel>
              <Input id="version" value={values.version} required placeholder="2.1.5" className="font-mono" onChange={(event) => set("version", event.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="title">Title</FieldLabel>
              <Input id="title" value={values.title} placeholder={`${pluginName} ${values.version || "2.1.5"}`} onChange={(event) => set("title", event.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="channel">Channel</FieldLabel>
              <Select value={values.channel} onValueChange={(value) => set("channel", value as ReleaseChannel)}>
                <SelectTrigger id="channel" className="w-full capitalize">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {releaseChannels.map((channel) => (
                    <SelectItem key={channel} value={channel} className="capitalize">
                      {channel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="changelog">Changelog</FieldLabel>
            <Textarea id="changelog" value={values.changelog} className="min-h-40 font-mono text-[0.8rem]" onChange={(event) => set("changelog", event.target.value)} />
            <FieldDescription>Markdown. Converted to BBCode for BuiltByBit.</FieldDescription>
          </Field>
        </FieldGroup>
      </FieldSet>

      <FieldSet>
        <FieldLegend>Compatibility</FieldLegend>
        <FieldGroup className="gap-4">
          <Field>
            <FieldLabel htmlFor="gameVersions">Minecraft versions</FieldLabel>
            <Input id="gameVersions" value={values.gameVersions} placeholder="1.21.4, 1.21.5" className="font-mono" onChange={(event) => set("gameVersions", event.target.value)} />
            <FieldDescription>Separate with commas. List each version; ranges are not expanded.</FieldDescription>
          </Field>
          <Field>
            <FieldLabel>Runs on</FieldLabel>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {loaders.map((loader) => (
                <label key={loader} className="flex items-center gap-2 text-sm capitalize">
                  <Checkbox checked={values.loaders.includes(loader)} onCheckedChange={(checked) => set("loaders", toggle(values.loaders, loader, checked === true))} />
                  {loader}
                </label>
              ))}
            </div>
          </Field>
        </FieldGroup>
      </FieldSet>

      <FieldSet>
        <FieldLegend>File</FieldLegend>
        <FieldGroup className="gap-4">
          <Field>
            <FieldLabel htmlFor="file">Upload the jar</FieldLabel>
            <Input id="file" ref={fileRef} type="file" accept=".jar,.zip" onChange={(event) => setFileName(event.target.files?.[0]?.name ?? null)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="artifactUrl">Or fetch it from a URL</FieldLabel>
            <Input id="artifactUrl" type="url" value={values.artifactUrl} disabled={Boolean(fileName)} placeholder="https://github.com/you/plugin/releases/download/2.1.5/plugin.jar" onChange={(event) => set("artifactUrl", event.target.value)} />
            <FieldDescription>
              Use this for files over 4.5 MB when the dashboard runs on Vercel, which rejects larger uploads.
            </FieldDescription>
          </Field>
        </FieldGroup>
      </FieldSet>

      <FieldSet>
        <FieldLegend>Publish to</FieldLegend>
        <Panel className="divide-y">
          {publishable.map((target) => {
            const publish = target.publish!
            const id = `target-${target.platform}`
            return (
              <div key={target.platform} className="flex items-start gap-3 px-4 py-3">
                <Checkbox
                  id={id}
                  className="mt-0.5"
                  disabled={!publish.ready}
                  checked={publish.ready && values.targets.includes(target.platform)}
                  onCheckedChange={(checked) => set("targets", toggle(values.targets, target.platform, checked === true))}
                />
                <div className="min-w-0 text-sm">
                  <label htmlFor={id} className="font-medium">
                    <PlatformMark platform={target.platform} />
                  </label>
                  <p className="text-muted-foreground">
                    {publish.ready ? (
                      `${publish.does}.`
                    ) : (
                      <>
                        Needs a {publish.credentialLabel}.{" "}
                        <Link href="/dashboard/integrations" className="text-primary underline-offset-4 hover:underline">
                          Add it in Integrations
                        </Link>
                      </>
                    )}
                  </p>
                </div>
              </div>
            )
          })}
          {manual.map((target) => (
            <div key={target.platform} className="flex items-start gap-3 px-4 py-3">
              <span className="mt-0.5 size-4 shrink-0" />
              <div className="min-w-0 text-sm">
                <span className="font-medium">
                  <PlatformMark platform={target.platform} />
                </span>
                <p className="text-muted-foreground">
                  {platformMeta[target.platform].label} has no publishing API. You get a link to its upload page after publishing.
                </p>
              </div>
            </div>
          ))}
          {!targets.length ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">This plugin is not linked to any marketplace. Add IDs in Settings first.</p>
          ) : null}
        </Panel>
      </FieldSet>

      <div>
        <Button type="submit" size="lg" disabled={isPublishing || !chosen.length}>
          {isPublishing ? "Publishing" : "Review and publish"}
        </Button>
      </div>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Publish {pluginName} {values.version} to {chosen.length} {chosen.length === 1 ? "marketplace" : "marketplaces"}?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="flex flex-col gap-3 text-sm text-muted-foreground">
                <p>This goes live straight away and cannot be undone from the dashboard.</p>
                <ul className="flex flex-col gap-1.5 text-foreground">
                  {chosen.map((target) => (
                    <li key={target.platform} className="flex flex-wrap gap-x-2">
                      <PlatformMark platform={target.platform} className="font-medium" />
                      <span className="text-muted-foreground">{target.publish!.does}</span>
                    </li>
                  ))}
                </ul>
                <p>
                  File: <span className="font-mono text-foreground">{fileName ?? (values.artifactUrl.trim() || "none")}</span>
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go back</AlertDialogCancel>
            <AlertDialogAction onClick={publish}>Publish {values.version}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  )
}
