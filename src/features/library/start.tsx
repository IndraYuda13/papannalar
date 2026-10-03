"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTeacher } from "@/features/guru/app-context";
import { runSchema, publicLibraryItem } from "@/contracts/library";
import { Button } from "@/ui/components/button";
import { field, panel, libraryCall, jakartaDate } from "./client";
import { PageHeader, StateNotice } from "@/ui/components/studio";
import { LibraryItemView } from "./item-view";
export function StartLesson({
  classId = "",
  collectionId = "",
  mode = "teach",
}: {
  classId?: string;
  collectionId?: string;
  mode?: "teach" | "assessment";
}) {
  const { classes, state, refresh } = useTeacher(),
    router = useRouter(),
    [cls, setClass] = useState(classId || classes[0]?.id || ""),
    [collection, setCollection] = useState(collectionId),
    [tab, setTab] = useState<"system" | "teacher">(
      state.collections.find((c) => c.id === collectionId)?.source ?? "system",
    ),
    [date, setDate] = useState(jakartaDate()),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [preview, setPreview] = useState(false);
  const lock = useRef(false),
    runId = useRef<string>(crypto.randomUUID());
  const available = state.collections.filter(
    (c) =>
      c.status === "ready" &&
      c.source === tab &&
      (mode === "teach" || c.document.kind === "cards"),
  );
  const selected = state.collections.find(
      (c) => c.id === collection && c.status === "ready",
    ),
    active = state.runs.find(
      (r) =>
        r.status === "active" &&
        r.classId === cls &&
        r.collectionId === collection &&
        r.version === selected?.version &&
        r.mode === mode,
    );
  async function start() {
    if (lock.current || !selected || !cls) return;
    lock.current = true;
    setBusy(true);
    try {
      if (active) {
        router.push(`/guru/sesi/${active.id}`);
        return;
      }
      const value = runSchema.parse(
        await libraryCall({
          action: "start",
          id: runId.current,
          classId: cls,
          collectionId: collection,
          version: selected.version,
          date,
          mode,
        }),
      );
      await refresh();
      router.push(`/guru/sesi/${value.id}`);
    } catch {
      setMessage("Sesi belum dimulai. Periksa pilihan dan sambungan.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Siapkan sesi"
        title={mode === "teach" ? "Mulai mengajar" : "Buat asesmen"}
        description="Pilih kelas dan materi. Sesi yang sudah berjalan dapat dilanjutkan."
      />
      {!classes.length ? (
        <StateNotice
          title="Tambahkan kelas untuk memulai"
          action={
            <Button asChild>
              <Link href="/guru/kelas">Tambahkan kelas</Link>
            </Button>
          }
        >
          Buat rombel dan jumlah siswa, lalu kembali untuk memilih soal.
        </StateNotice>
      ) : (
        <section className={`${panel} studio-start-form`}>
          <label className="block">
            <span className="studio-step" aria-hidden>
              1
            </span>{" "}
            Kelas
            <select
              className={field}
              value={cls}
              onChange={(e) => setClass(e.target.value)}
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            Tanggal
            <input
              className={field}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </label>
          <div
            role="tablist"
            aria-label="Sumber soal"
            className="studio-tabs flex gap-2"
          >
            {(["system", "teacher"] as const).map((t) => (
              <Button
                key={t}
                role="tab"
                aria-selected={tab === t}
                variant={tab === t ? "default" : "outline"}
                onClick={() => {
                  setTab(t);
                  setCollection("");
                  setPreview(false);
                }}
              >
                {t === "system" ? "Dari Sistem" : "Soal Saya"}
              </Button>
            ))}
          </div>
          <label className="block">
            <span className="studio-step" aria-hidden>
              2
            </span>{" "}
            Kumpulan soal
            <select
              className={field}
              value={collection}
              onChange={(e) => {
                setCollection(e.target.value);
                setPreview(false);
              }}
            >
              <option value="">Pilih kumpulan</option>
              {available.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.document.title}
                </option>
              ))}
            </select>
          </label>
          {!available.length && (
            <p>
              Belum ada kumpulan jenis ini.{" "}
              <Link href="/guru/soal/baru" className="text-primary underline">
                Buat kumpulan soal
              </Link>
            </p>
          )}
          {selected && (
            <>
              <p className="studio-start-summary">
                <span className="studio-step" aria-hidden>
                  3
                </span>{" "}
                {classes.find((c) => c.id === cls)?.label} ·{" "}
                {selected.document.items.length} soal ·{" "}
                {selected.document.kind === "cards"
                  ? "Kartu Nalar"
                  : "Interaktif di layar"}
              </p>
              <Button variant="outline" onClick={() => setPreview(!preview)}>
                Preview materi
              </Button>
              {preview &&
                selected.document.items.map((item, index) => (
                  <div
                    key={item.id}
                    data-library-preview
                    className="rounded-input border p-3"
                  >
                    <LibraryItemView
                      item={publicLibraryItem(item)}
                      row={index + 1}
                    />
                  </div>
                ))}
              <p className="text-sm text-muted-foreground">
                Sambungkan Layar Kelas dari halaman sesi setelah ini.
              </p>
            </>
          )}
          <Button
            disabled={busy || !selected || !cls || !date}
            onClick={() => void start()}
          >
            {active
              ? "Lanjutkan sesi"
              : mode === "assessment"
                ? "Simpan & mulai asesmen"
                : "Mulai sesi"}
          </Button>
        </section>
      )}
      <p role="status">{message}</p>
    </div>
  );
}
