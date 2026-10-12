import { client } from "@/lib/db"

let ready: Promise<void> | undefined

export function ensureDatabase() {
  ready ??= bootstrap().catch((error) => {
    ready = undefined
    throw error
  })
  return ready
}

// Append only: each entry runs once, in order, and is recorded in schema_migrations.
const migrations: string[][] = [
  [
      `create table if not exists user (id text primary key, name text not null, email text not null unique, emailVerified integer not null default 0, image text, createdAt integer not null, updatedAt integer not null)`,
      `create table if not exists session (id text primary key, expiresAt integer not null, token text not null unique, createdAt integer not null, updatedAt integer not null, ipAddress text, userAgent text, userId text not null references user(id) on delete cascade)`,
      `create table if not exists account (id text primary key, accountId text not null, providerId text not null, userId text not null references user(id) on delete cascade, accessToken text, refreshToken text, idToken text, accessTokenExpiresAt integer, refreshTokenExpiresAt integer, scope text, password text, createdAt integer not null, updatedAt integer not null)`,
      `create table if not exists verification (id text primary key, identifier text not null, value text not null, expiresAt integer not null, createdAt integer, updatedAt integer)`,
      `create table if not exists tracked_plugins (id text primary key default (lower(hex(randomblob(16)))), user_id text not null references user(id) on delete cascade, name text not null, slug text not null, description text, bstats_plugin_id text, is_demo integer not null default 0, created_at integer not null default (unixepoch()), updated_at integer not null default (unixepoch()))`,
      `create table if not exists platform_identifiers (id text primary key default (lower(hex(randomblob(16)))), plugin_id text not null references tracked_plugins(id) on delete cascade, platform text not null, external_id text not null, public_url text, unique(plugin_id, platform))`,
      `create table if not exists encrypted_credentials (id text primary key default (lower(hex(randomblob(16)))), user_id text not null references user(id) on delete cascade, platform text not null, encrypted_value text not null, label text, updated_at integer not null default (unixepoch()), unique(user_id, platform))`,
      `create table if not exists refresh_jobs (id text primary key default (lower(hex(randomblob(16)))), user_id text not null references user(id) on delete cascade, plugin_id text references tracked_plugins(id) on delete cascade, status text not null, started_at integer not null default (unixepoch()), finished_at integer, message text)`,
      `create table if not exists download_snapshots (id text primary key default (lower(hex(randomblob(16)))), plugin_id text not null references tracked_plugins(id) on delete cascade, platform text not null, downloads integer not null, followers integer, rating integer, captured_at integer not null default (unixepoch()))`,
      `create table if not exists version_snapshots (id text primary key default (lower(hex(randomblob(16)))), plugin_id text not null references tracked_plugins(id) on delete cascade, platform text not null, version text not null, downloads integer, release_date integer, captured_at integer not null default (unixepoch()))`,
      `create table if not exists bstats_chart_snapshots (id text primary key default (lower(hex(randomblob(16)))), plugin_id text not null references tracked_plugins(id) on delete cascade, chart_id text not null, label text not null, value integer not null, captured_at integer not null default (unixepoch()))`,
  ],
  [
    `alter table tracked_plugins add column long_description text`,
    `create table if not exists releases (id text primary key default (lower(hex(randomblob(16)))), plugin_id text not null references tracked_plugins(id) on delete cascade, version text not null, title text not null, changelog text not null default '', channel text not null default 'release', game_versions text not null default '[]', loaders text not null default '[]', artifact_name text, artifact_url text, created_at integer not null default (unixepoch()), unique(plugin_id, version))`,
    `create table if not exists release_targets (id text primary key default (lower(hex(randomblob(16)))), release_id text not null references releases(id) on delete cascade, platform text not null, status text not null, url text, message text, updated_at integer not null default (unixepoch()), unique(release_id, platform))`,
    `create table if not exists listing_syncs (id text primary key default (lower(hex(randomblob(16)))), plugin_id text not null references tracked_plugins(id) on delete cascade, platform text not null, status text not null, message text, synced_at integer not null default (unixepoch()), unique(plugin_id, platform))`,
    `create index if not exists download_snapshots_plugin_time on download_snapshots (plugin_id, captured_at)`,
    `create index if not exists bstats_snapshots_plugin_time on bstats_chart_snapshots (plugin_id, captured_at)`,
  ],
]

async function bootstrap() {
  await client.execute(`create table if not exists schema_migrations (id integer primary key, applied_at integer not null default (unixepoch()))`)
  const applied = await client.execute(`select id from schema_migrations`)
  const done = new Set(applied.rows.map((row) => Number(row.id)))

  for (const [index, statements] of migrations.entries()) {
    if (done.has(index)) continue
    await client.batch(
      [...statements.map((sql) => ({ sql, args: [] })), { sql: `insert into schema_migrations (id) values (?)`, args: [index] }],
      "write"
    )
  }
}
