"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Content, Editor } from "@tiptap/react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { ArrowLeft, Eye, LoaderCircle, Share2 } from "lucide-react";
import { toast } from "sonner";

import { SaveIndicator, type SaveState } from "@/components/editor/save-indicator";
import { Toolbar } from "@/components/editor/toolbar";
import { ShareDialog } from "@/components/share-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiFetch, getSessionUser } from "@/lib/session";
import type { DocumentFull } from "@/lib/types";
import { cn } from "@/lib/utils";

const ROLE_LABEL = { owner: "Owner", editor: "Editor", viewer: "Viewer" } as const;

export default function DocPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [doc, setDoc] = useState<DocumentFull | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!getSessionUser()) {
      router.replace("/login");
      return;
    }
    let cancelled = false;
    apiFetch<DocumentFull>(`/api/documents/${id}`)
      .then((d) => {
        if (!cancelled) setDoc(d);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "Failed to load document");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-sm">
          <h1 className="text-lg font-semibold">Can&apos;t open this document</h1>
          <p className="mt-2 text-sm text-muted-foreground">{loadError}</p>
          <Button asChild className="mt-6">
            <Link href="/">
              <ArrowLeft data-icon="inline-start" />
              Back to your documents
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" aria-hidden />
          Loading document…
        </div>
      </div>
    );
  }

  return <DocumentEditor doc={doc} />;
}

function DocumentEditor({ doc }: { doc: DocumentFull }) {
  const canEdit = doc.role === "owner" || doc.role === "editor";
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [shareOpen, setShareOpen] = useState(false);

  const dirtyRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSave = useCallback(
    async (editor: Editor) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      dirtyRef.current = false;
      setSaveState("saving");
      try {
        await apiFetch(`/api/documents/${doc.id}`, {
          method: "PATCH",
          body: JSON.stringify({ content: editor.getJSON() }),
        });
        // If more edits arrived while saving, the debounce timer is already
        // rescheduled and will flip us back to "saving".
        setSaveState((s) => (dirtyRef.current ? s : "saved"));
      } catch (err: unknown) {
        setSaveState("error");
        const message = err instanceof Error ? err.message : "Failed to save";
        toast.error(message, {
          description: "Your latest changes are not saved yet.",
          // Self-reference is safe: onClick only fires after this render
          // commits, and runSave is stable for the life of the page (doc.id).
          // eslint-disable-next-line react-hooks/immutability
          action: { label: "Retry", onClick: () => void runSave(editor) },
        });
      }
    },
    [doc.id]
  );

  const scheduleSave = useCallback(
    (editor: Editor) => {
      dirtyRef.current = true;
      setSaveState("saving");
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => void runSave(editor), 1500);
    },
    [runSave]
  );

  const editor = useEditor({
    // Tiptap v3 StarterKit already bundles Underline — adding
    // @tiptap/extension-underline again would warn about duplicates.
    extensions: [StarterKit],
    content: doc.content as Content,
    editable: canEdit,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      if (canEdit) scheduleSave(editor);
    },
  });

  // Belt and braces for viewers (spec §4/§6): never editable.
  useEffect(() => {
    editor?.setEditable(canEdit);
  }, [editor, canEdit]);

  // Flush a pending (debounced) save on unmount / tab close.
  useEffect(() => {
    if (!canEdit || !editor) return;
    const flush = () => {
      if (!dirtyRef.current || editor.isDestroyed) return;
      dirtyRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      void apiFetch(`/api/documents/${doc.id}`, {
        method: "PATCH",
        body: JSON.stringify({ content: editor.getJSON() }),
        keepalive: true,
      }).catch(() => {});
    };
    window.addEventListener("beforeunload", flush);
    return () => {
      window.removeEventListener("beforeunload", flush);
      flush();
    };
  }, [canEdit, editor, doc.id]);

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2.5">
          <Button asChild variant="ghost" size="icon-sm" aria-label="Back to documents">
            <Link href="/">
              <ArrowLeft />
            </Link>
          </Button>

          <DocTitle doc={doc} canEdit={canEdit} />

          <div className="ml-auto flex shrink-0 items-center gap-3">
            <SaveIndicator state={saveState} />
            <Badge variant="secondary">{ROLE_LABEL[doc.role]}</Badge>
            {doc.role === "owner" && (
              <Button variant="outline" size="sm" onClick={() => setShareOpen(true)}>
                <Share2 data-icon="inline-start" />
                Share
              </Button>
            )}
          </div>
        </div>

        <div className="mx-auto flex max-w-5xl justify-center px-4 pb-2.5">
          <Toolbar editor={editor} disabled={!canEdit} />
        </div>
      </header>

      {doc.role === "viewer" && (
        <div className="border-b border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10">
          <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-2 text-sm text-amber-800 dark:text-amber-200">
            <Eye className="size-4 shrink-0" aria-hidden />
            View only — shared by {doc.ownerName}
          </div>
        </div>
      )}

      <main className="mx-auto max-w-3xl px-4 py-8">
        <div
          className={cn(
            "rounded-xl border border-border bg-card shadow-sm",
            // Editable surface
            "[&_.ProseMirror]:min-h-[70vh] [&_.ProseMirror]:px-8 [&_.ProseMirror]:py-10 [&_.ProseMirror]:outline-none sm:[&_.ProseMirror]:px-12",
            // Typography (globals.css is off-limits — style via arbitrary selectors)
            "[&_h1]:mt-6 [&_h1]:mb-3 [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:tracking-tight",
            "[&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight",
            "[&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:text-xl [&_h3]:font-semibold",
            "[&_p]:my-2 [&_p]:leading-7",
            "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6",
            "[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6",
            "[&_li]:my-0.5 [&_li_p]:my-0",
            "[&_blockquote]:my-3 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground",
            "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em]",
            "[&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-4 [&_pre_code]:bg-transparent [&_pre_code]:p-0",
            "[&_hr]:my-6 [&_hr]:border-border",
            "[&_strong]:font-bold [&_em]:italic [&_u]:underline"
          )}
        >
          <EditorContent editor={editor} />
        </div>
      </main>

      {doc.role === "owner" && (
        <ShareDialog docId={doc.id} open={shareOpen} onOpenChange={setShareOpen} />
      )}
    </div>
  );
}

