const whole = new Intl.NumberFormat("en-US")
const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 })
const day = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
const fullDay = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
const relative = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" })

export function formatNumber(value: number | null | undefined) {
  return value === null || value === undefined ? "–" : whole.format(value)
}

export function formatCompact(value: number) {
  return compact.format(value)
}

export function formatSigned(value: number) {
  return `${value > 0 ? "+" : value < 0 ? "−" : ""}${whole.format(Math.abs(value))}`
}

export function formatDay(value: Date | string) {
  return day.format(typeof value === "string" ? new Date(value) : value)
}

export function formatDate(value: Date | null | undefined) {
  return value ? fullDay.format(value) : "–"
}

export function formatRelative(value: Date, now = Date.now()) {
  const seconds = Math.round((value.getTime() - now) / 1000)
  const steps: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ]
  for (const [unit, size] of steps) {
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit)
  }
  return "just now"
}
