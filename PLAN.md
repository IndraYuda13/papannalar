# PLAN - Eksekusi Codex PapanNalar

<!-- BEGIN PN_UI_AI_V2 -->
## Antrean tambahan UI/AI - bukan pengganti histori M00-M17

Rencana rinci: [U0-U5 dan QA](docs/13_EXECUTION_QA.md). Status implementasi cloud 2 Oktober 2026:

| Batch | Scope | Status | Bukti |
| --- | --- | --- | --- |
| U0 | Cocokkan HEAD, update dokumen dan route inventory | DONE | HEAD efcdd36; dry run/apply 9 addendum, backup; 15 route baseline |
| U1 | Shared UI dan seluruh halaman guru | DONE | Walkthrough 360/390/1366, editor/preview, empty/error/retry; screenshot before/after |
| U2 | Board, motion, aset 3D dan fallback | DONE | 3 GLB render nyata, poster/no-WebGL/save-data; 3D dikecualikan dari precache |
| U3 | Konektor OpenAI/Anthropic dan konfigurasi | DONE LOCAL | 35 contract/HTTP fixtures + diagnostic default tanpa call |
| U4 | Ledger/RPC/policy dan integrasi routes | DONE LOCAL | Migration038 di PostgreSQL terisolasi; SQL v1/v2 + 7 route/ledger/concurrency tests |
| U5 | Final verification dan handoff | DONE LOCAL | pnpm verify exit0: 1086 unit, 7 integrasi, SQL/RLS dan 122 browser; walkthrough produksi15/15 |

Live AI, hosted Supabase/Auth/Realtime/HTTPS serta perangkat native tetap
EXTERNAL_BLOCKED/NOT_RUN; konfigurasi/review/budget bukan approval live.
Hasil akhir dan batas bukti: [UI_AI_HANDOFF.md](UI_AI_HANDOFF.md).
<!-- END PN_UI_AI_V2 -->

Versi 1.0 | Disusun 29 September 2026
Status terkini (2 Oktober 2026): kode dipublikasikan ke GitHub main; UI/UX polish
P1–P3 DONE software lokal sesuai prompt
pengguna `E:/ASUS/Downloads/PapanNalar_UI_UX_Polish_Prompt.md` dan jawaban
“Jalankan perubahan di repo”. V1–V6 Video Ready DONE software lokal sesuai
`PapanNalar_Video_Ready_Codex.md`; menggantikan prioritas corrective pass lama.
Baseline M00–M17 dipertahankan; M00–M11 DONE sesuai batas evidence.
M12-a DONE, M12-b NOT_RUN, audit M12-c selesai dengan gate eksternal terbuka.
M13-a/b/c DONE software; live/konten/privasi AI tetap gate eksternal.
M14-a/b/c dan M15-a/b/c DONE software; M16 DEFERRED (opsional).
M17-a/b DONE software lokal pada baseline sebelumnya; sekarang server rekaman3100 aktif.
Gate fisik, live dan manusia
tetap NOT_RUN/NEEDS_REVIEW; tidak menghalangi pekerjaan software independen.

## 1. Cara memakai paket

### Video Ready — checklist aktif (instruksi 30 September)

- [x] V1: empat route guru, akun contoh tunggal persisten, layout/microcopy.
- [x] V2: profil/preset, auto-next sentuh, QR, lease dan reconnect (hosted/perangkat NOT_RUN).
- [x] V3: koleksi sistem/guru lintas kelas, editor kartu/interaktif dan versi.
- [x] V4: sesi terikat versi/roster, PDF/OMR, revisi dan hasil database.
- [x] V5: koreksi konten relevan, chooser offline, scanner dan recovery.
- [x] V6: U01–U16 lokal, viewport, satu full verify + perbaikan terarah, VIDEO_HANDOFF.

Delta scope disetujui melalui dokumen pengguna: authoring dan rekap baru,
akun contoh di `/guru`, ukuran responsif/preset menggantikan batas UX lama.
Database/migration/lockfile dipegang integrator. Worker terpisah menangani
layar, koneksi dan konten dengan path ownership terpisah. Targeted tests per
batch; hasil baseline 778/340/76 bukan bukti perubahan baru.
Hosted origin HTTPS/kredensial Supabase dan perangkat fisik belum tersedia;
implementasi serta SQL lokal tetap dilanjutkan, tidak membuka provider uji ke
production. Checkpoint aktual: SQL033/035/036 diterapkan hanya pada PostgreSQL
uji loopback55432. Seed persisten berhasil: 7B/7C masing-masing32, dua koleksi
sistem, dua guru, dua hasil historis sintetis, satu asesmen kosong. Dua defect
SQL (tuple empat opsi dan alias penilaian) diperbaiki dengan migration baru.
Targeted `vitest video-library/sync/llm-enrichment`: 38 PASS; `library.sql`:
23 assertion PASS. Run awal unit gagal alias import, diperbaiki sebelum PASS.
Worker display:33 unit PASS; konten:93 targeted PASS; kedua kegagalan hydration
konten telah ditutup oleh targeted sync/enrichment di atas. Tidak ada hasil
browser pada checkpoint lama. Update V6: SQL034/037 telah diterapkan setelah
backup lokal; 15 assertion koneksi/logout/lease PASS. Display:39 unit/4 file,
14 browser PASS (zero pageerrors); koneksi:73 unit/8 file PASS. Scanner:55 unit
custom-form +16 OMR terpilih PASS; worker dibangun ulang. Unit progress/CSV:19 PASS.
Browser dengan PostgreSQL nyata: akun contoh persisten, isolasi guru/board/visitor,
scan piksel custom, resume soal3/model tersimpan dan revoke/logout PASS. Checkbox
hadir diperbaiki dengan respons langsung, rollback gagal dan status commit lokal.
Selector tes memakai accessible role; form tidak kehilangan isi saat preview.
Reset operator salah target/konfirmasi/sesi aktif ditolak; fingerprint data tetap.
Tidak ada reset sukses terhadap data rekaman. Format/typecheck preflight PASS.
Penutupan V6: full `pnpm verify` sekali exit1 pada browser (66 PASS/36 FAIL),
sedangkan format/typecheck/lint, 1001 unit/65 file, 378 SQL dan build PASS.
Perbaikan terarah menutup seluruh failure: 102 skenario unik memiliki hasil terakhir
PASS; bukan klaim satu run102 baru. Kandidat terakhir26 PASS, smoke server berjalan
7 PASS. Regresi auth/clock56 unit/5 file PASS (16 tes baru). Build/typecheck/lint
terakhir PASS. Evidence `artifacts/qa/video-ready/final-evidence.json` dan jurnal9.49.
Server Video Ready lama37723 telah diganti oleh kandidat polish terkelola95752;
hasil dan validasi terkini pada jurnal9.51. Dataset rekaman persisten dipertahankan.
Next exact: rekam dua jendela dengan `VIDEO_HANDOFF.md`; untuk HP-papan fisik,
siapkan origin HTTPS/target Supabase yang diotorisasi dan matriks perangkat M12-b.
Tidak ada TRUE BLOCKER coding. Hosted, native QR dan hardware tetap NOT_RUN.

Letakkan AGENTS.md dan PLAN.md di root repo, serta folder docs di root yang sama.
Delapan sumber bernama 00-07 adalah salinan utuh unggahan pengguna. Semua kontrak
rekayasa dan gap ada di [08_TECH_SPEC.md](docs/08_TECH_SPEC.md); aturan kerja ada
di [AGENTS.md](AGENTS.md). Jangan meminta Codex menulis ulang PRD dari nol.

```text
repo/
  AGENTS.md
  PLAN.md
  docs/
    00_RINGKASAN_RUBRIK.md
    01_PRD.md
    02_DESAIN_PEMBELAJARAN.md
    03_KATALOG_MATERI.md
    04_BRAND_DESAIN.md
    05_UX_LAYAR.md
    06_RENCANA_BISNIS.md
    07_BUILD_QA_PITCH.md
    08_TECH_SPEC.md
```

Tidak ada ketergantungan pada STATUS.md. Status, keputusan dan hasil validasi
dicatat dalam file ini. Nomor M00-M17 adalah **18 milestone baru**, bukan 17 langkah
lama yang dirujuk sumber tetapi tidak diunggah. Subtask a/b/c menjadi batas satu
run Codex: kerjakan, validasi, simpan handoff, lalu berhenti.

## 2. Status kerja hidup

Ubah status hanya berdasarkan pekerjaan yang benar-benar dilakukan.

| Field | Nilai terkini |
| --- | --- |
| Milestone aktif | UI/UX polish P1–P3 DONE software lokal; Video Ready V1–V6 dan baseline dipertahankan |
| Task aktif | Publikasi GitHub main selesai; berikutnya periksa CI/walkthrough rekaman |
| Commit aplikasi terakhir | GitHub main `e10e27e478d5f3154e6c8bbd92b8a06e0e4ed15b` (aplikasi); base dokumen lokal tetap dipertahankan |
| Repository diperiksa | Ya, 29 Sep 2026; satu Next app di root, pnpm-lock.yaml; perubahan baseline terdahulu dipertahankan |
| Package manager / versi runtime | Node 24.14.1 + pnpm 11.19.0 dipin pada .node-version/package.json; lockfile tersedia. Launcher pnpm alat memakai Node 24.19.0, child app tetap 24.14.1 |
| Dependency baseline | Next 16.3.6, React 19.3.0, TypeScript 5.9.3 strict; versi lengkap, kompatibilitas dan lisensi di bagian 9.2 |
| Tes aplikasi | Polish:1039 unit/68 file PASS; format/typecheck/lint, SQL/RLS dan build PASS;31/31 browser repair PASS,112 skenario unik hasil terakhir PASS melalui full+repair. Full verify sekali exit1 awal, bukan klaim satu full run112 PASS; evidence/jurnal9.51 |
| Target rilis | Video Ready software lokal pada aplikasi utama; pilot/final fisik belum disetujui |
| Kesiapan demo awal | Runnable dengan pnpm demo: 29 seed + 3 scan piksel → replay/displayed placement → 7/13/12 → pairing/board → Garis Bilangan. Kartu/HP fisik dan provider live NOT_RUN |
| Gate pilot/final | Review pedagogi/konten, cakupan K01, privasi Bisik bebas, lokasi/izin, perangkat dan jadwal tetap terbuka; rincian audit di bagian 9.1 |
| TRUE BLOCKER saat handoff | Tidak ada untuk implementasi berikutnya. Gate fisik/live/pedagogi tetap terbuka, tidak dinaikkan menjadi blocker coding |
| Aksi berikutnya | Rekaman lokal sesuai VIDEO_HANDOFF; origin HTTPS/target hosted yang sah dan uji perangkat M12-b untuk rekaman HP-papan fisik |

Status task: NOT_STARTED, IN_PROGRESS, BLOCKED, DONE. Status tes: PASS, FAIL,
NOT_RUN, NOT_IMPLEMENTED. Blocker perangkat bukan kegagalan kode, tetapi juga
bukan bukti lulus uji perangkat.

| Milestone | Status | Kemampuan yang dibuka |
| --- | --- | --- |
| M00 | DONE | Audit dan baseline versi/keputusan bootstrap selesai |
| M01 | DONE | Shell/storage, auth/kelas/roster dan RLS selesai; 69 unit + 34 SQL + 20 browser lulus. Auth provider penuh tetap NOT_RUN (environment gap) |
| M02 | DONE | Registry, matematika eksak, BKT, placement/replay dan grouping deterministik |
| M03 | DONE | PDF, OMR lokal, respons durable, koreksi dan replay; foto fisik NOT_RUN |
| M04 | DONE | Rantai HP, papan, Garis Bilangan |
| M05 | DONE | PRELIM lokal tervalidasi dengan input sintetis; batas fisik/live eksplisit |
| M06 | DONE | Paket offline/preview/cache, 22 template draft, 23 Bisik statis, CSV lokal dan cetak mandiri |
| M07 | DONE | Cek lisan offline dan regresi lifecycle placement |
| M08 | DONE | Rotasi, waktu, actual-start giliran, simulasi dan preview hold aman |
| M09 | DONE | Empat alat interaktif dan tujuh pola dengan batas perangkat eksplisit |
| M10 | DONE | Siklus kelas baru tanpa seed, binding exit, penutupan/finalisasi dan sesi berikutnya |
| M11 | DONE | Ketahanan offline, sinkronisasi, recovery dan update aman; batas eviction total tetap eksplisit |
| M12 | IN_PROGRESS | M12-a DONE; M12-b NOT_RUN; M12-c audit selesai, gate pilot belum lulus |
| M13 | IN_PROGRESS | a/b/c software DONE; live AI, credential/budget/review NOT_RUN/NEEDS_REVIEW, default disabled |
| M14 | DONE | Enam alat dan sepuluh mode software; gate kelas/hardware terbuka, audit F4 menyeluruh M15 |
| M15 | DONE software | Audit13 fitur, clean install/migration, full verify dan manifest; FINAL FILES/pilot eksternal belum lulus |
| M16 | DEFERRED | F9-F13 opsional; tidak diperlukan FINAL MVP, audit/exit/cetak minimum tetap ada |
| M17 | DONE software | Tiga gladi lokal PASS, rollback/aset/manifest; freeze29/10, panggung31/10 dan cadangan fisik tetap NOT_RUN |

## 3. Urutan dan kalender

Dasar tanggal: [Build, QA, dan Pitch](docs/07_BUILD_QA_PITCH.md), bagian Rencana
build. Tanggal belum dikonfirmasi ulang ke panitia. Ini target sumber, bukan
jaminan durasi pengerjaan Codex atau perkiraan jam kerja tim.

```text
M00 -> M01 -> M02 -> M03 -> M04 -> M05 [PRELIM]
  -> M06 -> M07 -> M08 -> M09 -> M10 -> M11 -> M12 [PILOT READY]
  -> M13 -> M14 -> M15 [FINAL FILES] -> M16 (opsional) -> M17 [FINAL DEMO]
```

Urutan di atas adalah default aman. Penulisan dan review konten, perizinan pilot,
serta persiapan perangkat dapat dikerjakan manusia sejak M00. M11 bukan alasan
menunda penyimpanan aman dan privasi: keduanya sudah wajib sejak M01.

| Tanggal sumber | Gate plan baru | Batas klaim |
| --- | --- | --- |
| 1 Oktober 2026 | M05 | Slice berjalan; bagian lain diberi label desain |
| 10 Oktober 2026 | Check kemajuan M06-M09 dan scanner | Nilai progres aktual, bukan menyamakan nomor dengan langkah lama |
| 16 Oktober 2026 | M12 | Kelas baru 7B, Bisik statis, perangkat dan izin siap |
| 19-23 Oktober 2026 | Uji kelas | Guru menjalankan 1-2 sesi; tidak mengklaim dampak belajar |
| 24-25 Oktober 2026 | M15 | Semua 13 fitur wajib lulus atau kekurangannya ditulis |
| 26-28 Oktober 2026 | Buffer wajib / M16 | Tidak boleh mengaku fitur sudah jadi pada 25 Oktober |
| 29 Oktober 2026 | M17-a | Freeze; hanya perbaikan blocker |
| 31 Oktober 2026 | M17-b | Tiga gladi berhasil dan cadangan siap |

Jika tertinggal, tunda M16/F9-F13 dahulu. Jangan diam-diam memotong F1-F8 atau
F16-F20. K01 tentang 22 anak tangga versus enam alat tetap harus diputuskan sebelum
mengklaim semua jenjang lengkap. Lokasi pilot Bandung/Samarinda belum dipilih.

## 4. Milestone dan task

### M00 - Audit repo, sumber dan gap

**Dependensi:** Tidak ada.  
**Area file:** PLAN.md; TECH_SPEC hanya untuk keputusan atau koreksi yang dicatat.

- **M00-a:** **DONE (29 Sep 2026; evidence bagian 9.1).** Periksa git status, AGENTS yang sudah ada, package.json, lockfile, struktur kode, tes, migration dan env example. Pastikan delapan sumber tersedia dan tidak berubah.
- **M00-b:** **DONE (29 Sep 2026; evidence bagian 9.2).** Isi baseline bagian 2. Pisahkan gap yang memblokir slice dari gap pilot/final. Tetapkan package manager dan versi stabil yang kompatibel berdasarkan dokumentasi aktual. Jangan mengarang persetujuan untuk perubahan pedagogi atau privasi.

**Acceptance:** Baseline repo nyata tercatat, ada satu next task yang jelas, dan tidak ada scaffold yang menimpa pekerjaan pengguna. Milestone ini boleh selesai meskipun blocker pilot yang independen masih terbuka.

**Validasi:** Inventaris file, hash sumber, link lokal dan pemeriksaan versi/dokumentasi. Belum ada klaim tes aplikasi.

**Kemampuan dibuka:** Belum ada aplikasi; fondasi keputusan siap.

### M01 - Fondasi Next.js, kontrak, autentikasi dan storage

**Dependensi:** M00.  
**Area file:** Konfigurasi/lockfile, src/app, src/contracts, src/local, src/server/auth, supabase/migrations, CI dan tests/integration.

- **M01-a:** **DONE (29 Sep 2026; evidence bagian 9.3).** Scaffold atau adaptasi Next.js dan TypeScript strict. Pasang token dan font lokal sumber, shell guru/papan, dependency boundaries serta script lint, format, typecheck, build dan CI.
- **M01-b:** **DONE (29 Sep 2026; evidence bagian 9.4).** Buat DTO allowlist, transaksi IndexedDB guru, nama lokal terpisah dan projection publik papan. Siapkan cache minimum shell dan asset untuk alur awal.
- **M01-c:** **DONE (29 Sep 2026; evidence dan batas auth live bagian 9.5).** Implementasikan magic link guru, identitas papan terpisah, kelas/siswa dengan owner RLS dan tes dua akun. Data demo tidak menjadi bypass autentikasi pada mode pilot.

**Acceptance:** Production build berjalan; count 1-40 dan grade 1-12 tervalidasi; nama tidak masuk DTO jaringan; data lokal yang diterima selamat setelah reload; akses silang ditolak database, bukan hanya disembunyikan UI.

**Validasi:** lint, format:check, typecheck, test:integration, test:rls, build; smoke browser dan payload canary. Infra yang belum tersedia dicatat BLOCKED, bukan diganti fake berlabel live.

**Kemampuan dibuka:** Shell dan kelas dapat dipakai; belum ada scanner atau kelompok.

### M02 - Engine matematika, BKT, placement dan kelompok

**Dependensi:** M01.  
**Area file:** src/core/{math,bkt,placement,groups}, src/content/ladder, tests/unit dan fixture demo.

- **M02-a:** **DONE (29 Sep 2026; evidence bagian 9.6).** Buat registry 22 StepId, target kelas, matematika eksak dan BKT memakai vektor di TECH_SPEC bagian 5.
- **M02-b (DONE 29 Sep 2026):** Implementasikan initial/weekly window, pasangan observasi exit, hysteresis dan revisi sesi. Pisahkan computed dari displayed placement; kasus tepi mengikuti register dan tetap berlabel provisional jika belum disetujui. Evidence aktual di 9.7.
- **M02-c (DONE 29 Sep 2026):** Implementasikan merge bertetangga, kelompok kecil, label seeded serta activity/exit step terpisah. Buat fixture D1=7, D2=13, D3=8, D4=4; UI wajib membaca hasil engine.

**Acceptance:** Input, konfigurasi dan seed sama menghasilkan output sama. ? berbeda dari missing. Scan ulang tidak menghitung sesi dua kali. Fixture menghasilkan 7/13/12; dua sesi dengan respons berbeda dapat mengubah hasil nyata. Pemindahan kelompok tidak mengubah BKT.

**Validasi:** test:unit CORE01-04, golden numeric dengan toleransi 1e-9, lint, typecheck dan build.

**Kemampuan dibuka:** Kelompok dihitung dari respons valid; belum dari kamera.

### M03 - Kartu, PDF dan scanner HP

**Dependensi:** M01-M02.  
**Area file:** src/cards/layouts, src/cards/pdf, src/workers/omr, src/features/scanner, tests/omr dan fixture foto.

- **M03-a:** **DONE (evidence jurnal 9.9–9.16; batas fisik/live tetap terbuka).** Buat satu layout manifest untuk PDF dan scanner. QR hanya jenis/versi. Cek Awal memakai A5 dua kartu per A4; mingguan dan exit empat per A4. Verifikasi cetak sebelum mengunci koordinat.
- **M03-b:** **DONE (evidence jurnal 9.9–9.16; batas fisik/live tetap terbuka).** Implementasikan marker, homography, QR, bubble classification, kamera, blur/stability, review ganda/samar dan validasi nomor absen, seluruhnya lokal.
- **M03-c:** **DONE (evidence jurnal 9.9–9.16; batas fisik/live tetap terbuka).** Tambahkan Ganti/Lewati, koreksi, camera error dan fallback manual. Ambil foto kartu dengan jawaban diketahui. Kalibrasi threshold memakai data, bukan target akurasi yang dianggap sudah tercapai.

**Acceptance:** Kartu tercetak dapat dibaca HP lewat pipeline sungguhan. Clear blank menjadi ?, samar/ganda meminta review. Foto tidak diunggah. Scan diterima tersimpan secara durable dan tidak menggandakan bukti.

**Validasi:** test:omr OMR01-03, privacy/offline subset, uji kartu nyata di HP, lint/typecheck/build. Target akhir 1.000 sintetis dan 90 foto boleh belum lengkap untuk PRELIM, tetapi jumlah aktual wajib dilaporkan.

**Kemampuan dibuka:** Pemindaian nyata memasok engine; ini jalur risiko tertinggi.

### M04 - Pairing, Layar Kelas dan Garis Bilangan

**Dependensi:** M02-M03 dan autentikasi M01.  
**Area file:** src/server/pairing, src/contracts/board, src/features/classroom, src/core/tools/number-line, API pairing, tests/realtime dan E2E.

- **M04-a:** **DONE (evidence jurnal 9.9–9.16; batas fisik/live tetap terbuka).** Buat pairing enam digit, single use, expiry, rate limit, membership, private channel, projection, revision, ACK dan recovery. Uji kedaluwarsa, topic terlarang dan akses silang.
- **M04-b:** **DONE (evidence jurnal 9.9–9.16; batas fisik/live tetap terbuka).** Tampilkan kelompok dari HP ke papan hanya sebagai bentuk, warna dan absen. Implementasikan Garis Bilangan murni: drag, jump, check, undo, lift vertikal dan feedback lokal.
- **M04-c:** **DONE (evidence jurnal 9.9–9.16; batas fisik/live tetap terbuka).** Hubungkan scan, kelompok, papan dan manipulasi pada dua perangkat/context. Tampilkan keadaan disconnect yang benar. Cache tool, worker dan font yang dipakai.

**Acceptance:** Layar interaktif, bukan screenshot. -3-5=-8 dan lift -2 ke 5 menghasilkan 7 dari engine. Revocation/epoch menolak command lama. Tidak ada nama atau kode level di tampilan publik.

**Validasi:** RT01, TOOL01, privacy/offline subset, test:e2e awal, browser 390x844 dan 1920x1080, lint/typecheck/build. Preview HTTPS untuk kamera hanya diterbitkan setelah otorisasi yang diperlukan.

**Kemampuan dibuka:** Rantai PRELIM berfungsi dari kartu sampai model.

### M05 - Gerbang PRELIM dan bukti demo

**Dependensi:** M01-M04.  
**Area file:** tests/e2e/prelim, artifacts/qa/M05, manifest fixture dan PLAN; tidak ada fitur baru.

- **M05-a:** **DONE (evidence jurnal 9.9–9.16; batas fisik/live tetap terbuka).** Uji reset demo deterministik. Pakai 29 respons simulasi dan tiga kartu nyata 07/12/25; dua nomor selain 07 adalah usulan fixture baru. Tiga kartu itu tidak boleh sudah terisi sebelum scan.
- **M05-b:** **DONE (evidence jurnal 9.9–9.16; batas fisik/live tetap terbuka).** Lakukan gladi, catat target versus hasil, siapkan input manual dan rekaman cadangan. Labeli bagian belum berjalan sebagai desain.

**Acceptance:** Kartu, scan, kelompok dan Garis Bilangan terbukti berjalan dengan data contoh yang jelas. Tidak mengaku 13 fitur final selesai. Pemakaian pola tiga kartu final untuk PRELIM adalah desain eksekusi baru, bukan aturan tambahan panitia.

**Validasi:** verify dan smoke staging yang tersedia; rekaman/screenshot aman, commit dan hasil aktual dicatat. Concept paper dan video final bukan keluaran otomatis dari milestone kode ini.

**Kemampuan dibuka:** PRELIM siap hanya sejauh evidence mendukung.

### M06 - Paket Sesi, konten dan kelas baru

**Dependensi:** M02-M05.  
**Area file:** src/content/{templates,reasons,strategies,contexts}, src/core/package, src/features/package, local CSV dan tests/content.

- **M06-a:** **DONE (9.18).** Bangun template versioned, exact solver, pengecoh, alasan dan metadata review untuk registry. Jangan memberi status reviewed tanpa reviewer manusia.
- **M06-b:** **DONE (9.19).** Bangun paket initial, weekly, oral dan short: opening, lanjutan, tugas papan, mandiri, contoh guru dan exit. Terapkan jumlah tugas SD versus SMP/SMA, generate offline dan ganti soal. Range kelas baru memakai usulan K02 yang tercatat.
- **M06-c:** **DONE (9.20).** Siapkan Bisik statis untuk 23 kode dasar, fallback tanpa miskonsepsi, pratinjau HP dan cetak tugas mandiri. Lengkapi kelas/CSV. Langkah yang belum punya alat harus terlihat sebagai gap K01.

**Acceptance:** Setiap template aktif diuji 500 seed. Exit tidak mengulang soal stasiun. Paket offline tidak bergantung LLM. Registry 22 langkah tidak dipakai sebagai klaim semua konten/interaktif sudah lengkap; unsupported tidak diganti soal sembarang.

**Validasi:** GEN01, PKG01, C01, test:content, unit, privacy dan build.

**Kemampuan dibuka:** Paket dapat disiapkan sebelum kelas; Bisik statis tersedia.

### M07 - Cek lisan, below-range dan lifecycle placement

**Dependensi:** M06.  
**Area file:** src/core/oral, src/features/oral, src/core/placement, tests/oral dan tests/replay.

- **M07-a:** **DONE (9.21).** Implementasikan pencarian naik/turun, batas A1/target, Benar/Salah/Diam/Lewati, pilihan miskonsepsi dan G=.05. Alias nama tetap lokal.
- **M07-b:** **DONE (9.22).** Uji initial semua benar, pengulangan langkah, missing, weekly window batas atas, late exit, replay dan manual override. K03/K12/K13 harus direview sebelum pilot terkait; fixture demo tetap boleh dibuat dengan label provisional.

**Acceptance:** Respons mentah, mastery dan placement override terpisah. Absen bukan observasi salah. Satu sesi tidak memperbarui hysteresis dua kali. Sesi lisan dapat dilanjutkan setelah offline reload.

**Validasi:** ORAL01, CORE02/03, offline subset, test:unit dan build.

**Kemampuan dibuka:** Contoh SD lisan dan penanganan below-range; pilot lisan tetap menunggu gate K13.

### M08 - Rotasi, waktu, peran dan pemerataan

**Dependensi:** M06-M07.  
**Area file:** src/core/{stations,turns}, src/features/stations, timer papan dan tests/simulation.

- **M08-a:** **DONE (9.23).** Implementasikan tabel 1/2/3/4 kelompok, budget SD/SMP/SMA, initial/short, layout stasiun, tambah tiga menit, akhiri putaran dan Bisik kelompok Guru otomatis.
- **M08-b:** **DONE (9.24).** Pilih peran dengan least turns dan seed, hormati kehadiran/Navigator dulu, dua Pilot atau fallback satu, serta dua tim untuk kelompok besar. Hitung tugas yang benar-benar berlangsung, bukan hanya rencana.
- **M08-c:** **DONE (9.25).** Implementasikan preview hold dan collision guard. Selesaikan semantik K07 secara eksplisit. Timer habis tidak otomatis membuka jawaban atau memaksakan perpindahan yang menabrak kapasitas.

**Acceptance:** Guru dan Papan tidak ditempati dua kelompok pada putaran yang sama. Semua kelompok mendapat keduanya tepat sekali. Contoh 7B sama dengan sumber. Angka simulasi ditulis dari run nyata, bukan disalin sebagai hasil sendiri.

**Validasi:** ROT01, TURN01, simulate:turns, latensi command, unit/E2E/build.

**Kemampuan dibuka:** Tiga putaran 7B dan giliran yang nyata.

### M09 - Empat alat inti 7B dan tujuh pola

**Dependensi:** M08; Garis Bilangan dari M04.  
**Area file:** src/core/tools/{fractions,ratio,algebra}, src/features/tools, patterns dan tests/tools.

- **M09-a:** **DONE (9.26).** Bangun Batang Pecahan: ukuran satu utuh tetap, pembagian, kesetaraan, penyebut sama dan exact check. Selaraskan batas bagian yang didukung dengan generator.
- **M09-b:** **DONE (9.27).** Bangun Tabel Rasio multiplikatif dan Ubin Aljabar: kelompok, zero pairs, model check dan undo.
- **M09-c:** **DONE (9.28).** Implementasikan Tebak Dulu, Lihat Dulu, Jelajah, Bangun Model, Cari Kesalahan, Berdua dan Tantangan Terbuka di atas engine. Tambahkan petunjuk bertahap, ownership dua pointer dan feedback netral.

**Acceptance:** Empat alat 7B sungguh interaktif. Pemeriksa menilai model, bukan hanya jawaban. Undo bekerja; hint tidak memengaruhi BKT. Tulisan bebas tidak masuk storage atau jaringan.

**Validasi:** TOOL01-04, PTR01, PRIV02, pemeriksaan visual, build. Fixture multitouch bukan bukti hardware; uji perangkat ada di M12.

**Kemampuan dibuka:** Tiga putaran memakai model berbeda dan penjelasan alasan.

### M10 - Exit, pembuka, refleksi dan siklus utuh

**Dependensi:** M06-M09.  
**Area file:** src/core/assessment, src/features/{exit,reflection,opening}, tests/e2e/freshclass.

- **M10-a:** **DONE (9.29).** Lengkapi konteks pembuka dan lanjutan demo, Lihat Dulu SD, tujuan sesi, tiga kalimat refleksi dan ink RAM-only. Pilot pembuka berasal dari scheduler.
- **M10-b:** **DONE (9.30).** Bekukan group/question binding exit. Row 1-2 menjadi satu observasi, row 3 satu observasi biasa. Gunakan ulang OMR/manual review. Tampilkan hasil benar-dan-paham minimum di HP dengan denominator dan status kelengkapan.
- **M10-c:** **DONE (9.31).** Jalankan E2E kelas baru tanpa seed: Cek Awal A5, kelompok, tiga putaran, exit/refleksi dan sesi berikutnya. Pisahkan kelas ditutup dari penilaian difinalisasi.

**Acceptance:** Jawaban benar dengan alasan salah adalah observasi salah; missing bukan bukti. Exit kelompok gabungan mengikuti K05. Perubahan level berasal dari engine. Finalisasi satu kali per revisi dan refleksi tidak disimpan.

**Validasi:** EXIT01, OPEN01, PRIV02, CORE03, E2E02 dan build.

**Kemampuan dibuka:** Siklus 7B utuh, termasuk kelas baru, bukan sekadar wizard seeded.

### M11 - Hardening offline, sinkronisasi dan recovery

**Dependensi:** M10; durabilitas dasar sejak M01.  
**Area file:** src/local, src/server/sync, service worker, migration dan tests/offline/sync.

