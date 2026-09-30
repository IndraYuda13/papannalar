# CONCEPT PAPER: PAPANNALAR
## Solusi Digital Cerdas Pembelajaran Berdiferensiasi (Teaching at the Right Level) Berbasis Panel Interaktif dan AI Pendamping Guru untuk Mengatasi Krisis Numerasi Nasional

**Tema Lomba:** Smart Nation Innovation: Solusi Digital Cerdas untuk Masyarakat yang Berdaya Saing  
**Subtema:** Smart Education (Kualitas Pembelajaran & Manajemen Pendidikan)  
**Target Pengguna:** Guru dan Siswa SD (Kelas 1–6), SMP (Kelas 7–9), hingga SMA (Kelas 10–12)  
**Tagline:** *Satu Papan, Setiap Siswa Belajar di Levelnya*  
**Web Demo:** https://papannalar.indrayuda.my.id/demo  
**Layar Kelas:** https://papannalar.indrayuda.my.id/layar  

---

### RINGKASAN EKSEKUTIF

Krisis numerasi Indonesia adalah hambatan struktural terbesar bagi daya saing bangsa di era digital. Hasil asesmen internasional PISA 2025 menunjukkan bahwa skor matematika Indonesia berada di angka 364, dengan hanya 16,9% siswa yang mampu mencapai batas kompetensi minimum (Level 2), terpaut jauh di bawah rata-rata OECD sebesar 65%. Di tingkat nasional, Rapor Pendidikan 2025 mencatat capaian numerasi SD hanya 59,45% dan SMP 70,81%, sementara nilai rerata Tes Kemampuan Akademik (TKA) SMA 2025 bidang matematika hanya mencapai 36,10 dari 100. Riset longitudinal RISE Programme (Beatty dkk., 2021) mengonfirmasi bahwa kemampuan numerasi siswa kelas 7 pada 2014 setara dengan siswa kelas 4 pada tahun 2000. Akar masalahnya adalah kurikulum yang bergerak lebih cepat daripada kemampuan nyata siswa (*curriculum pacing mismatch*, Pritchett & Beatty), sehingga kesenjangan pemahaman yang bermula dari bangku SD terus terakumulasi hingga ke jenjang SMP dan SMA. 

Di sisi lain, pemerintah telah mendistribusikan ratusan ribu unit Interactive Flat Panel (IFP) atau papan digital interaktif ke 288.865 satuan pendidikan di seluruh Indonesia. Namun, perangkat bernilai tinggi ini di lapangan mayoritas hanya difungsikan secara pasif sebagai pengganti proyektor, pemutar video YouTube, atau layar kuis statis. Global Education Evidence Advisory Panel (GEEAP) secara tegas mengategorikan investasi perangkat keras pendidikan tanpa intervensi pedagogis adaptif sebagai *"bad buy"*. Sebaliknya, pendekatan pedagogis yang terbukti paling efektif secara global (*"great buy"*) adalah *Teaching at the Right Level* (TaRL) yang mengelompokkan siswa berdasarkan kompetensi aktual, bukan usia biologis atau tingkat kelas.

**PapanNalar** hadir mentransformasi papan interaktif yang sudah ada di sekolah menjadi alat berpikir aktif siswa sekaligus asisten cerdas bagi guru. Melalui alur terstruktur satu sesi per minggu (Sesi Tepat Level) berdurasi 70–90 menit, PapanNalar menyediakan siklus lengkap: 
1. Mengecek level pemahaman konseptual dan melacak miskonsepsi dalam waktu ~10 menit tanpa mengharuskan siswa memiliki gawai/HP (memakai lembar kertas Kartu Nalar berbasis Optical Mark Recognition/OMR yang dipindai via kamera HP guru secara luring);
2. Membentuk kelompok adaptif secara instan berbasis model Bayesian Knowledge Tracing (BKT) dan Tangga Nalar (22 anak tangga dari Capaian Pembelajaran BSKAP 046/H/KR/2025);
3. Memandu rotasi tiga stasiun (Stasiun Papan bersama Alat Nalar virtual manipulatif, Stasiun Guru dengan pendampingan cerdas, dan Stasiun Mandiri);
4. Memberikan saran pertanyaan pemantik mengajar secara *real-time* kepada guru (*Bisik Guru*) yang diadaptasi dari framework *Tutor CoPilot*;
5. Menilai pemahaman mendalam melalui kartu keluar dua tingkat (*two-tier diagnostic exit ticket*).

