import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { AuthForm } from "@/components/auth/auth-form"
import { getCurrentUser, hasOwner } from "@/lib/auth"

export const metadata: Metadata = { title: "Set up" }

export default async function SignUpPage() {
  if (await getCurrentUser()) redirect("/dashboard")
  if (await hasOwner()) redirect("/login")

  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight">Set up your dashboard</h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">
        The first account becomes the owner. After that, sign-up closes.
      </p>
      <AuthForm mode="signup" />
    </>
  )
}
