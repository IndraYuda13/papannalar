"use client";
import { useEffect, useState } from "react";
import type { LocalScope } from "@/local/scope";
import type { GroupSnapshot } from "@/core/groups/grouping";
import {
  planTurns,
  splitTeams,
  startTurn,
  type TurnEvent,
} from "@/core/turns/scheduler";
import {
  projectTurn,
  type TurnRecord,
  type PublicRoles,
} from "@/contracts/turns";
import { createTurnRepository } from "@/local/turns";
import { Button } from "@/ui/components/button";
export function TurnControls({
  scope,
  classId,
  sessionId,
  group,
  openingRoster,
  grade,
  verifiedTouches = 1,
  onStarted,
}: {
  scope: LocalScope;
  classId: string;
  sessionId: string;
  group?: GroupSnapshot;
  openingRoster?: readonly {
    id: string;
    attendanceNumber: number;
    active: boolean;
  }[];
  grade: number;
  verifiedTouches?: number;
  onStarted: (roles: PublicRoles, taskIndex: number) => Promise<void>;
}) {
  const [semester, setSemester] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth() < 6 ? 1 : 2}`;
  });
  const [record, setRecord] = useState<TurnRecord>(),
    [preview, setPreview] = useState<TurnEvent>();
  const [absent, setAbsent] = useState<readonly string[]>([]),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const { ownerId, mode } = scope;
  useEffect(() => {
    let active = true;
    const repo = createTurnRepository({ ownerId, mode });
    void repo
      .read(classId, semester)
      .then((r) => {
        if (active) {
          setRecord(r);
          setPreview(undefined);
        }
      })
      .catch(() => {
        if (active)
          setMessage(
            "Gunakan semester seperti 2026-2; periksa penyimpanan lokal.",
          );
      })
      .finally(() => repo.close());
    return () => {
      active = false;
    };
  }, [ownerId, mode, classId, semester]);
  const events =
    record?.events.filter(
      (e) => e.sessionId === sessionId && e.groupId === (group?.id ?? null),
    ) ?? [];
  const members =
    group?.members ??
    openingRoster?.map((s) => ({
      studentId: s.id,
      attendanceNumber: s.attendanceNumber,
      active: s.active,
    })) ??
    [];
  const students = members.map((s) => ({
    studentId: s.studentId,
    attendanceNumber: s.attendanceNumber,
    present: s.active && !absent.includes(s.studentId),
    navigatorFirst: record?.navigatorFirst.includes(s.studentId) ?? false,
  }));
  const count = events.length,
    maxTasks = openingRoster ? 1 : grade <= 6 ? 2 : 3;
  function choose() {
    if (!record) return;
    const seed = crypto.getRandomValues(new Uint32Array(1))[0];
    const teams =
      events[0]?.teams ??
      (openingRoster
        ? [students.map((s) => s.studentId)]
        : splitTeams(students, record.events, seed, maxTasks));
    setPreview(
      planTurns({
        id: crypto.randomUUID(),
        sessionId,
        groupId: group?.id ?? null,
        taskIndex: count,
        seed,
        students,
        teams,
        events: record.events,
        verifiedTouches,
      }),
    );
    setMessage(
      "Pratinjau belum menambah hitungan. Mulai setelah siswa siap menjalankan tugas.",
    );
  }
  async function preference(studentId: string, enabled: boolean) {
    if (!record) return;
    setBusy(true);
    setPreview(undefined);
    const repo = createTurnRepository(scope);
    try {
      const next = {
        ...record,
        revision: record.revision + 1,
        navigatorFirst: enabled
          ? [...record.navigatorFirst, studentId]
          : record.navigatorFirst.filter((id) => id !== studentId),
      };
      setRecord(next);
      await repo.save(next, record.revision);
    } catch {
      setRecord(record);
      setMessage("Preferensi belum tersimpan; muat ulang sebelum melanjutkan.");
    } finally {
      repo.close();
      setBusy(false);
    }
  }
  async function start() {
    if (!record || !preview) return;
    setBusy(true);
    const repo = createTurnRepository(scope);
    try {
      const next: TurnRecord = {
        ...record,
        revision: record.revision + 1,
        events: [...startTurn(record.events, preview)].map((e) => ({
          ...e,
          pilots: [...e.pilots],
          navigators: [...e.navigators],
          teams: e.teams.map((team) => [...team]),
        })),
      };
      await repo.save(next, record.revision);
      setRecord(next);
      setPreview(undefined);
      setMessage("Tugas dimulai; giliran tercatat sekali di perangkat ini.");
      await onStarted(projectTurn(preview, students), preview.taskIndex);
    } catch {
      setMessage(
        "Giliran belum diterapkan. Periksa state terbaru sebelum mencoba ulang.",
      );
    } finally {
      repo.close();
      setBusy(false);
    }
  }
  const roles = preview
    ? projectTurn(preview, students)
    : events.at(-1)
      ? projectTurn(events.at(-1)!, students)
      : null;
  return (
    <section
      aria-label={openingRoster ? "Giliran Pembuka" : "Giliran Papan"}
      className="space-y-3 rounded-kartu border p-3"
    >
      <h5 className="font-bold">
        Giliran · {group?.label ?? "Pembuka seluruh kelas"}
      </h5>
      <label>
        Semester{" "}
        <input
          aria-label="Semester giliran"
          className="min-h-12 w-28 border px-2"
          value={semester}
          onChange={(e) => {
            setRecord(undefined);
            setSemester(e.target.value);
          }}
        />
      </label>
      <p>
        {count}/{maxTasks} tugas dimulai.{" "}
        {verifiedTouches >= 2
          ? "Dua Pilot"
          : "Satu Pilot · dua sentuhan belum terverifikasi"}
        .
      </p>
      <details>
        <summary className="min-h-12 cursor-pointer">
          Kehadiran dan Navigator dulu
        </summary>
        {students.map((s) => (
          <div key={s.studentId} className="flex min-h-12 flex-wrap gap-3">
            <span>Absen {s.attendanceNumber}</span>
            <label className="flex min-h-12 items-center gap-2">
              <input
                type="checkbox"
                checked={s.present}
                aria-label={`Hadir absen ${s.attendanceNumber}`}
                onChange={(e) => {
                  setAbsent((old) =>
                    e.target.checked
                      ? old.filter((id) => id !== s.studentId)
                      : [...old, s.studentId],
                  );
                  setPreview(undefined);
                }}
              />
              Hadir
            </label>
            <label className="flex min-h-12 items-center gap-2">
              <input
                type="checkbox"
                disabled={busy}
                checked={s.navigatorFirst}
                aria-label={`Navigator dulu absen ${s.attendanceNumber}`}
                onChange={(e) => void preference(s.studentId, e.target.checked)}
              />
              Navigator dulu
            </label>
          </div>
        ))}
      </details>
      {roles && (
        <p data-testid="role-preview">
          Pilot: {roles.pilots.join(", ") || "belum ada"} · Navigator:{" "}
          {roles.navigators.join(", ") || "belum ada"}
        </p>
      )}
      <Button
        disabled={busy || !record || count >= maxTasks || !students.length}
        variant="outline"
        onClick={choose}
      >
        {openingRoster
          ? "Pratinjau Pilot pembuka"
          : "Pratinjau peran berikutnya"}
      </Button>
      {preview && (
        <Button
          disabled={busy || !preview.pilots.length}
          onClick={() => void start()}
        >
          {openingRoster
            ? "Mulai pembuka dengan peran ini"
            : "Mulai tugas papan"}
        </Button>
      )}
      <p role="status">{message}</p>
    </section>
  );
}
