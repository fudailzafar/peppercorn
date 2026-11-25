import { cn } from "@/lib/utils";
import { Icons } from "@/components/icons";
import { ChevronRight } from "lucide-react";

/** Until Peppercorn is on the Play Store there is nothing to link to, so this only says so. */
export function StoreBadge({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "inline-flex select-none items-center gap-3 rounded-xl border bg-black px-4 py-2 text-left text-white dark:border-black/10 dark:bg-white dark:text-black",
        className
      )}
    >
      <Icons.logo className="h-7 w-auto" />
      <span className="flex flex-col leading-tight">
        <span className="text-[11px] font-medium opacity-80">
          Coming soon to the
        </span>
        <span className="text-xl font-semibold tracking-tight">Play Store</span>
      </span>
    </div>
  );
}

/** Opens the browser version, for trying it before it is on the Play Store. */
export function TryIt({ className }: { className?: string }) {
  return (
    <a
      href="/app"
      className={cn(
        "group inline-flex items-center text-sm font-medium text-primary hover:underline underline-offset-4",
        className
      )}
    >
      Try it in your browser
      <ChevronRight className="ml-1 size-4 transition-all duration-300 ease-out group-hover:translate-x-1" />
    </a>
  );
}
