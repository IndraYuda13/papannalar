"use client";
import { useEffect, useState, type ReactNode } from "react";
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
import { boardCopy } from "./board-copy";
import type { BoardPackage, BoardRunPlan } from "@/contracts/board-package";
type ContentProps = {
  state: PresentationState;
  content?: BoardPackage;
  plan?: BoardRunPlan;
};

/**
 * The board's own frame (INTERACTION_DELTA_V4 §B0) plus the two self-explanation devices
 * (§I.3): a `role-line` above the heading on every screen, and a `next-line` below the content
 * on every non-question screen. Neither introduces a container — both are text and a rule,
 * which is the board's own material — and neither animates its text size (§A.1.5).
 *
 * The column is anchored to the top because a consistent question origin is the single
 * highest-value composition decision on this surface (§B0.1); the threshold rule above the
 * column is the AMBANG device, drawn once per crossing (§B1).
 */
export function BoardContent({ state, content, plan }: ContentProps) {
  const base = underlyingView(state);
  const copy = boardCopy(base);
  const [crossing, setCrossing] = useState(false);
  useEffect(() => {
    // C4 Ambang is *one per crossing*, not per render: the beat fires when the first content
    // of a session replaces the idle screen, never on an in-place question change.
    const start = window.setTimeout(() => setCrossing(true), 0);
    const stop = window.setTimeout(() => setCrossing(false), 700);
    return () => {
      window.clearTimeout(start);
      window.clearTimeout(stop);
    };
  }, []);
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
    <div
      className="board-column"
      data-board-safe
      data-crossing={crossing}
      data-board-band
    >
      <p
        className={`board-role-line${crossing ? " board-rule-draw" : ""}`}
        data-role-line
        data-board-band
        data-motion-class={crossing ? "C4" : undefined}
      >
        {copy.role}
      </p>
      <div
        hidden={Boolean(state.spotlight)}
        className="board-column-body"
        data-board-band
      >
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
      {/* The lesson objective is supporting context, so it sits *below* the decision the room
          has to make. Above the question it pushed the question out of §6.1's origin band —
          a screen whose first line is "Tujuan:" is a screen whose question starts too late
          (A3b). */}
      <p
        data-testid="lesson-objective"
        hidden={state.mode === "reflection"}
        className="board-objective"
        data-board-band
      >
        Tujuan:{" "}
        {state.lesson?.objective ?? "menjelaskan arah dan perubahan bilangan."}
      </p>
      {copy.next && (
        <p className="board-next-line" data-next-line data-board-band>
          {copy.next}
        </p>
      )}
    </div>
  );
}

function BoardBody({ state, content, plan }: ContentProps) {
  const heading = "board-heading";
  const beat = boardCopy(state).beat;
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
        <h1 className={heading} data-beat="question">
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
        <h1 className={heading} data-beat="question">
          {q.text}
        </h1>
        <div className="board-options board-options-grid">
          {[...q.options, "Belum tahu"].map((option, i) => (
            <p
              key={i}
              className={
                i === 4
                  ? "board-option-row board-option-row-unknown"
                  : "board-option-row"
              }
            >
              <span
                className={
                  i === 4
                    ? "board-option-mark board-option-mark-unknown"
                    : "board-option-mark"
                }
              >
                {i === 4 ? "?" : "ABCD"[i]}
              </span>
              <span className="board-option-text">{option}</span>
            </p>
          ))}
        </div>
        <p className="board-note">
          Isi satu pilihan. Jika belum tahu, pilih ?.
        </p>
      </>
    );
  }
  if (state.mode === "continuation")
    return (
      <>
        <h1 className={heading} data-beat="question">
          Ayo lanjutkan
        </h1>
        <p className="board-reading-copy">
          Lift berada di lantai 5, lalu turun ke basement −2. Bagaimana arah
          geraknya berubah?
        </p>
        <div className="board-model-box">5 ↓ 0 ↓ −2</div>
        <p className="board-note">
          Gambarkan perjalananmu di buku. Jelaskan kepada teman.
        </p>
      </>
    );
  if (state.mode === "groups")
    return (
      <>
        <h1 className={heading} data-beat="groups">
          Temukan kelompokmu
        </h1>
        <p className="board-instruction">
          Nomor absenmu ada di salah satu kartu di bawah. Cari nomormu, lalu
          duduk bersama kelompokmu.
        </p>
        <PublicGroups groups={state.groups} station={state.station} />
      </>
    );
  if (state.mode === "station")
    return (
      <>
        <h1 className={heading} data-beat={beat}>
          Segitiga Biru · −3 − 5
        </h1>
        <div className="board-station-grid">
          <NumberLine key={state.taskEpoch} />
          <aside className="board-task-panel">
            <h2>Tugas mandiri</h2>
            <p>Gambarkan −3 − 5. Mengapa hasilnya lebih kecil dari −3?</p>
            <p>Bandingkan dengan −3 + 5. Ceritakan arah geraknya.</p>
          </aside>
        </div>
      </>
    );
  if (state.mode === "exit")
    return (
      <>
        <h1 className={heading} data-beat="exit">
          Kartu cek akhir
        </h1>
        <p className="board-reading-copy">
          Tuliskan nomor absen. Siapkan satu pilihan jawaban dan alasan pada dua
          baris pertama.
        </p>
        <p className="board-note">
          Buka paket Kartu cek akhir dari HP guru untuk menampilkan soal tiap
          kelompok.
        </p>
      </>
    );
  return null;
}

/**
 * `Sesi selesai` — the closing card (§B8).
 *
 * The lesson ends; the class does not win. No score, no per-student summary, nothing
 * celebratory, and one instruction addressed to the teacher: the results are on the phone.
 */
export function BoardCloseCard({
  className,
  total,
}: {
  className?: string;
  total: number;
}) {
  const [stamp, setStamp] = useState("");
  useEffect(() => {
    // Deferred one tick so the server and the first client render agree on the empty string;
    // the date is a local fact and must not cause a hydration mismatch on the board.
    const timer = window.setTimeout(
      () =>
        setStamp(
          new Intl.DateTimeFormat("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }).format(new Date()),
        ),
      0,
    );
    return () => window.clearTimeout(timer);
  }, []);
  return (
    <section
      className={className ?? "board-close"}
      data-board-close
      aria-label="Sesi selesai"
    >
      <div className="board-close-card">
        <h1>Sesi selesai.</h1>
        <p className="board-model-box">
          Kegunaan hari ini: {total} soal dikerjakan bersama.
        </p>
        <p className="board-close-meta">
          PapanNalar · {stamp || "hari ini"} · {total} soal
        </p>
        <p className="board-note">
          Hasil ada di HP guru. Buka Layar Kelas lagi untuk sesi berikutnya.
        </p>
      </div>
    </section>
  );
}

export type { ReactNode };
