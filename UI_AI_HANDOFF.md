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
