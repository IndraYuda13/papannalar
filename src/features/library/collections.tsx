"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { libraryCache, removeLibraryCache } from "@/local/library";
import { useDraftGuard } from "@/ui/use-draft-guard";
import { useRouter } from "next/navigation";
import { useTeacher } from "@/features/guru/app-context";
import { Button } from "@/ui/components/button";
import { confirmAction } from "@/ui/components/confirm";
import {
  CHOICES,
  collectionDocumentSchema,
  collectionV2Schema,
  libraryItemSchema,
  publicLibraryItem,
  type DraftDocument,
  type Collection,
} from "@/contracts/library";
import { field, panel, libraryCall } from "./client";
import { libraryV2Call } from "@/local/learning-client";
import { MappingFields } from "./mapping-fields";
import { featureCache, removeFeatureCache } from "./v2-cache";
import { collectionMappingSchema } from "@/contracts/learning-evidence";
import type { CollectionMapping } from "@/contracts/learning-evidence";
import { LibraryItemView } from "./item-view";
import { defaultTool, ToolFields, TOOL_LABELS } from "./tool-fields";
import { InteractiveHelp } from "./interactive-help";
import { templateItem } from "./templates";
import {
  PageHeader,
  Section,
  StateNotice,
  BoardLegality,
} from "@/ui/components/studio";
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
    <div className="space-y-6">
      <PageHeader
        title="Soal"
        description="Simpan sekali, gunakan di berbagai kelas."
        actions={
          <Button asChild>
            <Link href="/guru/soal/baru">
              <Plus size={20} strokeWidth={1.8} aria-hidden />
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
      <div role="group" aria-label="Sumber soal" className="studio-segmented">
        {(["system", "teacher"] as const).map((t) => (
          <Button
            key={t}
            variant="quiet"
            aria-pressed={tab === t}
            onClick={() => setTab(t)}
          >
            {t === "system" ? "Dari Sistem" : "Soal Saya"}
          </Button>
        ))}
      </div>
      <Section label={tab === "system" ? "Kumpulan dari sistem" : "Soal saya"}>
        <ul className="studio-row-list">
          {sets.map((c) => (
            <li key={c.id}>
              <Link
                className="studio-row"
                href={`/guru/soal/${c.id}`}
                title={c.document.title || "Kumpulan tanpa judul"}
              >
                <span className="studio-row-icon" aria-hidden>
                  {c.document.kind === "cards" ? (
                    <FileQuestion size={22} strokeWidth={1.8} />
                  ) : (
                    <ToolPoster
                      asset={
                        c.document.items.some(
                          (i) =>
                            i.kind === "interactive" &&
                            i.tool.kind === "balance",
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
                </span>
                <span className="studio-row-content">
                  <h2>{c.document.title || "Kumpulan tanpa judul"}</h2>
                  <p>
                    {c.document.kind === "cards"
                      ? "Kartu Nalar"
                      : "Interaktif di layar"}{" "}
                    · {c.document.items.length} soal ·{" "}
                    {c.status === "ready" ? "Siap digunakan" : "Draft"}
                  </p>
                </span>
                <span className="studio-row-action" data-row-action>
                  Buka kumpulan
                </span>
              </Link>
            </li>
          ))}
        </ul>
        {!sets.length && (
          <StateNotice
            title="Belum ada yang cocok"
            action={
              <Button asChild>
                <Link href="/guru/soal/baru">Buat kumpulan soal</Link>
              </Button>
            }
          >
            Mulai dari satu pertanyaan, lalu tambahkan contoh atau alat belajar.
          </StateNotice>
        )}
      </Section>
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
  initial?: Collection & { mapping: CollectionMapping };
  assessmentSource?: Collection & { mapping: CollectionMapping };
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
  const [mapping, setMapping] = useState<CollectionMapping>(
    initial?.mapping ?? { default: null, overrides: [] },
  );
  const readonly = source === "system";
  const [dirty, setDirty] = useState(false);
  const [draftState, setDraftState] = useState("");
  const [deleted, setDeleted] = useState<DraftDocument>();
  const [pendingKind, setPendingKind] = useState<DraftDocument["kind"]>();
  const [kindUndo, setKindUndo] = useState<DraftDocument>();
  const writes = useRef(Promise.resolve());
  const saving = useRef(false);
  const edited = useRef(false);
  const writeVersion = useRef(0);
  const draftKey = initial?.id ?? `new:${assessmentSource?.id ?? "blank"}`;
  useDraftGuard(dirty && draftState !== "Draft tersimpan di perangkat ini.");
  useEffect(() => {
    if (initial?.source === "system") return;
    let active = true;
    void featureCache(
      scope,
      `mappingDraft:${draftKey}`,
      collectionMappingSchema,
    )
      .then((value) => {
        if (value && active && !edited.current) setMapping(value);
      })
      .catch(() => undefined);
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
  function chooseKind(kind: DraftDocument["kind"]) {
    if (readonly || busy || !canMutate || kind === document.kind) return;
    if (document.items.length) setPendingKind(kind);
    else change({ ...document, kind });
  }
  function convertKind() {
    if (!pendingKind || readonly || busy || !canMutate) return;
    setKindUndo(document);
    change({
      ...document,
      kind: pendingKind,
      items: document.items.map((item) =>
        pendingKind === "cards"
          ? {
              id: item.id,
              prompt: item.prompt,
              kind: "card",
              options: ["", "", "", ""],
              key: "A",
              explanation: "",
            }
          : { id: item.id, prompt: item.prompt, kind: "writing" },
      ),
    });
    setPendingKind(undefined);
    setTemplateUndo(undefined);
    setDeleted(undefined);
    setPreview(null);
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
    const response = collectionV2Schema.parse(
      await libraryV2Call({
        action: "save",
        id,
        revision,
        ready,
        document,
        mapping: {
          ...mapping,
          overrides: mapping.overrides.filter((o) =>
            document.items.some((i) => i.id === o.itemId),
          ),
        },
      }),
    );
    setRevision(response.revision);
    setVersion(response.version);
    setSaved(ready);
    await writes.current;
    await removeLibraryCache(scope, "editorDraft", draftKey).catch(
      () => undefined,
    );
    await removeFeatureCache(scope, `mappingDraft:${draftKey}`).catch(
      () => undefined,
    );
    setDirty(false);
    setDraftState("");
    setKindUndo(undefined);
    await refresh().catch(() => undefined);
    if (initial?.id !== id) history.replaceState(null, "", `/guru/soal/${id}`);
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
    <div className="space-y-6">
      <Link
        href="/guru/soal"
        className="inline-flex min-h-12 items-center text-pn-teal-700"
      >
        ← Soal
      </Link>
      <PageHeader
        title={
          readonly
            ? document.title
            : initial
              ? "Edit kumpulan soal"
              : "Buat kumpulan soal"
        }
        description={
          readonly
            ? "Materi sistem. Salin ke Soal Saya untuk mengubahnya."
            : "Susun pertanyaan, isi alat, lalu periksa tampilan yang akan dilihat kelas."
        }
      />
      {assessmentSource && (
        <p className="practice-feedback">
          Pertanyaan disalin dari “{assessmentSource.document.title}”. Isi empat
          pilihan dan tentukan jawaban yang benar pada setiap soal. Kumpulan
          asli tetap ada.
        </p>
      )}
      {readonly && (
        <section className={panel} aria-label="Mengubah soal sistem">
          <p>Soal sistem tidak diubah langsung.</p>
          <p>
            Salin ke Soal Saya untuk mengubah pertanyaan, jenis dan
            aktivitasnya.
          </p>
          <Button
            disabled={busy || !canMutate}
            onClick={() => {
              if (busy || !canMutate) return;
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
        </section>
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
      <MappingFields
        value={mapping}
        items={document.items}
        disabled={readonly || busy || !canMutate}
        onChange={(next) => {
          edited.current = true;
          setMapping(next);
          setDirty(true);
          setSaved(false);
          setDraftState(
            "Pemetaan belum disimpan. Pilih Simpan sebelum keluar.",
          );
          void featureCache(
            scope,
            `mappingDraft:${draftKey}`,
            collectionMappingSchema,
            next,
          ).catch(() =>
            setMessage(
              "Pemetaan belum tersimpan di perangkat. Simpan sebelum keluar.",
            ),
          );
        }}
      />
      {readonly ? (
        <p className="font-semibold">
          Jenis kumpulan
          <span className={`${field} block`}>
            {document.kind === "cards"
              ? "Soal dengan Kartu Nalar"
              : "Interaktif di layar"}
          </span>
        </p>
      ) : (
        <label className="block font-semibold">
          Jenis kumpulan
          <select
            className={field}
            disabled={busy || !canMutate}
            value={document.kind}
            onChange={(e) =>
              chooseKind(
                e.target.value === "interactive" ? "interactive" : "cards",
              )
            }
          >
            <option value="cards">Soal dengan Kartu Nalar</option>
            <option value="interactive">Interaktif di layar</option>
          </select>
        </label>
      )}
      <p className="text-sm text-muted-foreground">
        Maksimal 5 soal. Untuk Kartu Nalar, satu soal memakai satu baris.
      </p>
      {pendingKind && (
        <section className={panel} aria-label="Ganti jenis kumpulan">
          <h2 className="font-bold">Ganti jenis kumpulan?</h2>
          <p>
            {pendingKind === "cards"
              ? "Pertanyaan tetap disimpan. Isi pilihan jawaban dan kunci untuk memakai Kartu Nalar. Aktivitas layar dapat dipulihkan dengan membatalkan pergantian jenis."
              : "Pertanyaan tetap disimpan sebagai kegiatan menulis di papan. Anda bisa memilih alat interaktif setelahnya. Pilihan jawaban dan kunci tidak dipakai; keduanya dapat dipulihkan dengan membatalkan pergantian jenis."}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button disabled={busy || !canMutate} onClick={convertKind}>
              {pendingKind === "cards"
                ? "Ganti ke Kartu Nalar"
                : "Ganti ke interaktif"}
            </Button>
            <Button variant="outline" onClick={() => setPendingKind(undefined)}>
              Tetap dengan jenis sekarang
            </Button>
          </div>
        </section>
      )}
      {kindUndo && (
        <div className="practice-feedback">
          <p>
            Jenis diganti. Batalkan untuk memulihkan isian sebelum pergantian,
            atau simpan setelah isian selesai.
          </p>
          <Button
            variant="outline"
            disabled={busy || !canMutate}
            onClick={() => {
              if (busy || !canMutate) return;
              change(kindUndo);
              setActiveItem(kindUndo.items[0]?.id);
              setKindUndo(undefined);
              setPendingKind(undefined);
              setTemplateUndo(undefined);
              setDeleted(undefined);
              setPreview(null);
            }}
          >
            Batalkan pergantian jenis
          </Button>
        </div>
      )}
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
              {item.kind === "card" && (
                <div className="mt-2">
                  <BoardLegality prompt={item.prompt} />
                </div>
              )}
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
                  {readonly ? (
                    <p>
                      Kunci jawaban
                      <span className={`${field} block`}>{item.key}</span>
                    </p>
                  ) : (
                    <label className="block">
                      Kunci jawaban
                      <select
                        className={field}
                        value={item.key}
                        disabled={readonly || busy || !canMutate}
                        onChange={(e) =>
                          changeItem(index, {
                            ...item,
                            key:
                              CHOICES.find((c) => c === e.target.value) ?? "A",
                          })
                        }
                      >
                        {CHOICES.map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </label>
                  )}
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
                  {readonly ? (
                    <p>
                      Aktivitas
                      <span className={`${field} block`}>
                        {
                          TOOL_LABELS.find(
                            ([kind]) =>
                              kind ===
                              (item.kind === "writing"
                                ? "writing"
                                : item.tool.kind),
                          )?.[1]
                        }
                      </span>
                    </p>
                  ) : (
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
                  )}
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
            <Section
              aria-label="Pratinjau soal"
              label="Tampilan papan"
              action={
                <Button variant="outline" onClick={() => setPreview(null)}>
                  Tutup preview
                </Button>
              }
            >
              <div
                data-library-preview
                className="studio-board-preview min-h-0"
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
              {/* The preview's type is legitimately smaller than the board's, and a reviewer
                  tuning the board against this scale would set the wrong number (T6 §4.4). */}
              <p className="studio-board-preview-note">
                Ukuran teks di pratinjau ini lebih kecil daripada di Layar
                Kelas. Papan memakai soal minimal 56 px pada layar 1920×1080.
              </p>
            </Section>
          )}
          {preview !== null && !previewItem && (
            <Section
              aria-label="Pratinjau soal"
              label="Tampilan papan"
              action={
                <Button variant="outline" onClick={() => setPreview(null)}>
                  Tutup preview
                </Button>
              }
            >
              <p role="status">
                Periksa isian yang diubah untuk melanjutkan preview.
              </p>
            </Section>
          )}
        </div>
      </div>
      <div className="studio-action-bar flex flex-wrap gap-3">
        {!readonly && (
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
                !(await confirmAction({
                  title: "Arsipkan kumpulan ini?",
                  consequence:
                    "Kumpulan tidak lagi muncul saat memulai sesi. Riwayat hasil dan jawaban siswa tetap tersimpan.",
                  confirmLabel: "Arsipkan",
                }))
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
