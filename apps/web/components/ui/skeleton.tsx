// apps/web/components/ui/skeleton.tsx
import { cn } from "@/utils/classNames";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted/50 dark:bg-muted/30",
        className,
      )}
      {...(props as any)}
    />
  );
}

export { Skeleton };