- **M11-a:** **DONE (30 Sep; 9.32).** Perkuat transaksi/outbox idempotent, mutation versioning, error 401/409/429/5xx, urutan parent, restart dan tombstone penghapusan.
- **M11-b:** **DONE (30 Sep; 9.33).** Uji writer/epoch dua HP, konflik dan replay jawaban terlambat. Jangan last-write-wins mastery atau history tanpa penjelasan dan rekonsiliasi.
- **M11-c:** **DONE (30 Sep; 9.34).** Cache shell, lazy tools, worker dan font; tunda update saat kelas; tangani storage quota/eviction dan logout. Buktikan roster papan hanya RAM serta tidak ada janji sinkronisasi cloud tanpa internet.

**Acceptance:** Scan/exit diterima tetap ada setelah tutup-buka offline. Reconnect tidak menggandakan bukti atau mengulang semua command Next lama. Eviction browser tidak dinyatakan mustahil; kegagalan terdeteksi dan dijelaskan.

**Validasi:** OFF01, SYNC01, RLS01, PRIV01/02, test:offline/privacy/integration, production build dan airplane mode pada HP nyata.

**Kemampuan dibuka:** Bukti ketahanan jaringan dan pemulihan yang jujur.

### M12 - Tes papan dan gerbang pilot

**Dependensi:** M10-M11; konten dan izin dapat disiapkan lebih awal.  
**Area file:** board-capabilities, board-profiles API, tests/devices, artifacts/qa/M12 dan gate PLAN.

- **M12-a:** Implementasikan enam pemeriksaan kemampuan, fallback tanpa/satu/dua/empat sentuhan, posisi terlalu tinggi dan tes ulang. HP remote membutuhkan jaringan; saat putus gunakan alternatif lokal yang tersedia.
- **M12-b:** Uji HP dan layar nyata, dataset foto akhir, fotokopi generasi kedua, sentuhan acak 60 detik, latensi, jarak baca, aksesibilitas dan keadaan galat.
- **M12-c:** Periksa gate 16 Oktober: kelas baru 7B, Bisik statis, perangkat, konten, izin dan persetujuan. Catat lokasi, retensi dan prosedur data. Jangan otomatis menyetujui gate manusia.

**Acceptance:** BOARD01 dan pemeriksaan perangkat nyata lulus. Data anak tidak diproses sebelum izin/persetujuan sumber terpenuhi. K01 memblokir jenjang yang belum didukung, bukan memaksa pilot pada alat yang tidak ada. Bisik bebas belum wajib ikut uji siswa pada gate ini.

**Validasi:** verify, checklist perangkat dan berkas izin. Bukti berisi data riil disimpan sesuai kebijakan sekolah, bukan di repo publik.

**Kemampuan dibuka:** PILOT READY hanya jika semua gate relevan benar-benar lulus.

### M13 - LLM enrichment dan Bisik online

**Dependensi:** M06/M10; konten, credential, budget dan privasi disetujui.  
**Area file:** src/server/llm, prompts, contracts/llm, features/bisik dan tests/llm/security.

- **M13-a:** Buat satu adapter dengan ID model terverifikasi dan adapter disabled. Gunakan approved slots, placeholder angka, batas sepertiga cerita dan pemeriksaan makna.
- **M13-b:** Bangun Bisik maksimal 80 kata, source code dan feedback. Tambahkan sanitasi/pratinjau lokal, rate limit, budget, deadline serta usage log tanpa identitas individu.
- **M13-c:** Uji timeout, injection, JSON tidak valid dan provider error menuju fallback statis. Live call hanya terbatas setelah diotorisasi; tidak menjalankan load test berbayar.

**Acceptance:** LLM tidak memutuskan level/kunci dan tidak mengganti paket assessment yang sudah beku. Target 5/30 detik diukur. K15 harus diselesaikan atau fitur bebas tetap berstatus belum lulus; kartu statis tidak membuktikan fitur online selesai.

**Validasi:** LLM01, GEN01, PRIV01, unit/integration/E2E/build serta usage aktual untuk panggilan yang diizinkan.

**Kemampuan dibuka:** AI nyata dan terbatas; kegagalannya tidak menghentikan kelas.

### M14 - Dua alat lanjutan dan sepuluh mode papan

**Dependensi:** M09-M13.  
**Area file:** src/core/tools/{balance,graphs}, fitur alat, split/spotlight dan tests/tools.

- **M14-a — DONE software:** Timbangan Persamaan, operasi simetris, invariant check dan undo; tanpa berat x rekaan. Evidence 9.39.
- **M14-b — DONE software:** Grafik Geser D6/E2/E3/E4, oracle eksak, slider/titik/undo, tujuh pola, DTO/SQL dan kendali HP; evidence 9.40.
- **M14-c — DONE software:** Panel 2–4, pagination dua per halaman, Sorot kelompok/resume RAM, Berdua eksplisit, SD5/SMA10 dan zona rendah; evidence 9.41. Audit F4 seluruh sesi/offline dilanjutkan M15.

**Acceptance:** Enam alat lulus model check, misconception dan undo. Mode tidak berupa placeholder. K01 tetap gate semua jenjang; empat alat non-MVP tidak dibangun tanpa perubahan scope yang disetujui.

**Validasi:** TOOL05/06, PTR01, UI01, follow-up perangkat, E2E, daftar sepuluh mode dan build.

**Kemampuan dibuka:** Cakupan demo SD5/SMA10 dan seluruh permukaan menuju final.

### M15 - Audit 13 fitur dan berkas finalis

**Dependensi:** M01-M14 serta gate keputusan/konten/manusia yang relevan.  
**Area file:** artifacts/qa/M15, regression tests, release manifest dan PLAN.

- **M15-a — DONE software:** Telusuri F1-F8/F16-F20 ke PRD dan TECH_SPEC bagian 18. Audit RLS, autentikasi, realtime, PII, tulisan bebas, LLM dan OMR, lalu review lintas modul. Tutup gap software wajib yang ditemukan; jangan hanya menandainya eksternal.
- **M15-b — DONE software:** Uji instalasi dan migration dari kosong, full verify lokal. Staging/perangkat tetap NOT_RUN; hasil aktual9.45.
- **M15-c — DONE software:** Manifest kandidat/hash/evidence/batas klaim9.46. Pengiriman berkas24–25 Oktober belum dilakukan.

**Acceptance:** Setiap fitur wajib mempunyai bukti. Demo 7B bukan otomatis bukti semua jenjang. K01 diselesaikan atau cakupan klaim dibatasi secara eksplisit. Gate gagal tidak boleh ditandai lulus. Milestone ini tidak otomatis mengizinkan deployment publik.

**Validasi:** Seluruh script relevan dan checklist manual pada commit yang sama.

**Kemampuan dibuka:** FINAL FILES jika lengkap; laporan kekurangan yang jujur jika belum.

### M16 - Fitur opsional bersyarat

**Dependensi:** M15 wajib lulus; waktu dan otorisasi tersedia.  
**Area file:** features/{progress,summary,print-mode,guide,audit} dan tes terkait.

- **M16-a — DEFERRED:** F9 tren kemajuan dan F10 ringkasan wakasek opsional.
- **M16-b — DEFERRED:** F11 Mode Tanpa Layar lengkap, F12 panduan dan F13 UI audit opsional.

**Acceptance:** Tidak merusak core, kinerja atau privasi. Ringkasan sesuai observasi. Tidak ada klaim dampak empat minggu dari data buatan. Audit dasar, hasil exit minimum dan cetak mandiri yang sudah wajib tetap ada jika milestone ini dilewati.

**Validasi:** Unit/E2E/privasi yang relevan dan regression verify.

**Kemampuan dibuka:** Manfaat tambahan; bukan prasyarat slice atau alasan menunda fitur wajib.

### M17 - Freeze, gladi dan handoff

**Dependensi:** M15; M16 boleh dilewati.  
**Area file:** Release manifest, aset demo, artifacts/qa/M17 dan PLAN; tidak ada fitur baru.

- **M17-a — DONE software; fisik NOT_RUN:** Snapshot kandidat lokal, rollback/manifest/PDF/font/cache tersedia. Freeze29 Oktober, perangkat/kabel/hotspot fisik belum dilaksanakan.
- **M17-b — DONE software; panggung NOT_RUN:** Tiga source-flow lokal dipercepat lulus pada build sama. Fallback manual/HP diuji browser; rekaman lokal tersedia. Gladi enam menit, juri dan flashdisk fisik tetap NOT_RUN.

**Acceptance:** Tiga gladi berhasil; fallback teruji; klaim sesuai fitur dan hasil. Saat rekaman digunakan, sebut sebagai rekaman, bukan live. Tidak ada deployment baru yang belum diuji tepat sebelum presentasi.

**Validasi:** Smoke dan critical regressions setelah perbaikan terakhir; catatan tiga gladi.

**Kemampuan dibuka:** FINAL DEMO dengan bukti dan batas yang jelas.

## 5. Perintah validasi dan quality gate

Kontrak script ada di TECH_SPEC bagian 20. Buat script saat milestone terkait;
contoh berikut bukan hasil eksekusi pada paket dokumen ini.

```bash
npm run lint
npm run format:check
npm run typecheck
npm run test:unit
npm run test:content
npm run test:omr
npm run test:integration
npm run test:rls
npm run test:e2e
npm run test:offline
npm run test:privacy
npm run simulate:turns
npm run build
npm run verify
```

M00 tidak memerlukan script aplikasi yang belum ada. Sesudah sebuah check wajib,
script yang tidak tersedia berarti NOT_IMPLEMENTED/BLOCKED, bukan PASS. Jangan
membuat script no-op. Pada repo pnpm/yarn/bun, pertahankan lockfile dan tulis
padanan command; jangan menambahkan package manager kedua untuk menghindari error.

Evidence menyebut commit, command, exit code, lingkungan, jumlah sampel dan hasil
aktual. Screenshot memakai data demo. Kamera video fixture Playwright berbeda
dari kamera HP fisik. Jangan menghapus kasus berat/outlier demi mencapai 99%.

## 6. Jalur cepat PRELIM

Fokus M00-M05. Kerjakan layout dan scanner lebih dahulu daripada dashboard penuh.
Shell mengikuti token sumber; tidak perlu landing page mewah. Tiga kartu nyata
harus benar-benar diproses; 29 data contoh diperbolehkan untuk demo dengan label.
Angka kelompok harus berasal dari engine, bukan hard-code pada UI.

Input manual adalah fallback jujur, bukan pengganti scanner untuk mengklaim F5
lulus. PRELIM tidak membutuhkan billing, seluruh kartu strategi yang direview,
semua panel atau LLM live. Hal itu tidak menghapus persyaratan FINAL. Jangan
memperluas scope saat scanner, pairing atau BKT masih gagal.

## 7. Gerbang manusia

| Gate | Pihak yang harus benar-benar memutuskan / menguji | Status awal |
| --- | --- | --- |
| K01: 22 langkah versus enam alat | Pemilik produk dan reviewer pendidikan | Belum diputuskan |
| K03/K04/K12/K13: edge pedagogi | Pemilik produk dan guru/dosen | Belum direview |
| K07 hold / K10 reveal / pagination | Pemilik produk dan reviewer UX | Belum direview |
| K15: privasi ketikan bebas, retensi dan hapus data | Pemilik produk/sekolah | Belum direview |
| K19: strategi, alasan dan konten | Guru/dosen matematika | Belum direview |
| Lokasi pilot Bandung/Samarinda | Tim dan sekolah | Belum diputuskan |
| Izin sekolah dan persetujuan orang tua | Pihak terkait sesuai sumber | Belum diverifikasi |
| Juknis, tanggal, format video | Tim/panitia | Belum dikonfirmasi ulang |
| Credential, resource dan budget | Pemilik akun | Belum diverifikasi |
| Kamera dan papan nyata | Tim/perangkat | Belum diuji |

Fixture/demo boleh dikerjakan dengan keputusan provisional yang berlabel. Jangan
mengisi reviewer atas nama orang yang belum mereview, atau menyimpulkan izin
sekolah sudah ada. Peran tim dalam sumber tidak diganti oleh plan; pembagian kerja
di sini adalah fungsi engineering, bukan penunjukan orang baru.

## 8. Jurnal keputusan

Tambah baris; jangan menghapus riwayat. Perubahan requirement pengguna harus
menyebut instruksi yang mendasarinya. Default engineering bukan approval pedagogi.

| Tanggal | ID | Keputusan dan dasar | Status / dampak |
| --- | --- | --- | --- |
| 29 Sep 2026 | DOC-01 | Delapan sumber disalin utuh; TECH_SPEC terpisah dengan label S/D/K/V | Berlaku pada kit, bukan aplikasi |
| 29 Sep 2026 | DOC-02 | Status di PLAN; konflik di TECH_SPEC bagian 2 | Tidak perlu STATUS.md |
| 29 Sep 2026 | DOC-03 | A5 adalah ukuran kartu menurut PRD F2 | Salah baca chat terdahulu dikoreksi |
| 29 Sep 2026 | DOC-04 | M00-M17 adalah plan baru | Tidak mengubah tanggal atau fitur wajib sumber |
| - | IMPL-001 | Diisi setelah repository diperiksa | Belum ada keputusan runtime |
| 29 Sep 2026 | AUDIT-001 | M00-a menemukan repo dokumen saja; instruksi pengguna membatasi run pada audit. Tidak menetapkan versi/dependency atau menyelesaikan gap pedagogi | M00-a DONE; M00-b NOT_STARTED; register TECH_SPEC tidak berubah |
| 29 Sep 2026 | BOOT-001 / K23 | Instruksi pengguna M00-b memilih pnpm; tetapkan Node 24.14.1 LTS dan pnpm 11.19.0 yang sudah tersedia, menggantikan default npm [D] | Berlaku untuk bootstrap; versi exact/lockfile diwujudkan pada M01-a |
| 29 Sep 2026 | BOOT-002 / K23 | Baseline dependency bagian 9.2 diverifikasi terhadap registry resmi dan dokumentasi platform; TS 5.9.3/ESLint 9.39.5 dipilih untuk peer Next yang cocok | Tidak ada install/build pada M00-b; warning tooling dicatat tanpa menahan M01-a |
| 29 Sep 2026 | BOOT-003 / K23 | Bootstrap manual satu app di repo existing; Node runtime, batas modul TECH_SPEC, font/token S4/S5; dependency dipasang sesuai milestone | Tidak menambah layanan/fitur atau menutup gate pedagogi/pilot; M00 DONE |
| 29 Sep 2026 | APP-001 / K24 | M01-a memakai shell kosong berlabel pratinjau, tanpa seed/kode pairing palsu; logo SVG sementara diturunkan dari deskripsi teks S4, bukan aset kanvas | /guru dan /layar runnable; bukan F1/F4 penuh atau demo 7B selesai |
| 29 Sep 2026 | APP-002 / K24 | pnpm allowBuilds hanya untuk unrs-resolver setelah memeriksa postinstall native; pnpm-workspace.yaml hanya konfigurasi satu app. Warning launcher Node 24.19.0 tidak mengubah pin/child runtime 24.14.1 | Install frozen-lockfile PASS; warning ESLint EOL tetap dicatat dari M00-b |
| 29 Sep 2026 | PLACE-001/002/003 / K28 | Initial incomplete tetap pending; frozen card snapshot/revisi tertinggi dan replay terurut; satu kandidat per sesi eligible, manual placement berbeda dari group move. Detail kontrak di 9.7 | M02-b DONE; default tepi K03/K12/K14 dan durasi override tetap provisional untuk pilot; tidak membangun sync/grouping |
| 29 Sep 2026 | CONT-001 / GROUP-001 | Instruksi continuous pengguna mengganti batas berhenti per task. Jalankan M02-c sampai M05 berurutan; catat physical/live gap tanpa menghalangi adapter otomatis. Grouping mengikuti 6.1/K04-K06; seed label demo 80, seed konten terpisah 70032 | Tidak mengubah source/pilot gate; checkpoint hash/evidence karena baseline app seluruhnya masih untracked |

## 9. Jurnal validasi dan handoff

**Kit dokumen ini belum menjalankan aplikasi, deployment atau uji kelas.**
Pemeriksaan integritas dokumen bukan hasil tes aplikasi. Jangan mengubah baris
awal berikut menjadi bukti bahwa app quality gate sudah lulus.

| Tanggal / commit | Task | Metode | Hasil aktual | Keterbatasan |
| --- | --- | --- | --- | --- |
| 29 Sep 2026 / tanpa commit aplikasi | DOC | Baca sumber dan susun kontrak | Dokumen baseline | Bukan build/test aplikasi |
| - | M00-a | Belum dieksekusi | NOT_RUN | Repository belum diperiksa |
| 29 Sep 2026 / base `47aa60d729b293a53365a780c0d1cd9485ec6f95` | M00-a | Inventaris Git/filesystem, hash sumber, tautan lokal dan versi CLI; rincian bagian 9.1 | PASS untuk audit baseline; 8/8 hash cocok; tes aplikasi NOT_RUN | Hanya PLAN.md diubah; bukan bukti build, layanan, perangkat atau izin |
| 29 Sep 2026 / base `47aa60d729b293a53365a780c0d1cd9485ec6f95` | M00-b | Dokumentasi resmi, CLI lokal, registry exact-version dan semver; rincian bagian 9.2 | 37 metadata paket; 40 pemeriksaan engine/peer PASS; Node/pnpm tersedia | Docker daemon tidak aktif; install/build/tes aplikasi NOT_RUN; bukan bukti runtime aplikasi |
| 29 Sep 2026 / base `47aa60d729b293a53365a780c0d1cd9485ec6f95` + working tree | M01-a | pnpm install/typecheck/lint/test/build, format:check, Playwright dan review screenshot | PASS: 11 unit + 4 smoke, kedua route render tanpa runtime error; artifacts/qa/M01 | CI remote/hardware/offline/storage/RLS belum diuji; hanya fondasi |

Template handoff setiap run:

```text
Milestone/task:
Commit/base atau working tree:
File diubah:
Acceptance yang terbukti:
Validasi: command, exit code, hasil aktual:
Evidence path:
Keputusan baru (ID):
Blocker / belum diuji:
Status task: DONE / IN_PROGRESS / BLOCKED
Next exact action:
```

Jangan melanjutkan berdasarkan hasil tes yang tidak pernah dijalankan. Ketika
chat berganti, repo dan PLAN lebih penting daripada ingatan percakapan yang tidak
mencerminkan commit akhir. Integrator wajib meninjau perubahan lintas modul dan
menjalankan regresi sebelum merge.

### 9.1 Handoff M00-a - audit repository dan sumber

**Tanggal/lingkungan:** 29 September 2026, Asia/Jakarta; Windows
10.0.26200.0 x64, PowerShell 7.6.5. Pemeriksaan lingkungan tercatat pukul
15:19 WIB. Workspace: `E:\Lomba\repo-papannalar`.

**Base:** branch `master`, HEAD `47aa60d729b293a53365a780c0d1cd9485ec6f95`,
satu commit tanggal 29 Sep 2026 (`chore: add PapanNalar specs and Codex execution plan`).
Ini commit dokumen, belum commit aplikasi. Working tree awal bersih; tidak ada
berkas untracked/ignored yang ditemukan, dan tidak ada remote Git terkonfigurasi.

**Bacaan audit:** AGENTS.md dan PLAN.md; TECH_SPEC bagian 0-3 (termasuk seluruh
register K01-K22), 17-22 serta indeks referensi 23; keputusan kunci sumber 00
dan gate build/uji sumber 07. Tidak memverifikasi ulang referensi web atau memilih
versi stabil; pekerjaan itu tetap M00-b.

| Area yang diperiksa | Keadaan aktual dan kecocokan dengan plan |
| --- | --- |
| Instruksi agent | Hanya AGENTS.md di root repo; tidak ada instruksi agent tambahan di subdirektori. `E:\AGENTS.md` dan `E:\Lomba\AGENTS.md` tidak ditemukan |
| Struktur | 11 berkas tracked: AGENTS.md, PLAN.md, delapan sumber 00-07 dan TECH_SPEC. Tidak ada kode aplikasi; sesuai status awal kit dan TECH_SPEC 20.1 |
| Manifest/lockfile | Tidak ada package.json, package-lock.json, npm-shrinkwrap.json, pnpm-lock.yaml, yarn.lock atau bun lockfile; tidak ada package manager proyek yang harus dipertahankan |
| Konfigurasi/kode | Belum ada src/app, core, contracts, public, tsconfig, konfigurasi Next/ESLint/formatter, pin runtime atau .gitignore. Struktur TECH_SPEC 3.4 masih target, bukan implementasi |
| Tes/CI/evidence | Tidak ada tests, fixture, scripts, workflow CI atau artifacts/qa. Seluruh script kontrak bagian 20.2 NOT_IMPLEMENTED; tidak ada regression aplikasi yang dapat dijalankan |
| Database/env | Tidak ada supabase/config.toml, migration, seed, policy RLS, .env.example atau berkas .env. Ketersediaan credential di luar repo tidak diperiksa; tidak ada koneksi layanan atau perubahan database |
| Aset | Tidak ada file gambar/kanvas, font biner, PDF kartu atau foto uji OMR. Placeholder embedded/link dalam sumber tidak dihitung sebagai aset tersedia |
| Tool lokal | Git 2.47.0.windows.1, ripgrep 15.1.0, Node v24.14.1, npm 11.18.0, Docker CLI 29.5.3. Docker daemon belum diuji; Supabase CLI tidak ditemukan pada PATH |
| Package manager lain | pnpm.cmd ditemukan berupa fallback runtime alat, versinya tidak dijalankan; yarn/bun tidak ditemukan pada PATH. Ini inventaris mesin, bukan pilihan stack/dependency proyek |

**Integritas sumber:** 8/8 berkas tersedia dan SHA-256 cocok dengan manifest
TECH_SPEC 0.1. Perbandingan Git terhadap HEAD juga tidak menemukan perubahan.
Pemeriksaan ini memakai baseline lokal; tidak mengklaim mengakses ulang unggahan
atau kanvas privat.

| Sumber | Ukuran byte | SHA-256 aktual (cocok baseline) |
| --- | --- | --- |
| 00_RINGKASAN_RUBRIK.md | 13269 | `f08b3a2210beede406e05cb7a7708458fd65e00ff31f47ef655fead46e6bf7d7` |
| 01_PRD.md | 56742 | `e48d0fcf779c53f5f41b67449fb03d71f9186fdb7166876a9525d6c5af57d654` |
| 02_DESAIN_PEMBELAJARAN.md | 28395 | `a5769a1815616cbf1c86f638b9d05b5cf6300690bb09346b266d72b8e6f0e685` |
| 03_KATALOG_MATERI.md | 13150 | `824fc08e556e2466fae1af511ad2d62152ba743c5de0781fa864b0946ab14c0b` |
| 04_BRAND_DESAIN.md | 17534 | `ba27e9b7a882b4bafd5db7dd12fa650ff771d6a7e051b6a033e5296a15075ed2` |
| 05_UX_LAYAR.md | 18939 | `b1ebb294f7dc991177c1a0fe66171f26809000889740ca87b7eb1a3e151bb10c` |
| 06_RENCANA_BISNIS.md | 23847 | `4bb3c4feea51ad11cf4ce42766e8510fdd62415a018ff329def8d9d8fddb7721` |
| 07_BUILD_QA_PITCH.md | 17404 | `81f9f60a9451e058681baadb8cee1522a85339893176b73be68f4227fc3037d0` |

**Validasi aktual (audit dokumen, bukan quality gate aplikasi):**

| Command/metode yang dijalankan | Exit code | Hasil aktual / jumlah sampel |
| --- | --- | --- |
| `git status --porcelain=v1 --untracked-files=all`; `git ls-files --others --ignored --exclude-standard` | 0 masing-masing | Sebelum edit: keduanya kosong |
| `git log -1 --format="%H%n%cs%n%s"`; `git rev-list --count HEAD`; `git remote` | 0 masing-masing | HEAD di atas; satu commit; tidak ada remote |
| `git ls-files`; `rg --files --hidden --no-ignore -g '!.git' -g '!node_modules' -g '!.next'`; `Get-ChildItem -Force` | 0 | 11 berkas Markdown; root hanya .git, docs, AGENTS.md dan PLAN.md |
| PowerShell `Get-FileHash -Algorithm SHA256` untuk delapan sumber; bandingkan dengan delapan baris manifest TECH_SPEC 0.1 | 0 | 8/8 hash cocok; script gagal bila jumlah bukan delapan atau hash berbeda |
| `git diff --exit-code HEAD -- 'docs/0[0-7]*.md'` | 0 | Tidak ada diff sumber |
| PowerShell regex tautan Markdown di luar code fence, resolusi relatif ke berkas asal, lalu `Test-Path` | 0 | 11 dokumen; 13 kemunculan tautan lokal ke 11 target unik; 0 target hilang. 87 tautan eksternal/anchor dilewati; isi web/anchor tidak divalidasi |
| `git --version`; `rg --version`; `node --version`; `npm.cmd --version`; `docker --version` | 0 masing-masing | Versi lokal sebagaimana inventaris; bukan pengujian kompatibilitas proyek |
| `git diff --check` sebelum dan sesudah edit | 0 | Tidak ada masalah whitespace |
| PowerShell `Get-FileHash` sebelum/sesudah edit untuk seluruh berkas selain PLAN.md | 0 | 10/10 berkas identik secara byte: AGENTS.md, delapan sumber dan TECH_SPEC |
| `git diff --exit-code HEAD -- AGENTS.md docs`; `git diff --name-only`; `git status --short --branch`; `git ls-files --others --exclude-standard` | 0 masing-masing | Sumber/instruksi tetap utuh; satu-satunya perubahan working tree adalah PLAN.md; tidak ada berkas baru |

`lint`, `format:check`, `typecheck`, `build`, `verify`, seluruh `test:*` dan
`simulate:turns`: **NOT_IMPLEMENTED; eksekusi NOT_RUN**, karena belum ada manifest,
kode atau script. Tidak menjalankan npm install, generator, tes semu, migrasi,
API berbayar, deployment maupun uji browser/perangkat. Script tersebut belum
menjadi kewajiban eksekusi M00 menurut bagian 5 dan TECH_SPEC 20.2.

**Blocker dan batas klaim menurut gate:**

| Gate/area | Temuan dan dampak |
| --- | --- |
| M00-a | Tidak ada blocker audit tersisa. Baseline nyata, sumber utuh dan satu next task tercatat |
| Pembangunan demo awal | Fondasi, engine, layout/PDF/OMR, auth/RLS/pairing, Layar Kelas dan Garis Bilangan semuanya belum diimplementasikan (M01-M04). Belum ada demo yang bisa dinyatakan berjalan. Pemilihan versi/runtime menunggu M00-b |
| Pembuktian demo awal | Supabase lokal/staging, konfigurasi/credential untuk auth dan pairing, internet untuk pairing cloud, jalur kamera HTTPS yang sesuai, HP, cetakan dan layar belum diverifikasi. Perlu bukti scan nyata dan alur dua perangkat pada M03-M05; ketersediaannya tidak diasumsikan |
| Aset desain | Kanvas/gambar embedded dan font biner belum tersedia. Ini membatasi klaim kesesuaian terhadap kanvas; token/typography/microcopy teks S4/S5 tetap dapat dipakai. Bukan blocker audit atau alasan menunda fondasi independen |
| Pedagogi/konten pilot | K02/K03/K04 dan K12/K13 pada fitur terkait, serta review K19, tetap belum lulus gate manusia. Demo dapat memakai default [D] yang dilabeli provisional; tidak memberi status reviewed atau izin pilot dari audit |
| Perilaku lanjutan | K07 hold, K10 reveal dan review UX/pagination menunggu task terkait; tidak memblokir audit atau demo scan-ke-Garis-Bilangan yang terbatas. Aturan privasi/offline K11 tetap wajib sejak implementasi awal |
| Cakupan final | K01 memblokir klaim semua jenjang lengkap; tidak memblokir demo 7B. K18/tes dataset scanner akhir, enam alat, sepuluh mode dan seluruh 13 fitur wajib belum dibuktikan. Target 99%/3 detik/95% bukan hasil ukur |
| Pilot/layanan/berkas | Lokasi K16, izin sekolah/orang tua, retensi/hapus data, review konten dan perangkat fisik belum diverifikasi. K15 dan credential/budget LLM menahan Bisik bebas/online terkait, bukan PRELIM dengan fallback statis. Juknis/tanggal K17 perlu konfirmasi; tidak ada persetujuan atau mitra baru yang diasumsikan |

**Perubahan/acceptance:** hanya PLAN.md untuk status, inventaris, evidence,
pemisahan blocker dan handoff. Tidak ada scaffold atau perubahan sumber,
AGENTS.md, TECH_SPEC maupun implementasi. Keputusan AUDIT-001 adalah batas audit,
bukan keputusan produk baru; tidak menutup item register K01-K21 atau gate manusia.
M00-a DONE; M00 IN_PROGRESS; M00-b dan M01-M17 tetap NOT_STARTED.
Evidence audit tersimpan di bagian ini; artifacts/qa/M00 belum dibuat karena
run ini tidak mengimplementasikan aplikasi.

**Next exact action:** pada run berikutnya kerjakan **M00-b saja**. Baca ulang
status Git/PLAN dan TECH_SPEC 2, 3.2, 20; periksa dokumentasi resmi terkini untuk
memilih kombinasi stabil Node, Next.js/React/TypeScript dan package manager yang
kompatibel, lalu catat versi persis, rujukan/tanggal verifikasi, serta kesiapan
tooling lokal Supabase/Docker yang relevan. Lengkapi baseline bagian 2 dan tindak
lanjut gap per gate; pertahankan [D] sebagai usulan dan gate manusia tetap terbuka.
Scaffold baru merupakan task M01-a setelah M00 selesai, bukan bagian run audit ini.

### 9.2 Handoff M00-b - baseline bootstrap

**Hasil:** M00-b dan M00 DONE pada 29 Sep 2026. Base tetap
`47aa60d729b293a53365a780c0d1cd9485ec6f95`; perubahan PLAN dari M00-a dipertahankan.
Lingkungan Windows x64/PowerShell 7.6.5. Hanya PLAN.md dan TECH_SPEC diubah;
tidak membuat manifest, lockfile, kode, resource layanan atau scaffold.

**Runtime/package manager (BOOT-001):** Node **24.14.1 LTS (Krypton)**,
pnpm **11.19.0**. Keduanya sudah bisa dijalankan; tidak perlu mengganti instalasi
global untuk memulai. Pada M01-a tulis `.node-version` = `24.14.1`,
`engines.node` = `24.14.1`, `packageManager` = `pnpm@11.19.0`; CI memakai pin sama.
Dependency langsung ditulis exact tanpa `^`/`~`; hanya `pnpm-lock.yaml`.
Padanan runbook: `pnpm install --frozen-lockfile` untuk CI; `pnpm run <script>`
untuk semua nama script bagian 5/TECH_SPEC 20.2. npm hanya dipakai membaca metadata
dalam audit ini, bukan package manager aplikasi.

**Baseline dependency (BOOT-002):** versi di bawah sudah ditemukan pada registry
resmi; pemasangan dilakukan saat modul terkait mulai dikerjakan, bukan sekaligus
pada M00-b. Angka ukuran bundle belum diukur; pembatasan dampak ada di kolom kanan.

