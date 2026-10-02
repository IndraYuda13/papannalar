"use client";
import type { PresentationState } from "@/contracts/presentation";
import { MathPrompt } from "@/ui/components/math-prompt";
import { ToolActivity } from "@/features/tools/activity";
import { RotationTimer } from "./timer";
import {
  QuestionVisual,
  needsQuestionVisual,
} from "@/features/layar/question-visual";
export function ActivityBoard({ state }: { state: PresentationState }) {
  const activity = state.activity!,
    group = state.groups.find((g) => g.id === activity.groupId);
  return (
    <section
      aria-label="Aktivitas paket"
      className="w-full space-y-6 text-left"
    >
      <div className="flex justify-between text-[32px]">
        <h1>
          {group?.label} · Tugas {activity.index}/{activity.total}
        </h1>
        <p>
          Putaran {state.station?.round}/{state.station?.total} ·{" "}
          <RotationTimer deadlineAt={state.station?.deadlineAt ?? null} />
        </p>
      </div>
      <h2 className="text-[56px] font-bold">
        <MathPrompt value={activity.prompt} />
      </h2>
      {state.roles && (
        <p data-testid="board-roles" className="text-[32px]">
          Pilot: {state.roles.pilots.join(" · ")} · Navigator:{" "}
          {state.roles.navigators.join(" · ")}. Navigator menjelaskan kenapa.
        </p>
      )}
      <div className="grid w-full gap-6 min-[1600px]:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div>
          {needsQuestionVisual(state) && !state.tool && (
            <QuestionVisual prompt={activity.prompt} />
          )}
          {state.tool ? (
            <ToolActivity
              key={state.taskEpoch}
              task={state.tool}
              pattern={state.mode === "together" ? "together" : state.pattern}
              guidance={state.guidance}
            />
          ) : (
            <p className="rounded-kartu border-4 p-8 text-[36px]">
              Model interaktif untuk tugas ini belum tersedia. Kerjakan model di
              buku bersama guru.
            </p>
          )}
        </div>
        <aside aria-label="Papan Tugas Mandiri" className="space-y-6">
          {activity.independent.map((g) => (
            <section
              key={g.groupId}
              className="rounded-kartu border-4 border-primary bg-white p-6 text-[40px]"
            >
              <h2 className="font-bold">
                Mandiri · {state.groups.find((v) => v.id === g.groupId)?.label}
              </h2>
              <ol className="list-inside list-decimal">
                {g.prompts.map((p, i) => (
                  <li key={i} className="my-4">
                    <MathPrompt value={p} />
                    {needsQuestionVisual(state) && (
                      <QuestionVisual prompt={p} compact />
                    )}
                  </li>
                ))}
              </ol>
              <p>Diskusikan berdua. Jelaskan caramu di buku.</p>
            </section>
          ))}
        </aside>
      </div>
    </section>
  );
}
