import {
  rational,
  addRational,
  compareRational,
  subtractRational,
  type Rational,
} from "../math/rational";
import {
  initialFractions,
  reduceFractions,
  checkFractions,
  barValue,
  type FractionTask,
  type FractionState,
} from "./fractions";
import {
  initialRatio,
  reduceRatio,
  checkRatio,
  type RatioTask,
  type RatioState,
} from "./ratio";
import {
  initialAlgebra,
  reduceAlgebra,
  checkAlgebra,
  coefficients,
  type AlgebraTask,
  type AlgebraState,
} from "./algebra";
import {
  initialNumberLine,
  reduceNumberLine,
  checkNumberLine,
  type NumberLineTask,
  type NumberLineState,
} from "./number-line";
import {
  initialBalance,
  exampleBalance,
  mistakenBalance,
  checkBalance,
  type BalanceTask,
  type BalanceState,
  type LinearExpression,
} from "./balance";
import {
  initialGraphs,
  exampleGraphs,
  mistakenGraphs,
  checkGraphs,
  modelsMatch,
  pointOnModel,
  withinDomain,
  quadraticRoots,
  type GraphTask,
  type GraphState,
  type GraphModel,
  type ExactRoot,
} from "./graphs";
import { twinGraph } from "./graph-tasks";

export const PATTERNS = [
  "predict",
  "watch",
  "explore",
  "build",
  "find-error",
  "together",
  "open",
] as const;
export type Pattern = (typeof PATTERNS)[number];
export const PATTERN_LABELS: Record<Pattern, string> = {
  predict: "Tebak Dulu",
  watch: "Lihat Dulu",
  explore: "Jelajah",
  build: "Bangun Model",
  "find-error": "Cari Kesalahan",
  together: "Berdua",
  open: "Tantangan Terbuka",
};
export type NumberLineDescriptor = Readonly<{
  kind: "number-line";
  origin: { numerator: number; denominator: number };
  delta: { numerator: number; denominator: number };
  orientation: "horizontal" | "vertical";
}>;
export type ToolTask =
  | FractionTask
  | RatioTask
  | AlgebraTask
  | NumberLineDescriptor
  | BalanceTask
  | GraphTask;
export type ToolModel =
  | { kind: "fractions"; state: FractionState }
  | { kind: "ratio"; state: RatioState }
  | { kind: "algebra"; state: AlgebraState }
  | { kind: "number-line"; state: NumberLineState }
  | { kind: "balance"; state: BalanceState }
  | { kind: "graphs"; state: GraphState };
export function lineTask(task: NumberLineDescriptor): NumberLineTask {
  return {
    origin: rational(task.origin.numerator, task.origin.denominator),
    delta: rational(task.delta.numerator, task.delta.denominator),
    orientation: task.orientation,
  };
}
export const exactText = (value: Rational) =>
  value.denominator === 1n
    ? String(value.numerator)
    : `${value.numerator}/${value.denominator}`;