PapanNalar dirancang dengan prinsip *AI Safety & Data Privacy by Design*: nama siswa tidak pernah dikirim ke LLM atau ditampilkan di layar kelas, evaluasi matematika dihitung secara deterministik oleh mesin kode lokal tanpa risiko halusinasi, dan fungsi-fungsi inti (pemindaian OMR, pelacakan level, pembagian kelompok, manipulasi Alat Nalar) dapat beroperasi penuh 100% secara luring tanpa koneksi internet.

---

### 1. LATAR BELAKANG DAN PERNYATAAN MASALAH

#### 1.1 Kesenjangan Numerasi Akut yang Terakumulasi Lintas Jenjang
Indonesia menghadapi tantangan fundamental dalam membangun masyarakat yang berdaya saing global. Berdasarkan rilis resmi PISA 2025, Indonesia mencatat skor matematika 364, di mana hanya 16,9% anak Indonesia yang mencapai Level 2 kemahiran matematika (standar minimum OECD di mana siswa dapat menafsirkan dan mengenali situasi matematika sederhana tanpa instruksi langsung). Pada jenjang pendidikan menengah atas, rilis Badan Standar, Kurikulum, dan Asesmen Pendidikan (BSKAP) serta Kemendikdasmen mengenai Tes Kemampuan Akademik (TKA) SMA 2025 memperlihatkan rerata nilai matematika nasional hanya berada pada angka 36,10 dari skala 100.

Fenomena ini bukan sekadar kegagalan pembelajaran di satu tingkat kelas. Penelitian Beatty dkk. (2021) dalam RISE Working Paper menunjukkan terjadinya *learning reversal*: profil pembelajaran anak Indonesia menunjukkan bahwa penguasaan aritmetika dasar kelas 7 pada 2014 setara dengan penguasaan siswa kelas 4 pada tahun 2000. Analisis teoretis Lant Pritchett dan Amanda Beatty membuktikan bahwa kurikulum yang bergerak linier dan terlalu ambisius memaksa guru mengejar target bab buku teks daripada memastikan ketuntasan fondasi nalar. Siswa yang belum memahami bilangan negatif di kelas 7 dipaksa mempelajari persamaan linier satu variabel; siswa yang belum menguasai pecahan senilai di kelas 5 dipaksa menghitung aljabar abstrak di kelas 8. Akibatnya, dalam satu rombongan belajar (rombel) yang berisi 32–36 siswa, rentang pemahaman konseptual siswa bisa terpaut 3 hingga 5 tahun pembelajaran.

#### 1.2 Paradoks Infrastruktur Digital: Papan Interaktif sebagai "Pajangan Mahal"
Sebagai bagian dari akselerasi transformasi digital pendidikan, pemerintah pusat dan daerah telah menggelontorkan anggaran besar untuk mendistribusikan Interactive Flat Panel (IFP) ke 288.865 satuan pendidikan (PAUD, SD, SMP, SMA, SMK, dan SLB). Di Kalimantan Timur saja, sekitar 3.900 unit IFP telah terpasang di ruang-ruang kelas. Namun, observasi lapangan dan liputan media pendidikan (BBPMP, Medcom, Kaltim Faktual) mendapati realitas yang memprihatinkan: IFP mayoritas hanya digunakan untuk menampilkan slide PowerPoint guru, memutar video edukasi YouTube, atau memainkan kuis pilihan ganda statis. Papan digital interaktif tersebut diperlakukan persis seperti proyektor infokus generasi lama. Siswa tetap duduk pasif mendengarkan ceramah guru, tanpa pernah menyentuh layar atau berinteraksi secara kognitif dengan materi.

