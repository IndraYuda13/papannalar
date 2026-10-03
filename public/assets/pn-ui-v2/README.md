# Aset PapanNalar yang dirapikan dengan Blender

Tiga file GLB adalah geometry 3D nyata, bukan gambar yang diberi nama .glb.
Geometri dari kit dipertahankan sebagai dasar desain dan salinan asli disimpan
di `design/pn-ui-v2/originals/`. Blender 4.3.2 merapikan tepi, normals, bola,
material matte dan warna sRGB yang dikonversi ke linear untuk glTF.
Pada koreksi UX 3 Oktober, algebra-kit dibangun ulang sebagai baki miring dengan
ubin x², batang x dan ubin satuan; semua label merupakan mesh buatan sendiri.
Model learning-board dan balance-scale dipertahankan byte-identical.
Tidak memakai texture/image/font eksternal. Poster WebP transparan berasal dari
render Cycles CPU model yang sama, dengan pencahayaan studio dan contact shadow.

| Model          | Peran                                                 | Bukan untuk                                     |
| -------------- | ----------------------------------------------------- | ----------------------------------------------- |
| learning-board | Ilustrasi papan dan tangga belajar pada login/beranda | Papan jawaban atau representasi skor siswa      |
| balance-scale  | Thumbnail/preview pengantar Timbangan Persamaan       | Menghitung keseimbangan atau mendeteksi jawaban |
| algebra-kit    | Thumbnail/pengantar kumpulan contoh aljabar           | Mengganti solver atau model ubin kuantitatif    |

Orientation Y-up, depan +Z. Tidak rigged dan tidak mempunyai embedded animation.
Node terpisah diberi nama, tetapi mekanisme matematikanya tidak dikodekan pada GLB.
Komponen UI memberi respons pointer kecil; tidak ada orbit/animasi terus-menerus.

3D otomatis dimuat ketika scene terlihat dan preferences perangkat mengizinkan.
Jangan load asset ini pada worker scanner atau mengunduh semua scene saat login.
Satu canvas aktif maksimum; poster untuk kartu daftar. Pause/render on demand.
Fallback harus mempunyai dimensi/aspect ratio sama untuk mencegah layout shift.

Manifest mencatat hash, size dan triangle count. Ukuran library renderer terpisah
dari ukuran GLB; GLB kecil tidak berarti WebGL gratis. CPU preview/parse dilakukan
lokal; tes browser terarah memeriksa tiga GLB nyata, lazy loading, save-data,
tampilan ringan dan fallback. Perangkat fisik tetap belum diuji.

Sumber desain yang dapat diedit ada pada `design/pn-ui-v2/{learning-board,
balance-scale,algebra-kit}.blend`. Camera, lampu dan shadow catcher hanya ada dalam
file desain/poster, tidak diekspor ke GLB aplikasi. Reproduksi dari root repo:

```bash
blender --background --factory-startup --python-exit-code 1 --python scripts/refine-ui-assets.py
python3 scripts/encode-ui-posters.py

# Regenerasi hanya ubin aljabar, mempertahankan dua model/poster lainnya:
blender --background --factory-startup --python-exit-code 1 --python scripts/refine-ui-assets.py -- algebra-kit
python3 scripts/encode-ui-posters.py algebra-kit
```

Authoring memerlukan Blender 4.3.2 dan Pillow; menjalankan/build aplikasi tidak
memerlukan keduanya. Render 720×540, 96 samples, CPU; tidak bergantung GPU atau
OpenImageDenoise. Provenance pada `design/pn-ui-v2/blender-provenance.json` dan
manifest memuat hash sumber asli/hasil, jumlah triangle, ukuran dan lisensi.

Izin geometry/poster: CC0-1.0 (lihat LICENSE.txt). Generator di scripts merupakan
alat pembuat aset offline, bukan layanan Python tambahan untuk aplikasi.
