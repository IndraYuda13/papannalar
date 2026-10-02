# Referensi platform dan batas pemakaian

Ditinjau 2 Oktober 2026. Fakta source lokal terdapat di SOURCE_FINDINGS.md.
Keputusan produk berasal permintaan pengguna. Ukuran animasi/budget/urutan batch
merupakan usulan engineering, bukan hasil benchmark atau aturan vendor.

[V1] OpenAI - Chat Completions reference dan Structured Outputs.
`https://developers.openai.com/api/reference/cli/resources/chat/subresources/completions/methods/create`
`https://developers.openai.com/api/docs/guides/structured-outputs`
Dipakai untuk bentuk endpoint, messages, token fields dan perbedaan JSON/schema.
Parameter didukung bergantung model; kata compatible bukan jaminan universal.

[V2] Anthropic - Messages API.
`https://platform.claude.com/docs/en/api/messages/create`
`https://platform.claude.com/docs/en/build-with-claude/working-with-messages`
Dipakai untuk native Messages, max_tokens, content blocks dan headers/version.
Contoh request paket tidak mengaktifkan tools, extended thinking atau input gambar.

[V3] Anthropic - OpenAI SDK compatibility.
`https://platform.claude.com/docs/en/cli-sdks-libraries/libraries/openai-sdk`
Native Messages dipilih; shim kompatibilitas mempunyai batas dan bukan pengganti
universal fitur asli. Jangan mengasumsikan JSON Schema OpenAI berlaku pada native.

[V4] Motion - Scroll animations.
`https://motion.dev/docs/react-scroll-animations`
Reveal sekali dan pengikatan scroll bersifat visual, tidak mengendalikan alur soal.

[V5] Motion - Accessibility.
`https://motion.dev/docs/react-accessibility`
`https://motion.dev/docs/react-use-reduced-motion`
Reduced motion diterapkan lintas efek, bukan hanya CSS tertentu.

[V6] React Three Fiber - Scaling performance dan Canvas.
`https://r3f.docs.pmnd.rs/advanced/scaling-performance`
`https://r3f.docs.pmnd.rs/api/canvas`
On-demand rendering dan fallback; WebGL dapat menambah beban perangkat.

[V7] React Three Fiber - Performance pitfalls.
`https://r3f.docs.pmnd.rs/advanced/pitfalls`
Reuse geometry/material, hindari React setState di frame loop.

[V8] Next.js - Lazy loading.
`https://nextjs.org/docs/app/guides/lazy-loading`
Pemisahan chunk, Client Component dan penempatan ssr:false yang benar.

[V9] OpenAI - GPT-6.1 Sol.
`https://developers.openai.com/api/docs/models/gpt-6.1-sol`
Dokumentasi menyatakan reasoning effort max didukung. Ini tidak membuktikan akses
akun pengguna atau memaksa model tersebut sebagai model AI aplikasi. Pengujian
protokol dasar paket tidak memakai tool calling.

Aset: dibuat prosedural khusus paket ini. Tidak ada klaim memakai aset proprietary,
logo/model pihak ketiga atau screenshot desain yang tidak benar-benar tersedia.
File font tidak didistribusikan.
