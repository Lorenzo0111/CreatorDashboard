"use client"

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"

import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { formatCompact, formatDay } from "@/lib/format"
import type { UsageHistoryPoint } from "@/lib/providers/bstats"

const config = {
  servers: { label: "Servers", color: "var(--chart-servers)" },
  players: { label: "Players", color: "var(--chart-players)" },
} satisfies ChartConfig

export function UsageChart({ data }: { data: UsageHistoryPoint[] }) {
  // When one count dwarfs the other, a shared scale flattens the smaller line, so each gets its own.
  const peakServers = Math.max(...data.map((point) => point.servers), 1)
  const peakPlayers = Math.max(...data.map((point) => point.players), 1)
  const split = Math.max(peakServers, peakPlayers) / Math.min(peakServers, peakPlayers) > 4
  const playersAxis = split ? "players" : "servers"

  return (
    <ChartContainer config={config} className="aspect-auto h-64 w-full px-2 pb-2">
      <LineChart accessibilityLayer data={data} margin={{ top: 16, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={32} tickFormatter={formatDay} />
        <YAxis yAxisId="servers" tickLine={false} axisLine={false} width={44} tickFormatter={formatCompact} domain={["auto", "auto"]} />
        {split ? (
          <YAxis yAxisId="players" orientation="right" tickLine={false} axisLine={false} width={44} tickFormatter={formatCompact} domain={["auto", "auto"]} />
        ) : null}
        <ChartTooltip content={<ChartTooltipContent labelFormatter={(value) => formatDay(String(value))} />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Line yAxisId="servers" dataKey="servers" type="monotone" stroke="var(--color-servers)" strokeWidth={2} dot={false} isAnimationActive={false} />
        <Line yAxisId={playersAxis} dataKey="players" type="monotone" stroke="var(--color-players)" strokeWidth={2} dot={false} isAnimationActive={false} />
      </LineChart>
    </ChartContainer>
  )
}
