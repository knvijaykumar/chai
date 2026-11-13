import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { fetchHealth } from '../../services/api';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isBackendHealthy, setIsBackendHealthy] = useState(false);
  const [backendNer, setBackendNer] = useState('presidio+gliner');

  useEffect(() => {
    let isMounted = true;

    const checkHealth = async () => {
      try {
        const data = await fetchHealth();
        if (isMounted) {
          setIsBackendHealthy(data.status === 'ok');
          if (data.ner) setBackendNer(data.ner);
        }
      } catch {
        if (isMounted) {
          setIsBackendHealthy(false);
        }
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#050811] text-slate-100 flex flex-col font-sans selection:bg-orange-500 selection:text-white">
      <div className="flex flex-1">
        
        {/* Sidebar */}
        <Sidebar
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed(!collapsed)}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
          backendNer={backendNer}
          isBackendHealthy={isBackendHealthy}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <Header
            onOpenMobileSidebar={() => setMobileOpen(true)}
            isBackendHealthy={isBackendHealthy}
            backendNer={backendNer}
          />

          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
            {children}
          </main>
        </div>

      </div>
    </div>
  );
};

