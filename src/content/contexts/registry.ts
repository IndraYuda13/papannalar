import type { StepId } from "../ladder/registry";

export type ToolId =
  "number-line" | "fractions" | "ratio" | "algebra" | "balance" | "graphs";
type Context = Readonly<{
  use: string;
  opening: string;
  followup: string;
  why: string;
  tool: ToolId | null;
}>;
// Curated baseline from S3. Additional wording remains draft under K19.
export const CONTEXTS: Readonly<Record<StepId, Context>> = {
  A1: {
    use: "Membandingkan jumlah benda saat berdagang.",
    opening: "Ada 12 jeruk dan 15 jeruk. Mana lebih banyak?",
    followup: "Berapa lebihnya? Tunjukkan dengan benda.",
    why: "Bagaimana membandingkan tanpa menghitung satu per satu?",
    tool: null,
  },
  A2: {
    use: "Menghitung kelereng yang didapat.",
    opening: "Ada 8 kelereng, lalu mendapat 5 lagi. Lebih dari 10?",
    followup: "Buat sepuluh dahulu, berapa sisanya?",
    why: "Kenapa 8 + 5 sama dengan 10 + 3?",
    tool: null,
  },
  A3: {
    use: "Membaca nomor rumah dan halaman buku.",
    opening: "Buku memiliki 47 halaman. Ada berapa ikat sepuluh?",
    followup: "Tunjukkan puluhan dan satuannya.",
    why: "Kenapa angka 4 bernilai 40?",
    tool: null,
  },
  A4: {
    use: "Membagi makanan sama besar.",
    opening:
      "Martabak dibagi 4. Satu potong lebih kecil atau lebih besar dari setengah?",
    followup: "Bandingkan potongan pada satu utuh yang sama.",
    why: "Kenapa seperempat lebih kecil dari setengah?",
    tool: "fractions",
  },
  B1: {
    use: "Menghitung belanja keluarga.",
    opening: "356 siswa dan 278 siswa: lebih atau kurang dari 600?",
    followup: "Tunjukkan pertukaran sepuluh satuan.",
    why: "Kenapa menyimpan satu puluhan?",
    tool: null,
  },
  B2: {
    use: "Menyusun kursi dan membagi benda sama rata.",
    opening: "6 baris, setiap baris 7 kursi. Cukup untuk 40 siswa?",
    followup: "Bagaimana jika baris dan kolom ditukar?",
    why: "Kenapa 6 × 7 sama dengan 7 × 6?",
    tool: null,
  },
  B3: {
    use: "Menyusun barisan sama panjang.",
    opening: "12 siswa membentuk barisan persegi panjang. Ada berapa susunan?",
    followup: "Coba susunan dengan 5 siswa per baris.",
    why: "Kenapa 5 bukan faktor 12?",
    tool: null,
  },
  B4: {
    use: "Membaca takaran resep.",
    opening: "Dua pizza sama besar dibagi 3 dan 5. Potongan mana lebih besar?",
    followup: "Tunjukkan bahwa ukuran satu utuh tetap sama.",
    why: "Kenapa 1/3 lebih besar dari 1/5?",
    tool: "fractions",
  },
  C1: {
    use: "Membagi persediaan kegiatan.",
    opening: "1.248 botol untuk 4 hari. Lebih dari 300 botol per hari?",
    followup: "Pisahkan ratusan, puluhan dan satuan.",
    why: "Kenapa mulai dari nilai tempat terbesar?",
    tool: null,
  },
  C2: {
    use: "Menentukan jadwal yang berulang bersama.",
    opening: "Lampu berkedip tiap 4 dan 6 detik. Kapan bersama lagi?",
    followup: "Tandai kelipatan kedua bilangan.",
    why: "Kenapa pertama kali pada 12, bukan 24?",
    tool: "number-line",
  },
  C3: {
    use: "Menggabungkan takaran bahan resep.",
    opening: "2/3 gelas ditambah 1/4 gelas. Lebih dari satu gelas?",
    followup: "Bagi kedua batang menjadi bagian seukuran.",
    why: "Kenapa penyebut disamakan?",
    tool: "fractions",
  },
  C4: {
    use: "Membandingkan harga per satuan.",
    opening:
      "3 pensil Rp6.000 atau 5 pensil Rp9.000. Mana lebih murah per pensil?",
    followup: "Cari harga satu pensil pada tiap toko.",
    why: "Kenapa membagi dengan jumlah pensil?",
    tool: "ratio",
  },
  D1: {
    use: "Membaca lantai basement, suhu dan kedalaman.",
    opening: "Lift di basement −2 menuju lantai 5. Naik berapa lantai?",
    followup: "Kalau lift mulai di −3 lalu turun 5, berakhir di mana?",
    why: "Kenapa mengurangi 5 membuat posisi lebih kecil?",
    tool: "number-line",
  },
  D2: {
    use: "Membandingkan dan menggabungkan isi botol.",
    opening: "Botol 0,3 liter dan 0,25 liter. Mana lebih banyak?",
    followup: "Nyatakan dalam bagian yang sama besar.",
    why: "Kenapa 0,3 lebih besar walaupun 3 lebih kecil dari 25?",
    tool: "fractions",
  },
  D3: {
    use: "Memperbesar resep tanpa mengubah rasa.",
    opening: "2 gelas teh untuk 3 gelas air. Untuk 6 gelas teh, berapa air?",
    followup: "Uji apakah perbandingan tetap sama.",
    why: "Kenapa mengalikan, bukan menambah?",
    tool: "ratio",
  },
  D4: {
    use: "Menyusun rumus biaya dan pola.",
    opening: "Biaya awal Rp5.000 dan Rp2.500 per km. Berapa untuk 4 km?",
    followup: "Buat rumus untuk jarak berapa pun.",
    why: "Kenapa 3(x + 4) = 3x + 12?",
    tool: "algebra",
  },
  D5: {
    use: "Merencanakan waktu menabung.",
    opening:
      "Ada Rp6.000, bertambah Rp2.000 per minggu. Kapan menjadi Rp10.000?",
    followup: "Tunjukkan operasi yang sama pada kedua ruas.",
    why: "Kenapa kedua sisi harus diperlakukan sama?",
    tool: "balance",
  },
  D6: {
    use: "Membandingkan biaya tetap dan biaya pemakaian.",
    opening:
      "Paket A Rp20.000 + Rp1.000/GB, B Rp5.000/GB. Untuk 3 GB mana lebih murah?",
    followup: "Bagaimana untuk 10 GB? Kapan biayanya sama?",
    why: "Apa arti titik potong dua garis?",
    tool: "graphs",
  },
  E1: {
    use: "Memahami pertumbuhan berlipat.",
    opening: "Kertas dilipat dua sebanyak 7 kali. Berapa lapis?",
    followup: "Catat jumlah lapis setelah setiap lipatan.",
    why: "Kenapa pangkat dijumlah saat basis sama dikalikan?",
    tool: null,
  },
  E2: {
    use: "Menyusun pilihan belanja dengan anggaran terbatas.",
    opening:
      "Anggaran Rp40.000, buku Rp10.000 dan pulpen Rp5.000. Bisa membeli masing-masing 3?",
    followup: "Cari pilihan lain yang masih dalam anggaran.",
    why: "Kenapa daerah solusi berisi banyak titik?",
    tool: "graphs",
  },
  E3: {
    use: "Mencari luas kebun dari panjang pagar.",
    opening:
      "Pagar 20 m membatasi persegi panjang. Ukuran apa memberi luas terbesar?",
    followup: "Bandingkan beberapa pasangan panjang dan lebar.",
    why: "Kenapa persamaan kuadrat dapat mempunyai dua akar?",
    tool: "graphs",
  },
  E4: {
    use: "Memahami bunga majemuk dan pertumbuhan.",
    opening:
      "Pinjaman Rp1.000.000 berbunga 10% per bulan. Apakah kenaikannya selalu sama?",
    followup: "Bandingkan pertambahan tetap dan pertambahan berlipat.",
    why: "Kenapa bunga ikut berbunga?",
    tool: "graphs",
  },
};
export const IMPLEMENTED_TOOLS: readonly ToolId[] = [
  "number-line",
  "fractions",
  "ratio",
  "algebra",
  "balance",
  "graphs",
];
