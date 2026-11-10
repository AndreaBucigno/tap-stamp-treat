import { Coffee } from "lucide-react";
import { cn } from "@/lib/utils";

export function StampGrid({ stamps, total, light }: { stamps: number; total: number; light?: boolean }) {
  return (
    <div className="grid grid-cols-5 gap-2.5">
      {Array.from({ length: total }).map((_, i) => {
        const filled = i < stamps;
        return (
          <div
            key={i}
            className={cn(
              "flex aspect-square items-center justify-center rounded-full border-2 border-dashed",
              filled
                ? "animate-stamp border-transparent bg-stamp text-accent-foreground"
                : light
                  ? "border-primary-foreground/30 text-primary-foreground/30"
                  : "border-border bg-stamp-empty text-muted-foreground/50",
            )}
            style={filled ? { animationDelay: `${i * 40}ms` } : undefined}
          >
            <Coffee className="size-1/2" />
          </div>
        );
      })}
    </div>
  );
}
