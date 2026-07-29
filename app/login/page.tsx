"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch, getSessionUser, setSessionUser } from "@/lib/session";
import type { User } from "@/lib/types";

const DEMO_ACCOUNTS = [
  { name: "Alice", email: "alice@demo.com" },
  { name: "Bob", email: "bob@demo.com" },
  { name: "Carol", email: "carol@demo.com" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Already logged in → straight to the doc list.
  useEffect(() => {
    if (getSessionUser()) {
      router.replace("/");
    }
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || submitting) return;

    setSubmitting(true);
    try {
      const user = await apiFetch<User>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
      });
      setSessionUser(user);
      router.replace("/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-neutral-50 px-4 dark:bg-neutral-950">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2 text-neutral-900 dark:text-neutral-100">
          <FileText className="size-6" aria-hidden />
          <span className="text-xl font-semibold tracking-tight">Docs</span>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>
              Demo app — mock auth, pick a seeded user
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@demo.com"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={submitting}
                  required
                />
              </div>
              <Button type="submit" disabled={submitting || !email.trim()}>
                {submitting && (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                )}
                {submitting ? "Signing in…" : "Continue"}
              </Button>
            </form>

            <div className="mt-6">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                Demo accounts
              </p>
              <div className="flex flex-col gap-2">
                {DEMO_ACCOUNTS.map((account) => (
                  <button
                    key={account.email}
                    type="button"
                    onClick={() => setEmail(account.email)}
                    disabled={submitting}
                    className="flex items-center justify-between rounded-md border border-neutral-200 px-3 py-2 text-left text-sm transition-colors hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
                  >
                    <span className="font-medium text-neutral-900 dark:text-neutral-100">
                      {account.name}
                    </span>
                    <span className="text-neutral-500 dark:text-neutral-400">
                      {account.email}
                    </span>
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
                Click an account to fill the email, then continue.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
