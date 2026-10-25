import type { ComponentProps, ReactNode } from "react";
import { CircleAlert, FolderOpen, LoaderCircle } from "lucide-react";

// The tablist needs a ref to move focus, so it lives in its own client module.
// Re-exporting keeps every importer on the server-safe studio surface.
export { TabPanel, Tabs } from "./studio-tabs";

/**
 * Orientation for a multi-step flow: one line, never a card grid (T5 V7).
 * A single line cannot orphan at any width, which is why the four-card stepper is gone.
 */
export function WorkflowSteps({
  steps,
  current,
}: {
  steps: readonly string[];
  current?: number;
}) {
  return (
    <ol className="workflow-steps" aria-label="Alur mengajar">
      {steps.map((step, index) => (
        <li key={step} aria-current={index === current ? "step" : undefined}>
          <span aria-hidden>{index + 1}</span>
          <span>{step}</span>
        </li>
      ))}
    </ol>
  );
}

export function ProgressLabel({
  index,
  total,
  label,
}: {
  index: number;
  total: number;
  label: string;
}) {
  return (
    <p className="studio-progress-label">
      <span aria-hidden>
        {index}/{total}
      </span>
      <span>
        <span className="sr-only">
          Langkah {index} dari {total}:{" "}
        </span>
        {label}
      </span>
    </p>
  );
}

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;

  eyebrow?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="studio-page-header">
      <div className="min-w-0">
        {eyebrow && <p className="studio-eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="studio-description">{description}</p>}
      </div>
      {actions && <div className="studio-header-actions">{actions}</div>}
    </header>
  );
}

export function Section({
  label,
  action,
  ground,
  tone,
  children,
  className = "",
  ...rest
}: {
  label?: ReactNode;
  action?: ReactNode;
  ground?: "sheet" | "inset";
  tone?: "amber" | "mint";
  children: ReactNode;
  className?: string;
} & Omit<ComponentProps<"section">, "children" | "color">) {
  return (
    <section
      className={`studio-section ${className}`}
      data-ground={ground}
      data-grown={tone}
      {...rest}
    >
      {(label || action) && (
        <div className="studio-section-head">
          {label && <h2 className="studio-section-label">{label}</h2>}
          {action && <div className="studio-section-action">{action}</div>}
        </div>
      )}
      <div className="studio-section-body">{children}</div>
    </section>
  );
}

export function StateNotice({
  title,
  children,
  action,
  kind = "empty",
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  kind?: "empty" | "loading" | "error";
}) {
  const Icon =
    kind === "error"
      ? CircleAlert
      : kind === "loading"
        ? LoaderCircle
        : FolderOpen;
  return (
    <section
      className={`studio-state studio-state-${kind}`}
      role={kind === "error" ? "alert" : "status"}
    >
      <span className="studio-state-icon" aria-hidden>
        <Icon size={24} strokeWidth={1.8} />
      </span>
      <div className="min-w-0">
        <h2>{title}</h2>
        {children && <p>{children}</p>}
        {action && <div className="mt-4">{action}</div>}
      </div>
    </section>
  );
}

export function StatusChip({ children }: { children: ReactNode }) {
  return (
    <span className="studio-status">
      <span aria-hidden />
      {children}
    </span>
  );
}

export const BOARD_MAX_LINES = 2;
export const BOARD_MAX_WORDS = 14;

function displayWidth(value: string) {
  // Latin characters are ~1 unit, CJK/full-width ~2. Math text keeps its own glyphs.
  let width = 0;
  for (const character of value)
    width += /[\u1100-\uffff]/.test(character) ? 2 : 1;
  return width;
}

export function boardMeasure(prompt: string) {
  const text = prompt.replace(/\s+/g, " ").trim();
  if (!text) return { lines: 0, words: 0, legal: true };
  const words = text.split(" ").length;
  // The board's decision column is 88% of a 1920px safe frame; a line is ~46 display units
  // at --board-question scale. This mirrors the renderer's measure without measuring here.
  const lines = Math.max(1, Math.ceil(displayWidth(text) / 46));
  return {
    lines,
    words,
    legal: lines <= BOARD_MAX_LINES && words <= BOARD_MAX_WORDS,
  };
}

export function BoardLegality({ prompt }: { prompt: string }) {
  const { lines, words, legal } = boardMeasure(prompt),
    empty = words === 0;
  return (
    <p className="studio-legality" data-legal={legal} data-board-legality>
      <span aria-hidden>
        {empty
          ? `${BOARD_MAX_LINES} baris · maksimal ${BOARD_MAX_WORDS} kata`
          : `${lines} baris · ${words} kata`}
      </span>
      <span className="sr-only">
        {empty
          ? `Papan menampung maksimal ${BOARD_MAX_LINES} baris dan ${BOARD_MAX_WORDS} kata.`
          : legal
            ? `Sah untuk papan: ${lines} baris, ${words} kata.`
            : `Belum sah untuk papan: ${lines} baris, ${words} kata. Papan hanya menampung ${BOARD_MAX_LINES} baris dan ${BOARD_MAX_WORDS} kata.`}
      </span>
      <span aria-hidden>
        {empty ? "" : legal ? "sah untuk papan" : "belum sah untuk papan"}
      </span>
    </p>
  );
}
