<!-- BEGIN PRACTICE_V5 -->

## Alur latihan, cerita AI dan sambungan layar — 3 Oktober 2026 (WIB)

Permintaan terbaru pengguna: perbaiki manfaat AI, bahasa, alur latihan dan
penyambungan kode yang benar, lalu commit/push. Baseline `8df9357`. Implementasi
software dan verifikasi lokal selesai; commit/push menjadi langkah terakhir.
Bagian setelah marker ini adalah laporan historis.

| Bagian                      | Sebelum                                                                      | Sesudah                                                                                          |
| --------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `/guru/latihan`             | Paket, AI dan dua sesi terpisah tanpa hasil yang jelas                       | Tiga langkah: siapkan soal → cerita/bantuan opsional → satu sesi memakai paket yang dipilih      |
| Perpindahan langkah         | Bagian sebelumnya menumpuk setelah setiap tindakan                           | Bagian sebelumnya menutup; isian, pilihan bantuan dan sesi tetap tersimpan                       |
| Cerita AI                   | Tiga paragraf mirip, tanpa lokasi soal atau perbedaan                        | Pilih topik/tema; bandingkan soal semula/cerita, centang yang cocok dan simpan ke tugas/PDF      |
| Saran AI                    | Instruksi menunjuk tombol yang belum terlihat                                | **Minta saran AI** tampil pada kartu langkah 2 setelah sesi nyata dimulai                        |
| Pembuka                     | Istilah formal, Rp6.000 berulang tanpa tujuan                                | Pertanyaan pembuka diskusi, tidak dinilai; topik bisa diganti dan panduan guru dibuka bila perlu |
| Kode layar                  | Lease contoh tidak diperbarui; kode benar mendapat 409 dan dua pesan umum    | Renewal dan satu retry lease sendiri; pesan pemulihan sesuai penyebab; takeover tetap eksplisit  |
| Contoh 32 jawaban           | Pengendali kedua di halaman latihan                                          | Halaman `/guru/simulasi` tersendiri; data dan alur PRELIM lama dipertahankan                     |
| Tampilan                    | Tombol persiapan meregang 76 px desktop; daftar 32 kebutuhan tampil langsung | Tombol 48 px; kebutuhan individu/detail materi dibuka sesuai kebutuhan                           |
| Cek lisan, hasil akhir, PDF | Kode level, pending, draft, replay dan pilot tanpa penjelasan                | Nama topik dan akibat tindakan; catatan materi dalam bahasa yang sama dengan halaman latihan     |

Cara mencoba: **Coba dengan data contoh → Buka latihan & AI → Siapkan soal →
Tambahkan cerita AI → Buat pilihan cerita → Simpan … soal cerita → Lihat tugas
dengan cerita tersimpan/Unduh tugas mandiri PDF → Coba sesi dengan soal ini**.
Cerita mengganti teks tugas mandiri yang dipilih. Soal cek, pembuka, angka dan
kunci tetap sama. Saran mengajar membantu menjelaskan; tidak mengubah penilaian
atau kelompok. [Panduan penggunaan](docs/13_GUIDE_LATIHAN_AI.md).

Verifikasi akhir serial **PASS, exit 0**, build `AcxGagMd5dd7VgVnPgFrA`:

```bash
pnpm format:check && pnpm typecheck && pnpm lint && VITEST_MAX_WORKERS=1 pnpm exec vitest run tests/unit/independent-print.test.ts tests/unit/video-content-pdf.test.ts && pnpm build && pnpm exec playwright test tests/e2e/offline.spec.ts tests/e2e/practice-v5.spec.ts tests/e2e/teacher-flow-v4.spec.ts tests/e2e/package.spec.ts tests/e2e/freshclass.spec.ts tests/e2e/llm.spec.ts --reporter=list
```

Format/types/lint/build PASS; PDF unit **5/5 PASS**; **19/19 E2E PASS**, 3,4 menit,
satu worker/retry 0. Sebelumnya `VITEST_MAX_WORKERS=1 pnpm verify` meluluskan
**1089/1089 unit**, **167 assertion SQL/RLS**, **9/9 integrasi native HTTP +
PostgreSQL**, serta build. Browser full memberi **139 PASS/1 FAIL** (19m52,375s):
allowlist offline lama belum memuat halaman contoh baru. Pemeriksaan diperkuat
menjadi empat shell dan navigasi offline ke `/guru/simulasi?mode=demo`.

Setelah audit HP, empat input UI/PDF dan tiga file tes berubah. Bukti hash
memastikan **574/581 input lainnya identik**, termasuk matematika, provider,
ledger dan SQL. Perubahan PDF diuji lagi dengan lima tes; 19 regresi mencakup
perpindahan langkah, draft/sesi tersimpan, cerita/PDF, offline, privasi dan
fresh-class. Semua **140 skenario unik tercakup**, tanpa menduplikasi suite
lengkap. Tidak diklaim bahwa run `pnpm verify` tadi memberi 140/140 PASS.
Source SHA256 `356934061d4541de114247b7d7d9d4a6770f7d46d44d965ac0b66520607166a2`.
Bukti aktual: [practice-v5.json](artifacts/qa/ui-ai-v2/practice-v5.json).

Riwayat targeted: unit 44/4 file dan native integration 9 PASS. Attempt UI pertama
0/4 gagal pada nama tombol ganda, diperbaiki lalu 4/4 PASS. Legacy development
10 PASS/4 FAIL: satu status lama dan tiga service worker yang belum aktif di dev.
Offline tetap diuji pada production build; tidak menaikkan timeout, mengurangi
500 seed, melemahkan assertions atau mengarang hasil live.

