import React, { useState } from 'react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { Modal } from '../components/Modal';
import { HeroSection } from '../sections/HeroSection';
import { CapabilitiesStrip } from '../sections/CapabilitiesStrip';
import { HowItWorksSection } from '../sections/HowItWorksSection';
import { FeaturesSection } from '../sections/FeaturesSection';
import { ProductPreviewSection } from '../sections/ProductPreviewSection';
import { ArchitectureSection } from '../sections/ArchitectureSection';
import { FinalCtaSection } from '../sections/FinalCtaSection';

export const LandingPage: React.FC = () => {
  const [authModalState, setAuthModalState] = useState<{
    isOpen: boolean;
    mode: 'signin' | 'getstarted';
  }>({
    isOpen: false,
    mode: 'signin',
  });

  const handleOpenAuthModal = (mode: 'signin' | 'getstarted') => {
    setAuthModalState({
      isOpen: true,
      mode,
    });
  };

  const handleCloseAuthModal = () => {
    setAuthModalState((prev) => ({
      ...prev,
      isOpen: false,
    }));
  };

  return (
    <div className="min-h-screen bg-[#050811] text-slate-100 flex flex-col font-sans selection:bg-orange-500 selection:text-white">
      {/* Sticky Dark Navigation */}
      <Navbar onOpenAuthModal={handleOpenAuthModal} />

      {/* Main Landing Page Content */}
      <main className="flex-grow">
        {/* Section 1: Hero Section */}
        <HeroSection />

        {/* Section 1b: Trust & Capabilities Strip */}
        <CapabilitiesStrip />

        {/* Section 2: How It Works Process Timeline */}
        <HowItWorksSection />

        {/* Section 3: Security Architecture & Big Metrics */}
        <ArchitectureSection />

        {/* Section 4: Enterprise Capabilities & Core Features */}
        <FeaturesSection />

        {/* Section 5: Interactive 3-Panel Product Preview */}
        <ProductPreviewSection />

        {/* Section 6: Final Call to Action */}
        <FinalCtaSection onOpenAuthModal={handleOpenAuthModal} />
      </main>

      {/* Section 7: Enterprise Footer with Newsletter & Watermark */}
      <Footer />

      {/* Enterprise Authentication Informational Modal */}
      <Modal
        isOpen={authModalState.isOpen}
        onClose={handleCloseAuthModal}
        title={
          authModalState.mode === 'signin'
            ? 'Enterprise Sign In'
            : 'Get Started with Privacy Gateway'
        }
        subtitle={
          authModalState.mode === 'signin'
            ? 'Phase 8: Enterprise SAML 2.0 / OIDC Integration'
            : 'Phase 2 Application Dashboard Edition'
        }
      />
    </div>
  );
};

