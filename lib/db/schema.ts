import { relations, sql } from "drizzle-orm"
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core"

import { credentialKeys, platforms, releaseChannels } from "@/lib/providers/types"

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("emailVerified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
})

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
})

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: integer("accessTokenExpiresAt", { mode: "timestamp" }),
  refreshTokenExpiresAt: integer("refreshTokenExpiresAt", { mode: "timestamp" }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
})

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }),
  updatedAt: integer("updatedAt", { mode: "timestamp" }),
})

export const trackedPlugins = sqliteTable("tracked_plugins", {
  id: text("id").primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  longDescription: text("long_description"),
  bstatsPluginId: text("bstats_plugin_id"),
  isDemo: integer("is_demo", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
})

export const platformIdentifiers = sqliteTable(
  "platform_identifiers",
  {
    id: text("id").primaryKey().default(sql`(lower(hex(randomblob(16))))`),
    pluginId: text("plugin_id").notNull().references(() => trackedPlugins.id, { onDelete: "cascade" }),
    platform: text("platform", { enum: platforms }).notNull(),
    externalId: text("external_id").notNull(),
    publicUrl: text("public_url"),
  },
  (table) => [uniqueIndex("plugin_platform_unique").on(table.pluginId, table.platform)]
)

export const encryptedCredentials = sqliteTable(
  "encrypted_credentials",
  {
    id: text("id").primaryKey().default(sql`(lower(hex(randomblob(16))))`),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    platform: text("platform", { enum: credentialKeys }).notNull(),
    encryptedValue: text("encrypted_value").notNull(),
    label: text("label"),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (table) => [uniqueIndex("credential_user_platform_unique").on(table.userId, table.platform)]
)

export const refreshJobs = sqliteTable("refresh_jobs", {
  id: text("id").primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  pluginId: text("plugin_id").references(() => trackedPlugins.id, { onDelete: "cascade" }),
  status: text("status", { enum: ["success", "partial", "failed"] }).notNull(),
  startedAt: integer("started_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  finishedAt: integer("finished_at", { mode: "timestamp" }),
  message: text("message"),
})

export const downloadSnapshots = sqliteTable("download_snapshots", {
  id: text("id").primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  pluginId: text("plugin_id").notNull().references(() => trackedPlugins.id, { onDelete: "cascade" }),
  platform: text("platform", { enum: platforms }).notNull(),
  downloads: integer("downloads").notNull(),
  followers: integer("followers"),
  rating: integer("rating"),
  capturedAt: integer("captured_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
})

export const versionSnapshots = sqliteTable("version_snapshots", {
  id: text("id").primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  pluginId: text("plugin_id").notNull().references(() => trackedPlugins.id, { onDelete: "cascade" }),
  platform: text("platform", { enum: platforms }).notNull(),
  version: text("version").notNull(),
  downloads: integer("downloads"),
  releaseDate: integer("release_date", { mode: "timestamp" }),
  capturedAt: integer("captured_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
})

export const bstatsChartSnapshots = sqliteTable("bstats_chart_snapshots", {
  id: text("id").primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  pluginId: text("plugin_id").notNull().references(() => trackedPlugins.id, { onDelete: "cascade" }),
  chartId: text("chart_id").notNull(),
  label: text("label").notNull(),
  value: integer("value").notNull(),
  capturedAt: integer("captured_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
})

export const releases = sqliteTable(
  "releases",
  {
    id: text("id").primaryKey().default(sql`(lower(hex(randomblob(16))))`),
    pluginId: text("plugin_id").notNull().references(() => trackedPlugins.id, { onDelete: "cascade" }),
    version: text("version").notNull(),
    title: text("title").notNull(),
    changelog: text("changelog").notNull().default(""),
    channel: text("channel", { enum: releaseChannels }).notNull().default("release"),
    gameVersions: text("game_versions", { mode: "json" }).$type<string[]>().notNull().default([]),
    loaders: text("loaders", { mode: "json" }).$type<string[]>().notNull().default([]),
    artifactName: text("artifact_name"),
    artifactUrl: text("artifact_url"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (table) => [uniqueIndex("release_plugin_version_unique").on(table.pluginId, table.version)]
)

export const releaseTargets = sqliteTable(
  "release_targets",
  {
    id: text("id").primaryKey().default(sql`(lower(hex(randomblob(16))))`),
    releaseId: text("release_id").notNull().references(() => releases.id, { onDelete: "cascade" }),
    platform: text("platform", { enum: platforms }).notNull(),
    status: text("status", { enum: ["published", "manual", "failed"] }).notNull(),
    url: text("url"),
    message: text("message"),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (table) => [uniqueIndex("release_target_unique").on(table.releaseId, table.platform)]
)

export const listingSyncs = sqliteTable(
  "listing_syncs",
  {
    id: text("id").primaryKey().default(sql`(lower(hex(randomblob(16))))`),
    pluginId: text("plugin_id").notNull().references(() => trackedPlugins.id, { onDelete: "cascade" }),
    platform: text("platform", { enum: platforms }).notNull(),
    status: text("status", { enum: ["synced", "failed"] }).notNull(),
    message: text("message"),
    syncedAt: integer("synced_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (table) => [uniqueIndex("listing_sync_unique").on(table.pluginId, table.platform)]
)

export const trackedPluginsRelations = relations(trackedPlugins, ({ many }) => ({
  identifiers: many(platformIdentifiers),
  downloads: many(downloadSnapshots),
  versions: many(versionSnapshots),
  bstatsCharts: many(bstatsChartSnapshots),
}))
