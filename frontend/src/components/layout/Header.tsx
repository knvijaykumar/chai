import React from 'react';
import { Menu, Plus } from 'lucide-react';
import { Link, useLocation } from '../../services/router';

interface HeaderProps {
  onOpenMobileSidebar: () => void;
  isBackendHealthy?: boolean;
  backendNer?: string;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenMobileSidebar,
}) => {
  const { pathname } = useLocation();

  const getPageMeta = (path: string) => {
    switch (path) {
      case '/app':
        return { title: 'Dashboard Overview', breadcrumb: 'Dashboard' };
      case '/app/new-request':
        return { title: 'New Request & Document Ingestion', breadcrumb: 'New Request' };
      case '/app/history':
        return { title: 'Request History & Audit Log', breadcrumb: 'History' };
      case '/app/audit-logs':
        return { title: 'Tamper-Evident Audit Records', breadcrumb: 'Audit Logs' };
      case '/app/reports':
        return { title: 'Reports & Compliance Analytics', breadcrumb: 'Reports' };
      default:
        return { title: 'Application Dashboard', breadcrumb: 'Dashboard' };
    }
  };

  const { title, breadcrumb } = getPageMeta(pathname);

  return (
    <header className="h-16 bg-[#070b14]/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-20">
      
      {/* Left: Mobile Toggle + Breadcrumb Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileSidebar}
          className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex flex-col text-left">
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500">
            <Link to="/app" className="hover:text-slate-400 transition-colors">Privacy Gateway</Link>
            <span>/</span>
            <span className="text-orange-400/90 font-medium">{breadcrumb}</span>
          </div>
          <h1 className="text-base sm:text-lg font-bold text-white tracking-tight leading-none mt-0.5">
            {title}
          </h1>
        </div>
      </div>

      {/* Right: Quick Action */}
      <div className="flex items-center gap-3 sm:gap-4">
        {pathname !== '/app/new-request' && (
          <Link
            to="/app/new-request"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold text-xs shadow-md shadow-orange-500/20 transition-all hover:scale-105"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Request</span>
          </Link>
        )}
      </div>

    </header>
  );
};

