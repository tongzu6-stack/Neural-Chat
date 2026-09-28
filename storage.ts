import { ChatSession, getTimestamp } from "./tokenizer";

export const STORAGE_KEY = "chatbot_history";
export const TOKENS_STORAGE_KEY = "chat_used_tokens";
export const CREDITS_STORAGE_KEY = "chat_used_credits"; // fallback alias
export const RESET_TIME_STORAGE_KEY = "chat_credit_reset_time";
export const CUSTOMIZATION_STORAGE_KEY = "chat_customization";
export const MEMORIES_STORAGE_KEY = "chat_memories";
export const DAILY_IMAGES_STORAGE_KEY = "chat_daily_images_count";

export const MAX_DAILY_TOKENS = 222000;
export const MAX_DAILY_IMAGES = 10;

export interface CustomizationSettings {
  personality: string;
  customPersonalityText?: string;
  userAbout: string;
  customInstructions: string;
}

export interface MemoryItem {
  id: string;
  text: string;
  createdAt: number;
}

export const DEFAULT_CUSTOMIZATION: CustomizationSettings = {
  personality: "default",
  customPersonalityText: "",
  userAbout: "",
  customInstructions: "",
};

const CHANNEL_NAME = "chat_neural_sync_channel";

export const INITIAL_SESSIONS: ChatSession[] = [
  {
    id: "session_init",
    title: "Chat 1",
    messages: [],
    updatedAt: 1700000000000,
    selectedTier: "Instant",
  },
];

/**
 * Safely parse JSON from localStorage without throwing
 */
export function getStoredSessions(): ChatSession[] {
  if (typeof window === "undefined") return INITIAL_SESSIONS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_SESSIONS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (e) {
    console.error("Failed to read sessions from localStorage:", e);
  }
  return INITIAL_SESSIONS;
}

/**
 * Save sessions to localStorage and broadcast change to other tabs
 */
export function setStoredSessions(sessions: ChatSession[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    broadcastSyncMessage({ type: "SESSIONS_UPDATED", payload: sessions });
  } catch (e) {
    console.error("Failed to save sessions to localStorage:", e);
  }
}

/**
 * Safely parse stored tokens and reset time, enforcing 24h reset
 */
export function getStoredTokens(): {
  usedTokens: number;
  maxTokens: number;
  percentage: number;
  resetTimestamp: number;
} {
  const now = getTimestamp();
  if (typeof window === "undefined") {
    return { usedTokens: 0, maxTokens: MAX_DAILY_TOKENS, percentage: 0, resetTimestamp: now };
  }

  try {
    const savedReset = localStorage.getItem(RESET_TIME_STORAGE_KEY);
    let resetTime = savedReset ? parseInt(savedReset, 10) : now;
    if (isNaN(resetTime) || resetTime <= 0) {
      resetTime = now;
    }

    // 24-hour daily reset check
    if (now - resetTime >= 86400000) {
      resetTime = now;
      localStorage.setItem(TOKENS_STORAGE_KEY, "0");
      localStorage.setItem(CREDITS_STORAGE_KEY, "0");
      localStorage.setItem(RESET_TIME_STORAGE_KEY, resetTime.toString());
      return { usedTokens: 0, maxTokens: MAX_DAILY_TOKENS, percentage: 0, resetTimestamp: resetTime };
    }

    const savedTokens = localStorage.getItem(TOKENS_STORAGE_KEY);
    let tokens = savedTokens ? parseInt(savedTokens, 10) : 0;
    if (isNaN(tokens) || tokens < 0) {
      tokens = 0;
    }

    const percentage = Math.min(100, Math.round((tokens / MAX_DAILY_TOKENS) * 1000) / 10);

    return {
      usedTokens: tokens,
      maxTokens: MAX_DAILY_TOKENS,
      percentage,
      resetTimestamp: resetTime,
    };
  } catch (e) {
    console.error("Failed to read tokens from localStorage:", e);
    return { usedTokens: 0, maxTokens: MAX_DAILY_TOKENS, percentage: 0, resetTimestamp: now };
  }
}

/**
 * Save tokens to localStorage and broadcast change
 */
