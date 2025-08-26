import { Marketplace, MarketplaceAdapter, ReleasePayload, Resource } from "../types";

export const polymartAdapter: MarketplaceAdapter = {
  name: Marketplace.Polymart,
  async publishRelease(resource: Resource, payload: ReleasePayload) {
    await new Promise(r => setTimeout(r, 50));
    return { success: true, version: payload.version };
  },
  async fetchDownloads(resourceId: string, from: Date, to: Date) {
    // mock random data per day
    const data: Array<{ date: string; downloads: number }> = [];
    const cursor = new Date(from);
    while (cursor <= to) {
      data.push({ date: cursor.toISOString().slice(0, 10), downloads: Math.floor(Math.random() * 20) });
      cursor.setDate(cursor.getDate() + 1);
    }
    return data;
  }
};