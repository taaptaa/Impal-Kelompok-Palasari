import { Users, ShieldCheck, Package } from 'lucide-react';
import telkomLogo from 'figma:asset/623803f2801f48df421c6a73b102830c97d7f2c1.png';
import telkomBg from 'figma:asset/0e86c95630b818072ace687907edb996034e5029.png';

interface RoleSelectionScreenProps {
  onSelectRole: (role: 'student' | 'admin' | 'warehouse', action: 'login' | 'register') => void;
}

export function RoleSelectionScreen({ onSelectRole }: RoleSelectionScreenProps) {
  const roles = [
    {
      id: 'student' as const,
      title: 'Mahasiswa',
      description: 'Pinjam barang inventaris kampus',
      icon: Users,
      gradient: 'linear-gradient(135deg, #BE1E2D 0%, #8B1621 100%)',
      iconBg: '#FEE2E5',
      iconColor: '#BE1E2D'
    },
    {
      id: 'admin' as const,
      title: 'Admin',
      description: 'Kelola persetujuan peminjaman',
      icon: ShieldCheck,
      gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
      iconBg: '#D1FAE5',
      iconColor: '#10B981'
    },
    {
      id: 'warehouse' as const,
      title: 'Logistik',
      description: 'Scan & kelola barang gudang',
      icon: Package,
      gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
      iconBg: '#FEF3C7',
      iconColor: '#F59E0B'
    }
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F8FAFC' }}>
      {/* Header with Background Image */}
      <div className="px-12 pt-8 pb-8 text-center relative overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ 
            backgroundImage: `url(${telkomBg})`,
            backgroundPosition: 'center center'
          }}
        />
        {/* Dark Overlay */}
        <div 
          className="absolute inset-0"
          style={{ 
            background: 'linear-gradient(135deg, rgba(190, 30, 45, 0.85) 0%, rgba(139, 22, 33, 0.90) 100%)'
          }}
        />
        
        {/* Content */}
        <div className="relative z-10">
          <div className="mb-4">
            <div className="max-w-[200px] mx-auto mb-4">
              <img 
                src={telkomLogo} 
                alt="Telkom University" 
                className="w-full h-auto"
              />
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: '#FFFFFF' }}>
            SmartLend
          </h1>
          <p className="text-sm mb-1" style={{ color: '#FEE2E5' }}>
            Sistem Peminjaman Inventaris
          </p>
          <p className="text-xs" style={{ color: '#FEE2E5' }}>
            Telkom University, Bandung
          </p>
        </div>
      </div>

      {/* Role Selection */}
      <div className="flex-1 px-12 py-6">
        <h2 className="text-lg font-bold mb-2 text-center" style={{ color: '#0F172A' }}>
          Masuk Sebagai
        </h2>
        <p className="text-sm text-center mb-6" style={{ color: '#64748B' }}>
          Pilih peran Anda untuk melanjutkan
        </p>

        <div className="space-y-3 max-w-[900px] mx-auto">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <button
                key={role.id}
                onClick={() => onSelectRole(role.id, 'login')}
                className="w-full bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <div className="flex items-center gap-5">
                  <div
                    className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: role.iconBg }}
                  >
                    <Icon className="w-8 h-8" style={{ color: role.iconColor }} strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 text-left min-w-0 pr-3">
                    <h3 className="text-lg font-bold mb-1" style={{ color: '#0F172A' }}>
                      {role.title}
                    </h3>
                    <p className="text-sm" style={{ color: '#64748B' }}>
                      {role.description}
                    </p>
                  </div>
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: role.gradient }}
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="white"
                      strokeWidth="2.5"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="px-12 py-6 text-center">
        <p className="text-xs" style={{ color: '#94A3B8' }}>
          © 2024 Telkom University
        </p>
        <p className="text-xs mt-1" style={{ color: '#94A3B8' }}>
          SmartLend v1.0.0 - Telkom University Edition
        </p>
      </div>
    </div>
  );
}