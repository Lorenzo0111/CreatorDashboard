"use client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { StatPoint, Marketplace } from "@/lib/marketplaces";

interface Props { data: StatPoint[] }

const colors: Record<Marketplace, string> = {
  polymart: "#6366f1",
  hangarmc: "#06b6d4",
  builtbybit: "#f59e0b",
  spigotmc: "#10b981",
  modrinth: "#8b5cf6",
  craftbukkit: "#ef4444",
} as any;

export function DownloadLineChart({ data }: Props) {
  const keys = new Set<Marketplace>();
  data.forEach(p => Object.keys(p.downloads).forEach(k => keys.add(k as Marketplace)));
  const flat = data.map(d => ({ date: d.date, ...d.downloads }));
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={flat} margin={{ left: 12, right: 12, top: 12 }}>
        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Legend />
        {[...keys].map(k => (
          <Line
            key={k}
            type="monotone"
            dataKey={k}
            stroke={colors[k] || "#888"}
            dot={false}
            strokeWidth={2}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}