import { Marketplace, MarketplaceAdapter, ReleasePayload, Resource } from "../types";

function createAdapter(name: Marketplace): MarketplaceAdapter {
  return {
    name,
    async publishRelease(resource: Resource, payload: ReleasePayload) {
      await new Promise(r => setTimeout(r, 30));
      return { success: true, version: payload.version };
    },
    async fetchDownloads(resourceId: string, from: Date, to: Date) {
      const data: Array<{ date: string; downloads: number }> = [];
      const cursor = new Date(from);
      while (cursor <= to) {
        data.push({ date: cursor.toISOString().slice(0, 10), downloads: Math.floor(Math.random() * 15) });
        cursor.setDate(cursor.getDate() + 1);
      }
      return data;
    }
  };
}

export const hangarAdapter = createAdapter(Marketplace.HangarMC);
export const builtByBitAdapter = createAdapter(Marketplace.BuiltByBit);
export const spigotAdapter = createAdapter(Marketplace.SpigotMC);
export const modrinthAdapter = createAdapter(Marketplace.Modrinth);
export const craftBukkitAdapter = createAdapter(Marketplace.CraftBukkit);
