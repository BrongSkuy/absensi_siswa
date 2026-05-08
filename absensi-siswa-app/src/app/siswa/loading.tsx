export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-2 border-b pb-4">
        <div className="h-8 w-64 rounded-md bg-muted/60"></div>
        <div className="h-4 w-96 rounded-md bg-muted/40"></div>
      </div>

      {/* Stats/Filter Bar Skeleton */}
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-muted/50 border border-border/50"></div>
        ))}
      </div>

      {/* Main Content Area Skeleton */}
      <div className="rounded-xl border bg-card">
        <div className="p-6 border-b">
          <div className="h-6 w-48 rounded-md bg-muted/60"></div>
        </div>
        <div className="p-6 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 w-full rounded-md bg-muted/40"></div>
          ))}
        </div>
      </div>
    </div>
  );
}
