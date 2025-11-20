# ArtoMojo | Lacak Biaya Kendaraan

**ArtoMojo** (sebelumnya SamsatBudget) adalah aplikasi pelacak biaya kendaraan yang dirancang untuk membantu pengguna memantau dan menganalisis semua pengeluaran terkait perawatan kendaraan, seperti pajak, servis, hingga bahan bakar.

Aplikasi ini sepenuhnya berjalan **client-side**, menyimpan seluruh data (transaksi, kendaraan, kategori, anggaran, reminder, dan pencapaian) di **localStorage** tanpa memerlukan server atau database eksternal.

---

## ✨ Fitur Utama

### 🆕 Panduan Pengguna Interaktif (New!)
- **Real-time Tour Guide**: Fitur tutorial bawaan yang memandu pengguna baru mengenali fungsi aplikasi langkah demi langkah.
- **Smooth Tracking**: Menggunakan *custom engine* dengan `requestAnimationFrame` untuk highlight elemen yang halus tanpa lag.
- **Focus Ring**: Visualisasi fokus yang dinamis mengikuti posisi elemen di layar.

### Manajemen Biaya & Kendaraan
- **CRUD Transaksi**: Tambah, Edit, dan Hapus riwayat biaya.
- **Manajemen Kendaraan**: Tambah, Rename, dan Hapus kendaraan.
- **Tipe Kendaraan**: Dukungan Mobil/Motor untuk penyesuaian logika reminder otomatis.
- **Manajemen Kategori**: CRUD penuh kategori biaya.
- **Input Cepat (Modal)**: Tambah Kategori atau Kendaraan baru langsung dari form transaksi tanpa pindah halaman.

---

### Reminder Perawatan Cerdas
- **Reminder Manual**: Set tanggal jatuh tempo untuk pajak, ganti plat, ganti oli, dsb.
- **Reminder Otomatis**: Sistem menawarkan perpanjangan otomatis saat mencatat biaya relevan (misal: Ganti Oli → tawarkan reminder 3/6 bulan ke depan).
- **Riwayat Reminder**: Mencatat histori perpanjangan tanggal (dari tanggal berapa ke tanggal berapa).
- **Dashboard Reminder**: Menampilkan status `Urgent` (merah) dan `Warning` (kuning) berdasarkan sisa hari.

---

### Analisis & Visualisasi
- **Chart Kategori (Donat)** - Warna unik & konsisten berdasarkan nama kategori.
  - Interaktif: Klik irisan chart untuk memfilter tabel transaksi otomatis.
  
- **Chart Tren Harian (Garis)**
  - Dinamis mengikuti rentang tanggal filter.
  - Interaktif: Klik titik data untuk melihat transaksi pada tanggal spesifik tersebut.

- **Ringkasan Real-time**
  - Menampilkan Total Biaya, Rata-rata Harian, dan Kategori Teratas sesuai filter yang aktif.

---

### Filter & Validasi Cerdas
- **Filter Live**: Hasil muncul seketika tanpa tombol "Cari".
- **Validasi Tahun**: Input tanggal dibatasi tahun 2000 - 3000 untuk menjaga akurasi data.
- **Filter Multi-Layer**: Gabungkan filter teks, kendaraan, kategori, dan rentang waktu sekaligus.
- **Filter Preset**: Shortcut waktu (Hari ini, 7 hari, Bulan ini, 3 Bulan, 1 Tahun).

---

### Anggaran & Gamifikasi
- **Quick Add Widget**: Buat tombol shortcut untuk transaksi rutin (contoh: “Bensin 50rb”).
- **Anggaran Servis Bulanan**: Bar progres visual (Kuning > 70%, Merah > 90%).
- **Lencana (Badges)**:
  - “Bulan Hemat”: Jika pengeluaran di bawah anggaran.
  - “Rajin Merawat”: Berdasarkan jumlah frekuensi pencatatan.
  - Riwayat Lencana bulanan lengkap.

---

### Utilitas & Personalisasi
- **Backup & Restore JSON**: Pindahkan data antar perangkat dengan mudah.
- **Tema Gelap (Dark Mode)**: Otomatis menyesuaikan kenyamanan mata.
- **Reset Data Aman**: Konfirmasi ganda sebelum menghapus seluruh data.
- **Responsive Layout**: Tampilan optimal di HP (Mobile First) maupun Desktop.

---

## 💻 Teknologi yang Digunakan
- **HTML5 & CSS3** (Custom Properties / CSS Variables)
- **Bootstrap 5.3** (Framework UI)
- **JavaScript (ES6+) & jQuery 3.6** (Logika Aplikasi)
- **Chart.js** (Visualisasi Data)
- **Font Awesome 6.5** (Ikon)

---

## ▶ Cara Menjalankan
1. Buka folder proyek.
2. Jalankan `index.html` di browser (Chrome/Edge/Firefox).
3. **Tanpa Install**: Aplikasi berjalan langsung di browser tanpa perlu setup server (Node/PHP/Python tidak diperlukan).

---

## 📚 Lisensi & Atribusi
- Bootstrap | MIT  
- jQuery | MIT  
- Chart.js | MIT  

Dikembangkan oleh **M. Alfin Dwi Prayetno** dan **Arina Karimatilail** untuk **FESTIKA JATIM 2025** | SMK Negeri 1 Dlanggu, Kab Mojokerto