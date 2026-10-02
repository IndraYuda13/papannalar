# Spesifikasi teknis - konektor AI kompatibel

Scope wajib: OpenAI Chat Completions + Anthropic Messages, non-streaming JSON
untuk Bisik dan enrichment existing. Bukan jaminan kompatibilitas semua API/model.
Referensi resmi V1-V3 dan batas arsitektur baseline dirinci pada SOURCES/SOURCE_FINDINGS.

## 1. Temuan yang menentukan desain

Baseline sudah memiliki `TeachingAssistantProvider` dengan `enrichPackage` dan
`askBisik`. Jangan membongkar domain yang bagus ini. Namun, endpoint/model literal
juga ada pada config, ledger Zod, store completion, JSON Schema SQL, reservation
cost dan tests. Jalur tersebut harus berubah bersama; dua adapter saja tidak cukup.

Alur target:
Teacher -> existing authenticated route -> ownership + review + data minimization
-> resolve trusted provider profile -> shared budget reservation -> provider
adapter -> bounded envelope parser -> JSON parse -> existing domain validator
-> trusted usage completion -> saran guru / kartu statis.

Board tidak memanggil provider. Core BKT/OMR/grouping tidak mengimpor server/llm.
Client tidak memanggil endpoint vendor/gateway langsung.

## 2. Kontrak internal

Pertahankan metode existing atau adaptasikan secara lokal:

```ts
type Protocol = 'openai-chat-completions' | 'anthropic-messages';
type JsonMode = 'json_schema' | 'json_object' | 'prompt_json';
type ProviderReplyV2 = {
  value: unknown;                       // domain validate setelah parsing
  requestedModel: string;
  reportedModel: string | null;
  protocol: Protocol;
  profileId: string;                    // ID config operator, bukan endpoint URL
  configVersion: string;
  inputTokens: number | null;
  outputTokens: number | null;
  usageKnown: boolean;
  finish: 'complete';
};
```

Angka provider wajib finite, safe integer, nonnegative. Unknown/null bukan 0.
ProviderReply tidak membawa raw body, headers, token, reasoning text atau URL.
Nama model dibatasi panjang/karakter untuk log; model alias yang berubah ke
snapshot sah tidak ditolak hanya karena string berbeda dari requestedModel.
Profile id/model registry tetap berasal server, bukan pilihan browser.

Tambahan minimal: `profiles/config`, factory, shared bounded HTTP, adapter OpenAI,
adapter Anthropic, parsers, usage v2. Reuse Fetch/server-only yang sudah dipakai;
tidak wajib memasang LangChain/Vercel AI SDK/OpenAI SDK jika Fetch memadai.
Jangan membangun abstraksi generic agent/tools yang belum dipakai.

## 3. Konfigurasi

File contoh: `config/.env.ui-ai.example`. Field inti:
`AI_PROTOCOL`, `AI_API_BASE_URL`, `AI_MODEL`, `AI_API_KEY`, `AI_PROFILE_ID`,
`AI_CONFIG_VERSION`, `AI_JSON_MODE`, `AI_OPENAI_TOKEN_FIELD`,
`AI_AUTH_SCHEME`, `AI_ANTHROPIC_VERSION`, `AI_MAX_OUTPUT_TOKENS`.
`LLM_ENABLED` dan `LLM_GATEWAY_TOKEN` tetap dipakai agar migration jelas.

- Base URL adalah API ROOT yang sudah lengkap: https://api.openai.com/v1 atau
  https://api.anthropic.com/v1. Tambahkan hanya suffix protokol, bukan `/v1` lagi.
  Gateway dengan prefix path tetap harus didukung. Tolak URL berakhiran endpoint
  `/messages`, `/chat/completions`, `/responses` ketika field meminta base root.
- Key berbeda dari model. ID Sol Max pada Codex tidak menjadi model string aplikasi;
  'max' adalah opsi model tertentu, bukan suffix universal.
- OpenAI profile baru tidak boleh diam-diam meminjam ANTHROPIC_API_KEY lama.
- Tanpa AI_PROTOCOL dan hanya konfigurasi Anthropic lama: explicit legacy mapping
  ke profile native Anthropic, pertahankan metadata/price mapping; log deprecation
  server tanpa key. Profil baru setengah lengkap fail-closed, tidak fallback legacy.
- Nonaktif boleh boot/build tanpa key. Aktif invalid -> status operator configuration
  invalid dan kartu statis; jangan membocorkan nilai env lewat pesan ke guru.
- Satu profil aktif cukup. Tidak daftar model via network saat startup/render.
  Config change memerlukan reload server; tidak membuat kontrol admin publik baru.

## 4. Wire OpenAI Chat Completions

POST `<base>/chat/completions`, bearer key, content-type JSON, redirect error,
cache no-store, AbortSignal dari deadline aplikasi.

