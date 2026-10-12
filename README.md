<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="media/banner-dark.png" />
  <img src="media/banner-light.png" alt="Creator Dashboard" width="480" />
</picture>

[![GitHub Release](https://img.shields.io/github/v/release/Lorenzo0111/CreatorDashboard)](https://github.com/Lorenzo0111/CreatorDashboard/releases/latest)
[![GitHub Stars](https://img.shields.io/github/stars/Lorenzo0111/CreatorDashboard)](https://github.com/Lorenzo0111/CreatorDashboard/stargazers)
[![Discord](https://img.shields.io/discord/1088775598337433662)](https://discord.gg/HT47UQXBqG)

  <hr />

<a href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FLorenzo0111%2FCreatorDashboard&env=DATABASE_URL,DATABASE_AUTH_TOKEN,BETTER_AUTH_SECRET,BETTER_AUTH_URL,CREDENTIAL_ENCRYPTION_KEY,CRON_SECRET"><img height="32" src="https://vercel.com/button" alt="Deploy to Vercel" /></a>

</div>

## What is Creator Dashboard

Creator Dashboard is one place to watch and run your plugins across Modrinth, Hangar, SpigotMC, CurseForge, BuiltByBit and GitHub.

- **Stats**: downloads per marketplace, 7- and 30-day change, new downloads per day, live server and player counts from bStats, and a table showing which marketplace is still on an old version.
- **Releases**: write a changelog once, attach the jar, and publish to every marketplace that accepts uploads.
- **Listings**: keep one summary and description and push them to the marketplaces that allow it.

> ⚠️ It is built for a single owner. The first account created owns the install and sign-up closes after that.

## Marketplaces

| Marketplace | Stats                           | Publish a release                              | Edit the listing         |
| ----------- | ------------------------------- | ---------------------------------------------- | ------------------------ |
| Modrinth    | no key                          | uploads the file as a version                  | summary and description  |
| Hangar      | no key                          | uploads the file as a version                  | main page                |
| SpigotMC    | no key (via Spiget)             | by hand, link provided                         | by hand, link provided   |
| CurseForge  | API key                         | uploads the file (separate upload token)       | by hand                  |
| BuiltByBit  | API key                         | posts the changelog as an update; file by hand | tag line and description |
| GitHub      | no key (token lifts rate limit) | creates a release and attaches the file        | repository description   |

Text is written in Markdown. BuiltByBit and SpigotMC use BBCode, so `lib/bbcode.ts` converts in both directions: drafts are converted on the way out to BuiltByBit, the listing and release screens can copy BBCode for pasting into SpigotMC, and pasted BBCode can be converted back to Markdown.

Publishing and listing edits write to third-party sites and cannot be undone from the dashboard, so both ask for confirmation first.

## Deploying

You'll have to set the following environment variables, here is a list of them:

| Key                       | Description                                          | Example                          |
| ------------------------- | ---------------------------------------------------- | -------------------------------- |
| DATABASE_URL              | Local SQLite file or Turso database url              | file:./data/creator-dashboard.db |
| DATABASE_AUTH_TOKEN       | Turso auth token, empty for a local file             |                                  |
| BETTER_AUTH_SECRET        | Session secret, at least 32 random characters        | `openssl rand -base64 32`        |
| BETTER_AUTH_URL           | The url the dashboard is served from                 | http://localhost:3000            |
| CREDENTIAL_ENCRYPTION_KEY | Encrypts marketplace keys at rest, a separate secret |                                  |
| CRON_SECRET               | Protects `/api/cron/refresh`                         |                                  |

> ⚠️ Changing `CREDENTIAL_ENCRYPTION_KEY` makes the saved marketplace keys unreadable.

### Serverless

You can deploy the project to Vercel by clicking the button above. You will also need a [Turso](https://turso.tech) database: create one and set `DATABASE_URL` (`libsql://…`) and `DATABASE_AUTH_TOKEN`.

`vercel.json` schedules `/api/cron/refresh` once a day, which is the most the Hobby plan allows. On Pro you can raise it, for example `0 */6 * * *`.

> ⚡ Vercel rejects request bodies over 4.5 MB. For larger jars, give the release form a URL to the file (a GitHub release asset works) and the server fetches it.

### Selfhosting

If you want to selfhost, copy `.env.example` to `.env`, fill in the secrets and run `bun install`, `bun run build` and `bun run start` to start the program. Use `bun run dev` while developing.

The dashboard will usually be available [here](http://localhost:3000), where you create the owner account. Tables are created on first start; schema changes live in `lib/db/bootstrap.ts` as an append-only list of migrations.

### Refreshing stats

Any scheduler can trigger a refresh:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://your-host/api/cron/refresh
```

## Project layout

- `app/dashboard` – pages. `app/actions` – server actions.
- `lib/providers` – one adapter per marketplace: reading stats, publishing, editing listings.
- `lib/queries.ts` – totals, deltas and the daily series, all derived from stored snapshots.
- `lib/refresh.ts` – takes a snapshot of every linked marketplace.

## Support

If you need help, feel free to join the [Discord Server](https://discord.gg/HT47UQXBqG) or open an issue.