function DocTitle({ doc, canEdit }: { doc: DocumentFull; canEdit: boolean }) {
  const [title, setTitle] = useState(doc.title);
  const savedTitleRef = useRef(doc.title);

  if (!canEdit) {
    return (
      <h1 className="min-w-0 truncate text-base font-semibold" title={title}>
        {title}
      </h1>
    );
  }

  const commit = async () => {
    const trimmed = title.trim().slice(0, 200);
    if (!trimmed || trimmed === savedTitleRef.current) {
      setTitle(savedTitleRef.current);
      return;
    }
    setTitle(trimmed);
    try {
      const updated = await apiFetch<DocumentFull>(`/api/documents/${doc.id}`, {
        method: "PATCH",
        body: JSON.stringify({ title: trimmed }),
      });
      savedTitleRef.current = updated.title;
      setTitle(updated.title);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to rename document");
      setTitle(savedTitleRef.current);
    }
  };

  return (
    <input
      value={title}
      onChange={(e) => setTitle(e.target.value)}
      onBlur={() => void commit()}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          setTitle(savedTitleRef.current);
          e.currentTarget.blur();
        }
      }}
      aria-label="Document title"
      maxLength={200}
      className="min-w-0 flex-1 truncate rounded-md border border-transparent bg-transparent px-2 py-1 text-base font-semibold outline-none transition-colors hover:border-border focus:border-ring focus:ring-2 focus:ring-ring/30"
    />
  );
}
