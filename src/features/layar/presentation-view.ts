import {
  publicPresentation,
  type PresentationState,
} from "../../contracts/presentation";
import { RESUMABLE_MODES } from "../../contracts/board-layout";
import type { PublicTool } from "../../contracts/tools";

// Public descriptors only. The models themselves stay inside mounted board views.
export function underlyingView(state: PresentationState): PresentationState {
  return publicPresentation({
    ...state,
    mode: state.spotlight?.returnMode ?? state.mode,
    taskEpoch: state.viewId ?? state.taskEpoch,
    spotlight: undefined,
    ...(state.spotlight ? { guidance: undefined } : {}),
  });
}
export function spotlightView(
  state: PresentationState,
  tool: PublicTool,
  epoch: string,
  groupId?: string,
): PresentationState {
  const base = underlyingView(state);
  const returnMode = RESUMABLE_MODES.find((m) => m === base.mode);
  if (!returnMode) throw new Error("Mode ini tidak membuka Sorot.");
  return publicPresentation({
    ...base,
    mode: "spotlight",
    taskEpoch: epoch,
    viewId: base.viewId ?? base.taskEpoch,
    guidance: undefined,
    spotlight: { id: epoch, returnMode, tool, ...(groupId ? { groupId } : {}) },
  });
}
export function resumeView(
  state: PresentationState,
  epoch: string,
): PresentationState {
  if (!state.spotlight) throw new Error("Sorot belum dibuka.");
  return publicPresentation({
    ...underlyingView(state),
    taskEpoch: epoch,
    viewId: state.viewId,
    guidance: undefined,
  });
}
