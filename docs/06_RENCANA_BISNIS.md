# Rencana Bisnis

<!-- BEGIN PN_UI_AI_V2 -->
## Pembaruan asumsi biaya AI

Dukungan endpoint/model baru membuat harga Haiku di bawah menjadi skenario
historis, bukan harga seluruh AI aplikasi. [Spesifikasi ledger](12_AI_COMPAT_SPEC.md) mewajibkan
profil/harga/cap terkonfigurasi dan reservasi konservatif. Harga token, reasoning,
cache dan biaya gateway diisi operator dari kontrak aktual. Usage tidak tersedia
tidak berarti nol biaya. Rencana harga layanan tetap usulan, bukan pembayaran
yang sudah aktif. Tidak ada pembelian atau paid API otomatis pada upgrade.
<!-- END PN_UI_AI_V2 -->

## Ringkasan

Guru memakai PapanNalar gratis; sekolah atau dinas membayar fitur yang memakai LLM, laporan, dan pendampingan. Model ini dipilih karena biaya per pemakaian hampir seluruhnya datang dari LLM, sedangkan inti aplikasi (kartu, pindai, kelompok, Alat Nalar) berjalan di HP dan papan tanpa biaya tambahan.

- **Harga uji:** Rp100.000 per rombel per tahun untuk Paket Sekolah dan mulai Rp80.000 untuk Paket Dinas. Sekolah dengan 12 rombel membayar Rp1,2 juta per tahun.
- **Biaya LLM kami:** sekitar Rp44.000 per rombel per tahun dengan Claude Haiku 4.5 bila semua dipanggil langsung seperti di MVP, dan sekitar Rp28.000 setelah Paket Sesi disiapkan malam sebelumnya lewat Batch API (perhitungan di bagian Biaya per kelas).
- **Titik impas:** 17 sekolah berbayar untuk menutup server, atau 86 sekolah bila ditambah satu staf pendamping sekolah (harga Paket Sekolah, dengan Batch API).
- **Biaya terbesar bagi sekolah justru fotokopi**, sekitar Rp6.800 sampai Rp17.000 per siswa per tahun. Karena itu desain kartu dibuat hemat kertas dan bisa difotokopi hitam putih.

Semua harga di tab ini adalah harga uji yang harus divalidasi dengan guru, kepala sekolah, dan dinas. Angka pasar dan biaya bersumber; angka proyeksi adalah asumsi dan ditulis sebagai asumsi.

## Pelanggan dan pengambil keputusan

Yang memakai (guru) berbeda dengan yang membayar (sekolah atau dinas). Karena itu setiap pihak diberi alasan sendiri untuk ikut.

| Pihak | Yang dibutuhkan | Yang diberikan PapanNalar | Membayar? |
| --- | --- | --- | --- |
| Guru matematika dan guru kelas SD | Tahu level tiap siswa tanpa menambah beban, materi per level siap pakai | Paket Guru gratis: cek level, kelompok, Mode Stasiun, Alat Nalar, kartu strategi Bisik | Tidak |
| Siswa | Paham, tidak malu, tahu gunanya | Belajar di levelnya, bergiliran menyentuh papan, tanpa label peringkat | Tidak. Server tidak menyimpan nama siswa, hanya ID acak, nomor absen, dan jawaban |
| Kepala sekolah dan wakasek kurikulum | Data numerasi per kelas untuk perencanaan dan tindak lanjut Rapor Pendidikan | Ringkasan per kelas, perubahan level 4 minggu, persentase benar dan paham | Paket Sekolah (terutama sekolah swasta dan yayasan) |
| Dinas kabupaten/kota (SD, SMP) dan provinsi (SMA, SMK) | Papan interaktif yang sudah dibagikan benar-benar dipakai; data untuk program peningkatan numerasi | Paket untuk semua sekolah, pelatihan lewat KKG dan MGMP, dasbor dinas (setelah MVP) | Paket Dinas (pembeli utama untuk sekolah negeri) |
| Orang tua atau wali | Anak aman dan datanya terlindungi | Formulir persetujuan uji coba; nama anak tidak pernah keluar dari HP guru | Tidak |

