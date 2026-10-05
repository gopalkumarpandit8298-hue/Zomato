const SKELETON_COUNT = 8;

function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
      <div className="aspect-[16/10] w-full animate-pulse bg-neutral-200" />
      <div className="space-y-2 p-4">
        <div className="h-4 w-2/3 animate-pulse rounded bg-neutral-200" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-neutral-200" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-neutral-200" />
      </div>
    </div>
  );
}

/** Placeholder grid shown while Firestore returns the first snapshot. */
export function RestaurantGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: SKELETON_COUNT }, (_, index) => (
        <CardSkeleton key={index} />
      ))}
    </div>
  );
}
