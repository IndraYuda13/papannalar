import { describe, expect, it } from "vitest";
import {
  rational,
  multiplyRational,
  addRational,
  compareRational,
} from "../../src/core/math/rational";
import {
  initialGraphs,
  reduceGraphs,
  checkGraphs,
  exampleGraphs,
  mistakenGraphs,
  lineAt,
  intersection,
  satisfies,
  feasiblePolygon,
  feasiblePoint,
  quadraticAt,
  quadraticRoots,
  exponentialAt,
  drawingValue,
  modelsMatch,
  validateGraphTask,
  type GraphTask,
  type GraphState,
} from "../../src/core/tools/graphs";
import { GRAPH_EXAMPLES, twinGraph } from "../../src/core/tools/graph-tasks";
import { graphToolSchema, publicGraph } from "../../src/contracts/graphs";
import { generateQuestion } from "../../src/core/package/question";
import { questionTool } from "../../src/core/package/tool-task";
import { publicTool, publicToolSchema } from "../../src/contracts/tools";
import { openAnswer } from "../../src/core/tools/patterns";

describe("TOOL06 exact graph models", () => {
  it("100 actual generated package questions keep their math and produce renderable public graph tasks", () => {
    for (const step of ["D6", "E2", "E3", "E4"] as const)
      for (let seed = 0; seed < 25; seed++) {
        const q = generateQuestion(step, seed),
          tool = questionTool(q);
        if (tool?.kind !== "graphs") throw new Error("Missing graph mapping");
        expect(publicToolSchema.safeParse(publicTool(tool)).success).toBe(true);
        expect(
          checkGraphs(exampleGraphs(tool).at(-1)!, tool).modelMatches,
        ).toBe(true);
      }
  });
  it("open challenges deduplicate exact points and allow different parabolas with the same roots", () => {
    const t = GRAPH_EXAMPLES.linear,
      solved = exampleGraphs(t).at(-1)!;
    const first = openAnswer(t, { kind: "graphs", state: solved });
    const other = reduceGraphs(
      solved,
      { type: "point", point: { x: rational(4), y: rational(9) } },
      t,
    );
    expect(openAnswer(t, { kind: "graphs", state: other })).not.toBe(first);
    const q = GRAPH_EXAMPLES.quadratic;
    let doubled = exampleGraphs(q).at(-1)!;
    for (const key of ["a", "b", "c"] as const)
      doubled = reduceGraphs(
        doubled,
        { type: "coefficient", key, value: q[key] * 2, curve: 0 },
        q,
      );
    doubled = reduceGraphs(doubled, { type: "roots" }, q);
    expect(checkGraphs(doubled, q).modelMatches).toBe(false);
    expect(openAnswer(q, { kind: "graphs", state: doubled })).toBeTruthy();
    expect(openAnswer(q, { kind: "graphs", state: doubled })).not.toBe(
      openAnswer(q, { kind: "graphs", state: exampleGraphs(q).at(-1)! }),
    );
  });
  it.each(Object.values(GRAPH_EXAMPLES))(
    "%j uses exact actions, distinct twin, wrong model and undo",
    (task) => {
      const initial = initialGraphs(task),
        frames = exampleGraphs(task),
        solved = frames.at(-1)!;
      expect(checkGraphs(initial, task).modelMatches).toBe(false);
      expect(checkGraphs(solved, task).modelMatches).toBe(true);
      expect(checkGraphs(mistakenGraphs(task), task).modelMatches).toBe(false);
      expect(reduceGraphs(solved, { type: "undo" }, task)).toEqual(
        frames.at(-2),
      );
      expect(reduceGraphs(solved, { type: "reset" }, task)).toEqual(initial);
      const twin = twinGraph(task);
      expect(twin).not.toEqual(task);
      expect(checkGraphs(exampleGraphs(twin).at(-1)!, twin).modelMatches).toBe(
        true,
      );
      expect(initial.history).toHaveLength(0);
    },
  );
  it("D6 source y=2x+1 at x=3 is 7, not concatenated 24", () => {
    const t = GRAPH_EXAMPLES.linear,
      solved = exampleGraphs(t).at(-1)!;
    expect(solved.frame.point).toEqual({ x: rational(3), y: rational(7) });
    expect(mistakenGraphs(t).frame.point.y).toEqual(rational(24));
    const wrongModel: GraphState = {
      ...solved,
      frame: {
        ...solved.frame,
        model: { mode: "linear", lines: [{ m: 1, b: 4 }] },
      },
    };
    expect(checkGraphs(wrongModel, t)).toMatchObject({
      modelMatches: false,
      coefficientsMatch: false,
      pointMatches: true,
    });
  });
  it("SPLDV source internet packages cross at (5,25); fractional intersections do not use pixel tolerance", () => {
    expect(intersection({ m: 1, b: 20 }, { m: 5, b: 0 })).toEqual({
      x: rational(5),
      y: rational(25),
    });
    expect(intersection({ m: 3, b: 1 }, { m: 0, b: 2 })).toEqual({
      x: rational(1, 3),
      y: rational(2),
    });
    for (let m = -5; m <= 5; m++)
      for (let n = -5; n <= 5; n++)
        if (m !== n) {
          const p = intersection({ m, b: 2 }, { m: n, b: 5 });
          if (typeof p === "string") throw new Error("Expected unique point");
          expect(lineAt({ m, b: 2 }, p.x)).toEqual(p.y);
          expect(lineAt({ m: n, b: 5 }, p.x)).toEqual(p.y);
        }
    for (const relationship of ["parallel", "coincident"] as const) {
      const t: GraphTask = {
        ...GRAPH_EXAMPLES.intersection,
        lines: [
          { m: 2, b: 1 },
          { m: 2, b: relationship === "parallel" ? 3 : 1 },
        ],
      };
      expect(intersection(t.lines[0], t.lines[1])).toBe(relationship);
      expect(checkGraphs(exampleGraphs(t).at(-1)!, t).modelMatches).toBe(true);
    }
  });
  it("E2 intersects all three constraints and rejects equality-only, single-half-plane and strict boundary mistakes", () => {
    const t = GRAPH_EXAMPLES.inequalities,
      point = { x: rational(1), y: rational(2) };
    expect(t.constraints.every((q) => satisfies(q, point))).toBe(true);
    expect(
      t.constraints.every((q) =>
        satisfies(q, { x: rational(-1), y: rational(1) }),
      ),
    ).toBe(false);
    const polygon = feasiblePolygon(t.constraints, t.domain);
    expect(polygon.length).toBeGreaterThanOrEqual(3);
    expect(
      polygon.every((p) => t.constraints.every((q) => satisfies(q, p))),
    ).toBe(true);
    const strict = { a: 1, b: 1, c: 4, operator: "lt" } as const;
    expect(satisfies(strict, { x: rational(2), y: rational(2) })).toBe(false);
    expect(satisfies(strict, point)).toBe(true);
    const solved = exampleGraphs(t).at(-1)!;
    expect(
      checkGraphs({ ...solved, frame: { ...solved.frame, shaded: false } }, t)
        .modelMatches,
    ).toBe(false);
    expect(
      feasiblePoint(
        [
          { a: 1, b: 0, c: 0, operator: "lt" },
          { a: 1, b: 0, c: 0, operator: "ge" },
        ],
        t.domain,
      ),
    ).toBeNull();
    expect(
      feasiblePolygon(
        [
          { a: 1, b: 0, c: 0, operator: "le" },
          { a: 1, b: 0, c: 1, operator: "ge" },
        ],
        t.domain,
      ),
    ).toEqual([]);
  });
  it("E3 source roots 2 and 3, double/no roots, negative a and symbolic radicals are exact", () => {
    expect(quadraticRoots(GRAPH_EXAMPLES.quadratic)).toEqual([
      { kind: "rational", value: rational(2) },
      { kind: "rational", value: rational(3) },
    ]);
    expect(quadraticRoots({ mode: "quadratic", a: 1, b: -4, c: 4 })).toEqual([
      { kind: "rational", value: rational(2) },
    ]);
    expect(quadraticRoots({ mode: "quadratic", a: 1, b: 0, c: 1 })).toEqual([]);
    expect(quadraticRoots({ mode: "quadratic", a: -1, b: 5, c: -6 })).toEqual(
      quadraticRoots(GRAPH_EXAMPLES.quadratic),
    );
    expect(quadraticRoots({ mode: "quadratic", a: 1, b: 0, c: -8 })).toEqual([
      {
        kind: "radical",
        offset: rational(0),
        scale: rational(-2),
        radicand: 2,
      },
      { kind: "radical", offset: rational(0), scale: rational(2), radicand: 2 },
    ]);
    for (let r = -7; r <= 7; r++)
      for (let s = -7; s <= 7; s++) {
        const q = {
          mode: "quadratic",
          a: 2,
          b: -2 * (r + s),
          c: 2 * r * s,
        } as const;
        for (const root of quadraticRoots(q)) {
          if (root.kind !== "rational")
            throw new Error("Expected rational factors");
          expect(quadraticAt(q, root.value)).toEqual(rational(0));
        }
      }
  });
  it("E4 2^(x+1)=16 has x=3; negative powers and 10% compounding are exact, unlike linear growth", () => {
    const t = GRAPH_EXAMPLES.exponential;
    expect(exampleGraphs(t).at(-1)!.frame.point).toEqual({
      x: rational(3),
      y: rational(16),
    });
    expect(mistakenGraphs(t).frame.point.x).toEqual(rational(7));
    expect(exponentialAt(t, rational(-2))).toEqual(rational(1, 2));
    const growth: GraphTask = {
      ...t,
      base: { numerator: 11, denominator: 10 },
      shift: 0,
      goal: { type: "value", x: 12 },
      domain: { minX: 0, maxX: 12, minY: 0, maxY: 10 },
    };
    expect(exponentialAt(growth, rational(12))).toEqual(
      rational(3138428376721n, 1000000000000n),
    );
    expect(
      checkGraphs(exampleGraphs(growth).at(-1)!, growth).modelMatches,
    ).toBe(true);
    for (let n = -10; n < 10; n++)
      expect(exponentialAt(t, rational(n + 1))).toEqual(
        multiplyRational(exponentialAt(t, rational(n)), rational(2)),
      );
    expect(() => exponentialAt(t, rational(1, 2))).toThrow();
    expect(
      compareRational(
        exponentialAt(t, rational(3)),
        addRational(rational(2 * 3), rational(2)),
      ),
    ).toBe(1);
  });
  it("bounds prevent zero degree/base, unsupported exponent, invalid domain and missing constraints", () => {
    expect(() =>
      validateGraphTask({ ...GRAPH_EXAMPLES.quadratic, a: 0 }),
    ).toThrow();
    expect(() =>
      validateGraphTask({
        ...GRAPH_EXAMPLES.exponential,
        base: { numerator: 1, denominator: 1 },
      }),
    ).toThrow();
    expect(() =>
      validateGraphTask({
        ...GRAPH_EXAMPLES.exponential,
        goal: { type: "target", y: { numerator: 17, denominator: 1 } },
      }),
    ).toThrow();
    expect(() =>
      validateGraphTask({
        ...GRAPH_EXAMPLES.linear,
        domain: { minX: 5, maxX: 4, minY: 0, maxY: 10 },
      }),
    ).toThrow();
    expect(() =>
      validateGraphTask({ ...GRAPH_EXAMPLES.inequalities, constraints: [] }),
    ).toThrow();
    expect(() =>
      reduceGraphs(
        initialGraphs(GRAPH_EXAMPLES.linear),
        { type: "point", point: { x: rational(100), y: rational(0) } },
        GRAPH_EXAMPLES.linear,
      ),
    ).toThrow();
    expect(drawingValue(GRAPH_EXAMPLES.exponential, 100000)).toBeNull();
    expect(
      modelsMatch(
        { mode: "quadratic", c: 6, b: -5, a: 1 },
        GRAPH_EXAMPLES.quadratic,
      ),
    ).toBe(true);
  });
  it.each(Object.values(GRAPH_EXAMPLES))(
    "public %j removes arbitrary fields and nested private data",
    (t) => {
      const local = {
        ...t,
        name: "CANARY",
        roots: [2, 3],
        history: [],
        domain: { ...t.domain, studentId: "CANARY" },
      };
      expect(publicGraph(local)).toEqual(t);
      expect(graphToolSchema.safeParse(local).success).toBe(false);
      expect(graphToolSchema.safeParse(publicGraph(local)).success).toBe(true);
    },
  );
});