Laporan konsensus ahli ekonomi pendidikan global dalam GEEAP (2023) menegaskan bahwa intervensi teknologi yang hanya berfokus pada pengadaan perangkat keras (*hardware provision*) tanpa perubahan pedagogi pengajaran adalah investasi berdaya guna rendah (*bad buy*). Sebaliknya, intervensi pedagogis berbasis penyesuaian instruksi pengajaran sesuai level kesiapan siswa (*Teaching at the Right Level* / TaRL) yang dirintis Pratham dan diteliti oleh J-PAL secara konsisten dinobatkan sebagai intervensi berbiaya efektif tertinggi (*great buy*). Tantangan terbesarnya adalah: bagaimana seorang guru di kelas reguler dengan 32 siswa dapat mempraktikkan TaRL secara praktis, cepat, dan teratur tanpa terbebani administrasi penilaian yang rumit?

---

### 2. SOLUSI INOVATIF DAN ALUR SATU SESI TEPAT LEVEL

PapanNalar memecahkan paradoks di atas dengan menyatukan pendekatan pedagogis TaRL, manipulatif virtual, dan pendampingan AI cerdas ke dalam satu ekosistem terpadu. Guru tidak diminta mengubah seluruh jadwal mengajar, melainkan cukup menjalankan **Sesi Tepat Level** satu kali per minggu (1 pertemuan berdurasi 70 menit untuk SD, 80 menit untuk SMP, dan 90 menit untuk SMA).

#### 2.1 Alur 7 Fase Pembelajaran Mendalam (Contoh SMP: 80 Menit)
Alur sesi dirancang presisi dari menit ke menit mengikuti kerangka Pembelajaran Mendalam Kemendikdasmen (Memahami, Mengaplikasi, Merefleksi):

1. **Fase 1: Pembuka Bermakna (5 Menit)**  
   Sesi dibuka bukan dengan rumus, melainkan tantangan kontekstual interaktif di Layar Kelas. Contoh kelas 7: simulasi "Lift Gedung Bertingkat" yang bergerak dari lantai bawah tanah (B2) ke lantai 5. Siswa diajak menebak (*Tebak Dulu*) berapa lantai selisih perpindahannya sebelum diajarkan operasi hitung bilangan bulat.

2. **Fase 2: Cek Level Cepat (7 Menit)**  
   Guru menampilkan 5 soal cek kompetensi di papan atau membagikan lembar tes. Siswa menjawab di selembar kertas fisik berukuran ringkas bernama **Kartu Nalar**. Siswa memilih bulatan A, B, C, D, atau tanda "?" (opsi eksplisit untuk "Saya belum tahu", yang menghilangkan dorongan menebak acak / *blind guessing*). Siswa sama sekali tidak memerlukan ponsel pintar (*zero student screen time*).

3. **Fase 3: Pindai Cepat & Penugasan Eksplorasi (4 Menit)**  
   Guru membuka kamera aplikasi ponsel PapanNalar dan memindai tumpukan Kartu Nalar siswa. Mesin OMR berbasis Computer Vision lokal memproses 32 kartu dalam waktu kurang dari 60 detik tanpa membutuhkan sambungan internet. Sembari guru memindai, siswa di kelas berdiskusi mengerjakan pertanyaan pemantik lanjutan dari masalah pembuka lift.

4. **Fase 4: Pembentukan Kelompok Adaptif (2 Menit)**  
   Seketika kartu terakhir dipindai, algoritma pengelompokan membagi 32 siswa ke dalam 3 kelompok belajar berbasis anak tangga kompetensi yang belum tuntas. Demi menjaga rasa percaya diri dan martabat siswa, kelompok **tidak diberi label peringkat** (seperti "Pintar", "Sedang", "Kurang"), melainkan bentuk geometri dan warna yang diacak setiap sesi:
   - *Segitiga Biru:* Fokus pada anak tangga D1 (Konsep Bilangan Bulat Negatif) — 7 siswa;
   - *Lingkaran Oranye:* Fokus pada anak tangga D2 (Operasi Penjumlahan & Pengurangan Bilangan Bulat) — 13 siswa;
   - *Kotak Hijau:* Fokus pada anak tangga D3 & D4 (Perkalian Bilangan Bulat & Masalah Cerita) — 12 siswa.
   Di Layar Kelas publik hanya ditampilkan bentuk kelompok dan nomor absen siswa, sedangkan data analitik detail hanya tampil di layar ponsel guru.

