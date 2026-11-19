import { User, LogOut } from 'lucide-react';
import { User as UserType } from '../types';
import type { MainScreen } from '../navigation';

interface NavbarProps {
  user: UserType | null;
  onLogout: () => void;
  onLogin?: () => void;
  currentScreen?: MainScreen;
  onNavigate?: (screen: MainScreen) => void;
  planCount?: number;
}

export function Navbar({ user, onLogout, onLogin, currentScreen = 'home', onNavigate, planCount = 0 }: NavbarProps) {
  const links: { id: MainScreen; label: string }[] = [
    ...(user ? [{ id: 'home' as const, label: 'Home' }] : []), { id: 'catalog', label: 'Katalog Barang' },
    { id: 'rooms', label: 'Katalog Ruangan' }, { id: 'plan', label: `Keranjang (${planCount})` },
  ];
  const internal = user?.role === 'admin' || user?.role === 'warehouse';
  if (user?.role==='student') links.push({id:'loans',label:'Peminjaman Saya'});
  if (internal) links.push({ id: 'dashboard', label: 'Dashboard' });
  return (
    <nav 
      className="bg-white border-b border-gray-200 sticky top-0 z-40"
      aria-label="Navigasi utama" style={{ boxShadow: 'var(--shadow-sm)' }}
    >
      <div className="sl-shell py-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Logo */}
          <div className="flex items-center gap-6 min-w-0">
            <button type="button" disabled={!onNavigate} onClick={() => user ? onNavigate?.('home') : onLogin?.()} aria-label={user ? 'SmartLend Home' : 'Kembali ke pemilihan role'}
              className="text-2xl font-bold"
              style={{ color: 'var(--color-primary)' }}
            >
              SmartLend
            </button>
            <div className="hidden lg:flex items-center gap-4">
              {onNavigate && links.map(link => <button key={link.id} type="button" data-nav={link.id} onClick={() => onNavigate(link.id)} aria-current={currentScreen === link.id ? 'page' : undefined}
                className="py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-[#BE1E2D]" style={{ color: currentScreen === link.id ? '#BE1E2D' : '#475569' }}>{link.label}</button>)}
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-3">

            {/* User Menu */}
            <div className="flex items-center gap-3">
              {internal && onNavigate && <button type="button" onClick={() => onNavigate('dashboard')} data-nav="dashboard" className="lg:hidden text-sm font-semibold py-2 text-[#BE1E2D]">Dashboard</button>}
              {user && <button type="button" disabled={!onNavigate} onClick={() => onNavigate?.('profile')} data-nav="profile" aria-current={currentScreen === 'profile' ? 'page' : undefined}
                className="flex items-center gap-2 rounded-lg p-2 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-[#BE1E2D]"
              >
                <User className="w-5 h-5" style={{ color: 'var(--color-primary)' }} strokeWidth={1.5} />
                <span className="text-sm font-semibold">Akun</span>
              </button>}
              {user ? <button
                onClick={onLogout}
                className="p-2 hover:bg-gray-100 transition-colors"
                style={{ borderRadius: 'var(--radius-md)' }}
                title="Logout" aria-label="Logout"
              >
                <LogOut className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} strokeWidth={1.5} />
              </button> : <button type="button" onClick={onLogin} className="text-sm font-semibold text-[#BE1E2D] px-2 py-2 rounded-lg focus-visible:outline-2">Masuk</button>}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
