"use client";

import React, { useState } from "react";
import { Copy, Check, ChevronDown, ChevronUp, Code2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CodeBlockProps {
  language: string;
  code: string;
  defaultCollapsed?: boolean;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ language, code, defaultCollapsed = false }) => {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(!defaultCollapsed);

  const lines = code.trim().split("\n");
  const isCollapsible = lines.length > 12 || defaultCollapsed;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="my-3 overflow-hidden rounded-2xl border border-border bg-surface-2 shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-border bg-surface-3/60 px-3.5 py-2">
        <div className="flex min-w-0 items-center gap-2 font-mono text-xs text-muted-foreground">
          <Code2 className="h-3.5 w-3.5 shrink-0 text-[var(--primary)]" />
          <span className="truncate font-semibold uppercase tracking-wider text-foreground/80">
            {language || "code"}
          </span>
          <span className="text-border-strong">·</span>
          <span className="shrink-0">{lines.length} lines</span>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            onClick={handleCopy}
            type="button"
            className="focus-ring flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-foreground transition hover:bg-surface-2"
            title="Copy code"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-[var(--success)]" />
                <span className="text-[var(--success)]">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Copy</span>
              </>
            )}
          </button>

          {isCollapsible && (
            <button
              onClick={() => setIsExpanded((v) => !v)}
              type="button"
              className="focus-ring flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-surface text-muted-foreground transition hover:bg-surface-2 hover:text-foreground"
              title={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>
      </div>

      <div className="relative">
        <pre
          className={cn(
            "custom-scrollbar overflow-x-auto p-4 font-mono text-xs leading-relaxed text-foreground/90 md:text-[13px]",
            !isExpanded && isCollapsible && "max-h-48 overflow-hidden"
          )}
        >
          <code>{code}</code>
        </pre>

        {!isExpanded && isCollapsible && (
          <div className="absolute inset-x-0 bottom-0 flex h-20 items-end justify-center bg-gradient-to-t from-[var(--surface-2)] to-transparent pb-2">
            <button
              onClick={() => setIsExpanded(true)}
              type="button"
              className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-foreground shadow-sm transition hover:bg-surface-2"
            >
              <ChevronDown className="h-3.5 w-3.5" />
              Show all {lines.length} lines
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