5. **Fase 5: Rotasi Tiga Stasiun (48 Menit = 3 Putaran x 15 Menit + 3 Menit Jeda Perpindahan)**  
   Setiap kelompok berotasi secara simultan melintasi tiga zona belajar:
   - **Stasiun Papan (Interaktif Mandiri di Papan Digital):** Kelompok berdiri di depan IFP. Siswa bergiliran menjadi *"Pilot"* yang memanipulasi Alat Nalar (misal: Garis Bilangan Lompat). Siswa mengeksplorasi representasi konkret: mengapa $-3 - 5 = -8$? Jika siswa melakukan kekeliruan, sistem tidak memberikan tanda silang merah yang mempermalukan, melainkan menampilkan simulasi maskot *"Nala"* yang keliru, mengajak kelompok menganalisis bersama (*Cari Kesalahan*).
   - **Stasiun Guru (Bimbingan Terfokus):** Guru duduk melingkar bersama kelompok yang paling membutuhkan intervensi mendalam. Di ponsel guru, fitur AI **Bisik Guru** memberikan panduan dialog Sokratik secara personal: miskonsepsi spesifik yang dialami kelompok tersebut, pertanyaan pemantik untuk membongkar miskonsepsi, dan analogi kehidupan nyata.
   - **Stasiun Mandiri (Tantangan Penalaran Lembar Kerja):** Siswa mengerjakan soal-soal penalaran mandiri dari Paket Sesi yang dikaitkan dengan kegunaan nyata materi tersebut dalam profesi atau kehidupan sehari-hari.

6. **Fase 6: Kartu Keluar Dua Tingkat (*Two-Tier Exit Ticket*) (8 Menit)**  
   Untuk mengukur ketuntasan belajar yang hakiki, siswa mengisi Kartu Keluar dengan format dua tingkat:
   - *Tingkat 1:* Jawaban numerik / konseptual atas persoalan;
   - *Tingkat 2:* Alasan matematis di balik pilihan jawaban tersebut.  
   Siswa yang menjawab benar di Tingkat 1 namun memilih alasan yang salah di Tingkat 2 diklasifikasikan oleh sistem sebagai **"Belum Paham (Miskonsepsi)"**, bukan "Tuntas".

7. **Fase 7: Refleksi dan Penutupan Bermakna (6 Menit)**  
   Siswa menuliskan satu hal penting yang mereka pelajari hari itu dan satu penerapannya di dunia nyata pada kanvas refleksi kelas. Guru menutup sesi dengan apresiasi perkembangan individu.

---

### 3. BELAJAR UNTUK PAHAM: PEDAGOGI DAN BUKTI EMPIRIS

PapanNalar dibangun di atas pilar riset pendidikan kognitif teruji, menolak ilusi digitalisasi yang hanya memindahkan soal lembar kerja kertas (LKS) ke layar kaca:

#### 3.1 Teori "Mencoba Sebelum Diajari" (*Productive Failure*)
Meta-analisis Sinha & Kapur (2021) terhadap 53 studi eksperimental menunjukkan bahwa memberikan kesempatan kepada siswa untuk mengeksplorasi masalah dan menebak solusi sebelum diajarkan rumus formal menghasilkan *effect size* sebesar $g = 0,36$ pada pemahaman konseptual dan kemampuan transfer pengetahuan. PapanNalar mengadopsi prinsip ini melalui mekanisme *Tebak Dulu* di setiap pembuka sesi dan pengenalan materi baru.

#### 3.2 Efektivitas Manipulatif Virtual (Alat Nalar)
Meta-analisis Moyer-Packenham & Westenskow (2013) membuktikan bahwa penggunaan manipulatif virtual interaktif memberikan pengaruh signifikan ($g = 0,35$) terhadap peningkatan hasil belajar matematika. PapanNalar menyediakan 6 instrumen Alat Nalar manipulatif 2D responsif:
1. **Garis Bilangan Lompat:** Visualisasi operasi bilangan bulat dengan vektor arah dan langkah kodok/panah;
2. **Batang Pecahan Setara:** Visualisasi pecahan senilai dan penjumlahan pecahan berpenyebut beda melalui pemotongan balok;
3. **Timbangan Persamaan:** Konsep ekuivalensi aljabar satu variabel di mana kedua lengan timbangan harus setimbang;
4. **Petak Perkalian Luas:** Model area untuk perkalian bilangan cacah dan ekspresi binomial;
5. **Tabel Rasio Dinamis:** Visualisasi perbandingan senilai dan berbalik nilai;
6. **Grafik Geser Fungsi:** Eksplorasi gradien garis dan pergeseran koordinat Cartesius.

