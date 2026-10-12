"use client";
import { useRef, useState } from "react";
import { libraryV2Call } from "@/local/learning-client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTeacher } from "@/features/guru/app-context";
import { runV2Schema, publicLibraryItem } from "@/contracts/library";
import { Button } from "@/ui/components/button";
import { field, panel, jakartaDate } from "./client";
import { PageHeader, StateNotice, WorkflowSteps } from "@/ui/components/studio";
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
  const { classes, state, refresh, canMutate } = useTeacher(),
    router = useRouter(),
    [cls, setClass] = useState(classId || classes[0]?.id || ""),
    [collection, setCollection] = useState(collectionId),
    [date, setDate] = useState(jakartaDate()),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [responseMethod, setResponseMethod] = useState<"none" | "cards">(
      mode === "assessment" ? "cards" : "none",
    ),
    [preview, setPreview] = useState(false),
    [previewIndex, setPreviewIndex] = useState(0);
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
        r.mode === mode &&
        r.responseMethod ===
          (selected?.document.kind === "cards" ? responseMethod : "none") &&
        !r.parentLessonId,
    );
  async function start() {
    if (lock.current || !selected || !cls || !canMutate) return;
    lock.current = true;
    setBusy(true);
    setMessage("");
    try {
      if (active) {
        router.push(`/guru/sesi/${active.id}`);
        return;
      }
      const value = runV2Schema.parse(
        await libraryV2Call({
          action: "start",
          id: runId.current,
          classId: cls,
          collectionId: collection,
          version: selected.version,
          date,
          mode,
          responseMethod:
            selected.document.kind === "cards" ? responseMethod : "none",
        }),
      );
      await refresh().catch(() => undefined);
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
        title={mode === "teach" ? "Mulai mengajar" : "Buat asesmen"}
        description={
          mode === "assessment"
            ? "Pilih soal pilihan ganda. Setelah itu, cetak kartu, kumpulkan jawaban, dan lihat hasil siswa."
            : "Pilih kelas dan soal. Setelah itu Anda bisa menampilkan soal di layar atau mengajar dari perangkat ini."
        }
      />
      <WorkflowSteps
        current={selected ? 2 : cls ? 1 : 0}
        steps={["Pilih kelas", "Pilih soal", "Mulai sesi"]}
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
          Isi nama kelas dan jumlah siswa. Setelah tersimpan, pilih Mulai
          mengajar.
        </StateNotice>
      ) : (
        <section className={`${panel} studio-start-form`}>
          <label className="block">
            Kelas
            <select
              className={field}
              value={cls}
              onChange={(e) => {
                runId.current = crypto.randomUUID();
                setClass(e.target.value);
              }}
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <details>
            <summary className="min-h-12 cursor-pointer content-center text-sm text-muted-foreground">
              {active
                ? `Sesi ${active.date.split("-").reverse().join("/")} masih berjalan`
                : `Tanggal sesi: ${date.split("-").reverse().join("/")} · ubah`}
            </summary>
            <label className="block">
              Tanggal
              <input
                className={field}
                type="date"
                value={active?.date ?? date}
                disabled={Boolean(active)}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </label>
          </details>
          <label className="block">
            Kumpulan soal
            <select
              className={field}
              value={collection}
              onChange={(e) => {
                runId.current = crypto.randomUUID();
                setCollection(e.target.value);
                setPreview(false);
                setPreviewIndex(0);
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
          {mode === "teach" && selected?.document.kind === "cards" && (
            <fieldset className="space-y-2">
              <legend className="font-semibold">Bagaimana soal dipakai?</legend>
              {(["none", "cards"] as const).map((method) => (
                <label
                  key={method}
                  className="flex min-h-12 items-center gap-3"
                >
                  <input
                    type="radio"
                    name="responseMethod"
                    checked={responseMethod === method}
                    onChange={() => {
                      runId.current = crypto.randomUUID();
                      setResponseMethod(method);
                    }}
                  />
                  {method === "none"
                    ? "Bahas soal saja"
                    : "Kumpulkan jawaban dengan kartu"}
                </label>
              ))}
              <p className="text-sm text-muted-foreground">
                {responseMethod === "none"
                  ? "Tanpa pemindaian atau nilai individual. Ringkasan kegiatan masuk Hasil."
                  : "Jawaban dicatat per siswa. Siapkan lembar soal dan kartu jawaban."}
              </p>
            </fieldset>
          )}
          {mode === "assessment" && (
            <p className="text-sm text-muted-foreground">
              Kartu Nalar adalah lembar jawaban siswa. Anda bisa mengunduh dan
              mencetaknya pada halaman berikutnya.
            </p>
          )}
          {unavailable.length > 0 && (
            <details className="text-sm">
              <summary className="min-h-12 cursor-pointer font-semibold text-primary">
                {/* F9: the unexplained count is gone. The disclosure names the situation; the
                    explanation is inline, in the panel it opens. */}
                Soal saya belum muncul?
              </summary>
              <ul className="space-y-3">
                <li>
                  Kumpulan yang belum siap, atau yang dipakai untuk kegiatan
                  interaktif, tidak muncul di daftar ini.
                </li>
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
                {classes.find((c) => c.id === cls)?.label} ·{" "}
                {selected.document.items.length} soal ·{" "}
                {selected.document.kind === "cards"
                  ? "Kartu Nalar"
                  : "Interaktif di layar"}
              </p>
              <Button variant="outline" onClick={() => setPreview(!preview)}>
                {preview ? "Tutup pratinjau" : "Preview materi"}
              </Button>
              {preview && (
                <section aria-label="Pratinjau materi" className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      disabled={previewIndex === 0}
                      onClick={() => setPreviewIndex(previewIndex - 1)}
                    >
                      Soal sebelumnya
                    </Button>
                    <span>
                      Soal {previewIndex + 1}/{selected.document.items.length}
                    </span>
                    <Button
                      variant="outline"
                      disabled={
                        previewIndex >= selected.document.items.length - 1
                      }
                      onClick={() => setPreviewIndex(previewIndex + 1)}
                    >
                      Soal berikutnya
                    </Button>
                  </div>
                  <div
                    data-library-preview
                    className="rounded-input border p-3"
                  >
                    <LibraryItemView
                      key={selected.document.items[previewIndex].id}
                      item={publicLibraryItem(
                        selected.document.items[previewIndex],
                      )}
                      row={previewIndex + 1}
                    />
                  </div>
                </section>
              )}
              <p className="text-sm text-muted-foreground">
                Sambungkan Layar Kelas dari halaman sesi setelah ini.
              </p>
            </>
          )}
          {active && (
            <p className="practice-feedback">
              Sesi {active.date.split("-").reverse().join("/")} masih berjalan
              pada soal {active.position + 1}/{active.document.items.length}.
              Lanjutkan sesi tersebut. Untuk kegiatan baru, akhiri sesi lama
              terlebih dahulu.
            </p>
          )}
          <Button
            disabled={!canMutate || busy || !selected || !cls || !date}
            onClick={() => void start()}
          >
            {busy
              ? "Membuka sesi…"
              : active
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
