"use client";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import type { LibraryBoardState } from "@/contracts/library";
import { ToolView } from "@/features/tools/tool-view";
import { Button } from "@/ui/components/button";
import type { ToolModel } from "@/core/tools/patterns";
import { paginateDisplayText } from "@/features/layar/appearance-pagination";
import { boardMeasure } from "@/ui/components/studio";
import { ActivityIcon } from "@/ui/components/activity-icon";
type ItemProps = {
  item: LibraryBoardState["item"];
  row?: number;
  model?: ToolModel;
  onRun?: (model: ToolModel) => boolean;
  hidePrompt?: boolean;
};
type ReadingPage = {
  kind: "prompt" | "option" | "workspace";
  label: string;
  text: string;
};
export function LibraryItemView(props: ItemProps) {
  return <ItemPages key={props.item.id} {...props} />;
}
function ItemPages({
  item,
  row = 1,
  model,
  onRun,
  hidePrompt = false,
}: ItemProps) {
  const root = useRef<HTMLElement>(null),
    body = useRef<HTMLDivElement>(null);
  // Paginate only content that exceeds the authored legibility limits.
  const legal = boardMeasure(item.prompt).legal;
  const [paginated, setPaginated] = useState(
    () =>
      !legal &&
      ((!hidePrompt && item.prompt.length > 140) ||
        (item.kind === "card" &&
          (item.options.some((o) => o.length > 80) ||
            item.options.join("").length > 240))),
  );
  const [pages, setPages] = useState<ReadingPage[]>([]),
    [position, setPosition] = useState(0);
  // Pagination is *measured*, so it must be measured exactly once, against the font the room will
  // actually read. Measuring against the fallback face and then re-measuring when the webfont
  // swaps in yields a different page count mid-lesson ("Bagian 1 dari 9" → 8) and re-renders the
  // controls under a finger. Wait for the real face; if the API is absent or the font never
  // arrives, fall back on a timer so an offline board still paginates.
  const fontsReady = useRef(typeof document === "undefined" || !document.fonts);
  const optionsKey = JSON.stringify(item.kind === "card" ? item.options : null);
  const index = Math.min(position, Math.max(0, pages.length - 1));
  // Freeze pagination for unchanged geometry so the reading position remains stable.
  const measuredFor = useRef<string>("");
  const current = pages[index] ?? {
    kind: hidePrompt && item.kind !== "card" ? "workspace" : "prompt",
    label: "Pertanyaan",
    text: item.prompt,
  };
  const reading = paginated && current.kind !== "workspace";
  const hint =
    item.kind === "card"
      ? `Isi baris ${row} pada Kartu Nalar. Pilih ? jika belum tahu.`
      : item.kind === "writing"
        ? "Tulis gagasan di bidang kosong. Ceritakan alasanmu."
        : instruction(item.tool.kind);
  useEffect(() => {
    const element = root.current,
      region = body.current;
    if (!element || !region) return;
    let frame = 0,
      disposed = false;
    function measure() {
      if (!element || !region || !region.clientWidth || !region.clientHeight)
        return;
      if (!fontsReady.current) return;
      // A teacher preview with its prompt already above the model has no text
      // pages to split; the page itself scrolls around the full-size controls.
      if (hidePrompt && item.kind !== "card") return;
      const signature = `${region.clientWidth}x${region.clientHeight}:${
        element
          .closest(".board-surface,[data-library-preview]")
          ?.getAttribute("data-board-preset") ?? ""
      }:${item.kind}:${item.prompt.length}:${optionsKey.length}`;
      if (!paginated) {
        if (
          element.scrollHeight > element.clientHeight + 1 ||
          region.scrollHeight > region.clientHeight + 1 ||
          region.scrollWidth > region.clientWidth + 1
        ) {
          // Paginate only content that exceeds the authored legibility limits.
          if (legal) return;
          measuredFor.current = "";
          setPaginated(true);
        }
        return;
      }
      // Reuse the settled measurement for this geometry and content. Re-measuring an unchanged
      // geometry is what let the count move under a reader.
      if (measuredFor.current === signature) return;
      // The probe shares the actual fraction markup, font and available width.
      const probe = document.createElement("div");
      probe.className = "library-reading-text";
      probe.setAttribute("aria-hidden", "true");
      Object.assign(probe.style, {
        position: "absolute",
        visibility: "hidden",
        pointerEvents: "none",
        inset: "0 auto auto 0",
        width: `${region.clientWidth}px`,
      });
      region.append(probe);
      const next: ReadingPage[] = [];
      function add(text: string, kind: "prompt" | "option", label: string) {
        probe.dataset.readingKind = kind;
        for (const part of paginateDisplayText(text, (candidate) => {
          probe.replaceChildren();
          for (const token of mathParts(candidate)) {
            if (!token.fraction) probe.append(token.text);
            else {
              const fraction = document.createElement("span");
              fraction.className = "library-fraction";
              for (const value of token.fraction) {
                const number = document.createElement("span");
                number.textContent = value;
                fraction.append(number);
              }
              probe.append(fraction);
            }
          }
          return (
            probe.getBoundingClientRect().height <= region!.clientHeight - 2
          );
        }))
          next.push({ kind, label, text: part });
      }
      try {
        if (!hidePrompt) add(item.prompt, "prompt", "Pertanyaan");
        const choices: string[] | null = JSON.parse(optionsKey);
        if (choices) {
          choices.forEach((text, choice) =>
            add(text, "option", `Pilihan ${"ABCD"[choice]}`),
          );
          add("? · Belum tahu", "option", "Pilihan ?");
        } else next.push({ kind: "workspace", label: "Aktivitas", text: "" });
      } finally {
        probe.remove();
      }
      measuredFor.current = signature;
      setPages((previous) =>
        JSON.stringify(previous) === JSON.stringify(next) ? previous : next,
      );
    }
    function schedule() {
      if (disposed) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    }
    const observer = new ResizeObserver(schedule);
    observer.observe(element);
    observer.observe(region);
    const appearance = element.closest(".board-surface,[data-library-preview]");
    const changes = new MutationObserver(schedule);
    if (appearance)
      changes.observe(appearance, {
        attributes: true,
        subtree: true,
        attributeFilter: ["data-board-preset", "data-board-height"],
      });
    // The board waits for the real face, then measures once (see `fontsReady` above). The timer
    // is the offline case: a board that never receives the webfont must still paginate.
    const settle = () => {
      fontsReady.current = true;
      schedule();
    };
    const fallbackTimers: number[] = [];
    if (document.fonts) {
      void document.fonts.ready.then(settle);
      const fallback = window.setTimeout(settle, 1200);
      fallbackTimers.push(fallback);
    } else settle();
    schedule();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      for (const timer of fallbackTimers) window.clearTimeout(timer);
      observer.disconnect();
      changes.disconnect();
    };
  }, [item.prompt, item.kind, optionsKey, paginated, hidePrompt, legal]);
  return (
    <section ref={root} className="library-item" data-testid="library-item">
      {/* Only the visible question owns the board-question landmark. */}
      <h1
        className="library-prompt"
        data-board-question
        hidden={paginated || hidePrompt}
      >
        {mathText(item.prompt)}
      </h1>
      <p className="library-instruction" data-board-band>
        {item.kind !== "card" && (
          <ActivityIcon
            className="activity-icon-inline"
            kind={item.kind === "writing" ? "writing" : item.tool.kind}
          />
        )}
        {hint}
      </p>
      {paginated && (
        <p className="library-page-label" data-board-band>
          {current.label}
        </p>
      )}
      <div ref={body} className="library-item-body" data-board-band>
        {item.kind === "card" && (
          <ol className="library-options" data-board-options hidden={paginated}>
            {item.options.map((option, choice) => (
              <li key={choice}>
                <b className="library-choice-label">{"ABCD"[choice]}</b>
                <span>{mathText(option)}</span>
              </li>
            ))}
            <li>? · Belum tahu</li>
          </ol>
        )}
        {paginated && (
          <div className="library-reading-copy" hidden={!reading}>
            {current.kind === "prompt" ? (
              <h1
                className="library-reading-text"
                data-reading-kind="prompt"
                data-board-question={!reading ? undefined : true}
              >
                {mathText(current.text)}
              </h1>
            ) : (
              <p className="library-reading-text" data-reading-kind="option">
                {mathText(current.text)}
              </p>
            )}
          </div>
        )}
        {/* Keep models and RAM-only ink mounted while reading other pages. */}
        {item.kind !== "card" && (
          <div className="library-work-area" hidden={reading}>
            {item.kind === "writing" ? (
              <WritingPad />
            ) : (
              <div data-library-tool>
                <ToolView
                  task={item.tool}
                  initial={model}
                  onRun={onRun}
                  hideHeading
                />
              </div>
            )}
          </div>
        )}
      </div>
      {paginated && (
        <nav className="library-page-controls" aria-label="Bagian soal">
          <Button
            variant="outline"
            aria-label="Bagian sebelumnya"
            disabled={index === 0}
            onClick={() => setPosition(index - 1)}
          >
            ← Kembali
          </Button>
          <p role="status" aria-live="polite">
            Bagian {index + 1} dari {Math.max(1, pages.length)}
          </p>
          <Button
            variant="outline"
            aria-label="Bagian berikutnya"
            disabled={index >= pages.length - 1}
            onClick={() => setPosition(index + 1)}
          >
            Lanjut →
          </Button>
        </nav>
      )}
    </section>
  );
}
function instruction(kind: string) {
  switch (kind) {
    case "number-line":
      return "Geser penanda. Tekan Jalankan untuk memeriksa.";
    case "fractions":
      return "Ketuk bagian untuk mewarnai. Tekan Jalankan untuk memeriksa.";
    case "ratio":
      return "Lengkapi pasangan pada tabel. Tekan Jalankan untuk memeriksa.";
    case "algebra":
      return "Susun ubin dalam kelompok. Tekan Jalankan untuk memeriksa.";
    case "balance":
      return "Jaga kedua sisi seimbang untuk menemukan nilai x.";
    default:
      return "Pilih titik di grafik. Tekan Jalankan untuk memeriksa.";
  }
}
function mathParts(text: string) {
  return text
    .replace(/-(?=\d)/g, "−")
    .split(/(−?\d+\/\d+)/g)
    .map((part) => {
      const match = part.match(/^(−?\d+)\/(\d+)$/);
      return { text: part, fraction: match ? [match[1], match[2]] : undefined };
    });
}
export function mathText(text: string) {
  return mathParts(text).map((part, index) =>
    part.fraction ? (
      <span key={index} className="library-fraction">
        <span>{part.fraction[0]}</span>
        <span>{part.fraction[1]}</span>
      </span>
    ) : (
      part.text
    ),
  );
}
type Point = { x: number; y: number };
function WritingPad() {
  const canvas = useRef<HTMLCanvasElement>(null),
    paths = useRef<Point[][]>([]),
    pointer = useRef<number | undefined>(undefined),
    [count, setCount] = useState(0);
  function draw() {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx || !canvas.current) return;
    ctx.clearRect(0, 0, 1200, 500);
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#164B47";
    for (const path of paths.current) {
      ctx.beginPath();
      path.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.stroke();
    }
  }
  function point(e: PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) * 1200) / rect.width,
      y: ((e.clientY - rect.top) * 500) / rect.height,
    };
  }
  return (
    <div className="library-writing">
      <canvas
        aria-label="Bidang tulis sementara"
        ref={canvas}
        width={1200}
        height={500}
        onPointerDown={(e) => {
          if (pointer.current !== undefined) return;
          pointer.current = e.pointerId;
          e.currentTarget.setPointerCapture(e.pointerId);
          paths.current.push([point(e)]);
        }}
        onPointerMove={(e) => {
          if (pointer.current !== e.pointerId) return;
          paths.current.at(-1)?.push(point(e));
          draw();
        }}
        onPointerUp={(e) => {
          if (pointer.current !== e.pointerId) return;
          pointer.current = undefined;
          setCount(paths.current.length);
        }}
        onPointerCancel={() => {
          pointer.current = undefined;
        }}
        onLostPointerCapture={() => {
          pointer.current = undefined;
        }}
      />
      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          disabled={!count}
          onClick={() => {
            paths.current.pop();
            setCount(paths.current.length);
            draw();
          }}
        >
          Urungkan goresan
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            paths.current = [];
            setCount(0);
            draw();
          }}
        >
          Hapus tulisan
        </Button>
      </div>
    </div>
  );
}
