"use client"

import { useMemo, useState } from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { formatCompact, formatDay } from "@/lib/format"
import { platformMeta } from "@/lib/platforms"
import { platforms } from "@/lib/providers/types"
import type { DailyPoint } from "@/lib/queries"
import { cn } from "@/lib/utils"

const ranges = [30, 90] as const

export function DownloadsChart({ data, className }: { data: DailyPoint[]; className?: string }) {
  const [range, setRange] = useState<(typeof ranges)[number]>(30)

  const shown = useMemo(() => data.slice(-range), [data, range])
  const active = useMemo(
    () => platforms.filter((platform) => shown.some((point) => point[platform] !== undefined)),
    [shown]
  )
  const config = useMemo(
    () =>
      Object.fromEntries(
        active.map((platform) => [platform, { label: platformMeta[platform].label, color: platformMeta[platform].color }])
      ) satisfies ChartConfig,
    [active]
  )

  if (!active.length) {
    return (
      <div className={cn("flex h-64 items-center justify-center px-6 text-center text-sm text-muted-foreground", className)}>
        Daily downloads appear after the second snapshot. Refresh again tomorrow, or let the scheduled refresh do it.
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="flex justify-end px-4 pt-3">
        <div className="inline-flex rounded-md border p-0.5 text-xs" role="group" aria-label="Range">
          {ranges.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={range === option}
              onClick={() => setRange(option)}
              className={cn(
                "rounded-[5px] px-2 py-1 outline-none focus-visible:ring-2 focus-visible:ring-ring",
                range === option ? "bg-secondary font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {option} days
            </button>
          ))}
        </div>
      </div>
      <ChartContainer config={config} className="aspect-auto h-64 w-full px-2 pb-2">
        <BarChart accessibilityLayer data={shown} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={32} tickFormatter={formatDay} />
          <YAxis tickLine={false} axisLine={false} width={44} tickFormatter={formatCompact} allowDecimals={false} />
          <ChartTooltip cursor={{ fill: "var(--muted)" }} content={<ChartTooltipContent labelFormatter={(value) => formatDay(String(value))} />} />
          <ChartLegend content={<ChartLegendContent />} />
          {active.map((platform, index) => (
            <Bar
              key={platform}
              dataKey={platform}
              stackId="downloads"
              fill={`var(--color-${platform})`}
              radius={index === active.length - 1 ? [2, 2, 0, 0] : 0}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ChartContainer>
    </div>
  )
}
