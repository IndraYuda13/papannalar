"use client";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Smartphone } from "lucide-react";
import type { PresentationEnvelope } from "@/contracts/presentation";
import {
  remoteBinding,
  remoteCall,
} from "@/features/classroom/remote-transport";
import { remoteActionSchema, type RemoteAction } from "@/contracts/remote";
import { Button } from "@/ui/components/button";
export function RemoteControls({ env }: { env: PresentationEnvelope }) {
  const [active, setActive] = useState(false),
    [drag, setDrag] = useState(false),
    [editable, setEditable] = useState(false),
    [value, setValue] = useState("1"),
    [message, setMessage] = useState(
      "Aktifkan kendali setelah HP tersambung ke papan.",
    );
  const transport = useRef<{ instance: string; sequence: number } | undefined>(
      undefined,
    ),
    controller = useRef<AbortController | undefined>(undefined),
    chain = useRef(Promise.resolve()),
    pendingMove = useRef<RemoteAction | undefined>(undefined),
    point = useRef({ x: 0.5, y: 0.5 }),
    held = useRef(false),
    inflight = useRef(0);
  const binding = remoteBinding(env);
  function stop() {
    controller.current?.abort();
    transport.current = undefined;
    pendingMove.current = undefined;
    held.current = false;
    setActive(false);
    setEditable(false);
    setMessage(
      "Kendali berhenti. Gunakan papan langsung, atau sambungkan ulang HP saat internet kembali.",
    );
  }
  useEffect(() => {
    const offline = () => stop();
    window.addEventListener("offline", offline);
    return () => {
      controller.current?.abort();
      window.removeEventListener("offline", offline);
    };
  }, []);
  async function connect() {
    controller.current?.abort();
    controller.current = new AbortController();
    try {
      const state = await remoteCall(
        "teacher",
        { action: "read", ...binding },
        controller.current.signal,
      );
      if (!state.instanceId) throw new Error("waiting");
      transport.current = {
        instance: state.instanceId,
        sequence: state.sequence,
      };
      chain.current = Promise.resolve();
      setActive(true);
      setMessage(
        "Kendali aktif. Gerakkan penanda untuk memilih alat di papan.",
      );
    } catch {
      stop();
    }
  }
  function send(input: RemoteAction) {
    if (
      !transport.current ||
      !controller.current ||
      controller.current.signal.aborted ||
      inflight.current >= 4
    )
      return;
    const selected = remoteActionSchema.safeParse(input);
    if (!selected.success) {
      setMessage("Isi bilangan atau pecahan yang valid.");
      return;
    }
    const signal = controller.current.signal;
    inflight.current++;
    chain.current = chain.current
      .then(async () => {
        const live = transport.current;
        if (!live || signal.aborted) return;
        const command = {
          id: crypto.randomUUID(),
          instanceId: live.instance,
          taskEpoch: binding.taskEpoch,
          sequence: live.sequence + 1,
          input: selected.data,
        };
        let status = await remoteCall(
          "teacher",
          { action: "send", ...binding, command },
          signal,
        );
        live.sequence = command.sequence;
        const deadline = performance.now() + 2500;
        while (
          status.receipt?.id !== command.id &&
          performance.now() < deadline &&
          !signal.aborted
        ) {
          await new Promise<void>((resolve) => setTimeout(resolve, 100));
          status = await remoteCall(
            "teacher",
            { action: "read", ...binding },
            signal,
          );
          if (status.instanceId !== live.instance) throw new Error("changed");
        }
        if (status.receipt?.id !== command.id || signal.aborted)
          throw new Error("unacknowledged");
        setEditable(status.receipt.editable);
        if (selected.data.kind !== "move")
          setMessage(
            status.receipt.applied
              ? "Papan mengikuti gerakan Anda."
              : "Pilih tombol atau objek alat di papan. Tulisan tetap dibuat langsung di papan.",
          );
      })
      .catch(() => {
        if (!signal.aborted) stop();
      })
      .finally(() => {
        inflight.current = Math.max(0, inflight.current - 1);
      });
  }
  const latestSend = useRef(send);
  useEffect(() => {
    latestSend.current = send;
  });
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => {
      if (pendingMove.current && inflight.current === 0) {
        const next = pendingMove.current;
        pendingMove.current = undefined;
        latestSend.current(next);
      }
    }, 120);
    return () => clearInterval(timer);
  }, [active]);
  function position(event: PointerEvent<HTMLDivElement>) {
    const r = event.currentTarget.getBoundingClientRect();
    point.current = {
      x: Math.max(0, Math.min(1, (event.clientX - r.left) / r.width)),
      y: Math.max(0, Math.min(1, (event.clientY - r.top) / r.height)),
    };
    return point.current;
  }
  return (
    <details className="space-y-3 rounded-input border p-3">
      <summary className="min-h-12 cursor-pointer py-3 font-semibold text-primary">
        <Smartphone size={20} className="mr-2 inline-block" aria-hidden />
        Kendali dari HP
      </summary>
      <h3 className="font-bold">Gerakkan alat di papan</h3>
      <p className="text-sm text-muted-foreground">
        Geser penanda di bidang sentuh. Ketuk untuk memilih. Aktifkan Seret
        objek untuk memindahkan alat.
      </p>
      <Button onClick={() => void connect()}>
        {active ? "Hubungkan ulang kendali" : "Aktifkan kendali alat"}
      </Button>{" "}
      <Button variant="outline" disabled={!active} onClick={stop}>
        Hentikan kendali
      </Button>
      <fieldset disabled={!active} className="space-y-3">
        <label className="flex min-h-12 items-center gap-3">
          <input
            type="checkbox"
            checked={drag}
            onChange={(e) => setDrag(e.target.checked)}
          />
          Seret objek
        </label>
        <div
          aria-label="Trackpad alat papan"
          role="application"
          className={`h-64 w-full touch-none rounded-kartu border-2 border-primary bg-pn-teal-100 ${active ? "" : "pointer-events-none opacity-50"}`}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            held.current = true;
            const p = position(e);
            if (drag) send({ kind: "start", ...p });
            else pendingMove.current = { kind: "move", ...p };
          }}
          onPointerMove={(e) => {
            if (held.current)
              pendingMove.current = { kind: "move", ...position(e) };
          }}
          onPointerUp={(e) => {
            if (!held.current) return;
            held.current = false;
            pendingMove.current = undefined;
            send({ kind: drag ? "drop" : "activate", ...position(e) });
          }}
          onPointerCancel={() => {
            held.current = false;
            pendingMove.current = undefined;
            send({ kind: "cancel" });
          }}
        >
          Bidang sentuh · lihat penanda di papan
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => send({ kind: "scroll", direction: -1 })}
          >
            Gulir atas
          </Button>
          <Button
            variant="outline"
            onClick={() => send({ kind: "scroll", direction: 1 })}
          >
            Gulir bawah
          </Button>
        </div>
        <label className="block">
          Nilai untuk alat yang dipilih
          <input
            aria-label="Nilai kendali terpilih"
            inputMode="decimal"
            className="min-h-12 w-full border p-2"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </label>
        <Button
          disabled={!editable}
          onClick={() => send({ kind: "value", value })}
        >
          Terapkan nilai
        </Button>
      </fieldset>
      <p role="status">{message}</p>
    </details>
  );
}
