"use client";

import React, { useState, useEffect } from "react";
import {
  Activity,
  BookOpen,
  Sliders,
  Brain,
  X,
  Trash2,
  Plus,
  Check,
  Sparkles,
} from "lucide-react";
import { formatTimeUntilReset, cn } from "@/lib/utils";
import {
  getStoredCustomization,
  setStoredCustomization,
  getStoredMemories,
  setStoredMemories,
  getStoredTokens,
  MAX_DAILY_TOKENS,
  CustomizationSettings,
  MemoryItem,
  DEFAULT_CUSTOMIZATION,
} from "@/lib/storage";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  usedCredits: number;
  usedTokens?: number;
  setUsedCredits: (val: number) => void;
  resetTimestamp?: number;
}

type TabId = "limits" | "customization" | "memories" | "docs";

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "limits", label: "Usage", icon: Activity },
  { id: "customization", label: "Style", icon: Sliders },
  { id: "memories", label: "Memories", icon: Brain },
  { id: "docs", label: "Models", icon: BookOpen },
];

const PERSONALITIES = [
  { id: "default", label: "Default", desc: "Balanced, standard assistant voice." },
  { id: "professional", label: "Professional", desc: "Formal and business-ready, no fluff." },
  { id: "friendly", label: "Friendly", desc: "Warm, encouraging, and approachable." },
  { id: "direct", label: "Direct", desc: "Answer-first, concise, minimal preamble." },
  { id: "quirky", label: "Quirky", desc: "Playful, witty, and unconventional." },
];

