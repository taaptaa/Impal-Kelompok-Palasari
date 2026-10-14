import { LayoutDashboard, Package, CheckSquare, FileText, LogOut } from 'lucide-react';

interface SidebarProps {
  activeMenu: string;
  onMenuClick: (menu: string) => void;
  onLogout: () => void;
}

export function Sidebar({ activeMenu, onMenuClick, onLogout }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'items', label: 'Data Barang', icon: Package },
    { id: 'approval', label: 'Persetujuan', icon: CheckSquare },
    { id: 'reports', label: 'Laporan', icon: FileText }
  ];

  return (
    <aside 
      className="w-64 min-h-screen fixed left-0 top-0 flex flex-col"
      style={{ backgroundColor: 'var(--color-navy)' }}
    >
      {/* Logo */}
      <div className="p-6 border-b border-gray-700">
        <h1 className="text-2xl font-bold text-white">
          SmartLend
        </h1>
        <p className="text-xs text-gray-400 mt-1">Admin Panel</p>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 py-6">
        {menuItems.map(item => {
          const Icon = item.icon;
          const isActive = activeMenu === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onMenuClick(item.id)}
              className={`w-full flex items-center gap-3 px-6 py-3 transition-all ${
                isActive 
                  ? 'bg-blue-600 border-r-4 text-white' 
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
              style={isActive ? { borderRightColor: 'var(--color-primary)' } : {}}
            >
              <Icon className="w-5 h-5" strokeWidth={1.5} />
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Logout */}
      <button
        onClick={onLogout}
        className="flex items-center gap-3 px-6 py-4 text-gray-400 hover:bg-gray-800 hover:text-white transition-all border-t border-gray-700"
      >
        <LogOut className="w-5 h-5" strokeWidth={1.5} />
        <span className="text-sm font-medium">Logout</span>
      </button>
    </aside>
  );
}
