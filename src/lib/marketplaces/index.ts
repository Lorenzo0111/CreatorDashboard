import { polymartAdapter } from "./adapters/polymart";
import { builtByBitAdapter, craftBukkitAdapter, hangarAdapter, modrinthAdapter, spigotAdapter } from "./adapters/generic";
import { MarketplaceAdapter } from "./types";

export const adapters: MarketplaceAdapter[] = [
  polymartAdapter,
  hangarAdapter,
  builtByBitAdapter,
  spigotAdapter,
  modrinthAdapter,
  craftBukkitAdapter,
];

export * from "./types";