export function setStoredTokens(
  usedTokens: number,
  resetTimestamp: number
): { usedTokens: number; maxTokens: number; percentage: number; resetTimestamp: number } {
  if (typeof window === "undefined") {
    return { usedTokens, maxTokens: MAX_DAILY_TOKENS, percentage: 0, resetTimestamp };
  }
  try {
    const percentage = Math.min(100, Math.round((usedTokens / MAX_DAILY_TOKENS) * 1000) / 10);
    localStorage.setItem(TOKENS_STORAGE_KEY, usedTokens.toString());
    localStorage.setItem(CREDITS_STORAGE_KEY, percentage.toString());
    localStorage.setItem(RESET_TIME_STORAGE_KEY, resetTimestamp.toString());
    broadcastSyncMessage({
      type: "CREDITS_UPDATED",
      payload: { usedCredits: percentage, resetTimestamp },
    });
    return { usedTokens, maxTokens: MAX_DAILY_TOKENS, percentage, resetTimestamp };
  } catch (e) {
    console.error("Failed to save tokens to localStorage:", e);
    return { usedTokens, maxTokens: MAX_DAILY_TOKENS, percentage: 0, resetTimestamp };
  }
}

/**
 * Add tokens to current usage and persist
 */
export function addStoredTokens(
  addedTokens: number
): { usedTokens: number; maxTokens: number; percentage: number; resetTimestamp: number } {
  const current = getStoredTokens();
  const nextTokens = current.usedTokens + Math.max(0, addedTokens);
  return setStoredTokens(nextTokens, current.resetTimestamp);
}

/**
 * Backward compatible getStoredCredits wrapper
 */
export function getStoredCredits(): { usedCredits: number; resetTimestamp: number } {
  const t = getStoredTokens();
  return { usedCredits: t.percentage, resetTimestamp: t.resetTimestamp };
}

/**
 * Backward compatible setStoredCredits wrapper
 */
export function setStoredCredits(usedCredits: number, resetTimestamp: number): void {
  const tokens = Math.round((usedCredits / 100) * MAX_DAILY_TOKENS);
  setStoredTokens(tokens, resetTimestamp);
}

/**
 * Get Customization settings from localStorage
 */
export function getStoredCustomization(): CustomizationSettings {
  if (typeof window === "undefined") return DEFAULT_CUSTOMIZATION;
  try {
    const raw = localStorage.getItem(CUSTOMIZATION_STORAGE_KEY);
    if (!raw) return DEFAULT_CUSTOMIZATION;
    const parsed = JSON.parse(raw);
    const validTones = ["default", "professional", "friendly", "direct", "quirky"];
    const personality = validTones.includes(parsed.personality) ? parsed.personality : "default";
    return { ...DEFAULT_CUSTOMIZATION, ...parsed, personality };
  } catch (e) {
    console.error("Failed to read customization from localStorage:", e);
    return DEFAULT_CUSTOMIZATION;
  }
}

/**
 * Save Customization settings to localStorage
 */
export function setStoredCustomization(customization: CustomizationSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CUSTOMIZATION_STORAGE_KEY, JSON.stringify(customization));
    broadcastSyncMessage({
      type: "CUSTOMIZATION_UPDATED",
      payload: customization,
    });
  } catch (e) {
    console.error("Failed to save customization to localStorage:", e);
  }
}

/**
 * Get stored Memories array from localStorage
 */
export function getStoredMemories(): MemoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(MEMORIES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch (e) {
    console.error("Failed to read memories from localStorage:", e);
  }
  return [];
}

/**
 * Get stored daily images count, enforcing 24h reset
 */
export function getStoredDailyImages(): { usedImages: number; maxImages: number; resetTimestamp: number } {
  const now = getTimestamp();
  if (typeof window === "undefined") {
    return { usedImages: 0, maxImages: MAX_DAILY_IMAGES, resetTimestamp: now };
  }

  try {
    const savedReset = localStorage.getItem(RESET_TIME_STORAGE_KEY);
    let resetTime = savedReset ? parseInt(savedReset, 10) : now;
    if (isNaN(resetTime) || resetTime <= 0) {
      resetTime = now;
    }

    // 24-hour daily reset check
    if (now - resetTime >= 86400000) {
      resetTime = now;
      localStorage.setItem(DAILY_IMAGES_STORAGE_KEY, "0");
      localStorage.setItem(RESET_TIME_STORAGE_KEY, resetTime.toString());
      return { usedImages: 0, maxImages: MAX_DAILY_IMAGES, resetTimestamp: resetTime };
    }

    const savedCount = localStorage.getItem(DAILY_IMAGES_STORAGE_KEY);
    let count = savedCount ? parseInt(savedCount, 10) : 0;
    if (isNaN(count) || count < 0) {
      count = 0;
    }

    return { usedImages: count, maxImages: MAX_DAILY_IMAGES, resetTimestamp: resetTime };
  } catch (e) {
    console.error("Failed to read daily images from localStorage:", e);
    return { usedImages: 0, maxImages: MAX_DAILY_IMAGES, resetTimestamp: now };
  }
}

