"use client";
import { useEffect, useRef, useState } from "react";
import {
  BOARD_MODES,
  publicPresentation,
  snapshotSchema,
  type PresentationSnapshot,
  type PresentationState,
} from "@/contracts/presentation";
import { MODE_LABELS } from "@/content/demo/board-content";
import { pairingCall } from "@/features/classroom/transport";
import { usePresentationTransport } from "@/features/classroom/presentation-transport";
import { PairingCodeInput } from "@/features/classroom/pairing-scanner";
import { boardAcknowledged } from "@/features/classroom/connection-transport";
import { classroomNow } from "@/features/classroom/clock";
import { Button } from "@/ui/components/button";
import { rotationProjection, type PublicStation } from "@/contracts/stations";
import { createRotation } from "@/core/stations/rotation";
import type { GroupSnapshot } from "@/core/groups/grouping";
import type { LocalScope } from "@/local/scope";
import { StationControls } from "@/features/stations/controls";
import type { PublicRoles } from "@/contracts/turns";
import { publicTool, type PublicTool } from "@/contracts/tools";
import { ToolControls } from "@/features/tools/teacher-controls";
import type { Pattern } from "@/core/tools/patterns";
import { demoOpening } from "@/core/package/opening";
import { reflectionUsesForGroups } from "@/core/package/reflection";
import { publicLesson, type PublicLesson } from "@/contracts/lesson";
import { TurnControls } from "@/features/stations/turn-controls";
import type { AssessmentContext } from "@/contracts/assessment";
import type { PublicExit } from "@/contracts/exit";
import { ExitWorkspace } from "@/features/exit/workspace";
import type { TeacherPackage } from "@/core/package/build";
import { toPublicQuestion } from "@/contracts/package";
import { questionTool } from "@/core/package/tool-task";
import type { PublicActivity } from "@/contracts/activity";
import { usePairedTouches } from "./paired-capabilities";
import { RemoteControls } from "./remote-controls";
import { RESUMABLE_MODES } from "@/contracts/board-layout";
import {
  underlyingView,
  spotlightView,
  resumeView,
} from "@/features/layar/presentation-view";
import { splitProjection } from "./split-projection";
import { PackageTransfer } from "./package-transfer";
import { GuidanceControls } from "./guidance-controls";

// Simple library runs reuse exactly the same claim/resume/heartbeat/revoke path.
export function PresentationConnectionControls({
  sessionId,
  classId,
  initialState,
  onSnapshot,
}: {
  sessionId: string;
  classId: string;
  initialState: PresentationState;
  onSnapshot?: (snapshot: PresentationSnapshot | undefined) => void;
}) {
  const connection = usePresentationTransport({
    sessionId,
    classId,
    initialState: () => initialState,
  });
  useEffect(() => {
    onSnapshot?.(connection.snapshot);
  }, [connection.snapshot, onSnapshot]);
  return (
    <section
      aria-label="Sambungkan Layar"
      className="space-y-3 rounded-kartu border bg-white p-4"
    >
      {connection.snapshot ? (
        <>
          <p role="status" data-testid="pairing-status">
            {connection.online
              ? boardAcknowledged(connection.snapshot, classroomNow())
                ? "Layar tersambung"
                : "Menunggu layar menerapkan tampilan."
              : "Koneksi terputus. Menyambungkan kembali…"}
          </p>
          <Button
            variant="outline"
            disabled={connection.busy}
            onClick={() => void connection.revoke()}
          >
            Putuskan layar
          </Button>
        </>
      ) : (
        <PairingCodeInput onPair={connection.pair} disabled={connection.busy} />
      )}
      <p role="status">{connection.message}</p>
    </section>
  );
}

