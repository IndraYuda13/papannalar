# Rencana kerja dan pengujian U0-U5

Dokumen ini mencatat rencana upgrade UI/AI terdahulu dan matriks acceptance.
Bukan antrean pekerjaan aktif atau bukti kelulusan. Hasil aktual tersedia di
[artifacts/qa](../artifacts/qa/); perintah validasi saat ini ada di [README](../README.md).

## U0 - Integrasi dokumen dan baseline pendek

Inspect git/HEAD, route actual, provider config, ledger/RPC dan available tests.
Cocokkan `SOURCE_FINDINGS.md` dengan versi kode yang diperiksa. Addendum sudah
terpasang; script pemasangan sekali pakai telah dihapus. Simpan route/state matrix.
Buka login, beranda, editor, board dan hasil pada data sintetis untuk baseline.
Tidak perlu menjalankan semua tes generator ribuan kali hanya untuk baseline UI.

Exit: daftar area dan acceptance jelas, tidak ada uncommitted work tertimpa,
PRD addendum dan task queue aktif. Minor perubahan HEAD dicatat lalu lanjut.

## U1 - Shared design dan halaman guru

Rapikan tokens/shell/state components. Terapkan setiap route teacher, termasuk
latihan legacy, bukan hanya dashboard. Selesaikan editor, hasil, daftar, controller,
pairing drawer dan adaptive controls tanpa mengubah model data. Setiap UI mock
harus tersambung ke state/API existing, bukan output hardcode.

Tes: navigation, editor template+preview+save/reload, reuse 7B/7C, hasil historis,
keyboard/focus, mobile text130%, no technical copy di jalur utama. Reuse existing
suite/selectors; update test UX lama dengan alasan, tidak weaken domain assertions.

## U2 - Board, motion, asset 3D dan performa

Copy aset lokal dengan lisensi; lazy scene + poster. Aplikasikan motion grammar
seluruh UI; tidak scene berat di scanner/board soal. Jaga ability/appearance/pairing
state berbeda. Validate reduced motion, no WebGL, idle/offscreen, task drag/undo,
QR dan reconnect tanpa reset. Kualitas grafik bisa diturunkan tanpa fungsi hilang.

Tes viewport dan interaksi real browser. Jangan menyatakan rapi hanya dari build.

## U3 - Provider dual-protocol

Pertahankan TeachingAssistantProvider; tambah trusted config/factory dan kedua
adapter. Reuse validators/deadline. Port/reference test fixtures relevan. No paid
calls default. Legacy config migration jelas. Shared error categories tidak
membocorkan body/key. U3 tidak dianggap selesai jika adapter belum dipanggil routes.

Tes unit/mock HTTP per protocol, config/endpoint/headers/limits, refusal/format,
model alias, usage null, cancellation dan fallback. Negative payload nama/QR/ink.

## U4 - Ledger/RPC dan penyelesaian alur AI

Migration baru, Zod/schema SQL v2, profile/price snapshot, reserve/complete
idempotent, status operator, budget/cap dan legacy receipt compatibility. Sinkronkan
config limits dengan usage checks. Update tests store/routes/SQL, bukan cuma unit
parser. Uji end-to-end dengan provider mock yang lewat route dan ledger asli lokal.
Jika DB runtime tidak tersedia, migration/test code boleh siap, tetapi execution
DB NOT_RUN dan jangan klaim integrasi lengkap.

## U5 - Gerbang akhir dan handoff

Full verification serial pada candidate final. Script verify existing sudah mencakup
format/typecheck/lint/unit/SQL/build/E2E; jangan menjalankan semuanya dua kali.
Tambahkan tests baru agar masuk verify dengan benar. Jika gagal, perbaiki dan ulang
bagian gagal lalu gate final pada kode terbaru. External runtime gap dicatat spesifik,
UI/correctness/security regression bukan minor.

Tinjau screenshot before/after. Selesaikan doc addendum status berdasarkan bukti,
.env.example, README/handoff setup serta test receipts. Concept paper tetap file
lama sampai hasil implementasi dikonfirmasi; gunakan delta bersyarat jika diminta.

## Matriks UI, integrasi dan aksesibilitas