/**
 * Add images count to daily usage
 */
export function addStoredDailyImages(addedCount: number): { usedImages: number; maxImages: number; resetTimestamp: number } {
  const current = getStoredDailyImages();
  const nextCount = current.usedImages + Math.max(0, addedCount);
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(DAILY_IMAGES_STORAGE_KEY, nextCount.toString());
    } catch (e) {
      console.error("Failed to save daily images count:", e);
    }
  }
  return { usedImages: nextCount, maxImages: MAX_DAILY_IMAGES, resetTimestamp: current.resetTimestamp };
}

/**
 * Save Memories array to localStorage
 */
export function setStoredMemories(memories: MemoryItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(MEMORIES_STORAGE_KEY, JSON.stringify(memories));
    broadcastSyncMessage({
      type: "MEMORIES_UPDATED",
      payload: memories,
    });
  } catch (e) {
    console.error("Failed to save memories to localStorage:", e);
  }
}

type SyncMessage =
  | { type: "SESSIONS_UPDATED"; payload: ChatSession[] }
  | { type: "CREDITS_UPDATED"; payload: { usedCredits: number; resetTimestamp: number } }
  | { type: "CUSTOMIZATION_UPDATED"; payload: CustomizationSettings }
  | { type: "MEMORIES_UPDATED"; payload: MemoryItem[] };

let broadcastChannel: BroadcastChannel | null = null;

function getBroadcastChannel(): BroadcastChannel | null {
  if (typeof window === "undefined" || !("BroadcastChannel" in window)) {
    return null;
  }
  if (!broadcastChannel) {
    try {
      broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
    } catch {
      broadcastChannel = null;
    }
  }
  return broadcastChannel;
}

function broadcastSyncMessage(msg: SyncMessage): void {
  const channel = getBroadcastChannel();
  if (channel) {
    try {
      channel.postMessage(msg);
    } catch (e) {
      console.warn("BroadcastChannel postMessage error:", e);
    }
  }
}

/**
 * Subscribe to cross-tab updates via both BroadcastChannel and window 'storage' event
 */
export function subscribeCrossTabSync(
  onSessionsUpdate: (sessions: ChatSession[]) => void,
  onCreditsUpdate: (usedCredits: number, resetTimestamp: number) => void
): () => void {
  if (typeof window === "undefined") return () => {};

  // 1. BroadcastChannel Listener
  const channel = getBroadcastChannel();
  const handleBroadcast = (event: MessageEvent<SyncMessage>) => {
    if (!event.data) return;
    if (event.data.type === "SESSIONS_UPDATED") {
      onSessionsUpdate(event.data.payload);
    } else if (event.data.type === "CREDITS_UPDATED") {
      onCreditsUpdate(event.data.payload.usedCredits, event.data.payload.resetTimestamp);
    }
  };

  if (channel) {
    channel.addEventListener("message", handleBroadcast);
  }

  // 2. Storage Event Listener (fallback & cross-window native event)
  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        if (Array.isArray(parsed) && parsed.length > 0) {
          onSessionsUpdate(parsed);
        }
      } catch (err) {
        console.error("Storage event sessions parse error:", err);
      }
    } else if (e.key === CREDITS_STORAGE_KEY || e.key === RESET_TIME_STORAGE_KEY) {
      const { usedCredits, resetTimestamp } = getStoredCredits();
      onCreditsUpdate(usedCredits, resetTimestamp);
    }
  };

  window.addEventListener("storage", handleStorageEvent);

  return () => {
    if (channel) {
      channel.removeEventListener("message", handleBroadcast);
    }
    window.removeEventListener("storage", handleStorageEvent);
  };
}
