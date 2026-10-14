from pathlib import Path
from xml.sax.saxutils import escape
import textwrap,json
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate,Paragraph,Spacer,PageBreak,Image,Preformatted,Table,TableStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from PIL import Image as PILImage
R=Path(__file__).resolve().parents[1]; O=R; S=R/'source/src/app'
for name,file in [('Body','DejaVuSans.ttf'),('Bold','DejaVuSans-Bold.ttf'),('Mono','DejaVuSansMono.ttf')]:pdfmetrics.registerFont(TTFont(name,'/usr/share/fonts/truetype/dejavu/'+file))
styles=getSampleStyleSheet()
styles.add(ParagraphStyle(name='Txt',fontName='Body',fontSize=10,leading=15,spaceAfter=10,textColor=colors.HexColor('#334155')))
styles.add(ParagraphStyle(name='Head',fontName='Bold',fontSize=21,leading=27,spaceAfter=16,textColor=colors.HexColor('#9A1823')))
styles.add(ParagraphStyle(name='Sub',fontName='Bold',fontSize=12,leading=17,spaceAfter=9,textColor=colors.HexColor('#0F172A')))
styles.add(ParagraphStyle(name='Small2',fontName='Body',fontSize=8,leading=12,spaceAfter=8,textColor=colors.HexColor('#64748B')))
styles.add(ParagraphStyle(name='Code2',fontName='Mono',fontSize=7.2,leading=10,spaceAfter=10,textColor=colors.HexColor('#182639'),backColor=colors.HexColor('#F1F5F9'),borderPadding=8))
story=[]
def p(t,style='Txt'):story.append(Paragraph(t,styles[style]))
def head(t):p(t,'Head')
def sub(t):p(t,'Sub')
def page():story.append(PageBreak())
def pic(name,w=490,maxh=465):
 f=O/'screenshots'/name;im=PILImage.open(f); h=w*im.height/im.width
 if h>maxh:w=w*maxh/h;h=maxh
 story.append(Image(str(f),width=w,height=h));story.append(Spacer(1,10))
def excerpt(file,start,end):
 lines=(S/file).read_text().splitlines();return '\n'.join(f'{i:>3}  {lines[i-1]}' for i in range(start,end+1))
def code(text):
 lines=[]
 for line in text.splitlines():lines.extend(textwrap.wrap(line,100,replace_whitespace=False,drop_whitespace=False,subsequent_indent='     ') or [''])
 story.append(Preformatted('\n'.join(lines),styles['Code2']))
def table(rows,widths):
 data=[[Paragraph(escape(str(v)),styles['Small2']) for v in row] for row in rows]
 t=Table(data,colWidths=widths,hAlign='LEFT');t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#FEE2E5')),('VALIGN',(0,0),(-1,-1),'TOP'),('LINEBELOW',(0,0),(-1,-1),.4,colors.HexColor('#E2E8F0')),('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),5)]));story.append(t);story.append(Spacer(1,12))
