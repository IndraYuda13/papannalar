"use client";
import { useEffect, useState, type ReactNode } from "react";
import {
  libraryBoardSchema,
  type LibraryBoardState,
} from "@/contracts/library";
import { LibraryItemView } from "./item-view";
import { boardToolProgress } from "@/local/library-board-progress";
import { checkModel, type ToolModel } from "@/core/tools/patterns";
export function LibraryBoard({
  presentationId,
  revision = 0,
  fallback,
}: {
  presentationId: string;
  revision?: number;
  fallback: ReactNode;
}) {
  const [value, setValue] = useState<LibraryBoardState | null>(null);
  useEffect(() => {
    let stopped = false,
      busy = false;
    async function load() {
      if (busy || stopped || !navigator.onLine) return;
      busy = true;
      try {
        const r = await fetch("/api/v1/board/library", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({ presentationId }),
        });
        if (r.ok) {
          const raw: unknown = await r.json();
          const data = raw === null ? null : libraryBoardSchema.parse(raw);
          if (!stopped)
            setValue((old) =>
              old?.id === data?.id && old?.revision === data?.revision
                ? old
                : data,
            );
        }
      } catch {
        /* Keep last applied public item during transport loss. */
      } finally {
        busy = false;
      }
    }
    void load();
    const timer = setInterval(() => void load(), 10000);
    window.addEventListener("online", load);
    return () => {
      stopped = true;
      clearInterval(timer);
      window.removeEventListener("online", load);
    };
  }, [presentationId, revision]);
  if (!value) return fallback;
  return (
    <div
      className="flex min-h-0 flex-1 flex-col gap-3"
      data-testid="library-board"
    >
      <p className="text-[clamp(16px,1.6vw,28px)] text-muted-foreground">
        {value.title} · Soal {value.position + 1}/{value.total}
      </p>
      <PersistentItem key={`${value.id}:${value.item.id}`} value={value} />
    </div>
  );
}
function PersistentItem({ value }: { value: LibraryBoardState }) {
  const [loaded, setLoaded] = useState(false),
    [model, setModel] = useState<ToolModel>(),
    [notice, setNotice] = useState<{ text: string; temporary: boolean }>();
  const { item, id } = value;
  useEffect(() => {
    if (!notice?.temporary) return;
    const timer = setTimeout(() => setNotice(undefined), 3000);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        if (item.kind === "interactive") {
          const saved = await boardToolProgress(id, item.id, item.tool);
          if (!cancelled) setModel(saved);
        }
      } catch {
        if (!cancelled)
          setNotice({
            text: "Simpan belum tersedia. Pertahankan tab ini.",
            temporary: false,
          });
      } finally {
        if (!cancelled) setLoaded(true);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [id, item]);
  if (!loaded) return <p>Menyiapkan soal…</p>;
  return (
    <>
      <LibraryItemView
        item={item}
        row={value.position + 1}
        model={model}
        onRun={(next) => {
          if (item.kind !== "interactive") return false;
          void boardToolProgress(id, item.id, item.tool, next)
            .then(() =>
              setNotice({ text: "Tersimpan di papan", temporary: true }),
            )
            .catch(() =>
              setNotice({
                text: "Belum tersimpan. Pertahankan tab ini.",
                temporary: false,
              }),
            );
          return checkModel(item.tool, next);
        }}
      />
      {notice && (
        <p role="status" className="save-notice text-sm" data-save-notice>
          {notice.text}
        </p>
      )}
    </>
  );
}
