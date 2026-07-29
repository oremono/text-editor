"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/session";

const ACCEPTED_EXTENSIONS = [".txt", ".md", ".docx"];
const ACCEPT_ATTR = ACCEPTED_EXTENSIONS.join(",");
const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

interface UploadButtonProps {
  onUploaded?: (docId: string) => void;
}

/**
 * "Upload" button + hidden file input. Converts .txt / .md / .docx into a new
 * document via POST /api/upload, then navigates into the editor.
 */
export function UploadButton({ onUploaded }: UploadButtonProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Reset so picking the same file again re-triggers onChange.
    event.target.value = "";
    if (!file) return;

    const dot = file.name.lastIndexOf(".");
    const ext = dot > 0 ? file.name.slice(dot).toLowerCase() : "";
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      toast.error("Unsupported file type — use .txt, .md, or .docx");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      toast.error("File is too large — the maximum size is 2 MB");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      // apiFetch attaches x-user-id and leaves content-type alone for
      // FormData bodies, so the browser sets the multipart boundary itself.
      const doc = await apiFetch<{ id: string }>("/api/upload", {
        method: "POST",
        body: formData,
      });
      toast.success(`Uploaded "${file.name}"`);
      onUploaded?.(doc.id);
      router.push(`/doc/${doc.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        className="hidden"
        onChange={handleFileChange}
        disabled={uploading}
        aria-hidden="true"
        tabIndex={-1}
      />
      <Button
        type="button"
        variant="outline"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        title="txt, md, docx — max 2 MB"
      >
        {uploading ? (
          <Loader2 className="animate-spin" aria-hidden="true" />
        ) : (
          <Upload aria-hidden="true" />
        )}
        {uploading ? "Uploading…" : "Upload"}
      </Button>
      <span className="text-xs text-muted-foreground hidden sm:inline">
        txt, md, docx — max 2 MB
      </span>
    </div>
  );
}
