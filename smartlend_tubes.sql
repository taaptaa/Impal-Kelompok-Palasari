-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Oct 21, 2026 at 01:20 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `smartlend_tubes`
--

-- --------------------------------------------------------

--
-- Table structure for table `barang`
--

CREATE TABLE `barang` (
  `id_barang` int(11) NOT NULL,
  `kode_barang` varchar(20) NOT NULL,
  `nama_barang` varchar(80) NOT NULL,
  `jenis` varchar(15) NOT NULL,
  `satuan` varchar(20) NOT NULL,
  `stok_total` int(11) NOT NULL CHECK (`stok_total` >= 0)
) ;

--
-- Dumping data for table `barang`
--

INSERT INTO `barang` (`id_barang`, `kode_barang`, `nama_barang`, `jenis`, `satuan`, `stok_total`) VALUES
(1, 'BRG-01', 'Mikrofon', 'portabel', 'unit', 10),
(2, 'BRG-02', 'Speaker', 'portabel', 'unit', 5),
(3, 'BRG-03', 'Proyektor portabel', 'portabel', 'unit', 4),
(4, 'BRG-04', 'Proyektor terpasang', 'tetap', 'unit', 3),
(5, 'BRG-05', 'Layar proyeksi tetap', 'tetap', 'unit', 2);

-- --------------------------------------------------------

--
-- Table structure for table `detail_barang`
--

