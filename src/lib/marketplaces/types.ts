export enum Marketplace {
  Polymart = "polymart",
  HangarMC = "hangarmc",
  BuiltByBit = "builtbybit",
  SpigotMC = "spigotmc",
  Modrinth = "modrinth",
  CraftBukkit = "craftbukkit",
}

export interface Resource {
  id: string;
  name: string;
  slug: string;
  description: string;
  marketplaces: Marketplace[];
  latestVersion: string;
  createdAt: string; // ISO date
  updatedAt: string; // ISO date
}

export interface ReleasePayload {
  version: string;
  changelog: string;
  marketplaces: Marketplace[];
}

export interface StatPoint {
  date: string; // ISO date day precision
  downloads: Record<Marketplace, number>;
}

export interface MarketplaceAdapter {
  name: Marketplace;
  publishRelease: (resource: Resource, payload: ReleasePayload) => Promise<{ success: boolean; version: string }>; // simulate
  fetchDownloads: (resourceId: string, from: Date, to: Date) => Promise<Array<{ date: string; downloads: number }>>;
}
