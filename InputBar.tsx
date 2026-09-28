"use client";

import React, { useRef, useEffect, useState } from "react";
import { Plus, ArrowUp, Globe, AppWindow, Brain, X, AlertCircle, FileText, Image as ImageIcon, Box } from "lucide-react";
import { formatTimeUntilReset } from "@/lib/utils";
import { FileAttachment } from "@/lib/tokenizer";
import { cn } from "@/lib/utils";

export type ToolMode = "web_builder" | "app_builder" | "three_d_builder" | "think_deeper" | null;

interface InputBarProps {
  inputDraft: string;
  onChangeInput: (value: string) => void;
  draftAttachments?: FileAttachment[];
  onAddAttachments?: (newAttachments: FileAttachment[]) => void;
  onRemoveAttachment?: (id: string) => void;
  onSend: (tool?: ToolMode | boolean, attachments?: FileAttachment[]) => void;
  isLoading: boolean;
  selectedTier: "Instant" | "PRO";
  activeTool?: ToolMode;
  onSelectTool?: (tool: ToolMode) => void;
  isBuildWebActive?: boolean;
  onToggleBuildWeb?: (active: boolean) => void;
  totalSessionTokens?: number;
  usedCredits?: number;
  resetTimestamp?: number;
}

const ALLOWED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".heic", ".heif", ".gif"];

function isAllowedFileFormat(file: File): boolean {
  if (file.type && file.type.startsWith("image/")) return true;
  const nameLower = file.name.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => nameLower.endsWith(ext));
}