#### 3.3 Penilaian Diagnostik Dua Tingkat (*Two-Tier Diagnostic*)
Seringkali siswa menebak jawaban secara kebetulan atau menghafal pola rumus tanpa memahami kaidah ilmiahnya (Treagust, 1988). Format diagnostik dua tingkat pada Kartu Keluar PapanNalar secara akurat membedakan tiga kondisi kognitif:
- *Paham Utuh:* Jawaban benar, alasan tepat;
- *Miskonsepsi:* Jawaban benar tetapi alasan salah, atau jawaban salah dengan alasan konsisten pada miskonsepsi tertentu (misalnya anggapan bahwa perkalian selalu menghasilkan bilangan yang lebih besar);
- *Tidak Tahu:* Siswa memilih tanda "?" atau jawaban salah dengan alasan acak.

---

### 4. ARSITEKTUR TEKNOLOGI DAN AI SAFETY BY DESIGN

PapanNalar dirancang dengan standar rekayasa perangkat lunak modern yang tangguh untuk kondisi riil sekolah-sekolah di Indonesia:

```
+-------------------------------------------------------------------------------+
|                             ARSITEKTUR PAPANNALAR                             |
+-------------------------------------------------------------------------------+
|                                                                               |
|   +-----------------------+                    +--------------------------+   |
|   |   PERANGKAT GURU      |                    |  LAYAR KELAS (IFP/TV)    |   |
|   |   (Smartphone Chrome) |                    |  (Browser Web Layar)     |   |
|   +-----------+-----------+                    +------------+-------------+   |
|               |                                             |                 |
|       (OMR Kamera Lokal)                                    |                 |
|       (Pindai Kartu Nalar)                     (Alat Nalar Manipulatif 2D)    |
|               |                                (Nomor Absen & Bentuk Kelompok)|
|               v                                             v                 |
|   +-----------------------------------------------------------------------+   |
|   |               CORE LOCAL ENGINE (Web Worker / Client)                 |   |
|   |  - OMR Scanner (Computer Vision canvas 100% luring)                   |   |
|   |  - Bayesian Knowledge Tracing (BKT) Engine (update probabilitas masteri)|
|   |  - Grouping & Station Rotation Matrix Scheduler                       |   |
|   +-----------------------------------+-----------------------------------+   |
|                                       |                                       |
|                                       | (Sinkronisasi Kode 6-Digit / HTTP)    |
|                                       v                                       |
|   +-----------------------------------------------------------------------+   |
|   |                  NEXT.JS FULL-STACK BACKEND GATEWAY                   |   |
|   |  - PostgreSQL RLS Schema (Multi-Tenant, Session Storage)              |   |
|   |  - Ephemeral Presentation Pairing (HMAC SHA-256 Code Exchange)         |   |
|   |  - Deterministic Math Template & AST Checker Engine                   |   |
|   +-----------------------------------+-----------------------------------+   |
|                                       |                                       |
|                          (Prompt Sanitized - Zero PII)                        |
|                                       v                                       |
|   +-----------------------------------------------------------------------+   |
|   |                 LLM ASSISTANT BOUNDARY (Bisik Guru)                   |   |
|   |  - Task 1: Kontekstualisasi Cerita Soal (Diverifikasi AST Keras)      |   |
|   |  - Task 2: Prompt Dialog Sokratik Guru (Dipandu Miskonsepsi D1-D5)     |   |
|   |  * Dilarang: Menghitung kunci jawaban, mengubah level, menyimpan nama |   |
|   +-----------------------------------------------------------------------+   |
+-------------------------------------------------------------------------------+
```

