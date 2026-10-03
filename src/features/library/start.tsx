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
    [date, setDate] = useState(jakartaDate()),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [preview, setPreview] = useState(false);
  const lock = useRef(false),
    runId = useRef<string>(crypto.randomUUID());
  const available = state.collections.filter(
    (c) =>
      c.status === "ready" && (mode === "teach" || c.document.kind === "cards"),
  );
  const unavailable = state.collections.filter(
    (c) =>
      c.source === "teacher" &&
      c.status !== "archived" &&
      !available.some((a) => a.id === c.id),
  );
  const selected = available.find((c) => c.id === collection),
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
              {(["teacher", "system"] as const).map((source) => (
                <optgroup
                  key={source}
                  label={source === "teacher" ? "Soal saya" : "Soal siap pakai"}
                >
                  {available
                    .filter((c) => c.source === source)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.document.title}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </label>
          {mode === "assessment" && (
            <p className="text-sm text-muted-foreground">
              Pilih soal dengan pilihan jawaban dan kunci. Kartu Nalar dicetak
              pada halaman asesmen setelah ini.
            </p>
          )}
          {unavailable.length > 0 && (
            <details className="text-sm">
              <summary className="min-h-12 cursor-pointer font-semibold text-primary">
                Soal saya belum muncul? ({unavailable.length})
              </summary>
              <ul className="space-y-3">
                {unavailable.map((c) => (
                  <li key={c.id} className="rounded-input border p-3">
                    <b>{c.document.title || "Kumpulan tanpa judul"}</b>
                    <p>
                      {c.status !== "ready"
                        ? "Masih berupa draft. Lengkapi soal lalu simpan sebagai siap digunakan."
                        : "Soal ini untuk kegiatan interaktif. Asesmen dengan Kartu Nalar memerlukan pilihan jawaban dan kunci."}
                    </p>
                    <Link
                      className="inline-flex min-h-12 items-center font-semibold text-primary underline"
                      href={
                        c.document.kind === "cards" || c.status !== "ready"
                          ? `/guru/soal/${c.id}`
                          : `/guru/soal/baru?from=${c.id}`
                      }
                    >
                      {c.document.kind === "cards" || c.status !== "ready"
                        ? "Lengkapi soal"
                        : "Buat versi untuk Kartu Nalar"}
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          )}
          {!available.length && (
            <p>
              Belum ada soal siap digunakan.{" "}
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
