/**
 * Estimate tokens using regex matching according to ChatNeural specifications.
 */
export const estimateTokens = (text: string): number => {
  if (!text) return 0;
  const cleanText = text.trim();
  if (!cleanText) return 0;
  const matches = cleanText.match(/\s*\w+|\s+|[^\w\s]/g) || [];
  let count = 0;
  for (const match of matches) {
    if (/[^\x00-\x7F]/.test(match)) count += match.length * 1.5;
    else count += match.length <= 4 ? 1 : Math.ceil(match.length / 3.8);
  }
  return Math.ceil(count);
};

export const getTimestamp = (): number => {
  return Date.now();
};

export const generateId = (prefix: string = "id"): string => {
  const ts = Date.now();
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}_${ts}_${crypto.randomUUID().substring(0, 8)}`;
  }
  const rand = Math.floor(Math.random() * 1000000).toString(36);
  return `${prefix}_${ts}_${rand}`;
};

export const ATTACHMENT_TOKEN_COST = 2500;
export const MAX_INPUT_ATTACHMENTS = 3;

export interface FileAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  base64Data: string;
  isImage: boolean;
}

export interface Message {
  id: string;
  role: "user" | "assistant" | "error";
  content: string;
  attachments?: FileAttachment[];
  thinkingText?: string;
  timestamp: number;
  tier?: "Instant" | "PRO";
  isBuildWeb?: boolean;
  tool?: "web_builder" | "app_builder" | "three_d_builder" | "think_deeper" | null;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
  selectedTier: "Instant" | "PRO";
}

export const calculateSessionTokens = (
  messages: Message[],
  draftInput: string = "",
  draftAttachments: FileAttachment[] = []
): number => {
  let tokenCount = 0;
  for (const m of messages) {
    tokenCount += estimateTokens(m.content);
    if (m.attachments && m.attachments.length > 0) {
      tokenCount += m.attachments.length * ATTACHMENT_TOKEN_COST;
    }
  }
  tokenCount += estimateTokens(draftInput);
  if (draftAttachments && draftAttachments.length > 0) {
    tokenCount += draftAttachments.length * ATTACHMENT_TOKEN_COST;
  }
  return tokenCount;
};
