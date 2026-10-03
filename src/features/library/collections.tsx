"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { libraryCache, removeLibraryCache } from "@/local/library";
import { useDraftGuard } from "@/ui/use-draft-guard";
import { useRouter } from "next/navigation";
import { useTeacher } from "@/features/guru/app-context";
import { Button } from "@/ui/components/button";
import {
  CHOICES,
  collectionDocumentSchema,
  collectionSchema,
  libraryItemSchema,
  publicLibraryItem,
  type DraftDocument,
  type Collection,
} from "@/contracts/library";
import { field, panel, libraryCall } from "./client";
import { LibraryItemView } from "./item-view";
import { defaultTool, ToolFields, TOOL_LABELS } from "./tool-fields";
import { InteractiveHelp } from "./interactive-help";
import { templateItem } from "./templates";
import { PageHeader, StateNotice } from "@/ui/components/studio";
import { ToolPoster } from "@/ui/components/decorative-scene";
import { FileQuestion, Plus } from "lucide-react";
export function CollectionsPage({
  initialTab = "system",
  savedId,
}: { initialTab?: "system" | "teacher"; savedId?: string } = {}) {
  const { state } = useTeacher(),
    [tab, setTab] = useState<"system" | "teacher">(initialTab);
  const savedCollection = savedId
    ? state.collections.find(
        (c) =>
          c.id === savedId && c.source === "teacher" && c.status === "ready",
      )
    : undefined;
  const sets = state.collections.filter(
    (c) => c.source === tab && c.status !== "archived",
  );
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Rak ide mengajar"
        title="Soal & Presentasi"
        description="Simpan sekali, gunakan di berbagai kelas."
        actions={
          <Button asChild>
            <Link href="/guru/soal/baru">
              <Plus size={20} aria-hidden />
              Buat kumpulan soal
            </Link>
          </Button>
        }
      />
      {savedCollection && (
        <p role="status" className="practice-feedback">
          Kumpulan tersimpan dan siap digunakan.{" "}
          <b>{savedCollection.document.title}</b> ada di Soal Saya. Buka
          kumpulan untuk mengedit atau menggunakannya.
        </p>
      )}
      <div
        role="group"
        aria-label="Sumber soal"
        className="studio-tabs flex gap-2"
      >
        {(["system", "teacher"] as const).map((t) => (
          <Button
            key={t}
            aria-pressed={tab === t}
            variant={tab === t ? "default" : "outline"}
            onClick={() => setTab(t)}
          >
            {t === "system" ? "Dari Sistem" : "Soal Saya"}
          </Button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {sets.map((c) => (
          <Link
            key={c.id}
            href={`/guru/soal/${c.id}`}
            className={`${panel} friendly-card studio-catalog-card`}
          >
            {c.document.kind === "cards" ? (
              <FileQuestion size={28} className="text-primary" aria-hidden />
            ) : (
              <ToolPoster
                asset={
                  c.document.items.some(
                    (i) =>
                      i.kind === "interactive" && i.tool.kind === "balance",
                  )
                    ? "balance-scale"
                    : c.document.items.some(
                          (i) =>
                            i.kind === "interactive" &&
                            i.tool.kind === "algebra",
                        )
                      ? "algebra-kit"
                      : "learning-board"
                }
              />
            )}
            <h2 className="text-xl font-bold">
              {c.document.title || "Kumpulan tanpa judul"}
            </h2>
            <p>
              {c.document.kind === "cards"
                ? "Kartu Nalar"
                : "Interaktif di layar"}{" "}
              · {c.document.items.length} soal
            </p>
            <p className="text-sm text-muted-foreground">
              {c.status === "ready" ? "Siap digunakan" : "Draft"}
              {c.source === "system" ? " · Materi sistem" : ""}
            </p>
            <span className="inline-flex min-h-12 items-center font-semibold text-primary">
              Buka kumpulan →
            </span>
          </Link>
        ))}
      </div>
      {!sets.length && (
        <StateNotice
          title="Belum ada kumpulan"
          action={
            <Button asChild>
              <Link href="/guru/soal/baru">Buat soal pertama</Link>
            </Button>
          }
        >
          Mulai dari satu pertanyaan, lalu tambahkan contoh atau alat belajar.
        </StateNotice>
      )}
    </div>
  );
}
export function CollectionPage({
  id,
  fromId,
}: {
  id: string;
  fromId?: string;
}) {
  const { state } = useTeacher();
  const existing = state.collections.find((c) => c.id === id);
  if (id !== "baru" && !existing)
    return (
      <StateNotice
        kind="error"
        title="Kumpulan tidak ditemukan"
        action={<Link href="/guru/soal">Kembali ke daftar soal</Link>}
      >
        Kumpulan mungkin diarsipkan. Pilih kumpulan lain dari daftar.
      </StateNotice>
    );
  const assessmentSource =
    id === "baru" && fromId
      ? state.collections.find(
          (c) => c.id === fromId && c.status !== "archived",
        )
      : undefined;
  return (
    <CollectionEditor
      key={`${id}:${fromId ?? ""}`}
      initial={existing}
      assessmentSource={assessmentSource}
    />
  );
}
function CollectionEditor({
  initial,
  assessmentSource,
}: {
  initial?: Collection;
  assessmentSource?: Collection;
}) {
  const { refresh, scope, canMutate } = useTeacher(),
    router = useRouter();
  const [id, setId] = useState(() => initial?.id ?? crypto.randomUUID()),
    [revision, setRevision] = useState(initial?.revision ?? 0),
    [document, setDocument] = useState<DraftDocument>(
      () =>
        initial?.document ??
        (assessmentSource
          ? {
              title: `${assessmentSource.document.title.slice(0, 70)} · Kartu Nalar`,
              kind: "cards",
              items: assessmentSource.document.items.map((item) => ({
                id: crypto.randomUUID(),
                kind: "card",
                prompt: item.prompt,
                options: ["", "", "", ""],
                key: "A",
                explanation: "",
              })),
            }
          : { title: "", kind: "cards", items: [] }),
    ),
    [source, setSource] = useState(initial?.source ?? "teacher"),
    [version, setVersion] = useState(initial?.version ?? 0),
    [preview, setPreview] = useState<number | null>(null),
    [message, setMessage] = useState(""),
    [errors, setErrors] = useState<Record<string, string>>({}),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState(initial?.status === "ready"),
    [activeItem, setActiveItem] = useState<string | undefined>(
      document.items[0]?.id,
    ),
    [templateUndo, setTemplateUndo] = useState<{
      index: number;
      item: DraftDocument["items"][number];
    }>();
  const readonly = source === "system";
  const [dirty, setDirty] = useState(false);
  const [draftState, setDraftState] = useState("");
  const [deleted, setDeleted] = useState<DraftDocument>();
  const writes = useRef(Promise.resolve());
  const saving = useRef(false);
  const edited = useRef(false);
  const writeVersion = useRef(0);
  const draftKey = initial?.id ?? `new:${assessmentSource?.id ?? "blank"}`;
  useDraftGuard(dirty && draftState !== "Draft tersimpan di perangkat ini.");
  useEffect(() => {
    if (initial?.source === "system") return;
    let active = true;
    void libraryCache(scope, "editorDraft", draftKey)
      .then((draft) => {
        if (!draft || !active || edited.current) return;
        if (draft.revision !== (initial?.revision ?? 0)) {
          setMessage(
            "Ada draft di perangkat ini, tetapi soal di server sudah berubah. Draft lama tetap disimpan; jangan menimpa soal sebelum membandingkan isinya.",
          );
          return;
        }
        setId(draft.id);
        setDocument(draft.document);
        setDirty(true);
        setSaved(false);
        setActiveItem(draft.document.items[0]?.id);
        setDraftState("Draft tersimpan di perangkat ini.");
        setMessage(
          "Draft yang belum selesai dipulihkan. Lanjutkan mengedit, lalu simpan saat siap.",
        );
      })
      .catch(() => {
        if (active)
          setDraftState(
            "Penyimpanan draft di perangkat belum tersedia. Simpan untuk nanti sebelum keluar.",
          );
      });
    return () => {
      active = false;
    };
  }, [scope, draftKey, initial?.revision, initial?.source]);
  function change(next: DraftDocument) {
    if (!canMutate || busy) return;
    edited.current = true;
    setDocument(next);
    setDirty(true);
    setDraftState("Menyimpan draft di perangkat…");
    const generation = ++writeVersion.current;
    writes.current = writes.current
      .then(async () => {
        await libraryCache(scope, "editorDraft", draftKey, {
          id,
          revision,
          document: next,
        });
        if (generation === writeVersion.current)
          setDraftState("Draft tersimpan di perangkat ini.");
      })
      .catch(() =>
        setDraftState(
          "Draft belum tersimpan. Jangan tutup halaman; periksa isian lalu pilih Simpan untuk nanti.",
        ),
      );
    setSaved(false);
    setErrors({});
  }
  function changeItem(index: number, item: DraftDocument["items"][number]) {
    change({
      ...document,
      items: document.items.map((old, i) => (i === index ? item : old)),
    });
  }
  async function save(ready: boolean) {
    if (busy || saving.current || !canMutate) return;
    saving.current = true;
    setBusy(true);
    setMessage("");
    try {
      const parsed = collectionDocumentSchema.safeParse(document);
      if (ready && !parsed.success) {
        setErrors(
          Object.fromEntries(
            parsed.error.issues.map((e) => [e.path.join("."), e.message]),
          ),
        );
        await persist(false);
        setMessage(
          "Draft tersimpan. Lengkapi isian yang ditandai sebelum siap digunakan.",
        );
        return;
      }
      await persist(ready);
      if (ready) {
        router.push(`/guru/soal?tab=teacher&saved=${id}`);
        return;
      }
      setMessage(
        ready ? "Kumpulan tersimpan dan siap digunakan." : "Draft tersimpan.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error && error.message === "CONFLICT"
          ? "Kumpulan telah berubah di perangkat lain. Salin isi sebelum memuat ulang."
          : "Belum tersimpan. Periksa isian alat dan internet.",
      );
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  async function persist(ready: boolean) {
    const response = collectionSchema.parse(
      await libraryCall({ action: "save", id, revision, ready, document }),
    );
    setRevision(response.revision);
    setVersion(response.version);
    setSaved(ready);
    await writes.current;
    await removeLibraryCache(scope, "editorDraft", draftKey).catch(
      () => undefined,
    );
    setDirty(false);
    setDraftState("");
    await refresh().catch(() => undefined);
    if (!initial) history.replaceState(null, "", `/guru/soal/${id}`);
  }
  function add() {
    if (document.items.length >= 5) return;
    const next =
      document.kind === "cards"
        ? {
            id: crypto.randomUUID(),
            kind: "card" as const,
            prompt: "",
            options: ["", "", "", ""] as [string, string, string, string],
            key: "A" as const,
            explanation: "",
          }
        : {
            id: crypto.randomUUID(),
            kind: "interactive" as const,
            prompt: "",
            tool: defaultTool("number-line"),
          };
    change({ ...document, items: [...document.items, next] });
    setActiveItem(next.id);
  }
  function errorAt(prefix: string) {
    const found = Object.entries(errors).filter(([key]) =>
      key.startsWith(prefix),
    );
    return found.length ? (
      <p role="alert" className="mt-1 text-sm text-red-800">
        {prefix.includes("options")
          ? "Isi empat pilihan yang berbeda."
          : prefix === "title"
            ? "Tuliskan nama kumpulan."
            : "Lengkapi pertanyaan dan isian alat."}
      </p>
    ) : null;
  }
  const previewResult = libraryItemSchema.safeParse(
    preview === null ? undefined : document.items[preview],
  );
  const previewItem = previewResult.success ? previewResult.data : undefined;
  return (
    <div className="space-y-5">
      <Link
        href="/guru/soal"
        className="inline-flex min-h-12 items-center text-primary"
      >
        ← Soal & Presentasi
      </Link>
      <PageHeader
        eyebrow={readonly ? "Materi sistem" : "Studio soal"}
        title={
          readonly
            ? document.title
            : initial
              ? "Edit kumpulan soal"
              : "Buat kumpulan soal"
        }
        description="Susun pertanyaan, isi alat, lalu periksa tampilan yang akan dilihat kelas."
      />
      {assessmentSource && (
        <p className="practice-feedback">
          Pertanyaan disalin dari “{assessmentSource.document.title}”. Isi empat
          pilihan dan tentukan jawaban yang benar pada setiap soal. Kumpulan
          asli tetap ada.
        </p>
      )}
      {readonly && (
        <p>Materi sistem dapat dipakai langsung. Salin untuk mengubah soal.</p>
      )}
      {version > 0 && !readonly && (
        <p className="text-sm text-muted-foreground">
          Soal yang diubah berlaku untuk sesi baru. Hasil sesi lama tetap sama.
        </p>
      )}
      {draftState && (
        <p role="status" className="text-sm text-primary">
          {draftState}
        </p>
      )}
      <label className="block font-semibold">
        Nama kumpulan
        <input
          className={field}
          value={document.title}
          maxLength={90}
          readOnly={readonly || busy || !canMutate}
          onChange={(e) => change({ ...document, title: e.target.value })}
        />
        {errorAt("title")}
      </label>
      <label className="block font-semibold">
        Jenis kumpulan
        <select
          className={field}
          disabled={readonly || busy || !canMutate || document.items.length > 0}
          value={document.kind}
          onChange={(e) =>
            change({
              ...document,
              kind: e.target.value === "interactive" ? "interactive" : "cards",
            })
          }
        >
          <option value="cards">Soal dengan Kartu Nalar</option>
          <option value="interactive">Interaktif di layar</option>
        </select>
      </label>
      <p className="text-sm text-muted-foreground">
        Maksimal 5 soal. Untuk Kartu Nalar, satu soal memakai satu baris.
        {!readonly &&
          document.items.length > 0 &&
          " Jenis kumpulan tetap selama ada soal. Buat kumpulan baru untuk memakai jenis lain."}
      </p>
      {deleted && (
        <div className="practice-feedback">
          Soal dihapus.{" "}
          <Button
            variant="outline"
            onClick={() => {
              change(deleted);
              setActiveItem(deleted.items[0]?.id);
              setDeleted(undefined);
            }}
          >
            Batalkan penghapusan
          </Button>
        </div>
      )}
      <div className="studio-editor-layout">
        <aside className="studio-editor-index" aria-label="Daftar soal">
          <p>{document.items.length}/5 soal · Pilih soal untuk mengedit</p>
          <nav>
            {document.items.map((item, index) => (
              <button
                type="button"
                key={item.id}
                aria-pressed={activeItem === item.id}
                onClick={() => {
                  setActiveItem(item.id);
                  setPreview(null);
                }}
              >
                Soal {index + 1}
                <small>{item.prompt || "Belum ada pertanyaan"}</small>
              </button>
            ))}
          </nav>
          {!document.items.length && (
            <p>Tambahkan soal pertama untuk mulai menyusun.</p>
          )}
        </aside>
        <div className="studio-editor-body space-y-5">
          {document.items.map((item, index) => (
            <article
              key={item.id}
              className={`${panel} studio-editor-item`}
              hidden={
                activeItem !== item.id &&
                document.items.some((i) => i.id === activeItem)
              }
              aria-label={`Soal ${index + 1}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-bold">Soal {index + 1}</h2>
                {!readonly && (
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      disabled={index === 0 || busy || !canMutate}
                      aria-label={`Naikkan soal ${index + 1}`}
                      onClick={() => {
                        const items = [...document.items];
                        [items[index - 1], items[index]] = [
                          items[index],
                          items[index - 1],
                        ];
                        change({ ...document, items });
                      }}
                    >
                      ↑
                    </Button>
                    <Button
                      variant="outline"
                      aria-label={`Hapus soal ${index + 1}`}
                      disabled={busy || !canMutate}
                      onClick={() => {
                        setDeleted(document);
                        setActiveItem(
                          document.items.find((_, i) => i !== index)?.id,
                        );
                        change({
                          ...document,
                          items: document.items.filter((_, i) => i !== index),
                        });
                      }}
                    >
                      Hapus
                    </Button>
                  </div>
                )}
              </div>
              <label className="block">
                Pertanyaan
                <textarea
                  aria-label="Pertanyaan"
                  className={field}
                  rows={2}
                  value={item.prompt}
                  maxLength={400}
                  readOnly={readonly || busy || !canMutate}
                  onChange={(e) =>
                    changeItem(index, { ...item, prompt: e.target.value })
                  }
                />
                {errorAt(`items.${index}.prompt`)}
              </label>
              {item.kind === "card" ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {CHOICES.map((label, n) => (
                      <label key={label}>
                        Pilihan {label}
                        <input
                          className={field}
                          value={item.options[n]}
                          maxLength={400}
                          readOnly={readonly || busy || !canMutate}
                          onChange={(e) => {
                            const options = [...item.options] as [
                              string,
                              string,
                              string,
                              string,
                            ];
                            options[n] = e.target.value;
                            changeItem(index, { ...item, options });
                          }}
                        />
                      </label>
                    ))}
                  </div>
                  {errorAt(`items.${index}.options`)}
                  <label className="block">
                    Kunci jawaban
                    <select
                      className={field}
                      value={item.key}
                      disabled={readonly || busy || !canMutate}
                      onChange={(e) =>
                        changeItem(index, {
                          ...item,
                          key: CHOICES.find((c) => c === e.target.value) ?? "A",
                        })
                      }
                    >
                      {CHOICES.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    Penjelasan guru (opsional)
                    <textarea
                      className={field}
                      rows={2}
                      value={item.explanation}
                      maxLength={600}
                      readOnly={readonly || busy || !canMutate}
                      onChange={(e) =>
                        changeItem(index, {
                          ...item,
                          explanation: e.target.value,
                        })
                      }
                    />
                  </label>
                  <p className="text-sm">
                    Pilihan ? / Belum tahu sudah disediakan.
                  </p>
                </>
              ) : (
                <>
                  <label className="block">
                    Aktivitas
                    <select
                      className={field}
                      disabled={readonly || busy || !canMutate}
                      value={
                        item.kind === "writing" ? "writing" : item.tool.kind
                      }
                      onChange={(e) =>
                        changeItem(
                          index,
                          e.target.value === "writing"
                            ? {
                                id: item.id,
                                prompt: item.prompt,
                                kind: "writing",
                              }
                            : {
                                id: item.id,
                                prompt: item.prompt,
                                kind: "interactive",
                                tool: defaultTool(e.target.value),
                              },
                        )
                      }
                    >
                      {TOOL_LABELS.map(([kind, label]) => (
                        <option key={kind} value={kind}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  {!readonly && (
                    <InteractiveHelp
                      key={item.kind === "writing" ? "writing" : item.tool.kind}
                      kind={
                        item.kind === "writing" ? "writing" : item.tool.kind
                      }
                      onApply={(template) => {
                        setTemplateUndo({ index, item });
                        changeItem(index, templateItem(item.id, template));
                        setPreview(null);
                      }}
                    />
                  )}
                  {item.kind === "interactive" && !readonly && (
                    <fieldset disabled={busy || !canMutate} className="min-w-0">
                      <ToolFields
                        tool={item.tool}
                        onChange={(tool) =>
                          changeItem(index, { ...item, tool })
                        }
                      />
                    </fieldset>
                  )}{" "}
                  {errorAt(`items.${index}.tool`)}
                </>
              )}
              {templateUndo?.index === index && (
                <Button
                  variant="outline"
                  onClick={() => {
                    changeItem(index, templateUndo.item);
                    setTemplateUndo(undefined);
                  }}
                >
                  Batalkan contoh
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => {
                  const single = collectionDocumentSchema.safeParse({
                    ...document,
                    title: document.title || "Pratinjau",
                    items: [item],
                  });
                  if (!single.success) {
                    setMessage("Lengkapi soal sebelum membuka preview.");
                    return;
                  }
                  setPreview(index);
                }}
              >
                Preview soal {index + 1}
              </Button>
            </article>
          ))}
          {!readonly && (
            <Button
              variant="outline"
              disabled={busy || !canMutate || document.items.length >= 5}
              onClick={add}
            >
              Tambah soal
            </Button>
          )}
          {previewItem && preview !== null && (
            <section className={panel} aria-label="Pratinjau soal">
              <Button variant="outline" onClick={() => setPreview(null)}>
                Tutup preview
              </Button>
              <div
                data-library-preview
                className="min-h-0 rounded-input bg-pn-board p-4"
              >
                <LibraryItemView
                  key={
                    previewItem.kind === "interactive"
                      ? `${previewItem.id}:${JSON.stringify(previewItem.tool)}`
                      : previewItem.id
                  }
                  item={publicLibraryItem(previewItem)}
                  row={preview + 1}
                />
              </div>
            </section>
          )}
          {preview !== null && !previewItem && (
            <section className={panel} aria-label="Pratinjau soal">
              <Button variant="outline" onClick={() => setPreview(null)}>
                Tutup preview
              </Button>
              <p role="status">
                Periksa isian yang diubah untuk melanjutkan preview.
              </p>
            </section>
          )}
        </div>
      </div>
      <div className="studio-action-bar flex flex-wrap gap-3">
        {readonly ? (
          <Button
            variant="outline"
            disabled={busy || !canMutate}
            onClick={() => {
              setId(crypto.randomUUID());
              setRevision(0);
              setVersion(0);
              setSource("teacher");
              setSaved(false);
              setMessage(
                "Salinan siap diedit. Simpan untuk menambahkannya ke Soal Saya.",
              );
            }}
          >
            Salin ke Soal Saya
          </Button>
        ) : (
          <>
            <Button
              variant="outline"
              disabled={busy || !canMutate}
              onClick={() => void save(false)}
            >
              Simpan untuk nanti
            </Button>
            <Button
              disabled={busy || !canMutate}
              onClick={() => void save(true)}
            >
              Simpan & siap digunakan
            </Button>
          </>
        )}
        {(saved || readonly) && (
          <Button
            variant="outline"
            onClick={() => router.push(`/guru/mulai?collection=${id}`)}
          >
            Gunakan di kelas
          </Button>
        )}
        {!readonly && revision > 0 && (
          <Button
            variant="outline"
            disabled={busy || !canMutate}
            onClick={async () => {
              if (
                !window.confirm(
                  "Arsipkan kumpulan? Riwayat hasil tetap tersimpan.",
                )
              )
                return;
              if (saving.current || !canMutate) return;
              saving.current = true;
              setBusy(true);
              try {
                await libraryCall({ action: "archive", id, revision });
                await refresh().catch(() => undefined);
                router.push("/guru/soal");
              } catch {
                setMessage(
                  "Kumpulan belum diarsipkan. Periksa sambungan, lalu coba lagi.",
                );
              } finally {
                saving.current = false;
                setBusy(false);
              }
            }}
          >
            Arsipkan
          </Button>
        )}
      </div>
      <p role="status">{message}</p>
    </div>
  );
}
