"use client";
import {
  libraryNetworkAction,
  type LibraryAction,
} from "../../contracts/library";
export async function libraryCall(action: LibraryAction): Promise<unknown> {
  const response = await fetch("/api/v1/library", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify(libraryNetworkAction(action)),
  });
  if (!response.ok)
    throw new Error(
      response.status === 409
        ? "CONFLICT"
        : response.status === 422
          ? "INVALID_INPUT"
          : "REQUEST_FAILED",
    );
  return response.json();
}
export function jakartaDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}
export const field =
  "studio-field mt-1 min-h-12 w-full rounded-input border border-pn-ink-400 bg-white px-3 py-2 font-normal";
export const panel =
  "studio-panel space-y-4 rounded-kartu border border-pn-ink-400/30 bg-card p-4 sm:p-6";
