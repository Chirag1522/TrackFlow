import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import useAuthStore from '../store/authStore';
import api from '../api/axios';
import {
  Package, Users, Building2, BarChart3, LogOut, Menu, X,
  Truck, QrCode, LayoutDashboard, CreditCard, PanelLeftClose, PanelLeftOpen, History
} from 'lucide-react';

const navByRole = {
  super_admin: [
    { to: '/super-admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/super-admin/tenants', label: 'Tenants', icon: Building2 },
    { to: '/super-admin/plans', label: 'Plans', icon: CreditCard },
  ],
  admin: [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/shipments', label: 'Shipments', icon: Package },
    { to: '/admin/agents', label: 'Agents', icon: Users },
    { to: '/admin/hubs', label: 'Hubs', icon: Building2 },
    { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  ],
  agent: [
    { to: '/agent', label: 'My Deliveries', icon: Truck, end: true },
    { to: '/agent/past-shipments', label: 'Past Shipments', icon: History },
    { to: '/agent/scan', label: 'Scan QR', icon: QrCode },
  ],
};

export default function DashboardLayout() {
  const { user, logout } = useAuthStore();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const navItems = navByRole[user?.role] || [];

  const getPageTitle = (path) => {
    if (path === '/admin') return 'Admin Dashboard';
    if (path.startsWith('/admin/shipments')) return 'Shipment Management';
    if (path.startsWith('/admin/agents')) return 'Agent Management';
    if (path.startsWith('/admin/hubs')) return 'Hub Management';
    if (path.startsWith('/admin/analytics')) return 'Analytics';
    if (path === '/super-admin') return 'Platform Dashboard';
    if (path.startsWith('/super-admin/tenants')) return 'Tenants';
    if (path.startsWith('/super-admin/plans')) return 'Subscription Plans';
    if (path === '/agent') return 'My Workitems';
    if (path.startsWith('/agent/past-shipments')) return 'Past Shipments';
    if (path.startsWith('/agent/scan')) return 'QR Scanner';
    return 'Dashboard';
  };

  const handleLogout = async () => {
    try { await api.post('/auth/logout'); } catch {}
    logout();
    navigate('/login');
  };

  const SidebarContent = ({ mobile = false }) => (
    <div className={`flex flex-col h-full bg-white border-r border-gray-200 ${mobile ? 'w-72' : collapsed ? 'w-20' : 'w-72'}`}>
      <div className="flex items-center gap-3 px-4 h-16 border-b border-gray-200">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#F74B25' }}>
          <Package size={18} className="text-white" />
        </div>
        {(!collapsed || mobile) && <span className="font-semibold text-gray-900">TrackFlow</span>}
        {mobile && (
          <button onClick={() => setMobileOpen(false)} className="ml-auto text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-orange-50 text-orange-600'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`
            }
            onClick={() => setMobileOpen(false)}
          >
            <Icon size={18} className="flex-shrink-0" />
            {(!collapsed || mobile) && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-gray-200">
        <div className="flex items-center gap-3 px-3 py-2 mb-2 rounded-lg bg-gray-50">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ backgroundColor: '#F74B25' }}>
            {user?.name?.[0]?.toUpperCase()}
          </div>
          {(!collapsed || mobile) && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-gray-900">{user?.name}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
          )}
        </div>
        <button onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all">
          <LogOut size={18} />
          {(!collapsed || mobile) && <span>Sign out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-shrink-0">
        <SidebarContent />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="relative flex flex-col w-72 bg-white">
            <SidebarContent mobile />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
        {/* Desktop topbar */}
        <div className="hidden md:flex items-center justify-between h-16 px-6 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCollapsed((prev) => !prev)}
              className="p-2 rounded-md border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            >
              {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            </button>
            <div>
              <p className="text-xs text-gray-500 capitalize">{user?.role?.replace('_', ' ')}</p>
              <p className="text-sm font-semibold text-gray-900">{getPageTitle(pathname)}</p>
            </div>
          </div>
          <div className="text-sm text-gray-500">{user?.email}</div>
        </div>

        {/* Mobile topbar */}
        <div className="md:hidden flex items-center gap-4 px-4 py-3 border-b border-gray-200 bg-white">
          <button onClick={() => setMobileOpen(true)} className="text-gray-600 hover:text-gray-800">
            <Menu size={24} />
          </button>
          <div>
            <p className="text-xs text-gray-500 capitalize">{user?.role?.replace('_', ' ')}</p>
            <p className="text-sm font-semibold text-gray-900">{getPageTitle(pathname)}</p>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
