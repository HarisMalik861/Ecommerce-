export default function TrendsLoading() {
  return (
    <div className="space-y-10 pb-20">
      <div className="space-y-4">
        <div className="h-6 w-28 animate-pulse rounded-full bg-muted" />
        <div className="h-14 max-w-md animate-pulse rounded-xl bg-muted" />
        <div className="h-5 max-w-lg animate-pulse rounded-lg bg-muted/70" />
      </div>
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-72 animate-pulse rounded-2xl border border-border bg-muted/40"
          />
        ))}
      </div>
    </div>
  );
}
