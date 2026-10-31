import { useEffect, type ReactNode } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useReducedMotion } from 'motion/react';
import { useCatalogue } from '../../context/CatalogueContext';
import { Footer } from './Footer';
import { Navbar } from './Navbar';

interface PageShellProps {
  children?: ReactNode;
}

export function PageShell({ children }: PageShellProps) {
  const location = useLocation();
  const prefersReducedMotion = useReducedMotion();
  const { refreshCatalogue } = useCatalogue();

  useEffect(() => {
    void refreshCatalogue();
  }, [refreshCatalogue]);

  useEffect(() => {
    if (location.hash) {
      const targetId = location.hash.replace(/^#/, '');
      const timer = window.setTimeout(() => {
        const element = document.getElementById(targetId);
        if (element) {
          element.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
        }
      }, 60);
      return () => window.clearTimeout(timer);
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname, location.hash, prefersReducedMotion]);

  return (
    <div className="min-h-[100svh] flex flex-col bg-background text-foreground">
      <Navbar />
      <main id="main-content" className="flex-1">
        {children ?? <Outlet />}
      </main>
      <Footer />
    </div>
  );
}