export function linearText(value: LinearExpression): string {
  const x =
    value.x.numerator === 0n
      ? ""
      : value.x.numerator === value.x.denominator
        ? "x"
        : value.x.numerator === -value.x.denominator
          ? "−x"
          : `${exactText(value.x)}x`;
  const c = value.constant;
  return (
    x
      ? `${x}${c.numerator === 0n ? "" : ` ${c.numerator < 0n ? "−" : "+"} ${exactText(rational(c.numerator < 0n ? -c.numerator : c.numerator, c.denominator))}`}`
      : exactText(c)
  ).replaceAll("-", "−");
}
export function rootText(root: ExactRoot) {
  if (root.kind === "rational")
    return exactText(root.value).replaceAll("-", "−");
  const scale =
    root.scale.numerator < 0n
      ? rational(-root.scale.numerator, root.scale.denominator)
      : root.scale;
  const radical = `${scale.numerator === scale.denominator ? "" : exactText(scale)}√${root.radicand}`;
  return `${root.offset.numerator ? `${exactText(root.offset)} ${root.scale.numerator < 0n ? "−" : "+"} ` : root.scale.numerator < 0n ? "−" : ""}${radical}`.replaceAll(
    "-",
    "−",
  );
}
export function graphModelText(model: GraphModel): string {
  const term = (x: number, c: number) =>
    linearText({ kind: "linear", x: rational(x), constant: rational(c) });
  switch (model.mode) {
    case "linear":
      return model.lines
        .map(
          (l, i) =>
            `${model.lines.length === 2 ? `${i === 0 ? "A" : "B"}: ` : ""}y = ${term(l.m, l.b)}`,
        )
        .join(" · ");
    case "inequalities":
      return model.constraints
        .map(
          (q) =>
            `${q.a}x ${q.b < 0 ? "−" : "+"} ${Math.abs(q.b)}y ${{ le: "≤", lt: "<", ge: "≥", gt: ">" }[q.operator]} ${q.c}`,
        )
        .join("; ")
        .replaceAll("-", "−");
    case "quadratic":
      return `y = ${model.a}x² ${model.b < 0 ? "−" : "+"} ${Math.abs(model.b)}x ${model.c < 0 ? "−" : "+"} ${Math.abs(model.c)}`.replaceAll(
        "-",
        "−",
      );
    case "exponential":
      return `y = ${exactText(rational(model.scale.numerator, model.scale.denominator))} × (${exactText(rational(model.base.numerator, model.base.denominator))})^(x ${model.shift < 0 ? "−" : "+"} ${Math.abs(model.shift)}) · Pembanding y = ${term(model.comparison.m, model.comparison.b)}`;
  }
}
export function emptyModel(task: ToolTask): ToolModel {
  switch (task.kind) {
    case "graphs":
      return { kind: task.kind, state: initialGraphs(task) };
    case "fractions":
      return { kind: task.kind, state: initialFractions(task) };
    case "ratio":
      return { kind: task.kind, state: initialRatio(task) };
    case "algebra":
      return { kind: task.kind, state: initialAlgebra() };
    case "number-line":
      return { kind: task.kind, state: initialNumberLine(lineTask(task)) };
    case "balance":
      return { kind: task.kind, state: initialBalance(task) };
  }
}
// This is a different worked example, never a hidden answer key for the target.
export function twinTask(task: ToolTask): ToolTask {
  switch (task.kind) {
    case "graphs":
      return twinGraph(task);
    case "balance":
      return {
        kind: "balance",
        left: {
          x: task.left.x === 2 ? 3 : 2,
          constant: task.left.constant === 4 ? 3 : 4,
        },
        right: { x: 0, constant: task.right.constant === 10 ? 15 : 10 },
      };
    case "fractions":
      return {
        kind: task.kind,
        operation: task.operation,
        left: { numerator: task.left.numerator === 1 ? 2 : 1, denominator: 4 },
        right: { numerator: 1, denominator: 4 },
      };
    case "ratio":
      return {
        kind: task.kind,
        baseX: task.baseX === 3 ? 4 : 3,
        baseY: task.baseY === 5 ? 6 : 5,
        targetX: (task.baseX === 3 ? 4 : 3) * 2,
      };
    case "algebra":
      return {
        kind: task.kind,
        groups: task.groups === 2 ? 3 : 2,
        xPerGroup: 1,
        constantPerGroup: task.constantPerGroup === 2 ? 3 : 2,
      };
    case "number-line":
      return {
        kind: task.kind,
        origin: {
          numerator: task.origin.numerator === -1 ? -2 : -1,
          denominator: 1,
        },
        delta: {
          numerator: task.delta.numerator === -2 ? -3 : -2,
          denominator: 1,
        },
        orientation: task.orientation,
      };
  }
}
// Frames are produced by the same reducers as student actions; no animation math.
export function exampleFrames(task: ToolTask): ToolModel[] {
  if (task.kind === "graphs")
    return exampleGraphs(task).map((state) => ({ kind: "graphs", state }));
  const frames: ToolModel[] = [emptyModel(task)];
  if (task.kind === "fractions") {
    let state = initialFractions(task);
    const paint = (bar: 0 | 1 | 2, count: number, sign: number) => {
      if (sign < 0) state = reduceFractions(state, { type: "sign", bar }, task);
      for (let i = 0; i < count; i++)
        state = reduceFractions(state, { type: "paint", bar, cell: i }, task);
    };
    paint(0, Math.abs(task.left.numerator), task.left.numerator);
    frames.push({ kind: task.kind, state });
    if (task.operation === "add") {
      paint(1, Math.abs(task.right.numerator), task.right.numerator);
      state = reduceFractions(state, { type: "equalize" }, task);
      frames.push({ kind: task.kind, state });
      const sum = addRational(barValue(state.bars[0]), barValue(state.bars[1]));
      paint(
        2,
        Number(
          ((sum.numerator < 0n ? -sum.numerator : sum.numerator) *
            BigInt(state.bars[2].parts)) /
            sum.denominator,
        ),
        Number(sum.numerator),
      );
    } else if (task.operation === "equivalent") {
      const value = barValue(state.bars[0]);
      const parts = Array.from({ length: 11 }, (_, i) => i + 2).find(
        (n) =>
          n !== state.bars[0].parts &&
          (value.numerator * BigInt(n)) % value.denominator === 0n,
      );
      if (!parts) throw new RangeError("No different supported partition");
      state = reduceFractions(
        state,
        { type: "partition", bar: 1, parts },
        task,
      );
      paint(
        1,
        Number(
          ((value.numerator < 0n ? -value.numerator : value.numerator) *
            BigInt(parts)) /
            value.denominator,
        ),
        Number(value.numerator),
      );
    }
    frames.push({ kind: task.kind, state });
  } else if (task.kind === "ratio") {
    const state = reduceRatio(
      initialRatio(task),
      { type: "scale", multiplier: rational(task.targetX, task.baseX) },
      task,
    );
    frames.push({ kind: task.kind, state });
  } else if (task.kind === "algebra") {
    let state = initialAlgebra();
    for (let group = 0; group < task.groups; group++) {
      const groupId = `example-group-${group}`;
      state = reduceAlgebra(state, { type: "group", id: groupId });
      for (const kind of ["x", "unit"] as const) {
        const count = kind === "x" ? task.xPerGroup : task.constantPerGroup;
        for (let i = 0; i < Math.abs(count); i++)
          state = reduceAlgebra(state, {
            type: "add",
            groupId,
            tile: {
              id: `${groupId}-${kind}-${i}`,
              kind,
              sign: count < 0 ? -1 : 1,
            },
          });
      }
      frames.push({ kind: task.kind, state });
    }
  } else if (task.kind === "number-line") {
    const t = lineTask(task);
    let state = initialNumberLine(t);
    const half = rational(t.delta.numerator, t.delta.denominator * 2n);
    for (let i = 0; i < 2; i++) {
      state = reduceNumberLine(state, { type: "jump", amount: half }, t);
      frames.push({ kind: task.kind, state });
    }
  } else if (task.kind === "balance") {
    return exampleBalance(task).map((state) => ({ kind: "balance", state }));
  }
  return frames;
}
export function mistakenModel(task: ToolTask): ToolModel {
  if (task.kind === "graphs")
    return { kind: task.kind, state: mistakenGraphs(task) };
  if (task.kind === "balance")
    return { kind: "balance", state: mistakenBalance(task) };
  const model = exampleFrames(task).at(-1)!;
  if (model.kind === "fractions" && task.kind === "fractions") {
    if (task.operation === "add") {
      const wrong = rational(
        task.left.numerator + task.right.numerator,
        task.left.denominator + task.right.denominator,
      );
      const parts = Number(wrong.denominator === 1n ? 2n : wrong.denominator);
      if (parts <= 12) {
        let state = initialFractions(task);
        for (const bar of [0, 1] as const) {
          const value = bar === 0 ? task.left : task.right;
          if (value.numerator < 0)
            state = reduceFractions(state, { type: "sign", bar }, task);
          for (let i = 0; i < Math.abs(value.numerator); i++)
            state = reduceFractions(
              state,
              { type: "paint", bar, cell: i },
              task,
            );
        }
        state = reduceFractions(
          state,
          { type: "partition", bar: 2, parts },
          task,
        );
        if (wrong.numerator < 0n)
          state = reduceFractions(state, { type: "sign", bar: 2 }, task);
        const count = Number(
          ((wrong.numerator < 0n ? -wrong.numerator : wrong.numerator) *
            BigInt(parts)) /
            wrong.denominator,
        );
        for (let i = 0; i < count; i++)
          state = reduceFractions(
            state,
            { type: "paint", bar: 2, cell: i },
            task,
          );
        if (!checkFractions(state, task).modelMatches)
          return { kind: task.kind, state: { bars: state.bars, history: [] } };
      }
    }
    const bar =
      task.operation === "represent"
        ? 0
        : task.operation === "equivalent"
          ? 1
          : 2;
    return {
      kind: model.kind,
      state: {
        ...reduceFractions(model.state, { type: "paint", bar, cell: 0 }, task),
        history: [],
      },
    };
  }
  if (model.kind === "ratio" && task.kind === "ratio") {
    const additive = rational(
      Math.max(0, task.baseY + task.targetX - task.baseX),
    );
    const wrong =
      compareRational(additive, model.state.columns[1].y) === 0
        ? addRational(additive, rational(1))
        : additive;
    return {
      kind: model.kind,
      state: {
        ...reduceRatio(
          model.state,
          {
            type: "cell",
            column: 1,
            axis: "y",
            value: wrong,
          },
          task,
        ),
        history: [],
      },
    };
  }
  if (
    model.kind === "algebra" &&
    task.kind === "algebra" &&
    task.groups > 1 &&
    task.constantPerGroup !== 0
  )
    return {
      kind: task.kind,
      state: {
        groups: model.state.groups.map((g, i) => ({
          id: g.id,
          tiles: i === 0 ? g.tiles : g.tiles.filter((t) => t.kind === "x"),
        })),
        history: [],
      },
    };
  if (model.kind === "algebra")
    return {
      kind: model.kind,
      state: {
        ...reduceAlgebra(model.state, {
          type: "add",
          groupId: model.state.groups[0].id,
          tile: { id: "nala-extra-unit", kind: "unit", sign: 1 },
        }),
        history: [],
      },
    };
  if (model.kind === "number-line" && task.kind === "number-line") {
    const t = lineTask(task);
    return {
      kind: model.kind,
      state: reduceNumberLine(
        initialNumberLine(t),
        {
          type: "jump",
          amount: rational(-t.delta.numerator, t.delta.denominator),
        },
        t,
      ),
    };
  }
  throw new Error("Tool/model mismatch");
}
export function checkModel(task: ToolTask, model: ToolModel): boolean {
  if (task.kind === "graphs" && model.kind === "graphs")
    return checkGraphs(model.state, task).modelMatches;
  if (task.kind === "balance" && model.kind === "balance")
    return checkBalance(model.state, task).modelMatches;
  if (task.kind === "fractions" && model.kind === "fractions")
    return checkFractions(model.state, task).modelMatches;
  if (task.kind === "ratio" && model.kind === "ratio")
    return checkRatio(model.state, task).modelMatches;
  if (task.kind === "algebra" && model.kind === "algebra")
    return checkAlgebra(model.state, task).modelMatches;
  if (task.kind === "number-line" && model.kind === "number-line")
    return checkNumberLine(model.state, lineTask(task)).modelMatches;
  return false;
}
export function modelResult(model: ToolModel): string {
  switch (model.kind) {
    case "graphs": {
      const f = model.state.frame;
      if (f.model.mode === "quadratic")
        return f.rootsShown
          ? quadraticRoots(f.model).map(rootText).join(" dan ") ||
              "tidak ada akar real"
          : "akar belum ditandai";
      if (f.relationship === "parallel") return "garis sejajar";
      if (f.relationship === "coincident") return "garis berimpit";
      return `(${exactText(f.point.x)}, ${exactText(f.point.y)})`;
    }
    case "balance":
      return `${linearText(model.state.frame.left)} = ${linearText(model.state.frame.right)}`;
    case "fractions":
      return model.state.bars.map((b) => exactText(barValue(b))).join(" · ");
    case "ratio": {
      const c = model.state.columns.at(-1)!;
      return `${exactText(c.x)} : ${exactText(c.y)}`;
    }
    case "algebra": {
      const c = coefficients(model.state.groups.flatMap((g) => g.tiles));
      return `${c.x}x ${c.constant < 0 ? "−" : "+"} ${Math.abs(c.constant)}`;
    }
    case "number-line":
      return exactText(model.state.current);
  }
}
export function openPrompt(task: ToolTask) {
  switch (task.kind) {
    case "graphs":
      return task.mode === "quadratic"
        ? "Temukan parabola berbeda dengan akar yang sama. Ubah koefisien, lalu tandai akarnya."
        : task.mode === "inequalities"
          ? "Temukan titik-titik berbeda di dalam irisan semua pertidaksamaan."
          : "Temukan titik-titik berbeda pada kurva pertama. Pertahankan model sesuai persamaannya.";
    case "balance":
      return "Temukan urutan operasi berbeda yang menyisakan satu x. Setiap operasi berlaku pada kedua ruas.";
    case "fractions":
      return "Temukan dua pecahan positif yang jumlahnya 1. Tunjukkan keduanya dan gabungannya.";
    case "ratio":
      return `Temukan pasangan lain yang sebanding dengan ${task.baseX} : ${task.baseY}.`;
    case "algebra":
      return "Temukan susunan kelompok berbeda yang menghasilkan jumlah ubin x dan satuan yang sama dengan soal.";
    case "number-line":
      return "Temukan urutan lompatan berbeda menuju tujuan yang sama. Pertahankan arah yang diminta.";
  }
}
// Canonical, numeric only; this wall stays in RAM and clears with the task epoch.
export function openAnswer(task: ToolTask, model: ToolModel): string | null {
  if (task.kind === "graphs" && model.kind === "graphs") {
    const f = model.state.frame;
    if (!model.state.history.length) return null;
    if (task.mode === "quadratic" && f.model.mode === "quadratic")
      return f.rootsShown &&
        f.model.a * task.b === task.a * f.model.b &&
        f.model.a * task.c === task.a * f.model.c
        ? graphModelText(f.model)
        : null;
    return modelsMatch(f.model, task) &&
      f.placed &&
      withinDomain(f.point, task.domain) &&
      pointOnModel(f.model, f.point) &&
      (task.mode !== "inequalities" || f.shaded)
      ? `(${exactText(f.point.x)}, ${exactText(f.point.y)})`
      : null;
  }
  if (
    task.kind === "balance" &&
    model.kind === "balance" &&
    checkModel(task, model)
  )
    return [...model.state.history, model.state.frame]
      .flatMap((frame) => {
        const op = frame.operation;
        return op
          ? [
              `${op.kind === "add" ? "+" : op.kind === "divide" ? "÷" : "×"}${exactText(op.value)}${op.kind === "add" && op.term === "x" ? "x" : ""}`,
            ]
          : [];
      })
      .join(" → ");
  if (task.kind === "fractions" && model.kind === "fractions") {
    const [a, b, c] = model.state.bars.map(barValue);
    if (
      a.numerator <= 0n ||
      b.numerator <= 0n ||
      compareRational(addRational(a, b), rational(1)) !== 0 ||
      compareRational(c, rational(1)) !== 0 ||
      !model.state.bars.every((bar) => bar.parts === model.state.bars[0].parts)
    )
      return null;
    return [exactText(a), exactText(b)].sort().join(" + ");
  }
  if (task.kind === "ratio" && model.kind === "ratio") {
    const last = model.state.columns.at(-1)!;
    if (
      model.state.columns.length < 2 ||
      last.multiplier.numerator <= 0n ||
      checkRatio(model.state, task).mismatchedColumns.length
    )
      return null;
    return `${exactText(last.x)} : ${exactText(last.y)}`;
  }
  if (task.kind === "algebra" && model.kind === "algebra") {
    const total = coefficients(model.state.groups.flatMap((g) => g.tiles));
    if (
      !model.state.groups.length ||
      model.state.groups.some((g) => !g.tiles.length) ||
      total.x !== task.groups * task.xPerGroup ||
      total.constant !== task.groups * task.constantPerGroup
    )
      return null;
    return model.state.groups
      .map((g) => {
        const c = coefficients(g.tiles);
        return `${c.x}x + ${c.constant}`;
      })
      .sort()
      .join(" | ");
  }
  if (
    task.kind === "number-line" &&
    model.kind === "number-line" &&
    checkModel(task, model)
  )
    return model.state.jumps
      .map((j) => exactText(subtractRational(j.to, j.from)))
      .join(" → ");
  return null;
}
export function patternTask(task: ToolTask, pattern: Pattern): ToolTask {
  return pattern === "open" && task.kind === "fractions"
    ? {
        kind: "fractions",
        operation: "add",
        left: { numerator: 1, denominator: 2 },
        right: { numerator: 1, denominator: 2 },
      }
    : task;
}
export function hints(task: ToolTask): readonly [string, string] {
  switch (task.kind) {
    case "graphs":
      return [
        "Apa yang diwakili koefisien dan titik pada model ini?",
        "Bandingkan persamaan, tabel nilai dan letak titik; periksa setiap batas daerah, bukan satu saja.",
      ];
    case "balance":
      return [
        "Operasi apa yang membuat satu x tersisa?",
        "Lakukan operasi yang sama pada seluruh isi kedua ruas; periksa tanda dan pembaginya.",
      ];
    case "fractions":
      return [
        "Apakah ukuran satu utuh dan bagian-bagiannya sama?",
        "Bandingkan pembagian serta bagian berwarna pada setiap batang.",
      ];
    case "ratio":
      return [
        "Operasi apa yang harus sama di kedua baris?",
        "Perhatikan pengali di atas kolom serta nilai A dan B di bawahnya.",
      ];
    case "algebra":
      return [
        "Apa isi setiap kelompok yang diminta?",
        "Bandingkan banyak kelompok, ubin x dan ubin satuan; periksa tandanya.",
      ];
    case "number-line":
      return [
        "Dari mana mulai, dan ke arah mana bergerak?",
        "Perhatikan titik awal serta arah tiap lompatan, bukan titik akhir saja.",
      ];
  }
}
