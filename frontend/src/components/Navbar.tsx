import React, { useState, useEffect } from 'react';
import { Menu, X, ArrowUpRight } from 'lucide-react';
import { Link } from '../services/router';

interface NavbarProps {
  onOpenAuthModal?: (mode: 'signin' | 'getstarted') => void;
}

export const Navbar: React.FC<NavbarProps> = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Overview', href: '#overview', active: true },
    { name: 'How It Works', href: '#how-it-works', active: false },
    { name: 'Security', href: '#security', active: false },
    { name: 'Features', href: '#features', active: false },
    { name: 'Product Preview', href: '#preview', active: false },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        isScrolled
          ? 'bg-[#050811]/95 backdrop-blur-md border-b border-slate-800/90 shadow-xl py-3.5'
          : 'bg-[#050811]/70 backdrop-blur-sm border-b border-slate-900/60 py-4 sm:py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          
          {/* Left: Brand Logo & Product Name */}
          <a href="#" className="flex items-center gap-3 group">
            <img
              src="/logo-transparent.png"
              alt="cybrix."
              className="h-8 sm:h-9 w-auto object-contain group-hover:scale-105 transition-transform drop-shadow-[0_0_12px_rgba(249,115,22,0.35)]"
            />
            <div className="hidden sm:flex flex-col text-left border-l border-slate-800 pl-3">
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-500/15 text-orange-400 border border-orange-500/30 uppercase tracking-wider">
                Enterprise
              </span>
              <span className="text-[10px] text-slate-400 font-mono -mt-0.5">
                Privacy Gateway
              </span>
            </div>
          </a>

          {/* Center: Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-1 bg-slate-900/80 px-2 py-1 rounded-full border border-slate-800/80 backdrop-blur-md">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className={`px-3.5 py-1.5 text-xs lg:text-sm font-medium rounded-full transition-all duration-200 ${
                  link.active
                    ? 'text-orange-400 bg-orange-500/10 font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                {link.name}
              </a>
            ))}
          </div>

          {/* Right: Actions (White Pill Get Started) */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/app"
              className="px-5 py-2 rounded-full bg-white hover:bg-slate-100 text-sm font-bold text-slate-950 shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-1.5 group"
            >
              <span>Get Started</span>
              <ArrowUpRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform text-slate-950" />
            </Link>
          </div>

          {/* Mobile Menu Toggle Button */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-3 pt-3 pb-4 px-2 bg-[#0b1120]/95 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl space-y-1">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  link.active
                    ? 'text-orange-400 bg-orange-500/10 font-semibold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {link.name}
              </a>
            ))}
            <div className="pt-3 mt-2 border-t border-slate-800 flex flex-col gap-2">
              <Link
                to="/app"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-full text-sm font-bold text-slate-950 bg-white hover:bg-slate-100 transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Get Started</span>
                <ArrowUpRight className="h-3.5 w-3.5 text-slate-950" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};
