"use client";
import { useState } from "react";
import type { PublicSplit } from "@/contracts/board-layout";
import type { PresentationState } from "@/contracts/presentation";
import { MathPrompt } from "@/ui/components/math-prompt";
import { Button } from "@/ui/components/button";
import { ToolActivity } from "@/features/tools/activity";
import { GroupSymbol } from "./public-groups";
import { QuestionVisual } from "./question-visual";

export function SplitBoard({
  split,
  groups,
  visuals = false,
}: {
  split: PublicSplit;
  groups: PresentationState["groups"];
  visuals?: boolean;
}) {
  const [page, setPage] = useState(0),
    [expanded, setExpanded] = useState<number>();
  const pages = Math.ceil(split.panels.length / 2);
  return (
    <section aria-label="Panel Terbagi" className="w-full space-y-5 text-left">
      <h1 className="text-[56px] font-bold">Panel Terbagi</h1>
      <p className="text-[26px]">
        {split.panels.length} kelompok · Halaman {page + 1}/{pages}. Dua panel
        per halaman; model tetap tersimpan selama latihan ini.
      </p>
      <div
        className={`grid gap-6 ${expanded === undefined ? "min-[1600px]:grid-cols-2" : "grid-cols-1"}`}
      >
        {split.panels.map((panel, i) => (
          <div
            key={panel.groupId}
            hidden={
              Math.floor(i / 2) !== page ||
              (expanded !== undefined && expanded !== i)
            }
            className="min-w-0 rounded-kartu border-4 border-primary bg-white p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-[40px] font-bold">
                {groups.find((g) => g.id === panel.groupId) && (
                  <>
                    <GroupSymbol
                      label={groups.find((g) => g.id === panel.groupId)!.label}
                    />{" "}
                  </>
                )}
                {groups.find((g) => g.id === panel.groupId)?.label}
              </h2>
              <Button
                size="board"
                variant="outline"
                onClick={() => setExpanded(expanded === i ? undefined : i)}
              >
                {expanded === i
                  ? "Kembali ke panel"
                  : `Perbesar panel ${i + 1}`}
              </Button>
            </div>
            <PanelExercises panel={panel} visuals={visuals} />
          </div>
        ))}
      </div>
      {pages > 1 && (
        <nav aria-label="Halaman kelompok" className="flex flex-wrap gap-4">
          <Button
            size="board"
            variant="outline"
            disabled={page === 0}
            onClick={() => {
              setPage(0);
              setExpanded(undefined);
            }}
          >
            Panel sebelumnya
          </Button>
          <Button
            size="board"
            disabled={page === pages - 1}
            onClick={() => {
              setPage(1);
              setExpanded(undefined);
            }}
          >
            Panel berikutnya
          </Button>
        </nav>
      )}
    </section>
  );
}
function PanelExercises({
  panel,
  visuals,
}: {
  panel: PublicSplit["panels"][number];
  visuals: boolean;
}) {
  const [index, setIndex] = useState(0);
  return (
    <>
      {panel.exercises.map((exercise, i) => (
        <section
          key={exercise.id}
          hidden={i !== index}
          aria-label={`Latihan panel ${i + 1}`}
          className="mt-5 space-y-5"
        >
          <p className="text-[26px]">
            Latihan {i + 1}/{panel.exercises.length}
          </p>
          <h3
            className="text-[72px] leading-tight font-bold"
            data-testid="split-prompt"
          >
            <MathPrompt value={exercise.prompt} />
          </h3>
          {visuals && !exercise.tool && (
            <QuestionVisual prompt={exercise.prompt} />
          )}
          {exercise.tool ? (
            <ToolActivity task={exercise.tool} />
          ) : (
            <p className="text-[40px]">
              Gambarkan besaran di buku. Jelaskan langkahmu kepada pasangan,
              lalu bandingkan cara kalian.
            </p>
          )}
        </section>
      ))}
      <div className="mt-5 flex flex-wrap gap-3">
        <Button
          size="board"
          variant="outline"
          disabled={index === 0}
          onClick={() => setIndex(index - 1)}
        >
          Latihan sebelumnya
        </Button>
        <Button
          size="board"
          disabled={index === panel.exercises.length - 1}
          onClick={() => setIndex(index + 1)}
        >
          Latihan berikutnya
        </Button>
      </div>
    </>
  );
}
