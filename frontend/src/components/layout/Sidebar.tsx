import React from 'react';
import { 
  LayoutDashboard, 
  PlusCircle, 
  History, 
  FileText, 
  BarChart3, 
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  X
} from 'lucide-react';
import { Link, useLocation } from '../../services/router';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  backendNer?: string;
  isBackendHealthy: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
  backendNer = 'presidio+gliner',
  isBackendHealthy,
}) => {
  const { pathname } = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/app', icon: LayoutDashboard },
    { name: 'New Request', path: '/app/new-request', icon: PlusCircle },
    { name: 'Request History', path: '/app/history', icon: History },
    { name: 'Audit Logs', path: '/app/audit-logs', icon: FileText },
    { name: 'Reports & Analytics', path: '/app/reports', icon: BarChart3 },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#070b14] border-r border-slate-800 text-slate-300">
      
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/80">
        <Link to="/" className="flex items-center gap-2.5 overflow-hidden group">
          <img
            src="/logo-mark.png"
            alt="Cybrix"
            className="w-8 h-8 object-contain flex-shrink-0 drop-shadow-[0_0_10px_rgba(249,115,22,0.4)] group-hover:scale-105 transition-transform"
          />
          {!collapsed && (
            <div className="flex flex-col text-left truncate">
              <span className="font-extrabold text-base tracking-tight text-white leading-tight">
                cybrix<span className="text-orange-500">.</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400 -mt-0.5">
                Privacy Gateway
              </span>
            </div>
          )}
        </Link>

        {/* Mobile Close Button */}
        <button
          onClick={onCloseMobile}
          className="md:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          aria-label="Close sidebar"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Desktop Collapse Toggle */}
        <button
          onClick={onToggleCollapse}
          className="hidden md:flex p-1 text-slate-500 hover:text-slate-300 rounded hover:bg-slate-800/60 transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation Menu */}
      <div className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        <div className={`px-2 mb-2 text-[10px] font-mono uppercase tracking-wider text-slate-500 ${collapsed ? 'text-center' : ''}`}>
          {collapsed ? '•••' : 'Core Navigation'}
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.path || (item.path !== '/app' && pathname.startsWith(item.path));

          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onCloseMobile}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-orange-500/10 text-orange-400 font-semibold border border-orange-500/30 shadow-[0_0_12px_rgba(249,115,22,0.15)]'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
              title={collapsed ? item.name : undefined}
            >
              <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-orange-400' : 'text-slate-400'}`} />
              {!collapsed && <span className="truncate">{item.name}</span>}
              {!collapsed && isActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
              )}
            </Link>
          );
        })}
      </div>

      {/* Bottom Engine Status & Exit to Website */}
      <div className="p-3 border-t border-slate-800/80 space-y-2">
        {!collapsed && (
          <div className="p-2.5 rounded-xl bg-[#090e1a] border border-slate-800/90 text-left">
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Perimeter Engine</span>
              <span className={`inline-block w-2 h-2 rounded-full ${isBackendHealthy ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            </div>
            <div className="text-xs font-bold text-slate-200 truncate flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-orange-400 flex-shrink-0" />
              <span className="capitalize">{backendNer}</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {isBackendHealthy ? 'In-Memory Guard Online' : 'Backend Disconnected'}
            </div>
          </div>
        )}

        <Link
          to="/"
          className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors ${
            collapsed ? 'justify-center' : ''
          }`}
          title="Return to Public Landing Page"
        >
          <ArrowLeft className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
          {!collapsed && <span>Public Landing Page</span>}
        </Link>
      </div>

    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:block flex-shrink-0 transition-all duration-300 z-30 ${
          collapsed ? 'w-16' : 'w-64'
        }`}
      >
        <div className="fixed top-0 bottom-0 left-0 transition-all duration-300 z-30" style={{ width: collapsed ? '4rem' : '16rem' }}>
          {sidebarContent}
        </div>
      </aside>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
          onClick={onCloseMobile}
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <div
        className={`md:hidden fixed top-0 bottom-0 left-0 w-72 z-50 transform transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </div>
    </>
  );
};

