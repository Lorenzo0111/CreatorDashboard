import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { AuthForm } from "@/components/auth/auth-form"
import { getCurrentUser, hasOwner } from "@/lib/auth"

export const metadata: Metadata = { title: "Sign in" }

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/dashboard")
  // A fresh install has nobody to sign in as yet.
  if (!(await hasOwner())) redirect("/sign-up")

  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">Your plugins, their numbers and their releases.</p>
      <AuthForm mode="login" />
      <p className="mt-6 text-sm text-muted-foreground">Sign-up is closed: this dashboard has one owner.</p>
    </>
  )
}
