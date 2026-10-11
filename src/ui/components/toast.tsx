"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CircleAlert, CheckCircle2, X } from "lucide-react";

/**
 * Toasts (§8.6): one sentence, at most one action, one visible at a time (a second replaces
 * the first rather than stacking). Info/success dismiss after 4s; an error persists until it
 * is dismissed, because an error the teacher never saw is not an error that was reported.
 *
 * Never used for a result the teacher must act on — that belongs in a Section or a sheet.
 */
type Toast = {
  id: string;
  message: string;
  tone: "info" | "error";
  action?: { label: string; onClick: () => void };
};

const Context = createContext<{
  notify: (message: string, tone?: "info" | "error") => void;
  notifyError: (
    message: string,
    action?: { label: string; onClick: () => void },
  ) => void;
} | null>(null);

export function useToast() {
  const value = useContext(Context);
  if (!value) throw new Error("useToast requires ToastProvider");
  return value;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast>();
  const timer = useRef<number>(0);
  const clear = useCallback(() => {
    window.clearTimeout(timer.current);
    setToast(undefined);
  }, []);
  const notify = useCallback(
    (message: string, tone: "info" | "error" = "info") => {
      window.clearTimeout(timer.current);
      setToast({ id: crypto.randomUUID(), message, tone });
      // Errors have no timer: they stay until dismissed.
      if (tone === "info")
        timer.current = window.setTimeout(() => setToast(undefined), 4000);
    },
    [],
  );
  const notifyError = useCallback(
    (message: string, action?: { label: string; onClick: () => void }) => {
      window.clearTimeout(timer.current);
      setToast({ id: crypto.randomUUID(), message, tone: "error", action });
    },
    [],
  );
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const value = useMemo(() => ({ notify, notifyError }), [notify, notifyError]);
  return (
    <Context.Provider value={value}>
      {children}
      {toast && (
        <div
          key={toast.id}
          className="studio-toast"
          data-tone={toast.tone}
          role={toast.tone === "error" ? "alert" : "status"}
        >
          {toast.tone === "error" ? (
            <CircleAlert size={20} strokeWidth={1.8} aria-hidden />
          ) : (
            <CheckCircle2
              size={20}
              strokeWidth={1.8}
              aria-hidden
              className="shrink-0 text-pn-teal-700"
            />
          )}
          <span className="min-w-0 flex-1">{toast.message}</span>
          {toast.action ? (
            <button
              type="button"
              className="min-h-12 shrink-0 font-semibold text-pn-teal-700"
              onClick={() => {
                toast.action?.onClick();
                clear();
              }}
            >
              {toast.action.label}
            </button>
          ) : (
            <button
              type="button"
              className="inline-flex size-12 shrink-0 items-center justify-center rounded-input text-pn-ink-600"
              aria-label="Tutup pemberitahuan"
              onClick={clear}
            >
              <X size={18} strokeWidth={1.8} aria-hidden />
            </button>
          )}
        </div>
      )}
    </Context.Provider>
  );
}
