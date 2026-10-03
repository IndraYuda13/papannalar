"use client";
import {
  useEffect,
  useId,
  useReducer,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import {
  initialGraphs,
  reduceGraphs,
  checkGraphs,
  graphValues,
  drawingValue,
  feasiblePolygon,
  quadraticRoots,
  rootApproximation,
  intersection,
  withinDomain,
  modelForTask,
  type GraphTask,
  type GraphState,
  type GraphAction,
  type Point,
} from "@/core/tools/graphs";
import { rational, type Rational } from "@/core/math/rational";
import {
  exactText,
  graphModelText,
  rootText,
  type ToolModel,
} from "@/core/tools/patterns";
import { PointerOwnership } from "@/core/tools/pointers";
import { ObjectFace } from "@/ui/components/activity-icon";
import { Button } from "@/ui/components/button";
type CoefficientAction = Extract<GraphAction, { type: "coefficient" }>;
const number = (v: Rational) => Number(v.numerator) / Number(v.denominator);
const text = (v: Rational) => exactText(v).replaceAll("-", "−");
const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));
function parse(value: string) {
  if (!/^-?\d{1,100}(?:\/[1-9]\d{0,96})?$/.test(value))
    throw new RangeError("Exact numeric coordinate");
  const [n, d = "1"] = value.split("/");
  return rational(BigInt(n), BigInt(d));
}
function GraphSlider({
  label,
  value,
  min,
  max,
  onPreview,
  onCommit,
  onCancel,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onPreview: (n: number) => void;
  onCommit: (n: number) => boolean;
  onCancel: () => void;
}) {
  const draft = useRef<number | null>(null),
    owner = useRef<number | null>(null);
  function commit() {
    if (draft.current !== null) {
      onCommit(draft.current);
      draft.current = null;
    }
    owner.current = null;
  }
  return (
    <label className="board-graph-control grid grid-cols-[1fr_104px] items-center gap-x-3 text-[28px]">
      <span className="col-span-2">{label}</span>
      <input
        aria-label={`Geser ${label}`}
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        className="graph-slider h-24 min-w-0 w-full touch-none accent-primary"
        onPointerDown={(e) => {
          if (owner.current !== null || e.width > 80 || e.height > 80) {
            e.preventDefault();
            return;
          }
          owner.current = e.pointerId;
        }}
        onChange={(e) => {
          draft.current = Number(e.target.value);
          onPreview(draft.current);
        }}
        onPointerUp={(e) => {
          if (owner.current === e.pointerId) commit();
        }}
        onKeyUp={commit}
        onBlur={commit}
        onPointerCancel={() => {
          draft.current = null;
          owner.current = null;
          onCancel();
        }}
        onLostPointerCapture={() => {
          draft.current = null;
          owner.current = null;
          onCancel();
        }}
      />
      <input
        key={value}
        aria-label={label}
        type="number"
        min={min}
        max={max}
        step={1}
        defaultValue={value}
        className="min-h-24 w-full border-2 bg-white p-2 text-center text-[32px]"
        onBlur={(e) => {
          const n = Number(e.target.value);
          if (!Number.isInteger(n) || n < min || n > max || !onCommit(n))
            e.target.value = String(value);
        }}
      />
    </label>
  );
}
export function Graphs({
  task,
  initial,
  onRun,
}: {
  task: GraphTask;
  initial?: GraphState;
  onRun?: (model: ToolModel) => boolean;
}) {
  const [state, dispatch] = useReducer(
    (s: GraphState, a: GraphAction) => reduceGraphs(s, a, task),
    initial ?? initialGraphs(task),
  );
  const [previews, setPreviews] = useState<Record<string, CoefficientAction>>(
      {},
    ),
    [pointPreview, setPointPreview] = useState<Point | null>(null),
    [notice, setNotice] = useState(""),
    [highlight, setHighlight] = useState(false);
  const owners = useRef(new PointerOwnership()),
    drag = useRef<number | null>(null),
    plot = useRef<HTMLDivElement>(null),
    xInput = useRef<HTMLInputElement>(null),
    yInput = useRef<HTMLInputElement>(null);
  const clipId = useId();
  let display = state;
  for (const preview of Object.values(previews)) {
    try {
      display = reduceGraphs(display, preview, task);
    } catch {
      /* Invalid intermediate slider value keeps the last legal model. */
    }
  }
  const frame = display.frame,
    model = frame.model,
    point = pointPreview ?? frame.point,
    d = task.domain;
  const width = 1000;
  const [axisFont, setAxisFont] = useState(22);
  // Reserve real pixel space for signed/decimal labels on narrow previews.
  // Pointer projection and clipping use the same responsive drawing rectangle.
  const height = Math.max(480, axisFont * 12),
    left = Math.max(80, axisFont * 3.5),
    top = Math.max(20, axisFont * 1.4),
    plotWidth = width - left - Math.max(30, axisFont * 1.3),
    plotHeight = height - top - axisFont * 2.2;
  useEffect(() => {
    const element = plot.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      if (element.clientWidth > 0)
        setAxisFont((18 * width) / element.clientWidth);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [width]);
  const px = (x: number) =>
    left + ((x - d.minX) / (d.maxX - d.minX)) * plotWidth;
  const py = (y: number) =>
    top + ((d.maxY - y) / (d.maxY - d.minY)) * plotHeight;
  function act(action: GraphAction) {
    try {
      reduceGraphs(state, action, task);
      dispatch(action);
      setNotice("");
      setHighlight(false);
      return true;
    } catch {
      setNotice(
        "Periksa batas nilai. Koefisien a dan basis tidak boleh membuat model tak berlaku; titik harus berada dalam rentang yang ditampilkan.",
      );
      return false;
    }
  }
  function clearPreview(id: string) {
    setPreviews((old) =>
      Object.fromEntries(Object.entries(old).filter(([key]) => key !== id)),
    );
  }
  function slider(
    label: string,
    key: CoefficientAction["key"],
    value: number,
    min: number,
    max: number,
    curve: 0 | 1 | 2 | 3 = 0,
  ) {
    const id = `${curve}:${key}`;
    return (
      <GraphSlider
        key={id}
        label={label}
        value={value}
        min={min}
        max={max}
        onPreview={(n) =>
          setPreviews((old) => ({
            ...old,
            [id]: { type: "coefficient", key, value: n, curve },
          }))
        }
        onCommit={(n) => {
          clearPreview(id);
          return act({ type: "coefficient", key, value: n, curve });
        }}
        onCancel={() => clearPreview(id)}
      />
    );
  }
  function pointFromEvent(e: PointerEvent<HTMLButtonElement>): Point {
    const box = plot.current!.querySelector("svg")!.getBoundingClientRect();
    const x = clamp(
      d.minX +
        ((((e.clientX - box.left) / box.width) * width - left) / plotWidth) *
          (d.maxX - d.minX),
      d.minX,
      d.maxX,
    );
    const y = clamp(
      d.maxY -
        ((((e.clientY - box.top) / box.height) * height - top) / plotHeight) *
          (d.maxY - d.minY),
      d.minY,
      d.maxY,
    );
    const yStep =
      d.maxY - d.minY <= 20
        ? 0.25
        : 10 ** Math.max(0, Math.floor(Math.log10(d.maxY - d.minY)) - 2);
    return {
      x:
        model.mode === "exponential"
          ? rational(Math.round(x))
          : rational(Math.round(x * 4), 4),
      y: rational(
        Math.round(clamp(Math.round(y / yStep) * yStep, d.minY, d.maxY) * 4),
        4,
      ),
    };
  }
  function cancel(e: PointerEvent<HTMLButtonElement>) {
    owners.current.release(e.pointerId);
    if (drag.current === e.pointerId) {
      drag.current = null;
      setPointPreview(null);
    }
  }
  function coordinates(onCurve = false) {
    function restoreInputs() {
      if (xInput.current) xInput.current.value = exactText(frame.point.x);
      if (yInput.current) yInput.current.value = exactText(frame.point.y);
    }
    try {
      const x = parse(xInput.current!.value);
      const y = onCurve
        ? graphValues(model, x)[0]
        : parse(yInput.current!.value);
      if (!act({ type: "point", point: { x, y } })) restoreInputs();
    } catch {
      setNotice(
        "Isi koordinat bilangan bulat atau pecahan. Eksponensial memakai x bilangan bulat dalam rentang.",
      );
      restoreInputs();
    }
  }
  const colors = [
    "var(--pn-teal-700)",
    "var(--pn-amber-700)",
    "var(--pn-grup-ungu)",
    "var(--pn-grup-hijau)",
  ];
  const count =
    model.mode === "linear"
      ? model.lines.length
      : model.mode === "inequalities"
        ? model.constraints.length
        : model.mode === "exponential"
          ? 2
          : 1;
  const hit =
    model.mode === "linear" && model.lines.length === 2
      ? intersection(model.lines[0], model.lines[1])
      : null;
  const polygon =
    model.mode === "inequalities" && frame.shaded
      ? feasiblePolygon(model.constraints, d)
      : [];
  const pointVisible = withinDomain(point, d);
  const ticks = Array.from({ length: 6 }, (_, i) => i / 5);
  const displayTick = (n: number) =>
    n.toLocaleString("id-ID", { maximumFractionDigits: 2 });
  return (
    <section
      aria-label="Grafik Geser"
      data-tool="graphs"
      className="board-tool space-y-4 text-left"
    >
      <p className="text-[56px]" data-testid="graph-target">
        Susun: {graphModelText(modelForTask(task))}
      </p>
      <p className="text-[32px]">
        {task.mode === "linear"
          ? task.goal.type === "intersection"
            ? "Apa hubungan kedua garis? Jika berpotongan, letakkan titik pada perpotongannya."
            : `Letakkan titik pada kurva ketika x = ${task.goal.x}.`
          : task.mode === "quadratic"
            ? "Ubah a, b, c lalu tandai perpotongan dengan sumbu x."
            : task.mode === "inequalities"
              ? "Pilih sisi setiap garis, arsir irisannya, lalu letakkan titik yang memenuhi semua batas."
              : task.goal.type === "target"
                ? `Temukan x bilangan bulat ketika y = ${text(rational(task.goal.y.numerator, task.goal.y.denominator))}. Bandingkan dengan garis lurus.`
                : `Bandingkan kurva dan garis lurus ketika x = ${task.goal.x}.`}
      </p>
      <div className="board-graph-workspace grid items-start gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(350px,1fr)]">
        <div className="min-w-0 space-y-3">
          <div
            ref={plot}
            data-testid="graph-plot"
            className={`relative w-full min-w-[600px] border-4 bg-white ${highlight ? "border-dashed border-pn-amber-500" : "border-primary"}`}
          >
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="block w-full"
              role="img"
              aria-label="Bidang koordinat dan kurva model"
            >
              <defs>
                <clipPath id={clipId}>
                  <rect
                    x={left}
                    y={top}
                    width={plotWidth}
                    height={plotHeight}
                  />
                </clipPath>
              </defs>
              {ticks.map((t) => (
                <g key={t} fill="var(--pn-ink-900)" fontSize={axisFont}>
                  <line
                    x1={left + t * plotWidth}
                    x2={left + t * plotWidth}
                    y1={top}
                    y2={top + plotHeight}
                    stroke="var(--pn-teal-100)"
                  />
                  <line
                    x1={left}
                    x2={left + plotWidth}
                    y1={top + t * plotHeight}
                    y2={top + t * plotHeight}
                    stroke="var(--pn-teal-100)"
                  />
                  <text
                    x={left + t * plotWidth}
                    y={top + plotHeight + axisFont * 1.3}
                    textAnchor="middle"
                  >
                    {displayTick(d.minX + t * (d.maxX - d.minX))}
                  </text>
                  <text
                    x={left - axisFont * 0.5}
                    y={top + t * plotHeight + axisFont * 0.32}
                    textAnchor="end"
                  >
                    {displayTick(d.maxY - t * (d.maxY - d.minY))}
                  </text>
                </g>
              ))}
              <g clipPath={`url(#${clipId})`}>
                {polygon.length > 0 && (
                  <polygon
                    data-testid="graph-feasible"
                    points={polygon
                      .map((p) => `${px(number(p.x))},${py(number(p.y))}`)
                      .join(" ")}
                    fill="var(--pn-amber-500)"
                    fillOpacity="0.24"
                    stroke="var(--pn-amber-700)"
                    strokeWidth="2"
                  />
                )}
                <line
                  x1={left}
                  x2={left + plotWidth}
                  y1={py(0)}
                  y2={py(0)}
                  stroke="var(--pn-ink-900)"
                  strokeWidth="3"
                />
                <line
                  x1={px(0)}
                  x2={px(0)}
                  y1={top}
                  y2={top + plotHeight}
                  stroke="var(--pn-ink-900)"
                  strokeWidth="3"
                />
                {Array.from({ length: count }, (_, i) => {
                  const q =
                    model.mode === "inequalities" ? model.constraints[i] : null;
                  const dash =
                    q && (q.operator === "lt" || q.operator === "gt")
                      ? "10 8"
                      : i === 1 && model.mode !== "inequalities"
                        ? "16 6"
                        : undefined;
                  if (q && q.b === 0)
                    return (
                      <line
                        key={i}
                        x1={px(q.c / q.a)}
                        x2={px(q.c / q.a)}
                        y1={top}
                        y2={top + plotHeight}
                        stroke={colors[i]}
                        strokeWidth="5"
                        strokeDasharray={dash}
                      />
                    );
                  const points = Array.from({ length: 161 }, (_, n) => {
                    const x = d.minX + ((d.maxX - d.minX) * n) / 160,
                      y = drawingValue(model, x, i);
                    return y === null
                      ? null
                      : `${px(x)},${clamp(py(y), -5000, 5500)}`;
                  }).filter((p) => p !== null);
                  return (
                    <polyline
                      key={i}
                      data-testid={`graph-curve-${i}`}
                      points={points.join(" ")}
                      fill="none"
                      stroke={colors[i]}
                      strokeWidth="5"
                      strokeDasharray={dash}
                    />
                  );
                })}
                {state.history.length > 0 && hit && typeof hit !== "string" && (
                  <circle
                    data-testid="graph-intersection"
                    cx={px(number(hit.x))}
                    cy={py(number(hit.y))}
                    r="10"
                    fill="var(--pn-ink-900)"
                  />
                )}
                {frame.rootsShown &&
                  model.mode === "quadratic" &&
                  quadraticRoots(model).map((r, i) => (
                    <circle
                      key={i}
                      data-testid="graph-root"
                      cx={px(rootApproximation(r))}
                      cy={py(0)}
                      r="10"
                      fill="var(--pn-amber-700)"
                    />
                  ))}
              </g>
              <text x={width - axisFont} y={height - 5} fontSize={axisFont}>
                x
              </text>
              <text x={left - axisFont} y={axisFont} fontSize={axisFont}>
                y
              </text>
            </svg>
            {pointVisible && (
              <button
                type="button"
                aria-label="Seret titik uji grafik"
                className="absolute flex h-[88px] w-[88px] -translate-x-1/2 -translate-y-1/2 touch-none items-center justify-center rounded-full border-4 border-primary bg-secondary/80 text-[40px] text-primary"
                style={{
                  left: `${(px(number(point.x)) / width) * 100}%`,
                  top: `${(py(number(point.y)) / height) * 100}%`,
                }}
                onPointerDown={(e) => {
                  if (
                    !owners.current.claim(
                      e.pointerId,
                      "graph-point",
                      e.width,
                      e.height,
                    )
                  )
                    return;
                  drag.current = e.pointerId;
                  if (e.pointerId !== -77)
                    e.currentTarget.setPointerCapture(e.pointerId);
                }}
                onPointerMove={(e) => {
                  if (drag.current === e.pointerId)
                    setPointPreview(pointFromEvent(e));
                }}
                onPointerUp={(e) => {
                  if (drag.current !== e.pointerId) return;
                  const next = pointFromEvent(e);
                  cancel(e);
                  act({ type: "point", point: next });
                }}
                onPointerCancel={cancel}
                onLostPointerCapture={cancel}
                onKeyDown={(e) => {
                  const moves: Record<string, [number, number]> = {
                    ArrowLeft: [-1, 0],
                    ArrowRight: [1, 0],
                    ArrowUp: [0, 1],
                    ArrowDown: [0, -1],
                  };
                  const change = moves[e.key];
                  if (change) {
                    e.preventDefault();
                    act({
                      type: "point",
                      point: {
                        x: rational(
                          Math.round(
                            number(point.x) * 4 +
                              change[0] *
                                (model.mode === "exponential" ? 4 : 1),
                          ),
                          4,
                        ),
                        y: rational(
                          Math.round(number(point.y) * 4 + change[1]),
                          4,
                        ),
                      },
                    });
                  }
                }}
              >
                <ObjectFace />
              </button>
            )}
          </div>
          <p className="text-[28px]">
            Rentang x: {d.minX} sampai {d.maxX}; y: {d.minY} sampai {d.maxY}.{" "}
            {count === 2
              ? "Kurva A utuh, B putus-putus."
              : model.mode === "inequalities"
                ? "Garis putus-putus berarti batas tidak ikut."
                : ""}
          </p>
          {(state.history.length > 0 || initial) && (
            <p data-testid="graph-model" className="text-[32px]">
              Model: {graphModelText(model)}
            </p>
          )}
          {frame.placed && (
            <p data-testid="graph-point" className="text-[40px]">
              Titik ({text(point.x)}, {text(point.y)})
              {pointVisible ? "" : " · di luar rentang"}
            </p>
          )}
          {frame.rootsShown && model.mode === "quadratic" && (
            <p data-testid="graph-roots" className="text-[40px]">
              Akar model:{" "}
              {quadraticRoots(model).map(rootText).join(" dan ") ||
                "tidak ada akar real"}
            </p>
          )}
          {model.mode !== "inequalities" && state.history.length > 0 && (
            <table
              aria-label="Tabel nilai grafik"
              className="w-full border-separate border-spacing-2 text-[28px]"
            >
              <thead>
                <tr>
                  <th scope="col">x</th>
                  <th scope="col">y kurva A</th>
                  {count === 2 && <th scope="col">y kurva B</th>}
                </tr>
              </thead>
              <tbody>
                {Array.from(
                  new Set(
                    [-1, 0, 1].map((i) =>
                      clamp(
                        Math.floor(number(frame.point.x)) + i,
                        d.minX,
                        d.maxX,
                      ),
                    ),
                  ),
                ).map((x) => (
                  <tr key={x}>
                    <th scope="row">{x}</th>
                    {graphValues(model, rational(x)).map((y, i) => (
                      <td key={i} className="break-all border p-2">
                        {text(y)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="space-y-3" aria-label="Koefisien grafik">
          {model.mode === "linear" &&
            model.lines.map((l, i) => (
              <fieldset
                key={i}
                className="space-y-2 rounded-kartu border-2 p-3"
              >
                <legend className="text-[32px]">
                  Garis {i === 0 ? "A" : "B"}
                </legend>
                {slider(
                  `Kemiringan ${i === 0 ? "A" : "B"}`,
                  "m",
                  l.m,
                  -12,
                  12,
                  i as 0 | 1,
                )}
                {slider(
                  `Titik potong y ${i === 0 ? "A" : "B"}`,
                  "b",
                  l.b,
                  -100,
                  100,
                  i as 0 | 1,
                )}
              </fieldset>
            ))}
          {model.mode === "quadratic" &&
            (["a", "b", "c"] as const).map((key) =>
              slider(
                `Koefisien ${key}`,
                key,
                model[key],
                key === "a" ? -12 : key === "b" ? -40 : -200,
                key === "a" ? 12 : key === "b" ? 40 : 200,
              ),
            )}
          {model.mode === "exponential" && (
            <>
              {slider(
                `Pembilang basis (penyebut ${model.base.denominator})`,
                "base",
                model.base.numerator,
                Math.max(1, Math.ceil(model.base.denominator / 10)),
                Math.min(10000, model.base.denominator * 10),
              )}
              {slider(
                `Pembilang skala (penyebut ${model.scale.denominator})`,
                "scale",
                model.scale.numerator,
                1,
                10000,
              )}
              {slider("Geser pangkat", "shift", model.shift, -6, 6)}
              {slider(
                "Kemiringan pembanding",
                "m",
                model.comparison.m,
                -12,
                12,
              )}
              {slider("Awal pembanding", "b", model.comparison.b, -100, 100)}
            </>
          )}
          {model.mode === "inequalities" &&
            model.constraints.map((q, i) => (
              <fieldset key={i} className="rounded-kartu border-2 p-3">
                <legend className="text-[32px]">
                  Batas {i + 1}: {q.a}x + {q.b}y
                </legend>
                {slider(
                  `Batas ruas ${i + 1}`,
                  "c",
                  q.c,
                  -100,
                  100,
                  i as 0 | 1 | 2 | 3,
                )}
                <div className="flex flex-wrap gap-2">
                  {(["le", "lt", "ge", "gt"] as const).map((op) => (
                    <Button
                      key={op}
                      size="board"
                      variant="outline"
                      aria-label={`Batas ${i + 1} ${{ le: "≤", lt: "<", ge: "≥", gt: ">" }[op]}`}
                      aria-pressed={q.operator === op}
                      className={
                        q.operator === op
                          ? "border-4 border-primary bg-secondary"
                          : ""
                      }
                      onClick={() =>
                        act({ type: "inequality", index: i, operator: op })
                      }
                    >
                      {{ le: "≤", lt: "<", ge: "≥", gt: ">" }[op]}
                    </Button>
                  ))}
                </div>
              </fieldset>
            ))}
        </div>
      </div>
      <div className="board-graph-coordinates flex flex-wrap items-end gap-3">
        <label className="text-[28px]">
          Koordinat x
          <input
            key={`x/${state.history.length}`}
            ref={xInput}
            aria-label="Koordinat x grafik"
            defaultValue={exactText(frame.point.x)}
            maxLength={105}
            className="block min-h-24 w-44 border-2 bg-white p-3 text-[32px]"
          />
        </label>
        <label className="text-[28px]">
          Koordinat y
          <input
            key={`y/${state.history.length}`}
            ref={yInput}
            aria-label="Koordinat y grafik"
            defaultValue={exactText(frame.point.y)}
            maxLength={200}
            className="block min-h-24 w-60 border-2 bg-white p-3 text-[32px]"
          />
        </label>
        <Button size="board" variant="outline" onClick={() => coordinates()}>
          Letakkan titik uji
        </Button>
        {model.mode !== "inequalities" && (
          <Button
            size="board"
            variant="outline"
            onClick={() => coordinates(true)}
          >
            Titik pada kurva A
          </Button>
        )}
        {model.mode === "inequalities" && (
          <Button
            size="board"
            variant="outline"
            aria-pressed={frame.shaded}
            onClick={() => act({ type: "shade" })}
          >
            Arsir irisan
          </Button>
        )}
        {model.mode === "quadratic" && (
          <Button
            size="board"
            variant="outline"
            aria-pressed={frame.rootsShown}
            onClick={() => act({ type: "roots" })}
          >
            Tandai akar model
          </Button>
        )}
      </div>
      {model.mode === "linear" && model.lines.length === 2 && (
        <div className="flex flex-wrap gap-3">
          {(["unique", "parallel", "coincident"] as const).map((value) => (
            <Button
              key={value}
              size="board"
              variant="outline"
              aria-pressed={frame.relationship === value}
              onClick={() => act({ type: "relationship", value })}
            >
              {
                {
                  unique: "Satu titik potong",
                  parallel: "Sejajar",
                  coincident: "Berimpit",
                }[value]
              }
            </Button>
          ))}
        </div>
      )}
      <div className="board-graph-actions flex flex-wrap gap-3">
        <Button
          size="board"
          variant="outline"
          disabled={!state.history.length}
          onClick={() => act({ type: "undo" })}
        >
          Ulang langkah
        </Button>
        <Button
          size="board"
          variant="outline"
          onClick={() => {
            setPreviews({});
            setPointPreview(null);
            act({ type: "reset" });
          }}
        >
          Mulai ulang
        </Button>
        <Button
          size="board"
          onClick={() => {
            const check = checkGraphs(state, task),
              matches =
                onRun?.({ kind: "graphs", state }) ?? check.modelMatches;
            setHighlight(!matches);
            setNotice(
              matches
                ? "Model sudah sesuai. Jelaskan hubungan persamaan, kurva dan titiknya."
                : check.coefficientsMatch
                  ? "Periksa titik, irisan semua batas, atau perpotongan sumbu pada model."
                  : "Bandingkan koefisien dan tanda pada model dengan persamaan yang diminta.",
            );
          }}
        >
          Jalankan
        </Button>
      </div>
      <p role="status" className="min-h-14 text-[40px] text-primary">
        {notice}
      </p>
    </section>
  );
}