Mitra yang tidak membayar tetapi menentukan: BPMP provinsi dan BBPMP (penjaminan mutu dan pelatihan guru), KKG dan MGMP (tempat guru belajar dari guru lain), serta dosen pendidikan matematika yang mereview daftar miskonsepsi dan Katalog Materi Bermakna.

Pola ini punya contoh di Indonesia. Direktorat Sekolah Dasar bersama program INOVASI menjalankan pembelajaran literasi sesuai level (asesmen, pengelompokan, pembelajaran per level) di 98 satuan pendidikan di NTB. Pelatihan 1.592 guru di 208 sekolah dan 2.090 guru di Bima dibiayai dana BOS ([Ditpsd Kemendikbud](https://ditpsd.kemdikbud.go.id/artikel/detail/perkuat-pembelajaran-literasi-berbasis-level-kemampuan-siswa)). Artinya pembelajaran sesuai level sudah dikenal pemerintah; yang belum ada adalah alat digital yang meringankan langkah-langkahnya.

## Ukuran pasar

Sasaran PapanNalar adalah 207.431 sekolah SD, SMP, dan SMA di bawah Kemendikdasmen. Pintu masuknya Kalimantan Timur, yang menerima sekitar 3.900 papan interaktif.

| Lapisan | Jumlah | Keterangan |
| --- | --- | --- |
| Satuan pendidikan penerima papan interaktif | 288.865 | Semua jenjang, dari PAUD sampai SLB ([BBPMP Jabar](https://bbpmpjabar.kemendikdasmen.go.id/percepat-transformasi-pendidikan-presiden-luncurkan-digitalisasi-pembelajaran-untuk-288-ribu-sekolah/)); 800.000 papan tambahan diumumkan Juli 2026 ([ANTARA Jogja](https://jogja.antaranews.com/berita/839237/mendikdasmen-tambah-800000-papan-interaktif-digital-di-sekolah)) |
| SD tahun ajaran 2025/2026 | 149.028 | Negeri dan swasta, data BPS ([GoodStats](https://goodstats.id/article/distribusi-jumlah-sekolah-di-indonesia-tahun-ajaran-2025-2026-uUl0W)) |
| SMP tahun ajaran 2025/2026 | 43.593 | Sumber sama |
| SMA tahun ajaran 2025/2026 | 14.810 | Sumber sama. SMK (14.185) belum menjadi sasaran MVP |
| Papan interaktif di Kalimantan Timur | sekitar 3.900 unit | Masih dipakai sebatas presentasi, YouTube, dan kuis sederhana ([Kaltim Faktual](https://kaltimfaktual.co/bukan-sekadar-pajangan-guru-di-kukar-dilatih-maksimalkan-papan-digital/)) |
| Sasaran uji harga (2027) | 20 sekolah di Samarinda | Target tim, bukan data |

Madrasah (MI, MTs, MA) di bawah Kementerian Agama tidak masuk angka di atas. Kami tidak menjumlahkan sekolah dengan papan, karena data yang kami temukan menghitung satuan pendidikan penerima, bukan jumlah papan per sekolah atau per jenjang.

Nilai pasar tidak dihitung dengan mengalikan semua sekolah dengan harga, karena sekolah negeri umumnya membeli lewat dinas. Yang lebih berguna adalah ukuran satu kontrak: satu kota dengan 150 sekolah memakai 12 rombel per sekolah berarti sekitar Rp144 juta per tahun pada harga Paket Dinas Rp80.000.

## Harga dan paket

Garis pemisah gratis dan berbayar adalah LLM: fitur yang memanggil LLM atau butuh pendampingan manusia berbayar, sisanya gratis. Dengan begitu guru di sekolah mana pun bisa memakai inti PapanNalar, dan papan yang dibeli negara tetap bermanfaat walau sekolah belum berlangganan.

| Paket | Untuk | Isi | Harga uji |
| --- | --- | --- | --- |
| Guru | Guru mana pun | Kartu Nalar, Pindai Kartu, Tangga dan Kelompok, Cek Lisan, Mode Stasiun, Alat Nalar, soal dari templat (tanpa cerita), kartu strategi Bisik statis, Kemajuan Kelas | Rp0 |
| Sekolah | Satu sekolah, dibayar sekolah atau yayasan | Semua isi Paket Guru, ditambah cerita soal lokal dari LLM, Bisik tanya bebas, Ringkasan untuk Wakasek, dan pendampingan daring | Rp100.000 per rombel per tahun; contoh 12 rombel Rp1,2 juta |
| Dinas | Kabupaten/kota atau provinsi, minimal 50 sekolah | Paket Sekolah untuk semua sekolah, pelatihan guru lewat KKG dan MGMP, laporan per sekolah, dasbor dinas (setelah MVP) | Mulai Rp80.000 per rombel per tahun; pelatihan dihitung terpisah per kontrak |

Kenapa per rombel, bukan per siswa: biaya kami (LLM) muncul per sesi, dan satu sesi dijalankan per rombel. Harga per rombel juga mudah dihitung sekolah dari jumlah kelas.

Pembanding harga: Plickers Pro, alat kuis kartu kertas yang paling mirip cara kerjanya, dijual USD 5,99 per bulan bila dibayar setahun atau USD 8,99 per bulan bila bulanan, per guru ([Plickers](https://help.plickers.com/hc/en-us/articles/360009186913-How-much-is-Plickers-Pro)). Dengan kurs JISDOR Rp17.917 per USD (28 September 2026, [journalarta](https://journalarta.com/news/2026/09/28/kurs-dollar-hari-ini-28-september-2026-17991-jisdor-bi/)), USD 71,88 per tahun setara sekitar Rp1,29 juta per guru. Paket Sekolah PapanNalar untuk 12 rombel (Rp1,2 juta) sedikit lebih murah dari satu lisensi Plickers Pro.

Yang perlu divalidasi saat uji coba: apakah kepala sekolah bersedia membayar Rp100.000 per rombel, dan dari pos anggaran mana. Pertanyaan ini ditanyakan langsung ke kepala sekolah.

## Biaya per kelas

Satu sesi mingguan memakan biaya LLM sekitar Rp1.308 dengan Claude Haiku 4.5 bila semua dipanggil langsung, seperti di MVP. Setelah lomba, cerita soal dan kartu Bisik disiapkan malam sebelum sesi yang dijadwalkan guru lewat Batch API, dan biayanya turun menjadi sekitar Rp829. Asumsi yang dipakai: 34 sesi per rombel per tahun (satu per minggu efektif), kurs Rp17.917 per USD, dan jumlah token yang sudah diberi cadangan kira-kira dua kali perkiraan.

| Pemanggilan LLM per sesi | Token masuk | Token keluar | Cara panggil |
| --- | --- | --- | --- |
| Cerita soal untuk paling banyak sepertiga soal | 6.000 | 5.000 | Langsung di MVP; setelah lomba lewat Batch API, dikirim malam sebelum sesi |
| Kartu Bisik yang disesuaikan dengan soal | 5.000 | 3.500 | Langsung di MVP; Batch API setelah lomba |
| Bisik tanya bebas, sekitar 5 pertanyaan | 12.000 | 1.500 | Langsung (real-time) |

Harga yang dipakai: Haiku 4.5 USD 1 per sejuta token masuk dan USD 5 per sejuta token keluar ([Anthropic](https://www.anthropic.com/claude/haiku)); Sonnet 5 USD 2 dan USD 10 ([Anthropic](https://www.anthropic.com/claude/sonnet)); Batch API memotong 50%. Harga dicek di halaman resmi Anthropic pada 29 September 2026.

| Komponen | Dibayar oleh | Per sesi | Per rombel per tahun |
| --- | --- | --- | --- |
| LLM, Claude Haiku 4.5, semua langsung (MVP) | PapanNalar | Rp1.308 | Rp44.470 |
| LLM, Claude Haiku 4.5 dengan Batch API (setelah lomba) | PapanNalar | Rp829 | Rp28.174 |
| LLM, Claude Sonnet 5 dengan Batch API (bila cerita Haiku kurang baik) | PapanNalar | Rp1.657 | Rp56.349 |
| Fotokopi 32 lembar untuk 32 siswa: 16 lembar Kartu Nalar (2 kartu per siswa, 4 kartu per lembar) dan 16 lembar tugas mandiri (1 lembar untuk 2 siswa), Rp200 sampai Rp500 per lembar ([CariBisnis](https://caribisnis.id/artikel/harga-cetak-fotokopi-2026)) | Sekolah | Rp6.400 sampai Rp16.000 | Rp217.600 sampai Rp544.000 |

Biaya tetap server per bulan: Supabase Pro USD 25 ([makerkit](https://makerkit.dev/blog/saas/supabase-pricing)) dan Vercel Pro USD 20 per developer untuk 2 developer ([costbench](https://costbench.com/software/developer-tools/vercel/)), total USD 65 atau sekitar Rp14 juta per tahun. Kuota Realtime Supabase Pro 5 juta pesan per bulan ([Supabase](https://supabase.com/docs/guides/realtime/pricing)). Dengan perkiraan 400 pesan per sesi dan 4 sesi per bulan, kuota itu cukup untuk sekitar 3.100 rombel; kelebihannya USD 2,50 per sejuta pesan.

Tiga hal yang terlihat dari tabel ini:

1. Dengan Haiku 4.5, biaya LLM 28% sampai 44% dari harga uji Rp100.000 per rombel, jadi Paket Sekolah tetap punya margin, di MVP maupun setelah Batch API. Sonnet 5 hanya layak dengan Batch API; tanpa itu biayanya Rp88.940 per rombel per tahun, hampir sama dengan harga.
2. Biaya cetak di sekolah 4 sampai 19 kali lebih besar dari biaya LLM kami. Penghematan yang paling berarti ada di kertas: tugas mandiri boleh satu lembar per kelompok bila sekolah perlu berhemat.
3. Kurs bisa berubah. Kenaikan kurs 10% menaikkan biaya LLM 10%, sekitar Rp2.800 sampai Rp4.400 per rombel per tahun pada Haiku 4.5, jadi harga uji masih aman.

## Cara sampai ke sekolah

Urutannya: buktikan di sedikit kelas, sebarkan lewat komunitas guru, lalu jual ke dinas dengan data. Setiap tahap punya syarat lulus; tahap berikutnya tidak dimulai sebelum syaratnya terpenuhi.

| Tahap | Waktu | Yang dilakukan | Lanjut bila |
| --- | --- | --- | --- |
| 1. Uji coba | Oktober sampai Desember 2026 | 3 sekolah di Samarinda (1 SD, 1 SMP, 1 SMA), gratis, dengan izin sekolah dan persetujuan orang tua | Guru menjalankan minimal 4 sesi tanpa bantuan tim, dan minimal 80% sesi selesai sampai kartu keluar |
| 2. Komunitas guru | Semester genap 2026/2027 | Diperkenalkan lewat KKG (guru SD) dan MGMP matematika (SMP, SMA); Paket Guru gratis; harga Paket Sekolah diuji di 20 sekolah | Minimal 10 sekolah bersedia membayar harga uji |
| 3. Dinas | Mulai Juli 2027 | Proposal ke dinas pendidikan kota (SD, SMP) dan provinsi (SMA) berisi data uji coba; uji coba resmi satu semester; siapkan legalitas usaha untuk mendaftar sebagai penyedia, lalu pengadaan lewat e-Katalog versi 6 ([LKPP](https://www.lkpp.go.id/read/s/presiden-ri-prabowo-subianto-resmi-luncurkan-e-katalog-versi-6-0)) | Satu kontrak kota atau kabupaten |
| 4. Perluasan | 2028 dan seterusnya | Kabupaten/kota lain di Kalimantan Timur, lalu provinsi lain lewat BPMP | Biaya pendampingan per sekolah turun karena materi pelatihan dipakai ulang |

**Kanal yang dipakai:**

- KKG dan MGMP, karena guru lebih percaya contoh dari guru lain daripada iklan.
- Pelatihan pemanfaatan papan interaktif yang sudah berjalan, seperti pelatihan guru di Kutai Kartanegara ([Kaltim Faktual](https://kaltimfaktual.co/bukan-sekadar-pajangan-guru-di-kukar-dilatih-maksimalkan-papan-digital/)). PapanNalar menjawab pertanyaan yang biasanya muncul setelah pelatihan semacam itu: papan ini dipakai untuk apa di pelajaran matematika minggu depan.
- Panduan Guru di aplikasi (F12, dibangun setelah MVP) dan video 3 menit, supaya guru baru bisa mulai tanpa tim datang ke sekolah.

**Soal dana sekolah.** Juknis BOSP 2026 (Permendikdasmen Nomor 8 Tahun 2026) mengarahkan dana ke pembelajaran, asesmen, dan pengembangan guru. Namun rangkuman yang kami baca tidak menyebut langganan aplikasi secara tersurat ([Rumah Pendidikan](https://pusatinformasi.rumahpendidikan.kemendikdasmen.go.id/hc/id/articles/55390563223065-Implementasi-Permendikdasmen-No-8-2026-Juknis-BOSP-2026-dalam-Penggunaan-Dana-BOSP-Reguler), [BBPMP Jateng](https://bbpmpjateng.kemendikdasmen.go.id/sekolah-wajib-tahu-ini-aturan-terbaru-pengelolaan-dana-bosp-2026/)). Karena itu rencana ini tidak bergantung pada BOSP. Sekolah negeri dijangkau lewat dinas, sedangkan Paket Sekolah dijual terutama ke sekolah swasta dan yayasan. Boleh atau tidaknya BOSP dipakai untuk langganan ditanyakan ke dinas saat uji coba.

## Kompetitor dan pembeda

Penelusuran singkat kami tidak menemukan pembanding yang menggabungkan cek level tanpa perangkat siswa, pengelompokan otomatis, aktivitas per level di papan, dan saran untuk guru. Tetapi setiap bagian itu punya pembanding, dan pembanding itu disebut terang.

| Pembanding | Yang dilakukan | Bedanya dengan PapanNalar |
| --- | --- | --- |
| Plickers | Kuis pilihan ganda dengan kartu kertas yang dipindai HP guru ([Plickers](https://help.plickers.com/hc/en-us/articles/360009186913-How-much-is-Plickers-Pro)) | Paling mirip cara pindainya. Tidak mengelompokkan siswa per level, tidak menyiapkan materi per level, dan tidak ada kartu keluar dua tingkat |
| Rumah Pendidikan | Platform pemerintah yang gratis, dengan lebih dari 2.400 konten ([Puslapdik](https://puslapdik.kemendikdasmen.go.id/kemendikdasmen-mulai-distribusikan-smartboard/)) | Pelengkap. Di halaman yang kami buka tidak ditemukan pengelompokan level otomatis (perlu dicek langsung). PapanNalar bisa menautkan kontennya sebagai bahan tambahan |
| Aplikasi kuis interaktif (misalnya Kahoot) | Kuis cepat yang menyenangkan | Umumnya butuh perangkat untuk pemain, dan fokusnya menjawab cepat, bukan memahami alasan |
| Pembelajaran sesuai level secara manual (INOVASI dan Direktorat SD) | Asesmen, pengelompokan, dan pembelajaran per level oleh guru terlatih ([Ditpsd](https://ditpsd.kemdikbud.go.id/artikel/detail/perkuat-pembelajaran-literasi-berbasis-level-kemampuan-siswa)) | Terbukti di lapangan, tetapi guru mengerjakan semuanya dengan tangan. PapanNalar mengotomatiskan cek, kelompok, dan materi |
| Mindspark (India) | Pembelajaran adaptif berbantuan komputer, +0,37 SD matematika ([J-PAL](https://www.povertyactionlab.org/evaluation/disrupting-education-evidence-technology-aided-instruction-india)) | Bukti kuat, tetapi setiap siswa butuh komputer atau tablet. PapanNalar memakai satu papan dan kertas |

Risiko terbesar dari pembanding adalah Rumah Pendidikan menambahkan fitur serupa secara gratis. Jawaban kami: pembanding pemerintah justru jalur kerja sama. Inti PapanNalar (Tangga Nalar, templat soal, kartu strategi) dirancang terbuka sehingga bisa diintegrasikan.

## Dampak dan cara mengukurnya

Dampak yang dijanjikan hanya yang bisa diukur di uji coba; kenaikan hasil belajar baru boleh diklaim setelah ada kelas pembanding. Yang bisa ditunjukkan sejak awal adalah papan dipakai untuk bernalar, guru terbantu, dan biaya per siswa rendah.

| Tingkat | Indikator | Target awal | Cara ukur |
| --- | --- | --- | --- |
| Pemakaian papan | Sesi per kelas per minggu; menit siswa menyentuh Alat Nalar per sesi | 1 sesi per minggu; diukur dulu, target ditetapkan setelah uji coba | Log sesi dan board\_events |
| Guru | Sesi yang dijalankan tanpa bantuan tim; waktu persiapan | 4 sesi tanpa bantuan; persiapan cukup satu ketukan | Log dan wawancara guru |
| Siswa | Persentase siswa naik minimal satu anak tangga dalam 4 minggu; persentase benar dan paham | Diukur, belum ditargetkan | Level per sesi dan kartu keluar dua tingkat |
| Pemerataan | Semua siswa pernah menjadi Pilot; siswa di bawah jangkauan yang naik | Semua siswa dalam 3 sesi | Log giliran dan level |
| Sekolah dan dinas | Ringkasan dipakai dalam rapat evaluasi | Diukur | Wawancara wakasek dan dinas |

**Biaya per siswa.** Dengan 32 siswa per rombel, harga uji Rp100.000 per rombel sama dengan sekitar Rp3.125 per siswa per tahun. Ditambah fotokopi Rp6.800 sampai Rp17.000, totalnya sekitar Rp9.900 sampai Rp20.100 per siswa per tahun, atau USD 0,55 sampai 1,12. Sebagai pembanding, program TaRL yang dicatat J-PAL sering berbiaya di bawah USD 10 per anak per tahun ([J-PAL](https://www.povertyactionlab.org/evidence-effect/teaching-at-the-right-level)). Angka ini tidak berarti PapanNalar seefektif TaRL; ia hanya menunjukkan biayanya tidak menjadi penghalang.

**Kaitan dengan tujuan yang lebih besar.** Target SDG 4.1 mengukur proporsi anak yang mencapai kemampuan minimum matematika. PISA 2025 mencatat hanya 17% siswa Indonesia mencapai Level 2 matematika. PapanNalar menyasar langsung siswa yang belum mencapai batas itu, dengan mengajar dari level mereka.

## Proyeksi 3 tahun

Dengan asumsi di bawah, PapanNalar hampir impas di tahun pertama dan menutup biaya operasional mulai tahun kedua. Proyeksi ini skenario untuk menguji kelayakan dan belum memasukkan gaji tim inti.

| Tahun | Sekolah berbayar | Pendapatan | Biaya LLM | Staf pendamping | Server | Selisih |
| --- | --- | --- | --- | --- | --- | --- |
| 2027 | 20 (ditambah 3 sekolah uji coba gratis) | Rp24,0 juta | Rp7,8 juta | Rp0 | Rp14,0 juta | Rp2,2 juta |
| 2028 | 150 (satu kota lewat dinas) | Rp144,0 juta | Rp50,7 juta | Rp60,0 juta | Rp14,0 juta | Rp19,3 juta |
| 2029 | 400 (beberapa kabupaten/kota di Kaltim) | Rp384,0 juta | Rp135,2 juta | Rp120,0 juta | Rp20,0 juta | Rp108,8 juta |

**Asumsi:**

- 12 rombel per sekolah memakai PapanNalar (asumsi; rata-ratanya perlu dicek di Dapodik). Harga Paket Sekolah Rp100.000 pada 2027; tahun 2028 dan 2029 lewat dinas dengan harga Rp80.000.
- Biaya LLM memakai Claude Haiku 4.5 dengan Batch API, Rp28.174 per rombel per tahun. Batch API harus sudah dibangun sebelum 2027.
- Satu staf pendamping sekolah Rp5 juta per bulan mulai 2028, dua staf mulai 2029 (asumsi, bukan data gaji).
- Server dinaikkan ke Rp20 juta pada 2029 sebagai cadangan. Dengan 4.800 rombel, pesan Realtime melewati kuota (sekitar 3.100 rombel) kira-kira 2,7 juta pesan per bulan, atau sekitar Rp1,4 juta per tahun; sisanya untuk penyimpanan dan lalu lintas yang ikut naik.
- Dua hal membuat 2028 kembali minus: tanpa Batch API (biaya LLM Rp80,0 juta, selisih minus Rp10,0 juta), atau rata-rata hanya 8 rombel per sekolah (selisih minus Rp11,8 juta). Keduanya diperiksa sebelum masuk ke dinas.

Titik impas: kontribusi per sekolah dengan harga Paket Sekolah adalah Rp1.200.000 dikurangi Rp338.088 biaya LLM, yaitu Rp861.912. Server saja tertutup oleh 17 sekolah; server dan satu staf pendamping tertutup oleh 86 sekolah. Dengan harga Dinas Rp80.000, angkanya 23 dan 119 sekolah.

Karena gaji tim inti belum masuk, tahun 2027 dan 2028 butuh dana dari luar penjualan, misalnya hibah lomba, inkubator kampus, atau program CSR pendidikan. Sumber dana ini belum ada; di sini ditulis sebagai kebutuhan.

## Risiko dan mitigasi

Risiko terbesar bukan teknologi, tetapi guru berhenti memakai karena terasa menambah beban. Mitigasinya ada di desain produk.

| Risiko | Kemungkinan | Dampak | Mitigasi |
| --- | --- | --- | --- |
| Guru berhenti setelah beberapa sesi | Sedang | Tinggi | Mulai sesi maksimal 3 ketukan, Paket Sesi disiapkan otomatis, satu sesi per minggu saja; ukur sesi yang selesai tanpa bantuan |
| Dana sekolah tidak boleh dipakai untuk langganan | Sedang | Sedang | Paket Guru tetap gratis; sekolah negeri lewat dinas; ditanyakan ke dinas saat uji coba |
| Papan tidak tersedia, rusak, atau tidak bisa disentuh | Sedang | Sedang | Tes Kemampuan Papan, Alat Nalar lewat HP guru, Mode Tanpa Layar dengan lembar cetak (setelah MVP) |
| Internet di kelas tidak stabil | Tinggi | Rendah | Pindai, level, kelompok, dan Alat Nalar jalan tanpa internet; Paket Sesi diunduh sebelum kelas |
| Biaya LLM naik atau kurs melemah | Sedang | Rendah | Batch API untuk Paket Sesi, model Haiku sebagai bawaan, soal tetap jadi dari templat bila LLM dimatikan |
| Kebocoran data pribadi anak | Rendah | Tinggi | Nama hanya di HP guru, server menyimpan ID acak, persetujuan orang tua sebelum uji coba (UU 27/2022 Pasal 25) |
| Rumah Pendidikan atau pihak lain membuat fitur serupa secara gratis | Sedang | Sedang | Tawarkan integrasi; inti konten dirancang terbuka |
| Dampak belajar tidak terbukti | Sedang | Tinggi | Tidak mengklaim sebelum ada data; uji 4 minggu dengan kelas pembanding setelah lomba |
| Konten atau miskonsepsi keliru | Sedang | Tinggi | Review dosen pendidikan matematika dan guru senior sebelum uji coba; kode miskonsepsi berstatus draf sampai direview |

## Sumber

- [BBPMP Jabar: 288 ribu sekolah menerima papan interaktif](https://bbpmpjabar.kemendikdasmen.go.id/percepat-transformasi-pendidikan-presiden-luncurkan-digitalisasi-pembelajaran-untuk-288-ribu-sekolah/)
- [ANTARA Jogja: 800.000 papan interaktif tambahan](https://jogja.antaranews.com/berita/839237/mendikdasmen-tambah-800000-papan-interaktif-digital-di-sekolah)
- [GoodStats (data BPS): jumlah sekolah 2025/2026](https://goodstats.id/article/distribusi-jumlah-sekolah-di-indonesia-tahun-ajaran-2025-2026-uUl0W)
- [Kaltim Faktual: guru Kukar dilatih memaksimalkan papan digital](https://kaltimfaktual.co/bukan-sekadar-pajangan-guru-di-kukar-dilatih-maksimalkan-papan-digital/)
- [Ditpsd Kemendikbud: literasi berbasis level kemampuan siswa](https://ditpsd.kemdikbud.go.id/artikel/detail/perkuat-pembelajaran-literasi-berbasis-level-kemampuan-siswa)
- [Plickers: harga Plickers Pro](https://help.plickers.com/hc/en-us/articles/360009186913-How-much-is-Plickers-Pro)
- [Anthropic: harga Claude Haiku 4.5](https://www.anthropic.com/claude/haiku) dan [Claude Sonnet 5](https://www.anthropic.com/claude/sonnet)
- [journalarta: kurs JISDOR 28 September 2026](https://journalarta.com/news/2026/09/28/kurs-dollar-hari-ini-28-september-2026-17991-jisdor-bi/)
- [Supabase: harga Realtime](https://supabase.com/docs/guides/realtime/pricing)
- [makerkit: harga Supabase Pro](https://makerkit.dev/blog/saas/supabase-pricing)
- [costbench: harga Vercel Pro](https://costbench.com/software/developer-tools/vercel/)
- [CariBisnis: harga fotokopi 2026](https://caribisnis.id/artikel/harga-cetak-fotokopi-2026)
- [Rumah Pendidikan: implementasi Juknis BOSP 2026](https://pusatinformasi.rumahpendidikan.kemendikdasmen.go.id/hc/id/articles/55390563223065-Implementasi-Permendikdasmen-No-8-2026-Juknis-BOSP-2026-dalam-Penggunaan-Dana-BOSP-Reguler)
- [BBPMP Jateng: aturan pengelolaan dana BOSP 2026](https://bbpmpjateng.kemendikdasmen.go.id/sekolah-wajib-tahu-ini-aturan-terbaru-pengelolaan-dana-bosp-2026/)
- [LKPP: e-Katalog versi 6](https://www.lkpp.go.id/read/s/presiden-ri-prabowo-subianto-resmi-luncurkan-e-katalog-versi-6-0)
- [J-PAL: Teaching at the Right Level](https://www.povertyactionlab.org/evidence-effect/teaching-at-the-right-level) dan [J-PAL: Mindspark](https://www.povertyactionlab.org/evaluation/disrupting-education-evidence-technology-aided-instruction-india)
- [Puslapdik: distribusi smartboard dan Rumah Pendidikan](https://puslapdik.kemendikdasmen.go.id/kemendikdasmen-mulai-distribusikan-smartboard/)
- [Dataloka: PISA 2025, 16,9% siswa Indonesia mencapai Level 2 matematika](https://dataloka.id/humaniora/7521/persentase-siswa-indonesia-belum-kompetensi-minimum-pisa-2025/)
