"use client";
import {
  boardProfileSchema,
  publicBoardProfile,
  type BoardProfile,
} from "../../contracts/board-profile";
const KEY = "pn-board-capabilities-v1";
let tabProfile: BoardProfile | undefined;
export function readBoardProfile() {
  try {
    const result = boardProfileSchema.safeParse(
      JSON.parse(localStorage.getItem(KEY) ?? "null"),
    );
    return result.success ? result.data : tabProfile;
  } catch {
    return tabProfile;
  }
}
export function saveBoardProfile(profile: BoardProfile) {
  const value = publicBoardProfile(profile);
  try {
    localStorage.setItem(KEY, JSON.stringify(value));
    tabProfile = undefined;
    return true;
  } catch {
    tabProfile = value;
    return false;
  }
}
export async function sendBoardProfile(profile: BoardProfile) {
  const response = await fetch("/api/v1/board/profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify(publicBoardProfile(profile)),
  });
  if (!response.ok) throw new Error("Profile unavailable");
}
export function browserCapabilityInfo() {
  const ua = navigator.userAgent;
  const matched = [
    [/Edg\/(\d+)/, "edge"],
    [/Firefox\/(\d+)/, "firefox"],
    [/Chrome\/(\d+)/, "chromium"],
    [/Version\/(\d+).*Safari/, "safari"],
  ] as const;
  for (const [pattern, browser] of matched) {
    const match = ua.match(pattern);
    if (match) return { browser, major: Math.min(9999, Number(match[1])) };
  }
  return { browser: "unknown" as const, major: 0 };
}