#### 4.1 Pemisahan Tegas Komputasi Deterministik vs Generatif AI
Untuk menjamin akurasi akademik 100% bebas dari halusinasi AI:
- **Kunci jawaban, pilihan pengecoh, penilaian level, dan probabilitas masteri BKT dihitung 100% oleh kode deterministik.** LLM dilarang keras membuat atau memutuskan kunci jawaban.
- **Peran LLM dibatasi ketat pada dua tugas kreatif:**
  1. *Kontekstualisasi cerita soal:* Menghasilkan narasi soal yang relevan dengan minat siswa berdasarkan parameter angka yang sudah dikunci oleh generator matematika.
  2. *Asisten Bisik Guru:* Menghasilkan rekomendasi pertanyaan pemantik berbasis katalog miskonsepsi resmi.
- Jika koneksi internet terputus atau API LLM mengalami kendala, aplikasi secara otomatis beralih ke templat kartu strategi statis (*fallback*) yang telah tersimpan di repositori lokal.

#### 4.2 Bayesian Knowledge Tracing (BKT) dan Tangga Nalar
Pelacakan penguasaan konsep menggunakan pemodelan BKT standar:
$$P(L_{t}) = P(L_{t-1} \mid \text{bukti}) + (1 - P(L_{t-1} \mid \text{bukti})) \cdot P(T)$$
di mana parameter probabilitas awal ($P(L_0)$), transisi belajar ($P(T)$), tebakan benar ($P(G) = 0,05$ karena adanya opsi "?"), dan kelalaian ($P(S) = 0,10$) dikalibrasi secara ketat. Pengelompokan berpijak pada **Tangga Nalar** yang memetakan 22 anak tangga hierarkis dari Fase A hingga E (BSKAP 046/H/KR/2025).

#### 4.3 Kepatuhan Privasi Anak (*UU PDP No. 27/2022*)
Sesuai amanat UU Perlindungan Data Pribadi Pasal 25 mengenai data pribadi anak:
- **Identitas nama siswa hanya tersimpan di memori lokal perangkat guru.**
- Server database hanya menerima identifikasi anonim berupa UUID acak dan nomor absen siswa (1–36).
- Layar Kelas publik di papan tidak pernah menampilkan nama lengkap, peringkat nilai, maupun skor individu.
- Goresan layar saat fase refleksi hanya berada di RAM peramban dan langsung dihapus saat sesi ditutup (*zero retention*).

---

### 5. DESAIN SISTEM DAN PENGALAMAN PENGGUNA (UI/UX)

Antarmuka PapanNalar mengusung filosofi desain *"Quiet Educational Craft"* yang tenang, fungsional, dan aksesibel:

1. **Tipografi Terkalibrasi untuk Ruang Kelas:**  
   Menggunakan font *Plus Jakarta Sans* untuk antarmuka guru dan *Atkinson Hyperlegible* (font yang dirancang khusus untuk keterbacaan tinggi dan aksesibilitas low-vision) pada Layar Kelas. Ukuran teks di Layar Kelas berukuran minimal 28–32px sehingga terbaca jelas oleh siswa yang duduk di bangku paling belakang pada jarak 7–9 meter.
2. **Target Sentuh Ergonomis Papan Digital (IFP):**  
   Tombol navigasi papan interaktif memiliki target sentuh minimum 88–96px, memperhitungkan akurasi jari anak-anak dan latensi sentuh panel inframerah.
3. **Palet Warna Aman dan Bermakna (Lolos Kontras WCAG AAA):**  
   Menggunakan palet warna ramah anak tanpa stimulasi visual berlebih (*anti-sensory overload*):
   - *Deep Teal* (`#0f766e` / `#115e59`): Nada wibawa dan fokus;
   - *Warm Amber* (`#d97706`): Nada interaksi positif;
   - *Soft Canvas Slate* (`#f8fafc`): Latar belakang yang tidak menyilaukan mata siswa saat menatap layar dalam durasi lama.
4. **Maskot Inklusif: Nala si Pesut Mahakam:**  
   Sosok karakter ramah yang bertindak sebagai teman belajar. Nala hadir di Stasiun Papan sebagai pihak yang "melakukan kesalahan perhitungan", sehingga siswa belajar mengoreksi logika matematika tanpa merasa terhakimi secara personal.

---

### 6. MODEL KEBERLANJUTAN DAN KELAYAKAN BISNIS

PapanNalar dirancang dengan struktur biaya operasional yang sangat efisien dan rencana adopsi yang realistis:

