import { Home, Grid, ClipboardList, ShoppingCart, Building2, User } from 'lucide-react';
import type { MainScreen } from '../navigation';
import { isPublicScreen } from '../navigation';

interface BottomNavProps {
  currentScreen: string;
  onNavigate: (screen: MainScreen) => void;
  publicOnly?: boolean;
  showLoans?: boolean;
  planCount?: number;
}

export function BottomNav({ currentScreen, onNavigate, publicOnly, showLoans, planCount=0 }: BottomNavProps) {
  const navItems: { id: MainScreen; label: string; icon: typeof Home }[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'catalog', label: 'Barang', icon: Grid },
    { id: 'rooms', label: 'Ruangan', icon: Building2 },
    { id: 'plan', label: `Keranjang (${planCount})`, icon: ShoppingCart },
    ...(showLoans?[{id:'loans' as const,label:'Pengajuan',icon:ClipboardList}]:[]),
    { id: 'profile', label: 'Akun', icon: User },
  ];

  return (
    <nav aria-label="Navigasi mobile"
      className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t z-40" 
      style={{ 
        borderTopColor: '#E5E5EA',
        paddingBottom: 'max(8px, env(safe-area-inset-bottom))'
      }}
    >
      <div className="w-full flex items-end justify-around" style={{ paddingTop: '4px' }}>
        {navItems.filter(item => !publicOnly || isPublicScreen(item.id)).map((item) => {
          const Icon = item.icon;
          const isActive = currentScreen === item.id;

          return (
            <button
              key={item.id}
              data-nav={item.id} aria-current={isActive ? 'page' : undefined}
              onClick={() => onNavigate(item.id)}
              className="flex flex-col items-center justify-center transition-all flex-1 min-w-0 focus-visible:outline-2 focus-visible:outline-[#BE1E2D]"
              style={{
                maxWidth: '80px',
                paddingTop: '6px',
                paddingBottom: '2px',
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              {/* Icon */}
              <Icon 
                className="w-7 h-7 mb-1" 
                style={{ 
                  color: isActive ? '#BE1E2D' : '#64748B',
                  strokeWidth: 1.8
                }}
              />

              {/* Label */}
              <span className="sl-mobile-nav-label"
                style={{ 
                  fontSize: '10px',
                  fontWeight: 500,
                  color: isActive ? '#BE1E2D' : '#64748B',
                  letterSpacing: '-0.08px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '100%'
                }}
              >
                {item.id==='plan'?<>Keranjang <span className="block">({planCount})</span></>:item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
