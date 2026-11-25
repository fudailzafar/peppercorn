import { Icons } from "@/components/icons";
import { download } from "@/lib/release";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

const badge =
  "inline-flex select-none items-center gap-3 rounded-xl border bg-black px-4 py-2 text-left text-white dark:border-black/10 dark:bg-white dark:text-black";

function Words({ small, large }: { small: string; large: string }) {
  return (
    <>
      <Icons.logo className="h-7 w-auto" />
      <span className="flex flex-col leading-tight">
        <span className="text-[11px] font-medium opacity-80">{small}</span>
        <span className="text-xl font-semibold tracking-tight">{large}</span>
      </span>
    </>
  );
}

/** Downloads the app. Until there is a file, it only says that it's coming. */
export function DownloadBadge({ className }: { className?: string }) {
  if (!download) {
    return (
      <div className={cn(badge, className)}>
        <Words small="Coming soon for" large="Android" />
      </div>
    );
  }
  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <a href={download.href} download className={cn(badge, "transition-opacity hover:opacity-85")}>
        <Words small="Download for" large="Android" />
      </a>
      <span className="text-xs text-muted-foreground">{download.about}</span>
    </div>
  );
}

/** Opens the browser version. */
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
