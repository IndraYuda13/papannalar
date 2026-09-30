# AGENTS.md - PapanNalar

## Misi dan cara mulai

Bangun PapanNalar sesuai sumber produk, bukan aplikasi edukasi generik.
Prioritas pertama adalah rantai demo kelas 7B: kartu -> pindai nyata -> level dan
kelompok -> Layar Kelas -> Garis Bilangan. Target final tetap 13 fitur wajib sumber.

Pada awal setiap run:
1. Baca [PLAN.md](PLAN.md): status, task aktif, blocker dan jurnal terakhir.
2. Baca bagian relevan [08_TECH_SPEC.md](docs/08_TECH_SPEC.md), termasuk register
   konflik bagian 2. Tidak perlu menyalin seluruh spesifikasi ke respons.
3. Periksa repo/manifest/lockfile/git status dan kode yang akan diubah. Jangan
   scaffold ulang proyek existing atau menimpa perubahan pengguna.
4. Pilih SATU task berukuran terbatas dari milestone aktif. Nyatakan acceptance
   dan validasi yang akan dijalankan; selesaikan task itu sebelum berpindah.

Tidak ada ketergantungan pada STATUS.md atau dokumen lain yang belum dibuat.
Status/jurnal ada di PLAN.md. Register konflik ada di TECH_SPEC bagian 2.
Nomor M00-M17 adalah plan baru, bukan 17 langkah lama yang tidak tersedia.

## Sumber kebenaran

Instruksi terbaru pengguna > keputusan kunci `docs/00_RINGKASAN_RUBRIK.md` dan
acceptance `docs/01_PRD.md` > dokumen domain yang relevan > desain usulan TECH_SPEC.
Detail pembelajaran: 02; konten: 03; brand: 04; UX: 05; bisnis: 06; build/QA/pitch: 07.

Delapan sumber `docs/00` sampai `docs/07` adalah salinan asli. Jangan mengubahnya,
termasuk untuk "memperbaiki" inkonsistensi. TECH_SPEC memakai label [S] sumber,
[D] usulan engineering, [K] gap, [V] dokumentasi platform. Jangan mengubah usulan
menjadi persetujuan pengguna. Catat keputusan baru pada jurnal PLAN dan register.

Jika gap hanya memengaruhi satu fitur, blokir fitur itu dan lanjut task independen.
Default [D] dapat diimplementasikan pada demo bila tidak melanggar sumber. Gate
pilot, perubahan scope/pedagogi, akses data dan persetujuan manusia tidak boleh
lulus dari asumsi. Jangan meminta seluruh arsitektur disetujui ulang setiap run.
Kanvas Claude/gambar embedded belum tersedia dalam paket: jangan mengklaim telah
melihatnya atau membuat screenshot sebagai representasi sumber yang sebenarnya.

## Invarian wajib

- Satu stack Next.js + TypeScript strict + Supabase; tidak menambah layanan Python,
  framework kedua, monorepo kompleks atau library berat tanpa kebutuhan tercatat.
- Nama siswa hanya di perangkat guru. Tidak ke server, LLM, board, URL, log,
  telemetry, screenshot QA atau file fixture publik. CSV nama diproses lokal.
- Board hanya menerima public projection allowlist: tanpa nama, StepId/level,
  mastery, kunci penilaian individu, skor atau peringkat. Jangan broadcast TeacherState.
- Goresan refleksi/tulisan bebas hanya RAM; tidak disimpan atau dikirim.
- BKT, soal/kunci/pengecoh, grouping, scheduler, OMR dan tool check deterministik.
  Core tidak mengimpor LLM/network. Pasangan exit dua tingkat = satu observasi.
- Scan ulang/koreksi/sync ulang tidak menambah bukti. Gunakan idempotency, revisi,
  frozen binding dan replay; satu sesi tidak dihitung dua kali untuk hysteresis.
- ? yang benar-benar dipilih/baris terbaca kosong berbeda dari kartu belum masuk.
- Offline scanner/core membutuhkan cache/storage siap; pairing cloud butuh internet.
  Jangan mengklaim hotspot tanpa internet otomatis menyinkronkan HP-papan.
- LLM gagal -> templat/kartu strategi statis. Jangan membuat mock seolah live AI.
- RLS seluruh data tenant; board anon bukan guru; private Realtime punya policy
  sendiri. Service/admin key hanya server, tidak `NEXT_PUBLIC_*` atau bundle client.
