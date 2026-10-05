# PapanNalar

PapanNalar membantu guru menyiapkan soal, mengajar melalui layar kelas, mencetak
Kartu Nalar, serta memeriksa dan membahas jawaban siswa. Aplikasi guru dan layar
kelas berjalan dalam satu aplikasi Next.js dengan TypeScript dan Supabase.

## Alur penggunaan

1. Buka **Beranda → Mulai mengajar**, lalu pilih kelas.
2. Pilih soal siap pakai atau kumpulan soal buatan sendiri.
3. Mulai sesi. Jika memakai TV/proyektor, buka `/layar` di perangkat tersebut,
   lalu sambungkan dari HP guru dengan QR atau kode yang tampil.
4. Untuk asesmen, cetak Kartu Nalar, bagikan kepada siswa, lalu pindai atau
   masukkan jawaban secara manual. Periksa isian sebelum menyimpan.
5. Akhiri sesi dan buka hasil untuk membahas soal bersama kelas.

[Panduan guru](docs/13_GUIDE_LATIHAN_AI.md) menjelaskan pembuatan soal, pencetakan
kartu, koreksi jawaban dan bantuan AI opsional. AI tidak diperlukan untuk alur
utama; model matematika dan penilaian dihitung oleh kode deterministik.

## Menjalankan aplikasi

Prasyarat: Node **24.14.1**, pnpm **11.19.0**, dan Supabase local/dev.
Versi dependency dikunci dalam `pnpm-lock.yaml`.

```sh
pnpm install --frozen-lockfile
cp .env.example .env.local
```

Jika Docker tersedia, `pnpm exec supabase start` menyiapkan Supabase lokal dengan
konfigurasi dan migration repo. Isi `.env.local` dengan URL dan publishable key
lingkungan dev, `APP_ORIGIN=http://127.0.0.1:3000`, serta `PAIRING_SECRET` acak
minimal 32 karakter khusus server. Jangan gunakan service-role key di browser.

Aktifkan email magic link dan anonymous sign-in untuk identitas papan, izinkan
callback `http://127.0.0.1:3000/auth/callback`, serta matikan **Allow public access**
pada pengaturan Realtime agar topic menggunakan policy private.

```sh
pnpm dev
```

Buka `http://127.0.0.1:3000/masuk`. Magic link harus dibuka di browser/perangkat
yang meminta tautan. `/guru` adalah aplikasi guru dan `/layar` adalah layar kelas.

Untuk build produksi lokal:

```sh
pnpm build
pnpm start
```

Build tidak memerlukan credential. Penggunaan auth, data dan pairing memerlukan
konfigurasi layanan yang sesuai. Server lokal terikat ke loopback; penggunaan
kamera pada perangkat lain memerlukan origin HTTPS yang sesuai.

## Demo lokal tanpa layanan hosted

Demo ini menggunakan adapter Auth/HTTP khusus uji dan PostgreSQL lokal nyata.
Siapkan PostgreSQL **17** terpisah dengan database kosong `pn_m01c_test`, user
`postgres`, pada `127.0.0.1:55432`, serta `psql` pada PATH (atau `PSQL_BIN`).
Launcher tidak membuat database tersebut otomatis.

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm video
```

Buka `http://127.0.0.1:3100/masuk` dan pilih **Coba dengan data contoh**.
Launcher menyiapkan data sintetis untuk mencoba alur aplikasi utama.
Biarkan proses berjalan; Ctrl+C menghentikannya. Jangan menjalankan dua launcher
atau tes browser pada port yang sama secara bersamaan.

`pnpm demo` menyediakan jalur fixture terpisah di `/demo`. Keduanya hanya untuk
loopback dan pengujian, bukan adapter production atau bukti layanan hosted.
[Petunjuk demo dan pemulihan lokal](docs/09_LOCAL_HANDOFF.md) memuat detailnya.

## Konfigurasi AI opsional

