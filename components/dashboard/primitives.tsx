import { cn } from "@/lib/utils"
import { formatDate, formatSigned } from "@/lib/format"
import { platformMeta } from "@/lib/platforms"
import type { Platform } from "@/lib/providers/types"
import type { Delta } from "@/lib/queries"

export function PageHeader({
  title,
  description,
  children,
}: {
  title: string
  description?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="mt-1 max-w-[70ch] text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {children ? <div className="flex shrink-0 items-center gap-2">{children}</div> : null}
    </div>
  )
}

/** A titled block of content. Sections are separated by space and a rule, not boxed into cards. */
export function Section({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string
  description?: React.ReactNode
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <h2 className="text-sm font-semibold">{title}</h2>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

export function Panel({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("rounded-lg border bg-card", className)} {...props} />
}

export function PlatformMark({ platform, className }: { platform: Platform; className?: string }) {
  const meta = platformMeta[platform]
  return (
    <span className={cn("inline-flex items-center gap-2 whitespace-nowrap", className)}>
      <span aria-hidden className="size-2 shrink-0 rounded-[2px]" style={{ background: meta.color }} />
      {meta.label}
    </span>
  )
}

const tones = {
  success: "bg-success",
  published: "bg-success",
  synced: "bg-success",
  partial: "bg-warning",
  manual: "bg-warning",
  failed: "bg-destructive",
  idle: "bg-muted-foreground/40",
} as const

const toneLabels: Record<keyof typeof tones, string> = {
  success: "OK",
  published: "Published",
  synced: "Synced",
  partial: "Partly failed",
  manual: "Finish by hand",
  failed: "Failed",
  idle: "Not yet",
}

export function Status({
  tone,
  children,
  className,
}: {
  tone: keyof typeof tones
  children?: React.ReactNode
  className?: string
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap text-sm", className)}>
      <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", tones[tone])} />
      {children ?? toneLabels[tone]}
    </span>
  )
}

export function DeltaValue({ delta, className }: { delta: Delta | null; className?: string }) {
  if (!delta) return <span className={cn("text-muted-foreground", className)}>–</span>
  return (
    <span
      className={cn("num", delta.value > 0 ? "text-success" : "text-muted-foreground", className)}
      title={delta.complete ? undefined : `Snapshots only go back to ${formatDate(delta.since)}`}
    >
      {formatSigned(delta.value)}
      {delta.complete ? null : <span className="text-muted-foreground">*</span>}
    </span>
  )
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string
  children?: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <Panel className="flex flex-col items-start gap-3 px-5 py-8">
      <div>
        <p className="text-sm font-medium">{title}</p>
        {children ? <p className="mt-1 max-w-[60ch] text-sm text-muted-foreground">{children}</p> : null}
      </div>
      {action}
    </Panel>
  )
}

export function Stat({
  label,
  value,
  detail,
}: {
  label: string
  value: React.ReactNode
  detail?: React.ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1 bg-card px-4 py-3.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="num text-2xl font-semibold tracking-tight">{value}</dd>
      {detail ? <dd className="text-xs text-muted-foreground">{detail}</dd> : null}
    </div>
  )
}

/** A row of headline figures sharing one frame, divided by rules. */
export function StatRail({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <dl
      className={cn(
        "grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-3 lg:auto-cols-fr lg:grid-flow-col lg:grid-cols-none",
        "max-sm:[&>*:last-child:nth-child(odd)]:col-span-2",
        className
      )}
    >
      {children}
    </dl>
  )
}
