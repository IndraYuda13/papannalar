"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

/**
 * Bottom sheet on phone / centred dialog from 1024 (§8.5).
 *
 * Contract: opens only on a user action, traps focus, closes on Esc and on an explicit close
 * control, and returns focus to the trigger. The header carries the title plus one sentence
 * naming the consequence — for a destructive action the consequence is literal.
 */
export function Sheet({
  open,
  onClose,
  title,
  consequence,
  children,
  actions,
  labelledBy,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  consequence?: string;
  children?: ReactNode;
  actions?: ReactNode;
  labelledBy?: string;
}) {
  const panel = useRef<HTMLDivElement>(null),
    generated = useId(),
    headingId = labelledBy ?? `${generated}-judul`;
  useEffect(() => {
    if (!open) return;
    const trigger = document.activeElement as HTMLElement | null;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = panel.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0],
        last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    panel.current
      ?.querySelector<HTMLElement>(
        'button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
      )
      ?.focus({ preventScroll: true });
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
      trigger?.focus({ preventScroll: true });
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      className="studio-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panel}
        className="studio-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
      >
        <button
          type="button"
          className="studio-sheet-close"
          aria-label="Tutup"
          onClick={onClose}
        >
          <X size={20} strokeWidth={1.8} aria-hidden />
        </button>
        <h2 id={headingId}>{title}</h2>
        {consequence && <p>{consequence}</p>}
        {children && <div className="mt-4 space-y-3">{children}</div>}
        {actions && <div className="studio-sheet-actions">{actions}</div>}
      </div>
    </div>
  );
}
