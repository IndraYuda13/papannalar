"use client";
import { useEffect, useState } from "react";
import {
  createRotation,
  rotationAction,
  type Rotation,
} from "@/core/stations/rotation";
import type { GroupSnapshot } from "@/core/groups/grouping";
import { rotationProjection, type PublicStation } from "@/contracts/stations";
import { createRotationRepository } from "@/local/rotations";
import type { LocalScope } from "@/local/scope";
import { StaticBisik } from "@/features/bisik/static-card";
import { Button } from "@/ui/components/button";
import { RotationTimer } from "./timer";
import { classroomNow } from "@/features/classroom/clock";
import { TurnControls } from "./turn-controls";
import type { PublicRoles } from "@/contracts/turns";
import {
  previewHold,
  confirmHold,
  type HoldPreview,
} from "@/core/stations/hold";
export function StationControls({
  scope,
  sessionId,
  classId,
  grade,
  groups,
  strategyCodes,
  onPublish,
  packageVariant,
  disabled = false,
  verifiedTouches = 1,
}: {
  scope: LocalScope;
  sessionId: string;
  classId: string;
  grade: number;
  groups: readonly GroupSnapshot[];
  strategyCodes: Readonly<Record<string, string>>;
  onPublish: (
    station: PublicStation,
    roles?: PublicRoles,
    taskIndex?: number,
  ) => Promise<void>;
  packageVariant?: "initial" | "weekly" | "oral" | "short";
  disabled?: boolean;
  verifiedTouches?: number;
}) {
  const [state, setState] = useState<Rotation>();
  const [roles, setRoles] = useState<PublicRoles>();
  const [hold, setHold] = useState<HoldPreview>();
  const [heldGroup, setHeldGroup] = useState(groups[0]?.id ?? "");
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [variant, setVariant] = useState(packageVariant ?? "weekly");
  const [taskIndex, setTaskIndex] = useState(0);
  const { ownerId, mode } = scope;
  useEffect(() => {
    let active = true;
    const repo = createRotationRepository({ ownerId, mode });
    void repo
      .read(sessionId)
      .then((value) => {
        if (active) setState(value);
      })
      .catch(() => {
        if (active) setMessage("Rotation lokal belum dapat dibaca.");
      })
      .finally(() => repo.close());
    return () => {
      active = false;
    };
  }, [ownerId, mode, sessionId]);
  async function change(action: "start" | "extend" | "end" | "next") {
    setBusy(true);
    setHold(undefined);
    const repo = createRotationRepository(scope);
    try {
      let current = state;
      if (!current) {
        current = createRotation({
          id: sessionId,
          groupIds: groups.map((g) => g.id),
          grade,
          initial: variant === "initial",
          short: variant === "short",
        });
        await repo.save(current, 0);
      }
      const next = rotationAction(current, action, classroomNow());
      await repo.save(next, current.revision);
      setState(next);
      setMessage("Putaran tersimpan lokal. Timer nol menunggu keputusan guru.");
      if (action !== "extend") {
        setRoles(undefined);
        setTaskIndex(0);
      }
      await onPublish(
        rotationProjection(next),
        action === "extend" ? roles : undefined,
        action === "extend" ? taskIndex : 0,
      );
    } catch {
      setMessage(
        "Perubahan belum diterapkan ke papan. Buka ulang state terbaru bila ada konflik; jangan mengulang giliran siswa.",
      );
    } finally {
      repo.close();
      setBusy(false);
    }
  }
  const projection = state ? rotationProjection(state) : undefined;
  async function applyHold() {
    if (!state || !hold) return;
    setBusy(true);
    const repo = createRotationRepository(scope);
    try {
      const next = confirmHold(state, hold);
      await repo.save(next, state.revision);
      setState(next);
      setHold(undefined);
      setMessage(
        "Jadwal tersisa diperbarui. Kelompok tetap di tempat sampai guru mengakhiri putaran.",
      );
      await onPublish(rotationProjection(next), roles, taskIndex);
    } catch {
      setMessage(
        "Pratinjau sudah berubah. Buka ulang jadwal terbaru sebelum menahan kelompok.",
      );
    } finally {
      repo.close();
      setBusy(false);
    }
  }
  const teacherGroup = projection?.assignments.find(
    (a) => a.station === "Guru",
  )?.groupId;
  const boardGroup = groups.find((g) =>
    projection?.assignments.some(
      (a) => a.groupId === g.id && a.station === "Papan",
    ),
  );
  return (
    <section
      aria-label="Kegiatan kelompok"
      className="space-y-3 rounded-kartu border border-primary/30 p-4"
    >
      <fieldset disabled={busy || disabled} className="space-y-3">
        <h4 className="text-lg font-bold">Kegiatan kelompok</h4>
        {!state && !packageVariant && (
          <label className="block">
            Waktu sesi{" "}
            <select
              aria-label="Waktu sesi"
              value={variant}
              onChange={(e) =>
                setVariant(
                  e.target.value as "initial" | "weekly" | "oral" | "short",
                )
              }
              className="min-h-12 border bg-white p-2"
            >
              <option value="weekly">Mingguan</option>
              <option value="initial">Sesi pertama</option>
              <option value="short">Singkat · tanpa rotasi</option>
            </select>
          </label>
        )}
        {state && (
          <>
            <p>
              Putaran {projection?.round}/{projection?.total} ·{" "}
              {state.phase === "transition"
                ? "Jeda pindah"
                : state.phase === "complete"
                  ? "Rotasi selesai"
                  : "Pindah dalam"}{" "}
              <RotationTimer deadlineAt={state.deadlineAt} />
            </p>
            <p>
              Cadangan: {state.reserveSeconds / 60} menit. Tambahan:{" "}
              {state.addedSeconds / 60} menit.
            </p>
            {state.addedSeconds > 0 && (
              <p>
                Jaga waktu exit: persingkat refleksi atau lanjutkan exit pada
                pertemuan berikutnya.
              </p>
            )}
            <ul>
              {projection?.assignments.map((a) => (
                <li key={a.groupId}>
                  {groups.find((g) => g.id === a.groupId)?.label}: {a.station}
                </li>
              ))}
            </ul>
          </>
        )}
        <div className="flex flex-wrap gap-2">
          {(!state || state.phase === "ready") && (
            <Button
              disabled={busy || groups.length === 0}
              onClick={() => void change("start")}
            >
              Mulai rotasi
            </Button>
          )}
          {state && ["work", "transition"].includes(state.phase) && (
            <Button disabled={busy} onClick={() => void change("extend")}>
              Tambah 3 menit
            </Button>
          )}
          {state?.phase === "work" && (
            <Button
              disabled={busy}
              variant="outline"
              onClick={() => void change("end")}
            >
              Akhiri putaran
            </Button>
          )}
          {state?.phase === "transition" && (
            <Button disabled={busy} onClick={() => void change("next")}>
              {state.round + 1 === state.schedule[0].length
                ? "Selesaikan rotasi"
                : "Mulai putaran berikutnya"}
            </Button>
          )}
          {state && (
            <Button
              disabled={busy}
              variant="outline"
              onClick={() =>
                void onPublish(
                  rotationProjection(state),
                  roles,
                  taskIndex,
                ).catch(() =>
                  setMessage(
                    "Layar belum tersambung; rotasi tetap tersimpan lokal.",
                  ),
                )
              }
            >
              Tampilkan rotasi tersimpan
            </Button>
          )}
        </div>
        {state?.phase === "work" && !state.short && (
          <div className="space-y-2">
            <label>
              Kelompok yang ditahan{" "}
              <select
                aria-label="Kelompok yang ditahan"
                className="min-h-12 border bg-white p-2"
                value={heldGroup}
                onChange={(e) => {
                  setHeldGroup(e.target.value);
                  setHold(undefined);
                }}
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.label}
                  </option>
                ))}
              </select>
            </label>
            <Button
              disabled={busy}
              variant="outline"
              onClick={() => setHold(previewHold(state, heldGroup))}
            >
              Pratinjau tahan kelompok
            </Button>
            {hold?.kind === "blocked" && (
              <p role="status">
                Tidak ada jadwal sisa yang aman untuk menahan kelompok ini.
                Pilih Tambah 3 menit untuk seluruh putaran, atau Akhiri putaran.
              </p>
            )}
            {hold?.kind === "safe" && (
              <div aria-label="Pratinjau jadwal tahan">
                <p>
                  {hold.changedSlots} slot berubah; kunjungan Guru dan Papan
                  tetap masing-masing sekali.
                </p>
                <ul>
                  {hold.schedule.map((row, i) => (
                    <li key={groups[i].id}>
                      {groups[i].label}:{" "}
                      {row
                        .map((place, round) => `Putaran ${round + 1} ${place}`)
                        .join(" · ")}
                    </li>
                  ))}
                </ul>
                <Button disabled={busy} onClick={() => void applyHold()}>
                  Terapkan jadwal tahan
                </Button>
                <Button
                  disabled={busy}
                  variant="outline"
                  onClick={() => setHold(undefined)}
                >
                  Batalkan pratinjau
                </Button>
              </div>
            )}
          </div>
        )}
        {teacherGroup && (
          <div aria-label="Bisik kelompok Guru">
            <p>
              {groups.find((g) => g.id === teacherGroup)?.label} bersama guru
            </p>
            <StaticBisik
              code={strategyCodes[teacherGroup] ?? "generic-error"}
              context={{ scope, classId, sessionId }}
            />
          </div>
        )}
        {state?.phase === "work" && boardGroup && (
          <TurnControls
            key={boardGroup.id}
            scope={scope}
            classId={classId}
            sessionId={sessionId}
            grade={grade}
            group={boardGroup}
            verifiedTouches={verifiedTouches}
            onStarted={async (value, index) => {
              setRoles(value);
              setTaskIndex(index);
              await onPublish(rotationProjection(state), value, index);
            }}
          />
        )}
        <p role="status">{message}</p>
      </fieldset>
    </section>
  );
}
