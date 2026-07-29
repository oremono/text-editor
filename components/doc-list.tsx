"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, MoreHorizontal, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DocumentMeta } from "@/lib/types";

/** Compact relative time for "last edited" labels. */
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const seconds = Math.floor((Date.now() - then) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString();
}

const ROLE_LABEL: Record<DocumentMeta["role"], string> = {
  owner: "Owner",
  editor: "Editor",
  viewer: "Viewer",
};

interface DocListSectionProps {
  heading: string;
  docs: DocumentMeta[];
  emptyMessage: string;
  /** Show the caller's role + owner name on each row (shared section). */
  showRoleBadge?: boolean;
  /** When provided, rows get a delete action behind a confirm dialog. */
  onDelete?: (doc: DocumentMeta) => Promise<void>;
}

export function DocListSection({
  heading,
  docs,
  emptyMessage,
  showRoleBadge = false,
  onDelete,
}: DocListSectionProps) {
  const [deleteTarget, setDeleteTarget] = useState<DocumentMeta | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete() {
    if (!deleteTarget || !onDelete) return;
    setDeleting(true);
    try {
      await onDelete(deleteTarget);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        {heading}
      </h2>

      {docs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-200 px-4 py-8 text-center text-sm text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
          {emptyMessage}
        </div>
      ) : (
        <ul className="divide-y divide-neutral-200 overflow-hidden rounded-lg border border-neutral-200 bg-white dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-950">
          {docs.map((doc) => (
            <li
              key={doc.id}
              className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900"
            >
              <FileText
                className="size-4 shrink-0 text-neutral-400"
                aria-hidden
              />
              <Link
                href={`/doc/${doc.id}`}
                className="flex min-w-0 flex-1 flex-col gap-0.5"
              >
                <span className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {doc.title}
                </span>
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  Edited {relativeTime(doc.updatedAt)}
                  {showRoleBadge ? ` · Owned by ${doc.ownerName}` : ""}
                </span>
              </Link>

              {showRoleBadge && (
                <Badge variant="secondary" className="shrink-0">
                  {ROLE_LABEL[doc.role]}
                </Badge>
              )}

              {onDelete && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0 text-neutral-500"
                      aria-label={`Actions for ${doc.title}`}
                    >
                      <MoreHorizontal className="size-4" aria-hidden />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() => setDeleteTarget(doc)}
                    >
                      <Trash2 className="size-4" aria-hidden />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </li>
          ))}
        </ul>
      )}

      {onDelete && (
        <Dialog
          open={deleteTarget !== null}
          onOpenChange={(open) => {
            if (!open && !deleting) setDeleteTarget(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete document?</DialogTitle>
              <DialogDescription>
                {deleteTarget
                  ? `"${deleteTarget.title}" will be permanently deleted. This cannot be undone.`
                  : ""}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={deleting}
                onClick={confirmDelete}
              >
                {deleting ? "Deleting…" : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </section>
  );
}
