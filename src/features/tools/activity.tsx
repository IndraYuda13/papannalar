"use client";
import { useEffect, useState, type ReactNode } from "react";
import type { PublicTool } from "@/contracts/tools";
import {
  PATTERN_LABELS,
  checkModel,
  exampleFrames,
  hints,
  mistakenModel,
  modelResult,
  openAnswer,
  openPrompt,
  patternTask,
  twinTask,
  type Pattern,
  type ToolModel,
  type ToolTask,
} from "@/core/tools/patterns";
import { Button } from "@/ui/components/button";
import { ToolView } from "./tool-view";
import { useBoardCapabilities } from "@/features/layar/capability-context";
import type { PublicGuidance } from "@/contracts/guidance";
import { useHintReport } from "@/features/layar/hint-reporting";

// All predictions, walls and model histories are RAM-only, owned by taskEpoch.
export function ToolActivity({
  task: suppliedTask,
  pattern = "build",
  verifiedTouches,
  guidance,
}: {
  task: PublicTool;
  pattern?: Pattern;
  verifiedTouches?: 0 | 1 | 2 | 4;
  guidance?: PublicGuidance;
}) {
  const capabilities = useBoardCapabilities();
  const task = patternTask(suppliedTask, pattern);
  const [watch, setWatch] = useState(pattern === "watch"),
    [seconds, setSeconds] = useState(0),
    [openedHint, setHint] = useState(0);
  const hint = Math.max(openedHint, guidance?.hint ?? 0);
  const reportHint = useHintReport();
  useEffect(() => {
    reportHint?.(hint);
  }, [reportHint, hint]);
  useEffect(() => {
    if (guidance?.hint !== 3) return;
    const timer = setTimeout(() => {
      setSeconds(0);
      setWatch(true);
    }, 0);
    return () => clearTimeout(timer);
  }, [guidance?.hint]);
  const [guess, setGuess] = useState(0),
    [guessFixed, setGuessFixed] = useState(pattern !== "predict");
  const [results, setResults] = useState<readonly string[]>(["", ""]),
    [wall, setWall] = useState<readonly string[]>([]),
    [wallNotice, setWallNotice] = useState("");
  const [mistakeStep, setMistakeStep] = useState(0),
    [turn, setTurn] = useState<0 | 1>(0);
  const [hintReady, setHintReady] = useState(false);
  useEffect(() => {
    if (!watch) return;
    const id = setInterval(() => setSeconds((s) => Math.min(30, s + 1)), 1000);
    return () => clearInterval(id);
  }, [watch]);
  useEffect(() => {
    const id = setTimeout(() => setHintReady(true), 45000);
    return () => clearTimeout(id);
  }, []);
  function example() {
    setSeconds(0);
    setWatch(true);
  }
  function run(model: ToolModel, side: 0 | 1 = 0) {
    const result = modelResult(model);
    setResults((old) => old.map((value, i) => (i === side ? result : value)));
    if (pattern !== "open") return checkModel(task, model);
    const answer = openAnswer(task, model);
    if (!answer) {
      setWallNotice("Periksa syarat tantangan pada modelmu.");
      return false;
    }
    if (wall.includes(answer))
      setWallNotice("Model ini sudah ada di dinding. Temukan susunan lain.");
    else if (wall.length >= 20)
      setWallNotice(
        "Dinding sudah berisi 20 model. Bandingkan cara yang sudah ditemukan.",
      );
    else {
      setWall((old) => (old.includes(answer) ? old : [...old, answer]));
      setWallNotice(
        "Model unik ditambahkan. Jelaskan mengapa memenuhi syarat.",
      );
    }
    return true;
  }
  let examplePanel: ReactNode = null;
  if (watch) {
    const twin = twinTask(task),
      frames = exampleFrames(twin),
      frame = Math.min(
        frames.length - 1,
        Math.floor((seconds / 30) * (frames.length - 1)),
      );
    examplePanel = (
      <section
        aria-label="Contoh kembar"
        className="w-full space-y-4 text-left"
      >
        <h1 className="text-[48px] font-bold">Lihat Dulu · angka berbeda</h1>
        <p className="text-[32px]" data-testid="example-progress">
          {seconds}/30 detik ·{" "}
          {frame === 0
            ? "Amati awal model."
            : seconds < 30
              ? "Lakukan operasi pada model, satu langkah demi satu langkah."
              : "Perhatikan hasil model. Sekarang jelaskan caranya."}
        </p>
        <fieldset disabled className="pointer-events-none">
          <ToolView key={frame} task={twin} initial={frames[frame]} />
        </fieldset>
        {seconds === 30 && (
          <p className="text-[40px]">
            Hasil contoh: {modelResult(frames.at(-1)!)}
          </p>
        )}
        <div className="flex gap-4">
          <Button size="board" variant="outline" onClick={example}>
            Putar ulang contoh
          </Button>
          <Button
            size="board"
            disabled={seconds < 30}
            onClick={() => setWatch(false)}
          >
            Coba soal sendiri
          </Button>
        </div>
      </section>
    );
  }
  const initial = pattern === "find-error" ? mistakenModel(task) : undefined;
  const together = pattern === "together",
    simultaneous = together && (verifiedTouches ?? capabilities.touches) >= 2;
  // A vertical second representation shares the problem, not its model state.
  const second: ToolTask =
    task.kind === "number-line"
      ? {
          ...task,
          orientation:
            task.orientation === "horizontal" ? "vertical" : "horizontal",
        }
      : task;
  return (
    <div className="board-tool-object-scale">
      {guidance?.reveal && (
        <section
          aria-label="Jawaban latihan dibuka guru"
          className="mb-6 space-y-4 rounded-kartu border-4 border-primary bg-white p-5"
        >
          <h2 className="text-[48px] font-bold">Mari bahas caranya</h2>
          <fieldset disabled className="pointer-events-none">
            <ToolView task={task} initial={exampleFrames(task).at(-1)!} />
          </fieldset>
          <p data-testid="teacher-reveal" className="text-[48px]">
            Hasil model:{" "}
            {modelResult(exampleFrames(task).at(-1)!).replaceAll("-", "−")}
          </p>
          <p className="text-[32px]">
            Jelaskan hubungan langkah model dengan jawabanmu.
          </p>
        </section>
      )}
      {examplePanel}
      <section
        hidden={watch}
        aria-label="Pola Alat Nalar"
        className="w-full space-y-5 text-left"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-[40px] font-bold">{PATTERN_LABELS[pattern]}</h2>
          <Button size="board" variant="outline" onClick={example}>
            Lihat contoh
          </Button>
        </div>
        {pattern === "explore" && (
          <p className="text-[40px]">
            Ubah satu hal pada model. Apa yang berubah? Apa yang tetap?
          </p>
        )}
        {pattern === "predict" && (
          <div className="rounded-kartu border-4 border-primary p-4 text-[40px]">
            <p>
              Semua menulis tebakan di buku. Pilot menggeser penanda; Navigator
              menjelaskan alasannya.
            </p>
            <label className="flex flex-wrap items-center gap-4">
              Penanda tebakan{" "}
              <input
                aria-label="Penanda tebakan"
                type="range"
                min={-20}
                max={20}
                step={0.5}
                value={guess}
                disabled={guessFixed}
                onChange={(e) => setGuess(Number(e.target.value))}
                className="h-24 min-w-80 accent-primary [&::-webkit-slider-thumb]:!h-[88px] [&::-webkit-slider-thumb]:!w-[88px]"
              />
              <input
                aria-label="Nilai tebakan"
                type="number"
                min={-1000000}
                max={1000000}
                value={guess}
                disabled={guessFixed}
                className="min-h-24 w-52 border bg-white p-2"
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (Number.isFinite(n) && Math.abs(n) <= 1000000) setGuess(n);
                }}
              />
            </label>
            {!guessFixed && (
              <Button size="board" onClick={() => setGuessFixed(true)}>
                Simpan tebakan dan coba model
              </Button>
            )}
            {results[0] && (
              <p data-testid="prediction-comparison">
                Tebakan {guess} · Hasil model {results[0]} · Mengapa sama atau
                berbeda?
              </p>
            )}
          </div>
        )}
        {pattern === "find-error" && (
          <div className="space-y-3 text-[32px]">
            <p>
              Nala mencoba model ini. Sentuh langkah yang perlu diperiksa, lalu
              perbaiki modelnya.
            </p>
            <div className="flex flex-wrap gap-3">
              {[
                "1 · Baca besaran dan tanda pada soal",
                "2 · Susun model seperti Nala",
                "3 · Bandingkan model dengan soal",
              ].map((label, i) => (
                <Button
                  size="board"
                  variant="outline"
                  key={label}
                  className={
                    mistakeStep === i + 1 ? "border-4 border-dashed" : ""
                  }
                  onClick={() => setMistakeStep(i + 1)}
                >
                  {label}
                </Button>
              ))}
            </div>
            {mistakeStep > 0 && (
              <p>
                {mistakeStep === 2
                  ? "Periksa langkah penyusunan ini. Bagian mana yang perlu diubah?"
                  : "Bandingkan langkah ini dengan model sebelum memutuskan."}
              </p>
            )}
          </div>
        )}
        {pattern === "open" && (
          <p className="text-[40px]">{openPrompt(task)}</p>
        )}
        {together && (
          <div className="text-[32px]">
            <p>
              {simultaneous
                ? "Dua model, dua cara. Bandingkan hasil tanpa lomba waktu."
                : "Dua sentuhan belum teruji. Pilot A dan B bergantian; kedua model tetap terpisah."}
            </p>
            {!simultaneous && (
              <Button
                size="board"
                variant="outline"
                onClick={() => setTurn((t) => (t === 0 ? 1 : 0))}
              >
                Giliran Pilot {turn === 0 ? "B" : "A"}
              </Button>
            )}
          </div>
        )}
        {guessFixed && (
          <div
            className={
              simultaneous ? "grid w-full grid-cols-2 gap-6" : "w-full"
            }
          >
            <div
              hidden={together && !simultaneous && turn === 1}
              className="min-w-0 overflow-x-auto"
            >
              <fieldset
                className={
                  hint >= 2
                    ? "rounded-kartu border-4 border-dashed border-primary p-3"
                    : ""
                }
              >
                <ToolView
                  task={task}
                  initial={initial}
                  onRun={(m) => run(m, 0)}
                  hideHeading={pattern === "open"}
                />
              </fieldset>
            </div>
            {together && (
              <div
                hidden={!simultaneous && turn === 0}
                className="min-w-0 overflow-x-auto"
              >
                <ToolView task={second} onRun={(m) => run(m, 1)} />
              </div>
            )}
          </div>
        )}
        {together && (
          <p className="text-[40px]" data-testid="two-model-results">
            Cara A: {results[0] || "sedang mencoba"} · Cara B:{" "}
            {results[1] || "sedang mencoba"}. Jelaskan hubungan kedua cara.
          </p>
        )}
        {pattern === "open" && (
          <aside
            aria-label="Dinding model"
            className="space-y-3 rounded-kartu border-4 p-4 text-[40px]"
          >
            <h3>Model unik ({wall.length})</h3>
            {wall.map((answer) => (
              <p key={answer}>{answer}</p>
            ))}
            <p role="status">{wallNotice}</p>
          </aside>
        )}
        <div className="space-y-3">
          <Button
            size="board"
            variant="outline"
            className={
              hintReady && hint === 0 ? "outline-4 outline-pn-amber-500" : ""
            }
            onClick={() => {
              const next = Math.min(3, hint + 1);
              setHint(next);
              if (next === 3) example();
            }}
          >
            Petunjuk {Math.min(3, hint + 1)}
          </Button>
          {hint > 0 && hint < 3 && (
            <p className="text-[40px]">{hints(task)[hint - 1]}</p>
          )}
        </div>
      </section>
    </div>
  );
}
