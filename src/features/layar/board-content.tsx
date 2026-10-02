"use client";
import type { PresentationState } from "@/contracts/presentation";
import { PUBLIC_WEEKLY } from "@/content/demo/board-content";
import { NumberLine } from "@/features/tools/number-line";
import { PublicGroups } from "./public-groups";
import { StationBoard } from "@/features/stations/board";
import { ToolActivity } from "@/features/tools/activity";
import { OpeningBoard } from "@/features/opening/board";
import { Reflection } from "@/features/reflection/reflection";
import { ExitBoard } from "@/features/exit/board";
import { CheckBoard } from "@/features/session/check-board";
import { ActivityBoard } from "@/features/stations/activity-board";
import { underlyingView } from "./presentation-view";
import { SplitBoard } from "./split-board";
import { SpotlightBoard } from "./spotlight-board";
import { PracticeBoard } from "./practice-board";
import { HintReports } from "./hint-reporting";
import { needsQuestionVisual } from "./question-visual";
import type { BoardPackage, BoardRunPlan } from "@/contracts/board-package";
type ContentProps = {
  state: PresentationState;
  content?: BoardPackage;
  plan?: BoardRunPlan;
};
export function BoardContent({ state, content, plan }: ContentProps) {
  const base = underlyingView(state);
  const identity = JSON.stringify([
    base.taskEpoch,
    base.mode,
    base.tool,
    base.pattern,
    base.activity?.id,
    base.practice?.question.id,
    base.split,
    base.lesson,
  ]);
  return (
    <>
      <p
        data-testid="lesson-objective"
        hidden={state.mode === "reflection"}
        className="mb-5 text-[28px] text-primary"
      >
        Tujuan:{" "}
        {state.lesson?.objective ?? "menjelaskan arah dan perubahan bilangan."}
      </p>
      <div hidden={Boolean(state.spotlight)}>
        <HintReports enabled={!state.spotlight}>
          <BoardBody
            key={identity}
            state={base}
            content={content}
            plan={plan}
          />
        </HintReports>
      </div>
      {state.spotlight && (
        <SpotlightBoard
          key={state.spotlight.id}
          tool={state.spotlight.tool}
          guidance={state.guidance}
          label={
            state.groups.find((g) => g.id === state.spotlight?.groupId)?.label
          }
        />
      )}
    </>
  );
}
function BoardBody({ state, content, plan }: ContentProps) {
  const heading = "mb-6 text-[56px] leading-tight font-bold";
  if (state.practice)
    return (
      <PracticeBoard
        state={state}
        visualPrompt={
          content?.content.activities.find(
            (a) => a.reason.id === state.practice?.question.id,
          )?.exit.prompt
        }
      />
    );
  if (state.mode === "split" && state.split)
    return (
      <SplitBoard
        split={state.split}
        groups={state.groups}
        visuals={needsQuestionVisual(state)}
      />
    );
  if (state.mode === "check" && state.check)
    return <CheckBoard key={state.taskEpoch} state={state} />;
  if ((state.mode === "station" || state.mode === "together") && state.activity)
    return <ActivityBoard state={state} />;
  if (state.mode === "exit" && state.exit)
    return (
      <ExitBoard
        value={state.exit}
        visuals={needsQuestionVisual(state)}
        content={content}
        plan={plan}
      />
    );
  if (
    state.lesson &&
    (state.mode === "opening" || state.mode === "continuation")
  )
    return (
      <OpeningBoard
        key={state.taskEpoch}
        lesson={state.lesson}
        roles={state.roles}
        continuation={state.mode === "continuation"}
      />
    );
  if (state.mode === "reflection")
    return (
      <Reflection
        key={state.taskEpoch}
        oral={state.lesson?.oralReflection}
        uses={state.lesson ? [state.lesson.objective] : []}
      />
    );
  if ((state.mode === "station" || state.mode === "together") && state.tool)
    return (
      <ToolActivity
        key={state.taskEpoch}
        task={state.tool}
        pattern={state.mode === "together" ? "together" : state.pattern}
        guidance={state.guidance}
      />
    );
  if (state.mode === "station" && state.station)
    return (
      <StationBoard
        station={state.station}
        groups={state.groups}
        roles={state.roles}
      />
    );
  if (state.mode === "opening")
    return (
      <>
        <h1 className={heading}>
          Lift dari basement −2 ke lantai 5.
          <br />
          Naik berapa lantai?
        </h1>
        <NumberLine key={state.taskEpoch} vertical />
      </>
    );
  if (state.mode === "check") {
    const q = PUBLIC_WEEKLY[state.question - 1];
    return (
      <>
        <p className="mb-8 text-[32px]">
          Cek Level · Soal {state.question}/5 · Baris {state.question} pada
          kartu
        </p>
        <h1 className={heading}>{q.text}</h1>
        <div className="my-12 flex flex-wrap justify-center gap-8">
          {[...q.options, "Belum tahu"].map((option, i) => (
            <div key={i} className="flex items-center gap-4 text-[48px]">
              <span
                className={`flex size-24 items-center justify-center rounded-full border-4 border-primary text-primary ${i === 4 ? "border-dashed" : ""}`}
              >
                {i === 4 ? "?" : "ABCD"[i]}
              </span>
              {option}
            </div>
          ))}
        </div>
        <p className="text-[32px]">
          Isi satu pilihan. Jika belum tahu, pilih ?.
        </p>
      </>
    );
  }
  if (state.mode === "continuation")
    return (
      <>
        <h1 className={heading}>Lanjutan Pembuka</h1>
        <p className="max-w-5xl text-[56px]">
          Lift berada di lantai 5, lalu turun ke basement −2. Bagaimana arah
          geraknya berubah?
        </p>
        <div className="mt-12 rounded-kartu border-4 border-primary p-10 text-[72px]">
          5 ↓ 0 ↓ −2
        </div>
        <p className="mt-8 text-[40px]">
          Gambarkan perjalananmu di buku. Jelaskan kepada teman.
        </p>
      </>
    );
  if (state.mode === "groups")
    return (
      <>
        <h1 className={heading}>Temukan kelompokmu</h1>
        <PublicGroups groups={state.groups} station={state.station} />
      </>
    );
  if (state.mode === "station")
    return (
      <>
        <h1 className={heading}>Segitiga Biru · −3 − 5</h1>
        <div className="grid w-full gap-8 xl:grid-cols-[2fr_1fr]">
          <NumberLine key={state.taskEpoch} />
          <aside className="rounded-kartu bg-white p-6 text-left text-[40px]">
            <h2 className="mb-4 font-bold">Tugas mandiri</h2>
            <p>Gambarkan −3 − 5. Mengapa hasilnya lebih kecil dari −3?</p>
            <p className="mt-6">
              Bandingkan dengan −3 + 5. Ceritakan arah geraknya.
            </p>
          </aside>
        </div>
      </>
    );
  if (state.mode === "exit")
    return (
      <>
        <h1 className={heading}>Kartu Keluar</h1>
        <p className="max-w-5xl text-[48px]">
          Tuliskan nomor absen. Siapkan satu pilihan jawaban dan alasan pada dua
          baris pertama.
        </p>
        <p className="mt-10 text-[32px]">
          Buka paket Kartu Keluar dari HP guru untuk menampilkan soal tiap
          kelompok.
        </p>
      </>
    );
  return null;
}
