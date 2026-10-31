/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { PageShell } from './components/layout/PageShell';
import { AuthProvider } from './context/AuthContext';
import { CatalogueProvider } from './context/CatalogueContext';
import { WhatsAppEnquiryProvider } from './context/WhatsAppEnquiryContext';
import { HomePage } from './pages/HomePage';

const CollectionsPage = lazy(() =>
  import('./pages/CollectionsPage').then((m) => ({ default: m.CollectionsPage }))
);
const ProductDetailPage = lazy(() =>
  import('./pages/ProductDetailPage').then((m) => ({ default: m.ProductDetailPage }))
);
const AccountStatusPage = lazy(() =>
  import('./pages/AccountStatusPage').then((m) => ({ default: m.AccountStatusPage }))
);
const PrivacyPolicyPage = lazy(() =>
  import('./pages/LegalPage').then((m) => ({ default: m.PrivacyPolicyPage }))
);
const TermsPage = lazy(() =>
  import('./pages/LegalPage').then((m) => ({ default: m.TermsPage }))
);
const NotFoundPage = lazy(() =>
  import('./pages/LegalPage').then((m) => ({ default: m.NotFoundPage }))
);

const AdminLayout = lazy(() =>
  import('./components/admin/AdminLayout').then((m) => ({ default: m.AdminLayout }))
);
const AdminOverviewPage = lazy(() =>
  import('./pages/admin/AdminOverviewPage').then((m) => ({ default: m.AdminOverviewPage }))
);
const AdminProductsPage = lazy(() =>
  import('./pages/admin/AdminProductsPage').then((m) => ({ default: m.AdminProductsPage }))
);
const AdminAddProductPage = lazy(() =>
  import('./pages/admin/AdminAddProductPage').then((m) => ({ default: m.AdminAddProductPage }))
);
const AdminEditProductPage = lazy(() =>
  import('./pages/admin/AdminEditProductPage').then((m) => ({ default: m.AdminEditProductPage }))
);
const AdminCategoriesPage = lazy(() =>
  import('./pages/admin/AdminCategoriesPage').then((m) => ({ default: m.AdminCategoriesPage }))
);

function RouteLoadingFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="min-h-[60vh] bg-background flex items-center justify-center px-6 py-24"
    >
      <div className="flex items-center gap-3 text-xs tracking-[0.22em] uppercase text-muted">
        <span
          aria-hidden="true"
          className="w-2 h-2 rounded-full bg-primary animate-pulse"
        />
        <span>Loading Rooprani...</span>
      </div>
    </div>
  );
}

export default function App() {
  const [mapsQuotaExceeded, setMapsQuotaExceeded] = useState(false);

  useEffect(() => {
    const handleQuotaExceeded = () => setMapsQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuotaExceeded);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuotaExceeded);
  }, []);

  return (
    <BrowserRouter>
      {mapsQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}
      <AuthProvider>
        <CatalogueProvider>
          <WhatsAppEnquiryProvider>
            <Suspense fallback={<RouteLoadingFallback />}>
              <Routes>
                {/* Redirect legacy /admin/login to unified Profile sign-in */}
                <Route path="/admin/login" element={<Navigate to="/account" replace />} />

                {/* Protected Admin Workspace Routes */}
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<AdminOverviewPage />} />
                  <Route path="products" element={<AdminProductsPage />} />
                  <Route path="products/new" element={<AdminAddProductPage />} />
                  <Route path="products/:id/edit" element={<AdminEditProductPage />} />
                  <Route path="categories" element={<AdminCategoriesPage />} />
                  <Route path="*" element={<Navigate to="/admin" replace />} />
                </Route>

                {/* Public Luxury Storefront Routes */}
                <Route element={<PageShell />}>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/collections" element={<CollectionsPage />} />
                  <Route path="/products/:slug" element={<ProductDetailPage />} />
                  <Route path="/account" element={<AccountStatusPage />} />
                  <Route path="/privacy" element={<PrivacyPolicyPage />} />
                  <Route path="/terms" element={<TermsPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Route>
              </Routes>
            </Suspense>
          </WhatsAppEnquiryProvider>
        </CatalogueProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
