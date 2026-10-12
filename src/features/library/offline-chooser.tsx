"use client";
import { useEffect, useState } from "react";
import { useTeacher } from "@/features/guru/app-context";

import type { RunDetail } from "@/contracts/library";
import { readLibraryDetail } from "./read-detail";
import { SessionWorkspace } from "./session";
import { field, panel } from "./client";
import { StateNotice } from "@/ui/components/studio";
import { Button } from "@/ui/components/button";
import Link from "next/link";
type Detail = RunDetail;
export function OfflineChooser() {
  const { scope, state } = useTeacher(),
    [cached, setCached] = useState<Detail[]>([]),
    [selected, setSelected] = useState(""),
    [opened, setOpened] = useState<Detail>();
  useEffect(() => {
    let stopped = false;
    void Promise.all(
      state.runs
        .filter((r) => !r.parentLessonId)
        .map((r) =>
          readLibraryDetail(scope, r.id)
            .then((r) => r.detail)
            .catch(() => undefined),
        ),
    )
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
        <SessionWorkspace key={opened.run.id} initial={opened} />
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
        <StateNotice title="Belum ada sesi tersimpan">
          Buka materi dan asesmen saat online terlebih dahulu. Setelah itu, sesi
          yang tersimpan dapat dibuka di perangkat ini.
        </StateNotice>
      )}
      <Button asChild variant="outline">
        <Link href={`/guru/latihan?mode=${scope.mode}`}>
          Buka latihan tersimpan
        </Link>
      </Button>
    </section>
  );
}
