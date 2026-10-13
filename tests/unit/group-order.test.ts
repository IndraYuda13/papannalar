import { describe, expect, it } from "vitest";
import { orderAssignmentsByGroup } from "../../src/ui/group-order";

const groups = [{ id: "b" }, { id: "a" }, { id: "c" }];
const assignment = (groupId: string) => ({ id: `as-${groupId}`, groupId });

describe("orderAssignmentsByGroup", () => {
  it("follows the group order even when the assignments arrive uuid sorted", () => {
    // The real defect: the DTO returned assignments ordered by group_id, so the ready list
    // disagreed with the grid that renders `groups`.
    const scrambled = [assignment("a"), assignment("b"), assignment("c")];
    expect(
      orderAssignmentsByGroup(groups, scrambled).map((a) => a.groupId),
    ).toEqual(["b", "a", "c"]);
  });

  it("keeps an already ordered list untouched and does not mutate the input", () => {
    const ordered = [assignment("b"), assignment("a"), assignment("c")];
    expect(orderAssignmentsByGroup(groups, ordered)).toEqual(ordered);
    expect(ordered.map((a) => a.groupId)).toEqual(["b", "a", "c"]);
  });

  it("keeps unknown groups last in their original relative order", () => {
    const list = [
      assignment("gone-1"),
      assignment("c"),
      assignment("gone-2"),
      assignment("b"),
    ];
    expect(orderAssignmentsByGroup(groups, list).map((a) => a.groupId)).toEqual(
      ["b", "c", "gone-1", "gone-2"],
    );
  });

  it("returns an empty list for no assignments", () => {
    expect(orderAssignmentsByGroup(groups, [])).toEqual([]);
  });
});