| Area | Paket dan versi exact | Lisensi / kebutuhan / dampak |
| --- | --- | --- |
| App M01-a | next 16.3.6; react dan react-dom 19.3.0 | MIT; satu Next.js App Router, Node runtime; client JS hanya untuk interaksi |
| TypeScript M01-a | typescript 5.9.3; @types/node 24.19.0; @types/react dan @types/react-dom 19.3.0 | TS Apache-2.0, types MIT; strict; tooling tanpa bundle client |
| CSS M01-a | tailwindcss dan @tailwindcss/postcss 4.3.3; postcss 8.5.28 | MIT; pipeline CSS build; token sumber, tanpa library CSS runtime |
| shadcn/ui M01-a | CLI shadcn 4.21.0; clsx 2.1.1; tailwind-merge 3.7.0; class-variance-authority 0.7.1; @radix-ui/react-slot 1.3.3 | MIT kecuali CVA Apache-2.0; komponen Radix seperlunya di src/ui/components, CLI tidak masuk bundle |
| Ikon/font M01-a | lucide-react 1.48.0; @fontsource/plus-jakarta-sans dan @fontsource/atkinson-hyperlegible 5.3.0 | ISC / OFL-1.1; import ikon bernama, font lokal hanya subset/weight yang dipakai; tidak mengambil font lingkungan alat |
| Lint/format M01-a | eslint 9.39.5; eslint-config-next 16.3.6; prettier 3.9.9 | MIT; dev-only; ESLint CLI flat config, bukan next lint |
| Kontrak/storage M01-b | zod 4.6.5; dexie 4.4.6 | MIT / Apache-2.0; schema strict dan transaksi IndexedDB guru; import hanya modul pemakai |
| Auth/server M01-c | @supabase/supabase-js 2.117.2; @supabase/ssr 0.12.7; server-only 0.0.1 | MIT; SDK browser/server terpisah, cookie SSR; secret server-only |
| DB tooling M01-c | supabase 2.118.0 | MIT; CLI lokal dev-only, Docker untuk stack/test RLS; tidak perlu project cloud untuk bootstrap |
| Unit/integration saat tes dibuat | vitest dan @vitest/coverage-v8 5.0.2; vite 8.3.1 | MIT; Vite hanya peer transformer Vitest, tidak membuat app/server framework kedua |
| Browser QA | @playwright/test 1.63.0 | Apache-2.0; dev-only, browser binary sesuai versi; pakai untuk smoke M01-a dan perluas E2E M04 |

Paket scanner/PDF/QR/KaTeX dan helper test lain dipin ketika dipakai pada milestone
terkait; tidak diperlukan untuk membuka bootstrap. Lima peer transitif tooling
yang diperiksa: typescript-eslint 8.71.0, eslint-plugin-react 7.37.5,
eslint-plugin-import 2.32.0, eslint-plugin-jsx-a11y 6.10.2 dan
eslint-plugin-react-hooks 7.1.1; hasil resolusi final dicatat lockfile M01-a.

**Dasar kompatibilitas resmi, diperiksa 29 Sep 2026:**

