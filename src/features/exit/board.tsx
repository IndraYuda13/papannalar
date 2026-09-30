import type { PublicExit } from "@/contracts/exit";
import { MathPrompt } from "@/ui/components/math-prompt";
import { QuestionVisual } from "@/features/layar/question-visual";
import type { BoardPackage, BoardRunPlan } from "@/contracts/board-package";
export function ExitBoard({
  value,
  visuals = false,
  content,
  plan,
}: {
  value: PublicExit;
  visuals?: boolean;
  content?: BoardPackage;
  plan?: BoardRunPlan;
}) {
  return (
    <section
      aria-label="Kartu Keluar kelompok"
      className="w-full space-y-6 text-left"
    >
      <h1 className="text-[56px] font-bold">
        Kartu Keluar · Baris {value.row}/3
      </h1>
      <p className="text-[32px]">
        Jawab sesuai panel kelompokmu. Satu pilihan; ? bila belum tahu.
      </p>
      <div
        className={`grid gap-8 ${value.groups.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}
      >
        {value.groups.map((g) => (
          <section
            key={g.id}
            className="space-y-5 rounded-kartu border-4 border-primary bg-white p-6"
          >
            <h2 className="text-[40px] font-bold">{g.label}</h2>
            <p className="text-[36px]">
              Absen{" "}
              {g.attendanceNumbers
                .map((n) => String(n).padStart(2, "0"))
                .join(" · ")}
            </p>
            <div className="text-[56px]">
              <MathPrompt value={g.question.prompt} />
            </div>
            {visuals && (
              <QuestionVisual
                prompt={
                  value.row === 2
                    ? (content?.content.activities.find(
                        (a) =>
                          a.id ===
                          plan?.groups.find((group) => group.id === g.id)
                            ?.exitActivityId,
                      )?.exit.prompt ?? g.question.prompt)
                    : g.question.prompt
                }
              />
            )}
            <div className="space-y-4 text-[48px]">
              {g.question.options.map((o) => (
                <p key={o.label}>
                  <strong>{o.label}.</strong> {o.text}
                </p>
              ))}
              <p>?. Belum tahu</p>
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
