"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTeacher } from "./app-context";
import { classDetailSchema } from "@/contracts/classes";
import type { StudentDto } from "@/contracts/api";
import type { GroupLesson } from "@/contracts/group-lesson";
import type { CompetencyMapping } from "@/contracts/learning-evidence";
import {
  groupLessonCall,
  readGroupLesson,
  libraryV2Call,
  readLearningResult,
} from "@/local/learning-client";
import { libraryCache } from "@/local/library";
import { classPresence } from "@/local/class-presence";
import { createNameRepository } from "@/local/names";
import { runDetailV2Schema, type LibraryRunV2 } from "@/contracts/library";
import { GroupEvidenceSummary } from "./group-evidence-summary";
import { GroupPreparation } from "./group-preparation";
import { jakartaDate } from "@/features/library/client";
import { PageHeader, StateNotice } from "@/ui/components/studio";
import { Button } from "@/ui/components/button";
import { confirmAction } from "@/ui/components/confirm";
import { GroupDrafts } from "./group-drafts";
import { useDraftGuard } from "@/ui/use-draft-guard";
import { GroupTeacherBoard } from "@/features/library/group-board";
import { clampGroupCount } from "@/ui/group-count";
import { GroupFlowSteps } from "./group-flow-steps";
import { GroupCardGrid } from "./group-card-grid";
import {
  GroupAssignmentCard,
  methodLabel,
  type AssignmentInput,
} from "./group-assignment-card";
export function GroupWorkspace({
  classId = "",
  lessonId = "",
}: {
  classId?: string;
  lessonId?: string;
}) {
  const { classes, state, scope, offline, canMutate } = useTeacher(),
    router = useRouter();
  const [cls, setClass] = useState(classId || classes[0]?.id || ""),
    [students, setStudents] = useState<StudentDto[]>([]),
    [names, setNames] = useState<Record<string, string>>({}),
    [absent, setAbsent] = useState<string[]>([]),
    [competency, setCompetency] = useState<CompetencyMapping>(null),
    [count, setCount] = useState("1"),
    [source, setSource] = useState<"evidence" | "random">("random"),
    [lesson, setLesson] = useState<GroupLesson>(),
    [groups, setGroups] = useState<GroupLesson["groups"]>([]),
    [assignments, setAssignments] = useState<AssignmentInput[]>([]),
    [runs, setRuns] = useState<Record<string, LibraryRunV2>>({}),
    [printed, setPrinted] = useState<Record<string, boolean>>({}),
    [phase, setPhase] = useState<"prepare" | "edit" | "ready">("prepare"),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [message, setMessage] = useState(""),
    [dirty, setDirty] = useState(false),
    [preview, setPreview] = useState<string>(),
    [move, setMove] = useState<{
      studentId: string;
      from: string;
      to: string;
    }>();
  useDraftGuard(dirty);
  const lock = useRef(false),
    id = useRef(lessonId || crypto.randomUUID()),
    seed = useRef(crypto.randomUUID()),
    heading = useRef<HTMLHeadingElement>(null);
  const date = jakartaDate(),
    present = students.filter((s) => s.active && !absent.includes(s.id)),
    readyCollections = state.collections.filter((c) => c.status === "ready");
  const apply = useCallback((next: GroupLesson) => {
    setLesson(next);
    setGroups(next.groups);
    setAssignments(
      next.assignments.map(
        ({ id, groupId, method, collectionId, version }) => ({
          id,
          groupId,
          method,
          collectionId,
          version,
        }),
      ),
    );
    setCompetency(next.competency);
    setAbsent(next.absentStudentIds);
    setSource(next.groupingSource === "random" ? "random" : "evidence");
    setCount(String(next.groups.length));
    setDirty(false);
  }, []);
  const load = useCallback(async () => {
    if (!cls) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      let data;
      if (!navigator.onLine) {
        data = await libraryCache(scope, "classDetail", cls);
        if (!data) throw new Error("OFFLINE");
      } else {
        const response = await fetch(`/api/v1/classes/${cls}`, {
          cache: "no-store",
        });
        if (!response.ok) throw new Error();
        data = classDetailSchema.parse(await response.json());
        await libraryCache(scope, "classDetail", cls, data).catch(
          () => undefined,
        );
      }
      setStudents(data.students.filter((s) => s.active));
      const presence = await classPresence(scope, cls, date);
      setAbsent(presence);
      if (!lessonId)
        setCount(
          String(
            Math.max(
              1,
              Math.min(
                6,
                Math.ceil(
                  data.students.filter(
                    (s) => s.active && !presence.includes(s.id),
                  ).length / 6,
                ),
              ),
            ),
          ),
        );
      const repo = createNameRepository(scope);
      try {
        setNames(
          Object.fromEntries(
            (await repo.readAll()).map((n) => [n.studentId, n.displayName]),
          ),
        );
      } finally {
        repo.close();
      }
      if (lessonId) {
        const loaded = await readGroupLesson(scope, lessonId);
        apply(loaded.lesson);
        const details = await Promise.all(
          loaded.lesson.assignments.map(async (a) =>
            readLearningResult(scope, { source: "library", id: a.runId }).then(
              (result) => {
                if (result.source !== "library")
                  throw new Error("INVALID_RESULT");
                return result.detail;
              },
            ),
          ),
        );
        setRuns(Object.fromEntries(details.map((d) => [d.run.id, d.run])));
        setPhase("edit");
        if (loaded.cached)
          setMessage(
            "Sambungan terputus. Menampilkan data terakhir yang tersimpan.",
          );
      }
    } catch {
      setMessage(
        "Kelas dan kegiatan belum dapat dimuat. Periksa sambungan lalu coba lagi.",
      );
    } finally {
      setLoading(false);
    }
  }, [cls, scope, date, lessonId, apply]);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);
  const reloadLesson = useCallback(async () => {
    if (!lesson) return;
    const next = await groupLessonCall({ action: "detail", id: lesson.id });
    apply(next);
  }, [lesson, apply]);
  useEffect(() => {
    if (lesson?.status !== "active") return;
    const timer = setInterval(() => {
      if (!lock.current)
        void reloadLesson().catch(() =>
          setMessage("Status belum diperbarui. Periksa sambungan."),
        );
    }, 10000);
    return () => clearInterval(timer);
  }, [lesson?.status, reloadLesson]);
  useEffect(() => {
    heading.current?.focus();
  }, [phase]);
  async function execute(work: () => Promise<void>) {
    if (lock.current || offline || !canMutate) return;
    lock.current = true;
    setBusy(true);
    setMessage("");
    try {
      await work();
    } catch {
      setMessage(
        "Perubahan belum tersimpan. Pilihan Anda tetap ada. Periksa sambungan atau muat ulang kegiatan, lalu coba lagi.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function prepare() {
    await execute(async () => {
      if (
        lesson &&
        !(await confirmAction({
          title: "Ganti pembagian?",
          consequence: "Pembagian dan pilihan kegiatan akan diganti.",
          confirmLabel: "Ganti pembagian",
        }))
      )
        return;
      if (lesson) {
        id.current = crypto.randomUUID();
        seed.current = crypto.randomUUID();
      }
      const next = await groupLessonCall({
        action: "prepare",
        id: id.current,
        classId: cls,
        date,
        competency,
        absentStudentIds: absent,
        groupCount: clampGroupCount(count, present.length),
        seed: seed.current,
        source: competency ? source : "random",
      });
      apply(next);
      setRuns({});
      setPrinted({});
      setPhase("edit");
      router.replace(`/guru/latihan?class=${cls}&lesson=${next.id}`);
    });
  }
  function updateAssignment(groupId: string, update: Partial<AssignmentInput>) {
    setAssignments((old) => {
      const existing = old.find((a) => a.groupId === groupId);
      const next = existing
        ? { ...existing, ...update, id: crypto.randomUUID() }
        : {
            id: crypto.randomUUID(),
            groupId,
            method: "teacher" as const,
            collectionId: "",
            version: 1,
            ...update,
          };
      return [...old.filter((a) => a.groupId !== groupId), next];
    });
    setDirty(true);
    setPrinted({});
    setRuns({});
  }
  function commitMove(studentId: string, from: string, to: string) {
    if (!to || from === to) return;
    setGroups((old) =>
      old.map((group) =>
        group.id === from
          ? {
              ...group,
              studentIds: group.studentIds.filter((id) => id !== studentId),
            }
          : group.id === to
            ? { ...group, studentIds: [...group.studentIds, studentId] }
            : group,
      ),
    );
    setAssignments((old) =>
      old.map((a) =>
        a.groupId === from || a.groupId === to
          ? { ...a, id: crypto.randomUUID() }
          : a,
      ),
    );
    setMove(undefined);
    setDirty(true);
    setRuns({});
    setPrinted({});
  }
  function completeAssignment(assignmentId: string, revision: number) {
    if (!lesson) return;
    void execute(async () =>
      apply(
        await groupLessonCall({
          action: "complete-assignment",
          id: lesson.id,
          assignmentId,
          assignmentRevision: revision,
        }),
      ),
    );
  }
  const problems = groups.flatMap((g) => {
    const a = assignments.find((a) => a.groupId === g.id),
      c = readyCollections.find((c) => c.id === a?.collectionId);
    if (!g.studentIds.length) return [`${g.label}: belum ada anggota.`];
    if (!a || !c)
      return [`${g.label}: pilih cara belajar dan soal siap digunakan.`];
    if (a.version !== c.version)
      return [`${g.label}: versi soal berubah. Pilih kembali kumpulan.`];
    if (a.method === "cards" && c.document.kind !== "cards")
      return [
        `${g.label}: kumpulan ini memakai alat interaktif. Untuk kartu, pilih soal pilihan ganda.`,
      ];
    return [];
  });
  if (assignments.filter((a) => a.method === "board").length > 1)
    problems.push(
      "Satu layar hanya dapat dipakai satu kelompok. Ganti cara belajar kelompok lainnya.",
    );
  async function save() {
    await execute(async () => {
      if (!lesson || problems.length) return;
      const next = await groupLessonCall({
        action: "save",
        id: lesson.id,
        revision: lesson.revision,
        seed: lesson.seed,
        groupingSource: dirty ? "edited" : lesson.groupingSource,
        groups,
        assignments,
      });
      apply(next);
      const details = await Promise.all(
        next.assignments.map(async (a) =>
          runDetailV2Schema.parse(
            await libraryV2Call({ action: "detail", id: a.runId }),
          ),
        ),
      );
      setRuns(Object.fromEntries(details.map((d) => [d.run.id, d.run])));
      setPrinted({});
      setPhase("ready");
      setMessage(
        `Siap. ${next.assignments.length} kelompok sudah punya cara belajar dan soal. Periksa lembar soal dan kartu di bawah, lalu pilih Mulai kegiatan.`,
      );
      heading.current?.focus();
    });
  }
  async function begin() {
    await execute(async () => {
      if (!lesson || dirty) return;
      const next = await groupLessonCall({
        action: "begin",
        id: lesson.id,
        revision: lesson.revision,
      });
      apply(next);
      setPhase("edit");
    });
  }
  async function close() {
    await execute(async () => {
      if (
        !lesson ||
        !(await confirmAction({
          title: "Akhiri kegiatan kelas?",
          consequence:
            "Kegiatan kelas akan selesai. Jawaban kartu yang belum masuk dapat dilengkapi nanti.",
          confirmLabel: "Akhiri kegiatan kelas",
        }))
      )
        return;
      apply(
        await groupLessonCall({
          action: "close",
          id: lesson.id,
          revision: lesson.revision,
        }),
      );
      router.push(`/guru/hasil/${lesson.id}?source=group_lesson`);
    });
  }
  if (loading)
    return <StateNotice kind="loading" title="Memuat kelas dan soal…" />;
  if (!classes.length)
    return (
      <StateNotice
        title="Tambahkan kelas untuk memulai"
        action={
          <Button asChild>
            <Link href="/guru/kelas">Tambahkan kelas</Link>
          </Button>
        }
      />
    );
  if (!students.length && message)
    return (
      <StateNotice
        kind="error"
        title={message}
        action={<Button onClick={() => void load()}>Coba lagi</Button>}
      />
    );

  return (
    <div className="space-y-6">
      <Link
        className="inline-flex min-h-12 items-center text-primary"
        href={`/guru/kelas/${cls}`}
      >
        Kembali ke kelas
      </Link>
      <PageHeader
        title={
          lesson?.status === "active"
            ? "Kegiatan kelompok"
            : lesson?.status === "closed"
              ? "Kegiatan selesai"
              : "Siapkan kelompok"
        }
        description="Bagi siswa, pilih cara belajar dan soal, lalu mulai bersama."
      />
      {(!lesson || lesson.status === "draft") && (
        <GroupFlowSteps
          phase={phase}
          groupCount={groups.length || Number.parseInt(count, 10) || 0}
        />
      )}
      <h2 ref={heading} tabIndex={-1} className="text-xl font-bold">
        {lesson?.status === "active"
          ? "Kelompok belajar bersamaan"
          : lesson?.status === "closed"
            ? "Ringkasan kegiatan"
            : phase === "prepare"
              ? "Pilih kelas dan topik"
              : phase === "ready"
                ? "Siap mulai?"
                : "Periksa pembagian dan pilih kegiatan"}
      </h2>
      {!lesson && <GroupDrafts />}
      {(phase === "prepare" || !lesson) && (
        <GroupPreparation
          classes={classes}
          cls={cls}
          setClass={setClass}
          hasLesson={!!lesson}
          busy={busy}
          competency={competency}
          setCompetency={setCompetency}
          presentCount={present.length}
          students={students}
          names={names}
          absent={absent}
          setAbsent={setAbsent}
          count={count}
          onCountChange={setCount}
          source={source}
          setSource={setSource}
          offline={offline}
          canMutate={canMutate}
          onPrepare={() => void prepare()}
        />
      )}
      {lesson && phase !== "prepare" && (
        <>
          <GroupEvidenceSummary lesson={lesson} groupCount={groups.length} />
          <GroupCardGrid
            groups={groups}
            label="Kelompok yang perlu diatur"
            renderCard={(g) => (
              <GroupAssignmentCard
                key={g.id}
                group={g}
                assignment={assignments.find((a) => a.groupId === g.id)}
                stored={lesson.assignments.find((a) => a.groupId === g.id)}
                lesson={lesson}
                names={names}
                busy={busy}
                phase={phase}
                runs={runs}
                printed={printed}
                setPrinted={setPrinted}
                preview={preview}
                setPreview={setPreview}
                move={move}
                setMove={setMove}
                readyCollections={readyCollections}
                updateAssignment={updateAssignment}
                commitMove={commitMove}
                completeAssignment={completeAssignment}
              />
            )}
          />
          {lesson.status === "draft" && !readyCollections.length && (
            <StateNotice
              title="Belum ada soal siap digunakan"
              action={
                <Button asChild variant="outline">
                  <Link href="/guru/soal">Buka Soal</Link>
                </Button>
              }
            >
              Persiapan kelompok tetap tersimpan.
            </StateNotice>
          )}
          {lesson.status === "draft" && phase === "edit" && (
            <>
              <ul role="status">
                {problems.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-3">
                <Button
                  disabled={
                    busy || offline || !canMutate || !!move || !!problems.length
                  }
                  onClick={() => void save()}
                  title={problems[0] ?? undefined}
                >
                  {busy ? "Menyimpan…" : "Periksa kesiapan"}
                </Button>
                {problems.length > 0 && (
                  <p className="text-sm">
                    Lengkapi dulu: {problems.length} hal pada daftar di atas.
                  </p>
                )}
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => setPhase("prepare")}
                >
                  Bagi ulang
                </Button>
              </div>
            </>
          )}
          {lesson.status === "draft" && phase === "ready" && (
            <>
              <ul
                className="studio-row-list"
                aria-label="Ringkasan kesiapan kelompok"
              >
                {lesson.assignments.map((a) => (
                  <li key={a.id} className="studio-row">
                    <span className="studio-row-content">
                      <h2>
                        {groups.find((g) => g.id === a.groupId)?.label ??
                          "Kelompok"}
                      </h2>
                      <p>{methodLabel[a.method]}</p>
                    </span>
                    <span className="studio-row-meta">
                      {a.method === "cards"
                        ? printed[a.id]
                          ? "Cetakan siap"
                          : "Perlu cetak"
                        : "Tanpa cetak"}
                    </span>
                  </li>
                ))}
              </ul>
              <p>
                Penugasan dan kode cetakan telah tersimpan. Mulai memakai
                pilihan yang sama. Jika diubah, unduh ulang soal dan kartu.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  disabled={
                    busy ||
                    offline ||
                    dirty ||
                    lesson.assignments.some(
                      (a) => a.method === "cards" && !printed[a.id],
                    )
                  }
                  onClick={() => void begin()}
                >
                  {busy ? "Memulai…" : "Mulai kegiatan"}
                </Button>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => setPhase("edit")}
                >
                  Ubah kegiatan
                </Button>
              </div>
            </>
          )}
          {lesson.status === "active" &&
            lesson.assignments
              .filter((a) => a.method === "board")
              .map((a) => (
                <GroupTeacherBoard key={a.id} lesson={lesson} assignment={a} />
              ))}
          {lesson.status === "active" && (
            <Button disabled={busy || offline} onClick={() => void close()}>
              Akhiri kegiatan kelas
            </Button>
          )}
          {lesson.status === "closed" && (
            <Button asChild variant="outline">
              <Link href={`/guru/hasil/${lesson.id}?source=group_lesson`}>
                Buka Hasil
              </Link>
            </Button>
          )}
        </>
      )}
      <p role="status">{message}</p>
      {offline && (
        <p>
          Sambungan terputus. Persiapan dan mulai kegiatan memerlukan internet.
        </p>
      )}
      {message && (
        <Button
          variant="outline"
          disabled={busy}
          onClick={() =>
            void (lesson ? reloadLesson() : load()).catch(() =>
              setMessage("Belum dapat dimuat. Pilihan tetap tersedia."),
            )
          }
        >
          Muat ulang kegiatan
        </Button>
      )}
    </div>
  );
}