- [Node releases](https://nodejs.org/en/about/previous-releases) menempatkan lini 24 sebagai LTS; [pnpm compatibility](https://pnpm.io/installation) mendukung Node 24 dengan pnpm 11. Patch lokal dipilih untuk segera mulai, bukan klaim versi terbaru.
- [Next installation](https://nextjs.org/docs/app/getting-started/installation): Node >=20.9, TS >=5.1, App Router/React 19, instalasi manual dan ESLint CLI. Metadata [next 16.3.6](https://registry.npmjs.org/next/16.3.6) menerima React 19.3.0.
- [Tailwind Next](https://tailwindcss.com/docs/installation/framework-guides/nextjs) memakai @tailwindcss/postcss; [shadcn Next](https://ui.shadcn.com/docs/installation/next) mendukung setup existing dengan alias @/*.
- [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client) memakai supabase-js + ssr; metadata ssr 0.12.7 meminta supabase-js ^2.114.0 dan SDK terpilih meminta Node >=22, dipenuhi baseline.
- [Vitest](https://vitest.dev/guide/) memerlukan Node >=22.12/Vite >=6.4; [Playwright](https://playwright.dev/docs/intro) mendukung lini Node 24 dan Windows 11. Metadata versi terpilih menerima Node 24.14.1; eksekusi browser belum diuji.
- [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started) mendukung CLI dev dependency terpin; Docker diperlukan untuk menjalankan layanan lokal.

**Keputusan bootstrap (BOOT-003):** instalasi manual Next.js di root repo pada
M01-a menjaga AGENTS.md/dokumen existing. Gunakan src/app, alias @/* ke src/*,
TypeScript strict, modul core murni, contracts/local/server/ui terpisah sesuai
TECH_SPEC. Tailwind v4 via PostCSS; shadcn hanya komponen yang dipakai, mengikuti
warna/font/microcopy S4/S5. Gunakan bundler default stabil, tanpa React Compiler
atau fitur offline eksperimental. Shell guru/papan dapat dibuka tanpa credential;
fitur cloud belum terkonfigurasi harus terlihat sebagai belum tersedia, tanpa
auth bypass. LLM_ENABLED=false sampai task/gate terkait; privasi, public projection
dan cache minimum tetap mengikuti baseline, bukan menambah layanan baru.

**Gap non-blocking:** pnpm 12/TypeScript 7/ESLint 10 bukan baseline otomatis.
TS 5.9.3 memenuhi peer typescript-eslint <6.1; plugin React/import/a11y yang dipakai
eslint-config-next menerima ESLint 9, belum 10. ESLint 9.39.5 dipakai sementara
untuk kompatibilitas; [lini 9 sudah EOL](https://eslint.org/version-support/).
Ini utang tooling dev, ditinjau saat peer mendukung 10 atau audit rilis, tanpa
menonaktifkan lint/aturan. Docker daemon tidak aktif dan Supabase CLI belum
terpasang: tindak lanjut pada M01-c sebelum test integration/RLS. Kanvas,
credential cloud, perangkat serta gate pedagogi/pilot di 9.1 tetap terbuka pada
fiturnya; tidak menahan M01-a dan tidak dianggap mendapat persetujuan baru.

**Validasi aktual:** `pnpm --version` exit 0 -> 11.19.0; `node -p` untuk
version/release.lts/platform/arch exit 0 -> v24.14.1/Krypton/win32/x64.
`npm.cmd view '@types/node@24' version --json --registry=https://registry.npmjs.org/`
exit 0 -> versi lini 24 terpilih 24.19.0. Script `node --input-type=module`
membaca endpoint registry `/<package>/<exact-version>` dan memeriksa dengan
semver bawaan npm: **32 paket baseline + 5 peer transitif, 40 cek engine/peer,
0 mismatch, 0 fetch gagal, exit 0**. Ini pemeriksaan metadata, bukan full install
atau pembuktian seluruh graph transitif. `docker version --format '{{.Server.Version}}'`
exit 1 karena pipe dockerDesktopLinuxEngine tidak tersedia; tidak menjalankan
container/migration. Script aplikasi tetap NOT_IMPLEMENTED; lint/format/typecheck,
build dan tes aplikasi NOT_RUN sampai M01. Evidence audit disimpan di bagian ini.

Pemeriksaan dokumen setelah edit: `git diff --check` exit 0;
`git diff --exit-code HEAD -- AGENTS.md 'docs/0[0-7]*.md'` exit 0.
PowerShell SHA-256 terhadap manifest sumber dan resolusi tautan lokal exit 0:
8/8 hash sumber cocok, 13 tautan lokal valid pada 11 dokumen. `git status`
menunjukkan hanya PLAN.md dan docs/08_TECH_SPEC.md berubah.

**TRUE BLOCKER untuk task berikutnya:** tidak ada.

**Next exact task: M01-a saja.** Buat fondasi manual dengan pin di atas,
pnpm-lock.yaml, shell guru/papan dan token/font lokal sumber; siapkan dependency
boundaries, scripts lint/format:check/typecheck/build/verify serta CI sesuai scope.
Jalankan checks yang sudah diimplementasikan dan smoke browser 390x844/1920x1080;
simpan hasil aktual. Jangan membangun scanner, engine placement atau auth/DB
M01-c dalam task fondasi ini.

### 9.3 Handoff M01-a - fondasi runnable

**Status:** M01-a DONE, M01 IN_PROGRESS. Base dan lingkungan mengikuti 9.2;
app 0.1.0 masih working tree, tidak membuat commit/deploy. Semua delapan sumber
tetap cocok SHA-256 baseline. Evidence: [laporan M01](artifacts/qa/M01/README.md).

**Dibuat:** package.json/pnpm-lock.yaml/pin Node, Next App Router strict,
Tailwind/PostCSS, Button shadcn/ui minimal + components.json, token warna/radius
S4 dan font Fontsource lokal. `/` mengarah ke `/guru`; `/layar` adalah surface
publik terpisah dengan kontrol layar penuh yang benar-benar bekerja. Guru memakai
Plus Jakarta Sans, papan Atkinson Hyperlegible; keadaan kosong/pratinjau tidak
menyatakan kelas atau pairing sudah tersedia.

Struktur: src/app, src/features/guru dan layar, src/ui; folder core/contracts/
local/server/content disiapkan tanpa implementasi domain. ESLint melarang
dependency framework/network pada core dan impor data guru pada surface papan;
11 unit test menguji aturan tersebut. Vitest/Playwright, GitHub Actions,
.env.example berisi dua placeholder publik Supabase, README dan scripts dev,
start, build, typecheck, lint, test/test:unit, test:e2e, format dan verify tersedia.
`verify` menggabungkan checks M01-a; integration/RLS ditambahkan saat M01-c.

| Command aktual | Exit | Hasil |
| --- | --- | --- |
| pnpm install --reporter=append-only | 1 awal | Dependency terunduh, postinstall unrs-resolver belum diizinkan |
| pnpm approve-builds unrs-resolver | 0 | Hanya native resolver tersebut diizinkan; postinstall selesai |
| pnpm install --frozen-lockfile --reporter=append-only | 0 | Install berhasil, lockfile konsisten |
| pnpm typecheck | 0 | next typegen + tsc --noEmit, strict |
| pnpm lint | 0 final | Peringatan ekspor anonim PostCSS pada run pertama diperbaiki tanpa mematikan aturan |
| pnpm test | 0 | 11/11 unit test batas dependency |
| pnpm format; pnpm format:check | 0 | Formatter hanya implementasi; dokumen baseline dikecualikan agar tidak ditulis ulang |
| pnpm build | 0 | Next 16.3.6/Turbopack production build, /guru dan /layar prerendered |
| pnpm exec playwright install chromium | 0 | Chromium 153.0.8010.12, Playwright build 1243 terpasang |
| pnpm test:e2e | 0 | 4/4 smoke production server, 0 skipped/flaky; screenshot dilihat langsung |
| git diff --check; pemeriksaan SHA-256 sumber | 0 | Whitespace bersih; 8/8 sumber tidak berubah |

Browser membuktikan redirect/navigasi, font lokal selesai dimuat, tidak ada error
page/console maupun request eksternal pada route shell yang diuji, tombol guru
>=48 px, papan >=96 px dan heading papan >=56 px. HP diuji pada 390x844, papan
1920x1080; ukuran teks guru 130% tidak menambah scroll horizontal. Screenshot HP
full-page boleh lebih tinggi dari viewport karena isi memang dapat digulir.
Review React: shell server components; client hanya Button/fullscreen, listener
dibersihkan, ikon punya label/aria-hidden dan tidak ada domain logic dalam UI.

**Gap non-blocking:** launcher pnpm milik alat memakai Node 24.19.0 sehingga
muncul warning exact-engine; `pnpm exec node` membuktikan child runtime 24.14.1.
ESLint 9 EOL dan warning NO_COLOR/FORCE_COLOR dicatat tanpa menahan bootstrap.
CLI agent-browser tidak tersedia; Playwright Chromium digunakan sebagai browser
nyata dan screenshot diperiksa. Logo masih usulan dari teks sumber. GitHub Actions
belum dijalankan remote (repo belum punya remote); cache/offline, kamera/papan
fisik, akses data, RLS dan pilot belum dibuktikan. Tidak ada klaim lulus atasnya.

**TRUE BLOCKER:** tidak ada untuk M01-b.

**Next exact task:** M01-b saja, gunakan Zod/Dexie yang dipin di 9.2 untuk DTO
allowlist publik, transaksi IndexedDB guru dan pemisahan nama lokal; siapkan cache
minimum shell/font dan tes reload serta pencegahan data privat masuk projection.
Auth/schema Supabase tetap M01-c; BKT/scanner/grouping tetap milestone selanjutnya.

### 9.4 M01-b - Boundary data, nama lokal dan cache awal (29 Sep 2026)

**Status:** DONE; M01 tetap IN_PROGRESS. Perubahan M01-a dan dokumen baseline
dipertahankan, belum commit/deploy. Delapan sumber tetap cocok SHA-256 baseline.
Evidence: [M01-b](artifacts/qa/M01/m01b/README.md), log
[verify](artifacts/qa/M01/m01b-verify.log), [unit ulang](artifacts/qa/M01/m01b-unit-final.log)
dan [hasil browser](artifacts/qa/M01/m01b/playwright-results.json).

**Implementasi aktual / file penting:**
- `src/contracts/{domain,api,board,llm,telemetry}.ts`: UUID v4, absen 1-40,
  grade 1-12/count 1-40, schema Zod strict dan serializer dengan mapping field
  eksplisit. Input eksternal menolak extra field; serializer membentuk objek baru
  tanpa nama/nickname/properti tambahan maupun `toJSON` dari objek asal.
  Projection papan awal hanya ID/label grup tetap dan absen, tanpa UUID siswa,
  nama, StepId/level, mastery, kunci, skor atau peringkat. Kontrak LLM hanya
  referensi paket; diagnostik hanya enum/bucket/versi, belum ada provider/collector.
- `src/local/{scope,names,db}.ts`: Dexie/IndexedDB versi 1. Database
  `pn-names:<mode>:<ownerId>` terpisah dari `pn-data:<mode>:<ownerId>`.
  Nama mempunyai save/read/update/delete/clear/close; nama kosong berarti tanpa
  record nama. Data pseudonim memakai transaksi bulk dengan absen unik per kelas;
  kegagalan membatalkan seluruh batch. Tidak ada fallback RAM berlabel tersimpan.
- `src/features/guru/student-view.ts`: satu tempat join nama lokal untuk label
  tampilan; fallback `Absen N`. View tidak meng-extend StudentRef. Aturan impor
  ESLint menolak nama lokal pada server/kontrak/papan/fitur selain guru, dan
  melarang jaringan langsung pada repository lokal. SSR tidak membuka IndexedDB.
- `src/offline/*`, `src/ui/components/offline-bootstrap.tsx` dan
  `scripts/build-offline.mjs`: service worker production, manifest versi build,
  27 aset JS/CSS/font/icon + dua shell statis. Salinan HTML dibuat dari output
  prerender, tidak dari respons live. API/auth/sync/LLM/RSC, query dan URL di luar
  allowlist tidak dicache; audit mendeteksi aset hilang. Tidak memaksa worker baru
  mengambil alih sesi. Tautan guru ke papan memakai navigasi dokumen agar offline
  tidak membutuhkan request RSC. Struktur/layout visual M01-a dipertahankan.
- `tests/unit/{privacy,cache-policy,dependency-boundaries}.test.ts`,
  `tests/e2e/{privacy-storage,offline}.spec.ts`, `tests/browser/*`: pengujian
  adversarial DTO, IndexedDB Chromium asli dan cache. Fixture dibundel memakai
  Vite existing lalu diinjeksi oleh Playwright; bukan route/aset produksi.
  Scripts `test:privacy`/`test:offline` tersedia; `verify`/CI existing menjalankan
  seluruh unit dan browser termasuk tes baru. README disesuaikan seperlunya.

**Keputusan engineering (K25):** DATA-001: Zod 4.6.5 (MIT) dan Dexie 4.4.6
(Apache-2.0) sesuai pin M00-b; tidak menambah fake-indexeddb atau library offline.
Keduanya tidak masuk bundle shell saat ini, baru dipakai fitur guru kelak;
bundel fixture tes terpisah 184.13 kB / gzip 56.43 kB, worker 2.95 kB / gzip 1.19 kB.
DATA-002: nama/nickname menjadi satu `displayName` lokal, trim/maksimum 120 karakter,
kosong menghapus mapping; namespace akun/mode bukan pengganti autentikasi atau RLS.
DATA-003: M01-b hanya store referensi siswa/nama dan cache shell/aset; store sesi,
paket versioned, response/event/outbox, sync engine dan UI kesiapan offline lengkap
dibuat pada task pemiliknya. Tidak membuat export full-state atau endpoint data.

API yang dipakai diperiksa secukupnya pada dokumentasi resmi
[Zod](https://zod.dev/api), [transaksi Dexie](https://dexie.org/docs/Dexie/Dexie.transaction())
dan [service worker Next.js](https://nextjs.org/docs/app/guides/progressive-web-apps).

| Command aktual | Exit | Hasil aktual |
| --- | --- | --- |
| pnpm add --save-exact zod@4.6.5 dexie@4.4.6 | 0 | Pin baseline dan lockfile diperbarui |
| pnpm install --frozen-lockfile --reporter=append-only | 0 | Lockfile konsisten |
| pnpm format; pnpm format:check | 0 | Format implementasi bersih; sumber asli tidak diformat ulang |
| pnpm typecheck | 0 | Strict; termasuk kontrak, worker dan fixture browser |
| pnpm lint | 0 final | Pola allowlist impor relatif awal terlalu ketat, diperbaiki dan ditambah regresi; tanpa suppression |
| pnpm test | 0 | Final 55/55: 21 DTO/privasi, 19 dependency boundary, 15 cache policy |
| pnpm build | 0 | Production prerender + worker/manifest; /guru dan /layar tetap statis |
| pnpm test:e2e | 0 | 12/12: 4 smoke M01-a, 5 IndexedDB/privasi, 3 cache/offline; 0 skipped/flaky |
| pnpm verify | 0 | format:check, typecheck, lint, test, build, test:e2e berurutan lulus |
| pnpm test (ulang setelah build/verify) | 0 | 55/55 tetap lulus |
| git diff --check; SHA-256 sumber; pencarian marker pada bundle | 0 | Whitespace bersih; 8/8 sumber utuh; nama database/fixture canary tidak ikut aset app |

Browser membuktikan empty DB, simpan/baca/update/hapus, reopen/reload, namespace
dua akun/demo-pilot, rollback batch absen bentrok dan canary hanya di storage lokal.
Sink request diintersep khusus tes (bukan API/Supabase live); field tambahan/nama
tidak masuk request, URL, log, CacheStorage atau DOM papan pada skenario yang diuji.
Tab baru tanpa jaringan membuka guru, berpindah ke papan dan reload; font serta
fullscreen berfungsi tanpa error page/console. Screenshot shell offline kosong
390x844 dan 1920x1080 diperiksa langsung, tanpa nama siswa. Ini bukan bukti seluruh
alur scanner/kelas offline, keamanan RLS, migrasi v2, eviction/kuota atau hardware.

**Gap non-blocking:** warning launcher Node 24.19.0 vs pin child 24.14.1 dan
NO_COLOR/FORCE_COLOR tetap ada. Vite memberi warning `use client` saat bundel
fixture khusus browser (bukan bundel Next/SSR); tidak mengubah boundary produksi.
Warning publicDir/outDir pada build worker awal sudah diatasi dengan publicDir:false.
Git memberi warning konversi LF/CRLF pada dua dokumen kerja; diff --check tetap lulus.
Cache production memerlukan persiapan online pertama. Auth/sign-out/lock/purge akun,
RLS dan ownership server masih M01-c; endpoint transport/provider belum dibuat.
Tidak mengklaim gate privasi seluruh produk atau pilot telah lulus.

**TRUE BLOCKER:** tidak ada untuk M01-b yang selesai.

**Next exact task:** M01-c saja. Periksa kesiapan Supabase lokal, lalu implementasi
magic link guru dan identitas papan terpisah, schema kelas/siswa dengan owner RLS,
serta tes dua akun/anon/board dan pemisahan demo/pilot. Pertahankan DTO, database
nama lokal dan cache shell statis; jangan mulai engine atau scanner pada task itu.

### 9.5 M01-c - Auth dan ownership minimum (29 Sep 2026)

**Status:** DONE untuk implementasi dan validasi yang dapat dijalankan sesuai
fallback harness yang diizinkan pengguna. M01 selesai dengan environment gap:
GoTrue/PostgREST/pengiriman email Supabase penuh **NOT_RUN**, bukan PASS.
Base tetap `47aa60d729b293a53365a780c0d1cd9485ec6f95`; tidak commit/deploy,
tidak menimpa perubahan terdahulu, delapan sumber tetap cocok SHA-256.
Evidence: [M01-c](artifacts/qa/M01/m01c/README.md),
[verify](artifacts/qa/M01/m01c/verify.log),
[SQL/RLS](artifacts/qa/M01/m01c/rls-results.log),
[browser](artifacts/qa/M01/m01c/playwright-results.json).

**Implementasi / file penting:**
- `src/server/auth/{client,origin}.ts`, `src/proxy.ts`, `src/app/auth/*`:
  Supabase SSR PKCE, `/masuk`, callback ke `/guru`, session persisten dan logout.
  Proxy Next 16 memvalidasi `getUser`, bukan mempercayai `getSession`/cookie mentah.
  Cookie HttpOnly/SameSite=Lax, Secure pada HTTPS; refresh cookie dan cache headers
  diteruskan juga pada respons error. Mutation memeriksa origin kanonis, tipe JSON,
  batas body dan schema strict. Token tidak disimpan manual di localStorage.
- `src/app/api/v1/{teacher,board/identity,classes}`, `src/server/classes.ts`,
  `src/contracts/{auth,classes}.ts`: API allowlist, CRUD kelas dan roster 1..N
  UUID acak, grade 1-12/count 1-40, update memakai revision. `owner_id` ditentukan
  database dari `auth.uid()`, tidak menerima owner dari input client. Semua respons
  auth/data private no-store. Nama hanya dijoin oleh teacher UI dari IndexedDB.
- `supabase/migrations/202609290001_teacher_ownership.sql`: hanya `classes` dan
  `students`, FK owner/kelas, unique absen, tanpa kolom nama/nickname. RLS kedua
  tabel membatasi owner serta `is_anonymous=false`; claim hilang ditolak. Board
  anonymous tetap role authenticated, sehingga role saja tidak cukup. Grant update
  tidak mengizinkan pergantian owner, kelas induk, mode atau ID. RPC pembuatan kelas
  + roster SECURITY INVOKER atomik; kegagalan tengah roster menggulung seluruhnya.
  Rollback dev tersedia di `supabase/rollback/`, tidak dijalankan; migration hanya
  diterapkan pada DB uji baru, bukan DB pengguna/production.
- `src/features/guru/{login-form,teacher-workspace}.tsx`: login dan CRUD minimum,
  pilih demo/pilot terpisah tanpa seed/bypass, tampilkan absen/nama lokal setelah
  identitas guru tervalidasi. `src/local/access.ts`: lock lokal lintas tab,
  logout offline dikunci lebih dahulu dan permintaan logout server diteruskan
  saat membuka aplikasi online. Tidak membuat outbox/sync engine.
- `src/features/layar/board-identity.tsx`: anonymous identity dengan cookie
  `pn-board-auth` pada `/api/v1/board`, terpisah dari `pn-teacher-auth`.
  API papan hanya mengembalikan ID/role papan, tidak menukar/mengembalikan sesi guru,
  tidak membaca database nama lokal dan tidak membuat pairing/realtime.
- `tests/harness/*`, `scripts/test-db.mjs`, `supabase/tests/ownership.sql`:
  provider Auth/HTTP khusus tes dengan database PostgreSQL nyata. Query browser
  memakai SET LOCAL ROLE authenticated dan JWT claims; tidak memakai superuser
  untuk operasi resource yang sedang diuji. Role/admin koneksi test hanya untuk
  menyiapkan fixture pada DB loopback bernama `pn_m01c_test`.
  CI memakai service PostgreSQL terpisah; tidak memakai service-role workaround.
  Trace browser dimatikan agar cookie auth tidak masuk artifact.

**Keputusan engineering (K26):** AUTH-001: pin M00-b dipakai tanpa upgrade:
`@supabase/supabase-js` 2.117.2, `@supabase/ssr` 0.12.7, `server-only` 0.0.1
(MIT); SDK hanya di server, tidak menambah SDK auth ke bundle browser. CLI
`supabase` 2.118.0 (MIT) dev-only. Tambah `APP_ORIGIN` kosong di `.env.example`
untuk callback/CSRF konsisten; deployment harus mengisi origin kanonis.
AUTH-002: grant lokal delapan jam adalah lock UI, bukan token atau pengganti RLS;
nama tetap dalam namespace akun/mode dan tidak dipurge ketika logout agar tidak
hilang tanpa sengaja. UI dikunci dan akses perlu login kembali; ini bukan enkripsi
terhadap orang yang menguasai profil browser. Cache hanya shell publik statis,
bukan HTML personal, cookie, API atau respons RSC. AUTH-003: DELETE kelas M01-c
memakai cascade roster dan menghapus mapping nama di perangkat aktif setelah
server sukses. Tombstone/idempotency penghapusan harus ditambahkan sebelum outbox
dan multi-device sync; fitur itu belum ada pada task ini.

API diverifikasi pada dokumentasi resmi
[Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client),
[passwordless](https://supabase.com/docs/guides/auth/auth-email-passwordless),
[RLS](https://supabase.com/docs/guides/database/postgres/row-level-security),
[anonymous users](https://supabase.com/docs/guides/auth/auth-anonymous),
[local config](https://supabase.com/docs/guides/local-development/cli/config)
dan [Next proxy](https://nextjs.org/docs/app/api-reference/file-conventions/proxy);
signature cookie adapter juga diperiksa pada SDK terpasang.

| Command aktual | Exit/status | Hasil aktual |
| --- | --- | --- |
| pnpm add --save-exact @supabase/supabase-js@2.117.2 @supabase/ssr@0.12.7 server-only@0.0.1; pnpm add -D --save-exact supabase@2.118.0 | 0 | Pin baseline; manifest/lockfile diperbarui |
| pnpm exec supabase init | 0 | Konfigurasi local; seed dinonaktifkan dan anonymous Auth diaktifkan |
| Docker Desktop start; docker info; pnpm exec supabase status | environment gap | Docker gagal inisialisasi inference socket; probe menunggu lalu dihentikan, bukan PASS |
| initdb -D .local/m01c-pg -U postgres --auth=trust --encoding=UTF8 --locale=C; pg_ctl start | 0 | Cluster PostgreSQL 17.2 terpisah pada 127.0.0.1:55432; service pengguna 5432 tidak disentuh |
| pnpm test:db:prepare | 0 | Auth fixture test + migration asli diterapkan ke pn_m01c_test |
| pnpm test:integration / pnpm test:rls | 0 | Runner SQL yang sama: 34/34 assertion RLS nyata, bukan dua suite terpisah |
| pnpm install --frozen-lockfile --reporter=append-only | 0 | Install konsisten |
| pnpm format:check; pnpm typecheck; pnpm lint | 0 final | Format, strict TypeScript dan lint lulus |
| pnpm test | 0 | 69/69: 55 regresi M01-a/b + 14 auth/kontrak/ownership |
| pnpm build | 0 | Next production build; /masuk, /guru, /layar + API/auth dan proxy; cache 30 aset/dua shell statis |
| pnpm test:e2e | 0 final | 20/20: 12 regresi M01-a/b + 8 auth/ownership; 0 skipped/flaky |
| pnpm verify | 0 | format, typecheck, lint, unit, integration, build, browser berurutan lulus |
| git diff --check; audit SHA-256 | 0 | Whitespace bersih, 8/8 sumber asli cocok |

**Bukti keamanan:** A/B masing-masing membuat/membaca kelas dan roster. B tidak
mendapat row A, update/delete A tidak mengubah row, insert roster ke kelas A atau
memalsukan owner ditolak; A tetap membaca data utuh. Uji anonim/board gagal
membaca kelas/roster dan membuat kelas; public role tanpa sesi juga ditolak.
Tes memicu kegagalan insert roster kedua dan membuktikan tidak ada kelas/roster
setengah jadi. Browser membuktikan PKCE, session reload, refresh/error cookie,
redirect tanpa sesi/cookie palsu, logout online/offline, pemisahan cookie papan,
CRUD API dua akun, CSRF, extra field, dan canary nama hanya dalam UI guru lokal.
Screenshot `/masuk` dan kelas dengan absen diperiksa langsung tanpa nama anak;
tidak ada runtime page/console error pada flow yang diuji.

**Gap non-blocking:** Docker Desktop 4.78.0 gagal start karena inference manager
socket internal, tidak diperbaiki/reset paksa. Native PostgreSQL 17.2 digunakan
sebagai fallback nyata; HTTP Auth/PostgREST disimulasikan secara eksplisit.
Pengiriman email, verifikasi GoTrue/JWT live, konfigurasi Supabase penuh dan remote
CI **NOT_RUN**. Tetap perlu diuji pada local/dev Supabase ketika tersedia sebelum
mengklaim login demo/pilot nyata lulus. Build tanpa credential bukan bukti auth live.
Warning launcher Node 24.19.0 vs child 24.14.1, NO_COLOR/FORCE_COLOR dan directive
Vite pada fixture tetap non-blocking. Kegagalan awal CSRF karena host internal Next
dan tes respons papan yang tidak dikonsumsi diperbaiki; assertions tidak diturunkan.
Tidak membuat BKT/grouping/scanner, Paket Sesi, pairing penuh, AI atau sync engine.

**TRUE BLOCKER:** tidak ada untuk melanjutkan M02-a.

**Next exact task:** M02-a saja: registry 22 StepId dan target kelas dari sumber,
matematika eksak dan BKT pure menggunakan vektor TECH_SPEC bagian 5, golden numeric
toleransi 1e-9, test CORE01-04 yang relevan, lint/typecheck/build dan regresi M01.
Placement/hysteresis M02-b dan grouping M02-c belum dimulai. Run ini berhenti.

### 9.6 M02-a - Registry dan core matematika deterministik (29 Sep 2026)

**Status:** M02-a DONE, M02 IN_PROGRESS. Base tetap
`47aa60d729b293a53365a780c0d1cd9485ec6f95`; tidak commit/deploy. Implementasi M01,
69 unit dan 20 browser sebelumnya dipertahankan tanpa mengubah assertions.
Hash 8/8 sumber tetap sesuai baseline. Evidence:
[M02-a](artifacts/qa/M02/m02a/README.md),
[verify](artifacts/qa/M02/m02a/verify.log),
[numerik aktual](artifacts/qa/M02/m02a/golden-results.json).

**Implementasi / file penting:**
- `src/content/ladder/{registry,targets}.ts`: satu registry 22 StepId, label/fase
  dan relasi kelas persis tabel PRD; index eksplisit 0-21, metadata immutable.
  Helper parse/isStepId, compare, previous/next, range inclusive dan clamp index.
  Target 1-12 mengikuti tabel sumber; 11-12 bertanda prerequisiteOnly, bukan Fase F.
  Override target hanya primitive tervalidasi, tidak mengubah mastery/history/UI.
- `src/core/math/{probability,rational}.ts`: validasi finite [0,1]; pecahan
  BigInt ternormalisasi gcd/penyebut positif dengan tambah/kurang/kali/bagi/compare
  eksak. Number non-integer/unsafe dan denominator nol ditolak. Ini bukan solver,
  generator soal, AST aljabar atau DTO network.
- `src/core/bkt/{update,observations}.ts`: Bayes posterior lalu transition T,
  default p=.3/T=.1/G=.2/S=.1. Mode regular, lisan tunggal G=.05, ? incorrect G=0
  hanya observasi itu, dan pasangan exit G=.1/S=.2 tepat satu update. `missing`
  menghasilkan pending tanpa belajar; baris konteks adalah observasi regular
  terpisah. ? pada pasangan memakai G=0/S=.2, termasuk posisi alasan menurut K12.
  Input invalid/denominator nol melempar error, tidak menghasilkan NaN diam-diam.
- `src/core/placement/computed-level.ts`: state lengkap 22 peluang, inisialisasi
  .3, threshold tepat >=.8 dan langkah belum kuasai terendah sampai target.
  `{kind:'lanjut'}` tidak punya stepId; computed tidak menjadi displayed/stabilized.
- Lima file unit baru + `tests/fixtures/bkt-golden.ts`; lint core/registry
  mengizinkan modul pure relatif, menolak framework/storage/network serta
  Date/Math.random/crypto. Seluruh runtime app/auth/DB/UI M01 tidak diubah.

**Keputusan engineering (K27):** CORE-001: BKT memakai Number presisi penuh tanpa
pembulatan per update. Toleransi 1e-9 hanya untuk tes referensi, bukan kelonggaran
threshold; 0.7999999999999999 tetap belum kuasai. State parsial/invalid ditolak
agar tidak mengarang mastery. Previous/next di ujung mengembalikan undefined,
range terbalik error, clamp hanya menerima index integer valid. CORE-002: BigInt
hanya di math core; serialisasi pecahan kelak harus mapping eksplisit di adapter,
tidak menambah field ke DTO publik saat ini. CORE-003: binding/ID observasi,
dedup/replay, Cek Awal/Mingguan dan hysteresis tetap M02-b; core pasangan saat ini
hanya mengolah dua hasil penilaian menjadi satu update. Pasangan lisan dan gate
pedagogi K12/K13 tetap belum ditutup.

Coverage M02 memakai `@vitest/coverage-v8` **5.0.2**, peer cocok Vitest 5.0.2,
MIT, dev-only, tidak menambah dependency runtime/bundle aplikasi. API diperiksa
pada [dokumentasi resmi Vitest](https://vitest.dev/guide/coverage.html).
`test`/`test:unit` menjalankan coverage dengan gate 80% statements/branches/
functions/lines untuk core+registry; `verify`/CI otomatis mencakupnya. Tes subset
privasi tetap bisa berjalan tanpa menuntut cakupan modul yang tidak sedang diuji.

| Referensi (dari p=.3 kecuali disebutkan) | Hasil aktual |
| --- | --- |
| Regular benar / salah / ? | 0.6926829268292684 / 0.14576271186440679 / 0.136986301369863 |
| Lisan benar | 0.8967213114754099 |
| Pasangan benar pertama -> pasangan benar kedua | 0.7967741935483871 -> 0.9721922511034822 |
| Pasangan salah / pasangan ? | 0.17826086956521742 / 0.17105263157894737 |
| Pasangan benar -> konteks regular benar | 0.9517241379310345 |

Semua sembilan golden source lulus; galat terhadap referensi yang dicetak paling
besar 4.83e-13, di bawah 1e-9. Oracle integer independen menguji 2.592 kombinasi
p/T/G/S/hasil termasuk denominator nol; 324 pasangan pecahan menguji identitas
aritmetika. Sampel matriks adalah assertion dalam tes, bukan 2.916 test case
terpisah. Prior 7/16 + regular benar menghasilkan tepat .8; di kiri/kanan batas
tetap diklasifikasi sesuai >=.8. Angka ini membuktikan implementasi rumus,
bukan kalibrasi empiris atau validasi dampak belajar.

| Command aktual | Exit | Hasil |
| --- | --- | --- |
| pnpm add -D --save-exact @vitest/coverage-v8@5.0.2 --reporter=append-only | 0 | Tooling coverage terpin, lockfile diperbarui |
| pnpm install --frozen-lockfile --reporter=append-only | 0 | Manifest/lockfile konsisten |
| pnpm format:check; pnpm typecheck; pnpm lint | 0 final | Strict dan dependency guard lulus |
| pnpm test (melalui verify) | 0 | 254/254: 69 lama + 185 baru; 9 file tes |
| pnpm test --reporter=verbose --silent=false --disableConsoleIntercept | 0 | Evidence numerik 9 vektor; 251 tes sebelum 3 kasus batas threshold terakhir ditambah |
| pnpm exec vitest run tests/unit/privacy.test.ts tests/unit/dependency-boundaries.test.ts | 0 | 40/40 subset lulus; tidak diwajibkan menguji core yang tidak dipanggil |
| pg_ctl start cluster .local/m01c-pg pada 127.0.0.1:55432; pnpm test:integration | 0 | Reuse DB uji terisolasi, 34/34 SQL/RLS aktual; tidak mencoba Docker/live Supabase lagi |
| pnpm build | 0 | Production build, /guru dan /layar tetap tersedia; 30 aset cache/dua shell |
| pnpm test:e2e | 0 | 20/20 regresi auth, CRUD, privacy, IndexedDB, offline dan shell; 0 skipped/flaky |
| pnpm verify | 0 final | Format, typecheck, lint, unit+coverage, integration, build, browser berurutan lulus |
| git diff --check; SHA-256 sumber | 0 | Whitespace bersih; 8/8 dokumen sumber utuh |

Coverage tujuh file core/registry: **100%** statements 117/117, branches 63/63,
functions 31/31, lines 105/105. Ini cakupan kode yang diukur, bukan jaminan tidak
ada bug. CORE01 selesai; CORE02/03/04 menunggu M02-b/c sesuai batas task.

**Gap non-blocking:** pola negasi glob lint fondasi sebelumnya menolak impor
relatif antar-core; diperbaiki dengan allowlist pola dan tes regresi tambahan,
bukan suppression. Cast dalam tes input invalid diperbaiki agar strict TypeScript
lulus. Warning launcher Node 24.19.0 vs child 24.14.1, ESLint 9 EOL, warna terminal,
directive Vite fixture dan LF/CRLF tetap non-blocking. Gap Supabase live tetap
NOT_RUN dari M01-c; browser memakai provider uji + RLS PostgreSQL nyata. Tidak
menambah UI, schema, scanner, grouping, rotation, Paket Sesi, realtime atau AI.

**TRUE BLOCKER:** tidak ada.

**Next exact task:** M02-b saja: initial/weekly window sesuai TECH_SPEC 5.3-5.4,
binding pasangan exit, hysteresis dua sesi dan revisi/replay idempoten menurut
5.5-5.6. Gunakan registry/BKT/computed level yang ada; uji CORE02/03 termasuk
missing versus ?, below-range dan scan/koreksi berulang tanpa bukti ganda.
Grouping M02-c belum dimulai. Run ini berhenti.

### 9.7 M02-b - Placement, hysteresis dan replay (29 Sep 2026)

**Status:** M02-b DONE; M02 IN_PROGRESS, M02-c belum dimulai. Base tetap
`47aa60d729b293a53365a780c0d1cd9485ec6f95`; tidak commit/deploy. Delapan sumber
utuh. Audit 86 file baseline: hanya `src/core/bkt/observations.ts` berubah untuk
mengekspor guard `validateAnswer(unknown)` yang sama; rumus/golden M02-a, 254 tes
lama, manifest/lockfile, UI/auth/storage/schema tidak diubah.
Evidence: [M02-b](artifacts/qa/M02/m02b/README.md),
[verify](artifacts/qa/M02/m02b/verify.log),
[coverage](artifacts/qa/M02/m02b/coverage-summary.json).

**Implementasi / file penting:**
- `src/core/placement/windows.ts` dan `initial.ts`: 10 slot Cek Awal eksplisit
  (D5=B4..D5, E4=D1..E4, target pendek mengulang step teratas). Salah/? terendah
  menginisialisasi .85 di bawah dan .3 mulai step itu; below-range terpisah.
  Semua benar menghasilkan Lanjut; initial tidak menjalankan 10 update BKT.
  Cek Mingguan memakai displayed siswa aktif sebelum sesi, tepat 5 step;
  D1=C3..D3, clamp A1, shift kiri dekat E4 dan Lanjut memakai target (K14).
- `src/core/assessment/{binding,revisions}.ts`: binding immutable per siswa,
  sesi, assessment dan question slot. Exit pasangan 1+2 satu observasi pada
  exitBaseStep, konteks satu regular pada exitContextStep; activityStep tersimpan
  terpisah. Logical ID `session/student/assessment/slot` tidak memuat revisi.
  Missing tetap pending; nama/free text/extra fields ditolak oleh allowlist.
- `src/core/placement/{state,teacher-events}.ts`: computed/displayed terpisah;
  initial langsung, sesi eligible finalized berikutnya memakai hysteresis dua
  sesi. D2 lalu D3 memindahkan D1 ke D3; kembali D1 mereset streak. Lanjut union
  tersendiri. Override display segera dengan actor/reason code wajib; group move
  tidak mengubah mastery/displayed. Event dan alasan tersedia pada hasil replay.
- `src/core/placement/replay.ts`: replay pure dari baseline sebelum history;
  canonical order sessionOrdinal -> assessmentOrder -> observationOrder.
  Revisi aktif tertinggi menggantikan kartu lama; duplicate/retry runtuh ke satu
  bukti, koreksi tidak memakai inverse BKT. Late exit mereplay sesi berikutnya;
  finalization hanya satu kandidat per sesi. Engine/BKT config versi 1 eksplisit.
- `src/core/validation.ts`: guard record/ID/placement/mastery pure; tidak ada
  React, DOM, Supabase, network, waktu atau randomness pada engine. Empat file
  tes baru `placement-windows`, `assessment-binding`, `placement-state`,
  `placement-replay` serta `tests/fixtures/placement.ts` memakai ID sintetis.

**Keputusan minimum (K28):** PLACE-001: initial dengan respons missing tetap
pending tanpa anchor sampai lengkap; satu salah pada top berulang cukup. Kelas
tanpa displayed placement aktif ditolak pembuat weekly window, bukan diberi
level rekaan. Below-range bertahan sebagai informasi sampai koreksi anchor/
workflow lisan nanti. PLACE-002: revisi adalah snapshot seluruh kartu (row
missing eksplisit), `baseRevision=revision-1`; adapter kelak menggabungkan delta
scan sebelum memanggil core. Snapshot revisi antara boleh tidak ada, tetapi
payload berbeda pada identity+revision sama ditolak sebagai conflict, termasuk
revisi lama. Binding berubah/slot asesmen ganda juga ditolak. Snapshot sesi
canonical dan teacher event berurutan memakai ordinal/sequence, bukan waktu
arrival. Writer/CAS/outbox dan penyimpanan respons mentah tetap milestone nanti.
PLACE-003: sesi tanpa observasi valid tidak menambah/memutus streak eligible;
open session tidak menambah streak. Manual placement ditahan sampai penutupan
sesi berikutnya, lalu hysteresis normal (TECH_SPEC 5.6 [D]); reason code tertutup
mencegah nama masuk log. Initial anchor harus di sesi pertama history yang
dipasok; caller tidak boleh memakai state hasil replay sebagai baseline history
yang sama. Ini primitive core, bukan UI cek lisan/approval pedagogi.

| Command aktual | Exit | Hasil |
| --- | --- | --- |
| pnpm exec prettier --write (14 file implementasi/tes terkait) | 0 | Hanya file scope M02-b diformat |
| pnpm typecheck (uji pertama) | 2 | Dua masalah tipe fixture tes; diperbaiki lewat discriminant return type dan tabel rows eksplisit, tanpa suppression |
| pnpm lint; pnpm test (uji pertama) | 0 | 401 unit lulus; tabel invalid-row kemudian diperbaiki agar menguji baris, bukan salah bentuk argumen |
| pg_ctl start .local/m01c-pg di 127.0.0.1:55432 | 0 | Reuse cluster uji terisolasi; tidak mengulang Docker/live gap |
| pnpm verify | 0 | Format, strict typecheck, lint, unit+coverage, SQL/RLS, production build dan browser lulus berurutan |
| pnpm test (di verify) | 0 | 401/401 unit: 254 regresi + 147 baru, 13 file; termasuk seluruh golden BKT lama |
| pnpm test:integration (di verify) | 0 | 34/34 assertion PostgreSQL/RLS nyata |
| pnpm build; pnpm test:e2e (di verify) | 0 | Build dan 20/20 browser lulus; 0 skipped/flaky; /guru dan /layar tetap render |
| pg_ctl stop cluster uji | 0 | Hanya cluster loopback milik pengujian dihentikan |
| git diff --check; SHA-256 baseline/sumber | 0 | Whitespace bersih; 8/8 sumber dan 85/86 file baseline identik |

Coverage 15 modul core/registry: **100%** statements 450/450, functions 98/98,
lines 428/428; **99.06%** branches 319/322 (gate 80%). Koreksi A->B = B-only,
retry setelah JSON reload, 24 permutasi arrival dari 3 revisi + sesi berikutnya,
16 kombinasi pasangan exit, seluruh target kelas dan batas A1/E4 terbukti pada
tes. Jumlah permutasi/assertion adalah sampel dalam tes, bukan test case tambahan.

**Gap non-blocking:** K03/K12/K13/K14, adjacency eligible dan durasi override
tetap membutuhkan review sebelum pilot terkait. Full Supabase live tetap NOT_RUN
seperti M01-c; browser memakai provider uji eksplisit + PostgreSQL nyata. Warning
launcher Node 24.19.0 (child 24.14.1), warna terminal dan directive Vite fixture
tidak menggagalkan check. Tidak ada dependency baru atau perubahan fitur UI;
tidak mengklaim pengujian kamera/perangkat/pilot ataupun sync engine selesai.

**TRUE BLOCKER:** tidak ada.

**Next exact task: M02-c saja.** Implementasikan grouping dari displayed
placement: merge bertetangga, kelompok kecil, label seeded serta activityStep /
exitBaseStep / exitContextStep terpisah menurut TECH_SPEC 6.1 dan K04-K06.
Uji fixture D1=7, D2=13, D3=8, D4=4; UI terkait harus membaca hasil engine.
M02-c belum dikerjakan. Run ini berhenti.

### 9.8 M02-c - Grouping (continuous run)

DONE. `src/core/groups/grouping.ts`, `src/core/math/seed.ts`,
`src/content/demo/class-7b.ts`, `tests/unit/grouping.test.ts` ditambahkan.
Occupied bins dari displayed siswa aktif; quota merge pasangan bertetangga
terkecil/tie bawah; small-group merge ke tetangga kecil/tie bawah dan aktivitas
mayoritas/tie bawah. Komposisi, dukungan HP, enrichment Lanjut dan tiga jenis
step terpisah. Manual move hanya membership; binding exit lama tidak disentuh.
Homogen memakai shuffle seeded seimbang sesuai K04. Label stream terpisah;
seed 80 menghasilkan golden 7B Segitiga Biru 7, Lingkaran Oranye 13, Kotak Hijau 12.
Output engine akan dipakai langsung oleh UI integrasi M04, tanpa hardcoded hasil.

Validasi aktual: `pnpm test` exit 0, 423/423 (401 lama +22 baru), termasuk
120 roster property cases dan dua sesi replay yang mengubah distribusi nyata.
`pnpm typecheck`, `pnpm lint`, `pnpm build` exit 0. Evidence log pada
`artifacts/qa/M02/m02c/`; source 00-07 dan regresi lama tidak diubah.
Tidak ada dependency baru. K04/05/06 tetap provisional sebelum pilot; no blocker.
Next exact task M03-a, langsung dilanjutkan sesuai CONT-001.

### 9.9 M03-a - Kartu cetak

DONE untuk implementasi PRELIM. Manifest tunggal `src/cards/layouts/layout-v1.ts`
(mm), drawing SVG/QR, `src/cards/pdf/create.ts`, UI `print-cards.tsx` dan asset
font dari dependency resmi proyek. Cek Awal 2/A4; Mingguan/Keluar 4/A4; 4 marker,
QR jenis/versi saja, absen 01-40, opsi A/B/C/D/?, garis nama kosong, contoh isian.
PDF vektor memakai Atkinson embedded; font cetak masuk manifest offline.
Layout v1 masih kandidat sampai uji cetak/fotokopi/kamera fisik, bukan klaim lulus.

Dependency tepat sesuai TECH_SPEC: pdf-lib 1.17.1 + fontkit 1.1.1 + qrcode 1.5.4
(MIT), jsqr 1.4.0 (Apache-2.0), @types/qrcode 1.5.6 dev (MIT).
PDF/fontkit/QR generator lazy di tombol cetak; jsQR akan di worker client.
API diperiksa hanya pada dokumentasi resmi:
[pdf-lib](https://pdf-lib.js.org/docs/api/classes/pdfdocument),
[node-qrcode](https://github.com/soldair/node-qrcode#createtext-options),
[jsQR](https://github.com/cozmo/jsQR#usage). Tidak ada layanan baru.

Actual: 427 unit PASS, typecheck/build PASS, lint awal menemukan nama variabel
module yang dicadangkan Next, diganti moduleSize lalu lint PASS. Lima browser
(PDF download 3 varian +4 shell) PASS, tanpa pageerror; preview PDF ketiganya
(dirender pdftoppm) dan panel 390px diperiksa visual. Evidence PDF/PNG/log di
`artifacts/qa/M03/m03a/`. Physical print/camera NOT_RUN; tidak menghambat M03-b.
Next exact task M03-b: pipeline OMR lokal/worker, adapter kamera dan fixtures.

### 9.10 M03-b - Pipeline OMR client

DONE. `src/workers/omr/{geometry,scan,worker}.ts`: marker connected components,
rotated-square solidity, homography, projected marker-area consistency, QR kind/
version validation, local white/black normalization, inner-disc bubble sampling,
contrast/blur guard. 0/90/180/270 orientation, ambiguity/multiple/missing handled.
`features/scanner/{acquisition,client,capture}`: rear-camera HTTPS/permission path,
16 MP/16 MB bound, max side 1600, single in-flight transferable frame, stability
across two captures, stop tracks/close bitmaps, photo alternative and manual hook.
No image upload, persistent image or image in worker output. Worker result strict.

QR 18 mm candidate proved fragile under low-resolution perspective. Final demo
candidate is 28 mm at (w-36,9); subpixel rectification plus marker scale rejection
fixes failures without reducing fixtures/assertions. Before-result 933/1000 kept;
final 1000/1000 exact cards, 6004/6004 answers, 1000/1000 attendance on deterministic
synthetic regression set. Not independent physical holdout: 0 real photos.
Final run: warm median 7.79 ms, p95 10.49 ms, max 19.53 ms on this desktop Node;
not HP camera timing. 17 OMR tests PASS; full 1000-case loop is one test.

Actual typecheck/lint/build PASS. Worker 136.92 kB (50.77 kB gzip), cached as static
asset. Browser worker test PASS: printed typography + local PNG path, same pipeline,
offline after reload, no pageerror/image request. Regenerated 3 PDFs/QR checks PASS.
Evidence `artifacts/qa/M03/m03b/`. Camera APIs checked via
[MDN getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)
and [createImageBitmap](https://developer.mozilla.org/en-US/docs/Web/API/Window/createImageBitmap).
Physical print, photcopy, camera lighting and camera permission on actual HP remain
NOT_RUN, not blockers under latest continuous instructions. Next M03-c: durable
responses/outbox, Ganti/Lewati and correction UI feeding existing replay.

### 9.11 M03-c — DONE

- IndexedDB v2 menjaga store siswa v1; respons, event, outbox ditulis atomik. CAS revisi,
  Ganti/Lewati, koreksi manual, error kamera dan reload offline diuji pada Chromium.
- `src/local/assessments.ts`, `src/contracts/assessment.ts`, `src/core/assessment/card-response.ts`,
  `src/features/session/*`, `src/content/demo/weekly.ts` menghubungkan jawaban ke replay produksi.
  Seed demo hanya kelas demo 32 siswa; 29 respons simulasi, 07/12/25 tidak dipreload.
  Kunci dari template versioned draft; tepat lima respons D1.2; tidak mengklaim review pedagogi.
- Validasi aktual: 6 unit baru PASS; typecheck/lint/build PASS; 2 Playwright PASS (migrasi,
  duplicate/CAS, rollback outbox, koreksi, fallback manual, reload dan scan offline).
  Evidence `artifacts/qa/M03/m03c/`; screenshot mobile diperiksa.
- Keputusan: kontrak boleh memakai validator core murni/registry agar frozen binding tidak
  diduplikasi; larangan UI/storage/network/nama tetap berlaku. Outbox durable belum sync engine.
- Foto kartu nyata/90 foto/print/fisik HP NOT_RUN: perangkat belum tersedia. Matriks sintetis
  1.000/1.000 M03-b bukan klaim akurasi nyata. Tidak ada TRUE BLOCKER untuk M04.
- Next exact task: M04-a pairing, projection allowlist, epoch/revision/ACK dan recovery.

### 9.12 M04-a — DONE

- Pairing HTTP + PostgreSQL RPC: kode kriptografis 6 digit, HMAC server, TTL 5 menit,
  single-use, shared rate limit per aktor/IP bucket, kelas/sesi owner-bound dan identitas
  papan anon terpisah. Namespace private tidak dapat dibaca langsung oleh client.
- State publik strict TS + SQL; private Realtime SELECT hanya exact topic/epoch anggota,
  tidak ada izin client publish state. CAS revision, ACK, revoke/epoch dan snapshot recovery.
  Adapter lokal memakai endpoint snapshot yang sama, bukan WebSocket palsu.
- PASS: 9 unit envelope/privacy; 32 SQL pairing/Realtime + 34 SQL ownership lama;
  1 Playwright HTTP dua context; typecheck/lint/build. Evidence `artifacts/qa/M04/m04a`.
- Dokumen resmi yang diperlukan: https://supabase.com/docs/guides/realtime/authorization
  dan https://supabase.com/docs/guides/realtime/broadcast. Tidak ALTER RLS tabel managed Realtime.
- Gap: live Supabase WebSocket/provider NOT_RUN. Deployment perlu secret PAIRING_SECRET
  dan Realtime public access dimatikan; IP header harus berasal proxy tepercaya. Tidak deploy.
  Durasi/langganan bukan hasil ukur HP fisik. TRUE BLOCKER: tidak ada.
- Next exact task: M04-b UI pairing/mode kelompok, reducer dan interaksi Garis Bilangan/lift.

### 9.13 M04-b — DONE

- UI guru mengklaim kode papan, menunggu ACK, menerbitkan mode/soal dan revoke.
  Papan menampilkan Pairing, Pembuka, Cek Level, Lanjutan, Kelompok, Stasiun,
  scaffold Kartu Keluar, dan Refleksi. Paket exit penuh tetap M10, tidak disamarkan.
- Garis Bilangan/lift: reducer rasional murni, drag/keyboard/lompatan, undo/reset,
  check urutan/arah/model (bukan hanya label angka). Tepat −3−5=−8 dan −2→5=7.
  Kelompok datang dari projection engine; Atkinson dan warna grup token sumber.
- PASS 8 unit alat + Playwright dua context (pair/ACK, 3 scan piksel, kelompok,
  lift, Garis Bilangan, drag dan undo); typecheck/lint/build. Bukti `artifacts/qa/M04/m04b`.
  Pemeriksaan browser menemukan line-height warisan guru terlalu rapat; diperbaiki pada
  surface papan dan uji browser diulang PASS. Ukuran objek papan >=88 px diverifikasi.
- TRUE BLOCKER tidak ada. Tes sentuh/kamera fisik dan live WebSocket tetap NOT_RUN.
- Next exact task M04-c: recovery/disconnect, cache worker/tool/font dan regression dua context.

### 9.14 M04-c — DONE

- Dua context browser membuktikan ACK, disconnect papan, manipulasi lokal saat offline,
  teacher publish saat papan offline, recovery snapshot terbaru, dan reload offline tanpa
  roster papan dipulihkan. Cache meliputi semua lazy tool chunks, worker OMR dan font lokal.
- Ledger command SQL menjaga idempotency melintasi revisi berikutnya: retry lama mengembalikan
  snapshot canonical; reuse commandId dengan payload/base revision berbeda ditolak.
- `pnpm demo` menjalankan Next + adapter Auth/HTTP loopback dan PostgreSQL uji nyata.
  `/demo`/`/auth/demo` hanya aktif dengan flag eksplisit dan origin/provider loopback tepat;
  login tetap melalui PKCE normal. Tidak mengirim email, tidak mengakses credential live.
- PASS 35 SQL pairing + 34 ownership, 3 tes browser akhir (flow disconnect, login demo,
  HTTP pairing) serta 7 shell/offline regression pada run sebelumnya; typecheck/lint/build.
  Launcher `pnpm demo --smoke` PASS. Evidence `artifacts/qa/M04/m04c/`.
- Perbaikan aktual: Next memakai hostname URL internal berbeda; gate adapter sekarang
  memeriksa Host loopback dan origin/provider yang dikonfigurasi, bukan hostname internal.
  Tes channel membuktikan adapter snapshot dipilih, tidak mengaku WebSocket live.
- Full controller takeover/remote pointer, giliran/scheduler, exit paket dan ink refleksi
  tidak diklaim selesai; modul terkait tetap milestone selanjutnya. Tidak ada TRUE BLOCKER.
- Next exact task: M05-a reset deterministik + gladi PRELIM, lalu M05-b full verify/evidence.

### 9.15 M05-a — DONE; M05-b validasi akhir berjalan

- Reset demo diuji dua siklus: 29 respons awal, 07/12/25 belum masuk; 3 scan piksel
  menghasilkan 32 kartu/160 observasi. Reset membuat sesi baru, event/outbox kembali
  29, kelompok kedua identik 7/13/12 dan tepat lima pengecoh D1.2.
- Gladi PRELIM dua context melewati Pembuka lift, Cek Level, Lanjutan, tiga scan,
  Kelompok, Garis Bilangan, pratinjau exit dan Refleksi. 2 Playwright PASS.
- Rekaman `artifacts/qa/M05/prelim-7b-synthetic.webm`: kode pasangan ditutup CSS QA
  sebelum render; hanya layar publik dan data sintetis. Screenshot dan metrik aktual
  pada direktori yang sama; sample gladi 1, bukan pengukuran HP/kamera fisik.
- Next exact action: full install frozen, format/typecheck/lint/unit/build/e2e/verify,
  pemeriksaan hash 8 sumber dan diff; kemudian handoff M06-a jika lulus.

### 9.16 M05-b — DONE; handoff PRELIM lokal

- Seluruh command wajib aktual exit 0: `pnpm install --frozen-lockfile`,
  `pnpm format:check`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`,
  `pnpm test:e2e`, `pnpm verify`, `git diff --check`. Log/exit/timing:
  `artifacts/qa/M05/validation-results.json`; verify akhir juga mengulang SQL/build/browser.
- Hasil akhir 468 unit, 29 browser/E2E, 69 SQL (34 ownership + 35 pairing/Realtime).
  Coverage core/registry: 99.83% statements, 99.03% branches, 100% functions/lines.
  BKT golden, 22 registry, placement/hysteresis/replay, auth, RLS, nama lokal dan offline
  baseline tetap hijau. Browser `/guru`, `/layar`, `/demo` serta integrated 7B dibuka nyata.
  Gladi akhir: tidak ada uncaught error maupun console error; metrik desktop/sample=1
  ada di rehearsal-results.json dan tidak digeneralisasi menjadi hasil HP.
- Full browser run pertama menemukan heartbeat ACK usang berbalapan dengan publish:
  respons 409 memicu console error. Diperbaiki menjadi receipt `{applied:false}` tanpa
  memperbarui ACK/revisi; SQL tetap menolak ACK usang. Tes tidak dilonggarkan. Run penuh
  dan verify kemudian PASS; evidence kegagalan pertama tetap disimpan.
- 1.000/1.000 kartu sintetis tepat, 6.004/6.004 jawaban dan 1.000/1.000 absen pada matriks
  regresi. Ini kalibrasi sintetis desktop, bukan akurasi lapangan/holdout fisik. Layout PDF
  tiga jenis, worker dan font cached; raw foto, nama dan goresan tidak masuk network/cache.
- Evidence: screenshot 390x844 dan 1920x1080, rekaman gladi sintetis dengan kode pairing
  disembunyikan, reset-results, coverage, SQL, source-hashes (8/8 identik), manifest dan
  checkpoint hash file. Base git tetap `47aa60d729b293a53365a780c0d1cd9485ec6f95`;
  tidak membuat commit yang menyertakan seluruh implementasi baseline untracked pengguna.
- Backup DB uji sintetis tersimpan lokal di `.local/prelim-local-test-backup.dump` (exit 0),
  tidak diunggah. Recipe rollback M04 tersedia dan tidak dieksekusi; tidak ada migration
  production, publish staging, email nyata, API berbayar atau perubahan sumber 00–07.
- Warning non-blocking: launcher pnpm Node 24.19.0, child runtime terverifikasi 24.14.1;
  Vite mengabaikan `use client` hanya saat membundel fixture browser; NO_COLOR/FORCE_COLOR.
  Nama/db sesi terpisah demo/pilot; reset sesi saat ini lokal, akhiri sambungan papan dahulu.
- NOT_RUN: cetak/fotokopi fisik, 90 foto kartu/HP nyata/multitouch, GoTrue/PostgREST/Realtime
  live, staging HTTPS, review pedagogi dan izin pilot. Tidak mengklaim 13 fitur final selesai.
  Paket exit penuh, giliran/rotasi, takeover/remote pointer dan sync penuh tetap milestone
  berikutnya. Delete/tombstone sesi offline mengikuti M11, bukan penghapusan cloud lengkap.
- TRUE BLOCKER: tidak ada. **Next exact task: M06-a** (template versioned, exact solver,
  pengecoh/alasan dan metadata review yang jujur). Berhenti; jangan mulai M06 pada run ini.
- Pemeriksaan startup terakhir dilakukan setelah PostgreSQL dihentikan. Launcher sekarang
  menentukan port 55432 dan bind loopback secara eksplisit; `pnpm demo --smoke` berhasil
  memulai DB/aplikasi, membuka /demo (HTTP 200), lalu menghentikan proses miliknya. Lint
  dan format script launcher PASS sesudah penyesuaian ini; kode aplikasi tidak berubah.
  Semua server uji sudah dihentikan. Warning normalisasi LF→CRLF Git bersifat non-blocking.

### 9.17 Pemulihan akses demo lokal — DONE

- Penyebab `/demo` tidak terbuka: server dihentikan sesudah validasi 9.16; tidak ada
  listener pada 3100/54325/55432. Menjalankan `pnpm demo` dalam proses Windows tersembunyi
  dan membiarkannya aktif untuk pengguna, memakai build serta database uji yang sudah ada.
- Verifikasi aktual: HTTP `/demo` 200; Chromium membuka `/demo`, tombol Masuk demo lokal
  berhasil menuju `/guru`, dan `/layar` render. Tidak ada console error atau uncaught error.
  Ketiga layanan hanya bind ke 127.0.0.1. Evidence: `artifacts/qa/M05/local-demo-recovery.json`.
- Tidak mengubah kode aplikasi atau membuat kelas/data siswa. Full suite tidak diulang
  karena ini pemulihan proses; `git diff --check` PASS. TRUE BLOCKER: tidak ada.
  Next exact task tetap M06-a; tidak dimulai pada tindak lanjut ini.

### 9.18 M06-a — DONE; lanjut M06-b

- `src/content/templates/*`, `src/core/package/question.ts`: 22 template versioned,
  solver rasional/aljabar/himpunan eksak, empat pilihan unik, alasan terpetakan, hash
  konten deterministik, seed eksplisit. Semua konten draft/reviewer null (K19).
- `src/contracts/package.ts` memproyeksikan soal publik field-per-field; tanpa StepId,
  kunci, metadata diagnosis atau identitas. Guard lint pure diperluas ke semua konten.
- PASS: 25 tes konten meliputi 500 seed × 22 template = 11.000 instance; gabungan
  konten/privacy/core boundary 64 tes. `pnpm typecheck`, `pnpm lint`, `pnpm build`
  exit 0. Log di `artifacts/qa/M06/m06a-{content,tests,build}.log`.
- Failure awal validasi parameter D5 menolak konstanta negatif; diperbaiki pada validator,
  lalu seluruh 500 seed/step dan unsigned seed maksimum lulus. Assertion dipertahankan.
- Cakupan satu template per langkah bukan klaim seluruh variasi kurikulum; alat K01
  tetap unavailable bila belum diimplementasikan. Tidak ada TRUE BLOCKER coding.
- Next exact task M06-b: paket initial/weekly/oral/short, cache/pratinjau dan ganti soal.

### 9.19 M06-b — DONE; lanjut M06-c

- Paket initial/weekly/oral/short mengikuti rentang K02, 2 tugas papan SD/3 lainnya,
  3 mandiri wajib + 1 boleh, contoh guru, konteks sumber, exit dan alasan. Parameter exit
  direservasi sebelum stasiun agar domain terbatas seperti A4 tetap punya variasi terpisah.
- IndexedDB data v3 menambah packages, CAS revisi dan frozen guard; pratinjau/ganti satu
  soal offline di `features/package`. Kontrak paket papan memetakan allowlist eksplisit.
- PASS: 38 tes konten/paket (termasuk 500 paket domain kecil), typecheck, lint, build,
  2 browser (cache/reopen/CAS/frozen/tenant dan prepare/replace/reload offline). Screenshot
  HP diperiksa; tidak ada runtime/console error pada run akhir. Evidence M06/m06b-*.
- Tes awal menemukan request daftar kelas saat pilihan mode berubah offline; diperbaiki
  agar membaca paket lokal tanpa request sia-sia. Satu kegagalan startup terpisah karena
  test runner dan launcher berebut port; readiness kini diperiksa sebelum reuse adapter.
  Reuse hanya opt-in lokal; default CI tetap server terisolasi milik runner.
- Batas: draft tidak layak pilot, variasi A4 terbatas (ganti ditolak jika tidak ada parameter
  baru yang aman), preview gap K01 eksplisit. Tidak ada TRUE BLOCKER coding.
- Next exact task M06-c: 23 kartu Bisik draft, fallback, cetak mandiri dan CSV lokal.

### 9.20 M06-c — DONE; M06 software selesai, lanjut M07-a

- `content/strategies/registry.ts`: tepat 23 kartu sumber (18 D + 5 SD), masing-masing
  3 pemantik/peragaan/cek cepat terhitung dan fallback tanpa diagnosis. Semua draft.
- `features/guru/local-{csv,roster}`, `local/names.saveMany`: impor CSV atomik dengan
  absen diketahui/unik, UTF8/quoted field, edit/hapus nama lokal; tidak ada upload CSV.
- `features/package/independent-pdf.ts`: cetak mandiri 3 wajib + 1 boleh, gambar SD awal,
  tanpa identitas/kunci. Font dan lazy chunk terbukti tersedia offline lewat browser.
- Tambahan audit konten: soal Cek Awal pada langkah teratas kini memakai parameter unik;
  A4 juga memodelkan setengah/seperempat kumpulan benda ≤20 (draft K19). 500 seed untuk
  tiap kelas 1/2/3 membuktikan tidak ada pengulangan. Domain/retry tetap dibatasi.
- PASS full unit 544 (sebelum 3 tes edge baru), coverage core statements 99.31%, branches
  97.71%; 41 tes konten/paket setelah edge fix; typecheck/lint/build akhir exit 0.
  PASS 11 browser: 4 paket/CSV/cetak/Bisik + 5 privasi + 2 PRELIM 7B. Tidak melemahkan
  assertion; screenshot HP diperiksa. PDF/log/screenshot/metrics di `artifacts/qa/M06/`.
- Batas: konten masih subset draft per langkah; bukan klaim kurikulum lengkap. Review
  pedagogi, cetak fisik, perangkat dan provider live tetap NOT_RUN/NEEDS_REVIEW.
  Tidak ada TRUE BLOCKER coding. Next exact task: M07-a.

### 9.21 M07-a — DONE; lanjut M07-b

- `core/oral/state.ts`, `contracts/oral.ts`, `local/oral.ts`, UI pada boundary guru:
  pencarian naik/turun, A1/target, Benar/Salah/Diam, diagnosis dari pengecoh yang terpetakan,
  skip/resume, undo dan replay BKT G=.05. Placement oral/override K13 terpisah dari mastery.
- IndexedDB v4 menyimpan oral dan pointer record terakhir secara atomik/CAS; baseline
  run tidak dapat ditimpa. Nama di-join hanya pada `features/guru/oral-workspace.tsx`.
  Mulai pemeriksaan draft dibatasi mode demo; pilot tetap menunggu review nyata.
- PASS 28 unit oral/privacy, typecheck/lint/build; 2 browser oral + 4 browser paket
  regression. Reload offline sesudah receipt tersimpan mempertahankan jawaban/skip;
  koreksi tetap dua observasi, bukan tiga. Screenshot HP diperiksa, tanpa console/runtime
  error. Tes pertama reload sebelum receipt skip; ditambah assertion receipt sebelum
  reload, assertion setelah reload tetap dipertahankan. Evidence `artifacts/qa/M07/`.
- Perbaikan terkait: cache paket terakhir memakai pointer tersimpan, bukan urutan UUID.
  Benchmark 1 menit/siswa, review pedagogi K13 dan tes siswa tetap NOT_RUN.
  Tidak ada TRUE BLOCKER. Next exact task M07-b: edge placement/lifecycle regression.

### 9.22 M07-b — DONE; lanjut M08-a

- PASS 192 tes placement/window/binding/replay/oral: semua benar, top berulang,
  missing, E4, late exit, koreksi idempotent dan override terpisah dari mastery.
- Paket mingguan kelas 1–3 tidak membuat cek massal; placement oral yang selesai
  dipakai untuk paket berikutnya. Incomplete/skip/inactive tidak menjadi bukti.
  `features/oral/package-placement.ts` menggabungkan hasil tanpa membawa nama.
- PASS 26 tes paket/oral termasuk tiga jenjang mingguan lisan; typecheck/lint/build;
  6 browser paket/oral dengan IndexedDB nyata, offline reload dan bridge placement.
  Evidence `artifacts/qa/M07/{lifecycle-regression,package-oral-tests,m07b-build,m07b-browser}.log`.
- K03/K12/K13 tetap NEEDS_REVIEW; revisi historis lintas sesi setelah cek lisan
  ditangani timeline/reconciliation M11, bukan menimpa baseline oral yang dibekukan.
  Tidak ada TRUE BLOCKER. Next exact task M08-a.

### 9.23 M08-a — DONE; lanjut M08-b

- `core/stations/rotation.ts`: tabel 1–4 kelompok, budget/initial/cadangan/short,
  jeda termasuk akhir, +180 detik, transisi eksplisit. Timer monotonic selama aktif;
  reload memakai deadline tersimpan, waktu habis tetap menunggu keputusan guru.
- `features/stations/*`, IndexedDB v5/CAS, proyeksi publik timer/stasiun dan Bisik
  kelompok Guru berdasarkan diagnosis tersedia. Layout rotasi papan sudah terhubung;
  isi tugas/model dinamis menyusul M09/M10 sesuai scope. Sesi 7B baseline tetap ada.
- Migration 004 hanya memperluas allowlist; membership/Realtime/RLS/ledger tetap.
  Backup DB uji `.local/pre-m08-test-backup.dump`; rollback recipe dalam migration.
  Harness migration kini punya digest ledger agar migration baru tidak terlewat.
- PASS 42 unit terkait, typecheck/lint/build; 76 SQL (34 ownership, 35 pairing,
  7 station guards); 3 browser (rotasi dan 2 PRELIM). Screenshot papan diperiksa,
  tanpa runtime/console error. Evidence `artifacts/qa/M08/m08a-*`, `rls.log`.
  Physical latency/multitouch NOT_RUN. Tidak ada TRUE BLOCKER. Next M08-b.

### 9.24 M08-b — DONE; lanjut M08-c

- `core/turns/scheduler.ts`: least turns per peran + seeded tie, hadir/opt-out,
  tim seimbang dibekukan saat actual-start, A/B/A untuk tiga tugas (A/B pada SD).
  Pratinjau tidak dihitung. Event unik dan task identity menolak duplikasi/konflik.
- IndexedDB v6 menyimpan ledger per kelas/semester, CAS dan prefix history immutable;
  proyeksi roles hanya nomor absen/task UUID. Migration 005 memeriksa keanggotaan grup
  papan, duplikasi peran dan allowlist, tanpa mengubah RLS. Backup uji pre-m08b tersedia.
- PASS 19 unit rotasi/giliran/simulasi, typecheck/lint/build, 80 SQL (34+35+11),
  2 browser aktual. Checkbox preferensi kini langsung merespons dan rollback bila save
  gagal; failure pertama dipertahankan. Latensi command desktop loopback 871 ms n=1,
  bukan benchmark perangkat. Evidence M08/m08b-*, command-latency.json.
- Simulasi 500 kelas/32 siswa/7-13-12/5% absen/3 tugas + Pembuka: dua Pilot,
  tiga sesi 487/500 kelas (97,4%); satu Pilot, empat sesi 386/500 (77,2%). Denominator
  semua 32 terdaftar; bukan hanya eligible. Angka satu sentuhan sumber tidak disalin.
  Trial awal 90,2% mengungkap pembagian tim menumpuk siswa belum terlayani; prioritas
  dibagi mengikuti kapasitas A/B/A 2:1, bukan menurunkan assertion 95%.
- UI default satu Pilot sampai hasil kemampuan dua sentuhan tersedia M12. Pemilihan
  Pembuka memakai core yang sama; integrasi Pembuka M10. Tidak ada TRUE BLOCKER.
  Next exact task M08-c.

### 9.25 M08-c — DONE; M08 software selesai, lanjut M09-a

- `core/stations/hold.ts` mencari permutasi jadwal sisa dengan perubahan minimum,
  kunjungan Guru/Papan tepat sekali dan tanpa collision. Konfirmasi mengecek ulang
  revisi dan preview; history/prefix putaran dibekukan juga pada repository.
- Semantik K07 eksplisit: menahan Mandiri bisa aman pada empat kelompok; mengulang
  Guru/Papan atau memaksa semua kunjungan masuk waktu yang tidak cukup ditolak.
  UI menawarkan +3 menit seluruh putaran/akhiri tugas. Tidak mengaku hold bebas.
- Timer memakai estimasi offset HTTP Date midpoint RTT, monotonic selama tampilan
  aktif, deadline cache setelah reload; timer nol tidak pernah mengubah mode/reveal.
- PASS 25 unit hold/rotasi/roles, typecheck/lint/build/format/diff; 7 browser akhir
  (5 privasi + 2 stasiun), termasuk CAS history hold aman pada IndexedDB nyata.
  Source table/7B regression 3 browser sebelumnya tetap PASS, 80 SQL M08-b PASS.
  Evidence `artifacts/qa/M08/m08c-*`. Perangkat fisik/K07 review tetap NOT_RUN.
- Tidak ada TRUE BLOCKER. Next exact task M09-a: model Batang Pecahan dan parameter
  generator yang penyebut samanya dapat dirender benar, lalu rasio/aljabar/pola.

### 9.26 M09-a — DONE; lanjut M09-b

- `core/tools/fractions.ts`, `features/tools/fractions.tsx`: model berwarna, pembagian
  2–12, kesetaraan, signed fractions, dua utuh hasil, penyebut bersama, drag banding,
  undo/reset dan exact model check. Tidak menilai jawaban akhir saja; model 2/5
  untuk 1/2+1/3 ditolak dengan umpan balik netral.
- Pratinjau guru tersambung ke `/layar` melalui allowlist tool matematika + migration
  006 (backup pre-m09a dan rollback recipe). Tidak membawa StepId/kunci/identitas.
  Paket menandai alat pecahan tersedia; penautan tugas paket/rotasi penuh M09-c/M10.
- Generator C3/D2 v2 membatasi LCM≤12 dan menambahkan pecahan bertanda pada D2.
  Metadata/template/question ID baru; cached v1 tetap dibaca. Oral schema v1 dipin
  pada generator v1 agar jawaban lama tidak berubah makna. Semua masih draft K19.
- PASS 56 unit konten/paket/oral/pecahan, typecheck/lint/build, 88 SQL (34+35+11+8),
  3 browser pecahan+oral dan ulang 1 browser sesudah penyelarasan batang. Screenshot
  diperiksa: satu utuh 1060 px sebelum/sesudah; sel terkecil 88×88 px; operasi offline
  dan undo bekerja tanpa runtime/console error. Evidence `artifacts/qa/M09/m09a-*`,
  `fraction-unit-final.log`, `fraction-browser.json`, `fractions-board.png`.
- Batas sentuhan/latensi fisik tetap NOT_RUN. Tidak ada TRUE BLOCKER. Next M09-b.

### 9.27 M09-b — DONE; lanjut M09-c

- `core/tools/{ratio,algebra}`, UI alat dan public tool allowlist: pengali eksak
  di kedua baris, edit nilai, kelompok distributif, ubin bertanda, pasangan nol,
  drag/ketuk, undo/reset dan model check. Total benar dengan kelompok keliru ditolak.
- Migration 007 memperluas descriptor matematika tanpa membuka field identitas/
  kunci; backup DB uji pre-m09b tersedia. Keempat alat awal kini tersedia di katalog.
- PASS 10 unit alat, typecheck/lint/build, 94 SQL guards; 2 browser alat termasuk
  regresi pecahan. Screenshot rasio/aljabar diperiksa, model/undo offline bekerja,
  tanpa runtime/console error. Evidence `artifacts/qa/M09/m09b-*` dan screenshot.
- Batas: pengali rasio UI belum drag (input/tombol tersedia); model belum ditautkan
  ke seluruh tugas paket. Integrasi pola/paket mengikuti M09-c/M10. Perangkat fisik
  NOT_RUN. Tidak ada TRUE BLOCKER. Next exact task M09-c.

### 9.28 M09-c — DONE; lanjut M10-a

- `core/tools/{patterns,pointers}`, `features/tools/activity`: tujuh perilaku di
  atas reducer yang sama; prediksi dibandingkan dengan hasil model, contoh kembar
  30 detik/replay tanpa menghapus pekerjaan, tiga petunjuk, Nala 2/5–6:7–3x+4,
  model terpisah Berdua dan deduplikasi jawaban numerik Tantangan Terbuka di RAM.
- Garis Bilangan kini menerima descriptor rasional, lompatan pecahan, zoom dan
  inverse koordinat SVG; rasio mendukung pengali drag dan rentang unit-price.
  Model/petunjuk tidak menjadi asesmen. Berdua default bergantian sampai M12.
- PASS 31 unit terkait, typecheck/lint/build/format/diff; 102 SQL (34+35+11+22),
  3 browser aktual pola/rasio/aljabar/pecahan. Screenshot diperiksa; contoh offline
  dan dua kontak emulasi bekerja. Evidence `artifacts/qa/M09/m09c-*`,
  `pattern-browser.json`, `open-pattern.png`. Durasi contoh memakai virtual clock;
  kontak emulasi bukan bukti multitouch fisik. Layar panjang/scroll belum dipoles.
- Tes browser pertama menemukan CHECK tabel terikat OID validator lama setelah
  rename: migration 009 mengikat validator terkini, tes SQL memeriksa ikatannya.
  Failure awal disimpan; migration yang sudah diterapkan tidak ditulis ulang.
  UI tidak lagi mengaku publikasi berhasil jika perintah ditolak.
- Tidak ada TRUE BLOCKER. Integrasi tugas paket/rotasi dan fresh-class ada di M10;
  review konten/perangkat tetap NEEDS_REVIEW/NOT_RUN. Next exact task M10-a.

### 9.29 M10-a — DONE; lanjut M10-b

- `core/package/opening`, `contracts/lesson`, `features/opening`: konteks katalog,
  tujuan lintas mode, lanjutan, intuisi SD tanpa meminta hitungan; Lihat Dulu untuk
  tugas SD memakai pola M09 (penautan paket otomatis di M10-c). Preview SD5/SMP7/SMA10;
  model grafik konteks SMA mengikuti M14, belum diklaim interaktif.
- `TurnControls` menerima seluruh roster untuk Pembuka, satu actual-start dengan
  ledger semester yang sama. Peran publik hanya absen. `features/reflection` memakai
  tiga kalimat sumber dan canvas RAM saja; clear pada mode/epoch, pagehide, revoke,
  akses lokal terkunci dan unmount. Refleksi kelas 1–3 lisan tanpa zona tulis.
- PASS 21 unit terkait, typecheck/lint/build/format/diff, 108 SQL (34+35+11+22+6),
  3 browser PRELIM/classroom dan 1 browser OPEN01/PRIV02. Screenshot canvas kosong
  diperiksa. Tidak ada ink dalam evidence; storage-write/request saat menggambar=0.
  Evidence `artifacts/qa/M10/m10a-*`, `opening-privacy.json`, `reflection-blank.png`.
- SQL pertama menemukan alias variabel validator ambigu; diperbaiki migration 011,
  tanpa mengubah migration terpasang. Browser memisahkan HTTP403 sesudah revoke
  (penolakan RLS yang diharapkan) dari error runtime/console saat alur aktif (0).
  Assertion tetap memeriksa penolakan akses, clear goresan, storage dan jaringan.
- Tidak ada TRUE BLOCKER. Semua konten masih draft; perangkat/pedagogi tetap
  NOT_RUN/NEEDS_REVIEW. Next exact task M10-b.

### 9.30 M10-b — DONE; lanjut M10-c

- `core/assessment/exit`, `contracts/exit`, IndexedDB v7 dan `features/exit`:
  binding beku per kelompok K05, ID alasan tersendiri, dua observasi per kartu
  (satu pasangan + konteks), pasangan lisan kelas 1–3 satu observasi provisional.
  Check/exit memakai logical session sama; child record terpisah. Denominator HP
  memisahkan missing dari ?, diagnosis hanya kode yang tersedia di konten.
- PASS 142 unit terkait, typecheck/lint/build/format/diff; 118 SQL (34+35+11+22+6+10);
  4 browser (2 exit + 2 assessment regression) termasuk koreksi offline, reopen,
  CAS, allowlist dan tiga baris di papan tanpa level/kunci. Screenshot diperiksa.
  Evidence `artifacts/qa/M10/m10b-*`, `exit-browser.json`, `exit-board.png`.
- Migration 012 menambah validator public question/exit; backup lokal pre-m10b.
  Tes diagnosis pertama memakai C3 tanpa kode terpetakan; diperbaiki dengan kasus
  D1.2 yang memang ada, tanpa mengarang diagnosis atau melemahkan assertion.
- Gap non-blocking: tiga panel exit masih scroll; layout split final M14. Penautan
  paket sesi/finalisasi dan lifecycle child record dilanjutkan M10-c/M11.
  Font/bundler test-adapter warning tetap non-blocking; kamera fisik NOT_RUN.
  Tidak ada TRUE BLOCKER. Next exact task M10-c.

### 9.31 M10-c — DONE 30 Sep; M10 software selesai, lanjut M11-a

- `core/session/cycle`, `local/cycles` (IndexedDB v8), `package-session`,
  `cycle-workspace`: sesi dari paket beku tanpa jawaban/placement preload,
  kehadiran dan kelompok beku, logical timeline check+exit, kelas ditutup terpisah
  dari finalisasi; koreksi final menaikkan revisi dan me-replay sesi yang sama.
  PRELIM tetap terpisah; paket awal tidak boleh dipakai ulang sebagai sesi kedua.
- Papan menerima proyeksi paket/check/aktivitas eksplisit (migration 013), sepuluh
  baris awal, timer tanpa auto-next, tugas paket sesuai parameter, Mandiri dan
  actual-start giliran. Tambah waktu mempertahankan model. Exit memakai paket
  sesi beku, bukan paket terbaru yang mungkin sudah berubah.
- PASS `pnpm test`: 622/622, coverage 94.8% statements, 91% branches; typecheck,
  lint, build, format:check, diff:check. PASS 135 SQL dan 15 browser: fresh-class
  32 siswa (31 A5 foto sintetis + 1 tidak hadir), tiga putaran/sembilan tugas,
  31 exit termasuk satu sesudah kelas ditutup, finalisasi, reload, sesi kedua;
  14 regresi assessment/exit/oral/paket/PRELIM/stasiun. Runtime/console error akhir 0.
  Evidence `artifacts/qa/M10/m10c-*`, `freshclass-browser.json`,
  `freshclass-commands.json`, `fresh-station.png` (diperiksa).
- Failure awal disimpan: respons checkbox asynchronous diperbaiki dengan rollback;
  snapshot controller lama sesudah await kini diganti referensi revisi terkini dan
  guard publish. Full unit awal timeout akibat CPU contention; maxWorkers=2,
  assertion/sample count/timeout tetap. Backup DB uji pre-m10c tersedia.
- Batas: foto sintetis bukan kamera fisik; layout panjang/split final M14. Tugas
  dengan alat belum didukung diberi label, tidak diganti soal lain (K01).
  Replay oral lintas sesi/koreksi historis, sinkronisasi cloud dan tombstone M11.
  Konten tetap draft NEEDS_REVIEW; tidak ada TRUE BLOCKER. Next exact task M11-a.

### 9.32 M11-a — DONE; lanjut M11-b

- Kontrak `contracts/sync{,-package}.ts`: allowlist bertingkat; paket berupa ID,
  StepId dan seed/version, tanpa prompt bebas, nama, foto, key atau mastery client.
  Adapter `features/session/sync-replay.ts` menghidrasi binding/soal dan menilai
  ulang dengan core yang sama; finalisasi mereplay seluruh urutan sesi.
- [D] Tabel logis sesi/paket/binding/respons digabung sebagai dependency group
  atomik per sesi (TECH_SPEC 10.1 mengizinkan penggabungan). Endpoint `/api/v1/sync`
  menerima maksimum 50 mutation/256 KiB; client mengirim satu dependency group
  per request. SQL memeriksa parent ordinal, owner, UUID roster, frozen package,
  revisi respons, device/epoch, hash payload dan receipt unik owner/event.
- Migration `202609300014_sync.sql` diterapkan pada PostgreSQL loopback setelah
  `.local/pre-m11a-test-backup.dump`. RLS/grants private tetap tertutup; RPC sempit
  memakai claim guru dan owner. JSON schema allowlist di SQL digenerate dari Zod
  sebelum migration diterapkan. Class tombstone mencegah retry/resurrection dan
  cascade membuang respons/pairing; purge lokal berjalan setelah konfirmasi server.
- IndexedDB v9 menambah `syncQueue/syncMeta`. Response+event/outbox tetap atomik;
  snapshot antrean exact dibekukan dalam transaksi lintas store, ACK hanya menghapus
  event yang tercakup. Koreksi saat ACK hilang tetap pending. Parent removal lokal
  membersihkan child; sesi cycle memakai penghapusan kelas terkonfirmasi.
- UI `features/guru/sync-controls.tsx` memberi tombol/status nyata. HTTP
  401/403/409/413/422 menahan data; 429/5xx memiliki retry metadata, jitter,
  Retry-After dan batas enam upaya. Integrasi auto-resume/update offline di M11-c;
  review/takeover dan oral/turn history di M11-b. PRELIM fixture tidak diunggah
  sebagai kelas baru; sesi paket umum memakai jalur production RPC.
- Aktual: `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm format:check`,
  `git diff --check` PASS. Vitest sync+cycle **20 PASS**; initial assertion jumlah
  observasi diperbaiki sesuai initial-placement anchor (bukan sepuluh update BKT).
  `pnpm test:rls` **160 PASS** (25 baru). Playwright sync+exit **4 PASS**:
  restart IDB, ACK hilang setelah commit nyata, retry identik, koreksi terlambat,
  401/429/503/409, purge dan regresi exit. Screenshot guru diperiksa; runtime error
  kosong. Evidence `artifacts/qa/M11/`, `sync-browser.json`, `sync-teacher.png`.
- Warning Vite fixture `use client`/NO_COLOR dan launcher Node tetap non-blocking.
  Hosted Supabase, hardware dan gate manusia tetap NOT_RUN/NEEDS_REVIEW.
  Tidak ada TRUE BLOCKER. Next exact task M11-b.

### 9.33 M11-b — DONE; lanjut M11-c

- `sync/takeover` + migration 015: CAS writerEpoch/revision; exact retry takeover
  idempotent. RPC lama tidak dapat dipanggil authenticated. Impor server bersifat
  baca; `local/writer.ts` menjaga penyimpanan kartu/cycle/exit. Dua perangkat yang
  belum mengetahui takeover tetap boleh menyimpan offline, tetapi server menahan
  konflik. Tidak ada last-write-wins jawaban/mastery.
- `sync-conflict.ts`, `features/{session,guru}/sync-review*`: perbandingan absen,
  pilihan kartu/lisan dan jumlah giliran; pilihan server atau jawaban lokal dengan
  takeover eksplisit. Paket/binding berbeda tidak dapat direlabel. Pilihan lokal
  menaikkan revisi respons, mempertahankan respons lain/kelompok historis. Data
  lokal yang diganti diarsipkan pada `syncArchives` IndexedDB v10. Restore memeriksa
  ulang freshness lokal dan menolak overwrite perubahan sejak review dibuka.
- `sync-history.ts`, `core/oral/replay.ts`, placement replay dan loader teacher:
  raw evidence lisan tanpa baseline/mastery dikirim sebagai seed+hasil; replay
  menghitung ulang terhadap riwayat yang sudah dikoreksi. Override oral K13 tetap
  terpisah, tidak menambah sesi hysteresis. Sequence oral baru dipersist; legacy
  sequence 0 memakai ID stabil sebagai tie sementara. Snapshot paket juga membawa
  actual-start giliran sesi dengan UUID/role allowlist, tanpa nama.
- Migration 016 memperluas schema allowlist; SQL test menemukan alias `t` ambigu,
  diperbaiki migration 017 tanpa mengubah migration terpasang. Backup sebelum
  rangkaian: `.local/pre-m11b-test-backup.dump`. Schema Zod diperiksa terhadap
  dokumentasi resmi https://zod.dev/json-schema (inline/strict object); refinement
  domain tetap diverifikasi oleh engine/API, bukan diasumsikan tersalin ke JSON.
- Aktual: `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm format:check`,
  `git diff --check` PASS. Unit sync/placement-state/placement-replay/oral/cycle
  **82 PASS**. SQL **179 PASS** (10 writer + 9 history baru). Browser sync+oral
  **5 PASS** pada build akhir; fresh-class 32 siswa juga PASS pada build sebelumnya
  dalam task yang sama (**6 skenario terkait** total). Dua browser nyata memakai
  cookie akun guru sama dan IDB terpisah: read-only → takeover epoch2 → stale writer
  conflict → review → epoch3, satu kartu revision3, runtime error kosong.
- Evidence `artifacts/qa/M11/m11b-*`, `writer-browser.json`, `writer-sql.log`,
  `history-sql.log`. Failure awal type overload Dexie/format/alias SQL disimpan;
  seluruhnya diperbaiki. Paket/cek lisan yang belum memiliki cycle tetap lokal
  sampai sesi dibentuk; jangan menampilkan status seolah semua data sudah cloud.
  Hardware/live/manusia tetap NOT_RUN/NEEDS_REVIEW. Tidak ada TRUE BLOCKER.
  Next exact task M11-c.

### 9.34 M11-c — DONE; lanjut M12-a

- `local/storage-health`, `features/guru/storage-status`, `offline/update-safety`:
  audit paket dan manifest cache terpisah; sentinel mendeteksi penghapusan IDB
  bila marker origin masih ada. Quota/version error konstan tanpa data mentah;
  quota membatalkan seluruh transaksi. IDB v2→v10 mempertahankan siswa, kartu,
  outbox. Penghapusan seluruh origin termasuk marker tidak bisa dideteksi pasti.
- Worker menunggu keputusan aman dari semua tab guru/papan; sesi aktif/antrean
  menahan update. Shell/font/lazy chunks/OMR worker dicache; API/roster bukan cache.
  Logout mengunci akses lokal sebelum operasi IDB dan tetap terkunci saat storage
  gagal; nama tetap lokal. Penyimpanan persisten adalah permintaan browser.
- `auto-sync`, sync client/repository: resume foreground, dependency ordinal,
  backoff dan Retry-After; enam retry, berhenti saat tab ditutup. Paket/lisan tanpa
  cycle dilabel lokal. Migration 018 mencabut kanal papan saat writer takeover,
  exact retry tetap idempotent; backup `.local/pre-m11c-test-backup.dump`.
- Aktual: typecheck, lint, build, format:check, diff:check PASS; `pnpm test`
  **643/643** (38 file), coverage statements **93.99%**, branches **90.11%**.
  `pnpm test:rls` **181 PASS**. Browser terkait **27 skenario** PASS lintas
  checkpoint: 22 recovery/auth/privacy/offline/sync + fresh-class32 dan empat
  exit/stasiun; lima regresi terakhir PASS pada build final.
- Regresi menemukan race publikasi timer/giliran dan transisi exit. Seluruh
  kendali presentasi kini terkunci selama publish, kendali giliran juga saat
  rotasi menyimpan; parsing payload berada dalam try/finally. Fresh-class sengaja
  menahan request publish dan membuktikan tombol berikutnya disabled, kemudian
  menyelesaikan tiga putaran/exit/finalisasi/sesi berikutnya. Tidak melemahkan
  assertion. Test storage auth diperbarui menjadi allowlist marker/flag konstan,
  tetap melarang credential/sessionStorage. Worker diuji setelah halaman benar-
  benar dikendalikan worker lama. Failure awal tersimpan untuk audit.
- Evidence `artifacts/qa/M11/m11c-*`, `storage-browser.json`,
  `storage-status.png` (diperiksa), `writer-sql.log`. Roster papan hanya RAM:
  tidak di localStorage/sessionStorage/IDB/CacheStorage; hilang saat reload offline.
  Browser/perangkat fisik/live tetap NOT_RUN; tidak ada TRUE BLOCKER.
  Next exact task M12-a: capability, fallback dan remote yang dibatasi task epoch.

### 9.35 M12-a — DONE; audit M12-b/c, lanjut M13-a

- Enam tahap tes papan, profil tanpa siswa, cache perangkat dan RPC terotorisasi.
  Fallback 0/1/2/4 sentuhan; hasil terverifikasi dipakai penjadwal Berdua; pilihan
  terlalu tinggi menurunkan zona kontrol ke setengah bawah. Sampel event→RAF
  bukan latensi digitizer fisik; CDP touch bukan bukti perangkat nyata.
- Remote HP memakai allowlist aksi/model, koordinat 0–1, instance/task epoch,
  sequence, ACK, coalescing <=10 Hz dan TTL. Putus jaringan menghentikan input;
  refleksi/reveal tidak dapat dikendalikan kanal ini. RLS tidak memberi client
  INSERT Broadcast: RPC sempit memvalidasi input lalu private Broadcast memberi
  wakeup, mailbox satu per presentasi menjadi fallback. Mailbox hanya input
  terbaru dengan expiry logis, bukan riwayat goresan atau outbox offline.
- File utama: `core/tools/capabilities`, `contracts/{board-profile,remote}`,
  `features/layar/capability-*`, `features/classroom/remote-*`,
  `features/session/remote-controls`, `server/{board-profile,remote}` dan migration
  019–022. Backup `.local/pre-m12a-test-backup.dump`; migration terpasang immutable.
  SQL awal menemukan argumen validator terbalik dan oneOf belum didukung;
  perbaikan 021/022 fail-closed. Poll yang melintasi pergantian task kini mendapat
  status kanal nonaktif, bukan menerapkan input lama atau console 409.
- Aktual: typecheck/lint/build/format:check/diff:check PASS; `pnpm test`
  **653 PASS / 39 file**, coverage statements **94.03%**, branches **90.28%**.
  SQL **213 PASS**, termasuk 32 privacy/ownership/rate/TTL/schema checks baru.
  Browser **13 PASS**: capability0/1/2/4, remote empat alat, fresh-class32,
  storage/update/board privacy dan pola/alat. Runtime/console error kosong.
  Evidence/log/screenshot di `artifacts/qa/M12/`; capability, remote dan zona
  rendah diperiksa visual. Build `pn-shell-b378c63ce0efe849`.
- M12-b perangkat fisik NOT_RUN. M12-c audit gate tersimpan di
  `artifacts/qa/M12/pilot-gates.md`: izin, lokasi, retensi dan review konten belum
  disahkan. Tidak menyatakan PILOT READY. Zona tinggi dapat digulir tetapi ruang
  model terbatas; perbaikan keterbacaan termasuk M14-c. Warning launcher Node/
  Vite/NO_COLOR non-blocking. Tidak ada TRUE BLOCKER. Next exact task M13-a.

### 9.36 M13-a — DONE software; lanjut M13-b

- Satu adapter server-only Anthropic Messages melalui fetch Node, model pin
  `claude-haiku-4-5-20251001`; adapter disabled default. Model/API diperiksa pada
  [overview resmi](https://platform.claude.com/docs/en/models/overview) dan
  [Messages](https://platform.claude.com/docs/en/api/messages/create), 30 Sep 2026.
  Account availability/live call NOT_RUN; tidak ada credential, biaya atau review
  yang diasumsikan. Tidak menambah SDK/dependency. Deadline/budget terpusat M13-b.
- Prompt versioned `server/llm/prompts`, approval manifest kosong, curated frame
  draft di `content/contexts/story-frames`. Input provider hanya slot anonim dan
  pilihan placeholder. Keluaran harus persis variasi frame terkurasi: angka,
  operasi/satuan tidak dapat berubah. Server memerlukan approval hash template
  dan frame yang nyata; client tidak dapat mengirim approved=true.
- `core/package/enrichment` hanya mengubah soal mandiri sebelum freeze, CAS
  revision dan <=floor(total/3), maksimal tiga saran per request. Cerita tidak
  mengubah key/params/misconception/assessment. Migration 023 menambah referensi
  frame+variant pada allowlist sync; restore merender ulang dari kode, bukan raw
  provider text. UI pratinjau/apply terhubung pada M13-b.
- Aktual: 50 unit terkait PASS (LLM/privacy/sync), 213 SQL PASS, typecheck/lint/
  format:check/build/diff:check PASS. Backup `.local/pre-m13a-test-backup.dump`.
  Evidence `artifacts/qa/M13/m13a-*`. Typegen awal bersamaan build membuat file
  generated belum tersedia; diulang berurutan sesudah build dan PASS. Selanjutnya
  Next typegen/build dijalankan sequential. Tidak ada TRUE BLOCKER; live/konten
  tetap gate eksternal. Next exact task M13-b.

### 9.37 M13-b — DONE software; lanjut M13-c

- Route `api/v1/llm/{status,bisik,enrich,feedback}` memakai autentikasi guru,
  ownership kelas, rekonstruksi recipe deterministik dan approval manifest server.
  Bisik <=80 kata, kode sumber allowlist; teks/HTML/provider error mentah tidak
  masuk log. Pratinjau lokal memeriksa semua nama yang tersimpan pada akun/perangkat
  dan memeriksa ulang tepat sebelum kirim. K15 masih null: tanya bebas nonaktif;
  UI tidak mengklaim nama asing dapat selalu dideteksi.
- `BisikControls` terpasang di stasiun guru; kartu statis tampil sejak awal.
  Berguna/tidak berguna masuk localMeta sebagai boolean+referensi, tanpa teks.
  Feedback AI memakai RPC sempit. `EnrichmentControls` memberi pratinjau/apply
  dengan CAS/freeze check pada IndexedDB terbaru; raw saran tidak otomatis disimpan.
- Migration 024 menambah private policy/accounts/usage dengan RLS dan tanpa grant
  client. Gateway secret server hanya sebagai proof untuk RPC; role guru dan
  ownership tetap diperiksa. Policy disabled, cap nol. Reservasi konservatif
  32768+1200 token dikunci bersama; 5/min/guru, 50/sesi, satu aktif; receipt/TTL,
  hard cap akun dan lingkungan. Timeout tidak mengembalikan biaya secara asumsi.
  Batas total mencakup waktu auth/reservasi; penggunaan hanya metadata allowlist.
- Aktual: typecheck/lint/format:check/build/diff:check PASS; **693 unit / 41 file**,
  coverage **93.98% statements / 90.31% branches**; SQL **240 PASS** (27 baru).
  Browser **13 PASS** termasuk UI/API Bisik, package/cache, nama lokal dan rotasi.
  Runtime/console error kosong; screenshot komponen dibersihkan lalu diperiksa.
  `llm-browser.json` mencatat waktu fallback lokal, bukan SLA provider berbayar.
  Canary tidak ditemukan di log server. Build `pn-shell-b404e3351af84828`.
- Evidence `artifacts/qa/M13/m13b-*`; backup `.local/pre-m13b-test-backup.dump`.
  Type signature mock awal diperbaiki; seluruh validation final hijau. Tarif,
  credential, approval konten/privasi/live tetap NOT_RUN/NEEDS_REVIEW, prosedur
  `activation-gates.md`. Tidak ada TRUE BLOCKER. Next exact task M13-c.

### 9.38 M13-c — DONE software; lanjut M14-a

- Sembilan tes endpoint baru memanggil handler produksi dengan provider HTTP,
  auth dan ledger fake eksplisit: approval kosong tidak membelanjakan budget,
  recipe direkonstruksi server, hanya slot anonim ke provider, paket beku ditahan,
  injeksi semantik ditolak, JSON invalid/81 kata/503 menuju kartu statis, dan
  gate tanya bebas tetap berlaku walau provider aktif. Tidak ada flag bypass
  review di aplikasi production. Jalur live tidak pernah dipanggil.
- Aktual: `vitest run` tiga file LLM **49 PASS**; typecheck/lint/build/
  format:check/diff:check PASS. Browser **6 PASS** pada build final
  `pn-shell-bf1f9ccb5eb824cd`: fresh-class32, tiga sync dan dua LLM. Bersama
  checkpoint b ada **17 skenario terkait unik** lulus. Full unit terakhir 693,
  sembilan endpoint ditambahkan sesudahnya; full akhir diulang pada M15/M17.
- Screenshot HP menemukan tombol feedback melewati kotak sempit; batas lebar
  diperbaiki dan browser mengukur semua tombol Bisik di dalam kontainer dengan
  tinggi >=48 px. Screenshot akhir diperiksa. Card nesting masih sempit tetapi
  terbaca/dapat digulir; bukan alasan menunda alat wajib. Runtime error kosong.
- Evidence `artifacts/qa/M13/m13c-*`, `llm-browser.json`, `bisik-controls.png`.
  M13 software a/b/c selesai, milestone live tidak diklaim lulus: credential,
  budget nyata, review K19/K15 dan pengukuran provider NOT_RUN/NEEDS_REVIEW.
  Tidak ada TRUE BLOCKER. Next exact task M14-a (Timbangan Persamaan).

### 9.39 M14-a — DONE software; lanjut M14-b

- `core/tools/balance.ts`: AST linear rasional eksak, operasi pada kedua ruas,
  pembagian/pengalian nol ditolak, bounds dan 60 langkah, undo/reset. Check
  memeriksa seluruh transisi, kesetaraan dan satu x; angka benar dengan langkah
  keliru tidak lulus, termasuk kebetulan D5.3 pada 2x=4.
- `features/tools/balance.tsx`, tool-view/teacher-controls/patterns: kantong x
  simbolis, seret atau ketuk beban, operasi pecahan, jejak lokal, tujuh pola,
  contoh kembar berbeda, dua model terpisah dan dinding urutan operasi RAM.
  Ketidaksetaraan ditandai putus-putus, tidak mengarang kemiringan/berat x.
  D5 paket memakai parameter soal sebenarnya; remote DOM memakai allowlist baru.
- DTO publik hanya dua ekspresi soal; nama, level, solusi dan history tidak ikut.
  Migration `202609300025_balance_tool.sql` menambah validator tanpa tabel/RLS
  baru. Backup lokal `.local/pre-m14a-test-backup.dump`; tidak ada DB production.
- Aktual: `pnpm typecheck`, `pnpm lint`, `pnpm test` **715/43 PASS**,
  `pnpm test:db:prepare`, `pnpm test:rls` **248 PASS**, `pnpm build`,
  `pnpm format:check`, `git diff --check` PASS. Coverage **93.63%/89.60%**
  statements/branches. Browser balance/freshclass/tools/tool-patterns **6 PASS**
  pada `pn-shell-0892cb02f0c59290`, termasuk tujuh pola Timbangan, drag/cancel,
  x=6, zero guard, offline/undo, kelas baru32 dan empat alat sebelumnya.
  Tombol terukur 96 px; runtime/console error kosong; screenshot diperiksa.
- Evidence `artifacts/qa/M14/m14a-*`, `balance-browser.json`, `balance-board.png`.
  Lint callback nested diperbaiki tanpa suppression. Percobaan regresi pertama
  gagal login karena restart adapter terlalu cepat (port54325 masih dipakai);
  server lama selesai lalu `pnpm demo` baru dan enam skenario lulus. Demo sedang
  berjalan pada port3100 (exec session65732). Restart berikut harus menunggu
  seluruh listener lama berhenti. Warning launcher Node/fixture bundling tetap
  non-blocking; hardware dan review representasi guru tetap NOT_RUN/NEEDS_REVIEW.
- Tidak ada TRUE BLOCKER. Next exact task M14-b: engine Grafik Geser, oracle
  eksak dan UI/DTO/SQL untuk empat mode D6/E2/E3/E4; lalu M14-c.

### 9.40 M14-b — DONE software; lanjut M14-c

- `core/tools/graphs.ts`, `graph-tasks.ts`: linear/SPLDV (termasuk sejajar/berimpit),
  irisan pertidaksamaan, akar kuadrat rasional/radikal dan eksponensial rasional.
  Oracle memakai BigInt/Rational, bukan koordinat piksel; batas domain divalidasi.
  `questionTool` memakai parameter paket D6/E2/E3/E4, bukan hasil seed khusus.
- `features/tools/graphs.tsx`: slider satu gesture/satu undo, titik drag/keyboard,
  input eksak, tabel nilai, irisan arsiran, akar, kurva pembanding; tujuh pola
  memakai engine sama. Input ditolak kembali ke nilai model. Kendali HP melalui
  RPC/ACK dan allowlist DOM diperluas ke Timbangan/Grafik tanpa teks arbitrer.
- `contracts/graphs.ts` mapper allowlist; migration 026 `graph-tool-v1` + validator
  numerik SQL. Backup `.local/pre-m14b-test-backup.dump`; tidak mengubah tenant/RLS.
- Aktual: `pnpm test` **738 tes/44 file PASS**, coverage core 91.75% statements,
  86.20% branches. Targeted 67 PASS, termasuk 100 soal paket dan 225 faktor kuadrat.
  `pnpm test:integration` **268 SQL PASS** (20 guard grafik baru).
- Browser graph6 + balance2 + freshclass1 **9 PASS**, REMOTE02 **1 PASS**;
  setelah perbaikan input, ulang `playwright test tests/e2e/graphs.spec.ts`
  **6 PASS (44 s)** pada build `pn-shell-93777858975b16aa`.
  Screenshot viewport diperiksa; tidak ada runtime/console error. Skip-link
  offscreen terkonfirmasi; overlay pada screenshot elemen panjang adalah artefak capture.
- `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm format:check`,
  `git diff --check` PASS. Evidence aktual `artifacts/qa/M14/m14b-*` dan
  `graph-*-viewport.png`. Base commit tetap 47aa60d; implementasi working tree.
- Failure awal header tabel/locator baris diperbaiki tanpa melemahkan assertion;
  tes menemukan input ditolak tertinggal lalu diperbaiki dan diuji ulang.
  Restart lokal menunggu provider/Postgres lama berhenti agar port tidak bentrok.
- Gap: warning launcher Node/warna/directive fixture tetap non-blocking. Font dan
  layout panjang ditangani M14-c; kamera/digitizer/latensi nyata tetap NOT_RUN.
  Tidak ada TRUE BLOCKER. Next exact task M14-c: panel 2–4, Sorot/resume RAM,
  sepuluh mode, SD5/SMA10, tipografi dan zona rendah; setelah itu M15.

### 9.41 M14-c — DONE software; lanjut audit M15-a

- `contracts/board-layout.ts`, `presentation.ts`: sepuluh mode, split 2–4 kelompok,
  Sorot kelompok publik dan viewId terpisah dari epoch perintah. Mapper allowlist
  menolak nama, kunci, history/ink dan groupId asing; migration 027/028 + CHECK
  terikat validator terbaru. Backup sebelum migrasi `.local/pre-m14c-test-backup.dump`.
- `layar/{split-board,spotlight-board,presentation-view,board-content}.tsx/ts`:
  dua panel per halaman (satu kolom pada laptop), soal 72 px dan bentuk/warna grup.
  Model/undo tiap latihan tetap RAM; Sorot mempertahankan view dasar yang hidden,
  memakai contoh kembar/Coba sendiri/Nala; HP memilih kelompok dan kembali.
  Epoch baru saat masuk/keluar Sorot menolak remote lama; bukan menyimpan model
  siswa ke server. Berdua serentak hanya dibuka HP setelah profil dua sentuhan;
  fallback bergantian tetap jelas pada descriptor yang diterima papan.
- SD turun ke 2/3 bawah; profil papan tinggi tetap 1/2 bawah; opsi objek 1,5×.
  Soal grafik/paket/exit minimal 56, opsi exit 48. ResizeObserver menjaga lingkaran
  Garis Bilangan minimal 88 CSS px ketika panel menyempit. Stasiun pertama pada
  kartu kelompok kini dari scheduler, menghapus pemetaan warna demo yang keliru.
  Pembuka SMA10 memakai oracle garis tarif (5 GB, 25 ribu); SD5 tetap intuisi.
- Aktual `pnpm test`: **745/45 file PASS**; coverage 91.76% statements, 86.21%
  branches. Awal bersamaan build: satu simulasi timeout 5 s, 744 lainnya lulus;
  ulang simulasi sendiri PASS, lalu full suite PASS 77.35 s tanpa mengurangi
  sample/assertion/timeout. Setelah field Sorot kelompok, targeted **18 PASS**.
- `pnpm test:db:prepare` + `pnpm test:integration`: **290 SQL PASS**. Tambahan
  22 guard mode, membership/extra fields; owner/board/Realtime baseline tetap lulus.
- Browser final **12 PASS (2.2 menit)**: mode3, freshclass1, opening/reflection1,
  pairing1, capability0/1/2/4 + remote2. Termasuk epoch remote stale ditolak,
  marker panel ≥88 px, objek besar ≥132 px, font panel72, SD zone, Sorot/resume,
  kelompok dari paket nyata dan seluruh siklus 32 siswa melalui OMR sintetis.
- `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm format:check`,
  `git diff --check` PASS. Build `pn-shell-09deeabef0c6d3d5`; screenshots Sorot,
  panel dan SD5 diperiksa. Evidence `artifacts/qa/M14/m14c-*`, `modes-browser.json`.
  Environment Windows/Node24.14.1/pnpm11.19.0/Chromium/PostgreSQL17 lokal;
  base commit 47aa60d, working tree belum di-commit, sumber 00–07 tidak diubah.
- Keputusan K36: pagination menjaga font/objek, panel lain tetap mounted/RAM;
  layout panjang masih dapat discroll. Bukan bukti bangku belakang/digitizer.
  Warning launcher/warna/directive fixture tetap non-blocking, hardware NOT_RUN.
- Audit awal lintas fitur menemukan pekerjaan software wajib yang tidak boleh
  dianggap selesai hanya karena sepuluh mode render: pengiriman/cache paket
  publik di papan dan navigasi Lanjut/Kembali (F3/F4/K10/K11), kontrol petunjuk/
  reveal latihan dengan konfirmasi HP (F17/F18), serta visual soal SD. Periksa
  dan perbaiki melalui M15-a; README lama juga perlu diselaraskan saat handoff.
  Tidak ada TRUE BLOCKER. Next exact task M15-a audit/koreksi, lalu M15-b dari DB kosong.

### 9.42 M15-a — IN_PROGRESS: cache publik dan kendali lokal papan

- `contracts/board-package.ts`, `board-content.ts`, proyeksi pada boundary sesi:
  paket konten allowlist terpisah dari run plan kelompok RAM. IndexedDB papan
  `papannalar-board-content-v1` hanya menyimpan satu paket konten, tanpa roster,
  binding kelompok, key assessment, level, state model atau tulisan.
- RPC/endpoint konten memakai identitas pairing/epoch/ownership normal; tabel
  private dengan RLS, tanpa grant langsung. Navigasi lokal menghentikan ACK dan
  remote. Setelah reconnect, guru memilih tampilan papan atau HP; tidak ada replay
  antrean navigasi. Lanjut/Kembali melalui tahan2 detik, kontrol hilang5 detik.
  Reload offline memilih aktivitas anonim; statistik giliran tidak direkayasa.
- Migration029/030 diterapkan pada DB lokal saja, backup
  `.local/pre-m15a-test-backup.dump`. Koreksi alias SQL memakai migration baru;
  migration yang sudah diterapkan tidak diubah. Percobaan awal syntax/alias gagal
  lalu diperbaiki; seluruh **321 SQL assertions PASS**, termasuk31 konten baru.
- Tes paket menemukan C4 dapat menghasilkan harga Rp36.000, melampaui batas
  Tabel Rasio lama10.000. Batas baseY menjadi50.000 pada core/DTO/SQL, angka soal
  tidak diganti. Targeted **15 unit PASS**, termasuk100 parameter C4; full suite
  belum diulang. Typecheck/lint PASS setelah memperbaiki inisialisasi ref.
- Layout Stasiun menjadi2/3 alat dan1/3 ringkasan Mandiri pada papan lebar. Guard
  Sorot untuk panel tanpa alat diperbaiki. Build/browser cache dan regresi kelas
  baru sedang dijalankan; belum menandai task selesai. Evidence sementara
  `artifacts/qa/M15/content-*`. Next: selesaikan browser cache/handoff, kontrol
  petunjuk/reveal HP, visual SD; lanjut audit fitur dan full verify M15-b.

#### Checkpoint M15-a: cache, petunjuk dan rekonsiliasi teruji

- Cache/handoff/browser awal sudah selesai: **7 skenario PASS (1,7 menit)** pada
  build `pn-shell-7bc1c0bf58af0d26`, termasuk alur kelas baru32. Error runtime/
  console kosong pada skenario yang memantaunya. Satu kegagalan awal tanda minus
  reveal diperbaiki menjadi U+2212 dan seluruh tujuh skenario diulang lulus.
- Kontrol petunjuk HP menerima hitungan nyata dari papan; reveal latihan meminta
  konfirmasi, menampilkan model target terpisah tanpa mengganti pekerjaan siswa.
  Tidak berlaku pada cek/exit. Migration031: laporan bounded tanpa identitas siswa.
- Migration032 menjaga proposal kendali lokal bila run plan berubah; versi rencana
  lama tidak bisa diadopsi. Pilih HP atau pilih ulang tampilan papan. **340 SQL
  assertions PASS**; backup sebelum031/032 tersimpan di `.local/`.
- Visual statis SD mengambil besaran literal dari prompt publik, tanpa kunci/
  level. Terhubung ke cek, pembuka, latihan tanpa alat, mandiri dan exit; alasan
  exit memakai konteks soal dari cache publik. **39 targeted unit PASS**, termasuk
  100 seed ×12 templat SD beserta konteksnya. Paket pecahan v1 yang membutuhkan
  lebih dari12 bagian memakai fallback buku; soal/kunci beku tidak diubah.
- Typecheck/lint/build aktual PASS; build visual SD `pn-shell-169f0279b368b4fd`.
  Browser visual SD sedang dijalankan. Evidence `artifacts/qa/M15/controller-*`,
  `sd-*`. Task masih IN_PROGRESS hingga audit lintas fitur selesai; full verify
  dan instalasi kosong tetap task M15-b. Tidak ada TRUE BLOCKER.

### 9.43 M15-a — DONE software; lanjut M15-b

- Traceability aktual 13 fitur dan audit lintas modul:
  `artifacts/qa/M15/feature-audit.md`. Query katalog:17 tabel public/private,
  semuanya RLS; semua SECURITY DEFINER punya search_path tetap. Tidak ditemukan
  TODO/FIXME/HACK/test bypass pada pencarian src/scripts/tests. Sumber00–07 utuh.
- Lima browser mode/visual/kendali **PASS (1 menit)** pada build
  `pn-shell-34728cabbe78bdca`. Visual12 soal SD+4 konteks+alasan dua kelompok
  benar-benar render; runtime/console error kosong. Screenshot diperiksa.
  Zona rendah hanya untuk mode interaktif, bukan memotong ruang soal/exit statis.
- Failure403 pertama ternyata fixture reuse taskEpoch antarfase; diperbaiki
  dengan epoch baru seperti jalur UI produksi, tanpa melonggarkan server/test.
  Catatan awal dugaan lifecycle remote bukan kesimpulan bug produksi.
- Sebelumnya cache2/mode4/freshclass1 **7 PASS**, lalu mode5 terbaru di atas.
  Unit terkait **39 PASS**, SQL **340 PASS**, typecheck/lint/build PASS. Evidence
  `controller-*`, `sd-*`, `database-audit.json`; full suite belum dijalankan ulang.
- Keputusan K37 diperluas: konten publik saja di cache, proposal run plan stale
  ditolak, petunjuk bounded/reveal HP, visual SD literal. Tidak mengubah soal/
  kunci/placement. Gambar baru bukan kanvas sumber atau review pedagogi manusia.
- Batas: cache quota gagal memakai RAM dan perlu reload untuk retry; halaman
  panjang tetap bisa discroll. K01/K10 dan semua gate fisik/live/manusia terbuka.
  Tidak ada TRUE BLOCKER. Next exact task M15-b: salinan source allowlist tanpa
  secret/node_modules/build, pnpm frozen install, cluster uji baru55433, migration
  kosong dan full verify; jangan menyentuh cluster demo55432 atau perubahan pengguna.

### 9.44 M15-b — IN_PROGRESS: instalasi kosong dan regresi penuh

- Salinan allowlist `.local/clean-room-m15` tanpa node_modules/.next/.env.local;
  `pnpm install --frozen-lockfile` **PASS13,4 s**. Cluster baru55433/database
  `pn_m01c_test`: tabel aplikasi awal0 →32 migration/17 tabel, seluruhnya RLS.
  Cluster demo55432 dipertahankan, bukan direset. Migration digest tidak berubah.
- `pnpm verify` pada salinan: format/typecheck/lint **PASS**, **777 unit/48 file
  PASS**, coverage statements92,06/branches86,83/functions96,06/lines93,02%;
  **340 SQL PASS**, cold build PASS. Browser pertama **70 PASS/3 FAIL (7 menit)**.
  Failure: teks exit "tahap berikutnya" sudah usang; tes shell masuk sebagai guru
  sebelum mengharapkan storage papan kosong; tes PRIV03 melarang keberadaan DB
  konten, padahal invariant melarang roster tersimpan, bukan cache konten.
- Tes diperkuat: PRELIM membekukan exit aktual dan menampilkan3 kelompok; PRIV03
  membaca setiap store dan membuktikan hanya DB konten/packages kosong, tanpa
  roster/identitas; shell papan diuji dari context fresh tanpa login guru.
  Rerun awal9:8 PASS, sisa shell sebelum setup diisolasi. Full verify root berjalan.
- Review visual tambahan menemukan tanda ASCII minus pada node pecahan dapat
  terbuang oleh parser gambar. Regex menerima U+2212/ASCII dan **15 unit visual
  PASS**, termasuk100 pecahan D2/konteks; matematika/kunci tidak diubah.
- Root frozen install PASS; scan signature client288 file:0 temuan;35 direct
  dependencies cocok lock/version dan seluruhnya punya metadata lisensi. Ini
  bukan legal approval atau jaminan scanner secret universal. README diselaraskan
  dengan implementasi aktual. Evidence `clean-*`, `empty-*`, `regression-fixes.log`,
  `sd-negative-regression.log`, `root-verify.log`. TRUE BLOCKER tidak ada.

### 9.45 M15-b — DONE software: clean install, restore dan full regression

- Root `pnpm verify` **exit0**: format/typecheck/lint, **778 unit/48 file**,
  **340 SQL**, production build dan **73 browser PASS (6,8 menit)**. Coverage
  statements92,06/branches86,83/functions96,06/lines93,02%. Cache build
  `pn-shell-3e2390426cbe34b2`. Semua failure lama di9.44 ditutup tanpa bypass.
- Satu failure lint tambahan berasal dari bundle generated salinan clean-room;
  `.local/**` ditambahkan pada globalIgnores seperti Git/Prettier. Kode aplikasi
  tetap diperiksa. Evidence `root-verify-final.log`, `browser-full-73.json`.
- Restore biasa gagal karena CHECK membaca `sync_schemas` sebelum datanya dimuat.
  `scripts/restore-local-backup.mjs` memakai TOC terurut dan single transaction,
  tanpa menonaktifkan CHECK/RLS/trigger/grant. Guard hanya loopback database uji
  kosong; uji ulang ke DB berisi ditolak sebelum mutasi. Cluster gagal55434
  dipertahankan; restore berhasil pada cluster baru55435, tidak mereset DB lain.
- Backup SHA256 `c5ebff5cb57a42892cbf84e00678ebae318a67e5c3e80699880db72628a1553a`;
  32 migration/7 skema validator/3 paket valid/0 tabel tanpa RLS. Migration ledger
  dan **340 SQL PASS** sesudah restore. Evidence `restore-success.json`,
  `restore-ordered.log`, `restored-rls.log`, `restore-nonempty-guard.log`.
- Ini PostgreSQL asli dengan auth/realtime emulator lokal. Restore hosted
  Supabase, staging, kamera/cetak/digitizer/latensi fisik tetap NOT_RUN. Tidak ada
  TRUE BLOCKER. Next exact task M15-c snapshot klaim dan M17 handoff/gladi lokal.

### 9.46 M15-c — DONE software: manifest kandidat dan batas klaim

- `scripts/release-manifest.mjs` menghasilkan manifest allowlist tanpa .env.local,
  DB, profil browser atau mailbox. Snapshot446 file source/config/docs/tests,
  32 migration,52 aset emitted/offline; build `Xqm0xwjf8xHJ5o7AsDvq7`.
  Hash source `8d55ad0c78e10c0ce2cc985f37008eb57b972a29bfd49d2a2953708df5247ae4`.
  Salinan tetap `artifacts/qa/M15/release-candidate.json`; manifest terbaru pada
  `artifacts/releases/local-final-mvp/manifest.json` akan diperbarui setelah M17.
- `docs/09_LOCAL_HANDOFF.md` memuat startup, backup/rollback lokal, aset dan gate
  eksternal. Dua percobaan manifest awal gagal membaca dotfile/icon; memakai stat
  dan aset route emitted sesungguhnya, lalu generator exit0. Tidak mengubah app.
- Audit13 fitur dan semua angka dibatasi evidence lokal. K01, review/privacy/
  consent/live/hardware serta tanggal submit/freeze Oktober tidak dianggap lulus.
  Aplikasi masih uncommitted working tree; hash source melengkapi base Git.
- M16/F9–F13 DEFERRED sesuai opsi PLAN dan prioritas FINAL MVP; audit dasar, exit
  minimum dan cetak Mandiri sudah tersedia. Tidak ada TRUE BLOCKER.
- Next M17: ulang tiga kali alur enam-menit sumber secara otomatis/dipercepat;
  bedakan dari gladi panggung aktual, simpan video tanpa credential, siapkan
  PDF/font/manifest dan jalankan full verification terakhir. Test M17 ditambahkan
  setelah discovery suite73; belum diklaim lulus pada hasil M15-b.

### 9.47 M17-a — DONE software; M17-b/validasi akhir IN_PROGRESS

- Rollback lokal ke DB kosong sudah teruji pada9.45; cluster restore55434/55435
  dihentikan sesudah tes dan datanya tetap tersimpan. Cluster demo55432 tidak
  dihapus. Paket handoff akan memakai source allowlist, manifest hash, PDF kosong,
  font/shell build serta video lokal; tanpa credential, DB atau identitas guru.
- `tests/e2e/rehearsal.spec.ts` mengikuti urutan sumber07: 29 seed+3 pixel OMR,
  kelompok7/13/12, tiga rotasi/BisikD1.2 statis, rasio, Tebak Dulu−3−5, Cari
  Kesalahan1/2+1/3, exit alasan tiga kelompok, hasil aktual1/32, refleksi, scan
  ulang offline tanpa tambahan evidence. Dua actual-start terpisah dari preview.
- Percobaan pertama FAIL(timeout120s): skrip belum mengetuk Tambah kolom rasio;
  run berikutnya diinterupsi untuk menghindari pengulangan failure yang sama.
  Langkah UI ditambahkan; satu gladi debug **PASS18s**,0 runtime/console error,
  build M15 yang sama. Screenshot garis/pecahan/refleksi telah diperiksa: model
  benar, font/warna sesuai fondasi, halaman alat panjang tetap scrollable.
- Waktu18s adalah browser otomatis dipercepat, bukan gladi panggung6 menit;
  tiga pengulangan belum diklaim lulus. Rekaman mempunyai label uji lokal dan
  pairing code dimask. Semua kamera/sentuhan/juri/flashdisk/kabel/hotspot fisik
  serta freeze29/10/presentasi31/10 tetap NOT_RUN.
- `pnpm install --frozen-lockfile` terakhir PASS368ms; full `pnpm verify` dengan
  tiga skenario gladi tambahan sedang berjalan. Typecheck/format tambahan PASS.
  Tidak ada TRUE BLOCKER. Next exact: tutup verify, buat ZIP aman dari allowlist,
  simpan manifest final, hidupkan demo3100 dan cek browser/HTTP terakhir.

### 9.48 M17-b dan continuous run — DONE software lokal

- Full akhir `pnpm verify` **exit0**: format, typecheck, lint, **778 unit/48 file**,
  **340 SQL**, build, **76 browser PASS (7,7 menit),0 skip/0 flaky/0 unexpected**.
  `pnpm install --frozen-lockfile` exit0; coverage92,06/86,83/96,06/93,02%.
  Evidence `artifacts/qa/M17/final-install.log`, `final-verify.log`, `browser-full-76.json`.
- Tiga gladi source-flow berturut-turut PASS:17.967/17.764/17.864 ms (otomatis,
  dipercepat), build `PNkhMiKARQZq0GwqdP6GJ`, cache `pn-shell-aa2ffced9dadca37`.
  Setiap run0 runtime/console error tak terduga; video berlabel rekaman lokal,
  pairing code dimask. Kartu sintetis; bukan bukti gladi panggung/kamera/digitizer.
- Manifest final:446 file source,32 migration,52 aset build dan7 PDF/video demo;
  source SHA256 `e3e2aa0f95821fa806028e32488d98354a6d8b5b185bc069e2d96971d7765363`.
  Seluruh hash cocok snapshot verifikasi. `scripts/release-manifest.mjs` exit0.
  Audit akhir src/scripts/tests tidak menemukan TODO/FIXME/HACK/skip/only/
  suppression; delapan sumber00–07 tidak berubah. Tidak ada commit/reset/deploy.
- Server `pnpm demo` sekarang berjalan dalam sesi terminal terkelola63220;
  `/demo` HTTP200. Smoke browser pada proses yang benar-benar berjalan:
  **5 PASS (5,6s)** untuk login demo normal, Guru, papan1920×1080, fullscreen dan
  teks130%. Tidak ada runtime/console error pada checks yang memantaunya.
  Peluncuran awal sebagai proses tersembunyi ditolak review otomatis dengan
  pesan "blocked by policy" tanpa rincian; alternatif terminal terkelola berhasil,
  tanpa meminta bypass/approval. Pertahankan sesi launcher selama demo.
- Gate tersisa: M12-b perangkat/cetak/fotokopi/latensi, hosted Supabase/Auth/
  Realtime/staging, live AI, review pedagogi/privasi dan consent/pilot; semua
  NOT_RUN/NEEDS_REVIEW. Freeze29/10, gladi6 menit/juri/kabel/hotspot/flashdisk
 31/10 belum dilaksanakan. F9–F13 opsional DEFERRED; K01 membatasi klaim seluruh
  jenjang; satu Pilot4 sesi77,2% tidak diubah menjadi klaim95%.
- TRUE BLOCKER coding **tidak ada**. Next exact action **M12-b**: jalankan matriks
  cetak/kamera/digitizer di perangkat nyata; lanjut staging dan gate manusia.
  Semua software FINAL MVP yang dapat dikerjakan lokal pada run ini selesai;
  continuous execution ditutup, bukan menganggap gate eksternal lulus.

#### Penutupan artefak M17

ZIP `artifacts/releases/papannalar-PNkhMiKARQZq0GwqdP6GJ.zip` dibuat dari allowlist:
482 entry/8.202.977 byte; seluruh446 source hash cocok,0 file credential/DB/profil.
SHA256 `b6f2978e67f90f473a6940a0f830b486550481c7b86af2dcee40ae3a797b1aa4`.
`artifacts/releases/archive-check.json` menyimpan hasil; ZIP memuat snapshot PLAN
sampai9.48 sebelum catatan checksum ini (menghindari checksum melingkar).

### 9.49 Video Ready V1–V6 — DONE software lokal, gate hosted/fisik tetap terbuka

- Instruksi pengguna `PapanNalar_Video_Ready_Codex.md` menggantikan corrective pass
  sebelumnya. Baseline M00–M17 dan sumber00–07 dipertahankan, tidak scaffold ulang.
- V1: empat bagian `/guru`, `/guru/kelas`, `/guru/soal`, `/guru/asesmen` memakai
  sidebar desktop/bottom navigation HP; adaptif existing di `/guru/latihan`.
  Akun contoh tunggal persisten, 7B/7C32 siswa, koleksi sistem/guru dan dua hasil
  historis sintetis berada di PostgreSQL nyata. Login tidak membuat tenant/seed
  baru. Nama/nickname/CSV dan catatan hadir tetap lokal; random UUID stabil.
- V2: appearance schema/profil terpisah dari kemampuan/auth, tiga preset produksi,
  resize/reload/fallback HDMI, auto-next1/2/4 pointer setelah release. QR hanya
  challenge same-origin HTTPS; loopback memakai kode manual. Heartbeat/lease/CAS,
  rebind menjaga presentation/soal3, logout/revoke/takeover tidak menghidupkan sesi.
- V3/V4: `contracts/library.ts`, `app/api/v1/library/route.ts`, `features/library/`,
  `features/guru/results.tsx`, `local/library.ts` dan custom-form menghubungkan
  editor5 kartu/6 alat/Menulis, versi immutable, reuse7B/7C, roster/form beku,
  PDF/OMR lokal, penilaian server, revisi/idempotency, filter kelas/tanggal/set
  dan rincian hasil. Kunci/explanation tidak masuk board DTO; asesmen custom
  tidak menjadi observasi BKT. Nama baru digabungkan pada UI guru.
- SQL033–037 diterapkan pada cluster uji loopback setelah backup lokal;
  library23+koneksi15 assertion tambahan, total378 bersama baseline. Tidak ada
  migration/seed hosted. Operator seed/reset dibatasi target/owner/lease; tiga
  penolakan reset PASS dan fingerprint data tetap. Reset sukses NOT_RUN.
- V5: pemetaan C2/A4 per instance, alasan exit<=8 kata terpisah dari penjelasan,
  tugas mandiri bermakna/refleksi materi aktual, chooser dua kelas cached dan
  sync sekali, auto-capture stabil/cooldown/pause review serta input manual.
  Tulisan/gambar tetap RAM. Cache model publik hanya hasil Jalankan tanpa ink,
  roster, kunci atau identitas siswa; tidak diklaim sinkron HP-papan saat offline.
- Validasi aktual: `pnpm verify` sekali **exit1** pada E2E:66 PASS/36 FAIL;
  format/typecheck/lint, **1001 unit/65 file**, **378 SQL** dan build PASS.
  Coverage92.44/87.42/96.26/93.44%. Tidak mengulang full verify atau mengubah log.
  `playwright --last-failed` berturut-turut14/36,15/22,6/7 PASS, sisanya diperbaiki.
- Dua defect auth/koneksi ditutup: cookie PKCE SSR0.12.7 per-flow dibaca/dihapus
  sesuai surface; ACK memakai timestamp heartbeat presisi, bukan HTTP Date
  yang dibulatkan detik. **56 targeted unit/5 file PASS**, termasuk16 tes baru.
  Tidak melonggarkan syarat ACK, RLS atau teacher-vs-board auth.
- Kompatibilitas tes UX lama disesuaikan dengan instruksi terbaru: wizard/preset,
  label sambungan, menu tertutup dan allowlist storage appearance. Privacy/math/
  historical assertions tetap dipertahankan. Timer tiga putaran31.7s membutuhkan
  timeout90s; bukan klaim latency fisik. Refleksi memakai dua kolom/kanvas fleksibel
  sehingga tombol hapus muat di3 viewport x3 preset; ink tetap tidak tersimpan.
  Pembesaran objek1.5x diperbaiki relatif terhadap preset/zona, diuji tepat1.5x
  dan kembali ke ukuran semula; tidak sekadar menurunkan assertion lama.
- Kandidat build `8wosRzK9Zg6KTtOoogpnf`, cache `pn-shell-920000846a3f1f88`,
  63 aset/3 shell publik. `pnpm build`, `pnpm typecheck`, `pnpm lint` terakhir
  exit0. Kandidat terarah **26/26 browser PASS,2.0m**, mencakup14 display,9 library,
  koneksi, pembesaran dan refleksi. Filter/rincian hasil nyata ditambah pada U11.
  Ledger seluruh **102 skenario unik hasil terakhir PASS**,0 failure tersisa;
  ini gabungan full+repair, bukan satu full run baru. Lihat `final-evidence.json`.
- `pnpm video` berjalan pada sesi terkelola37723, `/masuk`/`/layar` HTTP200.
  `PAPANNALAR_REUSE_LOCAL_DEMO=1 playwright` smoke **7/7 PASS,11.8s** pada server
  itu: PKCE/logout, guru/board/font, fullscreen, teks130%, pencabutan per-tab
  dan observer tidak mencabut perangkat lain. Screenshot guru390 dan refleksi
  kosong diperiksa aktual; display fixture terpisah dari bukti DB/pairing nyata.
- Warning non-blocking: launcher Node24.19.0 vs child24.14.1; NO_COLOR/FORCE_COLOR;
  directive `use client` saat bundling fixture browser (bukan bundle Next).
  QA meninggalkan koleksi/sesi sintetis tambahan; tidak dihapus/reset demi video.
- `VIDEO_HANDOFF.md` memuat startup/URL, judul dataset awal, empat alur, matrix
  U01–U16 dan bukti/gap. ZIP M17 lama bukan snapshot perubahan Video Ready.
  TRUE BLOCKER coding: **tidak ada**. Hosted Auth/Realtime/TLS/native QR HP,
  kamera/cetak/digitizer, live AI, reviewer/izin pilot tetap NOT_RUN/NEEDS_REVIEW.
  Next exact: rekam lokal dua jendela; siapkan origin/target hosted yang sah dan
  uji perangkat M12-b bila rekaman menggunakan HP/papan fisik. Tidak deploy/commit.
- Gate penutupan: `pnpm format:check` dan `git diff --check` akhir exit0;
  HTTP `/masuk`/`/layar` tetap200 setelah smoke, sesi server37723 masih berjalan.

### 9.50 ZIP Video Ready terbaru — DONE (permintaan pengguna)

- Arsip `artifacts/releases/papannalar-video-ready-2026-09-30.zip` dibuat dari
  working tree terbaru:540 file sumber/config/lockfile/tes/dokumen/evidence aman,
  37 migration, VIDEO_HANDOFF, manifest dan BUKA_DULU; total542 entry/1.136.635 byte.
- ZIP dibuka kembali; hash/ukuran seluruh540 file dan allowlist entry cocok,
  0 file secret/env terisi/DB/profil/node_modules/.next. ZIP M17 lama dipertahankan.
  Build rujukan `8wosRzK9Zg6KTtOoogpnf`; tes aplikasi tidak diulang untuk packaging.
- SHA256 `953c2388d3fc080937e433e3609abfe24c31e98f617aafd0826265ce31ba17de`.
  Receipt `artifacts/releases/video-ready-archive-check.json`; manifest terpisah
  `video-ready-manifest.json`; command helper `.local/video-ready-zip.ps1` exit0.
- ZIP memuat PLAN sampai9.49 sebelum receipt ini untuk menghindari checksum
  melingkar. Tidak mengubah kode/DB/server. TRUE BLOCKER tidak ada.
  Next exact: buka arsip lalu VIDEO_HANDOFF.md untuk setup/rekaman.

### 9.51 UI/UX polish — DONE software lokal (1 Oktober 2026)

- Scope baru: P1 bahasa/status/kendali HP/CTA, P2 contoh editor dan ikon,
  P3 motion ringan. Arsitektur, auth/RLS, DB dan baseline Video Ready dipertahankan.
- Acceptance: satu entry kendali HP, CTA 48px proporsional, status normal kecil,
  2–4 contoh per enam alat/Menulis yang mengisi form serta preview produksi;
  guru360/390/1366 dan papan1280, reduced motion, regresi Video Ready.
- Strategi validasi: tes terarah per batch; satu `pnpm verify` pada kandidat
  akhir, browser/screenshot aktual dan `git diff --check`. Hasil aktual di bawah.
- Keputusan kecil: contoh pecahan memakai representasi, penjumlahan dan senilai
  yang didukung engine; tidak menambah mode perbandingan/kunci baru. Tanpa paket baru.
- Implementasi: microcopy jalur utama guru/papan/scan/hasil serta beberapa pesan
  adaptif; satu `RemoteControls` tanpa details berlapis, CTA pairing48px, badge
  normal + detail status dan notice simpan3s (warning tetap terlihat).
- `features/library/templates.ts`/`interactive-help.tsx`:20 contoh (3x6 alat+2
  Menulis), helper isian, ikon Lucide existing dan preview produksi. ID soal
  dipertahankan, metadata template tidak ikut disimpan; tulisan tetap RAM.
  Preview memvalidasi perubahan isian dan membuat model baru saat alat diubah.
- Ikon/menu/kartu memakai token existing; motion CSS ringan, marker mengikuti
  pointer langsung saat drag, prefers-reduced-motion dan hasil kemampuan papan
  tetap dihormati. Tidak mengubah core, kontrak model/onRun, auth/RLS atau schema.
- Uji terarah unit73/4 file PASS (22 baru); typecheck kandidat PASS; lint terarah
  PASS setelah satu warning ekspresi test diperbaiki. Alias runtime helper murni
  diubah ke import relatif agar Vitest existing berjalan; run awal51/1 gagal
  tidak dianggap PASS. Format terarah dan git diff --check PASS.
- Browser dev:21/24 PASS awal,3 selector editor diperbaiki; run lanjutan ditutup
  dengan3/3 editor final PASS14.2s. Display18/18 mencakup14 regresi + badge/notice,
  storage ditolak, pointer/keyboard/reduced motion. Pairing/kendali nyata3 viewport
  PASS; editor mengisi dan memainkan garis/pecahan/timbangan serta Menulis.
- Screenshot aktual mengungkap batang pecahan terpotong pada preview HP; kini
  satu utuh terlihat lengkap untuk contoh2/4 bagian, lebar unit tetap sama antar
  batang dan target48px. Preview timbangan HP memakai scroll di area alat agar
  semua operasi dapat digunakan. Tidak memperkenalkan scroll vertikal di board.
- Satu `pnpm verify` aktual: format/typecheck/lint PASS; **1039 unit/68 file PASS**,
  coverage92.44/87.47/96.26/93.44; SQL/RLS PASS; build PASS. Browser awal104 PASS/
  8 FAIL, exit1. Tujuh failure mencari microcopy lama; satu helper menganggap
  badge koneksi yang muncul sebelum tes kemampuan sebagai siap. Helper kini
  menunggu tes kemampuan pada browser tanpa profil lalu menutupnya lewat UI.
  Pemeriksaan privasi, math, offline dan auth tidak dihapus/dilonggarkan.
- Perbaikan: label lama pada capability/exit/prelim/storage/pattern disesuaikan;
  instruksi singkat pasangan ubin sejenis +/− tetap diberikan agar makna nol
  tidak hilang. `pnpm build` akhir, `pnpm typecheck`, ESLint file perbaikan dan
  `pnpm format:check` akhir exit0. Build `FNk5af98oFfsDZeeiRDem`, cache
  `pn-shell-6b96ece226571d3e`,63 aset/3 shell publik.
- Run produksi terarah dengan `PAPANNALAR_REUSE_LOCAL_DEMO=1 pnpm exec playwright
  test` pada enam lokasi failure + `video-display.spec.ts` + `shell.spec.ts`,
  reporter list/json dan output `artifacts/qa/ui-polish/repair-browser`:
  **31/31 PASS,2.3m,exit0**. Argumen lengkap pada `repair-browser-command.json`.
  Mencakup offline shell/font/IndexedDB/fullscreen, roster hanya RAM, exit/koreksi,
  rantai demo, tujuh pola, enam alat dan tiga preset/viewport, model/ink dan motion.
  Enam kasus editor/pairing polish juga PASS pada full run produksi.
- Ledger `final-evidence.json`: **112 skenario unik hasil terakhir PASS**,0 failure
  tersisa, gabungan full + repair. Tidak menjalankan full verify kedua atau
  mengubah hasil full awal menjadi exit0. Screenshot akhir algebra/badge papan
  1280x720 serta preview pecahan HP360 diperiksa aktual; viewport390/1366 juga diuji.
- `pnpm video` terkelola95752 aktif pada build akhir, seed idempotent menyatakan
  dataset contoh existing dipertahankan. Buka `/masuk` → Coba dengan data contoh →
  `/guru`; papan `/layar`. PostgreSQL lokal nyata, Auth/transport provider uji
  loopback; tidak deploy, membuka provider production atau membuat workspace visitor.
- Gate penutupan: `/masuk` dan `/layar` HTTP200 aktual pada server95752,
  `git diff --check` exit0 (warning CRLF non-blocking). Receipt `server-check.json`,
  log command dan seluruh hasil ada di `artifacts/qa/ui-polish/`.
- Warning non-blocking: launcher Node24.19.0 vs child24.14.1, NO_COLOR/FORCE_COLOR
  dan `use client` pada bundling fixture, bukan bundle aplikasi. QA menambah
  koleksi/sesi sintetis; dataset awal tidak direset. ZIP9.50 tetap snapshot sebelumnya.
- TRUE BLOCKER implementasi: **tidak ada**. Native QR/kamera/digitizer fisik,
  hosted Auth/Realtime/TLS, live AI dan izin/reviewer pilot tetap NOT_RUN/NEEDS_REVIEW.
  Next exact: walkthrough/rekaman lokal empat route guru, contoh editor, pairing
  dan alat; jika memakai HP/papan fisik, siapkan target HTTPS yang sah dan uji M12-b.

### 9.52 ZIP UI/UX polish terbaru — DONE (1 Oktober 2026, permintaan pengguna)

- `artifacts/releases/papannalar-ui-polish-2026-10-01.zip`:549 file sumber,
  config/lockfile/tes/dokumen dan ringkasan QA aman;551 entry/1.156.916 byte,
  termasuk37 migration. Build rujukan `FNk5af98oFfsDZeeiRDem`, kode polish P1–P3.
- Command `.local/ui-polish-zip.ps1` exit0. ZIP dibuka kembali; hash/ukuran
  seluruh549 file dan allowlist entry cocok,0 file secret/env terisi/DB/profil/
  node_modules/.next. Arsip September30 dipertahankan. Tes aplikasi tidak diulang
  karena packaging saja; validasi9.51 ikut pada `artifacts/qa/ui-polish/`.
- SHA256 `61183d7b6d8d594e98af77808ad8d54b22f404d791a6daec41e98b8f3ff95593`.
  Receipt `artifacts/releases/ui-polish-archive-check.json`; manifest terpisah
  `ui-polish-manifest.json` serta `ARCHIVE_MANIFEST.json`/`BUKA_DULU.txt` di ZIP.
- PLAN dalam ZIP sampai9.51 sebelum receipt ini agar checksum tidak melingkar.
  Kode, DB dan server tidak diubah. TRUE BLOCKER packaging: tidak ada.
  Next exact: ekstrak ZIP, buka BUKA_DULU.txt lalu VIDEO_HANDOFF.md untuk setup.

### 9.53 Publikasi GitHub — DONE (2 Oktober 2026, permintaan pengguna)

- Target diotorisasi pengguna: `IndraYuda13/papannalar`, private, default branch
  main; inspeksi GitHub melalui connector menyatakan repo kosong dan akses push.
- Tidak ada remote lokal sebelumnya. Terminal Git belum punya credential GitHub;
  publikasi memakai connector GitHub yang dipilih pengguna, bukan meminta secret.
- Scope: snapshot source/config/lockfile/migration/dokumen/tes yang sudah tervalidasi
  pada9.51, ditambah ringkasan QA allowlist. Folder tools pribadi `.agents`,
  DB/profil/env terisi/build/ZIP dan laporan mentah dikecualikan lewat `.gitignore`.
- Histori dokumen lokal dan perubahan pengguna dipertahankan. Tidak mengubah kode
  aplikasi/schema atau menjalankan ulang suite yang sudah lulus untuk publikasi.
  Publikasi menggunakan Git Data API connector, tanpa force update atau deploy.
- Pemeriksaan index awal menemukan satu baris kosong ekstra di akhir migration017;
  hanya whitespace akhir dirapikan, tanpa perubahan SQL/DDL/perilaku database.
- Validasi index akhir PASS;549 file (548 UTF-8+1 font berlisensi),37 migration.
  Satu blob binary dan13 batch tree diunggah; tree GitHub cocok tepat dengan
  `git write-tree`: `ff3428a77461e8086ea1e915a8f8170b2424d5dc`.
- Commit aplikasi `e10e27e478d5f3154e6c8bbd92b8a06e0e4ed15b` berhasil menjadi
  heads/main dan diverifikasi melalui GitHub API. Commit awal repo hanya .gitignore;
  repo private dan riwayat remote tidak ditimpa. Remote lokal menunjuk URL HTTPS
  repo pengguna; metadata commit akan dicocokkan hash sebelum sinkronisasi lokal.
- Hasil unit/browser/build9.51 tetap evidence sebelumnya, bukan tes baru pada run
  push ini. CI GitHub perlu diperiksa tersendiri; tidak mengklaim PASS sebelum hasil.
  TRUE BLOCKER publikasi: tidak ada. Next exact: periksa Actions dan lanjut rekaman
  sesuai VIDEO_HANDOFF; gate perangkat/hosted/pilot tetap seperti9.51.
- CI awal pada GitHub gagal setelah install/format/typecheck/lint PASS:
  1037 unit PASS,2 timeout default5s (500 paket grade3 dan500 kelas simulasi).
  Batch simulasi bukan uji latency interaksi. Hanya dua tes batch diberi timeout30s;
  seluruh500 sampel/assertion serta ambang coverage/latency lain tetap sama.
- Commit lokal/remote `4cecd1a49e7047e6f706d13b9dc8ef81343eb567` telah cocok hash;
  branch lokal `codex/github-publish` mengikuti origin/main, master dokumen lama
  dipertahankan. Folder upgrade yang muncul selama publikasi tetap untracked;
  tidak dicampur ke snapshot aplikasi yang sudah diuji.
- Perbaikan timeout: `pnpm exec vitest run tests/unit/package.test.ts
  tests/unit/turns-simulation.test.ts` **20/20 PASS,2 file,6.93s**; typecheck exit0.
  Lint/format kedua file dan typecheck exit0; tes terarah ini tidak menggantikan
  hasil CI penuh. Source/core/boundary tidak diubah, commit repair dipublikasikan
  setelah validasi terarah; CI penuh menunggu hasil run baru.

### 9.54 UI + AI v2 — U0–U5 DONE software lokal (2 Oktober 2026)

- Permintaan terbaru dieksekusi pada repo existing `IndraYuda13/papannalar`,
  HEAD `efcdd36b318cb84654a12f0dd698dd6bc0e05b94`, branch `work`.
  SOURCE_FINDINGS dicocokkan dengan HEAD; perbaikan timeout CI tetap utuh.
  Tidak scaffold, mengulang implementasi M00–M17, reset data atau menimpa histori.
- Script docs dry run lalu apply9 addendum; backup `docs/baseline/ui-ai-v2`.
  Marker idempoten dan body/jurnal lama dipertahankan. PRD/brand/UX/biaya/QA/tech
  aktif melalui addendum; dokumen pembelajaran02/katalog03 tidak diubah.
- Semua15 tujuan navigasi dibenahi: shell/navigasi, beranda, kelas/detail, katalog,
  editor terpilih/preview, mulai, hasil/detail, controller/scanner, latihan, demo
  dan idle papan. Viewport360/390/1366, board1280/1366/1920 dan teks130% diuji.
  CTA mulai berada pada header meski sesi aktif banyak; form/historical key tetap.
- Tiga GLB/poster asli digunakan, CC0,270410byte total. Three0.186.1 MIT lazy;
  chunk154113byte gzip opsional, terpisah dari precache/scanner. Poster/no-WebGL/
  save-data/reduced motion/context atau chunk gagal menjaga fungsi. Render browser
  idle/hidden/offscreen tidak bertambah; tampilan ringan melepas canvas.
  Hidden adalah fixture eksplisit, bukan bukti konsumsi daya GPU fisik.
- Dua adapter native OpenAI Chat Completions/Anthropic Messages tersambung ke
  trusted profile/env, limit, validator, reserve/complete store dan SQL038 baru.
  Model/base/protocol konfigurabel; alias sah, usage hilang tetap nullable,
  reservasi konservatif, harga/cap/version snapshot dan idempotensi dijaga.
  Review kosong/null dan sample restriction tetap; model coding bukan default.
- Migration038 hanya diterapkan pada `pn_m01c_test` loopback55432 PostgreSQL17.11;
  migration001–037/core/content/local/auth/review unchanged. Seed7B/7C existing
  dipertahankan. Tidak ada migration DB hosted, paid API, deploy atau approval baru.
- Batch actual:35 contract/HTTP,11 diagnostic-policy/CLI,34 reference codec,
  7 route/native HTTP/ledger/concurrency tests PASS. Reference bukan integration;
  hook Auth/review route test sintetis, RLS nyata diuji SQL secara terpisah.
- Gate awal berhenti format/lint; dua full gate120PASS/2FAIL masing-masing.
  Perbaikan editor/CTA dan sinkronisasi koordinat/teardown fixture QR diuji terarah;
  math/receipt/privacy/offline assertion tidak dilemahkan. Semua log dipertahankan.
- Gerbang akhir serial `pnpm verify` **exit0**: format/typecheck/lint PASS,
  **1086 unit/70file**, coverage92.44/87.47/96.26/93.44%, SQL/RLS PASS termasuk
  LLMv1 **27** dan v2 **28** assertions, **7 integration**, build PASS,
  **122/122 E2E**,1worker,0retry/skip/flaky,15.4menit. Build
  `g4UViW8Y3PMr1kvczW2E4`. Walkthrough produksi15/15 HTTP200;0overflow,
  0runtimeerror,0engine/GLB request sebelum opt-in. Before/after memakai entitas
  sintetis baseline yang sama. Pengeluaran vendor/aset USD0; infra tidak diukur.
- Evidence aman `artifacts/qa/ui-ai-v2/{summary,route-matrix,bundle,asset-budget,
  doc-idempotency,server-check}.json`; log `/workspace/.papannalar-cloud/logs/ui-ai-*`.
  Detail before/after, config, biaya, diagnosis, batas bukti dan rollback ada di
  [UI_AI_HANDOFF.md](UI_AI_HANDOFF.md). Screenshot mentah hanya lokal/sintetis.
- Implementasi tidak memiliki blocker lokal. Kebutuhan live/hosted/review/perangkat
  dicatat tepat pada handoff; tetap EXTERNAL_BLOCKED/NOT_RUN, bukan production-ready.
  Perubahan workspace belum commit/push. Server lokal build akhir tersedia3100;
  jalankan `source /workspace/.papannalar-cloud/activate.sh`, `pnpm build`,
  `pnpm video`; jangan dua launcher pada port sama. Next exact: review/run build
  lokal dan lakukan gate eksternal hanya sesudah resource serta otorisasi tersedia.

### 9.55 Koreksi UI dari screenshot pengguna — DONE (2 Oktober 2026)

- Caption “Papan dan benda belajar” serta tombol mode Jelajahi3D/Lihat poster
  dihapus. Scene tampil3D otomatis saat terlihat; import/render tetap terpisah,
  preferences dibaca dahulu, no-WebGL/save-data/light/chunk gagal memakai poster.
  Panel login tersembunyi pada HP tidak memicu download3D; scanner tetap terpisah.
- Navigator soal tadinya memakai min-content160px ditambah padding/border26px
  pada ruang166px, sehingga kartu meluber20px tanpa scroll horizontal halaman.
  Grid/min-width0/lebar100% dan ellipsis sesuai ruang memperbaiki batas kartu;
  tidak memakai clipping panel untuk menyembunyikan masalah.
- Regresi browser kini memeriksa setiap kartu+teks terhadap inner panel pada
  360/390/1024/1366 dan teks130%; proof visual tambahan1280 dan teks100/130%.
- Format/typecheck/lint/build PASS. Build `UoI1Yvm5SQ70SRXgQDM8A`;
  **21/21 targeted E2E PASS**,1worker,0retry/skip/flaky,80.892s:3D default/lazy,
  preferensi tersimpan/save-data/fallback, cache/scanner/offline, walkthrough,
  editor/template/preview/reuse/history/pairing dan navigasi.
- Full verify1086+7+122 pada9.54 tetap evidence historis buildg4, tidak diklaim
  dijalankan ulang pada koreksi kecil ini. AI/SQL/auth/data/core tidak berubah.
  Bukti baru `artifacts/qa/ui-ai-v2/ui-corrections.json`, screenshot before/after
  pada `corrections/`, log `/workspace/.papannalar-cloud/logs/ui-corrections-*`.
  Handoff mencatat perilaku3D terbaru. Server demo tetap lokal, seed dipertahankan;
  tidak melakukan paid API, hosted migration, deploy atau push.

### 9.56 Authoring Blender dan kandidat koreksi final — DONE (2 Oktober 2026)

- Permintaan tambahan pengguna diterapkan dengan Blender4.3.2 yang sudah ada:
  tiga geometri kit di-refine (bevel/normals, bola halus, warna linear glTF,
  roughness matte), GLB dan poster Cycles CPU720×540 diekspor lokal. Tiga sumber
  `.blend`, script reproduksi dan provenance disimpan pada `design/pn-ui-v2`
  serta `scripts`. Original enam GLB/poster tetap byte-identical dengan kit.
  Percobaan denoising pertama gagal karena build Blender tidak memiliki OIDN;
  render96samples tanpa denoising kemudian PASS, dengan `--python-exit-code1`.
- Kamera diperbaiki setelah pemeriksaan visual agar seluruh model/alas lebih
  besar namun tetap dalam viewport saat tilt pointer. Tidak ada RAF/auto-orbit,
  scene WebGL pada soal atau download engine di scanner; preferensi/fallback utuh.
- Kandidat final `JJ8Ophp65UWCGJ7KT-ntf`: serial format/typecheck/lint/build dan
  **21/21 targeted E2E PASS**,86.658detik,1worker,0retry/skip/flaky. Scope meliputi
  default3D/all3GLB, no-WebGL/save-data/preferensi/chunk gagal, offline/scanner,
  walkthrough/editor/preview/pairing/histori/navigasi. Full verify pada9.54 adalah
  hasil historis buildg4; tidak diklaim dijalankan ulang untuk koreksi visual.
- Screenshot login/editor/ketiga model diperiksa visual. Navigator **20px→0px**
  pada360/390/1024/1280/1366 dan teks100/130%;0runtimeerror. Policy browser:
  idle105→105, hidden105→105 (stub eksplisit), offscreen117→117,
  reduced165→165, light0canvas. Bukan bukti GPU/perangkat fisik.
- Model245304byte + poster341308byte =586612byte; first-model68160byte,
  maksimum121472byte<500KB. Chunkopsional154313bytegzip<250KB dan tidak masuk
  precache; tiga poster saja masuk. LisensiCC0/ThreeMIT; aset/paidAPI USD0.
- Proof aman `artifacts/qa/ui-ai-v2/ui-corrections.json`; log terbaru
  `/workspace/.papannalar-cloud/logs/ui-corrections-final-fit-*`. Core/content/
  local/auth/review/37migration lama tetap unchanged;9body dokumen+marker dijaga.
  Auth/transport sintetis, SQL/RLS loopback nyata. Seed7B/7C dipertahankan.
- Handoff memuat seluruh route sebelum/sesudah, dua protokol AI yang diuji lokal,
  batas live dan cara run. Draft start_skill cloud diperbarui tanpa publish/deploy.
  Tidak ada blocker implementasi lokal; gap eksternal tetap mengikuti handoff.
  Next exact: run `source /workspace/.papannalar-cloud/activate.sh`, `pnpm build`,
  `pnpm video` setelah menghentikan launcher sendiri yang sudah berjalan.

### 9.57 Commit dan push UI/AI + Blender — DONE (3 Oktober 2026, WIB)

- Pengguna mengotorisasi commit/push hasil implementasi. Target existing
  `origin` adalah `IndraYuda13/papannalar`; remote `main` sebelum push tepat
  `efcdd36b318cb84654a12f0dd698dd6bc0e05b94`, sama dengan baseline lokal.
- Commit implementasi `5eef21f9c2aea0c9217c4fb376c44e6aaacf792e`:
  `feat: upgrade Studio UI, Blender assets and compatible AI providers`.
  Snapshot127file mencakup UI seluruh halaman, adapter/config/ledger/SQL/test,
  sumber Blender/GLB/poster, addendum/backup dan evidence JSON allowlist.
  Env terisi, DB, helper/build/profil, ZIP, screenshot dan log mentah tetap excluded.
- `git push origin HEAD:refs/heads/main` exit0, fast-forward `efcdd36→5eef21f`.
  `git ls-remote --heads origin main` mengembalikan SHA yang persis sama dengan
  commit lokal. Tidak memakai force push, rewrite histori, deploy, paid API atau
  migration DB hosted. Handoff diperbarui dalam commit dokumentasi lanjutan.
- Hash source/aset cocok dengan kandidat final yang sudah diuji pada9.56;
  build `JJ8Ophp65UWCGJ7KT-ntf` dan21tes terarah tetap evidence sebelumnya,
  bukan tes baru saat push. Sembilan backup/body dokumen dan37migration/core/
  content/local/auth/review lama kembali diverifikasi tetap terjaga sebelum commit.
  Index implementasi lolos whitespace check; backup PLAN mempertahankan18
  Markdown hard breaks asli (dua spasi akhir), sehingga tidak dinormalisasi.
- Tidak ada blocker publikasi. CI post-push belum diperiksa. Next exact:
  periksa Actions bila diperlukan, atau jalankan build mengikuti UI_AI_HANDOFF;
  gate live/perangkat/hosted tetap mengikuti batas bukti sebelumnya.


### 9.58 Koreksi UX HP, akun contoh dan ubin Blender — DONE (3 Oktober 2026, WIB)

- Tujuh permintaan terbaru diterapkan: gate AI khusus akun contoh dihapus pada
  status/Bisik/enrichment, tetap melalui native adapter dan ledger/budget/review;
  menu “Tampilan nyaman” serta copy footer/context berulang dihapus; preferensi
  OS/save-data/preferensi tersimpan tetap dihormati tanpa menu tambahan.
- Preview sesi/editor punya area gulir bounded untuk6alat; garis bilangan full
  width/label adaptif, grafik dengan label signed/decimal dan padding responsif;
  matematika/pointer projection konsisten, tombol HP48px dan board tetap besar.
  Ikon SVG kartun/face dekoratif tidak membawa kunci atau hasil penilaian.
- QR scan langsung claim satu kali; challenge dari kamera HP menunggu sesi aktif
  lalu claim otomatis. Heading/form berdasarkan ACK, form kembali setelah putus.
  Close terkunci, punya progres, menyimpan/cache lalu kembali `/guru`; gagal
  tetap retryable. Geser antarsoal hanya strip judul; drag alat/tulisan aman.
- Menu board48px dan konten closed tanpa layout. Motion route/soal220ms,
  scroll/reveal/input feedback mengikuti preferensi, tanpa remount provider,
  auto-orbit atau WebGL pada soal/scanner.
- Blender4.3.2 mengganti hanya algebra-kit: baki miring x²/rod x/unit square,
  raised mesh labels tanpa font; GLB127860byte8376triangle, poster99214byte.
  Total3GLB317492+355382poster=672874byte. Dua model/poster/blend lain unchanged.
  Sumber/scripts/manifest/provenance tersedia; seleksi asset CLI untuk reproduksi.
- PostgreSQL lokal snapshot belum berjalan: awal9integrationcase tidak dieksekusi
  (connection refused), setelah startup cluster existing9/9 PASS (8.00s).
  Native HTTP OpenAI/Anthropic mencakup sample/normal, replay, pricing/profile,
  unknown counters, content/privacy/rate gate dan concurrent reservation.
  Tidak memakai API berbayar/live, DB hosted, migration baru atau deploy.
- Targeted browser5/5 PASS (45.1s):360/390 keenam alat+tulisan, scan QR piksel
  sampai ACK SQL, collapse/revoke, close failure/success, geser, link pending,
  foreign QR tanpa network dan kamera ditolak tetap bisa manual.
  Kartu juga PASS pada360/390; seluruh6alat board1280/1366/1920 PASS (8.3s),
  tiga GLB render satu canvas PASS (5.8s). Koreksi glyph/padding/menu closed
  berasal dari inspeksi browser nyata.
- Satu batch browser sempat overlap perebutan operator akun contoh; terdiagnosis
  sebagai konflik resource. Seluruh batch selanjutnya/final dijalankan serial.
  Early test salah menunggu next enabled di soal terakhir dan kamera canvas
  tanpa repaint diperbaiki pada fixture; tidak memperlemah invariant aplikasi.
- Attempt final pertama dihentikan exit130 setelah27 E2E PASS/1interrupted/
  101not-run untuk audit regresi motion. Penanda/face kemudian dipindahkan
  sebagai satu visual group: motion160ms tetap ada, drag tanpa transition,
  reduced-motion0ms; test10frame memastikan face/dot tidak terpisah.
- Attempt final berikutnya build `waZ7xW6s4J_t931tl5c6p`: format/type/lint/
  unit1086/integration9/SQL/build PASS, E2E128 PASS/1 FAIL, command exit1.
  Test OPEN01 gabungan9viewport/preset dan siklus privasi tinta kehabisan
  deadline total30s saat revoke; assertion belum selesai, bukan bukti PASS.
  Diagnostic scoped timeout60s PASS (test25.8s), kemudian test mempunyai budget
  total60s serta assertion tambahan response revoke sukses dan clear<5000ms;
  deadline tiap assertion tetap default. Targeted rerun1/1 PASS (test27.8s,
  total32.1s). Percobaan instrumentation pertama dihentikan exit130 untuk
  memperbaiki URL test-only yang salah; aplikasi tidak diubah untuk timeout ini.
- Attempt build `1_SKjulHq72o163c0t3K-` source `a7d52afae5c3b3b05643e8f53690a8b67cf5b1544e3f7d6506511f516dda5ae5`
  dihentikan exit130 saat audit screenshot HP menemukan label Bagi pecahan
  terlalu rapat/overlap; E2E116 PASS/1interrupted/12not-run, bukan full PASS.
  Toolbar pecahan diubah menjadi kolom responsif, label di atas select,
  controls48px tanpa overlap. Test menambah bounding-box invariant bagi setiap
  baris. Targeted360/390 kedua case PASS (16.0s), screenshot diperiksa ulang.
- SHA rekonstruksi memastikan tepat2file berubah sejak unit/integration/SQL
  PASS: CSS preview dan assertion E2E. Seluruh499file lain byte-identical,
  termasuk semua TypeScript aplikasi, unit/integration inputs dan assets.
  Suite unit/integration tidak diduplikasi setelah perubahan CSS ini.
- Kandidat final source SHA256 `cabf4f62d5300e949e48855744ddab57e45b2a7cc1a9d6724aeef7465f0b5adb`
  (501file) dibekukan. Command serial `pnpm format:check && pnpm typecheck &&
  pnpm lint && pnpm build && pnpm test:e2e`: format/type/lint/build PASS,
  E2E129/129 PASS (17m1.669s),1worker/retry0/flaky0/skip0, command exit0.
  Build final `ANeazQh8M22lxHU2tCNGE`; revoke/clear tinta2431ms, tanpa
  storage write/request tinta, reload tetap bersih. Log E2E
  `/workspace/.papannalar-cloud/logs/session-ux-final-candidate.log`;
  output tahap sebelumnya ada pada execution transcript.
  Receipt aktual `artifacts/qa/ui-ai-v2/session-ux-v3.json`; seluruh source/hash,
  budget/model/precache/protected38migration dan9body dokumen cocok.
  Screenshot12preview HP serta GLB aktual diperiksa dan disimpan ignored.
  Next exact: commit/push sesuai otorisasi pengguna sebelumnya.
  Credential AI/HTTPS/hardware nyata tetap gap eksternal, bukan bukti production.

### 9.59 Publikasi koreksi UX HP + akun contoh — DONE (3 Oktober 2026, WIB)

- Commit implementasi `9d26efc91a0d404f16557f453b852962dffc41ef`:
  `fix: polish mobile sessions and enable sample AI`,44file1976insert347delete.
  Snapshot mencakup7permintaan terbaru, Blender algebra-kit dan receipt aktual.
  Tidak menyertakan env terisi, DB, helper/log, screenshot mentah atau attachment.
- `git push origin HEAD:refs/heads/main` exit0, fast-forward `4ce1227→9d26efc`.
  `git ls-remote --heads origin main` sama persis dengan SHA lokal. Catatan
  publikasi disimpan pada commit dokumentasi lanjutan; kode/aset tidak berubah.
- Kandidat final `ANeazQh8M22lxHU2tCNGE`, SHA sumber `cabf4f62d5300e949e48855744ddab57e45b2a7cc1a9d6724aeef7465f0b5adb`
  tetap sama dengan receipt129E2E PASS dan bukti reuse1086unit/9integration/SQL.
  Dokumen akhir lolos format check; seluruh9body/jurnal lama dan38migration tetap.
- `source /workspace/.papannalar-cloud/activate.sh` lalu `pnpm video` startup
  sukses, `http://127.0.0.1:3100/masuk` HTTP200. Launcher memakai build final
  existing, seed7B/7C serta cluster PostgreSQL loopback existing; runtime Auth/
  transport tetap fixture, AI validation OFF. Tidak membangun ulang kandidat.
- CI post-push NOT_CHECKED; hosted provider/perangkat nyata NOT_RUN;
  deployment/migration DB hosted/paid API NOT_RUN. Next exact: pengguna dapat
  membuka data contoh, lalu mengikuti konfigurasi/profile/review AI pada handoff
  ketika siap. Uji live/hosted tetap memerlukan izin yang sesuai.


### 9.60 Audit alur guru dan bantuan AI — DONE software lokal (3 Oktober 2026, WIB)

- Instruksi pengguna mengotorisasi audit/perbaikan langsung dan push, tanpa
  konfirmasi detail visual. Latihan tersembunyi, judul Beranda ganda, mode
  pilot pada akun contoh, panel teknis dan AI yang tidak jelas adalah masalah
  aktual. Audit Chromium390/1366 mencakup beranda, latihan, kelas, soal, mulai
  mengajar dan asesmen. Beranda contoh mempunyai banyak sesi aktif existing;
  sesi tidak dihapus, hanya tiga terbaru terlihat dahulu.
- Menu5tugas, kartu latihan di home, jalur kelas membawa konteks; contoh
  langsung memakai kelas demo. Persiapan/kegiatan/AI/lisan terbuka sesuai
  kebutuhan. Menutup bagian tidak unmount draft/sesi. State kegiatan terisolasi
  per kelas/mode; pilihan tampilan disimpan per guru/mode. Respons async lama
  tidak mengembalikan nama setelah lock.
- Kartu saran memakai judul kesulitan; peran cerita AI dan bantuan sesi jelas.
  Status/fallback tidak mengaku ready/live atau membuat session ID fiktif.
  Preview privasi, explicit apply, review, native adapters/ledger tetap utuh.
  Teks bebas tambahan tertutup; endpoint/model/key tetap konfigurasi server.
- Device controls tetap mounted untuk auto-sync/update guard. Ringkasan rutin
  tersembunyi; quota/eviction/conflict penting punya alert dan pintu ke recovery.
  Cache mode/kelas memakai schema/access existing; classDetail cache dihapus
  saat DELETE kelas sukses. Query mode/UUID valid hanya mengambil shell publik
  kanonis, tidak menaruh URL/private HTML/RSC/API pada CacheStorage.
- Format/types/lint PASS pada batch cache;17unit cache PASS. Targeted produksi
 17/17 E2E PASS1,6menit,1worker/retry0: UI pemula360/390, real local RLS,
  privasi nama/raw pertanyaan, fallback, draf/CAS, CSV, PDF offline, eviction,
  update safety, restore/takeover/conflict dan idempotency. Test FLOW03 awal
 3/4 lalu0/1 dev gagal selector label DOM bernomor, diperbaiki ke combobox
  accessible. Deadline assertion tidak diperlemah; targeted produksi lulus.
- Build targeted `Quvw_Z5I4UI1eyh2trzdf`; setelahnya ringkasan3sesi/copy topik
  dan indikator offline ditambahkan. Kandidat final berikutnya memakai satu
  `pnpm verify` serial; tidak menjalankan full suite terpisah lagi.
- Sebelum verify final: core/content/contracts/server/auth/review/38migration,
  lockfile/aset unchanged. Dokumen00–07/jurnal lama dipertahankan. Tidak ada
  paid/liveAPI, hostedmigration/deploy; USD0, tidak menambah aset/dependency.
  Provider live/HTTPS/hardware/studi guru adalah gap eksternal; bukan blocker
  implementasi yang dipakai sebagai alasan berhenti. Next exact: final verify,
  inspect build/screenshots/evidence, commit dan fast-forward push sesuai izin.

- Attempt verify awal: format/type/lint PASS, unit1086 PASS/1FAIL pada test
 500seed (5019ms melewati default5000ms),69file PASS/1FAIL; exit1,
 integration/build/E2E NOT_RUN pada attempt itu. Core/test package byte-identical.
 Diagnostic single-worker tanpa coverage19/19 PASS,500seed1536ms,7,41s total.
 Runtime Vitest5 mendukung VITEST_MAX_WORKERS; kandidat akhir memakai1worker
 agar coverage tidak bersaing dengan test OMR/domain lain. Tidak mengubah
 assertion,500sample,timeout,coverage threshold atau config default repositori.
 Hash510input termasuk3config runner adalah e023cf05bfc7b6d7ad583f6903c1dc988edb5ae1891c5ff36d36a6d5291793c5;
 daftar507source sebelumnya sama, perubahan hash hanya penambahan manifest config.

- Attempt `VITEST_MAX_WORKERS=1 pnpm verify`: format/type/lint, unit1087/70file
 PASS (coverage92,44/87,47/96,26/93,44), SQL/RLS dan integration9/1file PASS,
 build PASS. Browser dihentikan exit130 setelah18PASS/4FAIL/1interrupted,
 111NOT_RUN (JSON skipped112 termasuk interrupted). Empat kegagalan adalah
 ekspektasi UI lama: tombol buat kelas harus aktif saat offline, storage hanya
 controller UUID, judul kosong lama, link papan lama. Assertion diganti mengikuti
 UI yang benar; whitelist storage tetap ketat pada teacher/mode dan boolean.
 Cache/auth ownership, HTTPOnly/CSRF, nama canary dan API404 tetap diuji.
- Targeted koreksi `auth-ownership` + `assessments`:10/10PASS,39,1s, retry0.
 Per-file hash membuktikan508/510 input identik terhadap suite unit/integration
 yang sudah lulus; dua perubahan hanya browser helper dan assertion auth UI.
 Kandidat a02c160ca0ce09c276905657be254d5d958f27ea1089a4059fced04cf17cd58f
 (510file) menjalankan format/type/lint/build + semua134E2E secara serial.
 Unit/SQL/integration yang sudah tercakup verify tidak diduplikasi.

- Serial browser berikutnya dihentikan untuk hasil audit pemberitahuan, bukan
 karena test gagal:69PASS/0FAIL/1interrupted/64NOT_RUN, exit130,13,6menit.
 Konflik/login yang baru muncul dari auto-sync hanya mengubah panel tertutup.
 Callback UI kini menyampaikan peringatan penting pada DeviceControls untuk
 proses otomatis maupun manual; retry, transport, queue, schema dan data utuh.
 Dua regresi baru memakai queue IndexedDB nyata dengan HTTP401/409 sintetis,
 tanpa klik sinkronisasi manual: notice terlihat, detail tetap tertutup sampai
 tombol recovery diklik, mutation/event/outbox tetap identik. Unit/integration
 tidak mengimpor hook/komponen UI yang diubah sesudah suite lulus.

- Build kandidat final `1lvMZRAM-FPLsYLD6GOcJ`; format/type/lint/build PASS.
 Full browser136case serial:131PASS/5FAIL,18m33,971s, retry0/skip0.
 Empat gagal memakai ekspektasi UI lama (jumlah menu4 di3viewport dan copy
 asesmen kosong). Satu fresh-class gagal assertion konsol akibat board HTTP403;
 seluruh langkah fungsional selesai. Diagnostic endpoint ditambahkan, assertion
 konsol tetap strict. Ulang5case serial PASS5/5,1,9menit;403 tidak terulang.
 Tidak mengklaim transient403 sudah didiagnosis/diperbaiki di kode produksi.
- Kandidat aplikasi/build tidak berubah setelah full:508/511input byte-identical,
 tiga perubahan hanya ekspektasi/instrumentasi browser. Bukti memetakan tepat5
 case gagal ke5case PASS;136skenario unik tercakup131+5, tanpa menduplikasi full
 suite. Final format/type/lint +5regresi exit0. `pnpm verify`/full E2E earlier
 bukan full PASS; riwayat gagal/interrupted tetap dicatat pada receipt/handoff.
- Source final e9cc3fc34a47ef39c8c0ae853328d6214a41314a86ce9ca5fe12d16f75695d4f,
 511file. Unit1087, integration9, SQL/RLS dipakai dari verify sukses per tahap;
 seluruh input yang diimpor unit/integration identik. Perbandingan502/510file
 utuh; delapan perubahan UI notification/browser dan satu helper UI baru.
- Audit produksi akhir12route/viewport (390/1366) +2capture AI PASS: overflow0,
 pageerror0; latihan selalu7B/demode, persiapan terbuka, teknis tertutup.
 Screenshot diperiksa langsung. Beranda HP2522px vs sebelum12352px; dataset
 contoh bertambah dari test, jadi bukan perbandingan dataset beku/studi guru.
 3sesi terlihat dan108older tersedia tanpa dihapus. Audit/hasil aman pada
 `artifacts/qa/ui-ai-v2/teacher-flow-v4.json`; screenshot/raw log excluded.
- Preservation final PASS: core/content/contracts/server,38migration/SQLtests,
 lockfile,3GLB/poster/.blend,8dokumen original dan prefix jurnal/handoff lama.
 Biaya APIUSD0; biaya cloud tidak diukur. Live provider/perangkat/HTTPS NOT_RUN;
 observed403 tidak direproduksi pada regresi. Tidak ada deploy/hostedmigration.
 Demo build final berjalan port3100 memakai DB existing + Auth/transport fixture.
 Next exact action: commit hasil terverifikasi dan push fast-forward main sesuai
 instruksi pengguna; catat SHA remote sesudah operasi aktual.

- Publikasi aktual: commit implementasi 5a101f5f71b70892890204dbdf73f51878c5156f
 berhasil fast-forward dari6a637a9 ke origin/main; push exit0 dan ls-remote
 cocok. Working tree bersih sesudah commit; patch berikut hanya mencatat
 hasil publikasi pada jurnal/handoff/receipt. CI post-push belum diperiksa;
 tidak ada deployment atau migration hosted. Task software lokal selesai.


### 9.61 Perbaikan besar alur latihan dan manfaat AI — verifikasi lokal selesai (3 Oktober 2026, WIB)

- Instruksi terbaru pengguna mengotorisasi audit/perbaikan terstruktur dan
  commit/push. Baseline8df9357 bersih. Reproduksi Chromium360/390/1366 pada
  development: tombol182x48 di HP tetapi182x76 desktop; dua formulir pairing
  pada halaman latihan; expiry lease90detik akun contoh memberi HTTP409 untuk
  kode yang benar. Tidak mengubah akun/data pengguna atau DB hosted.
- Tiga langkah: siapkan soal, cerita/bantuan opsional, satu sesi dari paket
  yang dipilih. Contoh PRELIM tersimpan tetap dapat diakses di /guru/simulasi;
  soal tambahan cetak/cekakhir tersedia terpisah. Tidak unmount draft saat
  menutup disclosure; cache query kedua route mengarah ke shell publik.
- AI memilih topik/tema yang diizinkan, memperlihatkan soal semula/cerita,
  apply hanya soal dicentang dengan CAS; feedback dan link tugas bertahan
  setelah revisi. Tugas/PDF menggunakan teks yang disimpan, kunci/angka tetap.
  Saran AI tersedia pada kartu di langkah2 setelah sesi nyata dimulai; tidak
  membuat ID sesi atau approval palsu. Pertanyaan pembuka diskusi diberi
  tujuan eksplisit, topik dapat diganti tanpa mengubah cek/tugas/histori.
- Renewal30detik/focus/online dan satu retry setelah renewal tanpa takeover
  memulihkan lease contoh sendiri. Kendali aktif perangkat lain tidak diambil
  alih otomatis; kode expired/konflik/login/rate mempunyai langkah pemulihan.
  SQL lama utuh; SQL039 generated menambah referensi suhu/kedalaman pada
  validator sync, bukan approval. Review manifest produksi tetap kosong.
- Bahasa draf/replay/pending/kodelevel diganti dengan tindakan/makna yang
  dapat dibaca guru. Status konten dijelaskan pada detail, peringatan penting
  tetap terlihat. Tombol persiapan48px tidak meregang. Kebutuhan tiap siswa
  tersedia bila dibuka; tidak mendahului tindakan utama dengan32baris kosong.
- Targeted unit44/4file PASS;9nativeHTTP+PostgreSQL integration PASS kedua
  protokol, termasuk tema baru, SQL allowlist, ledger dan sample/non-sample.
  Tidak memanggil provider live/berbayar; biayaAPIUSD0, aset/dependency baru0.
- Attempt UI pertama0/4: nama akses tombol navigasi berduplikasi dengan aksi
  persiapan. Nama/tujuan navigasi dibedakan; ulang4/4 PASS49,4detik, retry0.
  Menguji partialapply/cancel, angka/kunci, PDF, paket sama/frozen, saran sesi,
  satu pairing dan expiry409→renewal→200; pengendali lain tetap409.
- Targeted legacy di development10PASS/4FAIL5,4menit: satu ekspektasi status
  lama dan3menunggu serviceworker yang memang tidak aktif di dev. Status
  diperbarui; assertion offline tetap dipertahankan untuk build production.
  Tidak menaikkan timeout, mengurangi500seed atau melemahkan privasi/RLS.
- Full verify serial: format/types/lint,1089unit/70file,167assertionSQL/RLS,
 9nativeHTTP+PostgreSQL dan build PASS. Browser139PASS/1FAIL19m52,375s:
 allowlist shell publik lama belum memuat /offline/guru-simulasi.html.
 Assertion diperkuat untuk4shell dan actual offline navigation ke route baru.
- Audit HP menemukan langkah sebelumnya menumpuk. Navigasi/CTA menutup bagian
 sebelumnya tanpa unmount. Pada arrival, preference lama yang membuka3bagian
 dirapikan; pilihan manual setelah itu tetap bisa dipakai. Catatan PDF diubah
 ke bahasa yang sama dengan UI. Perubahan4inputUI/PDF+3test,574/581input lain
 identik; input matematika/provider/ledger/SQL tetap. Tidak duplicatefullsuite.
- Final serial gate exit0: format/types/lint,5PDFunit/2file,build dan19E2E
 PASS3,4menit/1worker/retry0. Cases latihan,AI,offline,PDF,privacy,freshclass
 dan state terpelihara diuji. Full140skenario unik tercakup139+regresi; run
 pnpmverify sebelumnya tetap dicatat FAIL, bukan dibuat140/140PASS.
 BuildAcxGagMd5dd7VgVnPgFrA/source356934061d4541de114247b7d7d9d4a6770f7d46d44d965ac0b66520607166a2.
- Audit21capture/state production360/390/1366+20pxfont: overflow0/pageerror0.
 Gambar diperiksa; screenshot excluded. PDF asli diunduh/diekstrakpdftotext:
 soal cerita suhu yang dipilih+footerplain hadir. PreviewUI diberi labelsintetis;
 tidak mengarang liveprovider/review. Skiplink liveviewport hidden sebelum/
 sesudahlongcapture danvisibleTab; overlay pada rawcapture ialah artefakfixed,
 bukan buglive. Tidak mengubah aksesibilitas yang sudah benar.
- Preservation PASS144domainfile,38SQLmigrationexisting,lockfile,GLB/poster/
 blend,8dokumenoriginal serta prefixjurnal/handoff. Receiptbundle lama yang
 diupdate builddipertahankan, measurement baru ada di practice-v5.json.
 Tidak mengklaim seluruhkonten unchanged: helperpembuka+2framedraft disengaja.
 Evidence artifacts/qa/ui-ai-v2/practice-v5.json; panduan novice docs/13.
- Publikasi aktual: commitimplementasi f636a09268e95952dcd44f597a6a3c1bbc78ec51 berhasil
 fast-forward push8df9357→f636a09 ke origin/main,exit0; ls-remote cocok
 danworkingtreebersih. Catatanpublikasi berikut hanya3filedoc/evidence;
 source/tests/buildcandidate tetap. CIpostpush belumdiperiksa,tidakdeploy.
 Tasksoftwarelokal selesai. Providerlive,reviewnyata,hardware/studiguru dan
 hostedmigration memerlukan langkahoperator sesuaihandoff; tetapNOT_RUN.


### 9.62 Alur guru sederhana, cetak, asesmen sendiri dan reset papan — implementasi lokal selesai (3 Oktober 2026 UTC)

- [S] Instruksi terbaru: topik pembuka tidak terkunci, hapus panduan operator
  AI dari UI guru, siapkan materi lebih jelas tanpa approval palsu, reset papan
  tersangkut, sederhanakan flow, jelaskan/cetak Kartu Nalar, tampilkan soal sendiri
  pada asesmen dan kembali ke daftar setelah Simpan & siap digunakan. Commit/push
  sudah diotorisasi pengguna; tidak perlu approval detail visual. Solo integrator;
  tidak ada PR, subagent, scaffold, pengulangan M00–M17 atau perubahan lockfile.
- Baseline c2a0593adfb73c8d683340b8ac588cd8309e112f/branch work bersih. Skill setup
  dan cloud runtime digunakan; toolchain existing Node24.14.1/pnpm11.19.0/
  PostgreSQL17.11/Chromium153 aktif. Runtime/network/Git read diperiksa; tidak
  mengubah konfigurasi cloud atau meminta credential kembali. Dokumen Next16.3.6
  use-client/Link/useRouter dibaca sebelum API diubah. K41 ada di TECH_SPEC2.3.
- Flow kelas → soal → mengajar, satu klik mulai sesi dari paket tepat; AI opsional.
  Kelas terpilih tampil; Ganti kelas menutup setelah pilihan. Cek lisan/pengaturan/
  kartu lain berada di Alat & pengaturan tambahan; warning quota/eviction/conflict/
  login tetap terlihat dan membuka ancestor detail saat recovery. Draft tetap mount.
- Topik pembuka frozen memakai copyPackageForPreparation + transaksi Dexie CAS
  source; UUID baru/revision1/frozenfalse, pointer kelas/paket diperbarui atomik.
  Soal/jawaban sesi frozen lama tetap utuh. Checklist tiga bool tersimpan tenant/
  mode/id dan fingerprint isi, bukan approval; perubahan isi reset centang. Parsing
  schema menormalkan key order sebelum hash agar generated/parsed tidak berbeda.
- Cetak kontekstual 10/5 baris pada persiapan/sesi, 3 pada cek akhir; cek lisan
  tanpa kartu. Generic print tetap ada sebagai alat tambahan. Custom asesmen tetap
  memakai PDF binding1–5 baris yang lama, bukan kartu generic. A4/100%/hitam putih,
  satu kartu per siswa dan hitungan lembar dijelaskan. PDF tugas berbeda dari kartu.
- AI tetap dua adapter existing/config/ledger/budget/privacy/static fallback;
  panduan pengelola dihapus dari halaman guru. Keamanan/review tidak dibypass.
  Katalog otomatis masih membutuhkan review dan uji kelas nyata. Own collection
  dapat dipakai melalui Mulai mengajar; tidak melabeli katalog draft production.
- Soal sendiri siap terlihat dalam dropdown asesmen tanpa tab sumber tersembunyi.
  Draft/interaktif punya alasan dan tautan perbaikan/copy kartu, tanpa menebak
  pilihan/kunci. Ready-save sukses kembali ke Soal Saya + banner; invalid tetap
  draft, gagal503 tetap editor/isian utuh. Query saved/from strict UUID dan tidak
  menjadi redirect eksternal. Original collection/run/binding lama tetap utuh.
- Reset board: kontrak board-only resetUUID, service same-origin/auth anonim/IPhash;
  additive SQL040 scope board sendiri, advisory lock sebelum row lock, rate limit,
  private receipt RLS idempotent. Cabut grant/epoch/ACK/kode/mailbox own board,
  pertahankan kelas/session/run/jawaban/progress guru. UI remount menghentikan
  watcher/ACK, membersihkan RAM/ink/roster; offline menahan resume dan retry online.
  Pending UUID bertahan reload jika storage tersedia; lost response tidak mencabut
  grant baru. First-use wizard tidak muncul lagi karena reset; tidak memalsukan
  profile capability. SQL040 hanya applied ke loopback55432, bukan hosted.
- Target batch awal mencatat kegagalan panel tertutup/selector label/checkbox/
  wizard reset; bug fingerprint nyata dan pointer UI diperbaiki. Tes memakai role
  textbox/combobox dan memeriksa APIready, bukan locator getByLabel ambigu. Port
  conflict pada target7 membuat0 tes berjalan (NOT_RUN); dua runner sendiri
  dihentikan sebelum tes serial berikutnya. Tidak mengubah assertions/timeouts/
  jumlah500seed/coverage atau memperlemah privasi. Target9 PASS18/1,9menit.
- Attempt full verify awal interrupted exit130 saat unit untuk lima kalimat
  bernomor yang usang; bukan PASS. Full verify berikutnya exit1: format/types/lint,
  unit1094/72file PASS, coverage92,48/87,52/96,28/93,46; SQL306assertion +116guard
  yang dilaporkan runner PASS; integrasi9nativeHTTP+PostgreSQL PASS; build3TvfUj...
  PASS. Full147 browser143PASS/4FAIL,20m21,153s,1worker/retry0/skip0.
- Auth test allowlist ditambah hanya teacher-extras; storage max8/open|closed,
  HttpOnly/logout/canary tetap ketat. Closed-session test membuktikan FORBIDDEN
  snapshot/heartbeat/channel/ack dan pesan sambungan berakhir, tanpa menerima403
  lain. Assertion async di-await di akhir supaya tak menjadi rejection tak tertangani.
- Dua offline error direproduksi (diagnostic6case4PASS/2FAIL lalu2FAIL scoped).
  Requestfailed aman mencatat GET /guru/kelas ERR_INTERNET_DISCONNECTED; optional
  panel memunculkan Link yang memprefetch RSC. prefetchfalse pada linkkelas serta
  dua Linkmulai menghentikan request spekulatif; offline data tetap bekerja.
- Gate serial format/types/lint/buildRQ1nEXwZvQDcxTfNo93tJ +44regresi PASS exit0,
  4,7menit. Semua empat kasus gagal dipetakan ke PASS, termasuk actual fresh32
  scanner/check/rotations/lateexit/finalize/nextsession, auth/offline/sync/privasi,
  PDF/story, own authoring, reset loss/offline/reload, preparation/pilot separation.
- Audit akhir menghapus instruksi konfirmasi yang berulang, satu literal saja.
  Gate serial final format/types/lint/buildITd3O0CNAChqrrInootDA +3regresi PASS
  exit0,24,9s (offline reload, one-click dan history360/390). 589/590 input
  identik terhadap44gate; 583/590 identik terhadapfullverify. Source final
  4172efa3fa27d35ca0130be2112029005589b84c48f038c0b5893ab1e3ea13b5.
  147skenario unik tercakup lintasfull+scope, bukan klaim full147/147 pada build
  final. Unit/SQL/native yang sudah PASS dan inputnya identik tidak diduplikasi.
- Visual final15capture/state360/390/1366+font20px overflow0/pageerror0; gambar
  diperiksa. Dua PDF aktual diunduh/diekstrakpdftotext, initial CekAwal/custom
  unused rows benar; printer fisik NOT_RUN. Screenshot lokal sintetis/absen-only
  excluded; fullpage artefak elemenfixed tidak dijadikan alasan mengubah a11y.
- Preservation PASS181protectedfiles/39SQLexisting/8originaldocs/18oldreceipts/
  journalprefix/handofftail; bundle receipt lama dipulihkan persis, measurement
  final berada pada practice-v6.json. Core perubahan hanya pure copy helper/
  transaksi tambahan, matematika/score/BKT/replay/OMR/tenant/auth tidak diganti.
- Tidak ada dependency/aset/paidAPI baru; USD0paid, cloudcostNOT_MEASURED. GLB/
  poster/blend unchanged; Three gzip154310byte (<250000) lazy terpisah/excluded
  precache, poster cached. OpenAIChatCompletions/AnthropicMessages native HTTP
  fixture + ledger/RLS lokal PASS, liveNOT_RUN; codingmodel bukan appdefault.
- Panduan guru docs13, addendumK41, handoff terbaru dan receiptpractice-v6.json
  disiapkan; kebutuhan operator/perangkat tepat dan rollout SQL040/backup/rollback
  dicatat sekali di handoff. Tidak deploy/hostedmigration/paidprovider; review,
  printer/QRHTTPS/camera/touch/studiguru nyata NOT_RUN. Next exact: commit dan
  normal fast-forward push work:main sesuai izin, periksa SHAremote; tidak force.
