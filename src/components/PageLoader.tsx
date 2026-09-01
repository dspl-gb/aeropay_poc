import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

export function PageLoader({
  className,
  label = "Loading...",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <div className={cn("flex min-h-[40vh] flex-col items-center justify-center gap-3", className)}>
      <Loader2 className="size-7 animate-spin text-primary" aria-hidden />
      <p className="text-sm text-muted-foreground" role="status">
        {label}
      </p>
    </div>
  );
}
