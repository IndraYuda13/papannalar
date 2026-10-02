#!/usr/bin/env node
// Documentation-only patcher. Dry run by default; never touches application code.
import { readFile, writeFile, mkdir, lstat, rename } from "node:fs/promises";
import { resolve, dirname, relative, sep, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
const args = process.argv.slice(2);
if (
  args.some(
    (x, i) => !["--repo", "--apply"].includes(x) && args[i - 1] !== "--repo",
  )
) {
  console.error("Usage: node apply-doc-updates.mjs --repo <root> [--apply]");
  process.exit(2);
}
const ri = args.indexOf("--repo");
if (ri < 0 || !args[ri + 1] || args[ri + 1].startsWith("--"))
  throw new Error("--repo is required");
const root = resolve(args[ri + 1]);
const kit = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const apply = args.includes("--apply");
const BEGIN = "<!-- BEGIN PN_UI_AI_V2 -->";
const END = "<!-- END PN_UI_AI_V2 -->";
const sha = (s) => createHash("sha256").update(s).digest("hex");
const changes = {
  "AGENTS.md": `## Instruksi tambahan aktif: UI dan AI v2\n\nPengguna mengotorisasi implementasi UI seluruh halaman dan dua protokol AI.\nBaca [instruksi upgrade]({EXEC}) dan [PRD tambahan]({PRD}) seperlunya.\nAturan continuous U0-U5 menggantikan berhenti setelah setiap task pada run ini.\n3D dekoratif/motion terbatas diizinkan; model matematika, privasi, RLS, review,\nidempotensi dan histori tetap dijaga. Jangan mengubah baseline atau mengulang\nM00-M17. Dua adapter wajib disambungkan ke config, validators, ledger dan SQL.\nSatu final verify serial yang lulus; fixture bukan live. Jangan melakukan paid API,\ndeploy atau migration DB nyata tanpa otorisasi. Jangan menimpa perubahan pengguna.`,
  "PLAN.md": `## Antrean tambahan UI/AI - bukan pengganti histori M00-M17\n\nRencana rinci: [U0-U5 dan QA]({QA}). Status awal seluruh pekerjaan: TODO.\n\n| Batch | Scope | Status | Bukti |\n| --- | --- | --- | --- |\n| U0 | Cocokkan HEAD, update dokumen dan route inventory | TODO | Belum dieksekusi agent |\n| U1 | Shared UI dan seluruh halaman guru | TODO | - |\n| U2 | Board, motion, aset 3D dan fallback | TODO | - |\n| U3 | Konektor OpenAI/Anthropic dan konfigurasi | TODO | - |\n| U4 | Ledger/RPC/policy dan integrasi routes | TODO | - |\n| U5 | Final verification dan handoff | TODO | - |\n\nScript ini hanya memasang instruksi, tidak mengerjakan atau meluluskan batch.\nAgent memperbarui status dari hasil aktual. Task menunggu key/hardware ditandai\nEXTERNAL_BLOCKED tanpa menghentikan task independen.`,
  "docs/00_RINGKASAN_RUBRIK.md": `## Addendum produk UI/AI v2\n\nPermintaan terbaru memperluas visual aplikasi dan pilihan penyedia AI.\n[PRD aktif tambahan]({PRD}) menentukan scope; isi historis di bawah dipertahankan.\nPembaruan belum merupakan klaim fitur selesai atau dampak belajar. Inovasi tetap\npada alur guru/siswa; motion/3D tidak menggantikan fungsi atau bukti pengujian.`,
  "docs/01_PRD.md": `## Addendum kebutuhan yang berlaku untuk upgrade ini\n\nBaca [PRD UI/AI v2]({PRD}) untuk acceptance UI-01..UI-05 dan AI-01..AI-06.\nIni perubahan resmi yang diminta pengguna: UI seluruh route, motion terarah,\n3D pendukung dengan fallback, serta OpenAI Chat Completions dan Anthropic Messages\ndengan profile/model/base URL konfigurabel. Batas fitur matematika, nama lokal,\nversi soal, review, data contoh dan hasil tetap berlaku. Konflik visual/provider\nyang spesifik mengikuti addendum; kebutuhan lain pada PRD ini tetap sah.`,
  "docs/04_BRAND_DESAIN.md": `## Pembaruan desain visual\n\n[Blueprint UI]({UI}) berlaku pada upgrade ini. Warna/font/nama PapanNalar tetap.\nLarangan 3D dekoratif dan gradient mutlak diubah menjadi penggunaan terbatas:\nscene matte ringan pada pengantar/katalog, kedalaman halus, motion bermakna.\nModel matematika tetap akurat dan mudah dibandingkan; tidak ada perspective\ndistortion pada jawaban. No global scroll hijack, no effect yang menutupi soal.\nUkuran adaptif mengikuti preset, hit-area dan uji viewport, bukan skala global.`,
  "docs/05_UX_LAYAR.md": `## Pembaruan seluruh route dan state\n\nGunakan [peta halaman dan motion]({UI}) serta [tes Q01-Q10]({QA}).\nPerubahan mencakup masuk, beranda, kelas, editor, asesmen, hasil, controller,\nlatihan dan seluruh mode layar. QR/profil/reconnect/state lama tidak boleh hilang.\nLibrary 3D tidak masuk scanner; fallback, reduced motion, keyboard dan status\nbelum tersinkron tetap bekerja. Ini arah baru, bukan laporan usability guru.`,
  "docs/06_RENCANA_BISNIS.md": `## Pembaruan asumsi biaya AI\n\nDukungan endpoint/model baru membuat harga Haiku di bawah menjadi skenario\nhistoris, bukan harga seluruh AI aplikasi. [Spesifikasi ledger]({AI}) mewajibkan\nprofil/harga/cap terkonfigurasi dan reservasi konservatif. Harga token, reasoning,\ncache dan biaya gateway diisi operator dari kontrak aktual. Usage tidak tersedia\ntidak berarti nol biaya. Rencana harga layanan tetap usulan, bukan pembayaran\nyang sudah aktif. Tidak ada pembelian atau paid API otomatis pada upgrade.`,
  "docs/07_BUILD_QA_PITCH.md": `## Rencana tambahan implementasi dan validasi\n\nIkuti [U0-U5]({QA}) dan [instruksi implementasi]({EXEC}) tanpa mengulang milestone\nlama. Targeted tests tiap batch; satu gerbang verify serial pada candidate final\nyang lulus. Jika gate gagal lalu kode berubah, ulang gate setelah perbaikan.\nPisahkan local fixtures, live endpoint dan hardware. Screenshot bukan bukti API\naktif, dan concept paper tidak menyebut kebutuhan baru sebagai fitur selesai.`,
  "docs/08_TECH_SPEC.md": `## Spesifikasi tambahan AI dan rendering\n\nUntuk perubahan ini gunakan [konektor dua protokol]({AI}) dan [blueprint UI]({UI}).\nProvider native Anthropic yang hardcoded dimigrasikan melalui factory/profile;\nChat Completions adalah adapter terpisah. Ledger Zod/store/RPC/schema SQL dan\nprice reservation ikut berubah melalui migration baru; histori tidak ditimpa.\nUnknown usage bukan 0; key server-only; review dan data minimization tetap.\n3D lazy Client Component terpisah dari core/scanner, on-demand dengan poster\nfallback. Dokumen lama tetap referensi domain yang tidak diubah oleh addendum.`,
};
function link(file, target) {
  return relative(dirname(resolve(root, file)), resolve(kit, target))
    .split(sep)
    .join("/");
}
const plans = [];
for (const [file, template] of Object.entries(changes)) {
  const p = resolve(root, file);
  const stat = await lstat(p).catch(() => null);
  if (!stat?.isFile() || stat.isSymbolicLink())
    throw new Error(`Missing or unsafe target: ${file}`);
  const original = await readFile(p, "utf8");
  const eol = original.includes("\r\n") ? "\r\n" : "\n";
  const content = template
    .replaceAll("{EXEC}", link(file, "EXECUTE_UI_AI_UPGRADE.md"))
    .replaceAll("{PRD}", link(file, "docs/10_PRD_UI_AI_V2.md"))
    .replaceAll("{UI}", link(file, "docs/11_UI_BLUEPRINT.md"))
    .replaceAll("{AI}", link(file, "docs/12_AI_COMPAT_SPEC.md"))
    .replaceAll("{QA}", link(file, "docs/13_EXECUTION_QA.md"))
    .replaceAll("\n", eol);
  const block = `${BEGIN}${eol}${content}${eol}${END}`;
  let updated;
  const start = original.indexOf(BEGIN),
    end = original.indexOf(END);
  if (
    start < 0 !== end < 0 ||
    (start >= 0 && (end < start || original.indexOf(BEGIN, start + 1) >= 0))
  )
    throw new Error(`Malformed marker: ${file}`);
  // Preserve an existing v2 block, including task statuses edited by the agent.
  if (start >= 0) updated = original;
  else {
    const pos = original.indexOf("\n");
    if (pos < 0) throw new Error(`No document header line: ${file}`);
    updated =
      original.slice(0, pos + 1) + eol + block + eol + original.slice(pos + 1);
  }
  plans.push({
    file,
    p,
    original,
    updated,
    changed: updated !== original,
    sha: sha(original),
  });
}
const results = [];
for (const x of plans) {
  if (apply && x.changed) {
    // Refuse a concurrent edit rather than discarding newer work.
    if ((await readFile(x.p, "utf8")) !== x.original)
      throw new Error(`Concurrent edit: ${x.file}`);
    const backup = join(root, "docs", "baseline", "ui-ai-v2", x.file);
    await mkdir(dirname(backup), { recursive: true });
    try {
      await writeFile(backup, x.original, { flag: "wx" });
    } catch (e) {
      if (e.code !== "EEXIST") throw e;
    }
    const temp = x.p + ".pn-ui-ai-tmp-" + process.pid;
    await writeFile(temp, x.updated, { flag: "wx" });
    await rename(temp, x.p);
  }
  results.push({
    file: x.file,
    status: x.changed ? (apply ? "APPLIED" : "WOULD_CHANGE") : "UNCHANGED",
    beforeSha256: x.sha,
    afterSha256: sha(x.updated),
  });
}
console.log(
  JSON.stringify(
    {
      mode: apply ? "apply" : "dry-run",
      applicationCodeChanged: false,
      results,
    },
    null,
    2,
  ),
);
