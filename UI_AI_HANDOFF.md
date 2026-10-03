<!-- BEGIN WORKFLOW_V7 -->

## Alur guru, jawaban dan tampilan HP — 3 Oktober 2026

Perubahan berangkat dari `05ed781`. Kesalahan **Sesi belum dimulai** berhasil
direproduksi dari tombol yang dipakai pengguna: jalankan contoh sesi 7B,
kembali ke latihan pada kelas yang sama, siapkan soal, lalu mulai mengajar.
Histori contoh yang sudah terisi terbaca sebagai sesi persiapan biasa; pesan
kesalahan kemudian keliru menunjuk penyimpanan perangkat. Histori contoh kini
tetap tersimpan pada alurnya sendiri, sesi baru dimulai kosong, dan klik ulang
memakai sesi yang sudah dibuat. Penolakan aturan sesi memiliki pesan khusus;
masalah penyimpanan tetap ditangani sebagai masalah penyimpanan.

Alur utama: **Beranda → Mulai mengajar → pilih kelas → pilih soal → Mulai
sesi → jalankan kegiatan → Akhiri sesi**. Asesmen berakhir di hasil; mengajar
berakhir di beranda. Latihan otomatis dan bantuan AI berada pada pilihan
tambahan. [Panduan guru, soal sendiri dan cetak kartu](docs/13_GUIDE_LATIHAN_AI.md)
menjelaskan langkah lengkap.

