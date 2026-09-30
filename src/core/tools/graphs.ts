import {
  rational,
  addRational as add,
  subtractRational as sub,
  multiplyRational as mul,
  divideRational as div,
  compareRational as cmp,
  type Rational,
} from "../math/rational";

export type ExactInput = Readonly<{ numerator: number; denominator: number }>;
export type GraphDomain = Readonly<{
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}>;
export type Point = Readonly<{ x: Rational; y: Rational }>;
export type Line = Readonly<{ m: number; b: number }>;
export type Inequality = Readonly<{
  a: number;
  b: number;
  c: number;
  operator: "le" | "lt" | "ge" | "gt";
}>;
export type GraphModel =
  | Readonly<{ mode: "linear"; lines: readonly Line[] }>
  | Readonly<{ mode: "inequalities"; constraints: readonly Inequality[] }>
  | Readonly<{ mode: "quadratic"; a: number; b: number; c: number }>
  | Readonly<{
      mode: "exponential";
      base: ExactInput;
      scale: ExactInput;
      shift: number;
      comparison: Line;
    }>;
type BaseTask = Readonly<{ kind: "graphs"; domain: GraphDomain }>;
export type GraphTask = BaseTask &
  (
    | {
        mode: "linear";
        lines: readonly Line[];
        goal: { type: "value"; x: number } | { type: "intersection" };
      }
    | { mode: "inequalities"; constraints: readonly Inequality[] }
    | { mode: "quadratic"; a: number; b: number; c: number }
    | {
        mode: "exponential";
        base: ExactInput;
        scale: ExactInput;
        shift: number;
        comparison: Line;
        goal: { type: "value"; x: number } | { type: "target"; y: ExactInput };
      }
  );
export type GraphFrame = Readonly<{
  model: GraphModel;
  point: Point;
  placed: boolean;
  shaded: boolean;
  rootsShown: boolean;
  relationship: "unset" | "unique" | "parallel" | "coincident";
}>;
export type GraphState = Readonly<{
  frame: GraphFrame;
  history: readonly GraphFrame[];
}>;
export type GraphAction =
  | {
      type: "coefficient";
      curve: 0 | 1 | 2 | 3;
      key: "m" | "b" | "a" | "c" | "base" | "scale" | "shift";
      value: number;
    }
  | { type: "inequality"; index: number; operator: Inequality["operator"] }
  | { type: "point"; point: Point }
  | { type: "relationship"; value: "unique" | "parallel" | "coincident" }
  | { type: "shade" }
  | { type: "roots" }
  | { type: "undo" }
  | { type: "reset" };
export type ExactRoot =
  | { kind: "rational"; value: Rational }
  | { kind: "radical"; offset: Rational; scale: Rational; radicand: number };
const one = rational(1);
export const exact = (v: ExactInput) => rational(v.numerator, v.denominator);
const integer = (n: number, min: number, max: number) =>
  Number.isSafeInteger(n) && n >= min && n <= max;