#### 6.1 Struktur Biaya Operasional Sangat Rendah (*Unit Economics*)
Berkat arsitektur *local-first*, beban komputasi server dan konsumsi token AI ditekan hingga titik minimal:
- **Biaya Token LLM:** Satu rombel (32 siswa) yang menjalankan 4 sesi per bulan hanya mengonsumsi rata-rata ~120.000 token per tahun (hanya untuk penyesuaian cerita dan Bisik Guru). Biaya model inferensi berkisar antara **Rp28.000 hingga Rp44.000 per rombel per tahun**.
- **Biaya Cetak/Fotokopi:** Kartu Nalar dicetak dalam format kertas hemat (1 lembar A4 untuk 4 kartu), dengan estimasi biaya fotokopi hanya ~Rp800 per kelas per sesi.

#### 6.2 Skema Monetisasi dan Paket Layanan
1. **Paket Guru Mandiri (Gratis Selamanya):**  
   Akses penuh ke Tangga Nalar Fase A–E, pemindai OMR luring tanpa batas, pembentukan kelompok otomatis, 6 Alat Nalar interaktif, dan kartu strategi statis.
2. **Paket Sekolah Pintar (B2G / B2B - Rp100.000 per rombel/tahun):**  
   Fitur AI Bisik Guru dinamis, analitik agregat kemajuan kompetensi kelas untuk Kepala Sekolah dan Pengawas, serta integrasi ekspor format Rapor Pendidikan.
3. **Pengadaan Dinas Pendidikan (Lisensi Daerah Berbasis BOS/BOP):**  
   Paket agregasi tingkat Kabupaten/Kota dengan dashboard pemantauan efektivitas literasi-numerasi lintas sekolah untuk intervensi kebijakan daerah.

#### 6.3 Analisis Komparasi Kompetitor

| Parameter | Plickers | Quizizz / Kahoot | Rumah Pendidikan (Pusdatin) | PapanNalar |
| :--- | :--- | :--- | :--- | :--- |
| **Kebutuhan Gawai Siswa** | Tidak (Kertas barcode) | Wajib HP/Laptop per siswa | Fleksibel / Mandiri | **Tidak Butuh HP (Kartu Nalar OMR)** |
| **Pemanfaatan Papan (IFP)** | Pasif (Hanya soal) | Pasif (Leaderboard) | Pasif (Bahan ajar) | **Aktif Sentuh (Alat Nalar Manipulatif)** |
| **Diferensiasi Pembelajaran** | Tidak ada pengelompokan | Satu kecepatan kuis serentak | Konten umum bertingkat | **Otomatis TaRL (3 Stasiun Rotasi)** |
| **Operasional Tanpa Internet** | Terbatas | Tidak bisa sama sekali | Butuh kuota internet | **100% Inti Berjalan Luring (Offline)** |
| **Diagnosis Miskonsepsi** | Pilihan ganda biasa | Skor benar/salah | Latihan soal biasa | **Dua Tingkat (Two-Tier Diagnostic)** |
| **Dukungan Asisten Guru** | Tidak ada | Tidak ada | Materi statis | **AI Bisik Dialog Sokratik Real-Time** |

---

### 7. DAMPAK DAN RENCANA VALIDASI EMPIRIS

#### 7.1 Indikator Keberhasilan yang Terukur
PapanNalar memegang teguh etika akademik: **tidak mengklaim peningkatan nilai yang belum diuji secara empiris**. Tolok ukur keberhasilan dievaluasi melalui matriks terverifikasi:
- **Tingkat Transisi Anak Tangga:** Persentase siswa yang berhasil naik minimal 1 anak tangga kompetensi setelah 4 minggu intervensi Sesi Tepat Level.
- **Rasio Paham Konseptual (Tingkat 2):** Penurunan persentase jawaban "Benar karena Tebak/Alasan Keliru" pada Kartu Keluar dua tingkat.
- **Efisiensi Waktu Guru:** Waktu persiapan sesi guru di bawah 5 menit dan waktu asesmen kelas di bawah 10 menit.
- **Akurasi OMR Luring:** Akurasi pembacaan kartu fisik mencapai target $\ge 99\%$ pada beragam kondisi pencahayaan kelas dan kualitas fotokopi.

