"use client";
import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import type { LocalScope } from "@/local/scope";
import { useVisualPreferences } from "@/ui/components/visual-preferences";

// Only presentation choices are remembered, scoped to teacher and data mode.
// Closing a section never unmounts its draft or running session.
export function ActivityDisclosure({
  id,
  title,
  description,
  children,
  scope,
  initiallyOpen = false,
}: {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
  scope: LocalScope;
  initiallyOpen?: boolean;
}) {
  const key = `pn-teacher-view:${scope.ownerId}:${scope.mode}:${id}`;
  // These sections mount after client-side teacher access has been established.
  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") return initiallyOpen;
    try {
      const stored = sessionStorage.getItem(key);
      if (window.location.hash === `#${id}`) return true;
      if (stored !== null) return stored === "open";
    } catch {
      /* UI memory is optional; learning data is stored separately. */
    }
    return initiallyOpen;
  });
  const { reduced, light, saveData } = useVisualPreferences();
  return (
    <details
      id={id}
      className="teacher-disclosure"
      data-motion-off={reduced || light || saveData}
      open={open}
      onToggle={(event) => {
        const next = event.currentTarget.open;
        setOpen(next);
        try {
          sessionStorage.setItem(key, next ? "open" : "closed");
        } catch {
          /* Private browsing may deny session storage. */
        }
      }}
    >
      <summary>
        <span>
          <span className="block font-bold">{title}</span>
          {description && (
            <small className="block font-normal text-muted-foreground">
              {description}
            </small>
          )}
        </span>
        <ChevronDown size={20} aria-hidden />
      </summary>
      <div className="teacher-disclosure-body">{children}</div>
    </details>
  );
}

export function openTeacherActivity(id: string) {
  const section = document.getElementById(id);
  if (!(section instanceof HTMLDetailsElement)) return;
  if (
    document.querySelector(".practice-journey") &&
    ["teacher-prepare", "teacher-ai", "teacher-teach"].includes(id)
  ) {
    for (const otherId of ["teacher-prepare", "teacher-ai", "teacher-teach"]) {
      const other = document.getElementById(otherId);
      if (otherId !== id && other instanceof HTMLDetailsElement)
        other.open = false;
    }
  }
  section.open = true;
  section.scrollIntoView({ block: "start" });
  section.querySelector("summary")?.focus({ preventScroll: true });
}
