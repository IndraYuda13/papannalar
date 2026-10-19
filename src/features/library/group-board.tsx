"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  groupBoardStateSchema,
  groupBoardActionSchema,
  encodeToolModel,
  decodeToolModel,
  type GroupBoardState,
  type GroupBoardAction,
} from "@/contracts/group-board";
import type { GroupLesson, GroupAssignment } from "@/contracts/group-lesson";
import { groupLessonCall } from "@/local/learning-client";
import { publicPresentation } from "@/contracts/presentation";
import { usePresentationTransport } from "@/features/classroom/presentation-transport";
import { PairingCodeInput } from "@/features/classroom/pairing-scanner";
import { RemoteToolCheck } from "@/features/tools/remote-check-context";
import { LibraryItemView, mathText } from "./item-view";
import { Button } from "@/ui/components/button";
import type { ToolModel } from "@/core/tools/patterns";

async function boardCall(
  input: GroupBoardAction,
): Promise<GroupBoardState | null> {
  const response = await fetch("/api/v1/board/group-lesson", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify(groupBoardActionSchema.parse(input)),
  });
  if (!response.ok)
    throw new Error(
      [401, 403, 404].includes(response.status)
        ? "REVOKED"
        : response.status === 409
          ? "CONFLICT"
          : "UNAVAILABLE",
    );
  const value: unknown = await response.json();
  return value === null ? null : groupBoardStateSchema.parse(value);
}
export function GroupBoard({
  presentationId,
  channelEpoch,
  fallback,
}: {
  presentationId: string;
  channelEpoch: string;
  fallback: ReactNode;
}) {
  const [state, setState] = useState<GroupBoardState | null>(null),
    [message, setMessage] = useState("");
  const load = useCallback(async () => {
    try {
      const next = await boardCall({ action: "state", presentationId });
      setState((old) =>
        old &&
        next &&
        old.assignmentId === next.assignmentId &&
        old.revision >= next.revision
          ? old
          : next,
      );
      setMessage("");
    } catch (error) {
      if (error instanceof Error && error.message === "REVOKED") setState(null);
      setMessage("Sambungan terputus. Jawaban belum dapat dikirim.");
    }
  }, [presentationId]);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 0),
      poll = setInterval(() => void load(), 5000);
    return () => {
      clearTimeout(timer);
      clearInterval(poll);
    };
  }, [load]);
  if (!state)
    return (
      <>
        {fallback}
        {message && <p role="status">{message}</p>}
      </>
    );
  return (
    <GroupBoardTask
      key={`${state.assignmentId}:${channelEpoch}:${state.taskEpoch}`}
      state={state}
      setState={setState}
      call={async (input) => {
        const next = await boardCall(input);
        if (!next) throw new Error("REVOKED");
        return next;
      }}
      presentationId={presentationId}
      channelEpoch={channelEpoch}
      transportError={message}
    />
  );
}
export function GroupTeacherBoard({
  lesson,
  assignment,
}: {
  lesson: GroupLesson;
  assignment: GroupAssignment;
}) {
  const transport = usePresentationTransport({
    sessionId: assignment.runId,
    classId: lesson.classId,
    initialState: () =>
      publicPresentation({
        schemaVersion: 1,
        mode: "opening",
        question: 1,
        taskEpoch: assignment.id,
        groups: [],
      }),
  });
  const [state, setState] = useState<GroupBoardState | null>(null),
    [message, setMessage] = useState("");
  const env = transport.snapshot?.envelope;
  const load = useCallback(async () => {
    if (!env) return;
    try {
      setState(
        await groupLessonCall({
          action: "board-action",
          id: lesson.id,
          input: { action: "state", presentationId: env.presentationId },
        }),
      );
      setMessage("");
    } catch {
      setMessage("Kemajuan layar belum dapat dimuat. Periksa sambungan.");
    }
  }, [env, lesson.id]);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 0),
      poll = setInterval(() => void load(), 5000);
    return () => {
      clearTimeout(timer);
      clearInterval(poll);
    };
  }, [load]);
  return (
    <section
      className="space-y-4 border-t pt-5"
      aria-label="Hubungkan Layar Kelas"
      data-testid="board-connection"
      data-connected={transport.connected}
    >
      <h2 className="text-xl font-bold">Hubungkan Layar Kelas</h2>
      <p>
        Pindai QR di layar kelas atau masukkan kode. Ini bukan pemindaian
        jawaban.
      </p>
      {!transport.connected && (
        <PairingCodeInput onPair={transport.pair} disabled={transport.busy} />
      )}
      <p role="status" data-testid="pairing-status">
        {transport.message ||
          message ||
          (transport.connected
            ? "Layar tersambung"
            : "Menunggu sambungan layar")}
      </p>
      {env && state && (
        <details>
          <summary className="min-h-12 cursor-pointer content-center font-semibold">
            Bantu jawab dari perangkat guru
          </summary>
          <div data-library-preview>
            <GroupBoardTask
              key={state.taskEpoch}
              state={state}
              setState={setState}
              call={(input) =>
                groupLessonCall({
                  action: "board-action",
                  id: lesson.id,
                  input,
                })
              }
              presentationId={env.presentationId}
              channelEpoch={env.channelEpoch}
            />
          </div>
        </details>
      )}
    </section>
  );
}
function GroupBoardTask({
  state,
  setState,
  call,
  presentationId,
  channelEpoch,
  transportError = "",
}: {
  state: GroupBoardState;
  setState: (state: GroupBoardState) => void;
  call: (input: GroupBoardAction) => Promise<GroupBoardState>;
  presentationId: string;
  channelEpoch: string;
  transportError?: string;
}) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [choice, setChoice] = useState<string>(
      state.answer?.kind === "card" ? state.answer.choice : "",
    ),
    [unsaved, setUnsaved] = useState(false);
  const lock = useRef(false),
    current = useRef(state),
    retry = useRef<GroupBoardAction | undefined>(undefined);
  useEffect(() => {
    current.current = state;
  }, [state]);
  const activeChoice = unsaved
    ? choice
    : state.answer?.kind === "card"
      ? state.answer.choice
      : "";
  function input(
    action: "check" | "next" | "finish",
    skip = false,
  ): GroupBoardAction {
    const s = current.current;
    const binding = {
      presentationId,
      channelEpoch,
      assignmentId: s.assignmentId,
      revision: s.revision,
      taskEpoch: s.taskEpoch,
      requestId: crypto.randomUUID(),
    };
    return action === "check"
      ? { action, ...binding }
      : { action, ...binding, skip };
  }
  async function send(action: GroupBoardAction) {
    retry.current = action;
    const next = await call(action);
    current.current = next;
    setState(next);
    retry.current = undefined;
    return next;
  }
  async function mutate(work: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setMessage("");
    try {
      await work();
      setUnsaved(false);
    } catch (error) {
      setUnsaved(true);
      setMessage(
        error instanceof Error && error.message === "CONFLICT"
          ? "Soal telah berubah. Muat kemajuan terbaru sebelum melanjutkan."
          : "Jawaban belum tersimpan. Sambungkan kembali lalu coba lagi.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function answerAndCheck(answer: GroupBoardState["answer"]) {
    if (!answer) return;
    await mutate(async () => {
      const s = current.current;
      await send({
        action: "answer",
        presentationId,
        channelEpoch,
        assignmentId: s.assignmentId,
        revision: s.revision,
        taskEpoch: s.taskEpoch,
        requestId: crypto.randomUUID(),
        answer,
      });
      await send(input("check"));
    });
  }
  const last = state.position === state.total - 1;
  if (state.status !== "active")
    return (
      <div className="space-y-3" role="status">
        <h2 className="text-2xl font-bold">
          {state.status === "completed"
            ? "Semua soal selesai"
            : "Tugas dihentikan"}
        </h2>
        <p>
          Tugas kelompok ini selesai. Kegiatan kelompok lain tetap berjalan.
        </p>
      </div>
    );
  const remoteCheck = (model: ToolModel) => {
    try {
      void answerAndCheck({
        kind: "interactive",
        model: encodeToolModel(model),
      });
    } catch {
      setMessage("Model belum dapat dikirim. Periksa isian lalu coba lagi.");
    }
  };
  return (
    <div
      className="flex min-h-0 flex-1 flex-col gap-4"
      data-testid="group-board"
    >
      <p className="text-lg">
        {state.groupLabel} · {state.title} · Soal {state.position + 1} dari{" "}
        {state.total}
      </p>
      <fieldset
        disabled={busy || !!transportError}
        className="min-w-0 flex-1 space-y-4"
      >
        {state.item.kind === "card" ? (
          <>
            <h1 className="text-[clamp(24px,3vw,44px)] font-bold leading-tight">
              {mathText(state.item.prompt)}
            </h1>
            <div className="grid gap-3 sm:grid-cols-2">
              {[...state.item.options, "Belum tahu"].map((option, i) => {
                const value = i === 4 ? "?" : "ABCD"[i];
                return (
                  <Button
                    key={value}
                    variant="outline"
                    className={`h-auto min-h-14 justify-start whitespace-normal text-left text-lg ${activeChoice === value ? "border-primary bg-pn-teal-100 ring-2 ring-primary" : ""}`}
                    aria-pressed={activeChoice === value}
                    onClick={() => {
                      setChoice(value);
                      setUnsaved(true);
                      setMessage("");
                    }}
                  >
                    {value}. {mathText(option)}
                    {activeChoice === value && (
                      <span className="ml-auto pl-3 text-sm">Dipilih</span>
                    )}
                  </Button>
                );
              })}
            </div>
            {!state.checked || unsaved ? (
              <>
                <p>
                  {!activeChoice
                    ? "Pilih satu jawaban dahulu."
                    : "Pilihan siap diperiksa."}
                </p>
                <Button
                  disabled={!activeChoice || busy}
                  onClick={() =>
                    void answerAndCheck({
                      kind: "card",
                      choice: activeChoice as "A" | "B" | "C" | "D" | "?",
                    })
                  }
                >
                  Periksa jawaban
                </Button>
              </>
            ) : null}
          </>
        ) : (
          <RemoteToolCheck.Provider value={remoteCheck}>
            <LibraryItemView
              key={state.taskEpoch}
              item={state.item}
              row={state.position + 1}
              model={
                state.answer?.kind === "interactive"
                  ? decodeToolModel(state.answer.model)
                  : undefined
              }
            />
          </RemoteToolCheck.Provider>
        )}
        {state.feedback && !unsaved && (
          <p role="status">
            {state.feedback.status === "correct"
              ? "Jawaban tepat."
              : state.feedback.status === "try_again"
                ? "Belum tepat. Coba lagi atau lanjut ke soal berikutnya."
                : "Selesai mencoba. Kegiatan ini tidak dinilai otomatis."}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          {state.checked && !unsaved && (
            <Button
              disabled={busy}
              onClick={() =>
                void mutate(async () => {
                  await send(input(last ? "finish" : "next"));
                  setChoice("");
                })
              }
            >
              {last ? "Selesaikan tugas" : "Soal berikutnya"}
            </Button>
          )}
          {state.checked && state.item.kind === "card" && !unsaved && (
            <Button variant="outline" onClick={() => setUnsaved(true)}>
              Coba lagi
            </Button>
          )}
          {!state.checked && !unsaved && (
            <Button
              variant="quiet"
              onClick={() =>
                void mutate(async () => {
                  await send(input(last ? "finish" : "next", true));
                  setChoice("");
                })
              }
            >
              {state.item.kind === "writing"
                ? "Selesai mencoba"
                : "Lewati soal"}
            </Button>
          )}
          {state.item.kind === "card" && unsaved && !message && (
            <Button
              variant="quiet"
              onClick={() =>
                void mutate(async () => {
                  await send(input(last ? "finish" : "next", true));
                  setChoice("");
                })
              }
            >
              Lewati soal
            </Button>
          )}
        </div>
      </fieldset>
      <p role="status">{message || transportError}</p>
      {message && (
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            disabled={busy}
            onClick={() =>
              void mutate(async () => {
                if (retry.current) {
                  const action = retry.current;
                  await send(action);
                  if (action.action === "answer") await send(input("check"));
                }
              })
            }
          >
            Coba lagi
          </Button>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() =>
              void mutate(async () => {
                const next = await call({ action: "state", presentationId });
                current.current = next;
                setState(next);
                retry.current = undefined;
              })
            }
          >
            Muat kemajuan terbaru
          </Button>
        </div>
      )}
    </div>
  );
}
