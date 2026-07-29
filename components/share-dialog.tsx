"use client";

import * as React from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiFetch } from "@/lib/session";
import type { Share } from "@/lib/types";

type ShareRole = "editor" | "viewer";

const ROLE_LABEL: Record<ShareRole, string> = {
  editor: "Editor",
  viewer: "Viewer",
};

export function ShareDialog({
  docId,
  open,
  onOpenChange,
}: {
  docId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [shares, setShares] = React.useState<Share[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<ShareRole>("viewer");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    // Fetch-on-open: flip the loading flag before kicking off the request.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    apiFetch<Share[]>(`/api/documents/${docId}/shares`)
      .then((list) => {
        if (!cancelled) setShares(list);
      })
      .catch((err: Error) => {
        if (!cancelled) toast.error(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, docId]);

  async function shareWith(targetEmail: string, targetRole: ShareRole) {
    setBusy(true);
    try {
      const updated = await apiFetch<Share[]>(
        `/api/documents/${docId}/shares`,
        {
          method: "POST",
          body: JSON.stringify({ email: targetEmail, role: targetRole }),
        }
      );
      setShares(updated);
      const target = updated.find(
        (s) => s.email === targetEmail.trim().toLowerCase()
      );
      toast.success(
        `Shared with ${target?.name ?? targetEmail} as ${targetRole}`
      );
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || busy) return;
    const ok = await shareWith(email, role);
    if (ok) setEmail("");
  }

  async function handleRevoke(share: Share) {
    setBusy(true);
    try {
      const updated = await apiFetch<Share[]>(
        `/api/documents/${docId}/shares/${share.userId}`,
        { method: "DELETE" }
      );
      setShares(updated);
      toast.success(`Removed ${share.name}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share document</DialogTitle>
          <DialogDescription>
            Give other people view or edit access to this document.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <Input
            type="email"
            placeholder="person@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-label="Email address"
            className="flex-1"
          />
          <Select
            value={role}
            onValueChange={(v) => setRole(v as ShareRole)}
          >
            <SelectTrigger aria-label="Role" className="w-[7rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="viewer">Viewer</SelectItem>
              <SelectItem value="editor">Editor</SelectItem>
            </SelectContent>
          </Select>
          <Button type="submit" disabled={busy || !email.trim()}>
            Share
          </Button>
        </form>

        <p className="text-xs text-muted-foreground">
          Demo users: alice@demo.com, bob@demo.com, carol@demo.com
        </p>

        <div className="mt-2 space-y-1">
          <h3 className="text-sm font-medium">People with access</h3>
          {loading ? (
            <p className="py-2 text-sm text-muted-foreground">
              Loading shares…
            </p>
          ) : shares.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">
              Not shared with anyone yet.
            </p>
          ) : (
            <ul className="divide-y">
              {shares.map((share) => (
                <li
                  key={share.id}
                  className="flex items-center gap-2 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">
                        {share.name}
                      </span>
                      <Badge variant="secondary">
                        {ROLE_LABEL[share.role as ShareRole] ?? share.role}
                      </Badge>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {share.email}
                    </p>
                  </div>
                  <Select
                    value={share.role}
                    onValueChange={(v) => {
                      if (v !== share.role) {
                        void shareWith(share.email, v as ShareRole);
                      }
                    }}
                    disabled={busy}
                  >
                    <SelectTrigger
                      size="sm"
                      aria-label={`Change role for ${share.name}`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">Viewer</SelectItem>
                      <SelectItem value="editor">Editor</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={busy}
                    onClick={() => void handleRevoke(share)}
                  >
                    Revoke
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
