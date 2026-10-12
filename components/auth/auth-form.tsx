"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function onSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const email = String(formData.get("email") ?? "")
      const password = String(formData.get("password") ?? "")

      const result =
        mode === "signup"
          ? await authClient.signUp.email({ email, password, name: String(formData.get("name") ?? "") })
          : await authClient.signIn.email({ email, password })

      if (result.error) {
        setError(result.error.message ?? "That did not work. Check the details and try again.")
        return
      }

      router.push("/dashboard")
      router.refresh()
    })
  }

  return (
    <form action={onSubmit}>
      <FieldGroup>
        {mode === "signup" ? (
          <Field>
            <FieldLabel htmlFor="name">Name</FieldLabel>
            <Input id="name" name="name" autoComplete="name" required />
          </Field>
        ) : null}
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>
        <Field data-invalid={error ? true : undefined}>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            minLength={8}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            aria-invalid={error ? true : undefined}
            required
          />
          {error ? <FieldError>{error}</FieldError> : null}
        </Field>
        <Button type="submit" size="lg" disabled={isPending}>
          {isPending ? "One moment" : mode === "signup" ? "Create owner account" : "Sign in"}
        </Button>
      </FieldGroup>
    </form>
  )
}
