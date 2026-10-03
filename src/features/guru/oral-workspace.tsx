"use client";
import { useEffect, useState } from "react";
import type { ClassDto } from "@/contracts/classes";
import type { StudentDto } from "@/contracts/api";
import {
  createOralRun,
  evaluateOral,
  answerOral,
  undoOral,
  skipOral,
  resumeOral,
  type OralRun,
  type OralResult,
} from "@/core/oral/state";
import { createOralRepository } from "@/local/oral";
import { loadOralBaseline } from "@/features/oral/baseline";
import { Button } from "@/ui/components/button";
import { MathPrompt } from "@/ui/components/math-prompt";
import { getStep } from "@/content/ladder/registry";

export function OralWorkspace({
  ownerId,
  mode,
  detail,
  labels,
}: {
  ownerId: string;
  mode: "demo" | "pilot";
  detail?: { class: ClassDto; students: StudentDto[] };
  labels: Readonly<Record<string, string>>;
}) {
  const [run, setRun] = useState<OralRun>(),
    [selected, setSelected] = useState(detail?.students[0]?.id ?? "");
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [code, setCode] = useState("");
  useEffect(() => {
    let current = true;
    const repo = createOralRepository({ ownerId, mode });
    void repo
      .latest(detail ? `class:${detail.class.id}` : "last")
      .then((value) => {
        if (current) setRun(value);
      })
      .catch(() => {
        if (current) setMessage("Cek lisan tersimpan belum dapat dibaca.");
      })
      .finally(() => repo.close());
    return () => {
      current = false;
    };
  }, [ownerId, mode, detail]);
  async function start() {
    if (!detail || !selected || mode !== "demo") return;
    const student = detail.students.find((s) => s.id === selected && s.active);
    if (!student) return;
    const repo = createOralRepository({ ownerId, mode });
    setBusy(true);
    try {
      const existing = await repo.latest(`student:${student.id}`);
      if (existing && evaluateOral(existing).status !== "complete") {
        setRun(existing);
        setMessage("Pemeriksaan tersimpan dibuka kembali.");
        return;
      }
      const base = await loadOralBaseline(
        { ownerId, mode },
        detail.class.id,
        student.id,
      );
      const value = createOralRun({
        id: crypto.randomUUID(),
        classId: detail.class.id,
        studentId: student.id,
        attendanceNumber: student.attendanceNumber,
        grade: detail.class.grade,
        seed: crypto.getRandomValues(new Uint32Array(1))[0],
        baseline: base.baseline,
        recorded: base.recorded,
        afterSessionOrdinal: base.afterSessionOrdinal,
      });
      await repo.save(value, 0);
      setRun(value);
      setCode("");
      setMessage(
        "Bacakan soal dan catat jawaban lisan siswa. Materi ini untuk mencoba aplikasi, belum diperiksa peninjau materi.",
      );
    } catch {
      setMessage("Cek lisan belum tersimpan. Periksa penyimpanan perangkat.");
    } finally {
      repo.close();
      setBusy(false);
    }
  }
  async function change(next: OralRun) {
    if (!run || next === run) return;
    const repo = createOralRepository({ ownerId, mode });
    setBusy(true);
    try {
      await repo.save(next, run.revision);
      setRun(next);
      setCode("");
      setMessage(
        "Jawaban tersimpan di perangkat ini. Koreksi mengganti jawaban sebelumnya; siswa tidak dihitung dua kali.",
      );
    } catch {
      setMessage(
        "Perubahan belum tersimpan atau ada perubahan lain. Buka ulang sebelum melanjutkan.",
      );
    } finally {
      repo.close();
      setBusy(false);
    }
  }
  async function grade(result: OralResult) {
    if (!run) return;
    const question = evaluateOral(run).question;
    if (!question) return;
    try {
      await change(
        answerOral(run, {
          questionId: question.id,
          result,
          misconceptionCode: result === "incorrect" ? code || null : null,
        }),
      );
    } catch {
      setMessage(
        "Jawaban tidak cocok dengan soal yang aktif. Buka ulang cek lisan.",
      );
    }
  }
  const state = run ? evaluateOral(run) : null;
  return (
    <section
      aria-label="Cek Lisan"
      className="space-y-3 rounded-kartu border border-primary/30 bg-white p-4"
    >
      <h3 className="text-xl font-bold">Cek Lisan</h3>
      <p className="text-sm">
        Bacakan satu soal, dengarkan cara berpikirnya. Tetap tersedia offline.
      </p>
      {detail && (
        <>
          <label className="block">
            Siswa untuk cek lisan
            <select
              aria-label="Siswa untuk cek lisan"
              className="min-h-12 w-full border bg-white px-3"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              {detail.students
                .filter((s) => s.active)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {labels[s.id] ?? `Absen ${s.attendanceNumber}`}
                  </option>
                ))}
            </select>
          </label>
          <Button
            disabled={busy || mode !== "demo"}
            onClick={() => void start()}
          >
            Mulai atau buka cek lisan
          </Button>
        </>
      )}
      {run && state && (
        <>
          <p className="font-bold">
            {labels[run.studentId] ?? `Absen ${run.attendanceNumber}`} ·{" "}
            {state.currentStep ? getStep(state.currentStep).label : "Selesai"}
          </p>
          {state.status === "active" && state.question && (
            <>
              <p className="text-xl">
                <MathPrompt value={state.question.prompt} />
              </p>
              <p>
                Bacakan dengan tenang, lalu tanyakan: “Bagaimana kamu tahu?”
              </p>
              <details>
                <summary className="min-h-12 cursor-pointer">
                  Kunci guru
                </summary>
                {
                  state.question.options.find(
                    (o) => o.label === state.question!.answerKey,
                  )?.text
                }
              </details>
              <label className="block">
                Jika berbeda, jawaban terdekat
                <select
                  aria-label="Jawaban terdekat lisan"
                  className="min-h-12 w-full border px-3"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                >
                  <option value="">
                    Jawaban lain / belum tahu penyebabnya
                  </option>
                  {state.question.options
                    .filter((o) => o.misconceptionCode)
                    .map((o) => (
                      <option key={o.label} value={o.misconceptionCode}>
                        {o.text}
                      </option>
                    ))}
                </select>
              </label>
              <div className="flex flex-wrap gap-2">
                <Button disabled={busy} onClick={() => void grade("correct")}>
                  Benar
                </Button>
                <Button
                  disabled={busy}
                  variant="outline"
                  onClick={() => void grade("incorrect")}
                >
                  Salah
                </Button>
                <Button
                  disabled={busy}
                  variant="outline"
                  onClick={() => void grade("silent")}
                >
                  Diam atau belum tahu
                </Button>
                <Button
                  disabled={busy}
                  variant="outline"
                  onClick={() => void change(skipOral(run))}
                >
                  Lewati siswa
                </Button>
              </div>
            </>
          )}
          {state.status === "skipped" && (
            <>
              <p>Dilewati. Tidak ada observasi untuk ketidakhadiran.</p>
              <Button
                disabled={busy}
                onClick={() => void change(resumeOral(run))}
              >
                Lanjutkan cek lisan
              </Button>
            </>
          )}
          {state.status === "complete" && (
            <p>
              Penempatan lisan:{" "}
              {state.placement?.kind === "step"
                ? getStep(state.placement.stepId).label
                : "Lanjut"}
              . Hasil cek lisan terpisah dari latihan tertulis. Cara penempatan
              ini masih perlu ditinjau sebelum dipakai pada kelas sungguhan.
            </p>
          )}
          <p>
            {state.observationCount} jawaban lisan tersimpan · revisi{" "}
            {run.revision}
          </p>
          <Button
            variant="outline"
            disabled={busy || !run.answers.length}
            onClick={() => void change(undoOral(run))}
          >
            Batalkan jawaban terakhir
          </Button>
        </>
      )}
      <p role="status">{message}</p>
      {mode !== "demo" && (
        <p>
          Untuk mencoba cek lisan, pilih Data contoh. Materi dan aturan ini
          belum disahkan untuk kelas sungguhan.
        </p>
      )}
    </section>
  );
}
