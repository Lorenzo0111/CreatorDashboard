"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { BoxesIcon, KeyRoundIcon, LayoutDashboardIcon, LogOutIcon, PlusIcon } from "lucide-react"

import { ThemeToggle } from "@/components/dashboard/theme-toggle"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { authClient } from "@/lib/auth-client"
import { formatCompact } from "@/lib/format"

const items = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboardIcon, exact: true },
  { href: "/dashboard/plugins", label: "Plugins", icon: BoxesIcon, exact: true },
  { href: "/dashboard/integrations", label: "Integrations", icon: KeyRoundIcon },
]

export type SidebarPlugin = { id: string; name: string; downloads: number }

export function AppSidebar({ plugins, email }: { plugins: SidebarPlugin[]; email: string }) {
  const pathname = usePathname()
  const router = useRouter()

  async function signOut() {
    await authClient.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg">
              <Link href="/dashboard">
                <span aria-hidden className="grid size-8 shrink-0 grid-cols-2 gap-0.5 rounded-md bg-primary p-1.5">
                  <span className="rounded-[1px] bg-primary-foreground" />
                  <span className="rounded-[1px] bg-primary-foreground/40" />
                  <span className="rounded-[1px] bg-primary-foreground/40" />
                  <span className="rounded-[1px] bg-primary-foreground" />
                </span>
                <span className="font-semibold tracking-tight">Creator Dashboard</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.label}
                    isActive={item.exact ? pathname === item.href : pathname.startsWith(item.href)}
                  >
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>Your plugins</SidebarGroupLabel>
          <SidebarGroupAction asChild title="Add a plugin">
            <Link href="/dashboard/plugins/new">
              <PlusIcon />
              <span className="sr-only">Add a plugin</span>
            </Link>
          </SidebarGroupAction>
          <SidebarGroupContent>
            <SidebarMenu>
              {plugins.map((plugin) => (
                <SidebarMenuItem key={plugin.id}>
                  <SidebarMenuButton asChild isActive={pathname.startsWith(`/dashboard/plugins/${plugin.id}`)}>
                    <Link href={`/dashboard/plugins/${plugin.id}`}>
                      <span>{plugin.name}</span>
                    </Link>
                  </SidebarMenuButton>
                  <SidebarMenuBadge className="num text-muted-foreground">{formatCompact(plugin.downloads)}</SidebarMenuBadge>
                </SidebarMenuItem>
              ))}
              {plugins.length === 0 ? (
                <p className="px-2 py-1.5 text-sm text-muted-foreground">None yet.</p>
              ) : null}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <ThemeToggle />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Sign out" onClick={signOut}>
              <LogOutIcon />
              <span className="truncate">Sign out {email}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
