"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/ui/components/button";
import type { BoardPage } from "./package-navigation";
export function BoardNavigation({
  pages,
  index,
  mode,
  onSelect,
}: {
  pages: readonly BoardPage[];
  index: number;
  mode: string;
  onSelect: (index: number) => void;
}) {
  const [visible, setVisible] = useState(false),
    [generation, setGeneration] = useState(0);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLElement>(null);
  const interactive = [
    "opening",
    "station",
    "together",
    "split",
    "spotlight",
    "reflection",
  ].includes(mode);
  function show() {
    setVisible(true);
    setGeneration((n) => n + 1);
  }
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      if (!menu.current?.contains(document.activeElement)) setVisible(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, [visible, generation]);
  useEffect(() => {
    if (interactive) return;
    const open = (event: PointerEvent) => {
      // The trigger and menu own their clicks; background reveal must not toggle them.
      if (
        event.target instanceof Node &&
        (trigger.current?.contains(event.target) ||
          menu.current?.contains(event.target))
      )
        return;
      setVisible(true);
      setGeneration((n) => n + 1);
    };
    window.addEventListener("pointerdown", open);
    return () => window.removeEventListener("pointerdown", open);
  }, [interactive]);
  if (!pages.length) return null;
  function close() {
    setVisible(false);
    trigger.current?.focus();
  }
  return (
    <>
      <button
        type="button"
        ref={trigger}
        aria-label="Buka navigasi sesi"
        aria-expanded={visible}
        className="fixed bottom-0 left-0 z-40 h-24 w-24 rounded-tr-kartu border-2 bg-white/95 text-[26px]"
        onClick={() => (visible ? close() : show())}
      >
        ↔
      </button>
      {visible && (
        <nav
          ref={menu}
          aria-label="Navigasi sesi papan"
          className="fixed right-4 bottom-0 left-28 z-40 flex flex-wrap items-center gap-3 rounded-kartu border-4 border-primary bg-white p-3"
          onPointerDown={show}
          onKeyDown={(event) => {
            if (event.key === "Escape") close();
            else show();
          }}
        >
          <Button
            size="board"
            variant="outline"
            disabled={index <= 0}
            onClick={() => onSelect(index - 1)}
          >
            Kembali
          </Button>
          <label className="flex-1 text-[26px]">
            Tampilan sesi
            <select
              aria-label="Tampilan sesi"
              className="min-h-24 w-full border-2 bg-white p-3 text-[28px]"
              value={index}
              onChange={(e) => onSelect(Number(e.target.value))}
            >
              {pages.map((p, i) => (
                <option key={i} value={i}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <Button
            size="board"
            disabled={index >= pages.length - 1}
            onClick={() => onSelect(index + 1)}
          >
            Lanjut
          </Button>
          <Button size="board" variant="outline" onClick={close}>
            Tutup navigasi
          </Button>
        </nav>
      )}
    </>
  );
}
