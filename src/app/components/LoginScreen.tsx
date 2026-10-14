import { useState } from 'react';
import { UserRole } from '../types';
import { AlertCircle } from 'lucide-react';

interface LoginScreenProps {
  onLogin: (role: UserRole, credentials: { username: string; password: string }) => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Mock authentication logic
    if (username === 'admin' && password === 'admin') {
      onLogin('admin', { username, password });
    } else if (username === 'gudang' && password === 'gudang') {
      onLogin('warehouse', { username, password });
    } else if (username && password) {
      onLogin('student', { username, password });
    } else {
      setError('Username atau Password tidak ditemukan');
    }
  };

  return (
    <div 
      className="min-h-screen w-full flex items-center justify-center px-4"
      style={{ backgroundColor: 'var(--color-secondary)' }}
    >
      <div 
        className="w-full max-w-md bg-white p-8 md:p-10"
        style={{ 
          boxShadow: 'var(--shadow-xl)',
          borderRadius: 'var(--radius-xl)'
        }}
      >
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <h1 
            className="text-4xl font-bold mb-2"
            style={{ color: 'var(--color-primary)' }}
          >
            SmartLend
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Sistem Manajemen Peminjaman Inventaris Kampus
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div 
            className="mb-6 p-4 border-l-4 flex items-start gap-3 animate-shake"
            style={{ 
              backgroundColor: 'var(--color-error)10',
              borderLeftColor: 'var(--color-error)',
              borderRadius: 'var(--radius-md)'
            }}
          >
            <AlertCircle 
              className="w-5 h-5 flex-shrink-0 mt-0.5" 
              style={{ color: 'var(--color-error)' }} 
              strokeWidth={1.5} 
            />
            <div>
              <p className="font-semibold text-sm" style={{ color: 'var(--color-error)' }}>
                Login Gagal
              </p>
              <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                {error}
              </p>
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Username Field */}
          <div>
            <label 
              htmlFor="username"
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Username / NIM
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onFocus={() => setFocusedField('username')}
              onBlur={() => setFocusedField(null)}
              placeholder="Masukkan username atau NIM"
              className="w-full px-4 py-3 border-2 transition-all outline-none"
              style={{ 
                borderColor: focusedField === 'username' ? 'var(--color-primary)' : '#e5e7eb',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-text-primary)'
              }}
              required
            />
          </div>

          {/* Password Field */}
          <div>
            <label 
              htmlFor="password"
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
              placeholder="Masukkan password"
              className="w-full px-4 py-3 border-2 transition-all outline-none"
              style={{ 
                borderColor: focusedField === 'password' ? 'var(--color-primary)' : '#e5e7eb',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-text-primary)'
              }}
              required
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-4 text-white font-semibold transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] shadow-md"
            style={{ 
              backgroundColor: 'var(--color-primary)',
              borderRadius: 'var(--radius-md)'
            }}
          >
            Masuk
          </button>
        </form>

        {/* Demo Credentials */}
        <div 
          className="mt-6 p-4 border border-dashed"
          style={{ 
            borderColor: 'var(--color-text-secondary)',
            borderRadius: 'var(--radius-md)',
            opacity: 0.7
          }}
        >
          <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
            🔑 Demo Login:
          </p>
          <div className="space-y-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            <p>• <strong>Mahasiswa:</strong> any username/password</p>
            <p>• <strong>Admin:</strong> admin / admin</p>
            <p>• <strong>Gudang:</strong> gudang / gudang</p>
          </div>
        </div>
      </div>
    </div>
  );
}
