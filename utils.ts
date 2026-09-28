import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const TIER_CREDIT_COSTS: Record<
  "Instant" | "PRO" | "web_builder" | "app_builder" | "BuildWeb",
  number
> = {
  Instant: 1,
  PRO: 10,
  web_builder: 25,
  app_builder: 25,
  BuildWeb: 25,
};

export function formatTimeUntilReset(resetTimestamp: number): string {
  if (!resetTimestamp) return "24h 0m";
  const now = Date.now();
  const resetTime = resetTimestamp + 86400000; // 24 hours in ms
  const diff = resetTime - now;
  if (diff <= 0) return "0m";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
