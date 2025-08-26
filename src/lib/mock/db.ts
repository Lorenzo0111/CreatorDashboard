import { Marketplace, Resource, StatPoint } from "@/lib/marketplaces";

const resources: Resource[] = [
  {
    id: "r1",
    name: "TeleportPlus",
    slug: "teleport-plus",
    description: "Advanced teleportation plugin",
    marketplaces: [Marketplace.Polymart, Marketplace.SpigotMC, Marketplace.Modrinth],
    latestVersion: "1.0.0",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 40).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "r2",
    name: "EconomyX",
    slug: "economy-x",
    description: "Robust economy management",
    marketplaces: [Marketplace.BuiltByBit, Marketplace.SpigotMC],
    latestVersion: "2.3.1",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 90).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

function randomDownloads(base: number) {
  return Math.max(0, Math.round(base + (Math.random() - 0.5) * base * 0.4));
}

const stats: Record<string, StatPoint[]> = {};

function seedStats() {
  const today = new Date();
  const start = new Date(Date.now() - 1000 * 60 * 60 * 24 * 60); // 60 days
  for (const r of resources) {
    const arr: StatPoint[] = [];
    const cursor = new Date(start);
    while (cursor <= today) {
      const downloads: any = {};
      for (const m of r.marketplaces) {
        downloads[m] = randomDownloads(20);
      }
      arr.push({ date: cursor.toISOString().slice(0, 10), downloads });
      cursor.setDate(cursor.getDate() + 1);
    }
    stats[r.id] = arr;
  }
}
seedStats();

export const db = {
  listResources(): Resource[] { return resources; },
  getResource(id: string) { return resources.find(r => r.id === id) || null; },
  updateResource(id: string, data: Partial<Pick<Resource, "description" | "name">>) {
    const r = resources.find(r => r.id === id);
    if (!r) return null;
    Object.assign(r, data, { updatedAt: new Date().toISOString() });
    return r;
  },
  addRelease(id: string, version: string) {
    const r = resources.find(r => r.id === id);
    if (!r) return null;
    r.latestVersion = version;
    r.updatedAt = new Date().toISOString();
    return r;
  },
  getStats(id: string) { return stats[id] || []; },
  getGlobalStats(): StatPoint[] {
    // merge by date
    const merged: Record<string, StatPoint> = {};
    for (const arr of Object.values(stats)) {
      for (const p of arr) {
        if (!merged[p.date]) merged[p.date] = { date: p.date, downloads: {} as any };
        for (const [mk, val] of Object.entries(p.downloads) as [keyof typeof p.downloads, number][]) {
          const key = mk as unknown as Marketplace;
          merged[p.date].downloads[key] = (merged[p.date].downloads[key] || 0) + val;
        }
      }
    }
    return Object.values(merged).sort((a, b) => a.date.localeCompare(b.date));
  }
};