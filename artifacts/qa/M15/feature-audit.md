# Audit software FINAL MVP — 30 September 2026

Base Git `47aa60d729b293a53365a780c0d1cd9485ec6f95`; aplikasi masih working tree.
Audit mengikuti PRD F1–F8/F16–F20 dan TECH_SPEC §18–19. Ini keterlacakan software,
bukan persetujuan pilot atau bukti kamera/digitizer fisik. Full regression dan
instalasi kosong dicatat terpisah pada M15-b.

| Fitur | Implementasi yang diperiksa | Bukti otomatis yang tersedia | Batas klaim |
| --- | --- | --- | --- |
| F1 | Supabase PKCE, cookie guru/papan terpisah, kelas 1–40, ID acak, nama/CSV IndexedDB guru | `auth-ownership`, `privacy-storage`, `package` E2E; ownership SQL | Email/GoTrue hosted NOT_RUN; nama tidak dipulihkan dari server |
| F2 | PDF A4 tiga layout, QR jenis/versi, A5 awal dan empat kartu mingguan/exit | `cards`, `omr` unit/browser; artifacts M03/M05 | Fotokopi generasi kedua/kartu fisik NOT_RUN |
| F3 | 22 templat, paket awal/mingguan/lisan/singkat, ganti soal, mandiri cetak, cache guru/papan; enrichment tervalidasi | `content` 500 seed per templat, `package`, `independent-print`, `board-package`, `board-content` | Draft NEEDS_REVIEW; live enrichment default disabled, maksimum 1/3 cerita; K01 terbuka |
| F4 | Pairing enam digit, CAS/ACK/revoke, sepuluh mode, cache konten tanpa roster, navigasi lokal/handoff, visual SD | `pairing`, `board-modes`, `board-content`, `shell`, SQL presentation/content | Cache paket tidak menyimpan absen; reload offline kehilangan roster. K10 reveal tetap HP. Latensi/kelas fisik NOT_RUN |
| F5 | Worker piksel lokal, marker/QR/bubble, review/manual, revisi atomik/replay | 1.000 kartu sintetis OMR, `assessments`, `omr`, `sync` | Sintetis bukan pencapaian akurasi 99% atau 3 detik kamera |
| F6 | BKT exact, displayed placement, hysteresis/replay, grouping seeded, alasan dan event perubahan | `bkt`, `placement-*`, `grouping`, `freshclass` | Edge pedagogi provisional dicatat K03/K04/K12/K13; tidak dianggap disetujui |
| F7 | 23 strategi statis, otomatis di Stasiun Guru, feedback, Bisik online bounded dan fallback | `strategies`, `llm-*`, `llm` E2E, SQL llm | Semua strategi draft; review konten dan privasi teks bebas belum ada, live API tidak dipanggil |
| F8 | Binding beku kelompok, tiga baris, pasangan satu observasi, koreksi terlambat, benar-dan-paham hanya HP | `exit`, `assessment-binding`, `cycle`, `freshclass`; SQL exit | Kunci/hasil individual tidak ke papan; cek lisan pasangan memakai parameter provisional |
| F16 | Adaptif turun/naik, absen/lanjut/undo, G=.05, baseline beku, local offline | `oral`, `placement-*`; `oral` E2E | Durasi satu menit/siswa dan review manusia NOT_RUN |
| F17 | Rotasi2/3/4, actual-start idempotent, hold preview, +3 menit, Bisik otomatis, petunjuk/reveal HP | `stations`, `turns`, `hold`, `guidance`; 500 kelas; SQL guidance | Simulasi dua Pilot 97,4%; satu Pilot empat sesi 77,2%, tidak diklaim 95%. Navigasi lokal saja tidak mencatat giliran |
| F18 | Enam engine exact, undo, tujuh pola, bounded remote HP, palm/cancel dan object lock | `number-line`, `fractions`, `ratio-algebra`, `balance`, `graphs`, `tool-patterns`, browser tools/remote | Hardware simultan/0,5 detik NOT_RUN. Empat alat non-MVP tidak dibuat. Pecahan v1 >12 partisi memakai fallback buku, soal tidak diubah |
| F19 | Pembuka katalog, intuisi SD, tujuan, lanjutan, refleksi tiga prompt dan ink RAM | `opening`, `opening-reflection`; browser PRIV02 | Konten demo belum reviewed manusia; goresan dibersihkan, tidak diserialisasi |
| F20 | Enam pemeriksaan/profil, fallback0/1/2/4 sentuhan, papan tinggi, HP online | `board-capabilities`, browser BOARD01/REMOTE01/02; SQL capabilities | CDP pointer sintetis bukan sertifikasi digitizer; cloud pairing perlu internet |

## Pemeriksaan lintas modul aktual

- `rg` atas src/scripts/tests: tidak menemukan TODO/FIXME/HACK, test.skip,
  describe.skip, .only, ts-ignore/ts-nocheck atau eslint-disable.
- Query katalog PostgreSQL lokal: **17 tabel** public/pn_private, **0 tanpa RLS**,
  **0 SECURITY DEFINER tanpa search_path tetap** (`database-audit.json`). RLS tenant,
  peran board dan policy private Realtime tetap diuji SQL, bukan diganti service key.
- Batas auth memvalidasi getUser; body dibatasi ukuran/strict schema/same-origin;
  error HTTP konstan, cookie HttpOnly/no-store. Nama hanya di repository lokal dan
  join/sanitasi guru. Core/registry dibatasi ESLint dari network/LLM/random/time.
- Reflection hanya canvas/RAM. BroadcastChannel mendengar pencabutan akses untuk
  menghapus goresan; tidak mengirim canvas. Scanner bekerja di worker tanpa upload.
- Hanya URL dan publishable key Supabase yang public. Pairing/Anthropic/gateway
  secret dibaca modul server-only; jalur demo login dibatasi flag+dua origin loopback.
  Build/fixture test tidak mengandung credential layanan nyata.
- Perubahan M15 menutup gap software cache/navigasi/reveal/visual SD. Paket publik
  dipisahkan dari run plan RAM; perubahan kelompok saat offline tidak boleh mengadopsi
  rencana lama. Tabel/RPC tambahan tetap memakai membership dan epoch.

K01 membatasi klaim: asesmen 22 langkah dan enam alat tersedia, tetapi bukan semua
22 langkah mempunyai alat interaktif sumber. Review pedagogi, consent, staging,
hosted Auth/Realtime/live AI, kamera/cetak/papan/latensi ruang kelas tetap terbuka.
Tidak ada deployment/pengiriman email/API berbayar atau data anak nyata dilakukan.