| ID | Uji | Lulus bila |
| --- | --- | --- |
| Q01 | Semua route actual dibuka | Tidak ada dead route/runtime error, layout baru konsisten; termasuk empty/error/offline |
| Q02 | Sesi aktif dan navigate back | Tidak mengganti ID, mengulang soal atau mereset data saat layout bertransisi |
| Q03 | Editor+20 contoh existing | Template valid mengisi form; edit lalu preview/back tidak hilang; versi historical tetap |
| Q04 | Roster+hasil | Nama lokal tidak ke network; class/UUID/version tidak berubah; dua kelas terpisah |
| Q05 | Board viewport | Prompt/model/kontrol terlihat sebelum click; no auto-scroll menutupi overflow |
| Q06 | Reduced-motion/no WebGL | Fungsi tetap, poster muncul, no parallax/auto-rotate; focus dan labels aksesibel |
| Q07 | 3D lazy+idle | Scanner tidak request chunk/model 3D; render loop berhenti offscreen/hidden |
| Q08 | QR/reconnect/revoke | Pada soal3 network HP mati lalu pulih ke soal3; revoke tidak hidup lagi |
| Q09 | Pointer/input | Drag/undo no duplicate BKT; overlay dekoratif tidak intercept click; mouse tidak meluluskan multitouch |
| Q10 | Long content/mobile | Guru360/390/1366, papan1280/1366/1920, teks130%, keyboard dan safe-area tidak menutupi CTA |

## Matriks AI yang on point

| ID | Uji | Lulus bila |
| --- | --- | --- |
| A01 | URL dan config | `/v1` tidak ganda; custom prefix benar; salah endpoint/credentials/query ditolak |
| A02 | OpenAI request/parse | Header bearer, system/user benar; token field tepat; stop+JSON valid |
| A03 | Anthropic request/parse | Header/version dan system top-level; multi text blocks; reasoning tidak masuk output |
| A04 | Capabilities | JSON Schema/object/prompt sesuai profile; unsupported reasoning/temperature/tools tidak dikirim |
| A05 | Failures | 401,429,503,timeout,abort,oversize,truncated,refusal,invalid JSON -> statis, tidak membeku |
| A06 | Alias/missing usage | requested+reported berbeda bisa sah; usage null tidak berubah jadi 0/gratis |
| A07 | Budget migration | V1 history utuh; V2 profile/price snapshot; concurrent reserve tidak overrun cap |
| A08 | Idempotensi | same requestId tidak paid dua kali; receipt identik diterima, berbeda ditolak |
| A09 | Review/safety | Draft/no privacy review/sample tanpa izin tidak call; nama/foto/ink/secret tidak terkirim |
| A10 | RLS | Guru B/board tidak mengakses usage/class/result A; browser tidak menentukan profile/key |
| A11 | Profile switch | Ganti server config tanpa edit UI; routes sampai ledger tidak masih melabeli Haiku |
| A12 | Live smoke opsional | Maksimum request yang diset operator, data sintetis, log sanitized, biaya diotorisasi; selain itu NOT_RUN |

Test runner reference dalam paket tidak menggantikan A05 HTTP, A07-A10 SQL/routes
atau browser Q01-Q10. Reuse test suite existing dan tambah kasus untuk bug nyata,
bukan mengejar jumlah testcase/coverage sebagai tujuan.

## Cara membatasi waktu dengan benar

- Jangan reinstall bila lockfile tidak berubah. Jangan riset animasi library baru
  setelah satu solusi kompatibel dipilih. No open-ended hunting asset internet.
- CSS/microcopy -> lint/typecheck/relevant UI test per batch; bukan full unit core.
- Kontrak/SQL -> integration terkait dan regression invariants sebelum merge.
- Satu log ringkas per batch, satu report akhir. Tidak mengulang semua PRD di chat.
- Perangkat/key unavailable -> lanjut area independen. No Docker repair loop berjam-jam.
- Jangan menghapus security/review warning lalu menyebut lebih clean. Persist unsynced
  status. Normal status bisa ringkas, kegagalan perlu tindakan.
- Tiga percobaan gagal yang sama memicu diagnosis root-cause singkat/checkpoint,
  bukan retry tanpa perubahan. Tidak menetapkan batas waktu paksa yang mendorong
  agent menandai pekerjaan gagal sebagai selesai.

## Format bukti dan laporan

Simpan `summary.json` dengan head/build, route inventory, local tests result,
reference tests result, actual live tests, blocked external, asset bytes dan
bundle delta. Jangan mengandung nama nyata atau token. Screenshot before/after
representatif, bukan video panjang setiap klik.

Laporan akhir maksimal ringkasan berguna: halaman yang berubah, dua protokol yang
berfungsi pada fixture/live, .env yang perlu diisi tanpa nilainya, hasil final
verification, asset size, regression/gap yang tersisa. 'Diuji lokal' tidak ditulis
'production-ready'.
