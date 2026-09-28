"use client";

import React, { useEffect, useRef, useState } from "react";
import { Menu, ChevronDown, Check, SquarePen, Zap, Globe, AppWindow, Box, Brain } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { cn } from "@/lib/utils";

interface HeaderProps {
  chatTitle: string;
  totalTokens?: number;
  selectedTier: "Instant" | "PRO";
  isBuildWebActive?: boolean;
  activeTool?: "web_builder" | "app_builder" | "three_d_builder" | "think_deeper" | null;
  onChangeTier: (tier: "Instant" | "PRO") => void;
  onToggleSidebar: () => void;
  onNewChat: () => void;
}

const TOOL_META: Record<
  "web_builder" | "app_builder" | "three_d_builder" | "think_deeper",
  { label: string; hint: string; icon: React.ReactNode; tint: string }
> = {
  web_builder: {
    label: "Web Builder",
    hint: "Building a website",
    icon: <Globe className="h-3.5 w-3.5" />,
    tint: "text-[var(--success)] bg-[var(--success-soft)]",
  },
  app_builder: {
    label: "App Builder",
    hint: "Building an app",
    icon: <AppWindow className="h-3.5 w-3.5" />,
    tint: "text-[var(--primary)] bg-[var(--primary-soft)]",
  },
  three_d_builder: {
    label: "3D Builder",
    hint: "Building a 3D scene",
    icon: <Box className="h-3.5 w-3.5" />,
    tint: "text-[var(--warning)] bg-[var(--warning-soft)]",
  },
  think_deeper: {
    label: "Think Deeper",
    hint: "Reasoning step by step",
    icon: <Brain className="h-3.5 w-3.5" />,
    tint: "text-[var(--danger)] bg-[var(--danger-soft)]",
  },
};

export const Header: React.FC<HeaderProps> = ({
  chatTitle,
  selectedTier,
  isBuildWebActive = false,
  activeTool,
  onChangeTier,
  onToggleSidebar,
  onNewChat,
}) => {
  const [isTierMenuOpen, setIsTierMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isBuilderActive = Boolean(
    isBuildWebActive ||
      activeTool === "web_builder" ||
      activeTool === "app_builder" ||
      activeTool === "three_d_builder"
  );

  const tool = activeTool && activeTool in TOOL_META ? TOOL_META[activeTool as keyof typeof TOOL_META] : null;

  useEffect(() => {
    if (!isTierMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsTierMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [isTierMenuOpen]);

  const tiers = [
    { id: "Instant" as const, label: "Instant", desc: "Fast everyday answers" },
    { id: "PRO" as const, label: "PRO", desc: "Deep reasoning & logic" },
  ];

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-background/85 px-3 backdrop-blur-xl md:px-5">
      <button
        onClick={onToggleSidebar}
        type="button"
        className="focus-ring -ml-1 flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition hover:bg-surface-2 hover:text-foreground active:scale-95 md:hidden"
        title="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Chat title */}
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold text-foreground">{chatTitle}</h1>
          <p className="hidden items-center gap-1.5 text-[11px] text-muted-foreground sm:flex">
            {tool ? (
              <>
                {tool.icon}
                <span>{tool.hint}</span>
              </>
            ) : (
              <span>{selectedTier === "PRO" ? "PRO model · deep reasoning" : "Instant model · fast replies"}</span>
            )}
          </p>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-1.5 md:gap-2">
        {/* Model dropdown (hidden while a builder tool is active) */}
        {!isBuilderActive && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsTierMenuOpen((v) => !v)}
              type="button"
              className="focus-ring flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-2 text-xs font-medium text-foreground transition hover:bg-surface-2 active:scale-[0.98] md:gap-2 md:px-3.5 md:text-sm"
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  selectedTier === "PRO" ? "bg-[var(--primary)]" : "bg-[var(--success)]"
                )}
              />
              <span>{selectedTier}</span>
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 text-muted-foreground transition-transform",
                  isTierMenuOpen && "rotate-180"
                )}
              />
            </button>

            {isTierMenuOpen && (
              <div className="absolute left-0 top-[calc(100%+8px)] z-50 w-60 animate-pop overflow-hidden rounded-2xl border border-border bg-surface p-1.5 shadow-xl shadow-black/10">
                {tiers.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      onChangeTier(t.id);
                      setIsTierMenuOpen(false);
                    }}
                    type="button"
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition",
                      selectedTier === t.id ? "bg-primary-soft" : "hover:bg-surface-2"
                    )}
                  >
                    <span className="flex items-center gap-2.5">
                      <span
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-lg",
                          t.id === "PRO"
                            ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                            : "bg-[var(--success-soft)] text-[var(--success)]"
                        )}
                      >
                        <Zap className="h-3.5 w-3.5" />
                      </span>
                      <span className="flex flex-col">
                        <span className="text-sm font-semibold text-foreground">{t.label}</span>
                        <span className="text-[11px] text-muted-foreground">{t.desc}</span>
                      </span>
                    </span>
                    {selectedTier === t.id && <Check className="h-4 w-4 shrink-0 text-[var(--primary)]" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {isBuilderActive && tool && (
          <span className={cn("hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium sm:flex", tool.tint)}>
            {tool.icon}
            <span>{tool.label}</span>
          </span>
        )}

        <button
          onClick={onNewChat}
          type="button"
          className="focus-ring hidden h-9 items-center gap-2 rounded-full border border-border bg-surface px-3.5 text-xs font-medium text-foreground transition hover:bg-surface-2 active:scale-[0.98] sm:flex"
          title="Start a new chat"
        >
          <SquarePen className="h-4 w-4" />
          <span>New chat</span>
        </button>

        <ThemeToggle />
      </div>
    </header>
  );
};
