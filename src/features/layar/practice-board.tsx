import type { PresentationState } from "@/contracts/presentation";
import { MathPrompt } from "@/ui/components/math-prompt";
import { ToolActivity } from "@/features/tools/activity";
import { QuestionVisual, needsQuestionVisual } from "./question-visual";
import type { MathPrompt as Prompt } from "@/content/templates/types";
export function PracticeBoard({
  state,
  visualPrompt,
}: {
  state: PresentationState;
  visualPrompt?: Prompt;
}) {
  const p = state.practice!;
  return (
    <section
      aria-label="Latihan dari cache"
      className="w-full space-y-5 text-left"
    >
      <h1 className="text-[56px] font-bold">
        <MathPrompt value={p.question.prompt} />
      </h1>
      <div className="grid gap-6 min-[1600px]:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div>
          {needsQuestionVisual(state) && !state.tool && (
            <QuestionVisual prompt={visualPrompt ?? p.question.prompt} />
          )}
          {state.tool ? (
            <ToolActivity
              task={state.tool}
              pattern={state.pattern}
              guidance={state.guidance}
            />
          ) : (
            <div className="grid grid-cols-2 gap-4 text-[48px]">
              {p.question.options.map((o) => (
                <p key={o.label}>
                  {o.label}. {o.text}
                </p>
              ))}
              <p>?. Belum tahu</p>
            </div>
          )}
        </div>
        {!!p.independent.length && (
          <aside className="space-y-6 rounded-kartu border-4 border-primary bg-white p-6 text-[40px]">
            <h2 className="font-bold">Tugas mandiri</h2>
            {p.independent.map((q) => (
              <div key={q.id}>
                <MathPrompt value={q.prompt} />
                {needsQuestionVisual(state) && (
                  <QuestionVisual prompt={q.prompt} compact />
                )}
              </div>
            ))}
          </aside>
        )}
      </div>
    </section>
  );
}
