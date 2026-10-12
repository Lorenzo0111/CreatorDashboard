"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

const tabs = [
  { segment: "", label: "Stats" },
  { segment: "/releases", label: "Releases" },
  { segment: "/listing", label: "Listing" },
  { segment: "/settings", label: "Settings" },
]

export function PluginTabs({ pluginId }: { pluginId: string }) {
  const pathname = usePathname()
  const base = `/dashboard/plugins/${pluginId}`

  return (
    <nav aria-label="Plugin sections" className="-mb-px flex gap-5 overflow-x-auto border-b">
      {tabs.map((tab) => {
        const href = `${base}${tab.segment}`
        const active = tab.segment ? pathname.startsWith(href) : pathname === base
        return (
          <Link
            key={tab.segment}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "border-b-2 pb-2.5 text-sm whitespace-nowrap outline-none focus-visible:text-primary",
              active
                ? "border-primary font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
