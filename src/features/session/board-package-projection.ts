import type { TeacherPackage } from "../../core/package/build";
import type { GroupSnapshot } from "../../core/groups/grouping";
import { openingFromPackage } from "../../core/package/opening";
import { questionTool } from "../../core/package/tool-task";
import { createRotation } from "../../core/stations/rotation";
import { toPublicPackage } from "../../contracts/package";
import { publicTool } from "../../contracts/tools";
import { publicLesson } from "../../contracts/lesson";
import { rotationProjection } from "../../contracts/stations";
import {
  publicBoardPacket,
  type BoardPacket,
} from "../../contracts/board-package";

export function boardPackageProjection(
  p: TeacherPackage,
  sessionId: string,
  groups: readonly GroupSnapshot[],
): BoardPacket {
  const rotation = groups.length
    ? createRotation({
        id: sessionId,
        groupIds: groups.map((g) => g.id),
        grade: p.grade,
        short: p.variant === "short",
        initial: p.variant === "initial",
      })
    : undefined;
  const activityId = (step: GroupSnapshot["activityStep"]) => {
    const a = p.activities.find((a) => a.stepId === step);
    if (!a) throw new Error("Activity missing from frozen package");
    return a.guided.id;
  };
  return publicBoardPacket({
    content: {
      schemaVersion: 1,
      content: toPublicPackage(p),
      lesson: publicLesson(openingFromPackage(p)),
      seconds:
        p.variant === "short"
          ? 60
          : p.variant === "initial" || p.grade > 6
            ? 75
            : 80,
      models: p.activities.flatMap((a) =>
        a.board.flatMap((q) => {
          const tool = questionTool(q);
          return tool ? [{ questionId: q.id, tool: publicTool(tool) }] : [];
        }),
      ),
    },
    plan: {
      id: sessionId,
      groups: groups.map((g) => ({
        id: g.id,
        label: g.label,
        attendanceNumbers: g.members.map((m) => m.attendanceNumber),
        activityId: activityId(g.activityStep),
        exitActivityId: activityId(g.exitBaseStep),
        contextActivityId: activityId(g.exitContextStep),
      })),
      ...(groups.length
        ? {
            firstStation: rotationProjection(
              createRotation({
                id: sessionId,
                groupIds: groups.map((g) => g.id),
                grade: p.grade,
                short: p.variant === "short",
                initial: p.variant === "initial",
              }),
            ),
          }
        : {}),
      stations: rotation
        ? Array.from(
            { length: rotation.short ? 1 : rotation.schedule[0].length },
            (_, round) => rotationProjection({ ...rotation, round }),
          )
        : [],
    },
  });
}