function readFileAsBase64(file: File): Promise<{ base64Data: string; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64Data = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
      resolve({ base64Data, dataUrl });
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

const TOOL_OPTIONS = [
  { id: "web_builder" as const, label: "Web Builder", icon: Globe, tint: "text-[var(--success)]" },
  { id: "app_builder" as const, label: "App Builder", icon: AppWindow, tint: "text-[var(--primary)]" },
  { id: "three_d_builder" as const, label: "3D Builder", icon: Box, tint: "text-[var(--warning)]", badge: "Beta" },
  { id: "think_deeper" as const, label: "Think Deeper", icon: Brain, tint: "text-[var(--danger)]" },
];

const TOOL_LABELS: Record<string, string> = {
  web_builder: "Web Builder",
  app_builder: "App Builder",
  three_d_builder: "3D Builder",
  think_deeper: "Think Deeper",
};

export const InputBar: React.FC<InputBarProps> = ({
  inputDraft,
  onChangeInput,
  draftAttachments = [],
  onAddAttachments,
  onRemoveAttachment,
  onSend,
  isLoading,
  activeTool: activeToolProp,
  onSelectTool,
  isBuildWebActive = false,
  onToggleBuildWeb,
  usedCredits = 0,
  resetTimestamp = 0,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false);
  const [fileError, setFileError] = useState<string>("");

  const currentActiveTool: ToolMode =
    activeToolProp !== undefined ? activeToolProp : isBuildWebActive ? "web_builder" : null;

  const handleToolToggle = (tool: "web_builder" | "app_builder" | "three_d_builder" | "think_deeper") => {
    const nextTool = currentActiveTool === tool ? null : tool;
    if (onSelectTool) onSelectTool(nextTool);
    else if (onToggleBuildWeb) onToggleBuildWeb(nextTool === "web_builder");
  };

  const isLimitReached = usedCredits >= 100;
  const isInputDisabled = isLimitReached;

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [inputDraft]);

  useEffect(() => {
    if (!isAttachMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setIsAttachMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [isAttachMenuOpen]);

  const handleOpenFilePicker = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    const currentCount = draftAttachments.length;
    let errorMsg = "";
    const allowedToTakeInput = Math.min(fileList.length, 3 - currentCount);

    if (allowedToTakeInput <= 0) {
      setFileError("Maximum 3 images allowed per message.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const validFiles: File[] = [];
    for (const f of fileList.slice(0, allowedToTakeInput)) {
      if (isAllowedFileFormat(f)) validFiles.push(f);
      else errorMsg = `Unsupported file "${f.name}". Only image files (PNG, JPG, WEBP, HEIC, GIF) are allowed.`;
    }

    if (fileList.length > allowedToTakeInput) errorMsg = "Maximum 3 images allowed per message.";

    if (errorMsg) {
      setFileError(errorMsg);
      setTimeout(() => setFileError(""), 5000);
    }

    if (validFiles.length === 0) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const newAttachments: FileAttachment[] = [];
    for (const f of validFiles) {
      try {
        const { base64Data, dataUrl } = await readFileAsBase64(f);
        const isImage = f.type.startsWith("image/");
        newAttachments.push({
          id: "att_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
          name: f.name,
          size: f.size,
          type: f.type || (isImage ? "image/png" : "text/plain"),
          url: dataUrl,
          base64Data,
          isImage,
        });
      } catch (err) {
        console.error("Error reading file:", err);
      }
    }

    if (newAttachments.length > 0 && onAddAttachments) onAddAttachments(newAttachments);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const canSubmit =
    (inputDraft.trim().length > 0 || draftAttachments.length > 0) &&
    draftAttachments.length <= 3 &&
    !isLoading &&
    !isInputDisabled;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canSubmit) onSend(currentActiveTool, draftAttachments);
  };

  const placeholder = isLimitReached
    ? "Daily limit reached — resets in a little while"
    : currentActiveTool === "app_builder"
    ? "Describe the app you want to build…"
    : currentActiveTool === "three_d_builder"
    ? "Describe a 3D scene, model, or game…"
    : currentActiveTool === "web_builder"
    ? "Describe the website you want to build…"
    : currentActiveTool === "think_deeper"
    ? "Ask a complex question to reason through…"
    : "Message ChatNeural…";

  return (
    <div className="relative mx-auto w-full max-w-3xl px-3 pb-[calc(0.85rem+env(safe-area-inset-bottom))] pt-2 md:px-6 md:pb-6">
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileChange}
        multiple
        accept="image/png,image/jpeg,image/webp,image/heic,image/heif,image/gif"
        className="hidden"
      />

      {isLimitReached && (
        <div className="mb-2.5 flex animate-fade-in items-center justify-between gap-2 rounded-2xl border border-[color-mix(in_srgb,var(--danger)_35%,transparent)] bg-[var(--danger-soft)] px-3.5 py-2 text-xs text-[var(--danger)]">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="font-medium">Daily limit reached. Messages are paused.</span>
          </div>
          {resetTimestamp ? (
            <span className="shrink-0 font-mono text-[11px] opacity-80">
              Resets in {formatTimeUntilReset(resetTimestamp)}
            </span>
          ) : null}
        </div>
      )}

      {fileError && (
        <div className="mb-2 flex animate-fade-in items-center justify-between gap-2 rounded-2xl border border-[color-mix(in_srgb,var(--warning)_35%,transparent)] bg-[var(--warning-soft)] px-3.5 py-2 text-xs text-[var(--warning)]">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{fileError}</span>
          </div>
          <button type="button" onClick={() => setFileError("")} className="rounded p-0.5 opacity-80 hover:opacity-100">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {currentActiveTool && !isInputDisabled && (
        <div className="mb-2 flex w-fit animate-fade-in items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-foreground shadow-xs">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />
          <span>{TOOL_LABELS[currentActiveTool]}</span>
          <button
            type="button"
            onClick={() => {
              if (onSelectTool) onSelectTool(null);
              else if (onToggleBuildWeb) onToggleBuildWeb(false);
            }}
            className="ml-0.5 rounded-full text-muted-foreground transition hover:text-foreground"
            title="Turn off tool"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className={cn(
          "relative flex flex-col rounded-[26px] border border-border bg-surface p-1.5 shadow-lg shadow-black/[0.04] transition",
          "focus-within:border-[color-mix(in_srgb,var(--primary)_55%,var(--border))] focus-within:shadow-[0_0_0_4px_color-mix(in_srgb,var(--primary)_12%,transparent)]",
          isInputDisabled && "opacity-70"
        )}
      >
        {draftAttachments.length > 0 && (
          <div className="mb-1 flex flex-wrap gap-2 border-b border-border px-2 pb-2 pt-1">
            {draftAttachments.map((att) => (
              <div
                key={att.id}
                className="group relative flex items-center gap-2 rounded-xl border border-border bg-surface-2 py-1 pl-2 pr-1.5 text-xs text-foreground"
              >
                {att.isImage ? (
                  <div className="h-7 w-7 shrink-0 overflow-hidden rounded-lg bg-surface-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={att.url} alt={att.name} className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <FileText className="h-4 w-4 shrink-0 text-[var(--warning)]" />
                )}
                <div className="flex min-w-0 flex-col pr-1">
                  <span className="max-w-[130px] truncate text-[11px] font-medium" title={att.name}>
                    {att.name}
                  </span>
                  <span className="font-mono text-[9px] text-muted-foreground">{(att.size / 1024).toFixed(0)}KB</span>
                </div>
                {onRemoveAttachment && (
                  <button
                    type="button"
                    onClick={() => onRemoveAttachment(att.id)}
                    className="rounded-lg p-1 text-muted-foreground transition hover:bg-surface-3 hover:text-[var(--danger)]"
                    title="Remove"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
            <div className="ml-auto self-center pr-1 font-mono text-[10px] text-muted-foreground">
              {draftAttachments.length}/3
            </div>
          </div>
        )}

        <div className="flex items-end gap-1.5">
          <div className="relative shrink-0" ref={menuRef}>
            <button
              type="button"
              disabled={isInputDisabled}
              onClick={() => setIsAttachMenuOpen((v) => !v)}
              className={cn(
                "focus-ring flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface-2 text-muted-foreground transition hover:text-foreground active:scale-95 disabled:cursor-not-allowed disabled:opacity-50",
                isAttachMenuOpen && "rotate-45 bg-surface-3 text-foreground"
              )}
              title="Tools & attachments"
            >
              <Plus className="h-4 w-4 transition-transform" />
            </button>

            {isAttachMenuOpen && !isInputDisabled && (
              <div className="absolute bottom-[calc(100%+10px)] left-0 z-50 w-60 animate-pop rounded-2xl border border-border bg-surface p-1.5 text-xs shadow-xl shadow-black/10">
                <button
                  type="button"
                  onClick={() => {
                    setIsAttachMenuOpen(false);
                    handleOpenFilePicker();
                  }}
                  disabled={draftAttachments.length >= 3}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-foreground transition hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--primary-soft)] text-[var(--primary)]">
                    <ImageIcon className="h-4 w-4" />
                  </span>
                  <span className="flex flex-col">
                    <span className="font-semibold">Upload image</span>
                    <span className="text-[10px] text-muted-foreground">PNG, JPG, WEBP · up to 3</span>
                  </span>
                </button>

                <div className="my-1 border-t border-border" />
                <div className="px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Tools
                </div>

                {TOOL_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isActive = currentActiveTool === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        handleToolToggle(opt.id);
                        setIsAttachMenuOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition",
                        isActive ? "bg-primary-soft font-semibold text-foreground" : "text-foreground hover:bg-surface-2"
                      )}
                    >
                      <Icon className={cn("h-4 w-4 shrink-0", opt.tint)} />
                      <span>{opt.label}</span>
                      {opt.badge && (
                        <span className="ml-auto rounded-md bg-surface-3 px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
                          {opt.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <textarea
            ref={textareaRef}
            rows={1}
            value={inputDraft}
            disabled={isInputDisabled}
            onChange={(e) => onChangeInput(e.target.value)}
            placeholder={placeholder}
            className="custom-scrollbar max-h-40 min-h-10 flex-1 resize-none bg-transparent px-1.5 py-2.5 text-base leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed md:text-[15px]"
          />

          <button
            type="submit"
            disabled={!canSubmit}
            className={cn(
              "focus-ring mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition active:scale-95",
              canSubmit
                ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm hover:bg-[var(--primary-hover)]"
                : "bg-surface-2 text-muted-foreground"
            )}
            title={isLimitReached ? "Daily limit reached" : "Send message"}
          >
            {isLoading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <ArrowUp className="h-[18px] w-[18px]" strokeWidth={2.4} />
            )}
          </button>
        </div>
      </form>

      <p className="mt-2 hidden text-center text-[11px] text-muted-foreground md:block">
        ChatNeural can make mistakes. Double-check important information.
      </p>
    </div>
  );
};
