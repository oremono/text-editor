"use client";

import { CircleAlert, CloudCheck, LoaderCircle } from "lucide-react";

import { cn } from "@/lib/utils";

export type SaveState = "idle" | "saving" | "saved" | "error";

/**
 * Small status pill for the editor header (see CONTRACTS.md §5).
 * idle → nothing to say (renders a subtle placeholder to avoid layout shift),
 * saving → spinner, saved → check, error → red alert.
 */
export function SaveIndicator({ state }: { state: SaveState }) {
  return (
    <span
      role="status"
      aria-live="polite"
      className={cn(
        "inline-flex min-w-20 items-center justify-end gap-1.5 text-xs font-medium transition-colors",
        state === "error" ? "text-destructive" : "text-muted-foreground"
      )}
    >
      {state === "saving" && (
        <>
          <LoaderCircle className="size-3.5 animate-spin" aria-hidden />
          Saving…
        </>
      )}
      {state === "saved" && (
        <>
          <CloudCheck className="size-3.5" aria-hidden />
          Saved
        </>
      )}
      {state === "error" && (
        <>
          <CircleAlert className="size-3.5" aria-hidden />
          Save failed
        </>
      )}
    </span>
  );
}