head('SmartLend')
p('TUGAS WEEK #4 · IMPLEMENTASI IMK','Sub')
p('Sistem Peminjaman Barang Inventaris Kampus<br/>Implementasi website dengan bantuan AI')
story.append(Spacer(1,15))
table([['Identitas','Keterangan'],['Penyusun','Arfan Ramiro Mahzar'],['NIM / Kelas','103012400182 / IF-48-12'],['Kelompok','SmartLend - anggota lainnya perlu dilengkapi'],['Tanggal dokumentasi','12 Oktober 2026']],[130,365])
sub('1. Tujuan dan ruang lingkup')
p('Mengimplementasikan tiga antarmuka SmartLend: Login Mahasiswa, Katalog Barang, dan Form Pengajuan Peminjaman. Form pengajuan ditampilkan sebagai modal, yaitu satu antarmuka interaktif di atas halaman katalog.')
sub('2. Pemanfaatan AI')
p('Sumber implementasi adalah ZIP ekspor Figma Make yang diberikan pengguna. Figma Make menghasilkan proyek React/TypeScript. ChatGPT/Codex membantu meninjau kode, menghubungkan pengajuan dari katalog ke state aplikasi, memperbaiki tampilan modal, menjalankan build dan pengujian browser, serta menyusun laporan. Kode ekspor menjadi acuan; desain asli pada tautan Figma tidak dapat diperiksa langsung karena keterbatasan akses.')
sub('3. Teknologi')
p('React 18.3.1, TypeScript/TSX, Vite 6.3.5, Tailwind CSS 4.1.12, Lucide React, dan Sonner. Data berasal dari mockData.ts dan state React; belum ada backend atau database.')
p('Desain: <link href="https://www.figma.com/make/myW28RLuyQZMbBMsZzaDND/SmartLend-Inventory-Loan-System-Website" color="#9A1823">SmartLend Inventory Loan System Website - Figma Make</link>','Small2')
p('Catatan sebelum pengumpulan: periksa identitas dan lengkapi seluruh anggota kelompok.','Small2')
page();head('01 / Login Mahasiswa');pic('01-login.png')
p('Gambar 1. Screenshot eksekusi halaman login pada tahap password, setelah memasukkan username Arfan.','Small2')
sub('Fungsi dan interaksi')
p('Pengguna memilih peran Mahasiswa, memasukkan username, lalu melanjutkan ke tahap password. Indikator dua langkah menunjukkan posisi pengguna. Tombol Kembali mendukung pembatalan atau perubahan username.')
p('Username dan password wajib diisi. Pada versi demo, nilai bebas yang tidak kosong dapat digunakan. Tombol Masuk membentuk objek pengguna lalu menampilkan aplikasi utama; belum ada pemeriksaan kredensial ke server.')
p('File aktif: src/app/screens/LoginScreen.tsx. Komponen bernama serupa dalam folder components bukan halaman login yang dipanggil App.tsx.','Small2')
page();head('01 / Kode utama login')
p('Cuplikan asli dari LoginScreen.tsx. Nomor di kiri adalah nomor baris file; seluruh source tersedia dalam paket kode.','Small2')
code(excerpt('screens/LoginScreen.tsx',50,80))
p('Cabang admin dan logistik tidak ditampilkan pada cuplikan ini. Akhir handler login:', 'Small2')
code(excerpt('screens/LoginScreen.tsx',97,101))
p('handleUsernameSubmit memindahkan langkah setelah validasi. handlePasswordSubmit membuat pengguna demo sesuai peran dan meneruskan objeknya melalui onLogin.','Small2')
sub('Elemen input password')
code(excerpt('screens/LoginScreen.tsx',273,283))
page();head('02 / Katalog Barang');pic('02-katalog.png')
p('Gambar 2. Screenshot katalog berisi enam barang contoh beserta kategori, stok, status, dan tombol Detail.','Small2')
sub('Fungsi dan interaksi')
p('Pencarian menyaring nama, deskripsi, atau kategori tanpa membedakan huruf besar dan kecil. Jumlah hasil berubah mengikuti kata kunci. Tombol Detail membuka informasi barang dan akses ke formulir pengajuan.')
p('Prinsip IMK: kolom tabel konsisten, status menggunakan teks dan warna, stok tersedia ditampilkan langsung, serta tombol reset pencarian tersedia ketika kata kunci diisi.')
p('Data berasal dari state items pada MainApp, diteruskan ke CatalogScreen. Foto barang pada data demo menggunakan URL eksternal; sebagian gambar tidak termuat dalam lingkungan pengujian.','Small2')
page();head('02 / Kode utama katalog')
p('Cuplikan CatalogScreen.tsx setelah perbaikan integrasi.','Small2')
code(excerpt('screens/CatalogScreen.tsx',8,25))
sub('Input pencarian')
# Select exact relevant JSX region by content
lines=(S/'screens/CatalogScreen.tsx').read_text().splitlines()
i=next(i for i,l in enumerate(lines) if 'value={searchQuery}' in l)
code(excerpt('screens/CatalogScreen.tsx',i,i+6))
sub('Meneruskan aksi pengajuan dari modal')
i=next(i for i,l in enumerate(lines) if 'item={selectedItem}' in l)
code(excerpt('screens/CatalogScreen.tsx',i,i+5))
p('onSubmitLoan sebelumnya tidak diteruskan dari katalog. Setelah diperbaiki, modal memanggil handler milik MainApp sehingga pengajuan dapat masuk ke riwayat pada sesi yang sama.','Small2')
page();head('03 / Form Peminjaman');pic('03-peminjaman.png',w=370,maxh=480)
p('Gambar 3. Screenshot area modal pada aplikasi yang berjalan. Contoh pengajuan: satu Proyektor LCD, 20-21 Oktober 2026.','Small2')
p('Input mencakup jumlah barang, tanggal pinjam, tanggal kembali, dan keperluan. Sistem menolak field kosong, tanggal kembali yang tidak setelah tanggal pinjam, serta jumlah yang melebihi stok. Setelah berhasil, modal ditutup dan notifikasi ditampilkan.')
page();head('03 / Kode validasi pengajuan')
p('Cuplikan ItemDetailModal.tsx, fungsi handleSubmitLoan.','Small2')
code(excerpt('components/ItemDetailModal.tsx',65,95))
sub('State formulir')
code(excerpt('components/ItemDetailModal.tsx',14,18))
p('onSubmitLoan menerima itemId, borrowDate, returnDate, quantity, dan reason. Form ini mengirim data ke komponen induk; tidak melakukan permintaan HTTP atau penyimpanan database.','Small2')
page();head('Integrasi data peminjaman')
p('MainApp.tsx mengelola state bersama. Pengajuan baru diberi status pending, lalu ditambahkan ke daftar loanRequests.','Txt')
code(excerpt('screens/MainApp.tsx',87,109))
sub('Pemanggilan katalog')
code(excerpt('screens/MainApp.tsx',137,139))
p('Perbaikan lain pada modal: kelas Tailwind bg-black/50 membuat latar transparan; z-[60] menempatkan modal di atas navigasi; judul putih memperjelas kontras dengan header merah.','Small2')
page();head('Hasil pengujian')
p('Build produksi berhasil dengan npm run build. Pengujian interaksi dilakukan menggunakan Chromium Headless melalui Playwright, pada viewport 1440 × 1000 piksel. Screenshot di laporan berasal dari eksekusi build aplikasi.','Txt')
checks=json.loads((O/'test-results.json').read_text())['checks']
table([['Skenario yang diuji','Hasil']]+[[c,'Lulus'] for c in checks],[415,80])
p('Pengujian ini mencakup alur tiga antarmuka yang dilaporkan. Build Vite bukan pemeriksaan tipe TypeScript penuh. Semua alur admin, logistik, serta seluruh perangkat/resolusi belum diuji.','Small2')
p('Batasan prototipe: autentikasi simulasi; data sesi hilang saat refresh; riwayat masih menampilkan data contoh semua pengguna; foto barang eksternal dapat gagal dimuat. Implementasi ini menunjukkan interaksi IMK, belum merupakan sistem produksi.','Txt')
page();head('Bukti dan cara menjalankan');pic('04-riwayat.png',w=490,maxh=350)
p('Gambar 4. Bukti tambahan: pengajuan baru LR008 muncul pada Riwayat dengan status Pending.','Small2')
sub('Menjalankan di laptop')
p('Ekstrak paket, buka terminal di folder source, lalu jalankan:')
code('npm ci\nnpm run dev')
p('Buka alamat localhost yang ditampilkan terminal. Pilih Mahasiswa, masukkan username dan password demo. Buka Katalog, cari Proyektor, pilih Detail, lalu Ajukan Peminjaman. Setelah dikirim, buka Riwayat.')
p('Untuk memverifikasi build: npm run build. Source lengkap ada di folder source; screenshot asli ada di screenshots. File PANDUAN.md menjelaskan langkah uji dan penyusunan berkas pengumpulan. Laporan ini belum diunggah ke LMS atau GitHub.','Small2')
def footer(c,d):
 c.setStrokeColor(colors.HexColor('#E2E8F0'));c.line(50,42,545,42);c.setFont('Body',8);c.setFillColor(colors.HexColor('#64748B'));c.drawString(50,28,'SMARTLEND  /  IMPLEMENTASI IMK  /  WEEK 04');c.drawRightString(545,28,str(d.page))
SimpleDocTemplate(str(O/'SmartLend_Laporan_IMK_Week4.pdf'),pagesize=(595.28,841.89),rightMargin=50,leftMargin=50,topMargin=42,bottomMargin=58,title='SmartLend - Implementasi IMK Week 4',author='Arfan Ramiro Mahzar').build(story,onFirstPage=footer,onLaterPages=footer)
print('PDF created')