| Halaman/bagian                     | Sebelum                                                                                  | Sesudah                                                                                                                                                    |
| ---------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/masuk`                           | Perbaikan sebelumnya sudah memakai 3D otomatis dan menghapus pilihan tampilan berlebihan | Dipertahankan dan diperiksa ulang pada enam viewport; tidak diklaim sebagai perubahan baru                                                                 |
| Kerangka guru                      | Pada HP, kepala halaman dan konteks menyita ruang                                        | Jarak lebih ringkas; judul, tombol dan navigasi tetap muat                                                                                                 |
| `/guru`                            | Kegiatan mengajar dan AI memiliki bobot tindakan yang bersaing                           | Satu tindakan utama **Mulai mengajar**, urutan empat langkah, sesi terakhir beserta tanggal; AI tambahan                                                   |
| `/guru/kelas`, detail kelas        | Form edit siswa berada setelah seluruh daftar; istilah rombel                            | **Nama kelas**, editor tepat di baris siswa, fokus langsung, Batal/Escape mengembalikan fokus                                                              |
| `/guru/soal`, editor               | Draft belum disimpan hilang saat navigasi; hapus soal langsung                           | Draft lokal dapat dipulihkan; hapus soal bisa dibatalkan; jenis yang terkunci dijelaskan; operand pecahan mengikuti aktivitas                              |
| `/guru/mulai`                      | Semua preview bertumpuk; tanggal baru dapat membuka sesi lama tanpa penjelasan           | Satu preview aktif; tanggal sesi lama ditampilkan; tanggal baru tidak dapat diedit saat melanjutkan sesi                                                   |
| `/guru/sesi/:id`                   | Isian koreksi pertama dapat mulai dari `?`; gagal simpan membingungkan                   | Koreksi memuat jawaban/review yang tersimpan; draft terpisah, batal memulihkan jawaban lama, gagal simpan menjaga isian; akhiri asesmen membuka hasil      |
| Preview enam alat                  | Kontrol pecahan dapat terdesak; area scroll bertumpuk; koordinat grafik melebar di HP    | Kontrol berada di atas model; halaman menjadi pemilik scroll vertikal; hanya model lebar bergulir horizontal; input koordinat muat 360px                   |
| `/guru/asesmen`, `/guru/hasil/:id` | Filter dan tabel dominan; rincian jauh dari siswa yang dipilih                           | Filter dibuka bila perlu; koreksi dekat ringkasan; rincian tepat di baris; **Soal untuk dibahas bersama** berdasarkan lembar yang diterima                 |
| `/guru/latihan`, `/guru/simulasi`  | Histori contoh bisa menghalangi mulai latihan; istilah langkah/kartu tidak konsisten     | Contoh terisi dan latihan baru tetap terpisah; lanjutkan sesi belum selesai; **Cek pertama**, **Cek lanjutan**, **Kartu cek akhir**, **Kegiatan kelompok** |
| `/layar`                           | Pengaturan tampilan/tes kemampuan mendahului kode sambungan; navigasi perlu ditahan      | QR/kode muncul langsung; tes perangkat opsional; menu dapat dibuka klik/Enter, tetap terbuka saat fokus dan ditutup Escape                                 |
| Konflik/sambungan                  | Satu konflik menghentikan antrean siswa lain; kegagalan503 tidak memakai salinan lokal   | Konflik tetap menunggu pilihan guru, siswa lain diteruskan; sesi/hasil memakai receipt;503/network dapat memakai cache scoped,401/403 tetap mengunci       |
| Bahasa untuk siswa                 | “model konteks disiapkan pada alat yang sesuai”                                          | “Tulis jawabanmu di buku. Ceritakan cara menghitungnya kepada teman.”                                                                                      |

### Evaluasi saran QA

`PapanNalar-Codex-Handoff.md` diperlakukan sebagai saran, dibandingkan dengan
HEAD; source auditnya menunjuk `c2a0593`, sedangkan build deployment live
tidak diketahui. Lampiran audit yang disebut dokumen tersebut tidak disertakan.
Tidak menyalin klaim live atau menjadikannya izin membuka gate AI.

| Temuan | Keputusan dan bukti lokal                                                                                                                                                                                                                                |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PN-01  | Diperbaiki: koreksi siswa pertama/tengah/terakhir memuat jawaban/review; cancel,503,finish, draft reload diuji FLOW02/FLOW08                                                                                                                             |
| PN-02  | Diperbaiki pada antrean per siswa, pilihan konflik, receipt/invalidation dan cache fallback. FLOW03/FLOW06 menguji503/403, dua siswa, serta edit baru saat respons lama sedang berjalan. Tidak mengklaim seluruh urutan race lintas-tab telah dibuktikan |
| PN-03  | Diperbaiki: tanggal lama/resume eksplisit; FLOW03                                                                                                                                                                                                        |
| PN-04  | Diperbaiki: editor/fokus inline siswa1/16/32; FLOW04                                                                                                                                                                                                     |
| PN-05  | Diadaptasi: satu tindakan mengajar dan petunjuk langkah. Route serta nama menu yang sudah dikenali dipertahankan; tidak mengganti seluruh navigasi tanpa kebutuhan                                                                                       |
| PN-06  | Diperbaiki: QR langsung, pengaturan/tes kemampuan opsional, profil belum diuji tetap belum terverifikasi; FLOW05 dan board-capabilities                                                                                                                  |
| PN-07  | Diperbaiki: satu preview, kontrol pecahan di atas,48px target dipertahankan, rasio satu-utuh tidak diperkecil; tes enam alat360px dan audit viewport                                                                                                     |
| PN-08  | Diperbaiki untuk mutasi sesi/editor utama: canMutate terpusat, kontrol dinonaktifkan dan preview tetap tersedia; FLOW07. Guard server tetap                                                                                                              |
| PN-09  | Diperbaiki pada review manual/scan: kosong belum diisi tidak berubah otomatis menjadi pilihan `?`; FLOW08. Kontrak penilaian lama tidak diubah                                                                                                           |
| PN-10  | Diperbaiki: draft scoped tersimpan, hapus bisa dibatalkan, cancel tambah kelas mempertahankan konteks; FLOW04/FLOW08 dan regresi latihan. Draft dengan revisi server berbeda dipertahankan dan diberi peringatan; belum ada alat merge dua draft soal    |
| PN-11  | Diadaptasi: tindakan koreksi dan bahas soal berada dekat hasil. Hitungan berasal dari jawaban diterima, tanpa label kemampuan/ranking baru                                                                                                               |
| PN-12  | Label UI diselaraskan dengan kartu10/5/3 baris; PDF dan frozen binding existing dipertahankan; cards/practice-v6/custom-card E2E                                                                                                                         |
| PN-13  | Filter memakai aria-pressed; navigasi board mendukung click/Enter/Escape/fokus. Screen reader/perangkat fisik tetap NOT_RUN                                                                                                                              |
| PN-14  | Jalur AI dibuat opsional dan manfaatnya dinyatakan. Adapter, review, privasi, anggaran, fallback statis dan konfigurasi server existing dipertahankan; tidak membuat reviewer atau bukti live                                                            |
| PN-15  | Alasan jenis terkunci dijelaskan dan operand kedua hanya muncul bila diperlukan. Konversi interaktif ke kartu tetap membutuhkan pilihan/kunci nyata                                                                                                      |

### Verifikasi kandidat

`pnpm verify` pada build `C8C81ckj1RWA6ZfXk6iSI` selesai **exit1**:
format/types/lint lulus; **1095 unit dalam72 file** lulus, coverage
statement92,48%, branch87,52%, function96,28%, line93,46%; **306 assertion SQL
+116 guard yang dilaporkan runner** lulus; **9 integrasi native HTTP dengan
PostgreSQL** lulus; build lulus. Browser **147 PASS/8 FAIL**,21menit,
1worker/retry0/skip0. Run ini tetap dicatat gagal.

Kegagalan tersebut mencakup dua label pembuka lama, tiga ekspektasi wizard
otomatis, dua locator status yang ambigu sebelum redirect, dan helper
navigasi yang menutup menu yang sudah terbuka. Audit juga menemukan bahwa
pointer background dapat membuka menu sebelum klik tombol menutupnya lagi.
Perbaikan mempertahankan pemeriksaan data, privasi, screenshot bounds dan
konsol; tidak memperbesar timeout, menambah retry atau melemahkan assertion.

Gate serial setelah perbaikan **45/45 E2E PASS, exit0**, build
`in2LtgftI23FrF8ZeWoHb`,303,73detik termasuk format/types/lint/build:

```bash
pnpm format:check && pnpm typecheck && pnpm lint && pnpm build && pnpm exec playwright test tests/e2e/workflow-v7.spec.ts tests/e2e/board-content.spec.ts tests/e2e/opening-reflection.spec.ts tests/e2e/prelim.spec.ts tests/e2e/video-library.spec.ts tests/e2e/video-display.spec.ts tests/e2e/sync.spec.ts
```

Semua delapan kasus gagal full-run ada di gate45 yang lulus. Regresi mencakup
kartu buatan guru, reuse lintas kelas, histori kunci, PDF/pixel scan, sync,
conflict, cache, draft, pairing, enam alat dan navigasi keyboard/pointer.

Audit gambar merapikan empat langkah beranda menjadi2×2 di HP dan mengganti
dua kalimat “rombel”. Build terakhir **`2YNhqi0po4Ou62cg8yXZC`**, format/types/
lint/build lulus. Regresi layout17 memberi15PASS/2FAIL: tes lama menganggap
beranda selalu memakai7B, padahal riwayat terakhir memakai7C. Tes kini
memeriksa kelas yang benar-benar ditautkan beranda, lalu memilih7B secara
eksplisit untuk skenario penyimpanan draft. Aplikasi tidak diubah untuk
menghapus atau memaksa riwayat contoh.

Perbaikan tes tersebut diuji **2/2 PASS, exit0**,52,25detik, pada build yang
sama. Hanya file tes berubah setelah build; format/types/lint juga lulus:

```bash
pnpm format:check && pnpm typecheck && pnpm lint && pnpm exec playwright test tests/e2e/teacher-flow-v4.spec.ts -g 'FLOW01 beginner'
```

**155 skenario unik memiliki hasil PASS setelah perbaikan terkait**, lintas
full-run dan regresi. Tidak diklaim full155/155 dijalankan pada satu build
terakhir. Unit/SQL/native yang sudah lulus dan tidak berubah tidak diulang.
595 input kandidat memiliki hash
`fe87487e0d244ea6eb2b149483127598ba3b853bf6c0cc67f4dcec804a067fae`;
580 identik terhadap full-run,592 identik terhadap gate45. Tiga perbedaan
terakhir hanya CSS beranda, dua kalimat kelas, dan setup tes kelas terakhir.

Audit visual akhir: **108 capture/state**,13 jenis halaman. Halaman utama
diperiksa pada360/390/768/1188/1366/1920px; enam preview alat pada360/390/600/
768/900px, termasuk pecahan penyebut12; teks20px dan menu papan juga diperiksa.
**Overflow halaman0, pageerror0**. Runner menunggu alat dan form siap; gambar
yang masih menampilkan loading tidak dipakai sebagai bukti akhir. Board
loopback memang hanya menampilkan kode; QR HTTPS diperiksa oleh E2E dengan
challenge fixture yang eksplisit, bukan klaim TLS/kamera live. Gambar
representatif diperiksa secara visual. Full-page capture dapat menempatkan
navigasi fixed/skiplink di tengah gambar; kondisi viewport diuji terpisah.

Tabel sebelum/sesudah berdasarkan source yang dibandingkan dan pemeriksaan
browser. Screenshot baseline hanya beranda dan error mulai pada390px;
screenshot sesudah serta log lengkap tersimpan lokal dan tidak di-commit.
Tidak membuat gambar “sebelum” untuk halaman yang belum ditangkap.

Preservation **PASS**:183file terlindungi,40migration existing,8dokumen asli,
19receipt lama, prefix jurnal dan tail handoff tetap identik. Bundle receipt
lama dipulihkan persis; ukuran kandidat disimpan dalam receipt baru. Three
opsional **154310byte gzip**, di bawah250000, terpisah dari precache; poster
cached. Bukti terstruktur: [workflow-v7.json](artifacts/qa/ui-ai-v2/workflow-v7.json).

### Batas hasil, biaya dan menjalankan aplikasi

Tidak ada dependency, lockfile, aset atau migrasi baru. GLB/poster/Blender
existing tetap dimuat terpisah; matematika, penilaian, kartu, auth/RLS dan
histori dijaga. Tidak ada API berbayar (USD0); biaya compute lingkungan tidak
diukur. OpenAI-compatible Chat Completions dan Anthropic-compatible Messages
diperiksa melalui native HTTP fixture dan ledger/RLS PostgreSQL lokal;
provider live NOT_RUN.

Pengujian ini membuktikan perilaku software pada lingkungan lokal. Studi guru
pemula, kelas nyata, kamera/QR HTTPS, sentuh fisik dan printer tetap NOT_RUN.
Persyaratan credential, review materi/privasi serta rollout SQL040 existing
sudah tercatat pada bagian **Kebutuhan operator/perangkat** di handoff V6;
tidak diminta ulang dan tidak dianggap sudah terpenuhi. Run ini tidak deploy,
menjalankan migrasi hosted, atau membuka gate AI/review.

```bash
cd /workspace/papannalar
source /workspace/.papannalar-cloud/activate.sh
pnpm build
pnpm video
```

Buka `http://127.0.0.1:3100/masuk`; gunakan tab lain untuk `/layar`.
`pnpm video` memakai Auth/transport fixture loopback54325 serta PostgreSQL
lokal55432. LLM dinonaktifkan oleh konfigurasi lingkungan; saran statis tetap
tersedia. Pada checkout lain gunakan Node24.14.1/pnpm11.19.0,
`pnpm install --frozen-lockfile`, lalu ikuti [setup lokal](docs/09_LOCAL_HANDOFF.md).