```json
{
  "model": "<configured-model>",
  "messages": [
    {"role": "system", "content": "<existing-task-prompt>"},
    {"role": "user", "content": "<allowlisted-input-json>"}
  ],
  "max_completion_tokens": 1200,
  "stream": false
}
```

`max_completion_tokens` default untuk profil modern. Profil gateway lama dapat
memilih `max_tokens`; kirim salah satu saja. Jangan mengirim temperature, top_p,
reasoning_effort, seed, tools atau store bila profil belum menyatakan dukungan.
Reasoning aplikasi bukan effort coding agent dan tidak otomatis `max`.

Jika profil mendukung `json_schema`, gunakan response_format JSON Schema dari
kontrak TASK yang benar (Bisik vs stories), bukan schema dummy. `json_object`
menghasilkan JSON tetapi tidak menjamin schema. `prompt_json` tidak mengirim
response_format. Ketiganya tetap melalui parse JSON dan validator domain.
Tidak mencoba tiga mode melalui tiga paid calls hanya untuk menebak dukungan.

Parser: choices nonempty dengan tepat satu output yang diminta; finish_reason stop;
message.refusal non-null -> refused; content string nonempty atau list text parts
sesuai profil; tool_calls/function_call -> unsupported, jangan dijalankan. Length/
content_filter/truncation/empty JSON -> invalid/refused, bukan jawaban sukses.
Baca usage.prompt_tokens/completion_tokens bila valid, selain itu null sesuai
policy missing usage. Completion tokens mungkin termasuk reasoning; jangan
menambah rincian reasoning lagi ke total.

## 5. Wire Anthropic Messages

POST `<base>/messages`, `x-api-key` default, `anthropic-version: 2023-06-01`,
content-type JSON. Gateway yang eksplisit mensyaratkan bearer dapat memakai
`AI_AUTH_SCHEME=bearer`, tidak mengirim kedua header secret sekaligus.
System prompt top-level; user content hanya payload domain yang diminimalkan.

```json
{
  "model": "<configured-model>",
  "system": "<existing-task-prompt>",
  "messages": [{"role":"user", "content":"<allowlisted-input-json>"}],
  "max_tokens": 1200,
  "stream": false
}
```

Gunakan native protocol ini, bukan sekadar mengganti OpenAI base ke Anthropic.
Anthropic sendiri membatasi tujuan shim OpenAI; fitur native tidak selalu sama.
Untuk kemampuan dasar gunakan prompt_json; native structured output hanya diaktifkan
lewat capability yang benar-benar diuji dan field API terkini, bukan response_format
OpenAI dikirim ke Messages.

Parser menerima content blocks, gabungkan hanya blok `text` final berurutan. Blok
thinking/redacted_thinking boleh diabaikan untuk model yang mengembalikannya;
jangan simpan/tampilkan chain-of-thought. Tool/image/server_tool_use/unexpected
block -> unsupported. `stop_reason=end_turn` untuk profil dasar. `max_tokens`,
`tool_use`, refusal/empty content -> bukan sukses. Jangan mensyaratkan panjang
content persis satu seperti baseline jika respons sah memakai lebih dari satu blok.

Token: input_tokens/output_tokens dan kategori cache bila ada harus dipetakan
sesuai makna vendor. Anthropic cache_read/cache_creation berbeda dari rincian
cached tokens OpenAI; jangan menjumlahkan dua kali atau memakai satu asumsi harga.
Advanced cache/extended thinking tidak dikirim sebagai requirement dasar run ini.

## 6. Transport, keandalan dan keamanan endpoint

- Shared HTTP bound untuk body bytes, request bytes dan timeout. Usulan batas body
  64 KiB dan input 16 KiB (atau limit HEAD yang sah); hitung byte UTF-8, bukan string
  length. Batasi streaming reader walau HTTP content-length tidak tersedia/menipu.
- Deadline baseline Bisik 5 detik dan enrichment 30 detik adalah batas aplikasi;
  tidak menjanjikan model yang lambat dapat menyelesaikan. Bila perlu config tuning,
  bound dan nilai aktual harus tercatat dan selaras lease budget. Jangan mengulang
  request tanpa akhir karena provider reasoning lambat.
- Default satu paid attempt. Timeout/disconnect tidak membuktikan tidak tertagih.
  Tombol Coba lagi membuat request baru melalui budget/rate checks. Retry otomatis
  tambahan atau failover vendor tidak scope run ini; mock boleh uji kebijakan.
- Perubahan profile saat request berjalan tidak mengganti receipt request lama.
  Freeze profile/config/price version saat reserve.
- URL hanya config operator. Public query/body tidak menerima base URL, headers,
  provider/model atau API key. Strict schema menolak field tambahan.
- HTTPS wajib kecuali flag local-dev eksplisit, host tetap terdaftar. Tolak userinfo,
  query/fragment, redirect dan IP metadata/link-local/private untuk hosted profile.
  Jangan regex-host saja; pertimbangkan DNS/rebinding/IPv6 dan gunakan egress proxy/
  resolver-pinned connection atau kebijakan egress deployment. Jika tidak dapat
  memastikan, batasi ke exact host operator tepercaya; jangan mengklaim SSRF-proof.
