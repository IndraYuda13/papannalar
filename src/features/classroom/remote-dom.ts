"use client";
import type { RemoteAction } from "@/contracts/remote";
// Explicit local control allowlist; no arbitrary selector/text or key events from the network.
const clickLabels =
  /^(Contoh terbimbing|Periksa cara Nala|Perbesar panel [1-4]|Kembali ke panel|Panel sebelumnya|Panel berikutnya|Latihan sebelumnya|Latihan berikutnya|Letakkan titik uji|Titik pada kurva A|Arsir irisan|Tandai akar model|Satu titik potong|Sejajar|Berimpit|Batas [1-4] [≤<≥>]|Beban [−+][x1]|Tambah kedua ruas|Kurangi kedua ruas|Tambah x kedua ruas|Kali kedua ruas|Bagi kedua ruas|Lompat|Ulang langkah|Batalkan langkah terakhir|Mulai ulang|Jalankan|Perbesar garis|Perkecil garis|Samakan penyebut|Tambah kolom × pengali|Tambah kelompok|Kelompok [1-6]|Tambah ubin [−+]([x1])|Ubin [−+]([x1]) kelompok [1-6]|Batang [1-3] bagian ([1-9]|1[0-9]|2[0-4])|Tanda batang [1-3]|Lihat contoh|Putar ulang contoh|Coba soal sendiri|Simpan tebakan dan coba model|Giliran Pilot [AB]|Petunjuk [1-3]|Lebih kecil \/ kurang|Lebih besar \/ lebih|1 · Baca besaran dan tanda pada soal|2 · Susun model seperti Nala|3 · Bandingkan model dengan soal)$/;
const inputLabels =
  /^(Koordinat [xy] grafik|Koefisien [abc]|Kemiringan [AB]|Titik potong y [AB]|Pembilang (basis|skala) \(penyebut [1-9][0-9]{0,4}\)|Geser pangkat|Kemiringan pembanding|Awal pembanding|Batas ruas [1-4]|Nilai operasi timbangan|Besar lompatan|Pengali rasio|Nilai [AB] kolom [2-6]|Bagi batang [1-3]|Penanda tebakan|Nilai tebakan)$/;
const dragLabels =
  /^(Seret titik uji grafik|Beban [−+][x1]|Penanda [−]?\d{1,7}(?:,\d{1,8})?; seret atau gunakan panah|Geser batang [1-3]|Seret pengali rasio|Tambah ubin [−+][x1]|Ubin [−+][x1] kelompok [1-6])$/;
const label = (element: Element) =>
  element.getAttribute("aria-label") ?? element.textContent?.trim() ?? "";
export function createRemoteDom(
  root: () => HTMLElement | null,
  onCursor: (point: { x: number; y: number } | undefined) => void,
) {
  let drag: Element | undefined,
    editable: HTMLInputElement | HTMLSelectElement | undefined,
    last = { x: 0, y: 0 };
  const pointer = (element: Element, type: string, point = last) =>
    element.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        pointerId: -77,
        pointerType: "mouse",
        isPrimary: true,
        width: 1,
        height: 1,
        buttons: type === "pointerup" ? 0 : 1,
        clientX: point.x,
        clientY: point.y,
      }),
    );
  function clear() {
    if (drag) pointer(drag, "pointercancel");
    drag = undefined;
    editable = undefined;
    onCursor(undefined);
  }
  function allowed(element: Element | null) {
    const area = root();
    return (
      !!element &&
      !!area &&
      area.contains(element) &&
      !element.closest('[hidden],fieldset:disabled,[aria-disabled="true"]') &&
      !element.matches(":disabled") &&
      !(element instanceof HTMLInputElement && element.readOnly)
    );
  }
  return {
    clear,
    idle() {
      if (drag) {
        pointer(drag, "pointercancel");
        drag = undefined;
        onCursor(undefined);
      }
    },
    apply(input: RemoteAction) {
      const area = root();
      if (!area || !area.isConnected || area.closest("[hidden]"))
        return { applied: false, editable: false };
      if ("x" in input) {
        const rect = area.getBoundingClientRect();
        const left = Math.max(0, rect.left),
          top = Math.max(0, rect.top),
          right = Math.min(innerWidth, rect.right),
          bottom = Math.min(innerHeight, rect.bottom);
        if (right <= left || bottom <= top)
          return { applied: false, editable: false };
        last = {
          x: left + (right - left) * input.x,
          y: top + (bottom - top) * input.y,
        };
        onCursor(last);
      }
      const at =
        document
          .elementFromPoint(last.x, last.y)
          ?.closest('button,input,select,[role="button"]') ?? null;
      if (input.kind === "cancel") {
        clear();
        return { applied: true, editable: false };
      }
      if (input.kind === "move") {
        if (drag && allowed(drag)) pointer(drag, "pointermove");
        return { applied: true, editable: !!editable };
      }
      if (input.kind === "start") {
        if (!allowed(at) || !at || !dragLabels.test(label(at)))
          return { applied: false, editable: false };
        drag = at;
        editable = undefined;
        pointer(drag, "pointerdown");
        return { applied: true, editable: false };
      }
      if (input.kind === "drop") {
        if (!drag || !allowed(drag)) {
          clear();
          return { applied: false, editable: false };
        }
        pointer(drag, "pointerup");
        drag = undefined;
        return { applied: true, editable: false };
      }
      if (input.kind === "activate") {
        editable = undefined;
        if (!at || !allowed(at)) return { applied: false, editable: false };
        if (
          (at instanceof HTMLInputElement || at instanceof HTMLSelectElement) &&
          inputLabels.test(label(at))
        ) {
          editable = at;
          at.focus();
          return { applied: true, editable: true };
        }
        if (at instanceof HTMLButtonElement && clickLabels.test(label(at))) {
          at.click();
          return { applied: true, editable: false };
        }
        return { applied: false, editable: false };
      }
      if (input.kind === "value") {
        if (
          !editable ||
          !allowed(editable) ||
          !inputLabels.test(label(editable))
        )
          return { applied: false, editable: false };
        if (
          editable instanceof HTMLSelectElement &&
          !Array.from(editable.options).some((o) => o.value === input.value)
        )
          return { applied: false, editable: true };
        const prototype =
          editable instanceof HTMLSelectElement
            ? HTMLSelectElement.prototype
            : HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(prototype, "value")?.set?.call(
          editable,
          input.value,
        );
        editable.dispatchEvent(new Event("input", { bubbles: true }));
        editable.dispatchEvent(new Event("change", { bubbles: true }));
        editable.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
        return { applied: true, editable: true };
      }
      if (input.kind === "scroll") {
        clear();
        const container = area.closest<HTMLElement>(
          '[data-board-height="high"],[data-board-height="sd"]',
        );
        if (container) container.scrollBy({ top: input.direction * 200 });
        else window.scrollBy({ top: input.direction * 240 });
        return { applied: true, editable: false };
      }
      return { applied: false, editable: false };
    },
  };
}
