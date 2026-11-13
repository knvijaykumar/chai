import React, { useState } from 'react';
import { Instagram, Facebook, Linkedin, Twitter, ArrowUpRight } from 'lucide-react';

export const Footer: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setIsSubscribed(true);
      setTimeout(() => setIsSubscribed(false), 3000);
      setEmail('');
    }
  };

  return (
    <footer className="relative bg-[#04060c] text-white pt-20 pb-12 overflow-hidden border-t border-slate-900">
      {/* Background Subtle Orange Glow */}
      <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-96 h-96 bg-orange-600/5 rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* ========================================================
            TOP SECTION: Brand + 3 Link Columns
        ======================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 pb-16 border-b border-slate-900">
          
          {/* Brand & Socials (Cols 1-5) */}
          <div className="lg:col-span-5 space-y-6 text-left">
            {/* Brand Logo */}
            <div className="flex items-center gap-3">
              <img
                src="/logo-transparent.png"
                alt="cybrix."
                className="h-8 sm:h-9 w-auto object-contain drop-shadow-[0_0_12px_rgba(249,115,22,0.35)]"
              />
            </div>

            {/* Paragraph matching screenshot copy style */}
            <p className="text-sm text-slate-400 max-w-sm leading-relaxed font-normal">
              Protect your business 24/7 with proactive cyber security, real-time monitoring, and expert support.
            </p>

            {/* Follow Us On: Circular Social Icons */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-400 font-medium">Follow us on</span>
                <div className="flex items-center gap-2">
                  {/* Instagram in Vibrant Orange Circle */}
                  <a
                    href="#"
                    aria-label="Instagram"
                    className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-md shadow-orange-500/25 hover:scale-110 transition-transform"
                  >
                    <Instagram className="h-4 w-4" />
                  </a>

                  {/* Facebook */}
                  <a
                    href="#"
                    aria-label="Facebook"
                    className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
                  >
                    <Facebook className="h-4 w-4" />
                  </a>

                  {/* LinkedIn */}
                  <a
                    href="#"
                    aria-label="LinkedIn"
                    className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
                  >
                    <Linkedin className="h-4 w-4" />
                  </a>

                  {/* X (Twitter) */}
                  <a
                    href="#"
                    aria-label="X"
                    className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
                  >
                    <Twitter className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Company Column (Cols 6-7) */}
          <div className="lg:col-span-2 space-y-4 text-left">
            <h4 className="text-sm font-bold text-white tracking-wide">Company</h4>
            <ul className="space-y-3 text-sm text-slate-400">
              <li><a href="#overview" className="hover:text-white transition-colors">About Us</a></li>
              <li><a href="#how-it-works" className="hover:text-white transition-colors">Our Arenas</a></li>
              <li><a href="#security" className="hover:text-white transition-colors">Press & Media</a></li>
              <li><a href="#features" className="hover:text-white transition-colors">Careers</a></li>
            </ul>
          </div>

          {/* Support Column (Cols 8-9) */}
          <div className="lg:col-span-2 space-y-4 text-left">
            <h4 className="text-sm font-bold text-white tracking-wide">Support</h4>
            <ul className="space-y-3 text-sm text-slate-400">
              <li><a href="#security" className="hover:text-white transition-colors">Team</a></li>
              <li><a href="#overview" className="hover:text-white transition-colors">About</a></li>
              <li><a href="#features" className="hover:text-white transition-colors">FAQs</a></li>
              <li><a href="#preview" className="hover:text-white transition-colors">Sports Guide</a></li>
            </ul>
          </div>

          {/* Contact Column (Cols 10-12) */}
          <div className="lg:col-span-3 space-y-4 text-left">
            <h4 className="text-sm font-bold text-white tracking-wide">Contact</h4>
            <ul className="space-y-3 text-sm text-slate-400">
              <li className="hover:text-white transition-colors">hello@arenix.com</li>
              <li className="hover:text-white transition-colors">+880 1700 000 000</li>
              <li className="text-slate-400">Dhaka, Bangladesh</li>
              <li className="text-slate-500 text-xs">Mon–Fri, 9am–6pm</li>
            </ul>
          </div>

        </div>

        {/* ========================================================
            BOTTOM SECTION: Newsletter Pill + Massive Brand Watermark
        ======================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center py-16 border-b border-slate-900">
          
          {/* Left: Newsletter Form Pill */}
          <div className="lg:col-span-6 space-y-4 text-left">
            <h3 className="text-2xl font-bold text-white tracking-tight">Newsletter</h3>
            <p className="text-sm text-slate-400 max-w-md leading-relaxed">
              Get court availability exclusive booking deals, and the latest arena news delivered straight to your inbox every week.
            </p>

            {/* Dark Rounded Pill Input with White Circle Arrow Button */}
            <form onSubmit={handleSubmit} className="pt-2 max-w-md">
              <div className="relative flex items-center">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email address"
                  className="w-full h-14 pl-6 pr-16 rounded-full bg-slate-900/90 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
                  required
                />
                <button
                  type="submit"
                  aria-label="Subscribe"
                  className="absolute right-2 top-2 bottom-2 w-10 h-10 rounded-full bg-white hover:bg-slate-100 flex items-center justify-center text-slate-950 shadow-md group transition-transform hover:scale-105"
                >
                  <ArrowUpRight className="h-4 w-4 text-slate-950 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </button>
              </div>
              {isSubscribed && (
                <p className="text-xs text-orange-400 mt-2 font-medium">
                  ✓ Successfully subscribed to executive updates!
                </p>
              )}
            </form>
          </div>

          {/* Right: Massive Iconic Brand Watermark Graphic */}
          <div className="lg:col-span-6 flex items-center justify-center lg:justify-end select-none">
            <div className="opacity-95 hover:opacity-100 transition-opacity">
              <img
                src="/logo-transparent.png"
                alt="cybrix."
                className="h-20 sm:h-28 md:h-32 w-auto object-contain drop-shadow-[0_0_36px_rgba(249,115,22,0.45)]"
              />
            </div>
          </div>

        </div>

        {/* ========================================================
            VERY BOTTOM BAR: Copyright & Legal
        ======================================================== */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            2026 © Privacy Gateway Enterprise. All rights reserved.
          </div>
          <div className="flex items-center gap-6 text-slate-400">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms & Conditions</a>
          </div>
        </div>

      </div>
    </footer>
  );
};
