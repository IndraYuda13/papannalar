"use client";
import { randomIdSchema } from "../../contracts/domain";
import { lockLocalAccess } from "../../local/access";
import {
  forgetPresentationController,
  presentationControllerId,
} from "./controller-transport";
import { clearPairingLink } from "./pairing-url";

const pendingKey = "pn-presentation-logout-v1";
let pendingController: string | undefined;
let pendingRequest: Promise<void> | undefined;

function controllerToRevoke() {
  if (pendingController) return pendingController;
  try {
    // Local access is locked across tabs. Share only the pending UUID so a
    // recovering tab cannot accidentally revoke its own, different controller.
    const shared = randomIdSchema.safeParse(localStorage.getItem(pendingKey));
    if (shared.success) pendingController = shared.data;
  } catch {
    // A tab-local retry still works if durable storage is unavailable.
  }
  try {
    const saved = randomIdSchema.safeParse(sessionStorage.getItem(pendingKey));
    if (!pendingController && saved.success) pendingController = saved.data;
  } catch {
    // The current tab can still revoke its in-memory grant.
  }
  pendingController ??= presentationControllerId();
  try {
    localStorage.setItem(pendingKey, pendingController);
  } catch {
    // Fall back to the current tab or RAM.
  }
  try {
    sessionStorage.setItem(pendingKey, pendingController);
  } catch {
    // Pending logout remains available in RAM when storage is denied.
  }
  return pendingController;
}

// Use for explicit logout AND hasPendingLogout() recovery before another login.
// Rejects on network/revocation failure so the existing local lock stays pending.
export function logoutTeacher(): Promise<void> {
  if (pendingRequest) return pendingRequest;
  pendingRequest = performLogout().finally(() => {
    pendingRequest = undefined;
  });
  return pendingRequest;
}

async function performLogout() {
  const controllerId = controllerToRevoke();
  clearPairingLink();
  await lockLocalAccess();
  const abort = new AbortController();
  const timeout = setTimeout(() => abort.abort(), 8_000);
  try {
    if (!navigator.onLine) throw new Error("LOGOUT_PENDING");
    const response = await fetch("/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ controllerId }),
      cache: "no-store",
      signal: abort.signal,
    });
    if (!response.ok) throw new Error("LOGOUT_PENDING");
    forgetPresentationController();
    pendingController = undefined;
    try {
      localStorage.removeItem(pendingKey);
    } catch {
      // RAM has already been cleared.
    }
    try {
      sessionStorage.removeItem(pendingKey);
    } catch {
      // RAM has already been cleared.
    }
    await lockLocalAccess(false);
  } finally {
    clearTimeout(timeout);
  }
}
