import type { ReactNode } from "react";
import { CircleAlert, FolderOpen, LoaderCircle } from "lucide-react";

/** A short, non-interactive orientation; actual actions remain labelled buttons. */
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

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="studio-page-header">
      <div>
        {eyebrow && <p className="studio-eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="studio-description">{description}</p>}
      </div>
      {actions && <div className="studio-header-actions">{actions}</div>}
    </header>
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
        <Icon size={24} />
      </span>
      <div>
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