#### 7.2 Rencana Protokol Uji Coba Lapangan (Pilot Project 4 Minggu)
Uji coba lapangan dijadwalkan pada minggu ke-3 dan ke-4 Oktober 2026 di 2 sekolah mitra (1 SMP Negeri dan 1 SD Negeri):
- *Persetujuan Etik:* Memperoleh izin resmi Kepala Sekolah dan lembar persetujuan (*informed consent*) orang tua siswa sesuai UU PDP Pasal 25.
- *Observasi Independen:* Tim hanya bertindak sebagai pengamat pasif; guru kelas memegang kendali penuh atas gawai dan alur pembelajaran.
- *Evaluasi Komparatif:* Membandingkan dinamika partisipasi siswa dan deteksi miskonsepsi antara kelas intervensi PapanNalar dengan kelas kontrol metode ceramah konvensional.

---

### 8. KESIMPULAN DAN DAFTAR PUSTAKA

PapanNalar menghadirkan terobosan nyata dalam mewujudkan visi *Smart Nation*: mengubah investasi ratusan ribu papan digital interaktif yang selama ini pasif menjadi pusat penalaran kognitif siswa dan memberdayakan guru dengan asisten cerdas untuk mengajar sesuai tingkat kemampuan anak (*Teaching at the Right Level*). Dengan arsitektur yang aman, deterministik, berbiaya sangat terjangkau, dan dapat berjalan penuh secara luring, PapanNalar siap menjadi katalisator lompatan numerasi dasar bagi jutaan anak Indonesia.

#### DAFTAR PUSTAKA

1. **Beatty, A., Berkhout, E., Bima, L., Pradhan, M., & Suryadarma, D. (2021).** *Schooling Progress, Learning Reversal: Indonesia's Learning Profiles between 2000 and 2014.* RISE Working Paper Series, 21/068. https://doi.org/10.35489/BSG-RISE-WP_2021/068
2. **BSKAP Kemendikdasmen. (2025).** *Keputusan Kepala Badan Standar, Kurikulum, dan Asesmen Pendidikan Nomor 046/H/KR/2025 tentang Capaian Pembelajaran pada Pendidikan Anak Usia Dini, Jenjang Pendidikan Dasar, dan Jenjang Pendidikan Menengah pada Kurikulum Merdeka.*
3. **Global Education Evidence Advisory Panel (GEEAP). (2023).** *Cost-Effective Approaches to Improve Global Learning: What Does Recent Evidence Tell Us Are "Smart Buys" for Improving Learning in Low- and Middle-Income Countries?* World Bank, FCDO, UNICEF.
4. **Kemendikdasmen. (2025).** *Laporan Resmi Hasil PISA 2025 Indonesia dan Rilis Rapor Pendidikan Nasional 2025.* Pusat Standar dan Kebijakan Pendidikan (PSKP), Jakarta.
5. **Moyer-Packenham, P. S., & Westenskow, A. (2013).** *Effects of Virtual Manipulatives on Student Achievement: A Meta-Analysis.* The Journal of Mathematical Behavior, 32(1), 35–59.
6. **Pritchett, L., & Beatty, A. (2012).** *The Negative Consequences of Overambitious Curricula in Developing Countries.* Center for Global Development Working Paper, 293.
7. **Seong, M., dkk. (2026).** *Evaluating LLM Robustness on Noisy Handwritten Student Work in Mathematics.* arXiv:2604.22774v1.
8. **Sinha, T., & Kapur, M. (2021).** *When Problem Solving Followed by Instruction Works: An Updated Meta-Analysis of Productive Failure.* Review of Educational Research, 91(5), 761–798.
9. **Treagust, D. F. (1988).** *Development and Evaluation of Two-Tier Diagnostic Instruments to Detect Students' Misconceptions in Science.* International Journal of Science Education, 10(2), 159–169.
10. **Undang-Undang Republik Indonesia Nomor 27 Tahun 2022.** *Tentang Perlindungan Data Pribadi (UU PDP).* Lembaran Negara Republik Indonesia Tahun 2022 Nomor 196.
11. **Wang, R. E., dkk. (2024).** *Tutor CoPilot: A Human-AI Collaborative System for Empowering Tutors with Real-Time Pedagogical Guidance.* Stanford University & Harvard Graduate School of Education.
