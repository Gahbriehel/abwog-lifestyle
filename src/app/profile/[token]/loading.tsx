import { ChurchHeader } from "@/components/ui/Brand";
import { Skeleton } from "@/components/ui/Misc";
import { Screen } from "@/components/ui/Screen";

export default function Loading() {
  return (
    <Screen footer={false}>
      <ChurchHeader />
      <div role="status" aria-label="Loading your details" className="mt-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-2 h-4 w-60" />
        <div className="mt-10 space-y-4">
          <Skeleton className="h-6 w-28" />
          {[0, 1].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-12 w-full" />
            </div>
          ))}
          <Skeleton className="h-4 w-16" />
          <div className="grid grid-cols-3 gap-2">
            <Skeleton className="h-12 rounded-full" />
            <Skeleton className="h-12 rounded-full" />
            <Skeleton className="h-12 rounded-full" />
          </div>
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </Screen>
  );
}
