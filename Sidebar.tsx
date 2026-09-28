"use client";

import React, { useMemo, useState } from "react";
import { ChatSession } from "@/lib/tokenizer";
import { Plus, MoreHorizontal, Settings, Trash2, X, Pencil, MessageSquare, Eraser } from "lucide-react";
import { BrandMark, Wordmark } from "./Brand";
import { cn } from "@/lib/utils";

interface SidebarProps {
  sessions: ChatSession[];
  activeSessionId: string;
  isOpen: boolean;
  loadingSessionIds?: Record<string, boolean>;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
  onClearAllSessions: () => void;
  onCloseMobile: () => void;
  onOpenSettings?: () => void;
  onRenameSession?: (id: string, newTitle: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  activeSessionId,
  isOpen,
  loadingSessionIds = {},
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onClearAllSessions,
  onCloseMobile,
  onOpenSettings,
  onRenameSession,
}) => {
  const [menuOpenSessionId, setMenuOpenSessionId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState("");

  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)),
    [sessions]
  );

  const handleStartRename = (session: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingId(session.id);
    setRenameText(session.title);
    setMenuOpenSessionId(null);
  };

  const handleSaveRename = (id: string) => {
    if (renameText.trim() && onRenameSession) {
      onRenameSession(id, renameText.trim());
    }
    setRenamingId(null);
  };

  const handleClearAll = () => {
    if (confirm("Delete all conversations? This cannot be undone.")) {
      onClearAllSessions();
    }
  };

  return (
    <>
      {isOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-30 animate-fade-in bg-black/40 backdrop-blur-sm md:hidden"
        />
      )}

      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-40 flex w-[282px] flex-col border-r border-border bg-surface transition-transform duration-300 ease-out md:static md:w-[272px] md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand */}
        <div className="flex h-16 shrink-0 items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <BrandMark className="h-9 w-9" />
            <Wordmark className="text-[15px]" />
          </div>
          <button
            onClick={onCloseMobile}
            type="button"
            className="focus-ring flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-surface-2 hover:text-foreground md:hidden"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* New chat */}
        <div className="px-3 pb-3">
          <button
            onClick={() => {
              onNewChat();
              onCloseMobile();
            }}
            type="button"
            className="focus-ring group flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] shadow-sm transition hover:bg-[var(--primary-hover)] active:scale-[0.98]"
          >
            <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" />
            <span>New chat</span>
          </button>
        </div>

        {/* Session list */}
        <div className="flex items-center justify-between px-5 pb-1.5 pt-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Recent
          </span>
          {sortedSessions.length > 0 && (
            <span className="text-[11px] font-medium text-muted-foreground">{sortedSessions.length}</span>
          )}
        </div>

        <div className="no-scrollbar flex-1 space-y-0.5 overflow-y-auto px-2 pb-3">
          {sortedSessions.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-muted-foreground">
              <MessageSquare className="h-5 w-5 opacity-60" />
              <p className="text-xs">No conversations yet</p>
            </div>
          ) : (
            sortedSessions.map((session, index) => {
              const isActive = session.id === activeSessionId;
              const isMenuOpen = menuOpenSessionId === session.id;
              const isEditing = renamingId === session.id;
              const displayTitle = session.title || `Chat ${index + 1}`;
              const isLoading = Boolean(loadingSessionIds[session.id]);

              return (
                <div key={session.id} className="group relative">
                  <div
                    onClick={() => {
                      if (isEditing) return;
                      onSelectSession(session.id);
                      onCloseMobile();
                    }}
                    className={cn(
                      "flex cursor-pointer flex-col rounded-xl px-2.5 py-2 transition",
                      isActive ? "bg-primary-soft" : "hover:bg-surface-2"
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      {isEditing ? (
                        <input
                          type="text"
                          value={renameText}
                          onChange={(e) => setRenameText(e.target.value)}
                          onBlur={() => handleSaveRename(session.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveRename(session.id);
                            if (e.key === "Escape") setRenamingId(null);
                          }}
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                          className="focus-ring w-full rounded-lg border border-[var(--primary)] bg-surface px-2 py-1 text-xs text-foreground"
                        />
                      ) : (
                        <>
                          <span
                            className={cn(
                              "truncate text-[13px]",
                              isActive
                                ? "font-semibold text-[var(--primary)]"
                                : "font-medium text-foreground/80 group-hover:text-foreground"
                            )}
                          >
                            {displayTitle}
                          </span>
                          {isLoading && (
                            <span
                              className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-[var(--primary)]"
                              title="Replying…"
                            />
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuOpenSessionId(isMenuOpen ? null : session.id);
                            }}
                            type="button"
                            className={cn(
                              "focus-ring ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:bg-surface-3 hover:text-foreground",
                              isActive || isMenuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                            )}
                            title="Chat options"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>

                    {isMenuOpen && !isEditing && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="mt-2 flex animate-fade-in items-center gap-1.5 border-t border-border pt-2"
                      >
                        <button
                          onClick={(e) => handleStartRename(session, e)}
                          type="button"
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-surface-2 px-2 py-1.5 text-[11px] font-medium text-foreground transition hover:bg-surface-3"
                        >
                          <Pencil className="h-3 w-3" />
                          Rename
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpenSessionId(null);
                            onDeleteSession(session.id);
                          }}
                          type="button"
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[var(--danger-soft)] px-2 py-1.5 text-[11px] font-medium text-[var(--danger)] transition hover:opacity-80"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-border px-3 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <button
            onClick={() => {
              onOpenSettings?.();
              onCloseMobile();
            }}
            type="button"
            className="focus-ring flex flex-1 items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-medium text-muted-foreground transition hover:bg-surface-2 hover:text-foreground"
            title="Settings"
          >
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </button>
          <button
            onClick={handleClearAll}
            type="button"
            className="focus-ring flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
            title="Delete all conversations"
          >
            <Eraser className="h-4 w-4" />
          </button>
        </div>
      </aside>
    </>
  );
};