<!-- END WORKFLOW_V7 -->
<!-- BEGIN PRACTICE_V6 -->

## Alur guru, soal sendiri, cetak kartu dan reset papan — 3 Oktober 2026

Baseline `c2a0593`. Perubahan terbaru pengguna dikerjakan pada aplikasi existing;
M00–M17, jurnal lama, data dan aset dipertahankan. Commit aplikasi
[1cbe5a8](https://github.com/IndraYuda13/papannalar/commit/1cbe5a8d5fa41adeb969252e224a4a238e6d1acd)
berhasil dipush fast-forward dari `c2a0593` ke `main`, exit0; SHA remote sama
dengan lokal dan working tree bersih sebelum catatan publikasi ini. Pembaruan
publikasi berikut hanya tiga file dokumentasi/evidence; source dan build tetap.
Tidak membuat PR atau menjalankan deployment. CI sesudah push belum diperiksa.
Bagian setelah marker END PRACTICE_V6 adalah historis.

| Halaman/bagian                | Sebelum                                                                   | Sesudah                                                                                                                                                                       |
| ----------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/guru/latihan`               | Memilih jenis paket, AI dan banyak alat sebelum tahu langkah berikutnya   | **Kelas → Soal → Mengajar**. **Siapkan soal**, lalu **Mulai mengajar** satu klik; AI opsional                                                                                 |
| Kelas/alat tambahan           | Daftar kelas, cek lisan, kartu dan pengaturan menambah panjang alur utama | Kelas terpilih tampil; **Ganti kelas** dan **Alat & pengaturan tambahan** dibuka sesuai kebutuhan. Peringatan kehilangan/sinkronisasi data tetap langsung terlihat            |
| Topik pembuka                 | Dropdown tidak dapat diubah setelah soal terikat sesi                     | Bisa diubah; transaksi membuat salinan persiapan baru dan menjaga soal/jawaban sesi lama                                                                                      |
| Tentang materi ini            | Hanya peringatan materi belum diperiksa                                   | Tiga pemeriksaan persiapan guru tersimpan lokal; reset bila isi berubah. Tidak mengubah status review atau kelayakan AI/pilot                                                 |
| Bantuan AI                    | Panduan endpoint/kunci server berada pada UI guru                         | Panduan pengelola dihapus dari UI. Cerita dan saran tetap opsional dengan hasil yang dijelaskan                                                                               |
| `/guru/soal/baru` dan editor  | Simpan siap tetap berada di editor                                        | Setelah penyimpanan sukses, kembali ke **Soal Saya** dengan pemberitahuan. Draft/gagal simpan tetap terbuka, isian utuh                                                       |
| `/guru/mulai?mode=assessment` | Sumber bawaan menyembunyikan soal buatan sendiri                          | Soal sendiri dan siap pakai tersedia dalam satu pilihan; alasan draft/interaktif belum tersedia dijelaskan. Pertanyaan interaktif bisa disalin untuk dilengkapi pilihan/kunci |
| Cetak                         | Guru harus mencari alat dan menentukan jenis kartu sendiri                | Tombol pada persiapan/sesi mengikuti cek 10/5 baris; cek akhir 3 baris; cek lisan tanpa kartu. **Cetak kartu asesmen** tetap terikat ke 1–5 soal buatan guru                  |
| `/layar`                      | Board dapat tersangkut pada grant/sesi lama                               | **Menu papan → Reset sesi di papan** mencabut sambungan/kode board sendiri dan membuat kode baru; histori guru tetap ada                                                      |
| Offline                       | Membuka pengaturan dapat memicu prefetch `/guru/kelas`                    | Link tugas cloud tidak memuat RSC di latar; soal/jawaban lokal tetap tersedia                                                                                                 |

Untuk soal sendiri: **Soal & Presentasi → Buat kumpulan soal → Simpan & siap
digunakan → Soal Saya**. Untuk asesmen, pilih kumpulan **Kartu Nalar** yang siap
pada **Asesmen & Hasil → Buat asesmen**. Soal interaktif tetap dapat dipakai
untuk mengajar; asesmen A/B/C/D membutuhkan empat pilihan serta kunci.
**Soal saya belum muncul?** menyediakan langkah memperbaiki draft atau membuat
salinan kartu. Kumpulan asli dan asesmen/sesi sebelumnya dipertahankan.

Untuk latihan contoh: **Coba dengan data contoh → Buka latihan & AI → pilih
kelas → Siapkan soal → unduh kartu bila perlu → Mulai mengajar → sambungkan
layar**. **Lanjutkan sesi** memakai sesi berjalan. AI tidak diperlukan untuk
memulai. [Panduan guru dan cetak kartu](docs/13_GUIDE_LATIHAN_AI.md).

Kartu adalah lembar jawaban; pertanyaan ditampilkan guru. Unduh PDF dari
persiapan/sesi atau **Cetak kartu asesmen**, cetak **A4, 100%/ukuran asli,
hitam putih**, potong dan bagikan satu per siswa. Cek pertama dua kartu per
lembar; cek lanjutan/akhir dan asesmen buatan sendiri empat. Untuk 32 siswa,
cek pertama 16 lembar; asesmen buatan sendiri delapan. PDF tugas mandiri
berisi soal dan memiliki tombol tersendiri.

### Bukti lokal dan batas hasil

`VITEST_MAX_WORKERS=1 pnpm verify` meluluskan format/types/lint, **1094 unit/72
file** (coverage statement92,48%, branch87,52%, function96,28%, line93,46%),
**306 assertion SQL/RLS + 116 guard SQL yang dilaporkan runner**, **9 integrasi
native HTTP + PostgreSQL**, serta build `3TvfUjUWe6ispWe_i65K2`. Browser lengkap
memberi **143 PASS/4 FAIL**, 20m21,153s, 1 worker/retry0/skip0; command exit1.
Riwayat ini tetap FAIL. Attempt sebelumnya dihentikan exit130 saat unit untuk
memperbaiki lima kalimat langkah yang sudah usang; bukan full PASS.

Dua kegagalan adalah ekspektasi tes: panel `teacher-extras` perlu masuk
allowlist identitas/mode yang terbatas; grant yang ditutup memang mengembalikan
FORBIDDEN pada snapshot/heartbeat/channel/ACK. Status403, isi error, pesan
sambungan berakhir serta konsol tanpa error lain tetap diperiksa. Promise
assertion ditampung sampai pemeriksaan akhir, sehingga tidak menjadi rejection
tak tertangani. Batas jumlah/jenis storage, HttpOnly, logout, RLS dan privasi
tidak dilemahkan.

Dua kegagalan offline direproduksi. Diagnostic aman merekam metode/path/error
saja; keduanya menunjuk prefetch GET `/guru/kelas` saat drawer dibuka. Link ini
serta dua pintu masuk `/guru/mulai` memakai `prefetch={false}` sesuai dokumentasi
Next16.3.6. Reload/penyimpanan offline diuji kembali dengan assertion konsol nol.

Gate serial sesudah perbaikan **PASS, exit0**: format/types/lint/build
`RQ1nEXwZvQDcxTfNo93tJ` dan **44/44 E2E**, 4,7 menit, 1 worker/retry0:

```bash
pnpm format:check && pnpm typecheck && pnpm lint && pnpm build && pnpm exec playwright test tests/e2e/auth-ownership.spec.ts tests/e2e/freshclass.spec.ts tests/e2e/oral.spec.ts tests/e2e/package.spec.ts tests/e2e/offline.spec.ts tests/e2e/privacy-storage.spec.ts tests/e2e/practice-v5.spec.ts tests/e2e/practice-v6.spec.ts tests/e2e/teacher-flow-v4.spec.ts tests/e2e/sync.spec.ts --reporter=list
```

Audit gambar terakhir menyederhanakan satu pesan konfirmasi menjadi “Latihan
tersimpan di perangkat ini.”, tanpa instruksi posisi/tindakan yang berulang.
**589/590 input tetap identik** terhadap gate44; satu perubahan hanya literal
pada `package-workspace.tsx`. Final gate serial kandidat
**`ITd3O0CNAChqrrInootDA`, PASS exit0**: format/types/lint/build dan **3/3 E2E**
24,9s, cek penyimpanan/reload offline serta mulai satu klik/copy histori pada
360/390px:

```bash
pnpm format:check && pnpm typecheck && pnpm lint && pnpm build && pnpm exec playwright test tests/e2e/package.spec.ts tests/e2e/practice-v6.spec.ts -g 'EASY01|teacher prepares and replaces' --reporter=list
```

Semua **147 skenario unik tercakup lintas full-run dan regresi**: empat kasus
gagal sebelumnya ada dalam gate44 yang lulus. Tidak diklaim full147/147 PASS
pada kandidat terakhir; receipt memisahkan tiap command/build/hasil.

Hash final **4172efa3fa27d35ca0130be2112029005589b84c48f038c0b5893ab1e3ea13b5**, 590 input. Terhadap full verify, **583 input
identik**; perubahan hanya dua komponen Link, satu pesan konfirmasi dan empat
file tes browser.
Matematika, generator, copy/checklist/reset, provider, ledger, auth dan SQL yang
sudah lulus tetap identik. Final gate meliputi semua empat kasus gagal dan
regresi alur/AI, authoring, cetak, offline, tenant, reset, sync serta privasi;
tidak menduplikasi full unit/SQL/native/full147 yang sudah tercakup verify.

Audit produksi akhir pada kandidat `ITd3O0CNAChqrrInootDA`: **15 capture/state**
di 360/390/1366px dan font20px, **overflow horizontal0/pageerror0**. Gambar
persiapan, soal sendiri/list/asesmen dan reset diperiksa. Dua PDF asli diunduh
dan diekstrak `pdftotext`; kartu awal berisi Cek Awal, kartu asesmen buatan guru
memiliki baris tidak dipakai yang dikosongkan. Pencetakan fisik NOT_RUN.
Screenshot sintetis lokal tidak di-commit. Full-page capture dapat menempatkan
elemen fixed di tengah gambar; skiplink pada viewport390 sebenarnya tersembunyi
sebelum fokus. Tidak mengubah aksesibilitas karena artefak capture.

Aset/dependency/lockfile tidak ditambah. GLB/poster/Blender existing tetap;
Three terpisah dan opsional, **154310 byte gzip**, di bawah batas250000 dan tidak
masuk precache offline; poster tetap dicache. Paid API **USD0**, biaya cloud
bukan hasil pengukuran. OpenAI-compatible Chat Completions dan
Anthropic-compatible Messages diuji pada native HTTP fixture + ledger/RLS
PostgreSQL lokal, **bukan provider live**. Model aplikasi tetap konfigurabel;
model coding bukan default aplikasi.

Preservation: **181 file domain/keamanan/aset**, **39 migration existing**, **8 dokumen asli**, **18 receipt lama**, prefix jurnal dan tail handoff lama **identik/PASS**. Perubahan core hanya helper copy persiapan dan
transaksi repository tambahan; penilaian, replay, frozen binding dan data lama
utuh. Bukti [practice-v6.json](artifacts/qa/ui-ai-v2/practice-v6.json).

### Kebutuhan operator/perangkat (dicatat sekali untuk run ini)

Untuk live AI, operator perlu `LLM_ENABLED`, `LLM_GATEWAY_TOKEN` dan profil
server lengkap: `AI_PROTOCOL`, `AI_API_BASE_URL`, `AI_ALLOWED_ORIGINS`,
`AI_API_KEY`, `AI_MODEL`, `AI_PROFILE_ID`, `AI_CONFIG_VERSION`, batas
`AI_MAX_INPUT_TOKENS`/`AI_MAX_OUTPUT_TOKENS` serta auth/JSON mode yang sesuai
provider. DB harus memiliki profil harga/anggaran yang cocok, review konten
sesuai hash dan review privasi teks bebas. Tidak ada binding credential live dalam lingkungan
ini; konfigurasi valid tidak menjadi bukti sukses provider. Review pedagogi,
studi guru, QR HTTPS/kamera HP, sentuh fisik dan pencetakan printer **NOT_RUN**.
Checklist persiapan lokal tidak mengesahkan materi; katalog otomatis masih
memerlukan pemeriksaan isi/uji kelas untuk penggunaan sungguhan.

SQL040 **hanya dijalankan pada DB loopback55432**, tidak pada hosted. Untuk
rilis reset papan, operator perlu menerapkan
[`202610030040_board_reset.sql`](supabase/migrations/202610030040_board_reset.sql)
melalui rollout yang berizin setelah backup `presentations/pairings/remote_tools`
dan review RLS. Rollback: cabut grant aktif lalu pulihkan
`presentation_action_before_board_reset` sebagai `presentation_action`, pertahankan
receipt reset sampai retry kedaluwarsa. Reset menyimpan UUID permintaan lokal,
menutup watcher/ACK serta RAM board, lalu menunggu internet sebelum resume/kode
baru. Retry respons hilang idempotent dan tidak mencabut sambungan baru. Bila
browser menolak localStorage, reset masih bekerja dalam RAM tetapi intent
offline tidak bertahan melewati reload. Sesi/hasil guru tidak dihapus.
Deployment/hosted migration/paid API tidak dijalankan; CI setelah push belum
diperiksa.

### Jalankan kandidat ini

```bash
cd /workspace/papannalar
source /workspace/.papannalar-cloud/activate.sh
pnpm build
pnpm video
```

Buka `http://127.0.0.1:3100/masuk` dan `/layar` di tab lain. `pnpm video` memakai
Auth/transport fixture loopback54325 dan PostgreSQL lokal55432; LLM dinonaktifkan
oleh activation, kartu saran statis tetap dapat dicoba. Ctrl+C menghentikan demo.
Pada checkout lain, `pnpm install --frozen-lockfile` dengan Node24.14.1/pnpm11.19.0;
ikuti [setup lokal](docs/09_LOCAL_HANDOFF.md) dan [VIDEO_HANDOFF](VIDEO_HANDOFF.md).

<!-- END PRACTICE_V6 -->
<!-- BEGIN PRACTICE_V5 -->

## Alur latihan, cerita AI dan sambungan layar — 3 Oktober 2026 (WIB)

Permintaan terbaru pengguna: perbaiki manfaat AI, bahasa, alur latihan dan
penyambungan kode yang benar, lalu commit/push. Baseline `8df9357`. Implementasi
software dan verifikasi lokal selesai. Commit implementasi
[f636a09](https://github.com/IndraYuda13/papannalar/commit/f636a09268e95952dcd44f597a6a3c1bbc78ec51)
berhasil dipush fast-forward ke `main`; SHA remote cocok dengan lokal. CI sesudah
push belum diperiksa; tidak ada deployment. Catatan publikasi berikut hanya
dokumentasi, tanpa perubahan aplikasi. Bagian setelah marker ini historis.

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
