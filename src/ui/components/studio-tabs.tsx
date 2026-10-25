"use client";

import { useRef, type KeyboardEvent, type PropsWithChildren } from "react";
import { Button } from "./button";

/**
 * ARIA tabs with a roving tabindex: the tablist is one tab stop and the arrow
 * keys move selection, so a keyboard user never tabs through every panel. Each
 * tab names the panel it controls, and `TabPanel` renders the matching region.
 *
 * This pair lives in its own client module because `Tabs` needs a ref to move
 * focus. `studio.tsx` re-exports both so existing importers are untouched, and
 * server components (e.g. the guru simulasi page) keep importing a
 * server-safe module instead of pulling the whole studio surface client-side.
 */
export function Tabs<T extends string>({
  label,
  panel,
  value,
  options,
  onChange,
}: {
  label: string;
  /** Prefix that keeps tab and panel ids unique per tablist on a page. */
  panel: string;
  value: T;
  options: readonly { id: T; label: string }[];
  onChange: (next: T) => void;
}) {
  const triggers = useRef<Record<string, HTMLButtonElement | null>>({});
  function select(index: number) {
    const next = options[index];
    onChange(next.id);
    triggers.current[next.id]?.focus();
  }
  function onKeyDown(event: KeyboardEvent, index: number) {
    const last = options.length - 1,
      step: Record<string, number> = {
        ArrowLeft: index === 0 ? last : index - 1,
        ArrowRight: index === last ? 0 : index + 1,
        Home: 0,
        End: last,
      },
      next = step[event.key];
    if (next === undefined) return;
    event.preventDefault();
    select(next);
  }
  return (
    <div role="tablist" aria-label={label} className="studio-segmented">
      {options.map((option, index) => (
        <Button
          key={option.id}
          ref={(node) => {
            triggers.current[option.id] = node;
          }}
          type="button"
          role="tab"
          variant="quiet"
          id={`${panel}-tab-${option.id}`}
          aria-controls={`${panel}-panel-${option.id}`}
          aria-selected={value === option.id}
          tabIndex={value === option.id ? 0 : -1}
          onClick={() => select(index)}
          onKeyDown={(event) => onKeyDown(event, index)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}

/** The region a single tab controls; only the selected panel is in the a11y tree. */
export function TabPanel({
  panel,
  id,
  active,
  children,
}: PropsWithChildren<{
  panel: string;
  id: string;
  active: boolean;
}>) {
  return (
    <div
      role="tabpanel"
      id={`${panel}-panel-${id}`}
      aria-labelledby={`${panel}-tab-${id}`}
      hidden={!active}
    >
      {children}
    </div>
  );
}
