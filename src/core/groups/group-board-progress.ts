import type {
  BoardState as GroupBoardState,
  BoardMutation,
  LearningItem as LibraryItem,
} from "../learning/types";
import { decodeModelNumbers } from "../learning/types";
import { checkModel, type ToolModel } from "../tools/patterns";
export function reduceGroupBoardProgress(
  state: GroupBoardState,
  action: BoardMutation,
  item: LibraryItem,
): GroupBoardState {
  if (state.status !== "active") throw new Error("CONFLICT");
  if (
    state.assignmentId !== action.assignmentId ||
    state.revision !== action.revision ||
    state.taskEpoch !== action.taskEpoch
  )
    throw new Error("CONFLICT");
  const next = { ...state, revision: state.revision + 1 };
  if (action.action === "answer") {
    if (
      action.answer.kind !== item.kind ||
      (action.answer.kind === "interactive" &&
        item.kind === "interactive" &&
        action.answer.model.kind !== item.tool.kind)
    )
      throw new Error("INVALID_INPUT");
    return {
      ...next,
      answer: action.answer,
      feedback: null,
      checked: false,
      canNext: false,
    };
  }
  if (action.action === "check") {
    if (!state.answer) throw new Error("INVALID_INPUT");
    const correct =
      item.kind === "card" && state.answer.kind === "card"
        ? item.key === state.answer.choice
        : item.kind === "interactive" && state.answer.kind === "interactive"
          ? checkModel(
              item.tool,
              decodeModelNumbers(state.answer.model) as ToolModel,
            )
          : false;
    return {
      ...next,
      checked: true,
      canNext: true,
      feedback: { status: correct ? "correct" : "try_again" },
    };
  }
  if (!state.checked && !action.skip) throw new Error("INVALID_INPUT");
  if (action.action === "finish") {
    if (state.position !== state.total - 1) throw new Error("INVALID_INPUT");
    return { ...next, status: "completed", canNext: false };
  }
  if (state.position >= state.total - 1) throw new Error("INVALID_INPUT");
  return {
    ...next,
    position: state.position + 1,
    answer: null,
    feedback: null,
    checked: false,
    canNext: false,
  };
}