export function validateDomain(d: GraphDomain) {
  if (
    !integer(d.minX, -16, 15) ||
    !integer(d.maxX, -15, 16) ||
    d.minX >= d.maxX ||
    !integer(d.minY, -1000000, 999999) ||
    !integer(d.maxY, -999999, 1000000) ||
    d.minY >= d.maxY
  )
    throw new RangeError("Graph domain bounds");
  return d;
}
function validateLine(l: Line) {
  if (!integer(l.m, -12, 12) || !integer(l.b, -100, 100))
    throw new RangeError("Line coefficients");
}
export function validateGraphModel(m: GraphModel) {
  switch (m.mode) {
    case "linear":
      if (m.lines.length < 1 || m.lines.length > 2)
        throw new RangeError("Line count");
      m.lines.forEach(validateLine);
      break;
    case "inequalities":
      if (
        m.constraints.length < 2 ||
        m.constraints.length > 4 ||
        m.constraints.some(
          (q) =>
            !integer(q.a, -12, 12) ||
            !integer(q.b, -12, 12) ||
            !(q.a || q.b) ||
            !integer(q.c, -100, 100) ||
            !["le", "lt", "ge", "gt"].includes(q.operator),
        )
      )
        throw new RangeError("Inequality bounds");
      break;
    case "quadratic":
      if (
        !integer(m.a, -12, 12) ||
        !m.a ||
        !integer(m.b, -40, 40) ||
        !integer(m.c, -200, 200)
      )
        throw new RangeError("Quadratic bounds");
      break;
    case "exponential": {
      for (const v of [m.base, m.scale])
        if (
          !integer(v.numerator, 1, 10000) ||
          !integer(v.denominator, 1, 10000)
        )
          throw new RangeError("Positive exact coefficient required");
      const base = exact(m.base);
      if (
        cmp(base, rational(1, 10)) < 0 ||
        cmp(base, rational(10)) > 0 ||
        cmp(base, one) === 0 ||
        !integer(m.shift, -6, 6)
      )
        throw new RangeError("Exponential bounds");
      validateLine(m.comparison);
      break;
    }
    default:
      throw new RangeError("Unknown graph mode");
  }
  return m;
}
export function modelForTask(t: GraphTask): GraphModel {
  switch (t.mode) {
    case "linear":
      return { mode: t.mode, lines: t.lines.map((l) => ({ m: l.m, b: l.b })) };
    case "inequalities":
      return {
        mode: t.mode,
        constraints: t.constraints.map((q) => ({
          a: q.a,
          b: q.b,
          c: q.c,
          operator: q.operator,
        })),
      };
    case "quadratic":
      return { mode: t.mode, a: t.a, b: t.b, c: t.c };
    case "exponential":
      return {
        mode: t.mode,
        base: { numerator: t.base.numerator, denominator: t.base.denominator },
        scale: {
          numerator: t.scale.numerator,
          denominator: t.scale.denominator,
        },
        shift: t.shift,
        comparison: { m: t.comparison.m, b: t.comparison.b },
      };
  }
}
export function withinDomain(p: Point, domain: GraphDomain) {
  return (
    cmp(p.x, rational(domain.minX)) >= 0 &&
    cmp(p.x, rational(domain.maxX)) <= 0 &&
    cmp(p.y, rational(domain.minY)) >= 0 &&
    cmp(p.y, rational(domain.maxY)) <= 0
  );
}
export function lineAt(l: Line, x: Rational) {
  return add(mul(rational(l.m), x), rational(l.b));
}
export function intersection(
  a: Line,
  b: Line,
): Point | "parallel" | "coincident" {
  if (a.m === b.m) return a.b === b.b ? "coincident" : "parallel";
  const x = rational(b.b - a.b, a.m - b.m);
  return { x, y: lineAt(a, x) };
}
export function satisfies(q: Inequality, point: Point, inclusive = false) {
  const order = cmp(
    add(mul(rational(q.a), point.x), mul(rational(q.b), point.y)),
    rational(q.c),
  );
  return q.operator === "le"
    ? order <= 0
    : q.operator === "ge"
      ? order >= 0
      : q.operator === "lt"
        ? order < 0 || (inclusive && order === 0)
        : order > 0 || (inclusive && order === 0);
}
/** Exact clipping to the viewport; strict edges are rendered dashed and excluded by satisfies. */
export function feasiblePolygon(
  constraints: readonly Inequality[],
  domain: GraphDomain,
): readonly Point[] {
  validateDomain(domain);
  let polygon: Point[] = [
    [domain.minX, domain.minY],
    [domain.maxX, domain.minY],
    [domain.maxX, domain.maxY],
    [domain.minX, domain.maxY],
  ].map(([x, y]) => ({ x: rational(x), y: rational(y) }));
  for (const q of constraints) {
    const next: Point[] = [];
    const signed = (p: Point) =>
      sub(add(mul(rational(q.a), p.x), mul(rational(q.b), p.y)), rational(q.c));
    for (let i = 0; i < polygon.length; i++) {
      const current = polygon[i],
        previous = polygon[(i + polygon.length - 1) % polygon.length];
      const inside = satisfies(q, current, true),
        wasInside = satisfies(q, previous, true);
      if (inside !== wasInside) {
        const before = signed(previous),
          factor = div(before, sub(before, signed(current)));
        next.push({
          x: add(previous.x, mul(factor, sub(current.x, previous.x))),
          y: add(previous.y, mul(factor, sub(current.y, previous.y))),
        });
      }
      if (inside) next.push(current);
    }
    polygon = next;
  }
  return polygon;
}
export function quadraticAt(
  q: Extract<GraphModel, { mode: "quadratic" }>,
  x: Rational,
) {
  return add(
    add(mul(rational(q.a), mul(x, x)), mul(rational(q.b), x)),
    rational(q.c),
  );
}
export function quadraticRoots(
  q: Extract<GraphModel, { mode: "quadratic" }>,
): readonly ExactRoot[] {
  validateGraphModel(q);
  const d = q.b * q.b - 4 * q.a * q.c;
  if (d < 0) return [];
  if (d === 0) return [{ kind: "rational", value: rational(-q.b, 2 * q.a) }];
  let outside = 1,
    inside = d;
  for (let factor = 2; factor * factor <= inside; factor++)
    while (inside % (factor * factor) === 0) {
      outside *= factor;
      inside /= factor * factor;
    }
  const offset = rational(-q.b, 2 * q.a),
    scale = rational(outside, Math.abs(2 * q.a));
  if (inside === 1)
    return [
      { kind: "rational", value: sub(offset, scale) },
      { kind: "rational", value: add(offset, scale) },
    ];
  return [
    {
      kind: "radical",
      offset,
      scale: mul(rational(-1), scale),
      radicand: inside,
    },
    { kind: "radical", offset, scale, radicand: inside },
  ];
}
export function exponentialAt(
  e: Extract<GraphModel, { mode: "exponential" }>,
  x: Rational,
): Rational {
  if (x.denominator !== 1n || x.numerator < -16n || x.numerator > 16n)
    throw new RangeError("Exact exponential uses integer x within domain");
  const power = x.numerator + BigInt(e.shift),
    base = exact(e.base),
    count = power < 0n ? -power : power;
  if (count > 22n) throw new RangeError("Exponent bounds");
  const value = rational(base.numerator ** count, base.denominator ** count);
  return mul(exact(e.scale), power < 0n ? div(one, value) : value);
}
export function validateGraphTask(t: GraphTask) {
  if (t.kind !== "graphs") throw new RangeError("Graph kind");
  validateDomain(t.domain);
  validateGraphModel(modelForTask(t));
  if (t.mode === "inequalities" && !feasiblePoint(t.constraints, t.domain))
    throw new RangeError("Task requires a feasible point within the domain");
  if (t.mode === "linear") {
    if (t.goal.type === "intersection") {
      if (t.lines.length !== 2) throw new RangeError("Two lines required");
      const hit = intersection(t.lines[0], t.lines[1]);
      if (typeof hit !== "string" && !withinDomain(hit, t.domain))
        throw new RangeError("Intersection outside domain");
    } else if (
      !integer(t.goal.x, t.domain.minX, t.domain.maxX) ||
      !withinDomain(
        { x: rational(t.goal.x), y: lineAt(t.lines[0], rational(t.goal.x)) },
        t.domain,
      )
    )
      throw new RangeError("Probe outside domain");
  }
  if (t.mode === "exponential") {
    if (t.goal.type === "value") {
      if (
        !integer(t.goal.x, t.domain.minX, t.domain.maxX) ||
        !withinDomain(
          { x: rational(t.goal.x), y: exponentialAt(t, rational(t.goal.x)) },
          t.domain,
        )
      )
        throw new RangeError("Probe outside domain");
    } else {
      if (
        !integer(t.goal.y.numerator, 1, 1000000) ||
        !integer(t.goal.y.denominator, 1, 1000000)
      )
        throw new RangeError("Target bounds");
      const target = exact(t.goal.y);
      if (
        !Array.from(
          { length: t.domain.maxX - t.domain.minX + 1 },
          (_, i) => i + t.domain.minX,
        ).some(
          (x) =>
            cmp(exponentialAt(t, rational(x)), target) === 0 &&
            withinDomain({ x: rational(x), y: target }, t.domain),
        )
      )
        throw new RangeError("No integer exponent in supported domain");
    }
  }
  return t;
}
export function initialGraphs(task: GraphTask): GraphState {
  validateGraphTask(task);
  let model = modelForTask(task);
  if (model.mode === "linear")
    model = {
      mode: model.mode,
      lines: model.lines.map((l) => ({
        m: l.m === 0 && l.b === 0 ? 1 : 0,
        b: 0,
      })),
    };
  else if (model.mode === "quadratic")
    model = {
      mode: model.mode,
      a: 1,
      b: 0,
      c: model.a === 1 && model.b === 0 && model.c === 0 ? 1 : 0,
    };
  else if (model.mode === "exponential")
    model = { ...model, shift: model.shift === 0 ? 1 : 0 };
  else
    model = {
      mode: model.mode,
      constraints: model.constraints.map((q) => ({
        ...q,
        operator:
          q.operator === "le"
            ? "ge"
            : q.operator === "ge"
              ? "le"
              : q.operator === "lt"
                ? "gt"
                : "lt",
      })),
    };
  return {
    frame: {
      model,
      point: {
        x: rational(Math.max(task.domain.minX, Math.min(task.domain.maxX, 0))),
        y: rational(Math.max(task.domain.minY, Math.min(task.domain.maxY, 0))),
      },
      placed: false,
      shaded: false,
      rootsShown: false,
      relationship: "unset",
    },
    history: [],
  };
}
function coefficient(
  model: GraphModel,
  action: Extract<GraphAction, { type: "coefficient" }>,
): GraphModel {
  const { key, value, curve } = action;
  if (!Number.isSafeInteger(value)) throw new RangeError("Integer coefficient");
  if (
    model.mode === "linear" &&
    (key === "m" || key === "b") &&
    curve < model.lines.length
  )
    return {
      mode: model.mode,
      lines: model.lines.map((l, i) =>
        i === curve ? { ...l, [key]: value } : l,
      ),
    };
  if (model.mode === "quadratic" && ["a", "b", "c"].includes(key))
    return { ...model, [key]: value };
  if (
    model.mode === "inequalities" &&
    ["a", "b", "c"].includes(key) &&
    curve < model.constraints.length
  )
    return {
      mode: model.mode,
      constraints: model.constraints.map((q, i) =>
        i === curve ? { ...q, [key]: value } : q,
      ),
    };
  if (model.mode === "exponential") {
    if (key === "base" || key === "scale")
      return {
        ...model,
        [key]: { numerator: value, denominator: model[key].denominator },
      };
    if (key === "shift") return { ...model, shift: value };
    if (key === "m" || key === "b")
      return { ...model, comparison: { ...model.comparison, [key]: value } };
  }
  throw new RangeError("Coefficient not available");
}
export function reduceGraphs(
  state: GraphState,
  action: GraphAction,
  task: GraphTask,
): GraphState {
  if (action.type === "reset") return initialGraphs(task);
  if (action.type === "undo")
    return state.history.length
      ? { frame: state.history.at(-1)!, history: state.history.slice(0, -1) }
      : state;
  if (state.history.length >= 100)
    throw new RangeError("Undo or reset before more actions");
  let frame: GraphFrame = state.frame;
  if (action.type === "coefficient") {
    const model = coefficient(frame.model, action);
    validateGraphModel(model);
    if (JSON.stringify(model) === JSON.stringify(frame.model)) return state;
    frame = { ...frame, model, rootsShown: false, relationship: "unset" };
  } else if (
    action.type === "inequality" &&
    frame.model.mode === "inequalities"
  ) {
    if (
      !integer(action.index, 0, frame.model.constraints.length - 1) ||
      !["le", "lt", "ge", "gt"].includes(action.operator)
    )
      throw new RangeError("Inequality selection");
    if (frame.model.constraints[action.index].operator === action.operator)
      return state;
    frame = {
      ...frame,
      model: {
        mode: "inequalities",
        constraints: frame.model.constraints.map((q, i) =>
          i === action.index ? { ...q, operator: action.operator } : q,
        ),
      },
    };
  } else if (action.type === "point") {
    const p = action.point;
    if (
      p.x.denominator > 1000000n ||
      p.y.denominator > 10n ** 96n ||
      !withinDomain(p, task.domain)
    )
      throw new RangeError("Point outside domain");
    if (frame.model.mode === "exponential" && p.x.denominator !== 1n)
      throw new RangeError("Integer x required for exact power");
    if (
      frame.placed &&
      cmp(p.x, frame.point.x) === 0 &&
      cmp(p.y, frame.point.y) === 0
    )
      return state;
    frame = {
      ...frame,
      point: {
        x: rational(p.x.numerator, p.x.denominator),
        y: rational(p.y.numerator, p.y.denominator),
      },
      placed: true,
    };
  } else if (
    action.type === "relationship" &&
    frame.model.mode === "linear" &&
    frame.model.lines.length === 2 &&
    ["unique", "parallel", "coincident"].includes(action.value)
  )
    frame = { ...frame, relationship: action.value };
  else if (action.type === "shade" && frame.model.mode === "inequalities")
    frame = { ...frame, shaded: !frame.shaded };
  else if (action.type === "roots" && frame.model.mode === "quadratic")
    frame = { ...frame, rootsShown: !frame.rootsShown };
  else throw new RangeError("Graph action not available");
  return { frame, history: [...state.history, state.frame] };
}
export function modelsMatch(model: GraphModel, task: GraphTask) {
  if (model.mode === "exponential" && task.mode === "exponential")
    return (
      cmp(exact(model.base), exact(task.base)) === 0 &&
      cmp(exact(model.scale), exact(task.scale)) === 0 &&
      model.shift === task.shift &&
      model.comparison.m === task.comparison.m &&
      model.comparison.b === task.comparison.b
    );
  if (model.mode === "quadratic" && task.mode === "quadratic")
    return model.a === task.a && model.b === task.b && model.c === task.c;
  if (model.mode === "linear" && task.mode === "linear")
    return (
      model.lines.length === task.lines.length &&
      model.lines.every(
        (line, i) => line.m === task.lines[i].m && line.b === task.lines[i].b,
      )
    );
  if (model.mode === "inequalities" && task.mode === "inequalities")
    return (
      model.constraints.length === task.constraints.length &&
      model.constraints.every(
        (q, i) =>
          q.a === task.constraints[i].a &&
          q.b === task.constraints[i].b &&
          q.c === task.constraints[i].c &&
          q.operator === task.constraints[i].operator,
      )
    );
  return false;
}
export function pointOnModel(model: GraphModel, point: Point) {
  if (model.mode === "linear")
    return cmp(lineAt(model.lines[0], point.x), point.y) === 0;
  if (model.mode === "quadratic")
    return cmp(quadraticAt(model, point.x), point.y) === 0;
  if (model.mode === "inequalities")
    return model.constraints.every((q) => satisfies(q, point));
  try {
    return cmp(exponentialAt(model, point.x), point.y) === 0;
  } catch {
    return false;
  }
}
export function checkGraphs(state: GraphState, task: GraphTask) {
  const f = state.frame,
    matches = modelsMatch(f.model, task);
  let pointMatches = false;
  if (f.model.mode === "quadratic" && task.mode === "quadratic")
    pointMatches = f.rootsShown;
  else if (
    f.placed &&
    withinDomain(f.point, task.domain) &&
    pointOnModel(f.model, f.point)
  ) {
    if (task.mode === "linear")
      pointMatches =
        task.goal.type === "value"
          ? cmp(f.point.x, rational(task.goal.x)) === 0
          : task.lines.length === 2 &&
            cmp(lineAt(task.lines[1], f.point.x), f.point.y) === 0;
    else if (task.mode === "inequalities") pointMatches = f.shaded;
    else if (task.mode === "exponential")
      pointMatches =
        task.goal.type === "value"
          ? cmp(f.point.x, rational(task.goal.x)) === 0
          : cmp(f.point.y, exact(task.goal.y)) === 0;
  }
  if (task.mode === "linear" && task.goal.type === "intersection") {
    const hit = intersection(task.lines[0], task.lines[1]);
    pointMatches =
      typeof hit === "string"
        ? f.relationship === hit
        : f.relationship === "unique" && pointMatches;
  }
  return {
    modelMatches: matches && pointMatches && state.history.length > 0,
    coefficientsMatch: matches,
    pointMatches,
  };
}
/** Exact table values, independent of drawing/zoom. Exponential x is integral. */
export function graphValues(
  model: GraphModel,
  x: Rational,
): readonly Rational[] {
  switch (model.mode) {
    case "linear":
      return model.lines.map((l) => lineAt(l, x));
    case "quadratic":
      return [quadraticAt(model, x)];
    case "exponential":
      return [exponentialAt(model, x), lineAt(model.comparison, x)];
    case "inequalities":
      return [];
  }
}
/** Drawing only: never used as an oracle. */
export function drawingValue(
  model: GraphModel,
  x: number,
  curve = 0,
): number | null {
  let y: number;
  if (model.mode === "linear") {
    const line = model.lines[curve];
    if (!line) return null;
    y = line.m * x + line.b;
  } else if (model.mode === "quadratic")
    y = model.a * x * x + model.b * x + model.c;
  else if (model.mode === "exponential")
    y =
      curve === 1
        ? model.comparison.m * x + model.comparison.b
        : (model.scale.numerator / model.scale.denominator) *
          (model.base.numerator / model.base.denominator) ** (x + model.shift);
  else {
    const q = model.constraints[curve];
    if (!q || q.b === 0) return null;
    y = (q.c - q.a * x) / q.b;
  }
  return Number.isFinite(y) ? y : null;
}
export function rootApproximation(root: ExactRoot) {
  return root.kind === "rational"
    ? Number(root.value.numerator) / Number(root.value.denominator)
    : Number(root.offset.numerator) / Number(root.offset.denominator) +
        (Number(root.scale.numerator) / Number(root.scale.denominator)) *
          Math.sqrt(root.radicand);
}
export function feasiblePoint(
  constraints: readonly Inequality[],
  domain: GraphDomain,
): Point | null {
  const polygon = feasiblePolygon(constraints, domain);
  if (!polygon.length) return null;
  const mean: Point = {
    x: div(
      polygon.reduce((sum, p) => add(sum, p.x), rational(0)),
      rational(polygon.length),
    ),
    y: div(
      polygon.reduce((sum, p) => add(sum, p.y), rational(0)),
      rational(polygon.length),
    ),
  };
  return (
    [mean, ...polygon].find((p) => constraints.every((q) => satisfies(q, p))) ??
    null
  );
}
/** Worked frames use the same actions as the UI; the caller supplies a distinct twin. */
export function exampleGraphs(task: GraphTask): GraphState[] {
  let state = initialGraphs(task);
  const frames = [state];
  const act = (action: GraphAction) => {
    const next = reduceGraphs(state, action, task);
    if (next !== state) {
      state = next;
      frames.push(state);
    }
  };
  const coefficient = (
    key: Extract<GraphAction, { type: "coefficient" }>["key"],
    value: number,
    curve: 0 | 1 | 2 | 3 = 0,
  ) => act({ type: "coefficient", key, value, curve });
  if (task.mode === "linear") {
    task.lines.forEach((l, i) => {
      coefficient("m", l.m, i as 0 | 1);
      coefficient("b", l.b, i as 0 | 1);
    });
    if (task.goal.type === "intersection") {
      const point = intersection(task.lines[0], task.lines[1]);
      act({
        type: "relationship",
        value: typeof point === "string" ? point : "unique",
      });
      if (typeof point !== "string") act({ type: "point", point });
    } else
      act({
        type: "point",
        point: {
          x: rational(task.goal.x),
          y: lineAt(task.lines[0], rational(task.goal.x)),
        },
      });
  } else if (task.mode === "inequalities") {
    task.constraints.forEach((q, index) =>
      act({ type: "inequality", index, operator: q.operator }),
    );
    act({ type: "shade" });
    act({
      type: "point",
      point: feasiblePoint(task.constraints, task.domain)!,
    });
  } else if (task.mode === "quadratic") {
    for (const key of ["a", "b", "c"] as const) coefficient(key, task[key]);
    act({ type: "roots" });
  } else {
    coefficient("shift", task.shift);
    const goal = task.goal;
    const x =
      goal.type === "value"
        ? goal.x
        : Array.from(
            { length: task.domain.maxX - task.domain.minX + 1 },
            (_, i) => i + task.domain.minX,
          ).find(
            (n) => cmp(exponentialAt(task, rational(n)), exact(goal.y)) === 0,
          )!;
    act({
      type: "point",
      point: { x: rational(x), y: exponentialAt(task, rational(x)) },
    });
  }
  return frames;
}
export function mistakenGraphs(task: GraphTask): GraphState {
  const solved = exampleGraphs(task).at(-1)!;
  let frame = solved.frame;
  if (task.mode === "quadratic")
    frame = {
      ...frame,
      model: {
        mode: "quadratic",
        a: task.a,
        c: task.c,
        b: task.b === 0 ? 1 : -task.b,
      },
    };
  else if (task.mode === "inequalities") frame = { ...frame, shaded: false };
  else if (task.mode === "linear") {
    const x =
        task.goal.type === "value"
          ? task.goal.x
          : Number(frame.point.x.numerator) / Number(frame.point.x.denominator),
      line = task.lines[0];
    const concatenated =
      line.m > 0 && x > 0 && Number.isInteger(x)
        ? Number(`${line.m}${x}`) + line.b
        : null;
    frame = {
      ...frame,
      point: {
        x: frame.point.x,
        y:
          concatenated === null
            ? add(frame.point.y, one)
            : rational(concatenated),
      },
      relationship: "unset",
    };
  } else if (task.goal.type === "target")
    frame = {
      ...frame,
      point: {
        x: sub(div(exact(task.goal.y), exact(task.base)), rational(task.shift)),
        y: frame.point.y,
      },
    };
  else
    frame = {
      ...frame,
      point: { x: frame.point.x, y: lineAt(task.comparison, frame.point.x) },
    };
  // If the additive comparison happens to coincide, use another visibly wrong
  // point; this is a numeric model error, not a claimed reviewed misconception.
  if (
    checkGraphs({ frame, history: [] }, task).pointMatches &&
    task.mode !== "quadratic" &&
    task.mode !== "inequalities"
  )
    frame = {
      ...frame,
      point: { x: frame.point.x, y: add(frame.point.y, one) },
    };
  return { frame, history: [] };
}
