"use client";
import { useEffect, useState } from "react";
import { useTeacher } from "@/features/guru/app-context";
import { libraryCache } from "@/local/library";
import type { LibraryRun, LibraryResponse } from "@/contracts/library";
import { SessionWorkspace } from "./session";
import { field, panel } from "./client";
import { Button } from "@/ui/components/button";
type Detail = { run: LibraryRun; responses: LibraryResponse[] };
export function OfflineChooser() {
  const { scope, state } = useTeacher(),
    [cached, setCached] = useState<Detail[]>([]),
    [selected, setSelected] = useState(""),
    [opened, setOpened] = useState<Detail>();
  useEffect(() => {
    let stopped = false;
    void Promise.all(state.runs.map((r) => libraryCache(scope, "detail", r.id)))
      .then((rows) => {
        if (!stopped) setCached(rows.filter((r): r is Detail => Boolean(r)));
      })
      .catch(() => {});
    return () => {
      stopped = true;
    };
  }, [scope, state.runs]);
  if (opened)
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => setOpened(undefined)}>
          Pilih kelas / materi tersimpan lain
        </Button>
        <SessionWorkspace
          key={opened.run.id}
          initial={opened}
          reload={async () => {}}
        />
      </div>
    );
  return (
    <section className={panel}>
      <h2 className="text-xl font-bold">Kelas & materi tersimpan</h2>
      <p>
        Pilih sesi yang pernah dibuka pada perangkat ini. Sambungan ke papan
        memerlukan internet.
      </p>
      <label className="block">
        Sesi offline
        <select
          className={field}
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          <option value="">Pilih kelas dan materi</option>
          {cached.map((d) => (
            <option key={d.run.id} value={d.run.id}>
              {d.run.classLabel} · {d.run.document.title} · {d.run.date}
            </option>
          ))}
        </select>
      </label>
      <Button
        disabled={!selected}
        onClick={() => setOpened(cached.find((d) => d.run.id === selected))}
      >
        Buka sesi tersimpan
      </Button>
      {!cached.length && (
        <p>
          Belum ada sesi tersimpan. Buka materi dan asesmen saat online terlebih
          dahulu.
        </p>
      )}
    </section>
  );
}
