import { User } from '../types';
import { LogOut, HelpCircle, Mail, Phone, MapPin, BookOpen, Shield, Info, ChevronRight, X, CheckCircle } from 'lucide-react';
import { useState } from 'react';

interface ProfileScreenProps {
  user: User;
  onLogout: () => void;
}

// Define help content data
const helpContentData = {
  'Cara Meminjam Barang': {
    icon: HelpCircle,
    content: [
      { step: 1, title: 'Buka Katalog Barang', desc: 'Lihat daftar barang yang tersedia untuk dipinjam' },
      { step: 2, title: 'Pilih Barang', desc: 'Klik barang yang ingin dipinjam dan tentukan tanggal' },
      { step: 3, title: 'Ajukan Peminjaman', desc: 'Isi form peminjaman dan tunggu persetujuan admin' },
      { step: 4, title: 'Ambil Barang', desc: 'Scan QR code saat pengambilan barang di lokasi' },
      { step: 5, title: 'Kembalikan Tepat Waktu', desc: 'Scan QR code saat pengembalian sesuai jadwal' }
    ]
  },
  'Syarat & Ketentuan': {
    icon: BookOpen,
    content: [
      { title: 'Persyaratan Peminjam', desc: 'Mahasiswa/staff aktif Telkom University dengan KTM/ID Card valid' },
      { title: 'Durasi Peminjaman', desc: 'Maksimal 7 hari, dapat diperpanjang dengan persetujuan admin' },
      { title: 'Tanggung Jawab', desc: 'Peminjam bertanggung jawab penuh atas kerusakan atau kehilangan barang' },
      { title: 'Keterlambatan', desc: 'Denda Rp 10.000/hari untuk keterlambatan pengembalian' },
      { title: 'Sanksi', desc: 'Pelanggaran berulang dapat mengakibatkan pemblokiran akses' }
    ]
  },
  'Kebijakan Privasi': {
    icon: Shield,
    content: [
      { title: 'Data yang Dikumpulkan', desc: 'Nama, NIM/ID, email SSO, nomor telepon, dan riwayat peminjaman' },
      { title: 'Penggunaan Data', desc: 'Hanya untuk keperluan manajemen peminjaman inventaris kampus' },
      { title: 'Keamanan Data', desc: 'Data disimpan dengan enkripsi dan akses terbatas' },
      { title: 'Berbagi Data', desc: 'Data tidak akan dibagikan ke pihak ketiga tanpa izin' },
      { title: 'Hak Pengguna', desc: 'Anda dapat mengakses, mengedit, atau menghapus data pribadi' }
    ]
  },
  'Tentang SmartLend': {
    icon: Info,
    content: [
      { title: 'Versi Aplikasi', desc: '1.0.0 - Telkom University Edition' },
      { title: 'Dikembangkan Oleh', desc: 'Tim IT Telkom University' },
      { title: 'Tujuan', desc: 'Mempermudah proses peminjaman inventaris kampus secara digital' },
      { title: 'Fitur Utama', desc: 'Multi-role, QR scanning, real-time notifications, approval system' },
      { title: 'Kontak Support', desc: 'support@smartlend.telkomuniversity.ac.id' }
    ]
  }
};

