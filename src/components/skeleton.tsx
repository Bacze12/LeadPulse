export function Skeleton({ lines = 5 }: { lines?: number }) {
  return (
    <div className="space-y-4">
      <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
      <div className="h-4 w-72 animate-pulse rounded bg-gray-100" />
      <div className="mt-6 space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-100" />
        ))}
      </div>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="space-y-4">
      <div className="h-24 animate-pulse rounded-lg bg-gray-100" />
      <div className="h-24 animate-pulse rounded-lg bg-gray-100" />
      <div className="h-24 animate-pulse rounded-lg bg-gray-100" />
    </div>
  );
}