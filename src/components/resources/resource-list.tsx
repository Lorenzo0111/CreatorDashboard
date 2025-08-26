"use client";
import Link from "next/link";
import { useResources } from "@/hooks/use-resources";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AppShell } from "@/components/layout/app-shell";

export function ResourceListPage() {
  const { data, isLoading } = useResources();
  return (
    <AppShell>
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Resources</h1>
        {isLoading && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data?.map(r => (
            <Link href={`/resources/${r.id}`} key={r.id}>
              <Card className="h-full transition hover:shadow">
                <CardHeader>
                  <CardTitle className="text-base">{r.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="line-clamp-3 text-sm text-muted-foreground">{r.description}</p>
                  <p className="mt-2 text-xs text-muted-foreground">v{r.latestVersion}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}