export function ProfileScreen({ user, onLogout }: ProfileScreenProps) {
  const [selectedHelp, setSelectedHelp] = useState<string | null>(null);

  const helpItems = [
    {
      icon: HelpCircle,
      title: 'Cara Meminjam Barang',
      description: 'Panduan langkah demi langkah peminjaman',
      color: '#BE1E2D',
      bgColor: '#FEE2E5'
    },
    {
      icon: BookOpen,
      title: 'Syarat & Ketentuan',
      description: 'Baca ketentuan peminjaman inventaris',
      color: '#BE1E2D',
      bgColor: '#FEE2E5'
    },
    {
      icon: Shield,
      title: 'Kebijakan Privasi',
      description: 'Bagaimana kami melindungi data Anda',
      color: '#BE1E2D',
      bgColor: '#FEE2E5'
    },
    {
      icon: Info,
      title: 'Tentang SmartLend',
      description: 'Versi 1.0.0 • Telkom University Edition',
      color: '#BE1E2D',
      bgColor: '#FEE2E5'
    }
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8FAFC' }}>
      {/* Header */}
      <div className="px-6 pt-8 pb-8" style={{ background: 'linear-gradient(135deg, #BE1E2D 0%, #8B1621 100%)' }}>
        <h1 className="text-2xl font-bold mb-6" style={{ color: '#FFFFFF' }}>
          Profil & Bantuan
        </h1>

        {/* User Card */}
        <div className="bg-white rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center" style={{ backgroundColor: '#BE1E2D' }}>
              <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1">
              <h2 className="font-bold text-lg mb-1" style={{ color: '#0F172A' }}>
                {user.name}
              </h2>
              <p className="text-sm" style={{ color: '#64748B' }}>
                ID: {user.id}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: '#FEF2F3' }}>
              <Mail className="w-5 h-5" style={{ color: '#BE1E2D' }} strokeWidth={1.5} />
              <div className="flex-1">
                <p className="text-xs" style={{ color: '#64748B' }}>SSO Email</p>
                <p className="text-sm font-semibold" style={{ color: '#0F172A' }}>{user.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: '#FEF2F3' }}>
              <Phone className="w-5 h-5" style={{ color: '#BE1E2D' }} strokeWidth={1.5} />
              <div className="flex-1">
                <p className="text-xs" style={{ color: '#64748B' }}>Telepon</p>
                <p className="text-sm font-semibold" style={{ color: '#0F172A' }}>+62 812 3456 7890</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: '#FEF2F3' }}>
              <MapPin className="w-5 h-5" style={{ color: '#BE1E2D' }} strokeWidth={1.5} />
              <div className="flex-1">
                <p className="text-xs" style={{ color: '#64748B' }}>Kampus</p>
                <p className="text-sm font-semibold" style={{ color: '#0F172A' }}>Telkom University</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Help Section */}
      <div className="px-6 py-6">
        <h2 className="font-bold text-lg mb-4" style={{ color: '#0F172A' }}>
          Bantuan & Informasi
        </h2>

        <div className="space-y-3">
          {helpItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={index}
                className="w-full bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow"
                onClick={() => setSelectedHelp(item.title)}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: item.bgColor }}
                >
                  <Icon className="w-6 h-6" style={{ color: item.color }} strokeWidth={1.5} />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-semibold text-sm mb-1" style={{ color: '#0F172A' }}>
                    {item.title}
                  </h3>
                  <p className="text-xs" style={{ color: '#64748B' }}>
                    {item.description}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5" style={{ color: '#CBD5E1' }} strokeWidth={1.5} />
              </button>
            );
          })}
        </div>

        {/* Contact Support */}
        <div className="mt-6 rounded-3xl p-6 shadow-sm" style={{ background: 'linear-gradient(135deg, #BE1E2D 0%, #8B1621 100%)' }}>
          <h3 className="font-bold text-lg text-white mb-2">
            Butuh Bantuan Lebih?
          </h3>
          <p className="text-sm mb-4" style={{ color: '#FEE2E5' }}>
            Tim kami siap membantu Anda 24/7
          </p>
          <button className="w-full bg-white py-3 rounded-xl font-bold text-sm hover:shadow-lg transition-all" style={{ color: '#BE1E2D' }}>
            Hubungi Support
          </button>
        </div>

        {/* Logout Button */}
        <button
          onClick={onLogout}
          className="w-full mt-6 py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90"
          style={{ backgroundColor: '#FEE2E2', color: '#EF4444' }}
        >
          <LogOut className="w-5 h-5" strokeWidth={2} />
          Keluar dari Akun
        </button>
      </div>

      {/* Help Content Modal */}
      {selectedHelp && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-6"
          onClick={() => setSelectedHelp(null)}
        >
          <div 
            className="bg-white rounded-3xl w-full max-h-[80vh] overflow-y-auto shadow-2xl"
            style={{ maxWidth: '900px' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b p-6 rounded-t-3xl" style={{ borderColor: '#F1F5F9' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {(() => {
                    const IconComponent = helpContentData[selectedHelp as keyof typeof helpContentData].icon;
                    return (
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: '#FEE2E5' }}
                      >
                        <IconComponent className="w-6 h-6" style={{ color: '#BE1E2D' }} strokeWidth={1.5} />
                      </div>
                    );
                  })()}
                  <h2 className="font-bold text-xl" style={{ color: '#0F172A' }}>
                    {selectedHelp}
                  </h2>
                </div>
                <button
                  className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
                  onClick={() => setSelectedHelp(null)}
                >
                  <X className="w-5 h-5" style={{ color: '#64748B' }} />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-3">
              {helpContentData[selectedHelp as keyof typeof helpContentData].content.map((item: any, index: number) => (
                <div key={index} className="rounded-2xl p-4 shadow-sm" style={{ backgroundColor: '#F8FAFC' }}>
                  {'step' in item ? (
                    <div className="flex items-start gap-4">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-lg"
                        style={{ backgroundColor: '#BE1E2D', color: '#FFFFFF' }}
                      >
                        {item.step}
                      </div>
                      <div className="flex-1 pt-1">
                        <h3 className="font-bold text-sm mb-1" style={{ color: '#0F172A' }}>
                          {item.title}
                        </h3>
                        <p className="text-sm" style={{ color: '#64748B' }}>
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-4">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: '#10B981' }}
                      >
                        <CheckCircle className="w-5 h-5" style={{ color: '#FFFFFF' }} strokeWidth={2} />
                      </div>
                      <div className="flex-1 pt-1">
                        <h3 className="font-bold text-sm mb-1" style={{ color: '#0F172A' }}>
                          {item.title}
                        </h3>
                        <p className="text-sm" style={{ color: '#64748B' }}>
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-white border-t p-6 rounded-b-3xl" style={{ borderColor: '#F1F5F9' }}>
              <button
                onClick={() => setSelectedHelp(null)}
                className="w-full py-3 rounded-xl font-bold text-sm transition-all hover:opacity-90"
                style={{ backgroundColor: '#BE1E2D', color: '#FFFFFF' }}
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}