import { redirect } from "next/navigation"

import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { getCurrentUser } from "@/lib/auth"
import { getPluginStats } from "@/lib/queries"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  const plugins = await getPluginStats(user.id)

  return (
    <SidebarProvider>
      <AppSidebar
        email={user.email}
        plugins={plugins.map((plugin) => ({ id: plugin.id, name: plugin.name, downloads: plugin.totalDownloads }))}
      />
      <SidebarInset>
        <div className="flex h-11 items-center border-b px-3 md:hidden">
          <SidebarTrigger />
        </div>
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
