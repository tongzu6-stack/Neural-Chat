"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Message,
  ChatSession,
  FileAttachment,
  calculateSessionTokens,
  estimateTokens,
  getTimestamp,
  generateId,
} from "@/lib/tokenizer";
import { TIER_CREDIT_COSTS } from "@/lib/utils";
import {
  getStoredSessions,
  setStoredSessions,
  getStoredCredits,
  setStoredCredits,
  getStoredTokens,
  addStoredTokens,
  MAX_DAILY_TOKENS,
  subscribeCrossTabSync,
  getStoredCustomization,
  getStoredMemories,
  setStoredMemories,
  MemoryItem,
} from "@/lib/storage";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { ChatMessage } from "@/components/ChatMessage";
import { InputBar } from "@/components/InputBar";
import { SettingsModal } from "@/components/SettingsModal";
import { BrandMark } from "@/components/Brand";
import { Lightbulb, Code2, PenLine, Boxes, Sparkles } from "lucide-react";

export default function ChatPage() {
  const [sessions, setSessions] = useState<ChatSession[]>(() => getStoredSessions());
  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    const init = getStoredSessions();
    return init[0]?.id || "";
  });
  const [inputDrafts, setInputDrafts] = useState<Record<string, string>>({});
  const [draftAttachmentsMap, setDraftAttachmentsMap] = useState<Record<string, FileAttachment[]>>({});
  const [loadingSessions, setLoadingSessions] = useState<
    Record<string, { tool?: "web_builder" | "app_builder" | "three_d_builder" | "think_deeper" | null; tier?: string }>
  >({});
  const [selectedTool, setSelectedTool] = useState<"web_builder" | "app_builder" | "three_d_builder" | "think_deeper" | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [usedTokens, setUsedTokensState] = useState<number>(() => getStoredTokens().usedTokens);
  const [usedCredits, setUsedCreditsState] = useState<number>(() => getStoredTokens().percentage);
  const [resetTimestamp, setResetTimestampState] = useState<number>(() => getStoredTokens().resetTimestamp);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Subscribe to cross-tab synchronization and enforce fresh storage sync
  useEffect(() => {
    const unsubscribe = subscribeCrossTabSync(
      (newSessions) => {
        setSessions(newSessions);
        setActiveSessionId((currentActiveId) => {
          if (!newSessions.some((s) => s.id === currentActiveId)) {
            return newSessions[0]?.id || "";
          }
          return currentActiveId;
        });
      },
      (credits, resetTime) => {
        setUsedCreditsState(credits);
        setResetTimestampState(resetTime);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  // Periodic check for 24-hour daily reset
  useEffect(() => {
    const interval = setInterval(() => {
      const now = getTimestamp();
      if (resetTimestamp && now - resetTimestamp >= 86400000) {
        setStoredCredits(0, now);
        setUsedCreditsState(0);
        setResetTimestampState(now);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [resetTimestamp]);

  // Active session object & drafts
  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];
  const activeInputDraft = activeSessionId ? inputDrafts[activeSessionId] || "" : "";
  const activeDraftAttachments = activeSessionId ? draftAttachmentsMap[activeSessionId] || [] : [];

  const setInputDraftForActive = (value: string) => {
    if (!activeSessionId) return;
    setInputDrafts((prev) => ({ ...prev, [activeSessionId]: value }));
  };

  const handleAddAttachments = (newAtts: FileAttachment[]) => {
    if (!activeSessionId) return;
    setDraftAttachmentsMap((prev) => ({
      ...prev,
      [activeSessionId]: [...(prev[activeSessionId] || []), ...newAtts],
    }));
  };

  const handleRemoveAttachment = (id: string) => {
    if (!activeSessionId) return;
    setDraftAttachmentsMap((prev) => ({
      ...prev,
      [activeSessionId]: (prev[activeSessionId] || []).filter((a) => a.id !== id),
    }));
  };

  // Scroll to bottom when messages in active session change or when active session finishes loading
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const isCurrentSessionLoading = Boolean(activeSessionId && loadingSessions[activeSessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [activeSession?.messages?.length, isCurrentSessionLoading, activeSessionId, scrollToBottom]);

  // Helper to create a new chat session
  const handleNewChat = () => {
    const now = getTimestamp();
    const newSessionId = generateId("session");
    const newSession: ChatSession = {
      id: newSessionId,
      title: `Chat ${sessions.length + 1}`,
      messages: [],
      updatedAt: now,
      selectedTier: "Instant",
    };

    const latestSessions = getStoredSessions();
    const updatedSessions = [newSession, ...latestSessions];
    setStoredSessions(updatedSessions);
    setSessions(updatedSessions);
    setActiveSessionId(newSession.id);
  };

  // Helper to delete a session
  const handleDeleteSession = (idToDelete: string) => {
    const now = getTimestamp();
    const latestSessions = getStoredSessions();
    const filtered = latestSessions.filter((s) => s.id !== idToDelete);

    let updatedSessions = filtered;
    if (filtered.length === 0) {
      const fresh: ChatSession = {
        id: generateId("session"),
        title: "Chat 1",
        messages: [],
        updatedAt: now,
        selectedTier: "Instant",
      };
      updatedSessions = [fresh];
    }

    setStoredSessions(updatedSessions);
    setSessions(updatedSessions);

    if (activeSessionId === idToDelete) {
      setActiveSessionId(updatedSessions[0].id);
    }
  };

  // Helper to clear all history
  const handleClearAllSessions = () => {
    const now = getTimestamp();
    const fresh: ChatSession = {
      id: generateId("session"),
      title: "New Conversation",
      messages: [],
      updatedAt: now,
      selectedTier: "Instant",
    };
    const updatedSessions = [fresh];
    setStoredSessions(updatedSessions);
    setSessions(updatedSessions);
    setActiveSessionId(fresh.id);
    setInputDrafts({});
    setDraftAttachmentsMap({});
  };

  // Helper to change model tier for active session
  const handleChangeTier = (tier: "Instant" | "PRO") => {
    if (!activeSession) return;
    const latestSessions = getStoredSessions();
    const updatedSessions = latestSessions.map((s) =>
      s.id === activeSession.id ? { ...s, selectedTier: tier } : s
    );
    setStoredSessions(updatedSessions);
    setSessions(updatedSessions);
  };

  // Helper to update active chat title
  const handleUpdateTitle = (id: string, newTitle: string) => {
    const latestSessions = getStoredSessions();
    const updatedSessions = latestSessions.map((s) =>
      s.id === id ? { ...s, title: newTitle } : s
    );
    setStoredSessions(updatedSessions);
    setSessions(updatedSessions);
  };

  // Calculate current total tokens for active chat (includes messages + input text + draft attachments)
  const totalSessionTokens = activeSession
    ? calculateSessionTokens(activeSession.messages, activeInputDraft, activeDraftAttachments)
    : estimateTokens(activeInputDraft) + activeDraftAttachments.length * 2500;

  // Send message to backend proxy
  const handleSendMessage = async (
    customPrompt?: string,
    toolParam?: "web_builder" | "app_builder" | "three_d_builder" | "think_deeper" | boolean | null,
    attachmentsParam?: FileAttachment[]
  ) => {
    const promptToSend = customPrompt !== undefined ? customPrompt : activeInputDraft;
    const attachmentsToSend = attachmentsParam !== undefined ? attachmentsParam : activeDraftAttachments;

    if ((!promptToSend.trim() && attachmentsToSend.length === 0) || !activeSession) return;
    if (attachmentsToSend.length > 3) return;

    const targetSessionId = activeSession.id;
    if (loadingSessions[targetSessionId]) return; // Already loading for this session

    // Resolve active tool
    let activeTool: "web_builder" | "app_builder" | "three_d_builder" | "think_deeper" | null = selectedTool;
    if (typeof toolParam === "string") {
      activeTool = toolParam;
    } else if (toolParam === true) {
      activeTool = "web_builder";
    }

    // Check 24-hour reset and token limit (255K tokens)
    const tokenInfo = getStoredTokens();
    if (tokenInfo.usedTokens >= MAX_DAILY_TOKENS || tokenInfo.percentage >= 100) {
      return;
    }

    const userText = promptToSend.trim();
    const sendTime = getTimestamp();

    const userMessage: Message = {
      id: generateId("msg_usr"),
      role: "user",
      content: userText,
      attachments: attachmentsToSend.length > 0 ? attachmentsToSend : undefined,
      timestamp: sendTime,
    };

    // Read latest sessions from storage to prevent overwriting
    const currentSessions = getStoredSessions();
    const targetSessionObj = currentSessions.find((s) => s.id === targetSessionId) || activeSession;

    const updatedMessages = [...targetSessionObj.messages, userMessage];

    // Auto-generate title if first message
    let newTitle = targetSessionObj.title;
    if (targetSessionObj.messages.length === 0 || targetSessionObj.title === "New Conversation") {
      const titleText = userText || (attachmentsToSend[0] ? `Attached: ${attachmentsToSend[0].name}` : "File Attachment");
      newTitle = titleText.length > 32 ? titleText.slice(0, 32) + "..." : titleText;
    }

    const nextSessionsAfterUser = currentSessions.map((s) =>
      s.id === targetSessionId
        ? {
            ...s,
            title: newTitle,
            messages: updatedMessages,
            updatedAt: sendTime,
          }
        : s
    );

    // Persist user message IMMEDIATELY to localStorage before firing fetch request
    setStoredSessions(nextSessionsAfterUser);
    setSessions(nextSessionsAfterUser);

    // Clear draft input and attachments for active session
    if (customPrompt === undefined) {
      setInputDrafts((prev) => ({ ...prev, [targetSessionId]: "" }));
      setDraftAttachmentsMap((prev) => ({ ...prev, [targetSessionId]: [] }));
    }

    // Mark ONLY this specific session as loading
    setLoadingSessions((prev) => ({
      ...prev,
      [targetSessionId]: { tool: activeTool, tier: targetSessionObj.selectedTier },
    }));

    try {
      // Prepare API message history (only user and assistant)
      const apiMessages = updatedMessages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({
          role: m.role,
          content: m.content,
          attachments: m.attachments,
        }));

      // Fetch stored customization and memories (for Instant and PRO modes)
      const customization = getStoredCustomization();
      const memories = getStoredMemories();

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          tier: targetSessionObj.selectedTier || "Instant",
          tool: activeTool || undefined,
          isCodingMode: activeTool === "web_builder" || activeTool === "app_builder" || activeTool === "three_d_builder",
          customization,
          memories,
          attachments: attachmentsToSend.length > 0 ? attachmentsToSend : undefined,
        }),
      });

      const data = await res.json();
      const responseTime = getTimestamp();

      // Record accurate token usage returned from API (or fallback estimate including attachments)
      const turnTokens =
        data.tokenUsage?.totalTokens && typeof data.tokenUsage.totalTokens === "number"
          ? data.tokenUsage.totalTokens
          : estimateTokens(userText + (data.message || "")) + attachmentsToSend.length * 2500;

      const updatedTokenInfo = addStoredTokens(turnTokens);
      setUsedTokensState(updatedTokenInfo.usedTokens);
      setUsedCreditsState(updatedTokenInfo.percentage);
      setResetTimestampState(updatedTokenInfo.resetTimestamp);

      // Automatically store extracted memories if returned (Instant and PRO modes)
      if (
        activeTool !== "web_builder" &&
        activeTool !== "app_builder" &&
        activeTool !== "three_d_builder" &&
        Array.isArray(data.extractedMemories) &&
        data.extractedMemories.length > 0
      ) {
        const currentMems = getStoredMemories();
        const existingTexts = new Set(currentMems.map((m) => m.text.toLowerCase().trim()));
        const newMemsToInsert: MemoryItem[] = [];

        for (const newFact of data.extractedMemories) {
          if (typeof newFact === "string" && newFact.trim() && !existingTexts.has(newFact.toLowerCase().trim())) {
            existingTexts.add(newFact.toLowerCase().trim());
            newMemsToInsert.push({
              id: generateId("mem"),
              text: newFact.trim(),
              createdAt: responseTime,
            });
          }
        }

        if (newMemsToInsert.length > 0) {
          setStoredMemories([...newMemsToInsert, ...currentMems]);
        }
      }

      let responseMsg: Message;
      if (data.error) {
        responseMsg = {
          id: generateId("msg_err"),
          role: "error",
          content: data.error,
          timestamp: responseTime,
        };
      } else {
        responseMsg = {
          id: generateId("msg_ast"),
          role: "assistant",
          content: data.message || "No response received.",
          thinkingText: data.thinkingText || undefined,
          timestamp: responseTime,
          tier: targetSessionObj.selectedTier,
          isBuildWeb: activeTool === "web_builder" || activeTool === "app_builder" || activeTool === "three_d_builder",
          tool: activeTool,
        };
      }

      // Read fresh sessions from storage to append assistant message safely
      const freshSessions = getStoredSessions();
      const updatedSessionsWithResp = freshSessions.map((s) =>
        s.id === targetSessionId
          ? { ...s, messages: [...s.messages, responseMsg], updatedAt: responseTime }
          : s
      );

      setStoredSessions(updatedSessionsWithResp);
      setSessions(updatedSessionsWithResp);
    } catch (err) {
      console.error("Fetch chat error:", err);
      const errTime = getTimestamp();
      const fallbackErr: Message = {
        id: generateId("msg_err"),
        role: "error",
        content:
          "The proxy server is currently overloaded or experiencing a timeout. Please try again or switch model tiers.",
        timestamp: errTime,
      };

      const freshSessions = getStoredSessions();
      const updatedSessionsWithErr = freshSessions.map((s) =>
        s.id === targetSessionId
          ? { ...s, messages: [...s.messages, fallbackErr], updatedAt: errTime }
          : s
      );

      setStoredSessions(updatedSessionsWithErr);
      setSessions(updatedSessionsWithErr);
    } finally {
      // Clear loading state for this session
      setLoadingSessions((prev) => {
        const next = { ...prev };
        delete next[targetSessionId];
        return next;
      });
    }
  };

  // Retry trigger for last prompt
  const handleRetry = () => {
    if (!activeSession || activeSession.messages.length === 0) return;
    const lastUserMsg = [...activeSession.messages]
      .reverse()
      .find((m) => m.role === "user");

    if (lastUserMsg) {
      handleSendMessage(lastUserMsg.content, undefined, lastUserMsg.attachments);
    }
  };

  // Map loadingSessionIds boolean record for Sidebar
  const sidebarLoadingMap: Record<string, boolean> = {};
  Object.keys(loadingSessions).forEach((id) => {
    sidebarLoadingMap[id] = true;
  });

  const starterCards = [
    {
      title: "Explain a concept",
      subtitle: "Quantum computing, simply",
      icon: Lightbulb,
      prompt: "Explain Quantum Computing in simple terms using everyday analogies.",
    },
    {
      title: "Write some code",
      subtitle: "High-performance Python",
      icon: Code2,
      prompt: "Write a high-performance Python script to parse large JSON log files concurrently.",
    },
    {
      title: "Draft a message",
      subtitle: "Launch announcement email",
      icon: PenLine,
      prompt: "Draft a clean, high-converting launch email for an AI developer tool.",
    },
    {
      title: "Plan an architecture",
      subtitle: "Distributed key-value store",
      icon: Boxes,
      prompt: "Outline the key architecture components of a distributed low-latency key-value store.",
    },
  ];

  const loadingLabel = activeSession
    ? loadingSessions[activeSession.id]?.tool === "app_builder"
      ? "App Builder"
      : loadingSessions[activeSession.id]?.tool === "web_builder"
      ? "Web Builder"
      : loadingSessions[activeSession.id]?.tool === "three_d_builder"
      ? "3D Builder"
      : loadingSessions[activeSession.id]?.tool === "think_deeper"
      ? "Think Deeper"
      : loadingSessions[activeSession.id]?.tier || activeSession.selectedTier
    : "Instant";

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background font-sans text-foreground">
      <Sidebar
        sessions={sessions}
        activeSessionId={activeSession?.id || ""}
        isOpen={isSidebarOpen}
        loadingSessionIds={sidebarLoadingMap}
        onSelectSession={(id) => setActiveSessionId(id)}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
        onClearAllSessions={handleClearAllSessions}
        onCloseMobile={() => setIsSidebarOpen(false)}
        onRenameSession={handleUpdateTitle}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <div className="relative flex h-full min-w-0 flex-1 flex-col bg-background">
        <Header
          chatTitle={activeSession?.title || "New Conversation"}
          totalTokens={totalSessionTokens}
          selectedTier={activeSession?.selectedTier || "Instant"}
          activeTool={selectedTool}
          isBuildWebActive={selectedTool === "web_builder"}
          onChangeTier={handleChangeTier}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onNewChat={handleNewChat}
        />

        <main className="custom-scrollbar flex-1 overflow-y-auto px-3 py-6 md:px-8">
          <div className="mx-auto flex min-h-full max-w-3xl flex-col">
            {!activeSession || activeSession.messages.length === 0 ? (
              <div className="my-auto flex flex-col items-center px-1 py-8 text-center">
                <BrandMark className="h-14 w-14 rounded-3xl" iconClassName="h-6 w-6" />
                <h2 className="mt-5 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  How can I help today?
                </h2>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                  Ask anything, attach an image, or switch on a builder tool to make something new.
                </p>

                <div className="mt-8 grid w-full grid-cols-1 gap-2.5 text-left sm:grid-cols-2">
                  {starterCards.map((card) => {
                    const Icon = card.icon;
                    return (
                      <button
                        key={card.title}
                        disabled={usedCredits >= 100}
                        onClick={() => handleSendMessage(card.prompt)}
                        type="button"
                        className="group flex items-start gap-3 rounded-2xl border border-border bg-surface p-3.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-[var(--primary)] transition group-hover:bg-primary-soft">
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-medium text-foreground">{card.title}</span>
                          <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                            {card.subtitle}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-8 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Powered by ChatNeural</span>
                </div>
              </div>
            ) : (
              <div className="flex-1 space-y-1 pb-4">
                {activeSession.messages.map((msg) => (
                  <ChatMessage
                    key={msg.id}
                    message={msg}
                    onRetry={msg.role === "error" ? handleRetry : undefined}
                  />
                ))}

                {isCurrentSessionLoading && (
                  <div className="flex items-start gap-3 py-2.5">
                    <BrandMark
                      className="mt-0.5 hidden h-8 w-8 shrink-0 sm:inline-flex"
                      iconClassName="h-3.5 w-3.5"
                    />
                    <div className="flex items-center gap-2.5 rounded-2xl border border-border bg-surface px-4 py-3 text-xs text-muted-foreground shadow-sm">
                      <span className="flex items-center gap-1">
                        <span
                          className="h-1.5 w-1.5 animate-blink rounded-full bg-[var(--primary)]"
                          style={{ animationDelay: "0ms" }}
                        />
                        <span
                          className="h-1.5 w-1.5 animate-blink rounded-full bg-[var(--primary)]"
                          style={{ animationDelay: "160ms" }}
                        />
                        <span
                          className="h-1.5 w-1.5 animate-blink rounded-full bg-[var(--primary)]"
                          style={{ animationDelay: "320ms" }}
                        />
                      </span>
                      <span>Thinking with {loadingLabel}…</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </main>

        <InputBar
          inputDraft={activeInputDraft}
          onChangeInput={setInputDraftForActive}
          draftAttachments={activeDraftAttachments}
          onAddAttachments={handleAddAttachments}
          onRemoveAttachment={handleRemoveAttachment}
          onSend={(toolMode, atts) => handleSendMessage(undefined, toolMode, atts)}
          isLoading={isCurrentSessionLoading}
          selectedTier={activeSession?.selectedTier || "Instant"}
          activeTool={selectedTool}
          onSelectTool={(tool) => setSelectedTool(tool)}
          isBuildWebActive={selectedTool === "web_builder"}
          onToggleBuildWeb={(active) => setSelectedTool(active ? "web_builder" : null)}
          totalSessionTokens={totalSessionTokens}
          usedCredits={usedCredits}
          resetTimestamp={resetTimestamp}
        />
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        usedCredits={usedCredits}
        usedTokens={usedTokens}
        setUsedCredits={(val) => {
          setStoredCredits(val, resetTimestamp);
          setUsedCreditsState(val);
        }}
        resetTimestamp={resetTimestamp}
      />
    </div>
  );
}
