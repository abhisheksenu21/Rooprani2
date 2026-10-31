import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useReducedMotion } from 'motion/react';
import { appConfig } from '../../lib/config/env';
import { WhatsAppButton } from '../ui/WhatsAppButton';

export function Footer() {
  const currentYear = new Date().getFullYear();
  const location = useLocation();
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();

  const handleSectionNavigation = (sectionId: string) => {
    if (location.pathname === '/') {
      const target = document.getElementById(sectionId);
      if (target) {
        target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
        return;
      }
    }
    navigate(`/#${sectionId}`);
  };

  return (
    <footer className="bg-charcoal-deep border-t border-border-subtle text-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-16 md:py-20">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-12 pb-14 border-b border-border-subtle">
          <div className="space-y-3 max-w-sm">
            <Link
              to="/"
              className="inline-block font-display text-2xl tracking-[0.26em] text-foreground hover:text-primary transition-colors"
            >
              ROOPRANI
            </Link>
            <p className="font-serif italic text-lg text-muted">
              Elegance in every detail.
            </p>
            {appConfig.storeAddress && (
              <p className="pt-2 text-xs text-muted leading-relaxed">
                {appConfig.storeAddress}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-10 sm:gap-14 text-sm">
            <div className="space-y-3">
              <p className="text-xs tracking-[0.2em] text-primary">EXPLORE</p>
              <ul className="space-y-2.5 text-muted">
                <li>
                  <button
                    type="button"
                    onClick={() => handleSectionNavigation('collection')}
                    className="hover:text-primary transition-colors duration-200 whitespace-nowrap"
                  >
                    Shop
                  </button>
                </li>
                <li>
                  <Link
                    to="/collections"
                    className="hover:text-primary transition-colors duration-200 whitespace-nowrap"
                  >
                    Collections
                  </Link>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => handleSectionNavigation('our-story')}
                    className="hover:text-primary transition-colors duration-200 whitespace-nowrap"
                  >
                    Our Story
                  </button>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <p className="text-xs tracking-[0.2em] text-primary">CONNECT</p>
              <ul className="space-y-2.5 text-muted">
                <li>
                  <button
                    type="button"
                    onClick={() => handleSectionNavigation('contact')}
                    className="hover:text-primary transition-colors duration-200 whitespace-nowrap"
                  >
                    Contact
                  </button>
                </li>
                <li>
                  <WhatsAppButton variant="inline">
                    WhatsApp{appConfig.whatsappDisplay ? ` (${appConfig.whatsappDisplay})` : ''}
                  </WhatsAppButton>
                </li>
                {appConfig.contactEmail && (
                  <li>
                    <a
                      href={`mailto:${appConfig.contactEmail}`}
                      className="hover:text-primary transition-colors duration-200 break-all"
                    >
                      {appConfig.contactEmail}
                    </a>
                  </li>
                )}
              </ul>
            </div>

            <div className="space-y-3 col-span-2 sm:col-span-1">
              <p className="text-xs tracking-[0.2em] text-primary">LEGAL</p>
              <ul className="space-y-2.5 text-muted">
                <li>
                  <Link
                    to="/privacy"
                    className="hover:text-primary transition-colors duration-200 whitespace-nowrap"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    to="/terms"
                    className="hover:text-primary transition-colors duration-200 whitespace-nowrap"
                  >
                    Terms and Conditions
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="pt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-muted">
          <p>© {currentYear} Rooprani</p>
          <div className="flex items-center gap-4">
            <Link to="/account" className="hover:text-primary transition-colors">
              Profile
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