Audit produksi 21 capture/state pada 360/390/1366 dan teks besar 20 px:
**overflow horizontal 0/pageerror 0**. Gambar diperiksa langsung; tidak dicommit.
PDF unduhan nyata diekstrak dengan `pdftotext`: cerita suhu yang dipilih dan
catatan materi baru benar-benar ada. Respons preview untuk audit tampilan diberi
label **sintetis**, bukan bukti provider live. Tautan skip diperiksa di viewport:
tersembunyi sebelum/sesudah long capture, terlihat saat Tab; kemunculan pada
capture panjang merupakan artefak posisi elemen fixed, bukan overlay live.
Audit ini bukan studi pengguna atau tes perangkat fisik.

SQL039 hanya menambah referensi cerita pada validator sync. SQL lama dan review
manifest tetap utuh. Tema suhu/kedalaman memerlukan approval hash nyata masing-
masing; tidak ditandai reviewed dari fixture. Ledger, budget, token, privasi, RLS
serta idempotensi tetap berlaku pada data contoh maupun akun biasa. Core
matematika, auth/data, lockfile, aset Blender dan delapan dokumen asli utuh;
helper memilih pembuka dan dua frame draft merupakan perubahan konten yang
dinyatakan, bukan klaim seluruh konten unchanged. Prefix jurnal/handoff lama
serta receipt lama dipertahankan.

Kebutuhan eksternal sekali untuk run ini: endpoint/protokol/model/kunci server
(`AI_API_BASE_URL`, `AI_PROTOCOL`, `AI_MODEL`, `AI_API_KEY`, `AI_ALLOWED_ORIGINS`
dan `LLM_ENABLED`), profil/harga/anggaran DB, review materi berbasis hash serta
review privasi untuk teks bebas. Migration39 hosted dan tes provider berbayar
perlu otorisasi tersendiri; kamera/QR/perangkat fisik perlu perangkat nyata/HTTPS.
Tidak ada paid/live API, deploy atau hosted migration pada run ini. Biaya API
USD0, aset/dependency baru0; biaya cloud tidak diukur. Kedua protokol diuji
native pada fixture HTTP/ledger lokal, bukan endpoint produksi.

Jalankan di cloud ini: `source /workspace/.papannalar-cloud/activate.sh`,
`pnpm build`, lalu `pnpm video`; buka `http://127.0.0.1:3100/masuk`. Launcher
memakai PostgreSQL lokal existing dan Auth/transport fixture. Backend sendiri:
`pnpm build && pnpm start` dengan konfigurasi server pada panduan historis.

<!-- END PRACTICE_V5 -->

<!-- BEGIN TEACHER_FLOW_V4 -->

## Perbaikan alur guru dan bantuan AI — 3 Oktober 2026 (WIB)

Permintaan terbaru pengguna: latihan harus mudah ditemukan, beranda tidak
menumpuk panel perangkat, dan fungsi AI harus jelas. Baseline `6a637a9`.
Implementasi dan verifikasi software lokal selesai. Tidak ada deploy atau
migration DB hosted. Bagian di bawah marker ini adalah laporan historis.

