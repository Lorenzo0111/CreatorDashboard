import { builtByBitAdapter } from "@/lib/providers/builtbybit"
import { curseforgeAdapter } from "@/lib/providers/curseforge"
import { githubAdapter } from "@/lib/providers/github"
import { hangarAdapter } from "@/lib/providers/hangar"
import { modrinthAdapter } from "@/lib/providers/modrinth"
import { spigetAdapter } from "@/lib/providers/spiget"
import type { Platform, ProviderAdapter } from "@/lib/providers/types"

export const providerAdapters: Record<Platform, ProviderAdapter> = {
  modrinth: modrinthAdapter,
  hangar: hangarAdapter,
  spigot: spigetAdapter,
  curseforge: curseforgeAdapter,
  builtbybit: builtByBitAdapter,
  github: githubAdapter,
}

export type { Platform } from "@/lib/providers/types"
