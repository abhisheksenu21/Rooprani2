import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, User, X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useAuth } from '../../context/AuthContext';

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const { firebaseUser, profile } = useAuth();

  const isHomePage = location.pathname === '/';

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 36);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname, location.search, location.hash]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [mobileMenuOpen]);

  const handleSectionNavigation = (sectionId: string) => {
    setMobileMenuOpen(false);
    if (location.pathname === '/') {
      const target = document.getElementById(sectionId);
      if (target) {
        target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
        return;
      }
    }
    navigate(`/#${sectionId}`);
  };

  const showSolidSurface = !isHomePage || isScrolled || mobileMenuOpen;
  const userInitial =
    (profile?.fullName || firebaseUser?.displayName || profile?.email || '')
      .trim()
      .charAt(0)
      .toUpperCase() || null;

  return (
    <>
      <header
        className={`fixed top-0 inset-x-0 z-40 transition-colors duration-300 ${
          showSolidSurface
            ? 'bg-background/88 backdrop-blur-md border-b border-border-subtle'
            : 'bg-transparent border-b border-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 h-16 md:h-20 flex items-center justify-between gap-6">
          {/* Left Zone: Desktop Links / Mobile Menu Button */}
          <div className="flex items-center flex-1">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={mobileMenuOpen}
              className="md:hidden min-w-[44px] min-h-[44px] -ml-2.5 flex items-center justify-center text-foreground hover:text-primary transition-colors"
            >
              <Menu className="w-5 h-5 stroke-[1.5]" aria-hidden="true" />
            </button>

            <nav
              aria-label="Primary Left"
              className="hidden md:flex items-center gap-8 text-xs tracking-[0.2em] text-foreground/85"
            >
              <button
                type="button"
                onClick={() => handleSectionNavigation('collection')}
                className="relative py-1 hover:text-primary transition-colors duration-200 whitespace-nowrap shrink-0 after:content-[''] after:absolute after:left-0 after:bottom-0 after:w-full after:h-px after:bg-primary after:scale-x-0 hover:after:scale-x-100 after:origin-left after:transition-transform after:duration-200"
              >
                SHOP
              </button>
              <Link
                to="/collections"
                className="relative py-1 hover:text-primary transition-colors duration-200 whitespace-nowrap shrink-0 after:content-[''] after:absolute after:left-0 after:bottom-0 after:w-full after:h-px after:bg-primary after:scale-x-0 hover:after:scale-x-100 after:origin-left after:transition-transform after:duration-200"
              >
                COLLECTIONS
              </Link>
            </nav>
          </div>

          {/* Centre Zone: ROOPRANI Wordmark */}
          <Link
            to="/"
            aria-label="Rooprani Home"
            className="group font-display text-2xl md:text-[1.85rem] lg:text-[2.1rem] md:leading-none tracking-[0.26em] text-foreground hover:text-primary transition-colors duration-200 whitespace-nowrap shrink-0"
          >
            <span className="md:hidden">ROOPRANI</span>
            <span className="hidden md:inline-flex items-center">
              <span className="-mr-[0.26em]">ROOP</span>
              <svg
                viewBox="0 0 32 24"
                fill="none"
                aria-hidden="true"
                className="w-[0.92em] h-[0.7em] mx-[0.2em] -translate-y-[0.06em] text-primary shrink-0 transition-transform duration-200 group-hover:scale-105"
              >
                <path
                  d="M5.5 17.5L3.2 9.2L7.4 13.5L10.2 6.4L13.2 12.6L16 3.8L18.8 12.6L21.8 6.4L24.6 13.5L28.8 9.2L26.5 17.5H5.5Z"
                  fill="currentColor"
                  fillOpacity="0.18"
                  stroke="currentColor"
                  strokeWidth="1.35"
                  strokeLinejoin="round"
                />
                <path
                  d="M5.5 17.5H26.5L25.8 20.8H6.2L5.5 17.5Z"
                  fill="currentColor"
                  fillOpacity="0.28"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinejoin="round"
                />
                <circle cx="16" cy="2.3" r="1.3" fill="currentColor" />
                <circle cx="10.2" cy="4.9" r="1.05" fill="currentColor" />
                <circle cx="21.8" cy="4.9" r="1.05" fill="currentColor" />
                <circle cx="3" cy="7.8" r="0.95" fill="currentColor" />
                <circle cx="29" cy="7.8" r="0.95" fill="currentColor" />
                <circle cx="16" cy="19.15" r="0.85" fill="currentColor" />
                <circle cx="11.2" cy="19.15" r="0.7" fill="currentColor" />
                <circle cx="20.8" cy="19.15" r="0.7" fill="currentColor" />
              </svg>
              <span className="-mr-[0.26em]">RANI</span>
            </span>
          </Link>

          {/* Right Zone: Desktop Links + Profile Icon */}
          <div className="flex items-center justify-end gap-4 sm:gap-6 flex-1">
            <nav
              aria-label="Primary Right"
              className="hidden md:flex items-center gap-8 text-xs tracking-[0.2em] text-foreground/85 mr-1"
            >
              <button
                type="button"
                onClick={() => handleSectionNavigation('our-story')}
                className="relative py-1 hover:text-primary transition-colors duration-200 whitespace-nowrap shrink-0 after:content-[''] after:absolute after:left-0 after:bottom-0 after:w-full after:h-px after:bg-primary after:scale-x-0 hover:after:scale-x-100 after:origin-left after:transition-transform after:duration-200"
              >
                OUR STORY
              </button>
              <button
                type="button"
                onClick={() => handleSectionNavigation('contact')}
                className="relative py-1 hover:text-primary transition-colors duration-200 whitespace-nowrap shrink-0 after:content-[''] after:absolute after:left-0 after:bottom-0 after:w-full after:h-px after:bg-primary after:scale-x-0 hover:after:scale-x-100 after:origin-left after:transition-transform after:duration-200"
              >
                CONTACT
              </button>
            </nav>

            <div className="flex items-center gap-1 sm:gap-2 -mr-2.5">
              <Link
                to="/account"
                aria-label={firebaseUser ? 'My Profile' : 'Sign in to Profile'}
                title={firebaseUser ? 'My Profile' : 'Sign in to Profile'}
                className={`min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors duration-200 shrink-0 ${
                  location.pathname === '/account'
                    ? 'text-primary'
                    : 'text-foreground/90 hover:text-primary'
                }`}
              >
                {firebaseUser && userInitial ? (
                  <span className="w-7 h-7 border border-primary/70 bg-surface/80 text-primary text-xs font-medium flex items-center justify-center">
                    {userInitial}
                  </span>
                ) : (
                  <User className="w-5 h-5 stroke-[1.5]" aria-hidden="true" />
                )}
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 z-50 md:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-xs"
            />

            <motion.aside
              initial={prefersReducedMotion ? { opacity: 1 } : { x: '-100%' }}
              animate={prefersReducedMotion ? { opacity: 1 } : { x: 0 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { x: '-100%' }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-[82vw] max-w-xs h-full bg-background border-r border-border-subtle flex flex-col justify-between p-6"
            >
              <div>
                <div className="flex items-center justify-between pb-6 border-b border-border-subtle">
                  <Link
                    to="/"
                    onClick={() => setMobileMenuOpen(false)}
                    className="font-display text-xl tracking-[0.24em] text-foreground"
                  >
                    ROOPRANI
                  </Link>
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    aria-label="Close navigation menu"
                    className="min-w-[44px] min-h-[44px] -mr-2 flex items-center justify-center text-muted hover:text-foreground transition-colors"
                  >
                    <X className="w-5 h-5 stroke-[1.5]" aria-hidden="true" />
                  </button>
                </div>

                <nav aria-label="Mobile" className="mt-8 flex flex-col space-y-2">
                  <button
                    type="button"
                    onClick={() => handleSectionNavigation('collection')}
                    className="w-full text-left py-3.5 text-sm tracking-[0.2em] text-foreground hover:text-primary transition-colors border-b border-border-subtle/60"
                  >
                    SHOP
                  </button>
                  <Link
                    to="/collections"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-left py-3.5 text-sm tracking-[0.2em] text-foreground hover:text-primary transition-colors border-b border-border-subtle/60"
                  >
                    COLLECTIONS
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleSectionNavigation('our-story')}
                    className="w-full text-left py-3.5 text-sm tracking-[0.2em] text-foreground hover:text-primary transition-colors border-b border-border-subtle/60"
                  >
                    OUR STORY
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSectionNavigation('contact')}
                    className="w-full text-left py-3.5 text-sm tracking-[0.2em] text-foreground hover:text-primary transition-colors border-b border-border-subtle/60"
                  >
                    CONTACT
                  </button>
                  <Link
                    to="/account"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-left py-3.5 text-sm tracking-[0.2em] text-foreground hover:text-primary transition-colors"
                  >
                    {firebaseUser ? 'MY PROFILE' : 'PROFILE / SIGN IN'}
                  </Link>
                </nav>
              </div>

              <div className="pt-6 border-t border-border-subtle">
                <p className="font-serif italic text-base text-muted leading-relaxed">
                  Elegance in every detail.
                </p>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