Commit implementasi [5a101f5](https://github.com/IndraYuda13/papannalar/commit/5a101f5f71b70892890204dbdf73f51878c5156f)
berhasil dipush ke main; SHA remote cocok dengan lokal. CI sesudah push belum
diperiksa. Catatan publikasi ini tidak mengklaim deployment.

| Halaman                         | Sebelum                                                                                   | Sesudah                                                                                                                                                                 |
| ------------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Seluruh menu guru               | Latihan tersembunyi di pengaturan kelas; empat menu                                       | Menu **Latihan & AI** terlihat di desktop dan navigasi bawah HP; label HP ringkas                                                                                       |
| `/guru`                         | Daftar sesi aktif tak terbatas mendahului kegiatan; AI sulit ditemukan                    | Tiga sesi terbaru dengan tanggal, sisanya dibuka bila perlu; kartu **Buka latihan & AI** menjelaskan tujuan                                                             |
| `/guru/latihan`                 | Judul Beranda, panel sync/offline di atas kegiatan, akun contoh membuka mode pilot kosong | Judul sesuai tugas; kelas contoh dipilih otomatis; persiapan dan kegiatan berurutan; pengelolaan kelas/perangkat tertutup                                               |
| Bantuan AI                      | Tombol tak punya konteks, kode kesulitan mentah, fallback tidak menjelaskan penyebab      | **Buat cerita untuk soal** dan **Cari cara menjelaskan**; pilihan judul kesulitan; status konfigurasi dan alasan fallback jelas; tanya tambahan opsional                |
| `/guru/kelas/[id]`              | Pintu latihan berada dalam pengaturan                                                     | Aksi **Siapkan latihan & AI** terlihat, membawa kelas dan mode yang dipilih                                                                                             |
| `/guru/mulai`                   | Form kosong tanpa kelas; pilihan sumber lama bisa tetap terpilih                          | Keadaan kosong mengarah ke tambah kelas; berpindah sumber mengosongkan materi sebelumnya                                                                                |
| `/guru/asesmen`                 | Pesan kosong tanpa langkah berikutnya                                                     | Keadaan kosong mengarah ke mulai cek pemahaman                                                                                                                          |
| Offline, cache dan sinkronisasi | Informasi rutin selalu tampil; URL konteks tidak punya fallback offline                   | Pengaturan tersedia di **Penyimpanan & internet**; peringatan penting tetap terlihat; mode/kelas kembali dari cache perangkat; query aman menunjuk shell publik kanonis |

Cara mencoba: **Coba dengan data contoh → Beranda → Buka latihan & AI →
Siapkan Paket Sesi → Coba bantuan AI → Pratinjau cerita AI**. Untuk saran
mengajar, pilih kesulitan pada kartu; bantuan AI yang memakai konteks sesi ada
saat rotasi berjalan. Latihan tidak mengarang sesi agar bisa melewati ledger.
Status konfigurasi bukan bukti provider telah diuji. Kartu saran/soal tetap
tersedia bila AI nonaktif. Review materi, privasi, anggaran, token dan RLS
berlaku sebagaimana konfigurasi AI di bagian historis handoff ini.

Targeted produksi: **17/17 E2E PASS**, satu worker/retry0, build
`Quvw_Z5I4UI1eyh2trzdf` (1,6 menit). Unit kebijakan cache **17/17 PASS**.
Setelah targeted, copy topik, indikator offline dan ringkasan tiga sesi
beranda ditambahkan; semua perubahan dicakup verifikasi akhir berikutnya.
Log `/workspace/.papannalar-cloud/logs/teacher-flow-targeted-prod.log`.
Test FLOW03 awal salah memakai label DOM yang memuat nomor langkah; selector
kemudian memakai nama combobox yang diakses pengguna. Dua attempt development
3/4 dan0/1 gagal pada selector tersebut; tidak diklaim PASS.

Attempt verify awal berhenti pada unit500seed:1086PASS/1timeout5s.
Diagnostic single-worker19/19PASS (500seed1536ms, tanpa coverage).
Attempt `VITEST_MAX_WORKERS=1 pnpm verify` meluluskan **1087/1087 unit**,
**9/9 integrasi AI** dan seluruh SQL/RLS; build juga lulus. Browser dihentikan
setelah18PASS/4FAIL/1interrupted/111NOT_RUN untuk memperbaiki ekspektasi UI lama.
Targeted auth/offline setelah perbaikan **10/10 PASS** (39,1s). Whitelist
penyimpanan tetap membatasi identitas/mode dan pilihan open/closed; pemeriksaan
HttpOnly, CSRF, nama lokal dan akses antar akun tetap berlaku. Assertions,
sample500,timeout unit dan coverage threshold tetap sama.

Serial browser berikutnya dihentikan setelah69PASS/0FAIL/1interrupted/64NOT_RUN
untuk memperbaiki hasil audit: konflik/login baru dari sinkronisasi otomatis
harus memunculkan peringatan di luar pengaturan tertutup. Callback pemberitahuan
ditambahkan tanpa mengubah queue, retry atau transport. Dua regresi baru
memastikan jawaban tetap utuh dan tombol recovery membuka pengaturan.

Kandidat `1lvMZRAM-FPLsYLD6GOcJ`: **format/types/lint/build PASS**.
Full136E2E serial memberi **131PASS/5FAIL** (18m33,971s). Empat gagal memakai
UI lama:4menu pada3viewport dan pesan asesmen kosong. Satu fresh-class mencatat
board HTTP403 pada assertion konsol. Ulang lima kasus memberi **5/5 PASS**
(1,9 menit); assertion konsol tetap ketat dan diagnostic endpoint ditambahkan.
403 tidak terulang, tetapi penyebabnya belum dibuktikan. Tidak ada suppression,
pengurangan skenario, perubahan timeout atau klaim full-run136/136PASS.

Semua **136 skenario unik tercakup (131+5)** pada aplikasi/build yang sama.
Hash membuktikan508/511input utuh; hanya tiga file tes browser berubah setelah
full. Final command serial exit0:

```bash
pnpm format:check && pnpm typecheck && pnpm lint && pnpm exec playwright test tests/e2e/freshclass.spec.ts tests/e2e/ui-polish-editor.spec.ts tests/e2e/video-library.spec.ts --grep 'E2E02|Polish T01/T05/T06|U08-U13' --reporter=list
```

Unit1087, integrasi9 dan SQL/RLS yang telah PASS pada verify tidak diduplikasi.
Input unit/integrasi tetap identik; perubahan kemudian hanya UI notification
dan browser checks. Source final SHA256
`e9cc3fc34a47ef39c8c0ae853328d6214a41314a86ce9ca5fe12d16f75695d4f` (511file).
Log full `/workspace/.papannalar-cloud/logs/teacher-flow-final-candidate.log`;
log regresi `/workspace/.papannalar-cloud/logs/teacher-flow-final-repair.log`.

Bukti aktual: [teacher-flow-v4.json](artifacts/qa/ui-ai-v2/teacher-flow-v4.json).
Audit produksi12route/viewport390/1366 plus2captureAI: **overflow0/pageerror0**.
Screenshot diperiksa langsung, memakai kelas contoh dan tetap excluded; hasil
browser bukan studi pengguna/hardware. Core matematika, konten, kontrak API,
auth/RLS,38migration dan aset Blender existing utuh. Tidak ada dependency/aset
baru; biaya APIUSD0, biaya infrastruktur cloud tidak diukur. Provider native
OpenAI/Anthropic PASS pada fixture HTTP/ledger lokal; live NOT_RUN.

Jalankan dari cloud: `source /workspace/.papannalar-cloud/activate.sh`,
`pnpm build`, lalu `pnpm video`; buka `http://127.0.0.1:3100/masuk`.
Launcher memakai PostgreSQL lokal dan Auth/transport fixture, bukan hosted.
`pnpm video:dev` tersedia untuk pengembangan. Untuk backend Anda, ikuti bagian
konfigurasi existing di bawah; credential/provider live/HTTPS/perangkat nyata
belum diuji. Aktifkan LLM setelah aktivasi cloud, karena helper validasi
menetapkan `LLM_ENABLED=false`.
<!-- END TEACHER_FLOW_V4 -->

# PapanNalar UI + AI v2 — handoff cloud

Implementasi U0–U5 selesai pada repository existing untuk seluruh acceptance
software yang dapat diuji lokal. Gerbang upgrade awal serial **PASS, exit 0**;
hasil historis ada di `artifacts/qa/ui-ai-v2/summary.json`. Koreksi UI terbaru
berdasarkan dua screenshot pengguna merupakan hasil historis. Koreksi UX HP dan
akun contoh 3 Oktober dijelaskan pada bagian terbaru di bawah.
Baseline HEAD `efcdd36b318cb84654a12f0dd698dd6bc0e05b94` (branch `work`).
Snapshot implementasi [5eef21f](https://github.com/IndraYuda13/papannalar/commit/5eef21f9c2aea0c9217c4fb376c44e6aaacf792e)
berhasil dipush ke `main` pada 3 Oktober 2026 (WIB) atas permintaan pengguna.
Belum di-deploy. M00–M17 dan jurnal lama dipertahankan. Bukti fixture lokal tidak
menyatakan kesiapan production. Catatan publikasi lengkap ada pada PLAN bagian9.57;
hasil CI sesudah push belum diperiksa.

`SOURCE_FINDINGS.md` berasal dari arsip sebelum HEAD ini. Lokasi UI/provider/ledger
dicocokkan dengan kode aktual; perbaikan timeout dua simulasi 500 sampel pada HEAD
dipertahankan. Core matematika, konten, penyimpanan lokal, auth, review dan seluruh
37 migration existing tidak berubah. Sembilan addendum memiliki backup dan proof
bahwa isi dokumen serta jurnal sebelumnya tetap utuh.

## Koreksi UX HP dan akun contoh — 3 Oktober 2026 (WIB)

Implementasi tujuh permintaan terbaru selesai dan gerbang kandidat akhir
**PASS, exit 0**. Baseline koreksi ini `4ce1227a7b4831e1a8d9e3dda5e9042a2d5eb501`.
Build `ANeazQh8M22lxHU2tCNGE`, source SHA256
`cabf4f62d5300e949e48855744ddab57e45b2a7cc1a9d6724aeef7465f0b5adb`
(501file). Bukti aktual: [session-ux-v3.json](artifacts/qa/ui-ai-v2/session-ux-v3.json).
Commit implementasi [9d26efc](https://github.com/IndraYuda13/papannalar/commit/9d26efc91a0d404f16557f453b852962dffc41ef)
berhasil dipush ke `main` pada3Oktober2026; remote SHA cocok dengan lokal.
CI post-push belum diperiksa. Demo kandidat ini berjalan lokal pada port3100;
`/masuk` memberi HTTP200. Publikasi tidak menjalankan deployment atau DB hosted.

Command final serial:

```bash
pnpm format:check && pnpm typecheck && pnpm lint && pnpm build && pnpm test:e2e
```

Format/types/lint/build PASS; **129/129 E2E PASS**,17m1.669s,1worker,
tanpa retry/flaky/skip. Zona tulis dibersihkan2431ms setelah tombol putuskan
digunakan; server revoke sukses, reload tetap tanpa tinta.
Unit **1086/70file**, integration **9/1file** dan seluruh SQL/RLS sudah PASS
pada tahap `pnpm verify` sebelum audit visual terakhir. Setelah itu hanya CSS
preview pecahan dan assertion overlap E2E berubah; rekonstruksi SHA membuktikan
499file lainnya byte-identical, termasuk input unit/integration dan TypeScript
aplikasi. Suite yang sudah dicakup tidak diduplikasi. Command `pnpm verify`
terdahulu bukan full PASS: satu attempt gagal karena deadline total test,
dua attempt dihentikan untuk audit motion/layout. Riwayat dan hasil aktual ada
pada PLAN9.58 dan receipt; hasil akhir tidak menyembunyikan attempt tersebut.
Log E2E final `/workspace/.papannalar-cloud/logs/session-ux-final-candidate.log`;
output tahap format/types/lint/build ada pada execution transcript.

| Halaman                       | Sebelum koreksi ini                                                                                                                 | Sesudah                                                                                                                                                                                                       |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/masuk`, seluruh shell guru  | Menu “Tampilan nyaman”, branding footer/context berulang                                                                            | Menu dan copy berulang dihapus; preferensi OS/aksesibilitas yang tersimpan tetap dihormati otomatis                                                                                                           |
| Akun data contoh              | Tiga gate server menonaktifkan AI khusus SAMPLE_TEACHER_ID                                                                          | Status, Bisik dan enrichment melalui adapter/ledger yang sama dengan akun guru                                                                                                                                |
| `/guru`                       | Ubin aljabar bertumpuk dan bentuk sulit dikenali                                                                                    | Baki miring Blender dengan x², tiga batang x dan lima ubin satuan; dua model lain utuh                                                                                                                        |
| `/guru/sesi/[id]` di HP       | Rail/label bertumpuk, grafik dua kolom sempit, kontrol pecahan overlap, input pairing tetap terlihat, close tidak berpindah halaman | Preview keenam alat dan tulisan punya gulir sendiri, angka dan kontrol pecahan terbaca, tombol48px; QR langsung claim; ACK menyembunyikan form; disconnect mengembalikannya; close punya progres lalu beranda |
| `/layar`                      | Trigger menu minimal96px dan isi tertutup mempertahankan kotak layout                                                               | Trigger48px ringkas, isi tertutup tanpa layout, menu lengkap saat dibuka                                                                                                                                      |
| Seluruh halaman guru dan alat | Transisi terbatas, objek dominan simbol polos                                                                                       | Transisi halaman/soal220ms, scroll halus/reveal, strip geser antarsoal, ikon/objek SVG kartun asli                                                                                                            |

Geser antarsoal hanya aktif pada strip judul/progres: tidak merebut drag penanda,
ubin, titik grafik, gulir alat atau tulisan. Tombol/keyboard tetap tersedia.
Label dan padding SVG mengikuti ruang piksel; pointer projection memakai area
rail/grafik yang sama. Reducer, bilangan rasional, solver dan check tidak berubah.
Model/input tetap mounted ketika konten digulir atau bagian bacaan berpindah.
Motion menunggu preferensi siap; OS reduced-motion/save-data/preferensi tersimpan
menonaktifkan motion atau memakai poster tanpa menu pengaturan tambahan.

QR kamera aplikasi dan challenge tersimpan dari kamera HP langsung mengajukan
claim setelah sesi/kelas aktif dipilih. Tidak mem-fetch/navigasi URL hasil scan.
QR foreign ditolak lokal, kamera ditutup setelah decode, request terkunci agar
satu scan tidak memanggil dua kali. “Layar tersambung” bergantung ACK papan,
bukan sekadar sukses claim. Koneksi gagal tetap memberi kode manual dan retry.
Akhiri sesi mempertahankan konfirmasi yang sudah ada; kegagalan tetap di sesi,
keberhasilan menutup di server, memperbarui cache, lalu `replace('/guru')`.

AI akun contoh setara akun guru: tidak ada blacklist SAMPLE_TEACHER_ID pada route
AI. Switch global/config/profile, batas biaya/token, review konten/privasi,
allowlist DTO, ownership/RLS, kartu statis dan idempotensi tetap berlaku.
Dua protokol diuji dengan HTTP fixture + ledger PostgreSQL nyata; **live NOT_RUN**.
Auth/content-review hooks pada integration sintetis; manifest approval production
tetap utuh. Browser memakai Auth/transport fixture loopback, bukan layanan live.
Operator mengisi endpoint/model/key server dan policy/profile yang sudah
didokumentasikan di bawah; toolchain cloud mengaktifkan `LLM_ENABLED=false`
untuk validasi aman, jadi opt-in aplikasi harus disetel setelah aktivasi toolchain; tidak ada credential atau approval yang dikarang.

Model algebra-kit baru127860byte/8376triangle + poster99214byte. Total ketiga
GLB317492byte + poster355382byte =672874byte, maksimum127860byte<500KB/model.
Blender4.3.2/Cycles CPU96samples, transparan720×540, tanpa download/font/texture
baru; `.blend` dan generator tersedia. Dua GLB/poster/blend lain byte-identical.
Fetch model direvalidasi antarpemuatan aplikasi agar GLB lama tidak tertahan
force-cache; satu promise/canvas di tab, tetap lazy terpisah dari renderer soal.
Aset/API berbayar **USD0**. Perangkat fisik/kamera nyata/hosted provider dan deploy
belum diuji/dijalankan; fixture kamera bukan bukti hardware.
Duabelas screenshot keenam alat pada HP360/390 disimpan lokal di
`artifacts/qa/ui-ai-v2/session-ux-v3/`; model pada `scene-algebra-kit.png`.
Semua jenis alat diperiksa visual; screenshot/log mentah tetap ignored,
tanpa tinta pengguna atau QR yang dipublikasikan.

## Koreksi pertama — 2 Oktober 2026 (hasil historis)

3D sekarang otomatis tampil saat scene terlihat, tanpa caption
“Papan dan benda belajar” dan tanpa tombol Jelajahi 3D/Lihat poster. Scene tetap
dipisahkan dari bundle awal, dan preferences dibaca sebelum mengunduh engine;
save-data, pilihan tampilan ringan yang tersimpan, no-WebGL/chunk gagal tetap
memakai poster. Intro login yang tersembunyi pada HP tidak memuat engine.

Navigator soal memakai grid dengan lebar minimum nol dan teks yang dibatasi ruang
kartu. Overflow awal **20px → 0px** pada desktop. Semua kartu tetap dalam panel
pada lebar360/390/1024/1280/1366 dan teks100/130%; target sentuh minimal48px.

Build koreksi 2 Oktober `JJ8Ophp65UWCGJ7KT-ntf`: format/typecheck/lint/build **PASS**, dan
**21/21 tes browser terarah PASS**,86.658detik,1worker,tanpa retry/flaky/skip.
Kelima check dijalankan serial pada kandidat yang sama. Tes meliputi render
otomatis, save-data/preference tersimpan, fallback, scanner/offline cache,
walkthrough guru, batas kartu navigator, editor/template/preview/histori dan pairing.
Kandidat awal koreksi dan hasil tesnya disimpan terpisah; kamera kemudian
disesuaikan setelah pemeriksaan visual dan kandidat terbaru diuji kembali.

Permintaan Blender juga diimplementasikan: tiga model dari kit dirapikan di
**Blender4.3.2**, dengan bevel/normals, bola halus, material matte dan warna glTF
yang benar. Kamera aplikasi menjaga alas/seluruh model dalam frame saat pointer
bergerak. Tiga sumber `.blend` tersedia di `design/pn-ui-v2/`; originals GLB/poster
tetap byte-identical dengan kit. Poster baru adalah render Cycles CPU transparan.
Tidak menambah dependency runtime atau layanan Python. Cara regenerasi ada pada
[README aset](public/assets/pn-ui-v2/README.md).
Perintah Playwright:

```bash
pnpm exec playwright test tests/e2e/ui-ai-v2.spec.ts tests/e2e/ui-polish-editor.spec.ts tests/e2e/video-library.spec.ts tests/e2e/offline.spec.ts --grep 'U2|U1 |Polish T01|Polish T03|U08-U13|U16|tab baru offline' --reporter=list,json
```

Bukti koreksi: `artifacts/qa/ui-ai-v2/ui-corrections.json`; screenshot lokal pada
`artifacts/qa/ui-ai-v2/corrections/{before,after}/`. Log ada di
`/workspace/.papannalar-cloud/logs/ui-corrections-final-fit-*`. Hasil full verify122/122
di bagian pengujian adalah hasil build upgrade sebelumnya, bukan full suite baru
pada koreksi ini. AI, SQL, auth, data dan matematika tidak diubah oleh koreksi UI.

## Jalankan di cloud ini

Node **24.14.1**, pnpm **11.19.0**, PostgreSQL **17.11**, Chromium Playwright
**153.0.8010.12** tersedia. Aktifkan toolchain sebelum memakai terminal baru:

```bash
cd /workspace/papannalar
source /workspace/.papannalar-cloud/activate.sh
pnpm build
pnpm video
```

Buka `http://127.0.0.1:3100/masuk` → **Coba dengan data contoh** → `/guru`.
Buka `/layar` di tab lain untuk papan. `pnpm video:dev` memakai mode development.
Launcher mempertahankan seed 7B/7C existing dan hanya memakai DB loopback
`pn_m01c_test` port 55432. Provider Auth/transport pada port 54325 adalah fixture;
PostgreSQL lokal dan RPC/RLS benar-benar dijalankan. Ctrl+C menghentikan launcher.
Jangan jalankan dua launcher pada port yang sama.

Pada checkout lain, gunakan versi Node/pnpm yang dipin dan
`pnpm install --frozen-lockfile`; setup PostgreSQL lokal mengikuti
[handoff lokal](docs/09_LOCAL_HANDOFF.md) dan [VIDEO_HANDOFF](VIDEO_HANDOFF.md).
Untuk server hosted, konfigurasi Auth/Supabase/HTTPS berbeda dari adapter loopback.

## Halaman sebelum → sesudah

15 tujuan navigasi diinventarisasi, termasuk `/` yang tetap mengarahkan ke `/guru`.
Detail UUID pada bukti adalah data sintetis, bukan route atau data hardcode di UI.

| Route                                | Sebelum                             | Sesudah                                                                                                   |
| ------------------------------------ | ----------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `/`, `/guru`                         | Kartu memulai bercampur dengan sesi | Sesi aktif didahulukan; ringkasan soal aktual, CTA mulai, Jelajahi alat                                   |
| `/masuk`                             | Form di tengah                      | Pengantar + 3D otomatis dengan poster fallback; form lebih dulu pada HP; akses data contoh tetap          |
| `/guru/kelas`                        | Daftar kartu                        | Baris kelas yang mudah dipindai, pencarian berlabel, empty/filter state                                   |
| `/guru/kelas/[id]`                   | Judul dan roster                    | Header konteks kelas/jumlah/grade, struktur panel, retry; nama lokal tetap lokal                          |
| `/guru/soal`                         | Katalog teks/kartu                  | Hierarki tab, poster alat, konteks isi dan empty state dengan tindakan                                    |
| `/guru/soal/[id]`, `/guru/soal/baru` | Semua form soal memanjang           | Navigator soal + satu form terpilih; isian lain tetap mounted; preview renderer produksi, batalkan contoh |
| `/guru/mulai`                        | Pilihan kelas/materi                | Tiga langkah dengan ringkasan pilihan aktual; resume sesi existing                                        |
| `/guru/asesmen`                      | Daftar hasil/kartu                  | Filter/tab lebih jelas, daftar ringkas, status dan CTA sejajar                                            |
| `/guru/hasil/[id]`                   | Rincian panjang                     | Ringkasan lembar masuk/perlu cek/versi, baris roster dan expand/collapse                                  |
| `/guru/sesi/[id]`                    | Panel kendali bercampur             | Soal/progres utama, pairing/remote di samping; HP menampilkan soal lebih dulu; scanner tetap 2D           |
| `/guru/latihan`                      | Shell terpisah                      | Shell/navigasi Studio yang sama; seluruh alur adaptif existing dipertahankan                              |
| `/layar`                             | Idle instruksi/pairing              | Idle dua kolom dan QR/kode kontras; papan aktif tetap renderer math akurat, preset dan undo existing      |
| `/demo`                              | Halaman fixture sederhana           | Header/panel konsisten dengan penanda sumber fixture yang tetap jelas                                     |

Loading, error/retry, 404, empty, offline dan status belum tersinkron tetap memiliki
penjelasan/tindakan. Navigasi tidak mem-prefetch RSC saat halaman offline; cache
tetap hanya shell publik dan aset statis. Daftar private/API/RSC tidak ditambahkan
ke cache untuk menghilangkan error.

Screenshot lokal terpilih, seluruhnya sintetis:
[masuk sebelum koreksi](artifacts/qa/ui-ai-v2/corrections/before/login.png) /
[sesudah](artifacts/qa/ui-ai-v2/corrections/after/login.png),
[editor sebelum koreksi](artifacts/qa/ui-ai-v2/corrections/before/editor-1366.png) /
[sesudah](artifacts/qa/ui-ai-v2/corrections/after/editor-1366.png),
[hasil sebelum](artifacts/qa/ui-ai-v2/before/10.png) /
[sesudah](artifacts/qa/ui-ai-v2/after/10.png).
Screenshot mentah tetap lokal/diabaikan Git; route matrix dan ringkasan aman
di-allowlist. Screenshot terpilih diperiksa visual, bukan hanya dihasilkan.
Perbandingan detail memakai class/collection/run sintetis yang sama dengan baseline;
kode pairing pada screenshot idle disamarkan.

## Motion, 3D dan biaya aset

Reveal ringan memakai IntersectionObserver dan CSS; tidak menambah dependency
motion atau event penilaian. Reduced motion mengikuti OS/preferensi tersimpan.
Preferensi ringan tersimpan dan save-data mencegah download engine/model. Poster menjaga
tampilan saat loading; Three/GLTFLoader dimuat otomatis saat scene terlihat,
setelah preferences siap. Caption dan tombol mode scene sudah dihapus.
Satu canvas, DPR maksimum 1.5, render hanya saat input/resize/load/visibility;
tidak ada auto-rotation/RAF terus-menerus. Cleanup membuang geometry/material,
renderer/context dan observer. Context atau chunk gagal → poster; login tetap bisa.
Pengukuran render pada kandidat koreksi: draw count idle **105→105**,
hidden **105→105**, offscreen **117→117**, reduced motion **165→165**; tampilan
ringan menyisakan **0 canvas**. Bukti berada pada `ui-corrections.json`.
Hidden memakai stub `document.hidden` yang dinyatakan eksplisit; ini pengukuran
fungsi render browser, bukan pengukuran konsumsi daya GPU/perangkat fisik.

Ketiga GLB/poster bundled dipakai: learning-board pada masuk/beranda;
balance-scale dan algebra-kit pada Jelajahi alat; kartu katalog memakai poster.
QR, scanner dan renderer soal tidak memakai scene dekoratif. Poster di-precache;
GLB dan chunk Three dikecualikan dari cache shell.

Snapshot authoring 2 Oktober (historis): model **245.304 byte**, poster **341.308 byte**, total
**586.612 byte**. Learning-board pada login **68.160 byte**; model terbesar
timbangan **121.472 byte**, semuanya di bawah batas500KB per model. Poster
berukuran720×540; ketiganya di-precache. File `.blend`/originals hanya sumber
authoring dan tidak dikirim ke aplikasi. Paket awal270.410byte tetap disimpan;
peningkatan kualitas geometri/render menambah316.202byte untuk seluruh aset.
Chunk 3D terpisah **619.413 byte raw / 154.313 byte gzip**, target250KB gzip;
delta3D terhadap baseline tanpa Three adalah +154.313byte gzip **opsional**.
Delta total JS shared route terhadap build baseline tidak diukur; jangan menebaknya
dari ukuran source. Ukuran build akhir ada di [bundle.json](artifacts/qa/ui-ai-v2/bundle.json).
Geometri/poster asli **CC0-1.0**, Three.js **MIT**; pembelian aset **USD 0**.
Tidak ada CDN aset baru. Hash, path, asal, batas dan ukuran poster ada di
[manifest aset](public/assets/pn-ui-v2/manifest.json) dan
[asset-budget.json](artifacts/qa/ui-ai-v2/asset-budget.json).

Draft onboarding mempertahankan install script/toolchain yang sudah diuji.
`start_skill` diperbarui untuk migration test038, status verifikasi terbaru dan
authoring Blender opsional. Draft tersimpan untuk review pengaturan lingkungan;
belum dipublikasikan dan pemulihan dalam task baru belum diuji.

## AI server: dua protokol native

| Protocol                  | Endpoint dari API root    | Uji lokal                                           | Live    |
| ------------------------- | ------------------------- | --------------------------------------------------- | ------- |
| `openai-chat-completions` | `<base>/chat/completions` | HTTP fixture + Bisik/enrichment → ledger PostgreSQL | NOT_RUN |
| `anthropic-messages`      | `<base>/messages`         | HTTP fixture + Bisik/enrichment → ledger PostgreSQL | NOT_RUN |

Model fixture `configured-model` / `fixture-requested-alias` bukan model default
aplikasi. Model reported alias/snapshot boleh berbeda. Operator wajib mengisi
`AI_MODEL`; model coding Codex tidak dipakai sebagai default.

Gunakan [.env.example](.env.example) atau
[config/.env.ui-ai.example](config/.env.ui-ai.example), **OFF** secara default.
Isi server saja: `AI_PROFILE_ID`, `AI_CONFIG_VERSION`, `AI_PROTOCOL`,
`AI_API_BASE_URL` (API root dengan `/v1` bila diperlukan), `AI_ALLOWED_ORIGINS`,
`AI_MODEL`, `AI_API_KEY`, `AI_MAX_INPUT_TOKENS`, `AI_MAX_OUTPUT_TOKENS` dan
`LLM_GATEWAY_TOKEN`. Untuk native Anthropic pilih `x-api-key` +
`AI_ANTHROPIC_VERSION=2023-06-01`; gateway bearer harus dipilih eksplisit.
OpenAI memilih tepat satu token field; JSON prompt/object/schema mengikuti profil
dan schema task Bisik/cerita sebenarnya. Respons tetap divalidasi domain.

Ganti endpoint/model/protocol melalui env server lalu restart, tanpa edit UI.
Jalur legacy hanya berlaku bila **seluruh `AI_*` dihilangkan** dan key Anthropic
lama disediakan; konfigurasi campur/setengah lengkap fail-closed. Tidak ada retry
otomatis, vendor failover, key browser atau API listing saat startup.
URL harus HTTPS, origin operator exact, tanpa credentials/query/fragment/redirect;
HTTP loopback hanya dengan flag local-dev. Fetch tidak mem-pin DNS: deployment
memerlukan kebijakan egress yang sesuai; ini bukan klaim SSRF-proof.

## Ledger, budget dan review

Migration baru [038](supabase/migrations/202610020038_ai_profiles.sql) additive.
Migration001–037 tidak disunting. V1 rows/receipt tetap utuh; V2 menyimpan snapshot
profile/protocol/requested model/config/price/date/currency/limits/prompt saat reserve.
Complete harus cocok snapshot, bukan harga/profile yang mungkin sudah berubah.
Counter hilang tetap `null`, `usageKnown=false`; reservation konservatif tetap
ditagihkan terhadap budget. Ledger mencatat ceiling, bukan invoice vendor aktual.
Duplikasi requestId tidak memicu paid attempt kedua; receipt identik idempoten,
receipt berbeda ditolak. SQL mengunci policy/profile/account untuk concurrency.

Provisioning profil adalah tugas operator DB tepercaya **setelah izin yang sesuai**.
Di `pn_private.llm_profiles`, identity/limits harus sama dengan server. Isi
`price_version`, `pricing_date`, `currency=USD`, empat
`*_per_million_microusd`, `cap_microusd`, `request_cap`, `token_cap` dan
`configured_free` dari kontrak harga aktual. USD 1 = 1.000.000 microusd;
USD 1/juta token = 1.000.000 pada kolom harga per million. Harga `NULL`/tanpa tanggal
tidak bisa diaktifkan. Free memerlukan empat angka nol eksplisit dan tetap punya
request/token cap. Policy global/account/gateway hash juga harus diprovision.
Tambahkan config version saat mengganti model/harga; jangan relabel receipt lama.

Status operator memisahkan configured, connectionTested, contentEligible,
privacyReviewed dan budgetEnabled/reason. Hash review stale tidak membuat konten
eligible. `connectionTested` pada status aplikasi tetap false; receipt diagnosis
terpisah tidak otomatis menjadi approval kelas. Manifest review konten masih kosong,
privacy review masih null. Akun contoh memakai aturan konfigurasi/review/budget
yang sama dengan guru; gate khusus akun contoh sudah dihapus. Kartu strategi
statis tetap tersedia, tanpa nama/foto/ink/QR/identity kelas pada payload provider.

## Diagnosis aman

```bash
pnpm ai:diagnose
```

Default membaca konfigurasi dengan **0 request**, tidak menulis approval.
Uji vendor berbayar belum diotorisasi/dijalankan pada pekerjaan ini. Bila operator
kemudian mengotorisasi probe sintetis, CLI mensyaratkan `--allow-paid`,
`--max-requests 1..3`, dan `--policy-file` yang cocok dengan profil/harga/cap.
[Template policy](config/ai-diagnostic-policy.example.json) sengaja memiliki harga
unknown sehingga gagal sampai operator mengisinya. Deadline 5 detik per probe,
stop setelah failure, tidak retry; receipt sanitized `.local/ai-connection-receipt.json`
tidak memuat raw body/key. Ceiling konservatif terpisah dari biaya aktual.

## Pengujian aktual dan batasnya

Perintah batch/log aman berada di `/workspace/.papannalar-cloud/logs/ui-ai-*`.
Contract/HTTP baru **35 PASS**, policy/CLI diagnostic **11 PASS**;
reference codec dari kit **34 PASS** (bukan integration aplikasi).
Route → adapter → HTTP fixture → store → PostgreSQL **7 PASS**; hooks Auth/review
di suite ini sintetis, sedangkan RLS lintas tenant/board diuji SQL terpisah.
SQL legacy **27 assertions PASS**, v2 **28 assertions PASS** meliputi
snapshot/caps/unknown usage/idem/RLS.
Build produksi, render semua GLB dan walkthrough guru 360/390/1366 sudah dijalankan.
Batch awal mencatat failure nyata (StrictMode cleanup, label/form, prefetch offline
dan locator fixture); perbaikan tidak menghapus assertion math/privacy/offline.
Hasil batch bukan pengganti gerbang final `pnpm verify` yang mencakup
format/typecheck/lint/unit+coverage/SQL+integration/build/E2E secara serial.

Gate akhir `pnpm verify`: **PASS, exit 0** pada build
`g4UViW8Y3PMr1kvczW2E4`. Format, typecheck, lint, **1.086 unit/70 file**,
seluruh SQL/RLS, **7 integration/1 file**, build dan **122/122 E2E** lulus.
E2E memakai satu worker, tanpa retry, flaky atau skip; durasi aktual **15,4 menit**.
Coverage statements/branches/functions/lines: **92,44/87,47/96,26/93,44%**.
Walkthrough produksi **15/15 tujuan** HTTP200, tanpa overflow/runtime error dan
tanpa request engine/GLB sebelum opt-in. Hasil ada di
[summary.json](artifacts/qa/ui-ai-v2/summary.json) dan
[route-matrix.json](artifacts/qa/ui-ai-v2/route-matrix.json).

Percobaan gate sebelumnya tetap dicatat: format lalu lint berhenti sebelum tes;
dua run penuh masing-masing 120/122 browser PASS. Perbaikan mencakup pemilihan
soal editor, CTA beranda pada header, koordinat remote setelah layout/hit target
stabil, dan penutupan request fixture QR. Batch perbaikan terkait lulus sebelum
gerbang serial terbaru diulang. Assertion hasil math, receipt aksi, historical key,
auth, privasi dan offline tetap dipertahankan. Log akhir:
`/workspace/.papannalar-cloud/logs/ui-ai-final-verify.log`.

Kebutuhan eksternal yang belum tersedia: credential/key + akses model/protocol vendor
dan izin biaya untuk live AI; keputusan reviewer konten/privasi; profile/harga/cap
DB hosted; project Supabase/Auth/Realtime dan origin HTTPS yang sah; HP/kamera serta
papan fisik touch/digitizer untuk uji native QR, multi-touch dan latensi perangkat.
Di loopback HTTP, QR lintas perangkat sengaja tidak diiklankan. QR browser diuji
dengan challenge HTTPS sintetis dan kontras pixel, bukan klaim scan kamera nyata.
Tidak ada paid vendor request, deploy, migration DB hosted, approval manusia atau
pilot guru yang dikarang. Pengeluaran vendor pada run ini **USD 0**.

## Rollback

Nonaktifkan AI pada server dan policy/profile tepercaya dahulu; biarkan lease 5/30
detik selesai dan rekonsiliasi receipt yang uncertain. Revert aplikasi/lockfile
melalui commit review normal bila diperlukan, sambil mempertahankan migration dan
histori V1/V2. Jangan drop usage/snapshot, reset kelas, menghapus jurnal atau
memulihkan backup di DB hosted tanpa keputusan operator. Untuk visual, tampilan
ringan/poster tersedia tanpa mengubah data, session ID, timer atau core matematika.
