"use client";

import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import {
  Bold,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Underline,
} from "lucide-react";
import type { ComponentType } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ToolbarProps {
  editor: Editor | null;
  /** True when the current user may not edit (viewer role). */
  disabled?: boolean;
}

interface ToolbarItem {
  key: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  isActive: (editor: Editor) => boolean;
  run: (editor: Editor) => void;
}

const GROUPS: ToolbarItem[][] = [
  [
    {
      key: "bold",
      label: "Bold",
      icon: Bold,
      isActive: (e) => e.isActive("bold"),
      run: (e) => e.chain().focus().toggleBold().run(),
    },
    {
      key: "italic",
      label: "Italic",
      icon: Italic,
      isActive: (e) => e.isActive("italic"),
      run: (e) => e.chain().focus().toggleItalic().run(),
    },
    {
      key: "underline",
      label: "Underline",
      icon: Underline,
      isActive: (e) => e.isActive("underline"),
      run: (e) => e.chain().focus().toggleUnderline().run(),
    },
  ],
  [
    {
      key: "h1",
      label: "Heading 1",
      icon: Heading1,
      isActive: (e) => e.isActive("heading", { level: 1 }),
      run: (e) => e.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      key: "h2",
      label: "Heading 2",
      icon: Heading2,
      isActive: (e) => e.isActive("heading", { level: 2 }),
      run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      key: "h3",
      label: "Heading 3",
      icon: Heading3,
      isActive: (e) => e.isActive("heading", { level: 3 }),
      run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
    },
  ],
  [
    {
      key: "bulletList",
      label: "Bullet list",
      icon: List,
      isActive: (e) => e.isActive("bulletList"),
      run: (e) => e.chain().focus().toggleBulletList().run(),
    },
    {
      key: "orderedList",
      label: "Ordered list",
      icon: ListOrdered,
      isActive: (e) => e.isActive("orderedList"),
      run: (e) => e.chain().focus().toggleOrderedList().run(),
    },
  ],
];

/**
 * Docs-style formatting toolbar. Active states come from `useEditorState`
 * (Tiptap v3 editors don't re-render the parent on every transaction).
 */
export function Toolbar({ editor, disabled = false }: ToolbarProps) {
  const activeMap = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      if (!e) return null;
      const map: Record<string, boolean> = {};
      for (const group of GROUPS) {
        for (const item of group) map[item.key] = item.isActive(e);
      }
      return map;
    },
    equalityFn: (a, b) => {
      if (a === b) return true;
      if (!a || !b) return false;
      return Object.keys(a).every((k) => a[k] === b[k]);
    },
  });

  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      className="flex flex-wrap items-center gap-0.5 rounded-lg border border-border bg-background px-1.5 py-1 shadow-xs"
    >
      {GROUPS.map((group, gi) => (
        <div key={gi} className="flex items-center gap-0.5">
          {gi > 0 && <div className="mx-1 h-5 w-px bg-border" aria-hidden />}
          {group.map((item) => {
            const active = Boolean(activeMap?.[item.key]);
            const Icon = item.icon;
            return (
              <Button
                key={item.key}
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={item.label}
                title={item.label}
                aria-pressed={active}
                disabled={disabled || !editor}
                onClick={() => editor && item.run(editor)}
                className={cn(
                  "text-muted-foreground",
                  active && "bg-muted text-foreground"
                )}
              >
                <Icon className="size-4" />
              </Button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
