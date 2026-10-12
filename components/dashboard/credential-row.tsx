"use client"

import { useState, useTransition } from "react"
import { ArrowUpRightIcon } from "lucide-react"
import { toast } from "sonner"

import { deleteCredential, saveCredential } from "@/app/actions/credentials"
import { Status } from "@/components/dashboard/primitives"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { CredentialKey } from "@/lib/providers/types"

export function CredentialRow({
  credential,
  label,
  unlocks,
  createUrl,
  savedAt,
}: {
  credential: CredentialKey
  label: string
  unlocks: string
  createUrl: string
  savedAt: string | null
}) {
  const [value, setValue] = useState("")
  const [isPending, startTransition] = useTransition()

  function save(event: React.FormEvent) {
    event.preventDefault()
    startTransition(async () => {
      const result = await saveCredential(credential, value)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setValue("")
      toast.success(`${label} saved`)
    })
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteCredential(credential)
      if (result.ok) toast.success(`${label} removed`)
      else toast.error(result.error)
    })
  }

  return (
    <div className="grid gap-x-6 gap-y-3 px-4 py-4 md:grid-cols-[1fr_22rem]">
      <div className="min-w-0 text-sm">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <label htmlFor={`key-${credential}`} className="font-medium">
            {label}
          </label>
          {savedAt ? <Status tone="success" className="text-muted-foreground">Saved {savedAt}</Status> : <Status tone="idle" className="text-muted-foreground">Not set</Status>}
        </div>
        <p className="mt-1 text-muted-foreground">{unlocks}</p>
        <a href={createUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline">
          Create one
          <ArrowUpRightIcon className="size-3.5" />
        </a>
      </div>
      <form onSubmit={save} className="flex items-start gap-2">
        <Input
          id={`key-${credential}`}
          type="password"
          value={value}
          autoComplete="off"
          placeholder={savedAt ? "Paste a new one to replace it" : "Paste it here"}
          className="font-mono"
          onChange={(event) => setValue(event.target.value)}
        />
        <Button type="submit" disabled={isPending || value.trim().length < 8}>
          Save
        </Button>
        {savedAt ? (
          <Button type="button" variant="ghost" disabled={isPending} onClick={remove}>
            Remove
          </Button>
        ) : null}
      </form>
    </div>
  )
}