const MODELS = [
  {
    name: "Instant Tier",
    model: "Neural 2-light",
    desc: "Built for instant speed on everyday tasks, with ultra-low latency for rapid back-and-forth.",
    points: [
      "Sequential stream engine fires words back near-instantly.",
      "Low-latency routing skips heavy verification layers.",
      "Think Deeper upgrades it to Neural 2-light Thinking.",
    ],
  },
  {
    name: "PRO Tier",
    model: "Neural 2-PRO",
    desc: "The deep reasoning engine that plans and analyzes before answering.",
    points: [
      "Orchestrated reasoning loop plans the answer first.",
      "Optimized for complex logic, math, and synthesis.",
      "Think Deeper upgrades it to Neural 2-PRO Thinking.",
    ],
  },
  {
    name: "Web Builder",
    model: "Neural 2.1-Web",
    desc: "Generates responsive, polished landing pages and web showcases in real time.",
    points: [
      "Synthesizes clean HTML5 with utility-first styling.",
      "Renders visual code straight into the preview sandbox.",
      "Enforces responsive grids and accessible contrast.",
    ],
  },
  {
    name: "App Builder",
    model: "Neural 2.1-App",
    desc: "Constructs stateful apps, dashboards, interactive tools, and mini-games.",
    points: [
      "Builds dynamic client state and event loops.",
      "Handles DOM events, animation, and browser APIs.",
      "Packages self-contained logic for instant execution.",
    ],
  },
  {
    name: "3D Builder",
    model: "Preview build",
    desc: "Experimental Three.js and WebGL generation for scenes, models, and shaders.",
    points: [
      "Composes meshes, materials, lights, and particles.",
      "Embeds GLSL shaders and synthesized audio.",
      "Wires up orbit and pointer-lock controls.",
    ],
    badge: "Beta",
  },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  usedCredits,
  usedTokens: usedTokensProp,
  resetTimestamp,
}) => {
  const [activeTab, setActiveTab] = useState<TabId>("limits");
  const [customization, setCustomization] = useState<CustomizationSettings>(DEFAULT_CUSTOMIZATION);
  const [isSavedToast, setIsSavedToast] = useState(false);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [newMemoryInput, setNewMemoryInput] = useState("");

  const storedTokensInfo = getStoredTokens();
  const currentTokens = usedTokensProp !== undefined ? usedTokensProp : storedTokensInfo.usedTokens;
  const currentPercentage = Math.min(100, Math.round((currentTokens / MAX_DAILY_TOKENS) * 1000) / 10);

  useEffect(() => {
    if (!isOpen) return;
    const loadedCustom = getStoredCustomization();
    const loadedMems = getStoredMemories();
    const timer = setTimeout(() => {
      setCustomization(loadedCustom);
      setMemories(loadedMems);
    }, 0);
    return () => clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const handleSaveCustomization = (updated: CustomizationSettings) => {
    setCustomization(updated);
    setStoredCustomization(updated);
    setIsSavedToast(true);
    setTimeout(() => setIsSavedToast(false), 2000);
  };

  const handleAddManualMemory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemoryInput.trim()) return;
    const now = Date.now();
    const newItem: MemoryItem = {
      id: "mem_" + now + "_" + Math.random().toString(36).substring(2, 6),
      text: newMemoryInput.trim(),
      createdAt: now,
    };
    const updated = [newItem, ...memories];
    setMemories(updated);
    setStoredMemories(updated);
    setNewMemoryInput("");
  };

  const handleDeleteMemory = (id: string) => {
    const updated = memories.filter((m) => m.id !== id);
    setMemories(updated);
    setStoredMemories(updated);
  };

  const handleClearAllMemories = () => {
    if (confirm("Delete all saved memories?")) {
      setMemories([]);
      setStoredMemories([]);
    }
  };

  if (!isOpen) return null;

  const tabButtonClass = (isActive: boolean) =>
    cn(
      "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-medium transition",
      isActive ? "bg-primary-soft text-[var(--primary)]" : "text-muted-foreground hover:bg-surface-2 hover:text-foreground"
    );

  const fieldClass =
    "custom-scrollbar w-full resize-none rounded-xl border border-border bg-surface-2 p-3 text-xs leading-relaxed text-foreground placeholder:text-muted-foreground focus:border-[color-mix(in_srgb,var(--primary)_55%,var(--border))] focus:outline-none";

  return (
    <div className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center p-3 md:p-6">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      <div className="relative z-10 flex h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-border bg-surface shadow-2xl md:h-[600px] md:flex-row">
        {/* Desktop nav */}
        <div className="hidden w-56 shrink-0 flex-col gap-1 border-r border-border bg-background/60 p-4 md:flex">
          <div className="px-3 pb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Settings
          </div>
          <nav className="flex flex-col gap-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={tabButtonClass(isActive)}>
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{tab.label}</span>
                  {tab.id === "memories" && memories.length > 0 && (
                    <span className="ml-auto rounded-full bg-surface-3 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                      {memories.length}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="custom-scrollbar flex min-w-0 flex-1 flex-col overflow-y-auto p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-foreground">
              {activeTab === "limits" && "Usage & limits"}
              {activeTab === "customization" && "Style & personality"}
              {activeTab === "memories" && "Saved memories"}
              {activeTab === "docs" && "Models & tiers"}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="focus-ring flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-surface-2 hover:text-foreground"
              title="Close settings"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Mobile tabs */}
          <div className="no-scrollbar mb-4 flex shrink-0 gap-1 overflow-x-auto rounded-2xl border border-border bg-surface-2 p-1 md:hidden">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-medium transition",
                  activeTab === tab.id ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "limits" && (
            <div className="flex animate-fade-in flex-col gap-5">
              <p className="text-xs leading-relaxed text-muted-foreground">
                A single daily pool covers every model. Usage is calculated from tokens consumed and resets
                automatically every 24 hours.
              </p>

              <div className="rounded-2xl border border-border bg-surface-2 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Daily usage
                  </span>
                  <span className="font-mono text-sm font-bold text-foreground">{currentPercentage}%</span>
                </div>

                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-3">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500 ease-out",
                      currentPercentage >= 100 ? "bg-[var(--danger)]" : "bg-[var(--primary)]"
                    )}
                    style={{ width: currentPercentage + "%" }}
                  />
                </div>

                <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{currentPercentage >= 100 ? "Limit reached" : "Unified daily pool"}</span>
                  {resetTimestamp ? <span>Resets in {formatTimeUntilReset(resetTimestamp)}</span> : null}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-surface-2 p-4">
                <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Available tiers
                </div>
                <div className="space-y-2.5">
                  {MODELS.map((m) => (
                    <div key={m.name} className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground">{m.name}</span>
                      <span className="font-mono text-[11px] text-muted-foreground">{m.model}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "customization" && (
            <div className="flex animate-fade-in flex-col gap-5">
              <div>
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-foreground">Talking style</h4>
                  {isSavedToast && (
                    <span className="flex animate-fade-in items-center gap-1 text-xs font-medium text-[var(--success)]">
                      <Check className="h-3.5 w-3.5" /> Saved
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Choose how the assistant sounds across Instant and PRO conversations.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                {PERSONALITIES.map((opt) => {
                  const isSelected = customization.personality === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSaveCustomization({ ...customization, personality: opt.id })}
                      className={cn(
                        "flex items-center justify-between gap-3 rounded-2xl border p-3 text-left text-xs transition",
                        isSelected
                          ? "border-[color-mix(in_srgb,var(--primary)_45%,transparent)] bg-primary-soft"
                          : "border-border bg-surface-2 hover:bg-surface-3"
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span
                          className={cn(
                            "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition",
                            isSelected ? "border-[var(--primary)] bg-[var(--primary)]" : "border-border-strong"
                          )}
                        >
                          {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                        </span>
                        <span className="min-w-0">
                          <span className="block font-semibold text-foreground">{opt.label}</span>
                          <span className="block text-[11px] leading-normal text-muted-foreground">{opt.desc}</span>
                        </span>
                      </span>
                      {isSelected && <Check className="h-4 w-4 shrink-0 text-[var(--primary)]" />}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center justify-between text-xs font-semibold text-foreground">
                  <span>About you</span>
                  <span className="text-[10px] font-normal text-muted-foreground">Background & preferences</span>
                </label>
                <textarea
                  rows={3}
                  value={customization.userAbout}
                  onChange={(e) => handleSaveCustomization({ ...customization, userAbout: e.target.value })}
                  placeholder="Share what the assistant should know about you."
                  className={fieldClass}
                />
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center justify-between text-xs font-semibold text-foreground">
                  <span>Custom instructions</span>
                  <span className="text-[10px] font-normal text-muted-foreground">How it should reply</span>
                </label>
                <textarea
                  rows={3}
                  value={customization.customInstructions}
                  onChange={(e) => handleSaveCustomization({ ...customization, customInstructions: e.target.value })}
                  placeholder="Tell the assistant how you would like it to respond."
                  className={fieldClass}
                />
              </div>
            </div>
          )}

          {activeTab === "memories" && (
            <div className="flex animate-fade-in flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  In Instant and PRO chats, the assistant quietly notes details that can personalize future
                  conversations. Builder chats do not store memories.
                </p>
                {memories.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllMemories}
                    className="shrink-0 text-xs font-medium text-[var(--danger)] transition hover:opacity-80"
                  >
                    Clear all
                  </button>
                )}
              </div>

              <form onSubmit={handleAddManualMemory} className="flex gap-2">
                <input
                  type="text"
                  value={newMemoryInput}
                  onChange={(e) => setNewMemoryInput(e.target.value)}
                  placeholder="Add a memory manually..."
                  className="flex-1 rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-[color-mix(in_srgb,var(--primary)_55%,var(--border))] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!newMemoryInput.trim()}
                  className="focus-ring flex shrink-0 items-center gap-1 rounded-xl bg-[var(--primary)] px-3.5 py-2 text-xs font-semibold text-[var(--primary-foreground)] transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </button>
              </form>

              <div className="space-y-2">
                {memories.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border p-8 text-center">
                    <Brain className="h-6 w-6 text-muted-foreground" />
                    <p className="text-xs font-medium text-foreground">No memories yet</p>
                    <p className="max-w-sm text-[11px] leading-relaxed text-muted-foreground">
                      The assistant will save useful details here as you chat, or you can add one above.
                    </p>
                  </div>
                ) : (
                  memories.map((mem) => (
                    <div
                      key={mem.id}
                      className="group flex items-start justify-between gap-3 rounded-2xl border border-border bg-surface-2 p-3 text-xs transition hover:border-border-strong"
                    >
                      <div className="flex min-w-0 items-start gap-2.5">
                        <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--warning)]" />
                        <span className="break-words leading-relaxed text-foreground/90">{mem.text}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteMemory(mem.id)}
                        className="shrink-0 rounded-lg p-1 text-muted-foreground transition hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
                        title="Delete memory"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === "docs" && (
            <div className="flex animate-fade-in flex-col gap-4">
              <p className="text-xs leading-relaxed text-muted-foreground">
                A quick tour of every model tier and what it is optimized for.
              </p>

              {MODELS.map((m) => (
                <div key={m.name} className="rounded-2xl border border-border bg-surface-2 p-4">
                  <div className="flex items-center justify-between gap-3 border-b border-border pb-2.5">
                    <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      {m.name}
                      {m.badge && (
                        <span className="rounded-md bg-surface-3 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                          {m.badge}
                        </span>
                      )}
                    </span>
                    <span className="font-mono text-[11px] text-muted-foreground">{m.model}</span>
                  </div>
                  <p className="mt-2.5 text-xs leading-relaxed text-foreground/80">{m.desc}</p>
                  <ul className="mt-3 space-y-1.5">
                    {m.points.map((p) => (
                      <li key={p} className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--primary)]" />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
