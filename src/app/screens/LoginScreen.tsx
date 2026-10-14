import { useState } from 'react';
import { User, UserRole } from '../types';
import { LogIn, ArrowLeft, UserCircle, Lock, Shield, Package, Users } from 'lucide-react';
import { toast } from 'sonner';
import telkomLogo from 'figma:asset/623803f2801f48df421c6a73b102830c97d7f2c1.png';
import telkomBg from 'figma:asset/0e86c95630b818072ace687907edb996034e5029.png';

interface LoginScreenProps {
  onLogin: (user: User) => void;
  selectedRole: UserRole;
  onBack: () => void;
}

type LoginStep = 'username' | 'password';

export function LoginScreen({ onLogin, selectedRole, onBack }: LoginScreenProps) {
  const [step, setStep] = useState<LoginStep>('username');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const roleConfig = {
    student: {
      label: 'Mahasiswa',
      icon: Users,
      color: '#BE1E2D',
      bgColor: '#FEE2E5',
      gradient: 'linear-gradient(135deg, #BE1E2D 0%, #8B1621 100%)'
    },
    admin: {
      label: 'Admin',
      icon: Shield,
      color: '#10B981',
      bgColor: '#D1FAE5',
      gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
    },
    warehouse: {
      label: 'Logistik',
      icon: Package,
      color: '#F59E0B',
      bgColor: '#FEF3C7',
      gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)'
    }
  };

  const currentRole = roleConfig[selectedRole];
  const Icon = currentRole.icon;

  const handleUsernameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim()) {
      toast.error('Mohon masukkan username');
      return;
    }

    setStep('password');
  };

  // Mode Demo - Input bebas, langsung bisa masuk
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password.trim()) {
      toast.error('Mohon masukkan password');
      return;
    }

    // Langsung buat user berdasarkan role tanpa validasi database
    let user: User;
    
    if (selectedRole === 'student') {
      user = {
        id: 'STD001',
        name: username,
        email: username.includes('@') ? username : `${username}@student.telkomuniversity.ac.id`,
        role: 'student',
        avatar: 'https://ui-avatars.com/api/?name=' + encodeURIComponent(username)
      };
    } else if (selectedRole === 'admin') {
      user = {
        id: 'ADM001',
        name: username,
        email: username.includes('@') ? username : `${username}@telkomuniversity.ac.id`,
        role: 'admin',
        avatar: 'https://ui-avatars.com/api/?name=' + encodeURIComponent(username)
      };
    } else {
      user = {
        id: 'WRH001',
        name: username,
        email: username.includes('@') ? username : `${username}@telkomuniversity.ac.id`,
        role: 'warehouse',
        avatar: 'https://ui-avatars.com/api/?name=' + encodeURIComponent(username)
      };
    }

    toast.success(`Selamat datang, ${user.name}!`);
    onLogin(user);
  };

  const handleBackToUsername = () => {
    setStep('username');
    setPassword('');
  };

  return (
    <div className="min-h-screen w-full flex flex-col" style={{ backgroundColor: '#F8FAFC' }}>
      {/* Header with Background Image */}
      <div className="px-12 pt-6 pb-6 relative overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ 
            backgroundImage: `url(${telkomBg})`,
            backgroundPosition: 'center center'
          }}
        />
        {/* Color Overlay */}
        <div 
          className="absolute inset-0"
          style={{ 
            background: currentRole.gradient,
            opacity: 0.85
          }}
        />
        
        {/* Content */}
        <div className="relative z-10">
          <button
            onClick={step === 'username' ? onBack : handleBackToUsername}
            className="flex items-center gap-2 mb-4 text-white hover:opacity-80 transition-opacity"
          >
            <ArrowLeft className="w-5 h-5" strokeWidth={2} />
            <span className="font-semibold text-sm">Kembali</span>
          </button>

          <div className="text-center">
            <div className="max-w-[160px] mx-auto mb-3">
              <img 
                src={telkomLogo} 
                alt="Telkom University" 
                className="w-full h-auto"
              />
            </div>
            <div
              className="w-16 h-16 mx-auto mb-3 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
            >
              <Icon className="w-8 h-8 text-white" strokeWidth={1.5} />
            </div>
            <h1 className="text-xl font-bold mb-1" style={{ color: '#FFFFFF' }}>
              Login {currentRole.label}
            </h1>
            <p className="text-xs text-white" style={{ opacity: 0.9 }}>
              {step === 'username' ? 'Masukkan username Anda' : 'Masukkan password Anda'}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-12 py-6">
        <div className="max-w-[900px] mx-auto">
          {/* Progress Indicator */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1">
              <div
                className="h-2 rounded-full transition-all"
                style={{
                  backgroundColor: currentRole.color,
                  opacity: 1
                }}
              />
              <p className="text-xs mt-2 font-semibold" style={{ color: currentRole.color }}>
                1. Username
              </p>
            </div>
            <div className="flex-1">
              <div
                className="h-2 rounded-full transition-all"
                style={{
                  backgroundColor: step === 'password' ? currentRole.color : '#E2E8F0',
                  opacity: step === 'password' ? 1 : 0.3
                }}
              />
              <p
                className="text-xs mt-2 font-semibold"
                style={{ color: step === 'password' ? currentRole.color : '#94A3B8' }}
              >
                2. Password
              </p>
            </div>
          </div>

          {/* Step 1: Username */}
          {step === 'username' && (
            <form onSubmit={handleUsernameSubmit} className="space-y-5">
              <div className="bg-white rounded-2xl p-8 shadow-sm">
                <label className="block text-sm font-semibold mb-3" style={{ color: '#334155' }}>
                  Username
                </label>
                <div className="relative">
                  <UserCircle
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5"
                    style={{ color: '#94A3B8' }}
                    strokeWidth={1.5}
                  />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Masukkan username"
                    autoFocus
                    className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:outline-none transition-colors"
                    style={{ fontSize: '16px' }}
                    onFocus={(e) => (e.target.style.borderColor = currentRole.color)}
                    onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
                  />
                </div>

                {/* Demo Hint dengan contoh username */}
                <div className="mt-4 p-4 rounded-xl" style={{ backgroundColor: currentRole.bgColor }}>
                  <p className="text-xs font-semibold mb-1 text-center" style={{ color: currentRole.color }}>
                    💡 Contoh username:
                  </p>
                  <p className="text-xs text-center font-mono" style={{ color: currentRole.color }}>
                    Ahmad Rizki
                  </p>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-4 rounded-xl text-white font-bold flex items-center justify-center gap-2 transition-all hover:opacity-90 shadow-lg"
                style={{ background: currentRole.gradient }}
              >
                Lanjutkan
                <svg className="w-5 h-5" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </form>
          )}

          {/* Step 2: Password */}
          {step === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-5">
              <div className="bg-white rounded-2xl p-8 shadow-sm">
                {/* Show Username */}
                <div className="mb-5 p-4 rounded-xl" style={{ backgroundColor: '#F8FAFC' }}>
                  <p className="text-xs mb-1" style={{ color: '#64748B' }}>
                    Login sebagai
                  </p>
                  <div className="flex items-center gap-2">
                    <UserCircle className="w-5 h-5" style={{ color: currentRole.color }} strokeWidth={1.5} />
                    <p className="font-bold truncate" style={{ color: '#0F172A' }}>
                      {username}
                    </p>
                  </div>
                </div>

                <label className="block text-sm font-semibold mb-3" style={{ color: '#334155' }}>
                  Password
                </label>
                <div className="relative">
                  <Lock
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5"
                    style={{ color: '#94A3B8' }}
                    strokeWidth={1.5}
                  />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password"
                    autoFocus
                    className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:outline-none transition-colors"
                    style={{ fontSize: '16px' }}
                    onFocus={(e) => (e.target.style.borderColor = currentRole.color)}
                    onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
                  />
                </div>

                {/* Demo Password Info - sama untuk semua role */}
                <div className="mt-4 p-4 rounded-xl" style={{ backgroundColor: currentRole.bgColor }}>
                  <p className="text-xs font-semibold mb-1 text-center" style={{ color: currentRole.color }}>
                    💡 Contoh password:
                  </p>
                  <p className="text-xs text-center font-mono" style={{ color: currentRole.color }}>
                    12345
                  </p>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-4 rounded-xl text-white font-bold flex items-center justify-center gap-2 transition-all hover:opacity-90 shadow-lg"
                style={{ background: currentRole.gradient }}
              >
                <LogIn className="w-5 h-5" strokeWidth={2} />
                <span>Masuk</span>
              </button>
            </form>
          )}
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