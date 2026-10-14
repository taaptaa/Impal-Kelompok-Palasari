import { User } from '../types';
import { Menu, LogOut } from 'lucide-react';

interface HeaderProps {
  user: User;
  onLogout: () => void;
  onMenuClick?: () => void;
}

export function Header({ user, onLogout, onMenuClick }: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 w-full">
      <div className="w-full max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            {onMenuClick && (
              <button
                onClick={onMenuClick}
                className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Menu className="w-6 h-6" style={{ color: 'var(--color-primary)' }} />
              </button>
            )}
            <h1 className="text-xl md:text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>
              SmartLend
            </h1>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm md:text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {user.name}
              </span>
              <span className="text-xs md:text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                {user.role === 'student' ? 'Mahasiswa' : user.role === 'admin' ? 'Administrator' : 'Petugas Gudang'}
              </span>
            </div>
            <button
              onClick={onLogout}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" style={{ color: 'var(--color-text-secondary)' }} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}