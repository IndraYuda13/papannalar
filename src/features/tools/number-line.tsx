"use client";
import {
  useEffect,
  useReducer,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import { rational, type Rational } from "@/core/math/rational";
import {
  initialNumberLine,
  reduceNumberLine,
  checkNumberLine,
  type NumberLineTask,
  type NumberLineState,
} from "@/core/tools/number-line";
import type { ToolModel } from "@/core/tools/patterns";
import { FaceMarks } from "@/ui/components/activity-icon";
import { Button } from "@/ui/components/button";
const asNumber = (n: Rational) => Number(n.numerator) / Number(n.denominator);
const label = (n: number) => String(n).replace("-", "−").replace(".", ",");
export function NumberLine({
  vertical: defaultVertical = false,
  task: suppliedTask,
  initial,
  onRun,
}: {
  vertical?: boolean;
  task?: NumberLineTask;
  initial?: NumberLineState;
  onRun?: (model: ToolModel) => boolean;
}) {
  const task: NumberLineTask = suppliedTask ?? {
    origin: rational(defaultVertical ? -2 : -3),
    delta: rational(defaultVertical ? 7 : -5),
    orientation: defaultVertical ? "vertical" : "horizontal",
  };
  const vertical = task.orientation === "vertical";
  const [state, dispatch] = useReducer(
    (
      s: ReturnType<typeof initialNumberLine>,
      a: Parameters<typeof reduceNumberLine>[1],
    ) => reduceNumberLine(s, a, task),
    initial ?? initialNumberLine(task),
  );
  const [amount, setAmount] = useState(asNumber(task.delta) < 0 ? "-1" : "1"),
    [notice, setNotice] = useState("");
  const graph = useRef<SVGSVGElement>(null),
    axisGroup = useRef<SVGGElement>(null),
    pointer = useRef<number | null>(null);
  const [radius, setRadius] = useState(vertical ? 68 : 64);
  const [visibleRadius, setVisibleRadius] = useState(24);
  const [axisText, setAxisText] = useState({
    size: 36,
    x: -52,
    y: 12,
    below: 65,
  });
  const [axisPixels, setAxisPixels] = useState(900);
  const [railPadding, setRailPadding] = useState(60);
  useEffect(() => {
    const svg = graph.current;
    if (!svg) return;
    const measure = () => {
      // Visual marker and hit area have independent CSS-pixel sizes. One
      // handle snaps along the rail; floor labels are never overlapping targets.
      const scale = Math.min(
        svg.clientWidth / (vertical ? 300 : 1320),
        svg.clientHeight / (vertical ? 600 : 300),
      );
      if (scale > 0) {
        const style = getComputedStyle(svg);
        const marker =
          parseFloat(style.getPropertyValue("--board-marker")) || 40;
        const hit = parseFloat(style.getPropertyValue("--board-hit")) || 56;
        setRadius(Math.max(48, hit) / 2 / scale);
        // Include the two-pixel non-scaling border in the visible diameter.
        setVisibleRadius((marker - 2) / 2 / scale);
        const padding = Math.max(60, (Math.max(24, marker / 2) + 12) / scale);
        setRailPadding(padding);
        setAxisPixels(
          (vertical ? 480 : Math.max(1, 1320 - 2 * padding)) * scale,
        );
        setAxisText({
          size: (vertical ? 18 : 22) / scale,
          x: -(marker / 2 + 16) / scale,
          y: 6 / scale,
          below: (marker / 2 + 28) / scale,
        });
      }
    };
    const observer = new ResizeObserver(measure);
    observer.observe(svg);
    const preset = svg.closest("[data-board-preset]");
    const appearance = new MutationObserver(measure);
    if (preset)
      appearance.observe(preset, {
        attributes: true,
        subtree: true,
        attributeFilter: [
          "data-board-preset",
          "data-large-objects",
          "data-board-height",
        ],
      });
    return () => {
      observer.disconnect();
      appearance.disconnect();
    };
  }, [vertical]);
  const [zoom, setZoom] = useState(1),
    [dragAt, setDragAt] = useState<number | null>(null);
  const current = asNumber(state.current);
  const min =
      current -
      (current -
        Math.min(
          vertical ? -3 : -10,
          asNumber(task.origin) - 2,
          Math.floor(current) - 1,
        )) *
        zoom,
    max =
      current +
      (Math.max(
        vertical ? 7 : 10,
        asNumber(task.origin) + 2,
        Math.ceil(current) + 1,
      ) -
        current) *
        zoom,
    range = max - min;
  const offset = vertical ? 60 : railPadding;
  const axis = vertical ? 480 : Math.max(1, 1320 - 2 * railPadding);
  const position = (n: number) => offset + ((n - min) / range) * axis;
  // Label density follows available pixels; the rational model and snap quantum
  // stay unchanged. The rail is still continuous between these exact tick values.
  const wanted = range / Math.max(2, Math.min(20, Math.floor(axisPixels / 52)));
  const magnitude = 10 ** Math.floor(Math.log10(wanted));
  const step = [1, 2, 5, 10].find((n) => n * magnitude >= wanted)! * magnitude;
  const firstTick = Math.ceil(min / step) * step;
  const points = Array.from(
    { length: Math.max(0, Math.floor((max - firstTick) / step) + 1) },
    (_, i) => Number((firstTick + i * step).toPrecision(10)),
  );
  const act = (action: Parameters<typeof reduceNumberLine>[1]) => {
    if (
      state.jumps.length >= 40 &&
      (action.type === "jump" || action.type === "move")
    ) {
      setNotice(
        "Batalkan langkah terakhir atau mulai ulang untuk mencoba lagi.",
      );
      return;
    }
    try {
      dispatch(action);
      setNotice("");
    } catch {
      setNotice(
        "Batalkan langkah terakhir atau mulai ulang untuk mencoba lagi.",
      );
    }
  };
  function pointerValue(e: PointerEvent<SVGCircleElement>) {
    const matrix = axisGroup.current?.getScreenCTM();
    if (!matrix) return current;
    const point = new DOMPoint(e.clientX, e.clientY).matrixTransform(
      matrix.inverse(),
    );
    const quantum =
      1 /
      Math.max(Number(task.origin.denominator), Number(task.delta.denominator));
    return (
      Math.round((min + ((point.x - offset) / axis) * range) / quantum) *
      quantum
    );
  }
  function release(e: PointerEvent<SVGCircleElement>) {
    if (pointer.current !== e.pointerId) return;
    pointer.current = null;
    setDragAt(null);
    const denominator = Math.max(
      Number(task.origin.denominator),
      Number(task.delta.denominator),
    );
    act({
      type: "move",
      to: rational(Math.round(pointerValue(e) * denominator), denominator),
    });
  }
  return (
    <section
      aria-label={vertical ? "Model lift" : "Garis Bilangan Lompat"}
      data-tool="number-line"
      data-orientation={vertical ? "vertical" : "horizontal"}
      className="board-tool w-full space-y-4"
    >
      <p className="text-[32px]">
        {`Mulai dari ${label(asNumber(task.origin))}. Geser ${label(Math.abs(asNumber(task.delta)))} ${vertical ? "lantai" : "langkah"} ${asNumber(task.delta) < 0 ? (vertical ? "turun" : "ke kiri") : vertical ? "naik" : "ke kanan"}.`}
      </p>
      <div
        className={
          vertical
            ? "number-line-model flex items-center justify-center gap-12"
            : "number-line-model w-full"
        }
      >
        <svg
          ref={graph}
          role="img"
          aria-label={
            vertical ? "Garis bilangan tegak" : "Garis bilangan mendatar"
          }
          viewBox={vertical ? "0 0 300 600" : "0 0 1320 300"}
          className={
            vertical
              ? "h-[400px] w-[200px] touch-none overflow-visible"
              : "h-[280px] w-full touch-none overflow-visible"
          }
        >
          <g
            ref={axisGroup}
            transform={vertical ? "translate(0 600) rotate(-90)" : undefined}
          >
            <line
              x1={offset}
              y1="150"
              x2={offset + axis}
              y2="150"
              stroke="var(--color-pn-ink-900)"
              strokeWidth="5"
            />
            {points.map((n) => (
              <g key={n} transform={`translate(${position(n)} 150)`}>
                <line y1="-12" y2="12" stroke="currentColor" strokeWidth="3" />
                <text
                  transform={vertical ? "rotate(90)" : undefined}
                  x={vertical ? axisText.x : 0}
                  y={vertical ? axisText.y : axisText.below}
                  textAnchor="middle"
                  fontSize={axisText.size}
                >
                  {label(n)}
                </text>
              </g>
            ))}
            {state.jumps.map((j, i) => (
              <path
                key={i}
                className="number-line-trail"
                d={`M ${position(asNumber(j.from))} 140 Q ${(position(asNumber(j.from)) + position(asNumber(j.to))) / 2} ${30 - (i % 3) * 15} ${position(asNumber(j.to))} 140`}
                fill="none"
                stroke="var(--color-pn-teal-700)"
                strokeWidth="6"
              />
            ))}
            <circle
              data-testid="number-marker"
              role="button"
              tabIndex={0}
              aria-label={`Penanda ${label(current)}; seret atau gunakan panah`}
              cx={position(dragAt ?? current)}
              cy="150"
              r={radius}
              className="number-line-hit"
              fill="transparent"
              onPointerDown={(e) => {
                if (pointer.current !== null || e.width > 80 || e.height > 80)
                  return;
                pointer.current = e.pointerId;
                if (e.pointerId !== -77)
                  e.currentTarget.setPointerCapture(e.pointerId);
              }}
              onPointerUp={release}
              onPointerMove={(e) => {
                if (pointer.current === e.pointerId) setDragAt(pointerValue(e));
              }}
              onPointerCancel={() => {
                pointer.current = null;
                setDragAt(null);
              }}
              onLostPointerCapture={() => {
                pointer.current = null;
                setDragAt(null);
              }}
              onKeyDown={(e) => {
                if (
                  ["ArrowLeft", "ArrowDown", "ArrowRight", "ArrowUp"].includes(
                    e.key,
                  )
                ) {
                  e.preventDefault();
                  act({
                    type: "jump",
                    amount: rational(
                      ["ArrowLeft", "ArrowDown"].includes(e.key) ? -1 : 1,
                    ),
                  });
                }
              }}
            />
            <g
              className="number-line-visual"
              data-dragging={dragAt !== null ? "true" : "false"}
              style={{
                transformOrigin: "0 0",
                transform: `translate(${position(dragAt ?? current)}px, 150px)`,
              }}
            >
              <circle
                data-testid="number-marker-visual"
                className="number-line-marker"
                data-dragging={dragAt !== null ? "true" : "false"}
                aria-hidden="true"
                pointerEvents="none"
                cx="0"
                cy="0"
                r={visibleRadius}
                fill="var(--color-pn-amber-500)"
                stroke="var(--color-pn-ink-900)"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
              <g
                className="number-line-face"
                aria-hidden="true"
                pointerEvents="none"
                transform={`${vertical ? "rotate(90)" : ""} scale(${visibleRadius / 17}) translate(-21 -23)`}
              >
                <FaceMarks />
              </g>
            </g>
          </g>
        </svg>
        <output
          data-testid="number-position"
          className="block text-center text-[56px] font-bold"
        >
          Posisi {label(current)}
          {vertical && state.jumps.length > 0
            ? ` · perpindahan ${label(current - asNumber(state.origin))} lantai`
            : ""}
        </output>
      </div>
      <div className="board-tool-actions flex flex-wrap items-center justify-center gap-4 text-[28px]">
        <label className="flex items-center gap-3">
          Lompatan
          <input
            aria-label="Besar lompatan"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="min-h-24 w-32 rounded-input border-2 bg-white p-3"
          />
        </label>
        <Button
          size="board"
          onClick={() => {
            if (!/^-?\d{1,4}(?:[.,]\d{1,4}|\/[1-9]\d{0,3})?$/.test(amount)) {
              setNotice("Isi bilangan atau pecahan, misalnya −2 atau 1/2.");
              return;
            }
            const normalized = amount.replace(",", ".");
            const [n, d] = normalized.includes("/")
              ? normalized.split("/")
              : normalized.includes(".")
                ? [
                    normalized.replace(".", ""),
                    String(10 ** normalized.split(".")[1].length),
                  ]
                : [normalized, "1"];
            act({ type: "jump", amount: rational(BigInt(n), BigInt(d)) });
          }}
        >
          Lompat
        </Button>
        <Button
          size="board"
          variant="outline"
          onClick={() => act({ type: "undo" })}
        >
          Batalkan langkah terakhir
        </Button>
        <Button
          size="board"
          variant="outline"
          onClick={() => act({ type: "reset" })}
        >
          Mulai ulang
        </Button>
        <Button
          size="board"
          onClick={() =>
            setNotice(
              (onRun?.({ kind: "number-line", state }) ??
                checkNumberLine(state, task).modelMatches)
                ? "Model sudah sesuai. Ceritakan arah lompatanmu."
                : "Coba periksa titik awal dan arah setiap lompatan.",
            )
          }
        >
          Jalankan
        </Button>
        <Button
          size="board"
          variant="outline"
          onClick={() => setZoom((z) => Math.max(0.125, z / 2))}
        >
          Perbesar garis
        </Button>
        <Button
          size="board"
          variant="outline"
          onClick={() => setZoom((z) => Math.min(16, z * 2))}
        >
          Perkecil garis
        </Button>
      </div>
      <p role="status" className="min-h-14 text-[40px] text-primary">
        {notice}
      </p>
    </section>
  );
}