export function PresentationControls({
  sessionId,
  classId,
  groups,
  complete,
  scope,
  grade,
  rotationGroups,
  strategyCodes,
  roster,
  lesson: suppliedLesson,
  assessmentContext,
  sessionPackage,
  onEvidenceSaved,
}: {
  sessionId: string;
  classId: string;
  groups: PresentationState["groups"];
  complete: boolean;
  scope: LocalScope;
  grade: number;
  rotationGroups: readonly GroupSnapshot[];
  strategyCodes: Readonly<Record<string, string>>;
  roster?: readonly { id: string; attendanceNumber: number; active: boolean }[];
  lesson?: PublicLesson;
  assessmentContext?: AssessmentContext;
  sessionPackage?: TeacherPackage;
  onEvidenceSaved?: () => void;
}) {
  const transport = usePresentationTransport({
    sessionId,
    classId,
    initialState: () =>
      publicPresentation({
        schemaVersion: 1,
        mode: "opening",
        question: 1,
        taskEpoch: crypto.randomUUID(),
        groups: [],
        ...(suppliedLesson ? { lesson: suppliedLesson } : {}),
        ...(sessionPackage
          ? {
              package: {
                id: sessionPackage.id,
                revision: sessionPackage.revision,
              },
            }
          : {}),
      }),
  });
  const {
    snapshot,
    latestSnapshot,
    receive,
    online,
    message,
    setMessage,
    pair,
    revoke,
  } = transport;
  const publishing = useRef(false);
  const [publishingBusy, setBusy] = useState(false);
  const busy = publishingBusy || transport.busy;
  const [previewGrade, setPreviewGrade] = useState(grade);
  const [spotGroup, setSpotGroup] = useState("");
  const lesson = suppliedLesson ?? publicLesson(demoOpening(previewGrade));
  const id = snapshot?.envelope.presentationId;
  const verifiedTouches = usePairedTouches(id);
  async function publish(
    mode: PresentationState["mode"],
    question = 1,
    station?: PublicStation,
    roles?: PublicRoles,
    tool?: PublicTool,
    pattern?: Pattern,
    exit?: PublicExit,
    activity?: PublicActivity,
    projection?: PresentationState,
  ) {
    const current = latestSnapshot.current;
    if (!current || publishing.current) return false;
    publishing.current = true;
    setBusy(true);
    try {
      const env = current.envelope;
      const checkQuestion =
        mode === "check" ? sessionPackage?.assessment[question - 1] : undefined;
      if (sessionPackage && mode === "check" && !checkQuestion) {
        publishing.current = false;
        setBusy(false);
        return false;
      }
      const previous = env.payload;
      const publishedLesson =
        mode === "reflection" && sessionPackage
          ? {
              ...lesson,
              objective:
                reflectionUsesForGroups(sessionPackage, rotationGroups).join(
                  " · ",
                ) || "Ceritakan kegunaan materi yang baru kamu pelajari.",
            }
          : lesson;
      const sameTask =
        previous.mode === mode &&
        previous.question === question &&
        previous.activity?.id === activity?.id &&
        previous.exit?.id === exit?.id &&
        previous.exit?.row === exit?.row &&
        JSON.stringify(previous.tool) === JSON.stringify(tool) &&
        previous.pattern === pattern &&
        JSON.stringify(previous.lesson) === JSON.stringify(publishedLesson);
      const payload = publicPresentation(
        projection ?? {
          schemaVersion: 1,
          mode,
          question,
          taskEpoch: sameTask ? previous.taskEpoch : crypto.randomUUID(),
          groups: complete ? groups : [],
          station:
            mode === "groups" && complete && rotationGroups.length
              ? rotationProjection(
                  createRotation({
                    id: sessionId,
                    groupIds: rotationGroups.map((g) => g.id),
                    grade,
                    short: sessionPackage?.variant === "short",
                    initial: sessionPackage?.variant === "initial",
                  }),
                )
              : station,
          roles,
          tool,
          pattern,
          lesson: publishedLesson,
          exit,
          activity,
          layout: {
            touchZone: grade <= 6 || lesson.intuitiveOnly ? "sd" : "normal",
            largeObjects: previous.layout?.largeObjects ?? false,
          },
          ...(sessionPackage
            ? {
                package: {
                  id: sessionPackage.id,
                  revision: sessionPackage.revision,
                },
              }
            : {}),
          ...(checkQuestion && sessionPackage
            ? {
                check: {
                  packageId: sessionPackage.id,
                  revision: sessionPackage.revision,
                  total: sessionPackage.assessment.length as 5 | 10,
                  seconds:
                    sessionPackage.variant === "short"
                      ? (60 as const)
                      : sessionPackage.variant === "initial" || grade > 6
                        ? (75 as const)
                        : (80 as const),
                  question: toPublicQuestion(checkQuestion),
                },
              }
            : {}),
        },
      );
      receive(
        snapshotSchema.parse(
          await pairingCall("teacher", {
            action: "publish",
            presentationId: env.presentationId,
            channelEpoch: env.channelEpoch,
            baseRevision: env.revision,
            commandId: crypto.randomUUID(),
            payload,
          }),
        ),
      );
      setMessage("Perintah tersimpan; menunggu layar menerapkan tampilan.");
      return true;
    } catch {
      setMessage(
        "Perintah belum diterapkan. Periksa koneksi lalu tunggu tampilan terbaru sebelum mencoba lagi.",
      );
      return false;
    } finally {
      publishing.current = false;
      setBusy(false);
    }
  }
  async function publishView(state: PresentationState) {
    return publish(
      state.mode,
      state.question,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      state,
    );
  }
  async function selectMode(mode: PresentationState["mode"]) {
    const previous = latestSnapshot.current?.envelope.payload;
    if (!previous) return;
    const base = underlyingView(previous);
    if (mode === "spotlight") {
      const panel =
        base.split?.panels.find((p) => p.groupId === spotGroup) ??
        base.split?.panels.find((p) => p.exercises.some((e) => e.tool));
      const tool =
        base.mode === "split"
          ? panel?.exercises.find((e) => e.tool)?.tool
          : (base.tool ?? base.lesson?.tool);
      if (tool)
        await publishView(
          spotlightView(
            base,
            tool,
            crypto.randomUUID(),
            panel?.groupId ?? base.activity?.groupId,
          ),
        );
    } else if (mode === "together") {
      const tool = base.tool ?? base.lesson?.tool;
      if (tool && verifiedTouches >= 2)
        await publishView(
          publicPresentation({
            ...base,
            mode,
            taskEpoch: crypto.randomUUID(),
            viewId: undefined,
            tool,
            pattern: "together",
            split: undefined,
            check: undefined,
            exit: undefined,
            roles: base.station ? base.roles : undefined,
          }),
        );
    } else if (
      mode === "split" &&
      sessionPackage &&
      complete &&
      rotationGroups.length >= 2
    ) {
      await publishView(
        publicPresentation({
          schemaVersion: 1,
          mode,
          question: 1,
          taskEpoch: crypto.randomUUID(),
          groups,
          lesson,
          package: { id: sessionPackage.id, revision: sessionPackage.revision },
          layout: {
            touchZone: grade <= 6 ? "sd" : "normal",
            largeObjects: base.layout?.largeObjects ?? false,
          },
          split: splitProjection(sessionPackage, rotationGroups),
        }),
      );
    } else await publish(mode);
  }
  async function publishStation(
    station: PublicStation,
    roles?: PublicRoles,
    taskIndex = 0,
  ) {
    const groupId = station.assignments.find(
      (a) => a.station === "Papan",
    )?.groupId;
    const group = rotationGroups.find((g) => g.id === groupId);
    const set = sessionPackage?.activities.find(
      (a) => a.stepId === group?.activityStep,
    );
    const question =
      station.phase === "work" ? set?.board[taskIndex] : undefined;
    const toolTask = question ? questionTool(question) : undefined;
    const tool = toolTask ? publicTool(toolTask) : undefined;
    const activity: PublicActivity | undefined =
      question && group && set
        ? {
            id: question.id,
            groupId: group.id,
            index: taskIndex + 1,
            total: set.board.length,
            prompt: toPublicQuestion(question).prompt,
            independent: station.assignments
              .filter((a) => a.station === "Mandiri")
              .flatMap((a) => {
                const other = rotationGroups.find((g) => g.id === a.groupId);
                const content = sessionPackage?.activities.find(
                  (x) => x.stepId === other?.activityStep,
                );
                return content
                  ? [
                      {
                        groupId: a.groupId,
                        prompts: content.independent.map(
                          (q) => toPublicQuestion(q).prompt,
                        ),
                      },
                    ]
                  : [];
              }),
          }
        : undefined;
    if (
      !(await publish(
        "station",
        1,
        station,
        roles,
        tool,
        tool ? (grade <= 6 ? "watch" : "build") : undefined,
        undefined,
        activity,
      ))
    )
      throw new Error("Station publication failed");
  }
  const connected =
    online && snapshot && boardAcknowledged(snapshot, classroomNow());
  return (
    <section
      aria-label="Kontrol Layar Kelas"
      className="space-y-3 rounded-kartu border bg-white p-4"
    >
      <fieldset disabled={busy} className="space-y-3">
        <h4 className="text-lg font-bold">
          {snapshot ? "Kendalikan layar kelas" : "Sambungkan layar kelas"}
        </h4>
        {!snapshot && (
          <p className="text-sm">
            Buka /layar pada TV, proyektor atau papan. Pindai QR dengan HP ini,
            atau masukkan kode enam digit yang tampil di sana. Keduanya
            membutuhkan internet.
          </p>
        )}
        {!snapshot ? (
          <PairingCodeInput onPair={pair} disabled={busy} />
        ) : (
          <>
            <p role="status" data-testid="pairing-status">
              {connected
                ? "Layar tersambung · papan sudah menerapkan perintah"
                : online
                  ? "Menunggu layar menerapkan tampilan."
                  : "Koneksi terputus. Menyambungkan kembali…"}
            </p>
            {sessionPackage && (
              <PackageTransfer
                value={sessionPackage}
                groups={complete ? rotationGroups : []}
                sessionId={sessionId}
                env={snapshot.envelope}
                onResolved={receive}
              />
            )}
            <div className="flex flex-wrap gap-2">
              {BOARD_MODES.map((mode) => (
                <Button
                  key={mode}
                  variant={
                    snapshot.envelope.payload.mode === mode
                      ? "default"
                      : "outline"
                  }
                  disabled={
                    busy ||
                    !online ||
                    (!complete && ["groups", "station"].includes(mode)) ||
                    (mode === "check" &&
                      !!sessionPackage &&
                      sessionPackage.assessment.length === 0) ||
                    (mode === "split" &&
                      (!sessionPackage ||
                        !complete ||
                        rotationGroups.length < 2)) ||
                    (mode === "together" &&
                      (verifiedTouches < 2 ||
                        !(
                          snapshot.envelope.payload.tool ??
                          snapshot.envelope.payload.lesson?.tool
                        ))) ||
                    (mode === "spotlight" &&
                      (!RESUMABLE_MODES.some(
                        (m) => m === snapshot.envelope.payload.mode,
                      ) ||
                        !(snapshot.envelope.payload.mode === "split"
                          ? snapshot.envelope.payload.split?.panels.some((p) =>
                              p.exercises.some((e) => e.tool),
                            )
                          : (snapshot.envelope.payload.tool ??
                            snapshot.envelope.payload.split?.panels
                              .flatMap((p) => p.exercises)
                              .find((e) => e.tool)?.tool ??
                            snapshot.envelope.payload.lesson?.tool))))
                  }
                  onClick={() =>
                    void selectMode(mode).catch(() =>
                      setMessage(
                        "Konten kelompok belum siap. Buka kembali paket sesi sebelum menerbitkan mode ini.",
                      ),
                    )
                  }
                >
                  {MODE_LABELS[mode]}
                </Button>
              ))}
            </div>
            {snapshot.envelope.payload.mode === "split" && (
              <label className="block">
                Kelompok yang disorot{" "}
                <select
                  aria-label="Kelompok yang disorot"
                  className="min-h-12 border bg-white p-2"
                  value={
                    snapshot.envelope.payload.split?.panels.some(
                      (p) => p.groupId === spotGroup,
                    )
                      ? spotGroup
                      : (snapshot.envelope.payload.split?.panels.find((p) =>
                          p.exercises.some((e) => e.tool),
                        )?.groupId ?? "")
                  }
                  onChange={(e) => setSpotGroup(e.target.value)}
                >
                  {snapshot.envelope.payload.split?.panels.map((p) => (
                    <option
                      key={p.groupId}
                      value={p.groupId}
                      disabled={!p.exercises.some((e) => e.tool)}
                    >
                      {
                        snapshot.envelope.payload.groups.find(
                          (g) => g.id === p.groupId,
                        )?.label
                      }
                    </option>
                  ))}
                </select>
              </label>
            )}
            {snapshot.envelope.payload.spotlight && (
              <Button
                disabled={!online || busy}
                onClick={() =>
                  void publishView(
                    resumeView(snapshot.envelope.payload, crypto.randomUUID()),
                  )
                }
              >
                Kembali dari Sorot
              </Button>
            )}
            {["station", "together", "spotlight"].includes(
              snapshot.envelope.payload.mode,
            ) &&
              (snapshot.envelope.payload.tool ||
                snapshot.envelope.payload.spotlight?.tool) && (
                <GuidanceControls
                  key={snapshot.envelope.payload.taskEpoch}
                  env={snapshot.envelope}
                  disabled={busy || !online}
                  onChange={async (epoch, guidance) => {
                    const current = latestSnapshot.current?.envelope.payload;
                    if (!current || current.taskEpoch !== epoch) return false;
                    return publishView(
                      publicPresentation({ ...current, guidance }),
                    );
                  }}
                />
              )}
            <Button
              variant="outline"
              disabled={!online || busy}
              aria-pressed={
                snapshot.envelope.payload.layout?.largeObjects ?? false
              }
              onClick={() =>
                void publishView(
                  publicPresentation({
                    ...snapshot.envelope.payload,
                    layout: {
                      touchZone:
                        snapshot.envelope.payload.layout?.touchZone ??
                        (grade <= 6 ? "sd" : "normal"),
                      largeObjects:
                        !snapshot.envelope.payload.layout?.largeObjects,
                    },
                  }),
                )
              }
            >
              Objek besar 1,5×
            </Button>
            {verifiedTouches < 2 && (
              <p className="text-sm">
                Berdua serentak menunggu tes dua sentuhan. Latihan bergantian
                tetap tersedia pada Alat Nalar.
              </p>
            )}
            {snapshot.envelope.payload.mode === "check" && (
              <div className="flex flex-wrap gap-2">
                {Array.from(
                  { length: sessionPackage?.assessment.length ?? 5 },
                  (_, i) => i + 1,
                ).map((n) => (
                  <Button
                    key={n}
                    variant="outline"
                    disabled={busy || !online}
                    onClick={() => void publish("check", n)}
                  >
                    Soal {n}
                  </Button>
                ))}
              </div>
            )}
            <Button variant="outline" onClick={() => void revoke()}>
              Putuskan layar
            </Button>
          </>
        )}
        <p className="text-sm" role="status">
          {message}
        </p>
        {snapshot && (
          <details>
            <summary className="min-h-12 cursor-pointer font-bold">
              Pertanyaan pembuka & giliran siswa
            </summary>
            {!suppliedLesson && (
              <label>
                Konteks demo{" "}
                <select
                  aria-label="Konteks pembuka demo"
                  className="min-h-12 border bg-white p-2"
                  value={previewGrade}
                  onChange={(e) => setPreviewGrade(Number(e.target.value))}
                >
                  <option value={5}>SD kelas 5 · resep</option>
                  <option value={7}>SMP kelas 7 · lift</option>
                  <option value={10}>SMA kelas 10 · paket internet</option>
                </select>
              </label>
            )}
            <p className="my-3">{lesson.prompt}</p>
            <Button
              disabled={busy || !online}
              onClick={() => void publish("opening")}
            >
              Tampilkan pembuka katalog
            </Button>
            {roster && (
              <TurnControls
                scope={scope}
                classId={classId}
                sessionId={sessionId}
                grade={grade}
                openingRoster={roster}
                verifiedTouches={verifiedTouches}
                onStarted={async (roles) => {
                  if (!(await publish("opening", 1, undefined, roles)))
                    throw new Error("Opening publication failed");
                }}
              />
            )}
          </details>
        )}
        {complete && (
          <StationControls
            verifiedTouches={verifiedTouches}
            disabled={busy}
            scope={scope}
            sessionId={sessionId}
            classId={classId}
            grade={grade}
            groups={rotationGroups}
            strategyCodes={strategyCodes}
            packageVariant={sessionPackage?.variant}
            onPublish={publishStation}
          />
        )}
        {complete && assessmentContext && (
          <ExitWorkspace
            scope={scope}
            parent={assessmentContext}
            groups={rotationGroups}
            frozenPackage={sessionPackage}
            onSaved={onEvidenceSaved}
            onPublish={async (value) => {
              if (
                !(await publish(
                  "exit",
                  value.row,
                  undefined,
                  undefined,
                  undefined,
                  undefined,
                  value,
                ))
              )
                throw new Error("Exit publication failed");
            }}
          />
        )}
        {snapshot && !sessionPackage && (
          <ToolControls
            disabled={busy || !online}
            onPublish={async (tool, pattern) => {
              if (
                !(await publish(
                  "station",
                  1,
                  undefined,
                  undefined,
                  tool,
                  pattern,
                ))
              )
                throw new Error("Tool publication failed");
            }}
          />
        )}
        {snapshot &&
          (snapshot.envelope.payload.mode === "opening" ||
            ["station", "together", "split", "spotlight"].includes(
              snapshot.envelope.payload.mode,
            )) && (
            <RemoteControls
              key={`${snapshot.envelope.channelEpoch}:${snapshot.envelope.payload.taskEpoch}`}
              env={snapshot.envelope}
            />
          )}
      </fieldset>
    </section>
  );
}
