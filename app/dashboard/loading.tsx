import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="flex flex-col gap-8" aria-busy="true">
      <Skeleton className="h-7 w-40" />
      <Skeleton className="h-24" />
      <Skeleton className="h-72" />
    </div>
  )
}
