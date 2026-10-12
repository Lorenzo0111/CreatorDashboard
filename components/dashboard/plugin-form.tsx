"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { lookupProject, savePlugin } from "@/app/actions/plugins"
import { PlatformMark } from "@/components/dashboard/primitives"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { platformMeta } from "@/lib/platforms"
import { platforms, type Platform } from "@/lib/providers/types"

export type PluginFormValues = {
  id?: string
  name: string
  slug: string
  description: string
  bstatsPluginId: string
  identifiers: Partial<Record<Platform, string>>
}

const empty: PluginFormValues = { name: "", slug: "", description: "", bstatsPluginId: "", identifiers: {} }

function slugify(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function PluginForm({ initial }: { initial?: PluginFormValues }) {
  const router = useRouter()
  const [values, setValues] = useState(initial ?? empty)
  const [slugTouched, setSlugTouched] = useState(Boolean(initial))
  const [isSaving, startSaving] = useTransition()
  const [lookingUp, setLookingUp] = useState<Platform | null>(null)
  const isNew = !initial

  function set<K extends keyof PluginFormValues>(key: K, value: PluginFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  async function lookUp(platform: Platform) {
    setLookingUp(platform)
    const result = await lookupProject(platform, values.identifiers[platform] ?? "")
    setLookingUp(null)
    if (!result.ok) {
      toast.error(`${platformMeta[platform].label}: ${result.error}`)
      return
    }
    toast.success(`Found ${result.name} on ${platformMeta[platform].label}`)
    setValues((current) => ({
      ...current,
      name: current.name || result.name,
      slug: current.slug || slugify(result.name),
      description: current.description || (result.description ?? ""),
    }))
  }

  function submit(event: React.FormEvent) {
    event.preventDefault()
    startSaving(async () => {
      const result = await savePlugin(values)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(isNew ? "Plugin added" : "Changes saved")
      router.push(`/dashboard/plugins/${result.id}`)
      router.refresh()
    })
  }

  return (
    <form onSubmit={submit} className="flex max-w-2xl flex-col gap-8">
      <FieldSet>
        <FieldLegend>Marketplaces</FieldLegend>
        <FieldDescription>
          Fill in the ones this plugin is listed on. Leave the rest empty.
        </FieldDescription>
        <FieldGroup className="gap-4">
          {platforms.map((platform) => {
            const meta = platformMeta[platform]
            const value = values.identifiers[platform] ?? ""
            return (
              <Field key={platform} className="grid gap-x-4 gap-y-1.5 sm:grid-cols-[9rem_1fr] sm:items-start">
                <FieldLabel htmlFor={`id-${platform}`} className="sm:pt-1.5">
                  <PlatformMark platform={platform} />
                </FieldLabel>
                <div className="flex flex-col gap-1.5">
                  <div className="flex gap-2">
                    <Input
                      id={`id-${platform}`}
                      value={value}
                      placeholder={meta.idExample}
                      aria-describedby={`hint-${platform}`}
                      className="font-mono"
                      onChange={(event) => set("identifiers", { ...values.identifiers, [platform]: event.target.value })}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!value.trim() || lookingUp !== null}
                      onClick={() => lookUp(platform)}
                    >
                      {lookingUp === platform ? "Checking" : "Check"}
                    </Button>
                  </div>
                  <FieldDescription id={`hint-${platform}`}>
                    {meta.idLabel}. {meta.idHint}
                  </FieldDescription>
                </div>
              </Field>
            )
          })}
        </FieldGroup>
      </FieldSet>

      <FieldSet>
        <FieldLegend>Details</FieldLegend>
        <FieldGroup className="gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="name">Name</FieldLabel>
              <Input
                id="name"
                value={values.name}
                required
                onChange={(event) => {
                  const name = event.target.value
                  setValues((current) => ({ ...current, name, slug: slugTouched ? current.slug : slugify(name) }))
                }}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="slug">Slug</FieldLabel>
              <Input
                id="slug"
                value={values.slug}
                required
                className="font-mono"
                onChange={(event) => {
                  setSlugTouched(true)
                  set("slug", event.target.value)
                }}
              />
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="description">Summary</FieldLabel>
            <Input id="description" value={values.description} maxLength={300} onChange={(event) => set("description", event.target.value)} />
            <FieldDescription>One line. You can sync it to the marketplaces from the Listing tab.</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="bstats">bStats plugin ID</FieldLabel>
            <Input
              id="bstats"
              value={values.bstatsPluginId}
              inputMode="numeric"
              placeholder="1699"
              className="max-w-40 font-mono"
              onChange={(event) => set("bstatsPluginId", event.target.value)}
            />
            <FieldDescription>Optional. Adds live server and player counts.</FieldDescription>
          </Field>
        </FieldGroup>
      </FieldSet>

      <div>
        <Button type="submit" size="lg" disabled={isSaving}>
          {isSaving ? "Saving and fetching stats" : isNew ? "Add plugin" : "Save changes"}
        </Button>
      </div>
    </form>
  )
}
