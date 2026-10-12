import type { CredentialKey, Platform } from "@/lib/providers/types"

export type PlatformMeta = {
  label: string
  /** Brand colour, used to tell series apart in charts and tables. */
  color: string
  idLabel: string
  idHint: string
  idExample: string
  /** The site formats text as BBCode rather than Markdown. */
  bbcode?: boolean
}

export const platformMeta: Record<Platform, PlatformMeta> = {
  modrinth: {
    label: "Modrinth",
    color: "#1bd96a",
    idLabel: "Project slug or ID",
    idHint: "The last part of the project URL.",
    idExample: "qualityarmory",
  },
  hangar: {
    label: "Hangar",
    color: "#3371e0",
    idLabel: "Project slug",
    idHint: "The project name in the Hangar URL.",
    idExample: "QualityArmory",
  },
  spigot: {
    label: "SpigotMC",
    color: "#ed8106",
    idLabel: "Resource ID",
    idHint: "The number at the end of the resource URL.",
    idExample: "47561",
    bbcode: true,
  },
  curseforge: {
    label: "CurseForge",
    color: "#f16436",
    idLabel: "Project ID",
    idHint: "Shown in the About box on the project page.",
    idExample: "278412",
  },
  builtbybit: {
    label: "BuiltByBit",
    color: "#8f6fe8",
    idLabel: "Resource ID",
    idHint: "The number at the end of the resource URL.",
    idExample: "12345",
    bbcode: true,
  },
  github: {
    label: "GitHub",
    color: "#8b949e",
    idLabel: "Repository",
    idHint: "Written as owner/repo.",
    idExample: "Lorenzo0111/QualityArmory",
  },
}

export type CredentialMeta = {
  label: string
  platform: Platform
  /** What the dashboard can do once this credential is saved. */
  unlocks: string
  /** Stats work without it. */
  optionalForStats: boolean
  createUrl: string
}

export const credentialMeta: Record<CredentialKey, CredentialMeta> = {
  modrinth: {
    label: "Modrinth personal access token",
    platform: "modrinth",
    unlocks: "Publish versions and edit the listing. Needs the “Create versions” and “Write projects” scopes.",
    optionalForStats: true,
    createUrl: "https://modrinth.com/settings/pats",
  },
  hangar: {
    label: "Hangar API key",
    platform: "hangar",
    unlocks: "Publish versions and edit the main page. Needs “create_version” and “edit_page”.",
    optionalForStats: true,
    createUrl: "https://hangar.papermc.io/auth/settings/api-keys",
  },
  spigot: {
    label: "SpigotMC",
    platform: "spigot",
    unlocks: "",
    optionalForStats: true,
    createUrl: "",
  },
  curseforge: {
    label: "CurseForge API key",
    platform: "curseforge",
    unlocks: "Read download stats and files.",
    optionalForStats: false,
    createUrl: "https://console.curseforge.com/#/api-keys",
  },
  "curseforge-upload": {
    label: "CurseForge upload token",
    platform: "curseforge",
    unlocks: "Upload files. CurseForge issues this separately from the API key.",
    optionalForStats: true,
    createUrl: "https://authors-old.curseforge.com/account/api-tokens",
  },
  builtbybit: {
    label: "BuiltByBit API key",
    platform: "builtbybit",
    unlocks: "Read stats, post updates and edit the listing. Use a private key.",
    optionalForStats: false,
    createUrl: "https://builtbybit.com/account/api",
  },
  github: {
    label: "GitHub token",
    platform: "github",
    unlocks: "Create releases and edit the repository description. Needs “Contents” and “Administration” write access on the repo. Also lifts the anonymous rate limit.",
    optionalForStats: true,
    createUrl: "https://github.com/settings/personal-access-tokens",
  },
}

export const loaders = ["paper", "spigot", "bukkit", "purpur", "folia", "velocity", "bungeecord", "waterfall"] as const

export const BSTATS_COLORS = { servers: "var(--chart-servers)", players: "var(--chart-players)" } as const
