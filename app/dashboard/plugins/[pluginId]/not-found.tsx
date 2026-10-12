import Link from "next/link"

import { EmptyState } from "@/components/dashboard/primitives"
import { Button } from "@/components/ui/button"

export default function PluginNotFound() {
  return (
    <EmptyState
      title="That plugin is not here"
      action={
        <Button asChild variant="outline">
          <Link href="/dashboard/plugins">See all plugins</Link>
        </Button>
      }
    >
      It may have been removed, or the link is wrong.
    </EmptyState>
  )
}
