import { publicToolSchema, type PublicTool } from "../../contracts/tools";
import type { LibraryItem } from "../../contracts/library";

export type InteractiveKind = PublicTool["kind"] | "writing";
export type InteractiveTemplate = {
  id: string;
  label: string;
  item:
    | { kind: "interactive"; prompt: string; tool: PublicTool }
    | { kind: "writing"; prompt: string };
};

export const INTERACTIVE_HELP: Record<
  InteractiveKind,
  { description: string; templates: readonly InteractiveTemplate[] }
> = {
  "number-line": {
    description:
      "Untuk melihat perpindahan bilangan ke kanan, kiri, naik, atau turun.",
    templates: [
      {
        id: "right",
        label: "5 langkah ke kanan",
        item: {
          kind: "interactive",
          prompt: "Mulai dari −3. Geser 5 langkah ke kanan. Tekan Jalankan.",
          tool: {
            kind: "number-line",
            origin: { numerator: -3, denominator: 1 },
            delta: { numerator: 5, denominator: 1 },
            orientation: "horizontal",
          },
        },
      },
      {
        id: "left",
        label: "4 langkah ke kiri",
        item: {
          kind: "interactive",
          prompt: "Mulai dari 2. Geser 4 langkah ke kiri. Tekan Jalankan.",
          tool: {
            kind: "number-line",
            origin: { numerator: 2, denominator: 1 },
            delta: { numerator: -4, denominator: 1 },
            orientation: "horizontal",
          },
        },
      },
      {
        id: "lift",
        label: "Lift naik 7 lantai",
        item: {
          kind: "interactive",
          prompt: "Lift mulai di lantai −2. Naikkan 7 lantai. Tekan Jalankan.",
          tool: {
            kind: "number-line",
            origin: { numerator: -2, denominator: 1 },
            delta: { numerator: 7, denominator: 1 },
            orientation: "vertical",
          },
        },
      },
    ],
  },
  fractions: {
    description:
      "Untuk menunjukkan bagian dari satu utuh, menjumlahkan, atau mencari pecahan senilai.",
    templates: [
      {
        id: "half",
        label: "Warnai setengah",
        item: {
          kind: "interactive",
          prompt:
            "Bagi batang menjadi 2 bagian sama panjang. Ketuk satu bagian untuk mewarnai 1/2. Tekan Jalankan.",
          tool: {
            kind: "fractions",
            operation: "represent",
            left: { numerator: 1, denominator: 2 },
            right: { numerator: 0, denominator: 2 },
          },
        },
      },
      {
        id: "add",
        label: "1/4 + 2/4",
        item: {
          kind: "interactive",
          prompt:
            "Warnai 1/4 di batang pertama dan 2/4 di batang kedua. Tunjukkan jumlahnya di batang Gabung. Tekan Jalankan.",
          tool: {
            kind: "fractions",
            operation: "add",
            left: { numerator: 1, denominator: 4 },
            right: { numerator: 2, denominator: 4 },
          },
        },
      },
      {
        id: "equivalent",
        label: "1/2 senilai 2/4",
        item: {
          kind: "interactive",
          prompt:
            "Warnai 1/2 di batang pertama. Bagi batang kedua menjadi 4 bagian, lalu warnai bagian yang senilai. Tekan Jalankan.",
          tool: {
            kind: "fractions",
            operation: "equivalent",
            left: { numerator: 1, denominator: 2 },
            right: { numerator: 2, denominator: 4 },
          },
        },
      },
    ],
  },
  ratio: {
    description:
      "Untuk mencari pasangan nilai dengan pengali yang sama pada dua baris.",
    templates: [
      {
        id: "recipe",
        label: "Resep 2 : 3",
        item: {
          kind: "interactive",
          prompt:
            "Resep memakai 2 gelas sirup untuk 3 gelas air. Jika sirupnya 6 gelas, berapa gelas air? Lengkapi tabel.",
          tool: { kind: "ratio", baseX: 2, baseY: 3, targetX: 6 },
        },
      },
      {
        id: "books",
        label: "Buku 3 : 12",
        item: {
          kind: "interactive",
          prompt:
            "Tiga buku berharga 12 ribu rupiah. Cari harga 6 buku dengan tabel rasio. Tekan Jalankan.",
          tool: { kind: "ratio", baseX: 3, baseY: 12, targetX: 6 },
        },
      },
      {
        id: "half",
        label: "Setengah resep",
        item: {
          kind: "interactive",
          prompt:
            "Resep memakai 4 gelas susu dan 6 sendok cokelat. Jika susunya 2 gelas, berapa sendok cokelat? Lengkapi tabel.",
          tool: { kind: "ratio", baseX: 4, baseY: 6, targetX: 2 },
        },
      },
    ],
  },
  algebra: {
    description: "Untuk menyusun bentuk aljabar dengan ubin x dan ubin satuan.",
    templates: [
      {
        id: "two-groups",
        label: "2 kelompok (x + 3)",
        item: {
          kind: "interactive",
          prompt:
            "Buat 2 kelompok. Isi tiap kelompok dengan 1 ubin +x dan 3 ubin +1. Tekan Jalankan.",
          tool: {
            kind: "algebra",
            groups: 2,
            xPerGroup: 1,
            constantPerGroup: 3,
          },
        },
      },
      {
        id: "three-groups",
        label: "3 kelompok (2x + 1)",
        item: {
          kind: "interactive",
          prompt:
            "Buat 3 kelompok. Isi tiap kelompok dengan 2 ubin +x dan 1 ubin +1. Tekan Jalankan.",
          tool: {
            kind: "algebra",
            groups: 3,
            xPerGroup: 2,
            constantPerGroup: 1,
          },
        },
      },
      {
        id: "negative",
        label: "2 kelompok (x − 2)",
        item: {
          kind: "interactive",
          prompt:
            "Buat 2 kelompok. Isi tiap kelompok dengan 1 ubin +x dan 2 ubin −1. Tekan Jalankan.",
          tool: {
            kind: "algebra",
            groups: 2,
            xPerGroup: 1,
            constantPerGroup: -2,
          },
        },
      },
    ],
  },
  balance: {
    description:
      "Untuk mencari nilai x dengan melakukan operasi yang sama pada kedua sisi.",
    templates: [
      {
        id: "two-x",
        label: "2x + 3 = 11",
        item: {
          kind: "interactive",
          prompt:
            "Temukan nilai x pada 2x + 3 = 11. Lakukan operasi yang sama pada kedua sisi timbangan. Tekan Jalankan.",
          tool: {
            kind: "balance",
            left: { x: 2, constant: 3 },
            right: { x: 0, constant: 11 },
          },
        },
      },
      {
        id: "one-x",
        label: "x + 4 = 9",
        item: {
          kind: "interactive",
          prompt:
            "Temukan nilai x pada x + 4 = 9. Jaga kedua sisi timbangan seimbang. Tekan Jalankan.",
          tool: {
            kind: "balance",
            left: { x: 1, constant: 4 },
            right: { x: 0, constant: 9 },
          },
        },
      },
      {
        id: "both-sides",
        label: "3x + 2 = x + 10",
        item: {
          kind: "interactive",
          prompt:
            "Temukan nilai x pada 3x + 2 = x + 10. Lakukan operasi yang sama pada kedua sisi. Tekan Jalankan.",
          tool: {
            kind: "balance",
            left: { x: 3, constant: 2 },
            right: { x: 1, constant: 10 },
          },
        },
      },
    ],
  },
  graphs: {
    description:
      "Untuk membaca nilai y pada garis dan melihat perubahan kemiringannya.",
    templates: [
      {
        id: "rising",
        label: "Garis naik: y = 2x + 1",
        item: {
          kind: "interactive",
          prompt:
            "Pada garis y = 2x + 1, cari nilai y saat x = 3. Pilih titiknya di grafik. Tekan Jalankan.",
          tool: {
            kind: "graphs",
            mode: "linear",
            domain: { minX: -5, maxX: 5, minY: -12, maxY: 12 },
            lines: [{ m: 2, b: 1 }],
            goal: { type: "value", x: 3 },
          },
        },
      },
      {
        id: "falling",
        label: "Garis turun: y = −x + 2",
        item: {
          kind: "interactive",
          prompt:
            "Pada garis y = −x + 2, cari nilai y saat x = 2. Pilih titiknya di grafik. Tekan Jalankan.",
          tool: {
            kind: "graphs",
            mode: "linear",
            domain: { minX: -5, maxX: 5, minY: -12, maxY: 12 },
            lines: [{ m: -1, b: 2 }],
            goal: { type: "value", x: 2 },
          },
        },
      },
      {
        id: "origin",
        label: "Melalui nol: y = x",
        item: {
          kind: "interactive",
          prompt:
            "Pada garis y = x, cari nilai y saat x = −2. Pilih titiknya di grafik. Tekan Jalankan.",
          tool: {
            kind: "graphs",
            mode: "linear",
            domain: { minX: -5, maxX: 5, minY: -12, maxY: 12 },
            lines: [{ m: 1, b: 0 }],
            goal: { type: "value", x: -2 },
          },
        },
      },
    ],
  },
  writing: {
    description:
      "Untuk menggambar atau menuliskan alasan. Tulisan hanya ada selama soal terbuka.",
    templates: [
      {
        id: "reason",
        label: "Ceritakan caramu",
        item: {
          kind: "writing",
          prompt:
            "Gambarkan caramu menghitung −3 + 5. Ceritakan alasanmu kepada teman.",
        },
      },
      {
        id: "fraction",
        label: "Gambar setengah",
        item: {
          kind: "writing",
          prompt:
            "Gambarkan satu utuh. Bagi menjadi 2 bagian sama besar, lalu arsir setengahnya.",
        },
      },
    ],
  },
};

export function templateItem(
  id: string,
  template: InteractiveTemplate,
): LibraryItem {
  // Explicit fields: UI labels and future local metadata cannot enter a saved item.
  return template.item.kind === "writing"
    ? { id, kind: "writing", prompt: template.item.prompt }
    : {
        id,
        kind: "interactive",
        prompt: template.item.prompt,
        tool: publicToolSchema.parse(template.item.tool),
      };
}
