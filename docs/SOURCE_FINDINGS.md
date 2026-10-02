# Temuan basis kode untuk implementer

Pemeriksaan terarah arsip `papannalar-ui-polish-2026-10-01.zip`, bukan HEAD di
komputer pengguna. Tidak ada perubahan ke arsip asli. Path di bawah diverifikasi
pada snapshot ini; cek HEAD sebelum mengedit. Bukti audit lama bukan klaim runtime
versi sekarang.

## 1. Titik sambung yang sudah bagus

- Next.js App Router, TypeScript, Supabase, Zod, Dexie, lucide-react dan Tailwind
  sudah tersedia. package.json pada snapshot belum memakai Three/R3F/Motion.
- `src/server/llm/provider.ts:24-36` mempunyai interface TeachingAssistantProvider;
  ini seam terbaik untuk dua adapter.
- `src/server/llm/bisik.ts:42-58`: validator saran 80 kata dan source strategy IDs.
- `src/server/llm/enrichment.ts:58-83`: output cerita hanya frame sah, bukan
  matching angka yang masih bisa menerima arti naik/turun terbalik.
- `src/server/llm/routes.ts`: auth, ownership, review, sample restriction, deadline
  dan reserve sebelum call. Preserve prinsip tersebut.
- `src/features/guru/navigation.tsx`: empat menu actual. Legacy latihan mempunyai
  jalur shell sendiri; jangan lupa dia ketika merapikan 'semua halaman'.
- `src/app/page.tsx`: root mengarahkan ke /guru. Landing baru bukan syarat user.

## 2. Penguncian provider yang harus diperbaiki bersama

| Lokasi | Temuan | Dampak implementasi |
| --- | --- | --- |
| `src/server/llm/provider.ts:7,59-90` | Model Haiku dan URL Messages literal | Config + factory + dua wire adapter |
| `src/server/llm/provider.ts:46-57,112-119` | Tepat satu blok text; model harus persis sama | Parser perlu valid text blocks dan alias model sah |
| `src/server/llm/config.ts:5-15` | Hanya ANTHROPIC_API_KEY -> AnthropicProvider | Profil aktif dan migrasi legacy tanpa campur key |
| `src/contracts/llm-ledger.ts:6-9` | z.literal(Haiku), token max tetap | Schema usage v2, null usage dan limit yang tervalidasi |
| `src/server/llm/store.ts:55-66` | complete menulis literal Haiku | Metadata dari reservation/profile terpercaya |
| `src/server/llm/usage.ts:42,66` | Deadline5s/30s dan 1200 output tetap | Sinkronkan limit/profile/lease tanpa melemahkan budget |
| `supabase/migrations/202609300024_llm_limits.sql:5,9-15,61` | JSON Schema const model, satu price policy, reserve tetap | Migration baru, bukan edit migration lama; price/config snapshot |
| `src/server/llm/reviews.ts:10-15` | Approval kosong, privacy review null | Jangan klaim AI aktif hanya setelah ganti key |
| `.env.example` | Hanya konfigurasi Anthropic key dan gateway | Contoh config dual-protocol, default disabled |
| `tests/unit/llm-*.test.ts`, `tests/e2e/llm.spec.ts` | Tes native/fallback existing | Extend tests per protokol, jangan hapus pengaman |

## 3. UI yang perlu disentuh

`src/ui/tokens.css`, `src/app/globals.css`, `src/ui/components/`,
`src/features/guru/{navigation,home,classes,results,login-form}.tsx`,
`src/features/library/{collections,start,session,tool-fields,interactive-help}.tsx`,
`src/features/layar/`, `src/features/session/`, `src/features/scanner/capture.tsx`,
`src/features/tools/`, serta empty/error state terkait.

Gerak baseline masih gentle-entry/trail dan ikon lucide, bukan visual 3D actual.
Itu fondasi, bukan alasan mengganti math/replay. Template editor sudah ada: tetap
berfungsi setelah card/grid diganti. Nama lokal, version binding dan sample route
merupakan invarian. Jangan menyalin dataset palsu ke UI untuk membuat screenshot.

## 4. Batas pekerjaan paket ini

Yang disiapkan di sini: dokumen perubahan, script safe-addendum, aset GLB/poster
asli dan contoh codec/test murni. Belum memasang dependency ke repo, belum mengetes
Next.js runtime aktual, belum menjalankan hosted AI/Supabase atau deployment.
Perubahan code/DB/UI akhir dikerjakan Codex sesuai acceptance dan diverifikasi di
lingkungannya. Angka audit lama tidak dipakai sebagai skor kesesuaian perubahan ini.