- Data demo dan pilot terpisah. Jangan memasukkan seed ke kelas sungguhan.
- Konten/strategi draft tidak otomatis reviewed; reviewer dan izin pilot harus nyata.
- Enam alat MVP, sepuluh mode board, 22 langkah registry. Empat alat lain/F14/F15
  di luar MVP. Coverage semua jenjang belum otomatis lulus (K01).

## Batas pekerjaan dan kualitas

Ikuti scope task. Jangan mendahulukan billing, landing page kompleks, chatbot siswa,
OCR tulisan, leaderboard, dashboard dinas atau fitur opsional sebelum rantai wajib.
F9-F13 opsional tidak membatalkan audit dasar, cetak tugas mandiri dan hasil exit
minimum yang sudah wajib. Pertahankan demo 7B yang sudah lulus sebagai regression.

Gunakan pure function/reducer untuk domain, schema strict pada batas luar, adapter
untuk storage/network/provider. Hindari `any`, suppressions, duplicated rules dan
bypass test tanpa alasan tertulis. Lock dependency/version; pertahankan package
manager repo existing. Cek dokumentasi resmi sebelum memakai API versi baru.
Paket baru perlu alasan, dampak bundle/compatibility dan lisensi. Jangan menyematkan
secret atau data anak nyata. Jangan menyebarkan file font dari lingkungan alat.

UI mengikuti token/typography/microcopy sumber. Bahasa Indonesia, target sentuh
48 px HP; objek 88 px/tombol 96 px pada board 1920 x 1080; no gradients. Implementasi visual
harus diperiksa pada browser, bukan hanya dianggap benar karena build berhasil.
Model 2D manipulatif, bukan 3D dekoratif. Tidak memakai lint substring yang melarang
nama resmi "Cari Kesalahan" atau tanda kali matematika.

## Validasi dan definisi selesai

Buat script sesuai kontrak TECH_SPEC bagian 20 pada milestone terkait. Minimal:
`lint`, `format:check`, `typecheck`, tes relevan dan `build`. Selanjutnya jalankan
`test:unit`, `test:content`, `test:omr`, `test:integration`, `test:rls`, `test:e2e`,
`test:offline`, `test:privacy`, `simulate:turns` sesuai modul yang berubah.
`verify` mencakup checks yang diwajibkan untuk milestone aktif.

Jangan menghapus/memperlemah test agar hijau. Jangan script no-op/echo-success.
Jika test belum ada, buat; jika belum bisa dijalankan, laporkan NOT_RUN/BLOCKED
beserta alasannya, bukan PASS. Uji hardware/kelas tetap manual; fixture browser
bukan bukti kamera/multitouch fisik. Target 99% / 3 detik / 95% bukan hasil pengukuran.
Jangan menjalankan API berbayar/load test dengan credential pengguna tanpa izin.

Simpan evidence aman pada `artifacts/qa/<milestone>/` saat implementasi: command,
exit code, commit, environment, sample count, screenshot data contoh, hasil aktual.
Perbarui PLAN: status task, keputusan, hasil validasi, blocker, next exact action.
Jangan membuat semua milestone DONE hanya karena satu alur demo berhasil.

## Git, keamanan operasi dan handoff

Jangan reset/clean/rebase destruktif, menghapus uncommitted work, forcepush atau
menimpa baseline. Jangan mengubah production DB, mengirim email, membeli resource,
publish data, atau deploy publik tanpa otorisasi yang sesuai. Gunakan local/staging
untuk tes. Deploy/migration memerlukan backup/rollback dan review RLS.

Satu integrator untuk shared schema, lockfile dan core contracts. Paralel hanya pada
modul yang kontraknya stabil dan worktree/path ownership terpisah; reviewer tidak
mengubah file implementer secara bersamaan. Model spesifik tidak diwajibkan file ini.

Akhiri setiap run dengan ringkasan: task dan file diubah; acceptance terbukti;
command/hasil aktual; blocker/batas yang belum diuji; next task. Lalu berhenti.
Jangan menjanjikan pekerjaan background, mengarang output terminal, atau mengatakan
aplikasi siap produksi sebelum semua gate benar-benar terbukti.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
