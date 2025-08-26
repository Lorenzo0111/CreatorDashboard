"use client";
import { useQuery } from "@tanstack/react-query";
import { StatPoint } from "@/lib/marketplaces";

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export function useGlobalStats() {
  return useQuery({
    queryKey: ["stats", "global"],
    queryFn: async () => {
      const data = await fetchJSON<{ stats: StatPoint[] }>("/api/stats/global");
      return data.stats;
    }
  });
}

export function useResourceStats(id: string) {
  return useQuery({
    queryKey: ["stats", "resource", id],
    enabled: !!id,
    queryFn: async () => {
      const data = await fetchJSON<{ stats: StatPoint[] }>(`/api/stats/resource/${id}`);
      return data.stats;
    }
  });
}