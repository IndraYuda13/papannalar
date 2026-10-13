/**
 * Assignments in the teacher's own group order.
 *
 * The edit grid renders `groups` (the arrangement the teacher just made), so every other
 * list of per-group rows has to follow the same sequence or the screen contradicts itself.
 * The server DTO orders `assignments` by the group's position in `payload->'groups'` since
 * migration 202610140044; this keeps the rule inside the client too, so an offline read of a
 * lesson cached by an older build, or a locally assembled list, still matches the grid.
 *
 * Unknown group ids (a group removed from the payload) keep their relative order at the end
 * rather than being dropped: the caller decides what to do with them.
 */
export function orderAssignmentsByGroup<
  G extends { id: string },
  A extends { groupId: string },
>(groups: readonly G[], assignments: readonly A[]): A[] {
  const position = new Map(groups.map((group, index) => [group.id, index]));
  return [...assignments]
    .map((assignment, index) => ({
      assignment,
      rank: position.get(assignment.groupId),
      index,
    }))
    .sort(
      (left, right) =>
        (left.rank ?? Number.MAX_SAFE_INTEGER) -
          (right.rank ?? Number.MAX_SAFE_INTEGER) || left.index - right.index,
    )
    .map((entry) => entry.assignment);
}
