"use client";

import React, { useState } from "react";
import { Message, FileAttachment } from "@/lib/tokenizer";
import { CodeBlock } from "./CodeBlock";
import { BrandMark } from "./Brand";
import { Copy, Check, AlertCircle, Brain, ChevronDown, ChevronRight, FileText, X, RotateCcw } from "lucide-react";
import katex from "katex";

interface ChatMessageProps {
  message: Message;
  onRetry?: () => void;
}

const ImageThumbnail: React.FC<{ attachment: FileAttachment }> = ({ attachment }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div
        onClick={() => setIsOpen(true)}
        className="group relative cursor-pointer overflow-hidden rounded-2xl border border-border bg-surface-2 shadow-sm"
      >
        <img
          src={attachment.url || `data:${attachment.type};base64,${attachment.base64Data}`}
          alt={attachment.name}
          className="h-20 w-20 object-cover transition-transform duration-200 group-hover:scale-105 sm:h-24 sm:w-24"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/25 text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
          View
        </div>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-black/75 p-4 backdrop-blur-md">
          <div className="absolute inset-0" onClick={() => setIsOpen(false)} />
          <div className="relative z-10 max-w-4xl max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setIsOpen(false)}
              type="button"
              className="absolute -top-10 right-0 rounded-full bg-white/10 p-1.5 text-white/80 transition hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={attachment.url || `data:${attachment.type};base64,${attachment.base64Data}`}
              alt={attachment.name}
              className="max-h-[80vh] max-w-full rounded-2xl border border-white/10 object-contain shadow-2xl"
            />
            <div className="mt-2 rounded-lg bg-black/60 px-3 py-1 font-mono text-xs text-white/80">
              {attachment.name} ({(attachment.size / 1024).toFixed(0)}KB)
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Helper to render inline formatting (**bold**, *italic*, `code`) and math formulas in a unified recursive parser
const parseInline = (text: string): React.ReactNode[] => {
  if (!text) return [];

  let earliestIdx = -1;
  let tokenType: "block_math" | "inline_math" | "code" | "bold" | "italic" | null = null;
  let matchLength = 0;
  let closingIdx = -1;

  for (let i = 0; i < text.length; i++) {
    // 1. Block math $$
    if (text.startsWith("$$", i)) {
      const close = text.indexOf("$$", i + 2);
      if (close !== -1) {
        earliestIdx = i;
        tokenType = "block_math";
        matchLength = 2;
        closingIdx = close;
        break;
      }
    }
    // 2. Bold **
    if (text.startsWith("**", i)) {
      const close = text.indexOf("**", i + 2);
      if (close !== -1) {
        earliestIdx = i;
        tokenType = "bold";
        matchLength = 2;
        closingIdx = close;
        break;
      }
    }
    // 3. Inline math $ (ensure we don't match $$ as $)
    if (text.startsWith("$", i) && !text.startsWith("$$", i)) {
      const close = text.indexOf("$", i + 1);
      if (close !== -1) {
        earliestIdx = i;
        tokenType = "inline_math";
        matchLength = 1;
        closingIdx = close;
        break;
      }
    }
    // 4. Code `
    if (text.startsWith("`", i)) {
      const close = text.indexOf("`", i + 1);
      if (close !== -1) {
        earliestIdx = i;
        tokenType = "code";
        matchLength = 1;
        closingIdx = close;
        break;
      }
    }
    // 5. Italic * (ensure we don't match ** as *)
    if (text.startsWith("*", i) && !text.startsWith("**", i)) {
      const close = text.indexOf("*", i + 1);
      if (close !== -1) {
        earliestIdx = i;
        tokenType = "italic";
        matchLength = 1;
        closingIdx = close;
        break;
      }
    }
  }

  if (earliestIdx === -1) {
    return [text];
  }

  const elements: React.ReactNode[] = [];
  
  if (earliestIdx > 0) {
    elements.push(text.slice(0, earliestIdx));
  }

  const innerText = text.slice(earliestIdx + matchLength, closingIdx);
  const remainingText = text.slice(closingIdx + matchLength);
  const key = `${earliestIdx}-${closingIdx}`;

  switch (tokenType) {
    case "block_math":
      elements.push(<MathRenderer key={`block-math-${key}`} math={innerText} block={true} />);
      break;
    case "inline_math":
      elements.push(<MathRenderer key={`inline-math-${key}`} math={innerText} block={false} />);
      break;
    case "code":
      elements.push(
        <code
          key={`code-${key}`}
          className="mx-0.5 rounded-md border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[0.9em] text-[var(--primary)]"
        >
          {innerText}
        </code>
      );
      break;
    case "bold":
      elements.push(
        <strong key={`bold-${key}`} className="font-semibold text-foreground">
          {parseInline(innerText)}
        </strong>
      );
      break;
    case "italic":
      elements.push(
        <em key={`italic-${key}`} className="italic text-foreground/80">
          {parseInline(innerText)}
        </em>
      );
      break;
  }

  elements.push(...parseInline(remainingText));
  return elements;
};

const renderInlineFormatting = (text: string): React.ReactNode[] => {
  return parseInline(text);
};

const renderInlineFormattingWithMath = (text: string): React.ReactNode[] => {
  return parseInline(text);
};

// Automatically wraps raw LaTeX/math formulas that lack $ or $$ delimiters
const autoWrapRawMath = (text: string): string => {
  const COMMON_WORDS = new Set([
    "the", "and", "a", "of", "to", "in", "is", "you", "that", "it", "he", "was", "for", "on", "are", "as", "with", "his", "they", "i", "at", "be", "this", "have", "from", "or", "one", "had", "by", "word", "but", "not", "what", "all", "were", "we", "when", "your", "can", "said", "there", "use", "an", "each", "which", "she", "do", "how", "their", "if", "will", "up", "other", "about", "out", "many", "then", "them", "these", "so", "some", "her", "would", "make", "like", "him", "into", "has", "look", "two", "more", "write", "go", "see", "number", "no", "way", "could", "people", "my", "than", "first", "water", "been", "called", "who", "am", "its", "now", "find", "by", "to", "or", "in", "at", "on", "for"
  ]);

  let result = "";
  let lastIdx = 0;

  // Find all backslashes that are part of LaTeX commands (followed by letters)
  const regex = /\\[a-zA-Z]+/g;
  let match;

  const mathRanges: { start: number; end: number; hasDelimiters: boolean }[] = [];

  while ((match = regex.exec(text)) !== null) {
    const backslashIdx = match.index;
    const command = match[0];

    // Ignore typical programming escapes
    if (command === "\\n" || command === "\\t" || command === "\\r") {
      continue;
    }

    if (mathRanges.some(r => backslashIdx >= r.start && backslashIdx < r.end)) {
      continue;
    }

    // Expand Left
    let left = backslashIdx;
    let consecutiveLetters = 0;

    while (left > 0) {
      const char = text[left - 1];

      if (char === '$') {
        break;
      }

      if (char === ')' || char === ']' || char === '}') {
        const prev = left > 1 ? text[left - 2] : '';
        if (!/[\da-zA-Z+\-*/=<>()[\]{}^_~,.]/.test(prev)) {
          break;
        }
      }

      if (char === ' ') {
        const prevChar = left > 1 ? text[left - 2] : '';
        const nextChar = text[left];
        const isMathBound = /[\d+\-*/=<>()[\]{}^_\\,]/.test(prevChar) || /[\d+\-*/=<>()[\]{}^_\\,]/.test(nextChar);
        if (!isMathBound) {
          break;
        }

        let wordStart = left - 2;
        while (wordStart >= 0 && /[a-zA-Z]/.test(text[wordStart])) {
          wordStart--;
        }
        const word = text.slice(wordStart + 1, left - 1).toLowerCase();
        if (COMMON_WORDS.has(word)) {
          break;
        }

        left--;
        consecutiveLetters = 0;
        continue;
      }

      if (/[\d+\-*/=<>()[\]{}^_~,.]/.test(char)) {
        left--;
        consecutiveLetters = 0;
        continue;
      }

      if (/[a-zA-Z]/.test(char)) {
        let temp = left - 1;
        while (temp > 0 && /[a-zA-Z]/.test(text[temp - 1])) {
          temp--;
        }
        if (temp > 0 && text[temp - 1] === '\\') {
          left = temp - 1;
          consecutiveLetters = 0;
          continue;
        }

        consecutiveLetters++;
        if (consecutiveLetters >= 3) {
          break;
        }
        left--;
        continue;
      }

      break;
    }

    // Expand Right
    let right = backslashIdx + 1;
    while (right < text.length && /[a-zA-Z]/.test(text[right])) {
      right++;
    }

    // Consume optional arguments
    while (right < text.length) {
      if (text[right] === '[') {
        let depth = 1;
        right++;
        while (right < text.length && depth > 0) {
          if (text[right] === '[') depth++;
          else if (text[right] === ']') depth--;
          right++;
        }
      } else if (text[right] === '{') {
        let depth = 1;
        right++;
        while (right < text.length && depth > 0) {
          if (text[right] === '{') depth++;
          else if (text[right] === '}') depth--;
          right++;
        }
      } else {
        break;
      }
    }

    consecutiveLetters = 0;
    while (right < text.length) {
      const char = text[right];

      if (char === '$') {
        break;
      }

      if (char === '(' || char === '[' || char === '{') {
        const next = right < text.length - 1 ? text[right + 1] : '';
        if (!/[\da-zA-Z+\-*/=<>()[\]{}^_~,.]/.test(next)) {
          break;
        }
      }

      if (char === ' ') {
        const prevChar = text[right - 1];
        const nextChar = right < text.length - 1 ? text[right + 1] : '';
        const isMathBound = /[\d+\-*/=<>()[\]{}^_\\,]/.test(prevChar) || /[\d+\-*/=<>()[\]{}^_\\,]/.test(nextChar);
        if (!isMathBound) {
          break;
        }

        let wordEnd = right + 1;
        while (wordEnd < text.length && /[a-zA-Z]/.test(text[wordEnd])) {
          wordEnd++;
        }
        const word = text.slice(right + 1, wordEnd).toLowerCase();
        if (COMMON_WORDS.has(word)) {
          break;
        }

        right++;
        consecutiveLetters = 0;
        continue;
      }

      if (/[\d+\-*/=<>()[\]{}^_~,.]/.test(char)) {
        right++;
        consecutiveLetters = 0;
        continue;
      }

      if (/[a-zA-Z]/.test(char)) {
        consecutiveLetters++;
        if (consecutiveLetters >= 3) {
          break;
        }
        right++;
        continue;
      }

      if (char === '\\') {
        let temp = right + 1;
        while (temp < text.length && /[a-zA-Z]/.test(text[temp])) {
          temp++;
        }
        right = temp;
        consecutiveLetters = 0;
        continue;
      }

      break;
    }

    while (right > left && /[.,:]/.test(text[right - 1])) {
      right--;
    }

    if (right > left) {
      const hasLeftDelim = left > 0 && text[left - 1] === '$';
      const hasRightDelim = right < text.length && text[right] === '$';
      
      mathRanges.push({
        start: left,
        end: right,
        hasDelimiters: hasLeftDelim || hasRightDelim
      });
    }
  }

  mathRanges.sort((a, b) => a.start - b.start);
  const mergedRanges: { start: number; end: number; hasDelimiters: boolean }[] = [];
  for (const r of mathRanges) {
    if (mergedRanges.length === 0) {
      mergedRanges.push(r);
    } else {
      const last = mergedRanges[mergedRanges.length - 1];
      if (r.start <= last.end) {
        last.end = Math.max(last.end, r.end);
        last.hasDelimiters = last.hasDelimiters || r.hasDelimiters;
      } else {
        mergedRanges.push(r);
      }
    }
  }

  for (const r of mergedRanges) {
    result += text.slice(lastIdx, r.start);
    const mathContent = text.slice(r.start, r.end);
    
    const beforeChar = r.start > 0 ? text[r.start - 1] : '';
    const afterChar = r.end < text.length ? text[r.end] : '';

    if (beforeChar === '$' || afterChar === '$') {
      result += mathContent;
    } else {
      result += `$${mathContent}$`;
    }
    lastIdx = r.end;
  }
  result += text.slice(lastIdx);

  return result;
};

const normalizeMathDelimiters = (text: string): string => {
  let normalized = text;
  normalized = normalized.replace(/\\\[/g, "$$");
  normalized = normalized.replace(/\\\]/g, "$$");
  normalized = normalized.replace(/\\\(/g, "$");
  normalized = normalized.replace(/\\\)/g, "$");
  normalized = autoWrapRawMath(normalized);
  return normalized;
};

interface MathRendererProps {
  math: string;
  block?: boolean;
}

const MathRenderer: React.FC<MathRendererProps> = ({ math, block = false }) => {
  const html = React.useMemo(() => {
    try {
      return katex.renderToString(math, {
        displayMode: block,
        throwOnError: false,
      });
    } catch (e) {
      console.error("KaTeX error:", e);
      return math;
    }
  }, [math, block]);

  return (
    <span
      className={block ? "my-2 block overflow-x-auto py-2" : "inline-block px-0.5"}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};


// Helper to parse blocks (Headings, Lists, Tables, Paragraphs)
const renderFormattedTextChunk = (chunkText: string) => {
  const lines = chunkText.split("\n");
  const elements: React.ReactNode[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // 0. Detect Multi-line Block Math
    if (line.trim() === "$$" || (line.trim().startsWith("$$") && !line.trim().slice(2).includes("$$"))) {
      let mathContent = "";
      if (line.trim().startsWith("$$") && line.trim().length > 2) {
        mathContent += line.trim().slice(2) + "\n";
      }
      let j = i + 1;
      let foundClose = false;
      while (j < lines.length) {
        const nextLine = lines[j];
        if (nextLine.trim() === "$$") {
          foundClose = true;
          break;
        }
        if (nextLine.trim().endsWith("$$")) {
          mathContent += nextLine.trim().slice(0, -2);
          foundClose = true;
          break;
        }
        mathContent += nextLine + "\n";
        j++;
      }
      
      if (foundClose) {
        elements.push(
          <MathRenderer key={`math-block-multi-${i}`} math={mathContent.trim()} block={true} />
        );
        i = j + 1;
        continue;
      }
    }

    // 1. Detect Horizontal Rules (e.g. ---, ***, ___)
    if (/^\s*[-*_]{3,}\s*$/.test(line)) {
      elements.push(
        <hr key={`hr-${i}`} className="my-5 w-full border-t border-border" />
      );
      i++;
      continue;
    }

    // 2. Detect Tables (lines starting/containing '|')
    if (
      line.trim().startsWith("|") &&
      i + 1 < lines.length &&
      lines[i + 1].trim().startsWith("|")
    ) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i].trim());
        i++;
      }

      const parseRow = (rowStr: string) =>
        rowStr
          .split("|")
          .slice(1, -1)
          .map((c) => c.trim());

      // Filter separator lines like |---|---|
      const headerLine = tableLines[0];
      const dataLines = tableLines
        .slice(1)
        .filter((l) => l.replace(/[\s|:-]/g, "").length > 0);

      const headers = parseRow(headerLine);

      elements.push(
        <div
          key={`table-${i}`}
          className="my-3 overflow-x-auto rounded-2xl border border-border"
        >
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-2">
                {headers.map((h, hIdx) => (
                  <th
                    key={hIdx}
                    className="border-b border-border p-3 text-left text-xs font-semibold text-foreground"
                  >
                    {renderInlineFormattingWithMath(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataLines.map((dLine, rIdx) => {
                const cells = parseRow(dLine);
                return (
                  <tr key={rIdx} className="transition hover:bg-surface-2">
                    {cells.map((cell, cIdx) => (
                      <td
                        key={cIdx}
                        className="border-b border-border/70 p-3 text-sm text-foreground/90"
                      >
                        {renderInlineFormattingWithMath(cell)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // 2. Headings
    if (line.startsWith("# ")) {
      elements.push(
        <h1 key={`h1-${i}`} className="pb-1 pt-2 text-xl font-bold tracking-tight text-foreground">
          {renderInlineFormattingWithMath(line.slice(2))}
        </h1>
      );
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      elements.push(
        <h2 key={`h2-${i}`} className="pb-1 pt-2 text-lg font-bold tracking-tight text-foreground">
          {renderInlineFormattingWithMath(line.slice(3))}
        </h2>
      );
      i++;
      continue;
    }
    if (line.startsWith("### ")) {
      elements.push(
        <h3 key={`h3-${i}`} className="pb-1 pt-2 text-base font-bold tracking-tight text-foreground">
          {renderInlineFormattingWithMath(line.slice(4))}
        </h3>
      );
      i++;
      continue;
    }

    // 3. Bullet Points & Lists (Unordered / Ordered)
    const isUnordered = /^\s*[-*]\s+/.test(line);
    const isOrdered = /^\s*\d+\.\s+/.test(line);

    if (isUnordered || isOrdered) {
      const listItems: string[] = [];
      const isOrd = isOrdered;
      const startMatch = isOrd ? line.match(/^\s*(\d+)\./) : null;
      const startNum = startMatch ? parseInt(startMatch[1], 10) : 1;

      while (i < lines.length) {
        const currentLine = lines[i];

        // Handle empty lines within a list block
        if (currentLine.trim() === "") {
          let nextIdx = i + 1;
          while (nextIdx < lines.length && lines[nextIdx].trim() === "") {
            nextIdx++;
          }
          if (
            nextIdx < lines.length &&
            ((isOrd && /^\s*\d+\.\s+/.test(lines[nextIdx])) ||
              (!isOrd && /^\s*[-*]\s+/.test(lines[nextIdx])))
          ) {
            i = nextIdx;
            continue;
          } else {
            break;
          }
        }

        const isMatch = isOrd
          ? /^\s*\d+\.\s+/.test(currentLine)
          : /^\s*[-*]\s+/.test(currentLine);

        if (isMatch) {
          const itemText = currentLine.replace(/^\s*([-*]|\d+\.)\s+/, "");
          listItems.push(itemText);
          i++;
        } else if (
          listItems.length > 0 &&
          !currentLine.startsWith("#") &&
          !currentLine.trim().startsWith("|")
        ) {
          // Continuation of previous item
          listItems[listItems.length - 1] += " " + currentLine.trim();
          i++;
        } else {
          break;
        }
      }

      if (isOrd) {
        elements.push(
          <ol
            key={`ol-${i}`}
            start={startNum}
            className="my-2 list-decimal list-outside space-y-1.5 pl-5 text-foreground/90"
          >
            {listItems.map((item, itemIdx) => (
              <li key={itemIdx} className="pl-1 text-[15px] leading-relaxed">
                {renderInlineFormattingWithMath(item)}
              </li>
            ))}
          </ol>
        );
      } else {
        elements.push(
          <ul
            key={`ul-${i}`}
            className="my-2 list-disc list-outside space-y-1.5 pl-5 text-foreground/90"
          >
            {listItems.map((item, itemIdx) => (
              <li key={itemIdx} className="pl-1 text-[15px] leading-relaxed">
                {renderInlineFormattingWithMath(item)}
              </li>
            ))}
          </ul>
        );
      }
      continue;
    }

    // 4. Standard Paragraphs
    if (line.trim() !== "") {
      elements.push(
        <p key={`p-${i}`} className="my-1 text-[15px] leading-relaxed text-foreground/90">
          {renderInlineFormattingWithMath(line)}
        </p>
      );
    }
    i++;
  }

  return <div className="space-y-1.5">{elements}</div>;
};

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, onRetry }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  // Helper to render text with CodeBlock parts
  const renderFormattedContent = (text: string, isBuildWeb: boolean = false) => {
    if (!text.includes("```")) {
      return renderFormattedTextChunk(normalizeMathDelimiters(text));
    }

    const parts = text.split(/(```[\s\S]*?```)/g);

    return (
      <div className="space-y-2">
        {parts.map((part, index) => {
          if (part.startsWith("```") && part.endsWith("```")) {
            // Extract code block
            const codeBlockContent = part.slice(3, -3);
            const firstNewlineIdx = codeBlockContent.indexOf("\n");
            let language = "code";
            let code = codeBlockContent;

            if (firstNewlineIdx !== -1) {
              const possibleLang = codeBlockContent.slice(0, firstNewlineIdx).trim();
              if (possibleLang && !possibleLang.includes(" ")) {
                language = possibleLang;
                code = codeBlockContent.slice(firstNewlineIdx + 1);
              }
            }

            return (
              <CodeBlock
                key={index}
                language={language}
                code={code}
                defaultCollapsed={isBuildWeb}
              />
            );
          }

          if (!part.trim()) return null;

          return <div key={index}>{renderFormattedTextChunk(normalizeMathDelimiters(part))}</div>;
        })}
      </div>
    );
  };

  // Something went wrong
  if (message.role === "error") {
    return (
      <div className="flex w-full justify-start py-2">
        <div className="flex max-w-[92%] items-start gap-3 rounded-2xl border border-[color-mix(in_srgb,var(--danger)_30%,transparent)] bg-[var(--danger-soft)] p-4 text-[var(--danger)] sm:max-w-[80%]">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--danger)_14%,transparent)]">
            <AlertCircle className="h-4 w-4" />
          </span>
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider">Something went wrong</span>
              <span className="text-[10px] opacity-70">
                {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed opacity-90">{message.content}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                type="button"
                className="focus-ring mt-1 flex items-center gap-1.5 rounded-lg bg-[var(--danger)] px-3 py-1.5 text-xs font-semibold text-[var(--danger-foreground)] transition hover:opacity-90"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Try again
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // User message bubble
  if (message.role === "user") {
    const attachments = message.attachments || [];
    return (
      <div className="flex w-full justify-end py-1.5">
        <div className="flex max-w-[88%] flex-col items-end gap-1.5 sm:max-w-[75%]">
          {attachments.length > 0 && (
            <div className="flex flex-wrap justify-end gap-2">
              {attachments.map((att) =>
                att.isImage ? (
                  <ImageThumbnail key={att.id} attachment={att} />
                ) : (
                  <div
                    key={att.id}
                    className="flex items-center gap-2 rounded-xl border border-border bg-surface px-2.5 py-1.5 text-xs text-foreground"
                  >
                    <FileText className="h-4 w-4 shrink-0 text-[var(--warning)]" />
                    <span className="max-w-[140px] truncate font-medium" title={att.name}>
                      {att.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{(att.size / 1024).toFixed(0)}KB</span>
                  </div>
                )
              )}
            </div>
          )}

          <div className="group flex items-end gap-1.5">
            <button
              onClick={handleCopyMessage}
              type="button"
              className="focus-ring mb-1 flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground opacity-0 transition hover:text-foreground group-hover:opacity-100"
              title="Copy text"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-[var(--success)]" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            <div className="rounded-3xl rounded-br-lg border border-[color-mix(in_srgb,var(--primary)_22%,transparent)] bg-[var(--primary-soft)] px-4 py-2.5 text-[15px] leading-relaxed text-foreground shadow-sm">
              <div className="whitespace-pre-wrap break-words">{renderFormattedContent(message.content)}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div className="flex w-full items-start gap-3 py-2.5">
      <BrandMark className="mt-0.5 hidden h-8 w-8 shrink-0 sm:inline-flex" iconClassName="h-3.5 w-3.5" />

      <div className="min-w-0 flex-1 space-y-2">
        {message.thinkingText && <ThoughtProcessBlock thinkingText={message.thinkingText} />}

        <div className="w-full break-words text-[15px] leading-relaxed text-foreground">
          {renderFormattedContent(message.content, Boolean(message.isBuildWeb))}
        </div>

        <div className="flex items-center gap-1 pt-0.5">
          <button
            onClick={handleCopyMessage}
            type="button"
            className="focus-ring flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-surface-2 hover:text-foreground"
            title="Copy response"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-[var(--success)]" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
};

// Collapsible chain-of-thought block
const ThoughtProcessBlock: React.FC<{ thinkingText: string }> = ({ thinkingText }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-border bg-surface-2">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="focus-ring flex w-full select-none items-center justify-between gap-3 px-3.5 py-2.5 text-left text-xs text-muted-foreground transition hover:text-foreground"
      >
        <span className="flex items-center gap-2 font-medium">
          <Brain className="h-4 w-4 text-[var(--primary)]" />
          <span>Thinking process</span>
        </span>
        <span className="flex items-center gap-1 text-[11px]">
          <span>{isExpanded ? "Hide" : "Show"}</span>
          {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </span>
      </button>

      {isExpanded && (
        <div className="custom-scrollbar max-h-96 overflow-y-auto whitespace-pre-wrap border-t border-border bg-surface px-4 py-3 font-mono text-xs leading-relaxed text-muted-foreground">
          {thinkingText}
        </div>
      )}
    </div>
  );
};