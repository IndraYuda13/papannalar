"use client";
import { useState } from "react";
import type { PublicLesson } from "@/contracts/lesson";
import type { PublicRoles } from "@/contracts/turns";
import { ToolActivity } from "@/features/tools/activity";
import { Button } from "@/ui/components/button";
import { QuestionVisual } from "@/features/layar/question-visual";
export function OpeningBoard({
  lesson,
  roles,
  continuation = false,
}: {
  lesson: PublicLesson;
  roles?: PublicRoles;
  continuation?: boolean;
}) {
  const [intuitive, setIntuitive] = useState<"less" | "more" | null>(null);
  return (
    <section
      aria-label={continuation ? "Lanjutan pembuka" : "Pembuka bermakna"}
      className="w-full space-y-5 text-left"
    >
      <h1 className="text-[56px] font-bold">
        {continuation ? "Lanjutan Pembuka" : lesson.prompt}
      </h1>
      {lesson.intuitiveOnly && (
        <QuestionVisual
          prompt={[{ kind: "text", text: lesson.prompt }]}
          tool={lesson.tool}
        />
      )}
      {continuation ? (
        <>
          <p className="text-[56px]">{lesson.followup}</p>
          <p className="text-[40px]">
            Gambarkan di buku, lalu jelaskan kepada teman. {lesson.why}
          </p>
        </>
      ) : (
        <>
          {roles && (
            <p data-testid="opening-roles" className="text-[40px]">
              Pilot:{" "}
              {roles.pilots.map((n) => String(n).padStart(2, "0")).join(" · ")}{" "}
              · Navigator:{" "}
              {roles.navigators
                .map((n) => String(n).padStart(2, "0"))
                .join(" · ")}
            </p>
          )}
          {lesson.intuitiveOnly ? (
            <div className="space-y-4 text-[40px]">
              <p>
                Tebak dengan intuisimu. Semua menulis perkiraan di buku; belum
                perlu menghitung.
              </p>
              <div className="flex gap-4">
                <Button
                  size="board"
                  variant={intuitive === "less" ? "default" : "outline"}
                  onClick={() => setIntuitive("less")}
                >
                  Lebih kecil / kurang
                </Button>
                <Button
                  size="board"
                  variant={intuitive === "more" ? "default" : "outline"}
                  onClick={() => setIntuitive("more")}
                >
                  Lebih besar / lebih
                </Button>
              </div>
              {intuitive && (
                <p>
                  Perkiraan:{" "}
                  {intuitive === "less"
                    ? "lebih kecil / kurang"
                    : "lebih besar / lebih"}
                  . Apa alasanmu?
                </p>
              )}
              <p>
                Di stasiun, lihat contoh dengan angka lain sebelum mencoba model
                sendiri.
              </p>
            </div>
          ) : lesson.tool ? (
            <ToolActivity task={lesson.tool} pattern="predict" />
          ) : (
            <p className="text-[40px]">
              Tulis perkiraan di buku. Bandingkan alasanmu dengan teman; model
              konteks disiapkan pada alat yang sesuai.
            </p>
          )}
        </>
      )}
    </section>
  );
}