- Tidak ada arbitrary headers JSON. Izinkan header yang dibutuhkan protokol;
  proteksi Host/Authorization/Content-Length dan redaksi log.
- Pisahkan error category sanitized: config, auth, rate, timeout, unavailable,
  refusal, invalid, budget, unreviewed. UI existing dapat memetakan ke enum fallback
  yang sah tanpa mengubah semua client; detail operator bukan raw provider error.

## 7. Ledger, SQL dan biaya - wajib, bukan opsional

Temuan baseline: `src/contracts/llm-ledger.ts` z.literal(model Haiku),
`store.ts` menulis Haiku walau provider berbeda, dan migration024 JSON schema
memakai const Haiku. Reservation memakai 32768 input +1200 output serta satu
pasangan harga global. Itu harus diperbarui, bukan dihapus.

Buat migration BARU sesudah migration terbaru. Jangan menyunting histori024,
reset/truncate usage, men-disable RLS, atau memakai service role untuk request guru.

Skema minimum v2:
- profile/policy allowlist di pn_private: id, protocol, requested_model,
  config_version, harga per kategori yang relevan, pricing_date/currency,
  batas input/output dan status enabled. Secret/URL tidak harus disimpan di DB;
  gunakan profile reference. Biaya untuk endpoint custom berasal operator.
- reserve(requestId, class/scope/feature, profileId, configVersion) divalidasi
  narrow server RPC + teacher ownership, bukan browser langsung.
- reservation menyimpan profile, prompt/price version, token budget dan jumlah
  yang dicadangkan sebagai snapshot agar config baru tidak mengubah tagihan lama.
- complete menulis requested/reported model, nullable counters, duration/status,
  feature/prompt version sesuai reservation; duplicate identik idempoten, konflik
  ditolak. Validasi lengkap di Zod DAN JSON Schema SQL.
- Sertakan legacy v1 read/migration mapping: rows Haiku lama tetap terbaca dan tidak
  diperbarui menjadi nama model baru. New v2 rows tidak dipalsukan sebagai v1.

Reservasi konservatif dipertahankan seperti desain existing, bukan klaim invoice
vendor. Profil wajib punya cap dan harga; untuk server lokal gratis perlu status
explicitly configured-free dengan request/token cap, bukan harga kosong dianggap 0.
Unknown usage -> simpan null + flag unknown, cadangan tidak direfund otomatis.
Reasoning/cache/output limit diselaraskan dengan profil dan schema; jangan menaikkan
max tokens hanya di adapter sementara SQL masih menolak atau budget under-reserve.

Log metadata saja: profil, protocol, model sanitized, versi prompt/config, token,
durasi, status. Jangan menyimpan question/body/chat history, Authorization, key,
nama lokal, nomor absen atau request headers. Tidak mengirim telemetry ke vendor
baru yang tidak diminta. RLS tests Teacher A/B/board tetap wajib.

## 8. Approval dan kemampuan yang terlihat

CONTENT_APPROVALS/BISIK_PRIVACY_REVIEW baseline kosong. Menambah protocol tidak
menggantikan review manusia. Pisahkan status:
configured -> connection-tested -> content-eligible -> budget-enabled.

Route normal tetap memakai ownership/review/budget. Sample teacher tetap tanpa paid
AI kecuali ada izin eksplisit dan profil budget-nya. Kartu statis tetap tersedia.
Buat diagnostic CLI operator dengan teks sintetis (bukan prompt murid) yang
memerlukan `--allow-paid` dan jumlah request maksimum; tidak menjalankan review
bypass dari UI. Receipt diagnostic dipisahkan dari penggunaan kelas.
Tanpa credential, contract tests tetap jalan, live diberi NOT_RUN. Jangan mengarang
approval sementara untuk membuat screenshot terlihat online.

## 9. Reference code dalam paket

`reference/compat-wire.mjs` dan tesnya memeriksa pembentukan URL/body dan parsing
envelope di kedua protokol. Ia murni tanpa network, bukan provider siap produksi.
Port bagian yang relevan ke TypeScript/server-only, lalu sambungkan transport,
review, validator, ledger dan routes existing. Tes reference bukan bukti endpoint
pihak ketiga/live dapat dipakai. Jangan mengganti validateStories/validateBisik
existing dengan parse JSON saja.

## 10. Acceptance akhir

Ubah protocol/model/base di config server -> alur Bisik/enrichment memilih adapter
tepat -> output valid melewati validator -> usage v2 benar -> hasil statis saat
gagal. Dua protocol diuji memakai mock HTTP terisolasi dan respons representative.
Harga/alias/missing usage/truncated/JSON refusal/401/429/503/timeout diuji. Secret
hanya server. Live smoke hanya sesudah operator memberi config/approval/biaya
semestinya; satu sukses tidak berarti semua model/gateway kompatibel.
