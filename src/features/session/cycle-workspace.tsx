"use client";
import { useEffect, useState, type FormEvent } from "react";
import type { ClassDto } from "@/contracts/classes";
import type { StudentDto } from "@/contracts/api";
import type { LocalScope } from "@/local/scope";
import { createCycleRepository } from "@/local/cycles";
import { createPackageRepository } from "@/local/packages";
import { createAssessmentRepository } from "@/local/assessments";
import { loadOralBaseline } from "@/features/oral/baseline";
import {
  closeCycle,
  setAttendance,
  freezeCycleGroups,
  type Cycle,
} from "@/core/session/cycle";
import { CARD_CHOICES, type CardChoice } from "@/core/assessment/card-response";
import { openingFromPackage } from "@/core/package/opening";
import { publicLesson } from "@/contracts/lesson";
import { deriveTimeline } from "./package-session";
import { PresentationControls } from "./presentation-controls";
import { ScanCapture } from "@/features/scanner/capture";
import { MathPrompt } from "@/ui/components/math-prompt";
import { Button } from "@/ui/components/button";
import Link from "next/link";
import type { TeacherPackage } from "@/core/package/build";
import { getStep } from "@/content/ladder/registry";

type Loaded = Awaited<
  ReturnType<ReturnType<typeof createCycleRepository>["read"]>
