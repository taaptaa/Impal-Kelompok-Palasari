import { useState } from 'react';
import { User } from '../types';
import { UserPlus, ArrowLeft, UserCircle, Lock, Shield, Package, Users, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import telkomLogo from 'figma:asset/623803f2801f48df421c6a73b102830c97d7f2c1.png';
import telkomBg from 'figma:asset/0e86c95630b818072ace687907edb996034e5029.png';

interface RegistrationScreenProps {
  onRegister: (user: User) => void;
  selectedRole: UserRole;
  onBack: () => void;
  onSwitchToLogin?: () => void;
}

type RegistrationStep = 'username' | 'password' | 'confirm';

export function RegistrationScreen({ onRegister, selectedRole, onBack, onSwitchToLogin }: RegistrationScreenProps) {
  const [step, setStep] = useState<RegistrationStep>('username');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

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

    if (username.length < 3) {
      toast.error('Username minimal 3 karakter');
      return;
    }

    setStep('password');
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password.trim()) {
      toast.error('Mohon masukkan password');
      return;
    }

    if (password.length < 6) {
      toast.error('Password minimal 6 karakter');
      return;
    }

    setStep('confirm');
  };

  const handleConfirmPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!confirmPassword.trim()) {
      toast.error('Mohon konfirmasi password');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Password tidak cocok!');
      return;
    }

    // Create user based on role
    let user: User;
    
    if (selectedRole === 'student') {
      user = {
        id: 'STD' + Math.random().toString(36).substr(2, 9).toUpperCase(),
        name: username,
        email: username.includes('@') ? username : `${username}@student.telkomuniversity.ac.id`,
        role: 'student',
        avatar: 'https://ui-avatars.com/api/?name=' + encodeURIComponent(username)
      };
    } else if (selectedRole === 'admin') {
      user = {
        id: 'ADM' + Math.random().toString(36).substr(2, 9).toUpperCase(),
        name: 'Admin ' + username,
        email: username.includes('@') ? username : `${username}@telkomuniversity.ac.id`,
        role: 'admin',
        avatar: 'https://ui-avatars.com/api/?name=Admin'
      };
    } else {
      user = {
        id: 'WRH' + Math.random().toString(36).substr(2, 9).toUpperCase(),
        name: 'Petugas ' + username,
        email: username.includes('@') ? username : `${username}@telkomuniversity.ac.id`,
        role: 'warehouse',
        avatar: 'https://ui-avatars.com/api/?name=Warehouse'
      };
    }

    toast.success(`🎉 Akun berhasil dibuat! Selamat datang, ${user.name}!`);
    onRegister(user);
  };

  const handleBackToUsername = () => {
    setStep('username');
    setPassword('');
    setConfirmPassword('');
  };

  const handleBackToPassword = () => {
    setStep('password');
    setConfirmPassword('');
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
            onClick={
              step === 'username' ? onBack : 
              step === 'password' ? handleBackToUsername : 
              handleBackToPassword
            }
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
              Daftar {currentRole.label}
            </h1>
            <p className="text-xs text-white" style={{ opacity: 0.9 }}>
              {step === 'username' ? 'Buat username untuk akun Anda' : 
               step === 'password' ? 'Buat password yang aman' : 
               'Konfirmasi password Anda'}
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
                  backgroundColor: step === 'password' || step === 'confirm' ? currentRole.color : '#E2E8F0',
                  opacity: step === 'password' || step === 'confirm' ? 1 : 0.3
                }}
              />
              <p
                className="text-xs mt-2 font-semibold"
                style={{ color: step === 'password' || step === 'confirm' ? currentRole.color : '#94A3B8' }}
              >
                2. Password
              </p>
            </div>
            <div className="flex-1">
              <div
                className="h-2 rounded-full transition-all"
                style={{
                  backgroundColor: step === 'confirm' ? currentRole.color : '#E2E8F0',
                  opacity: step === 'confirm' ? 1 : 0.3
                }}
              />
              <p
                className="text-xs mt-2 font-semibold"
                style={{ color: step === 'confirm' ? currentRole.color : '#94A3B8' }}
              >
                3. Konfirmasi
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
                    placeholder="Masukkan username (minimal 3 karakter)"
                    autoFocus
                    className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:outline-none transition-colors"
                    style={{ fontSize: '16px' }}
                    onFocus={(e) => (e.target.style.borderColor = currentRole.color)}
                    onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
                  />
                </div>

                {/* Info */}
                <div className="mt-4 p-4 rounded-xl" style={{ backgroundColor: currentRole.bgColor }}>
                  <p className="text-xs text-center" style={{ color: currentRole.color }}>
                    ℹ️ Username akan digunakan untuk login ke sistem
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
                    Username
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
                    placeholder="Masukkan password (minimal 6 karakter)"
                    autoFocus
                    className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:outline-none transition-colors"
                    style={{ fontSize: '16px' }}
                    onFocus={(e) => (e.target.style.borderColor = currentRole.color)}
                    onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
                  />
                </div>

                {/* Info */}
                <div className="mt-4 p-4 rounded-xl" style={{ backgroundColor: currentRole.bgColor }}>
                  <p className="text-xs text-center" style={{ color: currentRole.color }}>
                    🔒 Gunakan kombinasi huruf, angka, dan simbol untuk keamanan
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

          {/* Step 3: Confirm Password */}
          {step === 'confirm' && (
            <form onSubmit={handleConfirmPasswordSubmit} className="space-y-5">
              <div className="bg-white rounded-2xl p-8 shadow-sm">
                {/* Show Username */}
                <div className="mb-5 p-4 rounded-xl" style={{ backgroundColor: '#F8FAFC' }}>
                  <p className="text-xs mb-1" style={{ color: '#64748B' }}>
                    Username
                  </p>
                  <div className="flex items-center gap-2">
                    <UserCircle className="w-5 h-5" style={{ color: currentRole.color }} strokeWidth={1.5} />
                    <p className="font-bold truncate" style={{ color: '#0F172A' }}>
                      {username}
                    </p>
                  </div>
                </div>

                <label className="block text-sm font-semibold mb-3" style={{ color: '#334155' }}>
                  Konfirmasi Password
                </label>
                <div className="relative">
                  <CheckCircle
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5"
                    style={{ color: '#94A3B8' }}
                    strokeWidth={1.5}
                  />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Masukkan ulang password Anda"
                    autoFocus
                    className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:outline-none transition-colors"
                    style={{ fontSize: '16px' }}
                    onFocus={(e) => (e.target.style.borderColor = currentRole.color)}
                    onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
                  />
                </div>

                {/* Password Match Indicator */}
                {confirmPassword && (
                  <div className="mt-4 p-4 rounded-xl" style={{ 
                    backgroundColor: password === confirmPassword ? '#D1FAE5' : '#FEE2E2' 
                  }}>
                    <p className="text-xs text-center" style={{ 
                      color: password === confirmPassword ? '#10B981' : '#EF4444' 
                    }}>
                      {password === confirmPassword ? '✅ Password cocok!' : '❌ Password tidak cocok'}
                    </p>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-4 rounded-xl text-white font-bold flex items-center justify-center gap-2 transition-all hover:opacity-90 shadow-lg"
                style={{ background: currentRole.gradient }}
              >
                <UserPlus className="w-5 h-5" strokeWidth={2} />
                Daftar Sekarang
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-12 py-6 text-center">
        {/* Login Link */}
        {onSwitchToLogin && (
          <button
            onClick={onSwitchToLogin}
            className="text-sm mb-4 hover:opacity-70 transition-opacity"
            style={{ color: '#BE1E2D' }}
          >
            Sudah punya akun? <span className="font-bold underline">Login disini</span>
          </button>
        )}

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