import type { Metadata } from "next"

import { PageHeader } from "@/components/dashboard/primitives"
import { PluginForm } from "@/components/dashboard/plugin-form"

export const metadata: Metadata = { title: "Add a plugin" }

export default function NewPluginPage() {
  return (
    <>
      <PageHeader
        title="Add a plugin"
        description="Enter an ID and press Check to pull the name and summary from that marketplace."
      />
      <PluginForm />
    </>
  )
}