>;
type Draft = {
  studentId: string;
  choices: CardChoice[];
  revision: number;
  source: "omr" | "manual" | "demo";
};
const field = "min-h-12 rounded-input border bg-white p-2";
export function CycleWorkspace({
  scope,
  detail,
  preparedPackage,
  onSessionChange,
}: {
  scope: LocalScope;
  detail?: { class: ClassDto; students: StudentDto[] };
  preparedPackage?: TeacherPackage;
  onSessionChange: (
    value: { package: TeacherPackage; sessionId: string } | undefined,
  ) => void;
}) {
  const [data, setData] = useState<Loaded>(),
    [draft, setDraft] = useState<Draft>(),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [ackMissing, setAckMissing] = useState(false);
  const { ownerId, mode } = scope;
  const [syncRevision, setSyncRevision] = useState(0);
  const [legacyHistory, setLegacyHistory] = useState(false);
  useEffect(() => {
    onSessionChange(
      data && !data.cycle.classEnded
        ? { package: data.package, sessionId: data.cycle.id }
        : undefined,
    );
  }, [data, onSessionChange]);
  useEffect(() => {
    const refresh = () => setSyncRevision((v) => v + 1);
    window.addEventListener("pn-sync-restored", refresh);
    return () => window.removeEventListener("pn-sync-restored", refresh);
  }, []);
  useEffect(() => {
    let active = true;
    const repo = createCycleRepository({ ownerId, mode });
    void repo
      .list(detail?.class.id)
      .then(async (values) => {
        const last = values.at(-1);
        if (last) {
          const result = await repo.read(last.id);
          if (active) setData(result);
        }
      })
      .catch(() => {
        if (active)
          setMessage("Sesi lokal belum dapat dibuka; data tidak dihapus.");
      })
      .finally(() => repo.close());
    return () => {
      active = false;
    };
  }, [ownerId, mode, detail?.class.id, syncRevision]);
  async function refresh(id = data?.cycle.id) {
    if (!id) return;
    const repo = createCycleRepository(scope);
    try {
      setData(await repo.read(id));
    } finally {
      repo.close();
    }
  }
  async function start() {
    if (!detail) return;
    setBusy(true);
    const packages = createPackageRepository(scope),
      repo = createCycleRepository(scope);
    try {
      const pkg = preparedPackage
        ? await packages.read(preparedPackage.id)
        : undefined;
      if (!pkg || pkg.classId !== detail.class.id) {
        setMessage("Siapkan soal pada langkah 1 terlebih dahulu.");
        return;
      }
      const baselines =
        detail.class.grade <= 3
          ? (
              await Promise.all(
                detail.students
                  .filter((s) => s.active)
                  .map(async (s) => {
                    const value = await loadOralBaseline(
                      scope,
                      detail.class.id,
                      s.id,
                    );
                    return value.baseline && value.recorded
                      ? {
                          studentId: s.id,
                          target: pkg.target,
                          mastery: value.baseline,
                          displayed: {
                            kind: "step" as const,
                            stepId: value.recorded,
                          },
                        }
                      : undefined;
                  }),
              )
            ).filter((v) => v !== undefined)
          : undefined;
      const cycle = await repo.start({
        id: crypto.randomUUID(),
        packageId: pkg.id,
        classroom: detail.class,
        students: detail.students,
        baselines,
      });
      setData(await repo.read(cycle.id));
      setDraft(undefined);
      setAckMissing(false);
      setLegacyHistory(false);
      setMessage(
        "Sesi baru siap, belum ada jawaban. Soal dan kelas dikunci selama sesi ini.",
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : "";
      setLegacyHistory(
        reason === "Keep PRELIM and fresh-class histories separate",
      );
      setMessage(
        reason === "Keep PRELIM and fresh-class histories separate"
          ? "Kelas ini sudah dipakai untuk contoh sesi dengan jawaban terisi. Lanjutkan contoh itu, atau buat kelas contoh baru untuk memakai soal Anda sendiri."
          : reason === "Finalize previous assessment first"
            ? "Sesi sebelumnya belum selesai. Tutup sesi dan simpan hasil penilaian di bawah sebelum memulai lagi."
            : reason === "Prepare a new package for each session"
              ? "Soal ini sudah digunakan. Buat latihan baru pada langkah 1 sebelum memulai sesi berikutnya."
              : reason === "Use weekly package after initial placement"
                ? "Kelas ini sudah menjalani cek pertama. Pilih Cek lanjutan pada langkah 1."
                : "Sesi belum dimulai. Periksa soal dan penyimpanan perangkat, lalu coba lagi.",
      );
    } finally {
      repo.close();
      packages.close();
      setBusy(false);
    }
  }
  async function change(value: Cycle) {
    if (!data) return;
    setBusy(true);
    const previous = data;
    setData({ ...data, cycle: value });
    const repo = createCycleRepository(scope);
    try {
      await repo.save(value, data.cycle.revision);
      await refresh();
      setMessage(
        value.classEnded
          ? "Kegiatan kelas selesai. Simpan penilaian di bawah; jawaban yang terlambat masih bisa diperiksa."
          : "Perubahan tersimpan di perangkat ini.",
      );
    } catch {
      setData(previous);
      setMessage(
        "Perubahan belum tersimpan. Muat ulang bila ada revisi dari tab lain.",
      );
    } finally {
      repo.close();
      setBusy(false);
    }
  }
  function review(
    studentId?: string,
    choices?: readonly CardChoice[],
    source: Draft["source"] = "manual",
  ) {
    if (!data) return;
    const id = studentId ?? data.parent.context.roster[0].id;
    const saved = data.parent.cards.find((c) => c.studentId === id);
    setDraft({
      studentId: id,
      choices: choices
        ? [...choices]
        : saved
          ? [...saved.choices]
          : data.package.assessment.map(() => "missing"),
      revision: choices ? 0 : (saved?.graded.revision ?? 0),
      source,
    });
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!data || !draft) return;
    setBusy(true);
    const repo = createAssessmentRepository(scope);
    try {
      const result = await repo.save(data.cycle.id, {
        studentId: draft.studentId,
        choices: draft.choices,
        expectedRevision: draft.revision,
        source: draft.source,
      });
      if (result.status === "duplicate") {
        setDraft({ ...draft, revision: result.card.graded.revision });
        setMessage(
          "Kartu sudah masuk. Ganti hasil cek untuk koreksi atau lewati.",
        );
      } else if (result.status === "conflict")
        setMessage("Revisi berbeda. Muat ulang sebelum mengganti hasil.");
      else {
        await refresh();
        setDraft(undefined);
        setMessage("Hasil cek tersimpan lokal.");
      }
    } catch {
      setMessage(
        "Belum tersimpan. Isian tetap di formulir; periksa ruang penyimpanan.",
      );
    } finally {
      repo.close();
      setBusy(false);
    }
  }
  async function finalize() {
    if (!data) return;
    setBusy(true);
    const repo = createCycleRepository(scope);
    try {
      const result = await repo.finalize(
        data.cycle.id,
        data.cycle.revision,
        ackMissing,
      );
      await refresh();
      setMessage(
        `Penilaian tersimpan. ${result.pending} hasil belum lengkap. Anda masih dapat mengoreksi jawaban sesi ini.`,
      );
    } catch {
      setMessage(
        "Penilaian belum tersimpan. Tutup kegiatan kelas dan centang persetujuan bila ada jawaban yang belum masuk, lalu coba lagi.",
      );
    } finally {
      repo.close();
      setBusy(false);
    }
  }
  const derived = data
    ? deriveTimeline(
        data.bundles,
        data.parent.context,
        data.cycle,
        data.oralRuns,
      )
    : undefined;
  const groups = data?.cycle.groups ?? [];
  const context = data?.parent.context;
  return (
    <section
      aria-label="Siklus kelas"
      className="space-y-4 rounded-kartu border-2 border-primary p-4"
    >
      <h3 className="text-xl font-bold">Coba sesi mengajar</h3>
      <p>
        Sesi memakai soal dari langkah 1. Mulai sesi dahulu, lalu sambungkan
        layar kelas bila Anda memakai proyektor, TV atau papan interaktif.
      </p>
      {(!data || data.cycle.assessmentRevision > 0) && (
        <Button
          disabled={
            busy ||
            !detail ||
            mode !== "demo" ||
            !preparedPackage ||
            preparedPackage.frozen
          }
          onClick={() => void start()}
        >
          {data ? "Mulai sesi berikutnya" : "Mulai sesi dengan soal ini"}
        </Button>
      )}
      {data && context && derived && (
        <>
          <p data-testid="cycle-status" className="practice-feedback">
            Sesi {data.cycle.ordinal} ·{" "}
            {data.cycle.classEnded ? "kelas ditutup" : "kelas berlangsung"} ·{" "}
            {data.cycle.assessmentRevision
              ? "penilaian tersimpan"
              : "penilaian belum disimpan"}
          </p>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() =>
              void refresh().catch(() =>
                setMessage("Sesi belum dapat dimuat ulang."),
              )
            }
          >
            Muat ulang sesi
          </Button>
          <PresentationControls
            key={data.cycle.id}
            scope={scope}
            classId={context.classroom.id}
            sessionId={context.session.sessionId}
            grade={context.classroom.grade}
            roster={context.roster.map((s) => ({
              ...s,
              active: !data.cycle.absentStudentIds.includes(s.id),
            }))}
            assessmentContext={context}
            sessionPackage={data.package}
            lesson={publicLesson(openingFromPackage(data.package))}
            complete={groups.length > 0}
            rotationGroups={groups}
            groups={groups.map((g) => ({
              id: g.id,
              label: g.label,
              attendanceNumbers: g.members.map((s) => s.attendanceNumber),
            }))}
            strategyCodes={Object.fromEntries(
              groups.map((g) => {
                const codes = data.parent.cards
                  .filter((c) =>
                    g.members.some((m) => m.studentId === c.studentId),
                  )
                  .flatMap((c) =>
                    c.choices.flatMap(
                      (choice, i) =>
                        data.package.assessment[i]?.options.find(
                          (o) => o.label === choice,
                        )?.misconceptionCode ?? [],
                    ),
                  );
                return [g.id, codes[0] ?? "generic-error"];
              }),
            )}
            onEvidenceSaved={() => {
              void refresh().catch(() =>
                setMessage("Hasil tersimpan; muat ulang ringkasan."),
              );
            }}
          />
          <details>
            <summary className="min-h-12 cursor-pointer font-bold">
              Kehadiran sesi
            </summary>
            <p>
              Tidak hadir tetap tanpa jawaban. Kehadiran dikunci bersama
              kelompok.
            </p>
            <div className="grid grid-cols-2">
              {context.roster.map((s) => (
                <label key={s.id} className="flex min-h-12 items-center gap-2">
                  <input
                    aria-label={`Tidak hadir absen ${s.attendanceNumber}`}
                    type="checkbox"
                    disabled={busy || !!groups.length || data.cycle.classEnded}
                    checked={data.cycle.absentStudentIds.includes(s.id)}
                    onChange={(e) => {
                      void change(
                        setAttendance(
                          data.cycle,
                          e.target.checked
                            ? [...data.cycle.absentStudentIds, s.id]
                            : data.cycle.absentStudentIds.filter(
                                (id) => id !== s.id,
                              ),
                          context.roster.map((s) => s.id),
                        ),
                      );
                    }}
                  />
                  Absen {s.attendanceNumber}
                </label>
              ))}
            </div>
          </details>
          {!context.oralOnly && (
            <section aria-label="Hasil cek sesi" className="space-y-3">
              <h4 className="font-bold">
                {data.package.variant === "initial"
                  ? "Cek Awal · kartu A5"
                  : "Cek Mingguan"}
              </h4>
              <p data-testid="cycle-scan-count">
                {data.parent.cards.length}/{context.roster.length} kartu
                tersimpan · {data.cycle.absentStudentIds.length} tidak hadir
              </p>
              <ScanCapture
                kind={data.package.variant === "initial" ? "initial" : "weekly"}
                roster={context.roster.map((s) => s.attendanceNumber)}
                onManual={() => review()}
                onRead={(r, source) =>
                  review(
                    context.roster.find(
                      (s) => s.attendanceNumber === r.attendanceNumber,
                    )?.id,
                    r.answers.map((a) => a.result),
                    source,
                  )
                }
              />
              {draft && (
                <form
                  aria-label="Review cek sesi"
                  className="space-y-3"
                  onSubmit={save}
                >
                  <label>
                    Absen{" "}
                    <select
                      className={field}
                      aria-label="Absen cek sesi"
                      value={draft.studentId}
                      onChange={(e) => review(e.target.value)}
                    >
                      {context.roster.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.attendanceNumber}
                        </option>
                      ))}
                    </select>
                  </label>
                  {draft.choices.map((c, i) => (
                    <label key={i} className="block">
                      Baris {i + 1}{" "}
                      <select
                        className={field}
                        aria-label={`Cek baris ${i + 1}`}
                        value={c}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            source: "manual",
                            choices: draft.choices.map((v, j) =>
                              j === i ? (e.target.value as CardChoice) : v,
                            ),
                          })
                        }
                      >
                        {CARD_CHOICES.map((choice) => (
                          <option key={choice} value={choice}>
                            {choice === "missing" ? "Belum terbaca" : choice}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                  <Button type="submit" disabled={busy}>
                    {draft.revision ? "Ganti hasil cek" : "Simpan hasil cek"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDraft(undefined)}
                  >
                    Lewati hasil cek
                  </Button>
                </form>
              )}
              <details>
                <summary className="min-h-12 cursor-pointer">
                  Soal dan kunci cek guru
                </summary>
                <ol>
                  {data.package.assessment.map((q, i) => (
                    <li
                      key={q.id}
                      data-testid={`teacher-check-${i + 1}`}
                      data-answer={q.answerKey}
                    >
                      {i + 1}. <MathPrompt value={q.prompt} /> · Kunci{" "}
                      {q.answerKey}
                    </li>
                  ))}
                </ol>
              </details>
              <details>
                <summary className="min-h-12 cursor-pointer">
                  Koreksi cek tersimpan
                </summary>
                {data.parent.cards.map((c) => (
                  <Button
                    key={c.id}
                    variant="outline"
                    onClick={() => review(c.studentId)}
                  >
                    Koreksi cek absen{" "}
                    {
                      context.roster.find((s) => s.id === c.studentId)
                        ?.attendanceNumber
                    }
                  </Button>
                ))}
              </details>
            </section>
          )}
          {context.oralOnly && (
            <p>
              Cek mingguan kelas 1–3 dilakukan lisan bersama guru. Penempatan
              dari Cek Lisan yang selesai. Siswa yang belum diperiksa tetap
              menunggu.
            </p>
          )}
          <section
            aria-label="Penempatan dan kelompok sesi"
            className="space-y-2"
          >
            <h4 className="font-bold">Bagi kegiatan sesuai kebutuhan siswa</h4>
            {!derived.ready && !groups.length && (
              <p className="text-sm">
                Periksa jawaban siswa yang hadir terlebih dahulu. Setelah hasil
                cek lengkap, pembagian kelompok dapat digunakan.
              </p>
            )}
            <details>
              <summary className="min-h-12 cursor-pointer font-semibold">
                Lihat kebutuhan belajar per siswa · hanya untuk guru
              </summary>
              {derived.placements
                .filter((p) => p.active)
                .map((p) => (
                  <p key={p.studentId}>
                    Absen {p.attendanceNumber}:{" "}
                    {p.displayed?.kind === "step"
                      ? getStep(p.displayed.stepId).label
                      : p.displayed?.kind === "lanjut"
                        ? "Lanjut"
                        : "belum diperiksa"}
                    {p.replay.belowRange.kind === "below-range"
                      ? " · di bawah jangkauan cek; lanjutkan Cek Lisan"
                      : ""}
                  </p>
                ))}
            </details>
            {!groups.length && (
              <Button
                disabled={
                  busy ||
                  !derived.ready ||
                  !derived.grouping.groups.length ||
                  data.cycle.classEnded
                }
                onClick={() =>
                  void change(
                    freezeCycleGroups(data.cycle, derived.grouping.groups),
                  )
                }
              >
                Gunakan pembagian kelompok ini
              </Button>
            )}
            {groups.map((g) => (
              <p key={g.id}>
                {g.label} · {g.members.length} siswa · aktivitas{" "}
                {getStep(g.activityStep).label}
              </p>
            ))}
          </section>
          {!data.cycle.classEnded && (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => void change(closeCycle(data.cycle))}
            >
              Tutup kelas
            </Button>
          )}
          {data.cycle.classEnded && !data.cycle.assessmentRevision && (
            <div className="space-y-3">
              <label className="flex min-h-12 items-center gap-2">
                <input
                  type="checkbox"
                  checked={ackMissing}
                  onChange={(e) => setAckMissing(e.target.checked)}
                />
                Selesaikan penilaian meskipun ada jawaban yang belum masuk;
                jawaban tidak diisi otomatis
              </label>
              <Button disabled={busy} onClick={() => void finalize()}>
                Simpan penilaian sesi
              </Button>
            </div>
          )}
          {!!data.cycle.assessmentRevision && (
            <Link
              className="inline-flex min-h-12 items-center font-semibold text-primary underline"
              href="/guru"
            >
              Selesai · kembali ke beranda
            </Link>
          )}
        </>
      )}
      {message && (
        <p role="status" className="practice-feedback">
          {message}
        </p>
      )}
      {legacyHistory && (
        <Link
          className="inline-flex min-h-12 items-center font-semibold text-primary underline"
          href={`/guru/simulasi?mode=${mode}${detail ? `&class=${detail.class.id}` : ""}`}
        >
          Lanjutkan contoh sesi yang sudah ada
        </Link>
      )}
    </section>
  );
}
