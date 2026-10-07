"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import type { StudentDto } from "@/contracts/api";
import type { LocalScope } from "@/local/scope";
import { createCycleRepository } from "@/local/cycles";
import { createOralRepository } from "@/local/oral";
import { replayOralBaseline } from "@/core/oral/replay";
import type { ComputedLevel } from "@/core/placement/computed-level";
import { deriveTimeline } from "@/features/session/package-session";
import { getStep } from "@/content/ladder/registry";
import { Button } from "@/ui/components/button";
import { MathPrompt } from "@/ui/components/math-prompt";
import { StateNotice } from "@/ui/components/studio";

type Snapshot = Awaited<
  ReturnType<ReturnType<typeof createCycleRepository>["read"]>
>;
type Summary = {
  snapshot?: Snapshot;
  placements: ReadonlyMap<
    string,
    { placement: ComputedLevel | null; oral: boolean }
  >;
};

/** Read the existing timeline; never infer a skill level from an unrelated quiz score. */
export function LearningSummary({
  scope,
  classId,
  students,
  names,
}: {
  scope: LocalScope;
  classId: string;
  students: readonly StudentDto[];
  names: Readonly<Record<string, string>>;
}) {
  const [summary, setSummary] = useState<Summary>();
  const [failed, setFailed] = useState(false);
  const [revision, reload] = useState(0);
  const { ownerId, mode } = scope;
  useEffect(() => {
    let active = true;
    const cycles = createCycleRepository({ ownerId, mode });
    const oral = createOralRepository({ ownerId, mode });
    void (async () => {
      const latest = (await cycles.list(classId)).at(-1);
      if (latest) {
        const snapshot = await cycles.read(latest.id);
        const derived = deriveTimeline(
          snapshot.bundles,
          snapshot.parent.context,
          snapshot.cycle,
          snapshot.oralRuns,
        );
        return {
          snapshot,
          placements: new Map(
            derived.placements.map((s) => [
              s.studentId,
              {
                placement: s.displayed,
                oral: s.replay.belowRange.kind === "below-range",
              },
            ]),
          ),
        };
      }
      const runs = await oral.list(classId);
      return {
        placements: new Map(
          students.map((s) => [
            s.id,
            {
              placement: replayOralBaseline(runs, s.id).placement,
              oral: false,
            },
          ]),
        ),
      };
    })()
      .then((value) => {
        if (active) {
          setSummary(value);
          setFailed(false);
        }
      })
      .catch(() => {
        if (active) setFailed(true);
      })
      .finally(() => {
        cycles.close();
        oral.close();
      });
    return () => {
      active = false;
    };
  }, [ownerId, mode, classId, students, revision]);
  const practice = `/guru/latihan?class=${classId}&mode=${mode}`;
  if (failed)
    return (
      <StateNotice
        kind="error"
        title="Hasil tersimpan belum dapat dibuka"
        action={
          <Button onClick={() => reload((n) => n + 1)}>Coba buka lagi</Button>
        }
      >
        Buka pada perangkat yang dipakai memeriksa siswa. Jawaban tidak dihapus.
      </StateNotice>
    );
  if (!summary) return <p role="status">Membuka hasil pemeriksaan siswa…</p>;
  const active = students.filter((s) => s.active);
  const checked = active.filter(
    (s) => summary.placements.get(s.id)?.placement,
  ).length;
  const snapshot = summary.snapshot;
  const completed = Boolean(snapshot?.cycle.assessmentRevision);
  return (
    <section aria-label="Kebutuhan belajar kelas" className="space-y-4">
      <div className="learning-instruction">
        <h2 className="text-xl font-bold">
          Apa yang perlu dipelajari berikutnya?
        </h2>
        <p>
          {checked
            ? `${checked} dari ${active.length} siswa memiliki hasil cek kemampuan.`
            : "Belum ada hasil cek kemampuan pada perangkat ini."}
        </p>
        {snapshot && (
          <p className="text-sm">
            Sesi {snapshot.cycle.ordinal} ·{" "}
            {snapshot.cycle.assessmentRevision
              ? "hasil sudah disimpan"
              : "hasil sementara; sesi belum selesai dinilai"}
          </p>
        )}
        <Button asChild variant="outline">
          <Link
            href={
              completed
                ? `${practice}#teacher-prepare`
                : checked || mode === "demo"
                  ? practice
                  : "/guru/asesmen"
            }
          >
            {completed
              ? "Siapkan pertemuan berikutnya"
              : checked
                ? "Lanjutkan belajar berkelompok"
                : mode === "demo"
                  ? "Siapkan cek kemampuan"
                  : "Lihat hasil asesmen"}
          </Link>
        </Button>
      </div>
      {!checked && (
        <p className="text-sm">
          Hasil soal pilihan Anda tersedia di Asesmen & Hasil. Pembagian
          kelompok berdasarkan kemampuan saat ini dapat dicoba dengan data
          contoh. Untuk mempelajari alurnya,{" "}
          <Link
            className="font-semibold text-primary underline"
            href={practice}
          >
            buka belajar berkelompok
          </Link>
          .
        </p>
      )}
      {checked > 0 && (
        <ul className="learning-students">
          {active.map((s) => {
            const result = summary.placements.get(s.id);
            const placement = result?.placement;
            const card = snapshot?.parent.cards.find(
              (c) => c.studentId === s.id,
            );
            const absent = snapshot?.cycle.absentStudentIds.includes(s.id);
            return (
              <li key={s.id}>
                <details>
                  <summary className="learning-student-summary">
                    <span className="learning-student-number" aria-hidden>
                      {String(s.attendanceNumber).padStart(2, "0")}
                    </span>
                    <span className="min-w-0 flex-1">
                      <strong>
                        {names[s.id] ?? `Absen ${s.attendanceNumber}`}
                      </strong>
                      <span className="block text-sm">
                        {result?.oral
                          ? "Perlu diperiksa secara lisan"
                          : placement?.kind === "step"
                            ? `Latihan berikutnya: ${getStep(placement.stepId).label}`
                            : placement?.kind === "lanjut"
                              ? "Siap mencoba materi lanjutan"
                              : "Belum cukup informasi"}
                      </span>
                      <span className="block text-sm font-semibold text-primary">
                        Lihat rincian
                      </span>
                    </span>
                    <ChevronDown size={20} className="shrink-0" aria-hidden />
                  </summary>
                  <div className="space-y-3 p-4">
                    {absent && (
                      <p>
                        Tidak hadir pada sesi terakhir. Hasil sebelumnya tetap
                        disimpan.
                      </p>
                    )}
                    {card && snapshot ? (
                      <>
                        <p>
                          Jawaban cek pada sesi {snapshot.cycle.ordinal}.
                          Gunakan bukti ini untuk menentukan bantuan, tanpa
                          membandingkan anak dengan temannya.
                        </p>
                        <ol className="space-y-2">
                          {snapshot.package.assessment.map((q, i) => (
                            <li key={q.id}>
                              <p className="font-semibold">
                                Soal {i + 1} · {getStep(q.stepId).label}
                              </p>
                              <p>
                                <MathPrompt value={q.prompt} />
                              </p>
                              <p>
                                {card.choices[i] === "missing"
                                  ? "belum terbaca"
                                  : card.choices[i] === "?"
                                    ? "belum tahu"
                                    : `jawaban ${card.choices[i] ?? "belum masuk"}`}{" "}
                                · Kunci {q.answerKey}
                              </p>
                            </li>
                          ))}
                        </ol>
                      </>
                    ) : (
                      <p>
                        {placement
                          ? "Ringkasan memakai pemeriksaan yang sudah tersimpan. Buka sesi untuk melihat atau melanjutkan pemeriksaan."
                          : "Periksa jawaban siswa terlebih dahulu. Belum ada hasil tidak berarti siswa belum mampu."}
                      </p>
                    )}
                    <Link
                      className="inline-flex min-h-12 items-center font-semibold text-primary underline"
                      href={
                        result?.oral ? `${practice}#teacher-oral` : practice
                      }
                    >
                      {result?.oral
                        ? "Buka cek lisan"
                        : "Buka kegiatan dan jawaban siswa"}
                    </Link>
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-sm text-muted-foreground">
        Ringkasan hanya untuk guru dan memakai hasil yang tersimpan pada
        perangkat ini.
      </p>
    </section>
  );
}