CREATE TABLE `detail_barang` (
  `id_peminjaman` int(11) NOT NULL,
  `id_barang` int(11) NOT NULL,
  `jumlah` int(11) NOT NULL CHECK (`jumlah` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `detail_barang`
--

INSERT INTO `detail_barang` (`id_peminjaman`, `id_barang`, `jumlah`) VALUES
(1, 1, 2),
(2, 2, 1),
(3, 1, 3),
(4, 3, 1),
(5, 2, 2);

-- --------------------------------------------------------

--
-- Table structure for table `detail_ruangan`
--

CREATE TABLE `detail_ruangan` (
  `id_peminjaman` int(11) NOT NULL,
  `id_ruangan` int(11) NOT NULL,
  `jumlah_peserta` int(11) NOT NULL CHECK (`jumlah_peserta` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `detail_ruangan`
--

INSERT INTO `detail_ruangan` (`id_peminjaman`, `id_ruangan`, `jumlah_peserta`) VALUES
(1, 1, 20),
(2, 2, 35),
(3, 3, 45),
(4, 4, 20),
(5, 5, 50);

-- --------------------------------------------------------

--
-- Table structure for table `fasilitas_ruangan`
--

CREATE TABLE `fasilitas_ruangan` (
  `id_ruangan` int(11) NOT NULL,
  `id_barang` int(11) NOT NULL,
  `jumlah` int(11) NOT NULL CHECK (`jumlah` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `fasilitas_ruangan`
--

INSERT INTO `fasilitas_ruangan` (`id_ruangan`, `id_barang`, `jumlah`) VALUES
(1, 4, 1),
(2, 4, 1),
(3, 4, 1),
(4, 5, 1),
(5, 5, 1);

-- --------------------------------------------------------

--
-- Table structure for table `peminjaman`
--

CREATE TABLE `peminjaman` (
  `id_peminjaman` int(11) NOT NULL,
  `kode_peminjaman` varchar(25) NOT NULL,
  `id_peminjam` int(11) NOT NULL,
  `id_admin` int(11) DEFAULT NULL,
  `waktu_mulai` datetime NOT NULL,
  `waktu_selesai` datetime NOT NULL,
  `keperluan` varchar(150) NOT NULL,
  `status` varchar(15) NOT NULL
) ;

--
-- Dumping data for table `peminjaman`
--

INSERT INTO `peminjaman` (`id_peminjaman`, `kode_peminjaman`, `id_peminjam`, `id_admin`, `waktu_mulai`, `waktu_selesai`, `keperluan`, `status`) VALUES
(1, 'PJM-001', 1, 4, '2026-10-11 09:00:00', '2026-10-11 11:00:00', 'Presentasi kelompok', 'selesai'),
(2, 'PJM-002', 2, 4, '2026-10-12 09:00:00', '2026-10-12 11:00:00', 'Rapat organisasi', 'selesai'),
(3, 'PJM-003', 3, 4, '2026-10-13 09:00:00', '2026-10-13 11:00:00', 'Seminar kelas', 'selesai'),
(4, 'PJM-004', 1, 4, '2026-10-14 09:00:00', '2026-10-14 11:00:00', 'Diskusi tugas', 'selesai'),
(5, 'PJM-005', 2, 4, '2026-10-15 09:00:00', '2026-10-15 11:00:00', 'Pelatihan mahasiswa', 'selesai');

-- --------------------------------------------------------

--
-- Table structure for table `pengembalian`
--

CREATE TABLE `pengembalian` (
  `id_pengembalian` int(11) NOT NULL,
  `id_peminjaman` int(11) NOT NULL,
  `id_petugas` int(11) NOT NULL,
  `waktu_kembali` datetime NOT NULL,
  `kondisi_akhir` varchar(15) NOT NULL,
  `catatan` varchar(200) NOT NULL
) ;

--
-- Dumping data for table `pengembalian`
--

INSERT INTO `pengembalian` (`id_pengembalian`, `id_peminjaman`, `id_petugas`, `waktu_kembali`, `kondisi_akhir`, `catatan`) VALUES
(1, 1, 5, '2026-10-11 11:00:00', 'baik', 'Barang lengkap; ruangan dan fasilitas baik.'),
(2, 2, 5, '2026-10-12 11:00:00', 'baik', 'Barang lengkap; ruangan dan fasilitas baik.'),
(3, 3, 5, '2026-10-13 11:00:00', 'baik', 'Barang lengkap; ruangan dan fasilitas baik.'),
(4, 4, 5, '2026-10-14 11:00:00', 'baik', 'Barang lengkap; ruangan dan fasilitas baik.'),
(5, 5, 5, '2026-10-15 11:00:00', 'baik', 'Barang lengkap; ruangan dan fasilitas baik.');

-- --------------------------------------------------------

--
-- Table structure for table `pengguna`
--

CREATE TABLE `pengguna` (
  `id_pengguna` int(11) NOT NULL,
  `nama` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `peran` varchar(15) NOT NULL
) ;

--
-- Dumping data for table `pengguna`
--

INSERT INTO `pengguna` (`id_pengguna`, `nama`, `email`, `password_hash`, `peran`) VALUES
(1, 'Andi Pratama', 'andi@example.com', 'HASH_DEMO_GANTI_SEBELUM_LOGIN', 'mahasiswa'),
(2, 'Bunga Lestari', 'bunga@example.com', 'HASH_DEMO_GANTI_SEBELUM_LOGIN', 'mahasiswa'),
(3, 'Citra Dewi', 'citra@example.com', 'HASH_DEMO_GANTI_SEBELUM_LOGIN', 'mahasiswa'),
(4, 'Dimas Saputra', 'dimas@example.com', 'HASH_DEMO_GANTI_SEBELUM_LOGIN', 'admin'),
(5, 'Eka Putra', 'eka@example.com', 'HASH_DEMO_GANTI_SEBELUM_LOGIN', 'petugas');

-- --------------------------------------------------------

--
-- Table structure for table `rekomendasi_ai`
--

CREATE TABLE `rekomendasi_ai` (
  `id_rekomendasi` int(11) NOT NULL,
  `id_pengguna` int(11) NOT NULL,
  `kebutuhan` varchar(200) NOT NULL,
  `id_ruangan` int(11) DEFAULT NULL,
  `id_barang` int(11) DEFAULT NULL,
  `alasan` varchar(250) NOT NULL,
  `dibuat_pada` datetime NOT NULL
) ;

--
-- Dumping data for table `rekomendasi_ai`
--

INSERT INTO `rekomendasi_ai` (`id_rekomendasi`, `id_pengguna`, `kebutuhan`, `id_ruangan`, `id_barang`, `alasan`, `dibuat_pada`) VALUES
(1, 1, 'Presentasi 20 peserta', 1, 1, 'Kapasitas cukup dan tersedia proyektor tetap.', '2026-10-10 08:00:00'),
(2, 2, 'Rapat 35 peserta', 2, 2, 'Kelas B cukup untuk 35 orang; speaker membantu audio.', '2026-10-10 08:10:00'),
(3, 3, 'Seminar 45 peserta', 3, 1, 'Kelas C cukup luas dan memiliki proyektor tetap.', '2026-10-10 08:20:00'),
(4, 1, 'Diskusi dengan tayangan untuk 20 orang', 4, 3, 'Kelas D punya layar; tambahkan proyektor portabel.', '2026-10-10 08:30:00'),
(5, 2, 'Pelatihan 50 peserta', 5, 2, 'Kelas E berkapasitas 60; speaker mendukung pelatihan.', '2026-10-10 08:40:00');

-- --------------------------------------------------------

--
-- Table structure for table `ruangan`
--

CREATE TABLE `ruangan` (
  `id_ruangan` int(11) NOT NULL,
  `kode_ruangan` varchar(20) NOT NULL,
  `nama_ruangan` varchar(80) NOT NULL,
  `kapasitas` int(11) NOT NULL CHECK (`kapasitas` > 0),
  `lokasi` varchar(100) NOT NULL,
  `status_operasional` varchar(15) NOT NULL
) ;

--
-- Dumping data for table `ruangan`
--

INSERT INTO `ruangan` (`id_ruangan`, `kode_ruangan`, `nama_ruangan`, `kapasitas`, `lokasi`, `status_operasional`) VALUES
(1, 'KLS-01', 'Kelas A', 30, 'Gedung A lantai 1', 'aktif'),
(2, 'KLS-02', 'Kelas B', 40, 'Gedung A lantai 1', 'aktif'),
(3, 'KLS-03', 'Kelas C', 50, 'Gedung A lantai 1', 'aktif'),
(4, 'KLS-04', 'Kelas D', 25, 'Gedung A lantai 2', 'aktif'),
(5, 'KLS-05', 'Kelas E', 60, 'Gedung A lantai 2', 'aktif');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `barang`
--
ALTER TABLE `barang`
  ADD PRIMARY KEY (`id_barang`),
  ADD UNIQUE KEY `kode_barang` (`kode_barang`);

--
-- Indexes for table `detail_barang`
--
ALTER TABLE `detail_barang`
  ADD PRIMARY KEY (`id_peminjaman`,`id_barang`),
  ADD KEY `id_barang` (`id_barang`);

--
-- Indexes for table `detail_ruangan`
--
ALTER TABLE `detail_ruangan`
  ADD PRIMARY KEY (`id_peminjaman`),
  ADD KEY `id_ruangan` (`id_ruangan`);

--
-- Indexes for table `fasilitas_ruangan`
--
ALTER TABLE `fasilitas_ruangan`
  ADD PRIMARY KEY (`id_ruangan`,`id_barang`),
  ADD KEY `id_barang` (`id_barang`);

--
-- Indexes for table `peminjaman`
--
ALTER TABLE `peminjaman`
  ADD PRIMARY KEY (`id_peminjaman`),
  ADD UNIQUE KEY `kode_peminjaman` (`kode_peminjaman`),
  ADD KEY `id_peminjam` (`id_peminjam`),
  ADD KEY `id_admin` (`id_admin`);

--
-- Indexes for table `pengembalian`
--
ALTER TABLE `pengembalian`
  ADD PRIMARY KEY (`id_pengembalian`),
  ADD UNIQUE KEY `id_peminjaman` (`id_peminjaman`),
  ADD KEY `id_petugas` (`id_petugas`);

--
-- Indexes for table `pengguna`
--
ALTER TABLE `pengguna`
  ADD PRIMARY KEY (`id_pengguna`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `rekomendasi_ai`
--
ALTER TABLE `rekomendasi_ai`
  ADD PRIMARY KEY (`id_rekomendasi`),
  ADD KEY `id_pengguna` (`id_pengguna`),
  ADD KEY `id_ruangan` (`id_ruangan`),
  ADD KEY `id_barang` (`id_barang`);

--
-- Indexes for table `ruangan`
--
ALTER TABLE `ruangan`
  ADD PRIMARY KEY (`id_ruangan`),
  ADD UNIQUE KEY `kode_ruangan` (`kode_ruangan`);

--
-- Constraints for dumped tables
--

--
-- Constraints for table `detail_barang`
--
ALTER TABLE `detail_barang`
  ADD CONSTRAINT `detail_barang_ibfk_1` FOREIGN KEY (`id_peminjaman`) REFERENCES `peminjaman` (`id_peminjaman`),
  ADD CONSTRAINT `detail_barang_ibfk_2` FOREIGN KEY (`id_barang`) REFERENCES `barang` (`id_barang`);

--
-- Constraints for table `detail_ruangan`
--
ALTER TABLE `detail_ruangan`
  ADD CONSTRAINT `detail_ruangan_ibfk_1` FOREIGN KEY (`id_peminjaman`) REFERENCES `peminjaman` (`id_peminjaman`),
  ADD CONSTRAINT `detail_ruangan_ibfk_2` FOREIGN KEY (`id_ruangan`) REFERENCES `ruangan` (`id_ruangan`);

--
-- Constraints for table `fasilitas_ruangan`
--
ALTER TABLE `fasilitas_ruangan`
  ADD CONSTRAINT `fasilitas_ruangan_ibfk_1` FOREIGN KEY (`id_ruangan`) REFERENCES `ruangan` (`id_ruangan`),
  ADD CONSTRAINT `fasilitas_ruangan_ibfk_2` FOREIGN KEY (`id_barang`) REFERENCES `barang` (`id_barang`);

--
-- Constraints for table `peminjaman`
--
ALTER TABLE `peminjaman`
  ADD CONSTRAINT `peminjaman_ibfk_1` FOREIGN KEY (`id_peminjam`) REFERENCES `pengguna` (`id_pengguna`),
  ADD CONSTRAINT `peminjaman_ibfk_2` FOREIGN KEY (`id_admin`) REFERENCES `pengguna` (`id_pengguna`);

--
-- Constraints for table `pengembalian`
--
ALTER TABLE `pengembalian`
  ADD CONSTRAINT `pengembalian_ibfk_1` FOREIGN KEY (`id_peminjaman`) REFERENCES `peminjaman` (`id_peminjaman`),
  ADD CONSTRAINT `pengembalian_ibfk_2` FOREIGN KEY (`id_petugas`) REFERENCES `pengguna` (`id_pengguna`);

--
-- Constraints for table `rekomendasi_ai`
--
ALTER TABLE `rekomendasi_ai`
  ADD CONSTRAINT `rekomendasi_ai_ibfk_1` FOREIGN KEY (`id_pengguna`) REFERENCES `pengguna` (`id_pengguna`),
  ADD CONSTRAINT `rekomendasi_ai_ibfk_2` FOREIGN KEY (`id_ruangan`) REFERENCES `ruangan` (`id_ruangan`),
  ADD CONSTRAINT `rekomendasi_ai_ibfk_3` FOREIGN KEY (`id_barang`) REFERENCES `barang` (`id_barang`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
