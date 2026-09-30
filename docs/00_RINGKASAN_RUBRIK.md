# PapanNalar: Dokumen Rancangan Aplikasi

Sep 29, 2026 · @Azka

## Ringkasan produk dan keputusan kunci

**PapanNalar** adalah asisten AI untuk guru yang mengajar matematika, dari SD kelas 1 sampai SMA. Aplikasi ini membantu guru menjalankan Teaching at the Right Level (TaRL) di layar kelas: mengecek level tiap siswa dalam sekitar 10 menit, membentuk kelompok per level, menjalankan rotasi tiga stasiun di mana siswa bergiliran menyentuh papan dan bernalar dengan Alat Nalar, dan memberi saran mengajar saat guru mendampingi kelompok. Setiap materi dikaitkan dengan gunanya dalam hidup, dan kartu keluar menanyakan alasan, bukan hanya jawaban.

*Satu papan, setiap siswa belajar di levelnya.*

Dasar riset dan sumber setiap masalah ada di dokumen riset sebelumnya: Riset Masalah dan Solusi Smart Education

**Keputusan kunci (mengikat semua tab)**

1. **Cakupan: numerasi SD kelas 1 sampai SMA dengan satu Tangga Nalar.** Tangga berisi 22 anak tangga dari elemen Bilangan dan Aljabar Capaian Pembelajaran Fase A sampai E (Keputusan Kepala BSKAP 046/H/KR/2025). Siswa bekerja di anak tangga yang belum ia kuasai, apa pun kelasnya. Demo memakai tiga kelas contoh: SD kelas 5, SMP kelas 7 (alur lengkap), dan SMA kelas 10. Rinciannya di PRD bagian 5.
2. **Belajar untuk paham dan tahu gunanya, bukan menghafal.** Mengikuti Pembelajaran Mendalam (memahami, mengaplikasi, merefleksi): setiap sesi dibuka dengan masalah nyata, siswa memanipulasi Alat Nalar di papan, dan kartu keluar dua tingkat menghitung jawaban benar dengan alasan salah sebagai belum paham. Rinciannya di tab Desain Pembelajaran Interaktif dan Katalog Materi Bermakna.
3. **Siswa tidak memakai perangkat pribadi.** Mereka menyentuh papan kelas secara bergiliran dan menjawab di Kartu Nalar (pilihan A, B, C, D, atau "?" untuk "belum tahu") yang dibaca kamera HP guru. Siswa kelas 1 sampai 3 SD menjawab lisan, dan guru mencatatnya di HP. Kami sengaja tidak membaca tulisan tangan, karena riset 2026 ([Seong dkk., arXiv](https://arxiv.org/html/2604.22774v1)) menunjukkan model AI sering membetulkan kesalahan siswa saat menyalin tulisan.
4. **Papan interaktif adalah alat berpikir siswa, bukan syarat.** Di Stasiun Papan, siswa membagi, menggeser, dan menimbang model matematika. Layar Kelas tetap berjalan di browser apa pun: papan interaktif, laptop dengan proyektor, atau TV; tanpa layar sentuh, Alat Nalar dijalankan dari HP guru. Ini penting karena sekolah minimal menerima satu papan, belum tentu satu per kelas.
5. **AI membantu guru, bukan menggantikan.** Penentuan level dihitung dengan rumus yang bisa dijelaskan (Bayesian Knowledge Tracing dan aturan tangga), bukan diputuskan LLM. LLM dipakai untuk menyiapkan aktivitas dan memberi saran kepada guru.
6. **Isi soal tidak boleh halusinasi.** Soal dibuat dari templat berparameter; kunci dan pilihan pengecoh dihitung kode dari daftar miskonsepsi. LLM hanya menulis konteks cerita, lalu hasilnya diverifikasi kode.
7. **Nama siswa tidak pernah muncul di layar kelas maupun dikirim ke LLM.** Kelompok diberi nama bentuk dan warna (Segitiga Biru, Lingkaran Oranye), bukan peringkat. Papan hanya menampilkan nomor absen.
8. **Sesi Tepat Level disarankan satu kali per minggu.** PapanNalar tidak menggantikan semua pertemuan; pertemuan lain tetap mengikuti kurikulum kelas.
9. **Satu stack untuk MVP:** Next.js (TypeScript) dan Supabase, tanpa layanan Python, supaya tim kecil bisa membangun dan merawatnya.

**Bedanya PapanNalar dengan versi sebelumnya (PindaiNalar):** PindaiNalar menilai ujian setelah terjadi. PapanNalar mengubah cara guru mengajar setiap minggu, di perangkat yang sudah ada di sekolah.

## Kesesuaian dengan tema dan rubrik lomba

Setiap aspek penilaian di juknis Hackathon IT Comp 2026 punya jawaban dan bukti yang bisa ditunjukkan. Kalau sebuah fitur tidak menyumbang ke salah satu baris di bawah, fitur itu tidak dibangun.

**Tema dan subtema**

| Tema lomba | Jawaban PapanNalar |
| --- | --- |
| Smart Nation Innovation: solusi digital cerdas untuk masyarakat yang berdaya saing | Numerasi dasar adalah fondasi daya saing. PISA 2025: hanya 17% siswa Indonesia mencapai Level 2 matematika, rata-rata OECD 65% |
| Subtema Smart Education: kualitas pembelajaran | Guru mengajar sesuai level siswa (TaRL), bukan satu kecepatan untuk semua; siswa belajar untuk paham dan tahu gunanya (Pembelajaran Mendalam) |
| Subtema Smart Education: manajemen pendidikan | Data level per kelas untuk wakasek dan kepala sekolah; papan interaktif yang sudah dibeli negara menjadi berguna |
| Juknis: masalah nyata di bidang pendidikan dan organisasi | Semua masalah bersumber (tab Ringkasan, dokumen riset) |

**Aspek penilaian**

| Aspek (bobot) | Yang dinilai juri | Jawaban PapanNalar | Bukti yang ditunjukkan |
| --- | --- | --- | --- |
| Inovasi dan Relevansi Solusi (30%) | Relevansi dengan tema, relevansi dengan masalah nyata, kemampuan menghadirkan solusi | TaRL digital di papan kelas tanpa HP siswa; siswa bernalar dengan Alat Nalar di papan; AI menyiapkan aktivitas dan membisiki guru | Demo satu siklus utuh: pembuka, cek level, pindai, kelompok, rotasi stasiun dengan Alat Nalar, kartu keluar dua tingkat, refleksi |
| Kemanfaatan dan Dampak (20%) | Manfaat nyata dan dampak positif bagi pengguna | Berdiri di atas bukti RCT: TaRL (J-PAL, GEEAP "good buy"), Mindspark (+0,37 SD), Tutor CoPilot (+4 sampai 9 poin persen); dan meta-analisis: manipulatif virtual (efek 0,35, Moyer-Packenham dan Westenskow 2013), mencoba sebelum diajari (g = 0,36, Sinha dan Kapur 2021) | Metrik perpindahan level siswa dan persentase benar dan paham; hasil uji coba bila ada, disebut apa adanya |
| Keberlanjutan (15%) | Bisa diterapkan dan dikembangkan jangka panjang | Memakai perangkat yang sudah dikirim ke 288.865 sekolah; inti aplikasi tetap jalan tanpa AI dan tanpa internet saat membaca kartu | Rencana bisnis (tab Rencana Bisnis, tahap 3) |
| Kualitas Kode (15%) | Keterbacaan, efektivitas, konsistensi penamaan | Inti aplikasi deterministik (pembaca kartu, level, generator soal) sehingga mudah dites | Repo publik, tes otomatis, CI hijau (tab Spesifikasi Teknis, tahap 2) |
| Kualitas UI dan UX (10%) | Visual profesional, konsistensi warna, tipografi, layout, hierarki | Sistem desain dengan token warna yang lolos WCAG AA dan font khusus layar kelas; target sentuh papan 88 dan 96 px; tanpa tanda salah yang mempermalukan | Tab Brand dan Desain |
| Kemampuan Menjabarkan Ide (10%) | Konsep dan user flow jelas, presentasi terstruktur, jawaban solutif | Alur satu pertemuan digambar per menit dan per peran | Diagram alur di PRD; daftar pertanyaan juri (tahap 3) |

**Kaitan dengan tagline IT Fest "B****e****yond the Ordinary":** papan interaktif yang di banyak sekolah baru dipakai seperti proyektor berubah menjadi alat berpikir yang disentuh siswa, sekaligus pendamping guru untuk mengajar sesuai level.

## Aturan anti-blunder untuk tim

Detail kesalahan di lomba MAPID belum tercatat di sini. Kalau kamu tuliskan di komentar, aturannya akan ditambah. Untuk sekarang, tujuh aturan ini berlaku di semua tab.

1. **Tidak ada fitur tanpa alasan.** Setiap fitur harus punya baris di matriks keterlacakan PRD: masalah yang bersumber, dasar riset, dan aspek rubrik.
2. **Tidak ada angka tanpa sumber.** Setiap angka di paper, video, dan slide berasal dari sumber yang dibuka atau hasil ukur tim sendiri. Yang belum diukur ditulis sebagai "asumsi" atau "target".
3. **Tidak mengklaim dampak yang belum diuji.** Yang boleh ditulis: "berdasarkan riset TaRL...". Yang tidak boleh: "PapanNalar menaikkan nilai X%", kecuali ada data uji coba.
4. **Cek logika lapangan.** Untuk setiap alur, jawab: siapa memegang perangkat, di ruangan mana, berapa menit, butuh internet atau tidak, dan apa yang terjadi kalau gagal.
5. **Fitur wajib harus jalan di demo.** Di demo final, fitur berprioritas "wajib" tidak boleh hanya berupa mockup gambar. Di video penyisihan, bagian yang belum jalan diberi label "desain" dan tidak diklaim sudah jalan (roadmap di PRD bagian 9).
6. **Sebut apa yang dilakukan AI dan apa yang tidak.** Jangan menulis "AI canggih" tanpa penjelasan. Contoh yang benar: "LLM menulis konteks soal; kunci jawaban dihitung kode."
7. **Akui kompetitor.** Plickers, Rumah Pendidikan, dan aplikasi kuis lain disebut beserta bedanya, bukan disembunyikan.

## Peta dokumen dan tahapan

Dokumen dikerjakan dalam tiga tahap. Tahap 1 cukup untuk mulai mendesain dan menyiapkan repo; tahap 2 berisi semua yang dibutuhkan developer untuk menulis kode.

| Tab | Isi | Tahap | Pembaca utama |
| --- | --- | --- | --- |
| Ringkasan dan Rubrik | Keputusan kunci, kesesuaian rubrik, aturan tim, asumsi | 1 | Seluruh tim |
| PRD | Masalah, tujuan, pengguna, alur, kerangka level, fitur, kriteria penerimaan | 1 | Developer, desainer, penulis paper |
| Desain Pembelajaran Interaktif | Struktur sesi, rotasi stasiun, mengenal panel interaktif, pola interaksi, Alat Nalar, umpan balik, cara menilai pemahaman | 1 | Desainer, developer frontend, penulis paper |
| Katalog Materi Bermakna | Kegunaan, pembuka "tebak dulu", pertanyaan kenapa, dan soal dua tingkat untuk 22 anak tangga | 1 | Penulis konten, guru atau dosen pereview |
| Brand dan Desain | Nama, logo, warna, tipografi, maskot, gaya bahasa, komponen | 1 | Desainer, developer frontend |
| Spesifikasi Teknis | Arsitektur, model data, API, pembaca kartu, mesin sentuh, agen AI dan prompt, keamanan, deploy | 2 | Developer |
| UX dan Layar | Peta layar, wireframe, microcopy, keadaan kosong dan galat | 2 | Desainer, developer frontend |
| Rencana Bisnis | Model bisnis, pasar, harga, biaya, go-to-market, dampak, risiko | 3 | Penulis paper, presenter |
| Build, QA, dan Pitch | Rencana build, rencana uji, skenario demo, naskah video, kerangka concept paper | 3 | Seluruh tim |

Desain layar ada di kanvas [PapanNalar: Desain Layar](https://claude.ai/artifact/UZtew2V4EFFa94LpKqULdj): konsep dan suasana kelas, Layar Kelas (SMP 7, SD 5, SMA 10), layar panel interaktif yang disentuh siswa (pembuka, stasiun, Berdua, Cari Kesalahan, Timbangan, Grafik, kartu keluar dua tingkat, refleksi, tes papan), tujuh layar HP guru, dan anatomi Kartu Nalar. Kanvas dan dokumen ini privat sampai dibagikan lewat menu Share.

## Asumsi dan pertanyaan terbuka

Semua butir di bawah belum terverifikasi. Jangan ditulis sebagai fakta di paper sebelum dicek.

| Asumsi | Kenapa penting | Cara mengecek |
| --- | --- | --- |
| Papan interaktif di sekolah menjalankan browser modern | Layar Kelas adalah aplikasi web | Minta foto menu dan versi browser dari satu sekolah, atau uji langsung |
| Guru memakai HP Android dengan kamera dan Chrome | Pembaca kartu berjalan di browser HP | Tanya 3 sampai 5 guru |
| Sekolah bisa memfotokopi atau mencetak Kartu Nalar tiap sesi | Kartu adalah satu-satunya cara siswa menjawab | Tanya guru; hitung biaya fotokopi per sesi |
| Ada koneksi internet di kelas (wifi sekolah atau hotspot HP guru) | Sinkronisasi HP guru dengan Layar Kelas butuh koneksi | Tanya guru; cadangan di MVP: guru membacakan pembagian kelompok dari HP |
| Satu kelas berisi sekitar 32 siswa | Menentukan waktu pindai dan ukuran kelompok | Jadikan pengaturan, bukan angka tetap |
| Guru mau memakai satu pertemuan per minggu untuk Sesi Tepat Level | Menentukan jadwal pemakaian dan metrik | Wawancara minimal 1 guru per jenjang (SD, SMP, SMA) |
| Daftar miskonsepsi per level sudah benar | Menentukan pilihan pengecoh dan saran untuk guru | Minta review dosen pendidikan matematika atau guru senior |
| Temuan Tutor CoPilot (tutor daring di AS) berlaku sebagian untuk guru di kelas | Dasar riset fitur Bisik | Tulis sebagai adaptasi, bukan bukti langsung |
| Nama "PapanNalar" belum dipakai merek lain | Branding | Cek pangkalan data merek DJKI dan ketersediaan domain |
| Uji coba dengan siswa butuh izin sekolah dan persetujuan orang tua | UU PDP Pasal 25: data pribadi anak diproses secara khusus dan dengan persetujuan orang tua atau wali | Siapkan formulir persetujuan sebelum uji coba |
| Siswa kelas 4 bisa mengisi gelembung Kartu Nalar dengan benar | Menentukan mulai kelas berapa siswa memakai kartu | Uji di satu kelas 4 (metrik di PRD) |
| Cek lisan selesai sekitar 1 menit per siswa | Menentukan apakah cek awal kelas 1 sampai 3 muat dalam satu pertemuan | Ukur di satu kelas SD |
| Pola TaRL juga membantu prasyarat aljabar di SMA | Bukti RCT yang kami pegang berasal dari SD dan SMP; ini dasar perluasan ke SMA | Tulis sebagai asumsi; ukur di uji coba SMA |
| Target anak tangga bawaan per kelas cocok dengan urutan materi sekolah | Menentukan jangkauan Cek Awal dan kelompok Lanjut | Minta review guru tiap jenjang; guru tetap bisa mengubah target |
| Papan interaktif yang dibagikan membaca minimal dua sentuhan bersamaan | Mode Berdua dan dua Pilot sekaligus | Tes Kemampuan Papan di papan sekolah uji coba; cadangan satu Pilot sudah dirancang |
| Satu putaran cukup untuk 3 tugas papan di SMP dan SMA (15 dan 18 menit) dan 2 tugas di SD (11 menit) | Menentukan jumlah tugas per stasiun di Paket Sesi | Ukur di uji coba; guru bisa menambah 3 menit |
| Temuan manipulatif virtual, yang sebagian besar diuji dengan satu perangkat per siswa, juga berlaku di papan bersama | Dasar riset Alat Nalar | ☐ Tulis sebagai adaptasi, bukan bukti langsung; ukur benar dan paham di uji coba |
