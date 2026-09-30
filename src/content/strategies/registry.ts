import { draftMetadata, rationalText } from "../templates/format";
import {
  addRational,
  multiplyRational,
  rational,
} from "../../core/math/rational";
import type { ReviewMetadata } from "../templates/types";

export const MISCONCEPTION_CODES = [
  "D1.1",
  "D1.2",
  "D1.3",
  "D1.4",
  "D2.1",
  "D2.2",
  "D2.3",
  "D2.4",
  "D3.1",
  "D3.2",
  "D3.3",
  "D4.1",
  "D4.2",
  "D4.3",
  "D4.4",
  "D5.1",
  "D5.2",
  "D5.3",
  "A2.1",
  "A2.2",
  "B4.1",
  "B4.2",
  "B4.3",
] as const;
export type MisconceptionCode = (typeof MISCONCEPTION_CODES)[number];
export type Strategy = Readonly<{
  code: MisconceptionCode | "generic-error";
  title: string;
  prompts: readonly [string, string, string];
  demonstrate: string;
  quickCheck: Readonly<{ prompt: string; teacherAnswer: string }>;
  metadata: ReviewMetadata;
}>;
type Entry = readonly [
  MisconceptionCode,
  string,
  readonly [string, string, string],
  string,
  string,
  string,
];
const n = (value: number) => rationalText(rational(value));
const definitions: readonly Entry[] = [
  [
    "D1.1",
    "Urutan pengurangan",
    [
      "Di mana posisi awalnya?",
      "Mengurangi berarti bergerak ke arah mana?",
      "Apakah membalik urutan mengubah perjalanan?",
    ],
    "Letakkan penanda di 3, lalu geser 8 langkah ke kiri melewati nol.",
    "2 − 7 = …",
    n(2 - 7),
  ],
  [
    "D1.2",
    "Pengurangan dari bilangan negatif",
    [
      "Mulai di bilangan berapa?",
      "Ke mana jika dikurangi?",
      "Apakah bergerak mendekati atau menjauhi nol?",
    ],
    "Mulai di −3 pada garis bilangan, lalu lompat 5 ke kiri.",
    "−2 − 4 = …",
    n(-2 - 4),
  ],
  [
    "D1.3",
    "Perkalian dua bilangan negatif",
    [
      "Apa pola hasil saat satu faktor berkurang satu?",
      "Apa yang berubah ketika melewati nol?",
      "Apakah pola itu tetap berlanjut?",
    ],
    "Susun hasil (−3)×2, ×1, ×0, ×(−1), ×(−2) untuk melihat selisih tetap.",
    "(−2) × (−4) = …",
    n(-2 * -4),
  ],
  [
    "D1.4",
    "Urutan operasi",
    [
      "Bagian mana merupakan satu kelompok perkalian?",
      "Apa yang dihitung lebih dulu?",
      "Apakah kurung mengubah hasil?",
    ],
    "Tunjukkan 2 benda lepas dan 3 kelompok masing-masing 4, lalu gabungkan.",
    "3 + 2 × 5 = …",
    n(3 + 2 * 5),
  ],
  [
    "D2.1",
    "Ukuran bagian pecahan",
    [
      "Apakah ukuran tiap bagian sama?",
      "Bagaimana membuat bagian seukuran?",
      "Apa yang dihitung pembilang?",
    ],
    "Samakan potongan dua batang satu utuh sebelum menggabungkan bagian berwarna.",
    "1/2 + 1/3 = …",
    rationalText(addRational(rational(1, 2), rational(1, 3))),
  ],
  [
    "D2.2",
    "Membandingkan pecahan satuan",
    [
      "Apakah satu utuhnya sama besar?",
      "Mana potongan yang lebih besar?",
      "Apa akibat membagi menjadi lebih banyak bagian?",
    ],
    "Letakkan batang per tiga dan per lima sejajar dengan panjang utuh sama.",
    "Mana lebih besar: 1/3 atau 1/5?",
    rationalText(rational(1, 3)),
  ],
  [
    "D2.3",
    "Nilai tempat desimal",
    [
      "Apa arti persepuluhan?",
      "Bagaimana menulisnya dalam perseratusan?",
      "Apakah banyak digit menentukan nilainya?",
    ],
    "Bandingkan 30 petak dan 25 petak dari dua bidang 100 petak yang sama besar.",
    "Mana lebih besar: 0,3 atau 0,25?",
    rationalText(rational(30, 100)),
  ],
  [
    "D2.4",
    "Perkalian dengan faktor kurang dari satu",
    [
      "Berapa nilai setengahnya?",
      "Apa arti mengambil sebagian?",
      "Kapan perkalian justru memperkecil?",
    ],
    "Ambil setengah dari batang panjang delapan satuan.",
    "8 × 1/2 = …",
    rationalText(multiplyRational(rational(8), rational(1, 2))),
  ],
  [
    "D3.1",
    "Rasio bersifat multiplikatif",
    [
      "Berapa kali lipat besaran pertama?",
      "Apa yang harus terjadi pada pasangan?",
      "Apakah rasa campuran tetap?",
    ],
    "Gandakan seluruh pasangan 2 dan 3 dengan faktor yang sama pada tabel.",
    "2 : 3 = 8 : …",
    n(3 * (8 / 2)),
  ],
  [
    "D3.2",
    "Persen berulang memakai dasar baru",
    [
      "Persen kedua dihitung dari nilai mana?",
      "Apakah dasarnya masih sama?",
      "Apa beda kenaikan tetap dan berulang?",
    ],
    "Mulai dari 100, naik 10% menjadi 110, lalu hitung 10% dari 110.",
    "100 naik 10% dua kali menjadi …",
    n((100 * 110 * 110) / 10000),
  ],
  [
    "D3.3",
    "Dasar perhitungan persen",
    [
      "Berapa perubahan nilainya?",
      "Perubahan dibandingkan dengan nilai awal berapa?",
      "Bagaimana menuliskan perbandingan per seratus?",
    ],
    "Tandai kenaikan 10 pada batang awal sepanjang 40; bagi batang menjadi empat bagian.",
    "Dari 40 ke 50 naik berapa persen?",
    n(((50 - 40) * 100) / 40),
  ],
  [
    "D4.1",
    "Suku sejenis",
    [
      "Ubin mana yang mewakili x?",
      "Ubin mana hanya satuan?",
      "Bisakah dua jenis itu digabung sebagai jenis yang sama?",
    ],
    "Susun 3 ubin x dan 2 ubin satuan pada tempat berbeda.",
    "3x + 2x = …x",
    n(3 + 2),
  ],
  [
    "D4.2",
    "Distribusi ke seluruh isi kelompok",
    [
      "Apa isi setiap kelompok?",
      "Ada berapa kelompok?",
      "Apakah satuan juga muncul di setiap kelompok?",
    ],
    "Buat tiga wadah; setiap wadah berisi satu ubin x dan empat satuan.",
    "2(x + 3) = 2x + …",
    n(2 * 3),
  ],
  [
    "D4.3",
    "Pangkat dan koefisien",
    [
      "Bagian mana yang dipangkatkan?",
      "Apa arti x²?",
      "Kapan koefisien dikalikan?",
    ],
    "Ganti x dengan 3; buat persegi 3×3 lalu ambil dua persegi.",
    "Jika x = 3, 2x² = …",
    n(2 * 3 ** 2),
  ],
  [
    "D4.4",
    "Negatif pada seluruh kurung",
    [
      "Apa lawan dari setiap suku?",
      "Apa pasangan nolnya?",
      "Bagaimana memeriksa dengan nilai contoh?",
    ],
    "Pasangkan x dan −x serta −5 dan +5 sehingga semuanya nol.",
    "Jika x = 2, −(x − 5) = …",
    n(-(2 - 5)),
  ],
  [
    "D5.1",
    "Operasi kebalikan pada kedua ruas",
    [
      "Apa yang ditambahkan pada x?",
      "Bagaimana mengembalikan keadaan awal?",
      "Operasi apa menjaga kedua ruas sama?",
    ],
    "Kurangi lima benda dari kedua sisi timbangan x + 5 = 12.",
    "x + 5 = 12. x = …",
    n(12 - 5),
  ],
  [
    "D5.2",
    "Membagi seluruh ruas",
    [
      "Apa seluruh isi ruas kiri?",
      "Apakah setiap suku sudah dibagi?",
      "Bisakah jawaban diuji kembali?",
    ],
    "Bagi semua ubin di kedua sisi menjadi dua kelompok sama besar.",
    "2x + 6 = 10. x = …",
    n((10 - 6) / 2),
  ],
  [
    "D5.3",
    "Koefisien berarti kelompok",
    [
      "Ada berapa kelompok x?",
      "Bagaimana membagi seluruhnya rata?",
      "Apa beda mengurangi tiga dan membagi tiga?",
    ],
    "Bagikan 12 benda menjadi 3 kelompok sama banyak.",
    "3x = 12. x = …",
    n(12 / 3),
  ],
  [
    "A2.1",
    "Menghitung langkah sesudah bilangan awal",
    [
      "Berapa benda sebelum mulai?",
      "Apa bilangan sesudahnya?",
      "Sudah berapa langkah yang ditambahkan?",
    ],
    "Letakkan delapan benda, tambah satu per satu sambil menyebut sembilan, sepuluh, dan seterusnya.",
    "8 + 5 = …",
    n(8 + 5),
  ],
  [
    "A2.2",
    "Menambah dan mengambil",
    [
      "Bendanya datang atau diambil?",
      "Jumlahnya membesar atau mengecil?",
      "Bisa ditunjukkan dengan benda?",
    ],
    "Dekatkan dua kumpulan benda menjadi satu kumpulan tanpa mengambil apa pun.",
    "7 + 4 = …",
    n(7 + 4),
  ],
  [
    "B4.1",
    "Bagian yang diwarnai",
    [
      "Bagian mana yang ditanyakan?",
      "Berapa bagian berwarna?",
      "Berapa seluruh bagian sama besar?",
    ],
    "Warnai tiga dari empat bagian batang, lalu pisahkan ucapan bagian berwarna dan kosong.",
    "Tiga dari empat bagian diwarnai. Pecahannya?",
    rationalText(rational(3, 4)),
  ],
  [
    "B4.2",
    "Pembilang dan penyebut",
    [
      "Angka mana menyebut seluruh bagian?",
      "Angka mana menghitung yang diambil?",
      "Apakah hasilnya kurang dari satu utuh?",
    ],
    "Tuliskan 3 di atas dan 4 di bawah sambil menunjuk bagian dan utuhnya.",
    "Dua dari lima bagian diwarnai. Pecahannya?",
    rationalText(rational(2, 5)),
  ],
  [
    "B4.3",
    "Bagian dibandingkan satu utuh",
    [
      "Tiga itu menghitung apa?",
      "Dari berapa bagian satu utuh?",
      "Apakah tiga potong selalu tiga utuh?",
    ],
    "Bandingkan tiga potong dari satu batang dengan tiga batang utuh.",
    "Tiga dari lima bagian diwarnai. Pecahannya?",
    rationalText(rational(3, 5)),
  ],
];
export const STRATEGIES: readonly Strategy[] = definitions.map(
  ([code, title, prompts, demonstrate, prompt, teacherAnswer]) => ({
    code,
    title,
    prompts,
    demonstrate,
    quickCheck: { prompt, teacherAnswer },
    metadata: draftMetadata(
      `S1 bagian 5/F7; K19 draft ${code}`,
      JSON.stringify({
        code,
        title,
        prompts,
        demonstrate,
        prompt,
        teacherAnswer,
      }),
    ),
  }),
);
export const GENERIC_STRATEGY: Strategy = {
  code: "generic-error",
  title: "Periksa kembali cara berpikir",
  prompts: [
    "Apa yang diketahui?",
    "Bisa ditunjukkan dengan benda atau gambar?",
    "Bagaimana memeriksa hasil dengan cara lain?",
  ],
  demonstrate:
    "Guru memakai contoh terbimbing pada Paket Sesi, lalu meminta siswa menjelaskan tiap langkah.",
  quickCheck: {
    prompt: "Kerjakan satu soal sejenis dari paket dan jelaskan langkahnya.",
    teacherAnswer:
      "Gunakan kunci contoh terbimbing; jangan menetapkan kode miskonsepsi dari satu galat tanpa diagnosis.",
  },
  metadata: draftMetadata("S1 F7; fallback generik K19", "generic-error-1.0.0"),
};
export function getStrategy(code?: string): Strategy {
  return STRATEGIES.find((s) => s.code === code) ?? GENERIC_STRATEGY;
}