Dua protokol tersedia: **OpenAI-compatible Chat Completions** dan
**Anthropic-compatible Messages**, dengan endpoint/model yang ditentukan operator.
AI nonaktif secara default; kartu bantuan statis tetap tersedia.

Gunakan [contoh konfigurasi server](config/.env.ui-ai.example) dan
[panduan pengelola AI](docs/12_AI_COMPAT_SPEC.md#panduan-pengelola-ai).
Mengisi API key saja belum mencukupi: profil, harga/anggaran, batas token dan
review materi/privasi harus sesuai. Jangan memasukkan credential ke Git.

## Pengujian

Siapkan database uji lokal seperti pada bagian demo. Database tes harus terpisah
dari data pengguna; runner membatasi tujuan ke loopback dan nama `pn_m01c_test`.

```sh
pnpm install --frozen-lockfile
pnpm exec playwright install --with-deps chromium
pnpm test:db:prepare
pnpm verify
```

`verify` menjalankan format, typecheck, lint, unit dengan coverage, integrasi/RLS,
build dan E2E secara berurutan. Tes browser memakai port 3100 dan provider uji
54325; hentikan launcher demo terlebih dahulu. Workflow CI menyiapkan PostgreSQL
uji otomatis. Tes terarah tersedia dalam [package.json](package.json).

Bukti pengujian tersimpan di [artifacts/qa](artifacts/qa/), termasuk
[hasil audit alur guru](artifacts/qa/ui-ai-v2/workflow-v7.json). Setiap laporan
berlaku untuk kandidat dan lingkungan yang tercatat; hasil historis bukan
jaminan kelulusan commit yang lebih baru.

## Struktur kode

| Folder                     | Tanggung jawab                                          |
| -------------------------- | ------------------------------------------------------- |
| `src/app`                  | Route, layout dan stylesheet aplikasi                   |
| `src/features`             | Alur guru, layar, soal, sesi, pemindai dan hasil        |
| `src/core`, `src/content`  | Matematika, penilaian, pengelompokan dan katalog materi |
| `src/contracts`            | Schema dan proyeksi data yang diizinkan                 |
| `src/server`               | Auth, data, pairing dan adapter AI                      |
| `src/local`, `src/offline` | Penyimpanan perangkat, antrean sync dan cache offline   |
| `src/cards`, `src/workers` | PDF kartu dan pemrosesan pemindaian lokal               |
| `src/ui`                   | Komponen, token dan aset antarmuka bersama              |
| `supabase`                 | Migration, policy RLS dan tes SQL                       |
| `tests`                    | Unit, integrasi, E2E dan fixture khusus uji             |
| `design`                   | Sumber Blender dan asal-usul aset                       |

Detail arsitektur dan keputusan domain ada di [spesifikasi teknis](docs/08_TECH_SPEC.md).
Dokumen `docs/00`–`docs/07` menyimpan sumber kebutuhan produk; rencana dan target
di dalamnya perlu dibedakan dari hasil implementasi yang telah diuji.

## Privasi, aset dan batas pengujian

Nama siswa disimpan di perangkat guru. Foto kartu diproses lokal, dan goresan
refleksi hanya berada di RAM. Cache offline tidak menyimpan respons API atau HTML
personal; pairing dengan provider cloud tetap membutuhkan internet.

Font berasal dari dependency Fontsource berlisensi OFL-1.1. Model dan poster 3D
memiliki [lisensi aset](public/assets/pn-ui-v2/LICENSE.txt) serta
[petunjuk reproduksi Blender](public/assets/pn-ui-v2/README.md).

Tes lokal menggunakan data sintetis dan fixture provider. Provider AI live,
layanan hosted, kamera/cetak/papan fisik, serta review pedagogi dan uji kelas
memerlukan pembuktian terpisah. Tidak ada klaim kesiapan production atau akurasi
perangkat nyata berdasarkan tes sintetis.
