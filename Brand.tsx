"use client";

import React from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export const BrandMark: React.FC<{ className?: string; iconClassName?: string }> = ({
  className,
  iconClassName,
}) => (
  <span
    className={cn(
      "relative inline-flex items-center justify-center rounded-2xl text-white shadow-sm",
      "bg-gradient-to-br from-[var(--primary)] via-[color-mix(in_srgb,var(--primary)_70%,#22c55e)] to-[color-mix(in_srgb,var(--primary)_60%,#06b6d4)]",
      "ring-1 ring-inset ring-white/20",
      className ?? "h-9 w-9"
    )}
    aria-hidden="true"
  >
    <Sparkles className={cn("h-4 w-4", iconClassName)} strokeWidth={2.4} />
  </span>
);

export const Wordmark: React.FC<{ className?: string }> = ({ className }) => (
  <span className={cn("font-semibold tracking-tight", className)}>
    Chat<span className="text-gradient">Neural</span>
  </span>
);
