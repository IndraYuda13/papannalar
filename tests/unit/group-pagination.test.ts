import { describe, expect, it } from "vitest";
import { paginateGroups } from "../../src/ui/group-pagination";

const make = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: `g${i + 1}` }));

describe("paginateGroups", () => {
  it("returns one empty page for no groups", () => {
    expect(paginateGroups([], 1, 4)).toEqual({
      page: 1,
      pageCount: 1,
      items: [],
      start: 0,
      end: 0,
      total: 0,
    });
  });
  it("splits 9 groups into 3 pages of 4/4/1", () => {
    const pages = [1, 2, 3].map((p) => paginateGroups(make(9), p, 4));
    expect(pages.map((p) => p.items.length)).toEqual([4, 4, 1]);
    expect(pages.map((p) => p.pageCount)).toEqual([3, 3, 3]);
    expect(pages[2].start).toBe(8);
    expect(pages[2].end).toBe(9);
  });
  it("clamps an out-of-range page instead of returning nothing", () => {
    const result = paginateGroups(make(5), 99, 4);
    expect(result.page).toBe(2);
    expect(result.items.map((g) => g.id)).toEqual(["g5"]);
  });
  it("treats a non-positive page size as 4", () => {
    expect(paginateGroups(make(5), 1, 0).items).toHaveLength(4);
  });
});
