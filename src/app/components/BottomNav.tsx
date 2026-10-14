import { Home, Grid, History, Bell, User } from 'lucide-react';

interface BottomNavProps {
  currentScreen: string;
  onNavigate: (screen: 'home' | 'catalog' | 'history' | 'notifications' | 'profile') => void;
}

export function BottomNav({ currentScreen, onNavigate }: BottomNavProps) {
  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'catalog', label: 'Katalog', icon: Grid },
    { id: 'history', label: 'Riwayat', icon: History },
    { id: 'notifications', label: 'Notifikasi', icon: Bell },
    { id: 'profile', label: 'Bantuan', icon: User },
  ];

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 bg-white border-t z-50" 
      style={{ 
        borderTopColor: '#E5E5EA',
        paddingBottom: 'max(8px, env(safe-area-inset-bottom))'
      }}
    >
      <div className="w-full flex items-end justify-around" style={{ paddingTop: '4px' }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentScreen === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id as any)}
              className="flex flex-col items-center justify-center transition-all flex-1"
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
                  color: isActive ? '#007AFF' : '#8E8E93',
                  strokeWidth: 1.8
                }}
              />

              {/* Label */}
              <span 
                style={{ 
                  fontSize: '10px',
                  fontWeight: 500,
                  color: isActive ? '#007AFF' : '#8E8E93',
                  letterSpacing: '-0.08px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '100%'
                }}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}