"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Sheet } from "./sheet";
import { Button } from "./button";

export type ConfirmSpec = {
  title: string;
  consequence: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
};
type Pending = ConfirmSpec & { resolve: (value: boolean) => void };
const listeners = new Set<(pending: Pending) => void>();

/** Resolves true when the teacher confirms, false on cancel, Esc or overlay dismiss. */
export function confirmAction(spec: ConfirmSpec): Promise<boolean> {
  return new Promise((resolve) => {
    const pending: Pending = { ...spec, resolve };
    if (!listeners.size) {
      // No provider mounted: refuse rather than silently performing a destructive action.
      resolve(false);
      return;
    }
    for (const listener of listeners) listener(pending);
  });
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending>();
  const settled = useRef(false);
  useEffect(() => {
    const listener = (next: Pending) => {
      settled.current = false;
      setPending((current) => {
        // A second request while one dialog is open cancels; two stacked modals is worse than
        // a refused action, and the teacher is already answering a question.
        current?.resolve(false);
        return next;
      });
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  const settle = useCallback(
    (value: boolean) => {
      setPending((current) => {
        if (current && !settled.current) {
          settled.current = true;
          current.resolve(value);
        }
        return undefined;
      });
    },
    [setPending],
  );
  return (
    <>
      {children}
      <Sheet
        open={Boolean(pending)}
        onClose={() => settle(false)}
        title={pending?.title ?? ""}
        consequence={pending?.consequence}
        actions={
          <>
            <Button
              variant={pending?.tone === "danger" ? "destructive" : "default"}
              onClick={() => settle(true)}
            >
              {pending?.confirmLabel ?? "Lanjutkan"}
            </Button>
            <Button variant="outline" onClick={() => settle(false)}>
              {pending?.cancelLabel ?? "Batal"}
            </Button>
          </>
        }
      />
    </>
  );
}

export function useConfirm() {
  return confirmAction;
}
