"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Resource } from "@/lib/marketplaces";

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export function useResources() {
  return useQuery({
    queryKey: ["resources"],
    queryFn: async () => {
      const data = await fetchJSON<{ resources: Resource[] }>("/api/resources");
      return data.resources;
    }
  });
}

export function useResource(id: string) {
  return useQuery({
    queryKey: ["resource", id],
    queryFn: async () => fetchJSON<Resource>(`/api/resources/${id}`),
    enabled: !!id,
  });
}

export function useUpdateResource(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { description: string }) =>
      fetchJSON<Resource>(`/api/resources/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["resource", id] });
      qc.invalidateQueries({ queryKey: ["resources"] });
    }
  });
}

export function useRelease(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { version: string }) =>
      fetchJSON<Resource>(`/api/resources/${id}/release`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["resource", id] });
      qc.invalidateQueries({ queryKey: ["resources"] });
    }
  });
}