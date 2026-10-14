import { Bell, User, Search, LogOut } from 'lucide-react';
import { User as UserType } from '../types';

interface NavbarProps {
  user: UserType;
  onLogout: () => void;
}

export function Navbar({ user, onLogout }: NavbarProps) {
  return (
    <nav 
      className="bg-white border-b border-gray-200 sticky top-0 z-40"
      style={{ boxShadow: 'var(--shadow-sm)' }}
    >
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <h1 
              className="text-2xl font-bold"
              style={{ color: 'var(--color-primary)' }}
            >
              SmartLend
            </h1>
            {user.role === 'student' && (
              <div className="hidden md:flex items-center gap-6">
                <a href="#" className="text-sm font-medium hover:text-blue-600 transition-colors" style={{ color: 'var(--color-text-primary)' }}>
                  Beranda
                </a>
                <a href="#" className="text-sm font-medium hover:text-blue-600 transition-colors" style={{ color: 'var(--color-text-secondary)' }}>
                  Katalog
                </a>
                <a href="#" className="text-sm font-medium hover:text-blue-600 transition-colors" style={{ color: 'var(--color-text-secondary)' }}>
                  Riwayat Saya
                </a>
                <a href="#" className="text-sm font-medium hover:text-blue-600 transition-colors" style={{ color: 'var(--color-text-secondary)' }}>
                  Bantuan
                </a>
              </div>
            )}
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-4">
            {/* Notification */}
            <button 
              className="p-2 hover:bg-gray-100 transition-colors relative"
              style={{ borderRadius: 'var(--radius-md)' }}
            >
              <Bell className="w-5 h-5" style={{ color: 'var(--color-text-secondary)' }} strokeWidth={1.5} />
              <span 
                className="absolute top-1 right-1 w-2 h-2"
                style={{ 
                  backgroundColor: 'var(--color-error)',
                  borderRadius: 'var(--radius-full)'
                }}
              />
            </button>

            {/* User Menu */}
            <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
              <div 
                className="w-10 h-10 flex items-center justify-center"
                style={{ 
                  backgroundColor: 'var(--color-primary)10',
                  borderRadius: 'var(--radius-full)'
                }}
              >
                <User className="w-5 h-5" style={{ color: 'var(--color-primary)' }} strokeWidth={1.5} />
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  {user.name}
                </p>
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  {user.email}
                </p>
              </div>
              <button
                onClick={onLogout}
                className="p-2 hover:bg-gray-100 transition-colors"
                style={{ borderRadius: 'var(--radius-md)' }}
                title="Logout"
              >
                <LogOut className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
