"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2, LogOut, Plus } from "lucide-react";
import { toast } from "sonner";
import { DocListSection } from "@/components/doc-list";
import { Button } from "@/components/ui/button";
import { UploadButton } from "@/components/upload-button";
import { apiFetch, clearSessionUser, getSessionUser } from "@/lib/session";
import type { DocumentFull, DocumentMeta, User } from "@/lib/types";

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [docs, setDocs] = useState<DocumentMeta[] | null>(null);
  const [creating, setCreating] = useState(false);

  // Auth guard: no session → /login.
  useEffect(() => {
    const sessionUser = getSessionUser();
    if (!sessionUser) {
      router.replace("/login");
      return;
    }
    // Session lives in localStorage, so it can only be read post-mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(sessionUser);
  }, [router]);

  const loadDocs = useCallback(async () => {
    try {
      const list = await apiFetch<DocumentMeta[]>("/api/documents");
      setDocs(list);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load documents");
      setDocs([]);
    }
  }, []);

  useEffect(() => {
    // loadDocs only sets state after the fetch resolves (not synchronously).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (user) void loadDocs();
  }, [user, loadDocs]);

  function handleLogout() {
    clearSessionUser();
    router.replace("/login");
  }

  async function handleNewDocument() {
    if (creating) return;
    setCreating(true);
    try {
      const doc = await apiFetch<DocumentFull>("/api/documents", {
        method: "POST",
        body: JSON.stringify({}),
      });
      router.push(`/doc/${doc.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create document");
      setCreating(false);
    }
  }

  async function handleDelete(doc: DocumentMeta) {
    try {
      await apiFetch(`/api/documents/${doc.id}`, { method: "DELETE" });
      setDocs((prev) => (prev ? prev.filter((d) => d.id !== doc.id) : prev));
      toast.success("Document deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete document");
      throw err;
    }
  }

  // Waiting on the auth check / redirect.
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-5 animate-spin text-neutral-400" aria-hidden />
      </div>
    );
  }

  const myDocs = docs?.filter((d) => d.role === "owner") ?? [];
  const sharedDocs = docs?.filter((d) => d.role !== "owner") ?? [];

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <header className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-3 px-4 py-3">
          <div className="flex items-center gap-2 text-neutral-900 dark:text-neutral-100">
            <FileText className="size-5" aria-hidden />
            <span className="text-lg font-semibold tracking-tight">Docs</span>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button onClick={handleNewDocument} disabled={creating}>
              {creating ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Plus className="size-4" aria-hidden />
              )}
              New document
            </Button>
            <UploadButton />
            <div className="mx-1 hidden flex-col text-right sm:flex">
              <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                {user.name}
              </span>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                {user.email}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              aria-label="Log out"
              title="Log out"
            >
              <LogOut className="size-4" aria-hidden />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-8">
        {docs === null ? (
          <div className="flex flex-col gap-8" aria-busy>
            {[0, 1].map((i) => (
              <div key={i} className="flex flex-col gap-3">
                <div className="h-4 w-32 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
                <div className="h-14 animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-800" />
                <div className="h-14 animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-800" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <DocListSection
              heading="My documents"
              docs={myDocs}
              emptyMessage="No documents yet. Create one with “New document” or upload a file."
              onDelete={handleDelete}
            />
            <DocListSection
              heading="Shared with me"
              docs={sharedDocs}
              emptyMessage="Nothing has been shared with you yet."
              showRoleBadge
            />
          </>
        )}
      </main>
    </div>
  );
}
