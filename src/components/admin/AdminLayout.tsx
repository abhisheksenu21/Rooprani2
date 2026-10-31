import { useEffect, useState } from 'react';
import {
  Link,
  NavLink,
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  FolderTree,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  Package,
  PlusCircle,
  ShieldAlert,
  X,
} from 'lucide-react';
import { AdminCatalogueProvider, useAdminCatalogue } from '../../context/AdminCatalogueContext';
import { useAuth } from '../../context/AuthContext';

function AdminWorkspaceShell() {
  const { profile, firebaseUser, signOutUser } = useAuth();
  const { notice, clearNotice } = useAdminCatalogue();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await signOutUser();
    navigate('/', { replace: true });
  };

  const navItems = [
    {
      label: 'Dashboard',
      to: '/admin',
      end: true,
      icon: LayoutDashboard,
    },
    {
      label: 'All Products',
      to: '/admin/products',
      end: true,
      icon: Package,
    },
    {
      label: 'Add Product',
      to: '/admin/products/new',
      end: true,
      icon: PlusCircle,
    },
    {
      label: 'Categories',
      to: '/admin/categories',
      end: true,
      icon: FolderTree,
    },
  ];

  const renderSidebarContent = () => (
    <div className="flex flex-col justify-between h-full bg-[#14110F] text-[#EAE2D6] border-r border-[#2B231D]">
      <div>
        {/* Brand Header */}
        <div className="h-20 px-6 flex items-center justify-between border-b border-[#2B231D]">
          <Link
            to="/admin"
            className="font-display text-2xl tracking-[0.24em] text-[#F4EDE2] hover:text-primary transition-colors whitespace-nowrap"
          >
            ROOPRANI
          </Link>
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(false)}
            aria-label="Close sidebar"
            className="lg:hidden min-w-[40px] min-h-[40px] -mr-2 flex items-center justify-center text-[#9E9284] hover:text-[#F4EDE2]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav aria-label="Admin navigation" className="p-4 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 min-h-[44px] text-sm transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-[#241D18] text-primary font-medium border border-[#3E3227]'
                      : 'text-[#C2B6A6] hover:text-[#F4EDE2] hover:bg-[#1C1714] border border-transparent'
                  }`
                }
              >
                <Icon className="w-4 h-4 stroke-[1.6] shrink-0" aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}

          <div className="my-4 border-t border-[#2B231D]" />

          <Link
            to="/"
            className="flex items-center justify-between gap-3 px-4 py-3 min-h-[44px] text-sm text-[#C2B6A6] hover:text-primary hover:bg-[#1C1714] transition-colors whitespace-nowrap"
          >
            <span className="flex items-center gap-3">
              <ExternalLink className="w-4 h-4 stroke-[1.6] shrink-0" aria-hidden="true" />
              <span>View Website</span>
            </span>
          </Link>

          <button
            type="button"
            onClick={() => void handleLogout()}
            className="w-full flex items-center gap-3 px-4 py-3 min-h-[44px] text-sm text-[#C2B6A6] hover:text-[#F2B8B0] hover:bg-[#1C1714] transition-colors whitespace-nowrap cursor-pointer text-left"
          >
            <LogOut className="w-4 h-4 stroke-[1.6] shrink-0" aria-hidden="true" />
            <span>Logout</span>
          </button>
        </nav>
      </div>

      {/* Signed-in Administrator Footer */}
      <div className="p-5 border-t border-[#2B231D] text-xs text-[#9E9284] space-y-1">
        <p className="text-[#EAE2D6] font-medium truncate">Store Administrator</p>
        <p className="truncate">{profile?.email || firebaseUser?.email}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-[100svh] flex bg-[#F6F1E9] text-[#221A15]">
      {/* Desktop Dark Charcoal Sidebar */}
      <aside className="hidden lg:block w-[264px] shrink-0 sticky top-0 h-[100svh]">
        {renderSidebarContent()}
      </aside>

      {/* Mobile Drawer Sidebar */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden flex"
          role="dialog"
          aria-modal="true"
          aria-label="Admin sidebar navigation"
        >
          <div
            className="fixed inset-0 bg-black/65"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative w-[272px] max-w-[85vw] h-full z-10">
            {renderSidebarContent()}
          </div>
        </div>
      )}

      {/* Light Ivory Main Workspace */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar */}
        <header className="h-16 sm:h-20 px-4 sm:px-8 lg:px-10 bg-[#FFFDFA] border-b border-[#E2D8C8] flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden min-w-[44px] min-h-[44px] -ml-2 flex items-center justify-center text-[#221A15] hover:text-[#8C6B3C]"
            >
              <Menu className="w-5 h-5 stroke-[1.6]" />
            </button>

            <div className="min-w-0">
              <p className="text-xs text-[#6B5E53] truncate">
                Rooprani Jewellery · Catalogue Administration
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/admin/products/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[40px] bg-[#231B16] text-[#F6F1E9] text-xs tracking-[0.14em] uppercase font-medium hover:bg-[#3A2D25] transition-colors whitespace-nowrap shrink-0"
            >
              <PlusCircle className="w-3.5 h-3.5 text-primary stroke-[1.75]" aria-hidden="true" />
              <span>Add Product</span>
            </Link>
          </div>
        </header>

        {/* Global Notification Toast Banner */}
        {notice && (
          <div className="px-4 sm:px-8 lg:px-10 pt-6">
            <div
              role={notice.type === 'error' ? 'alert' : 'status'}
              className={`px-4 py-3 border flex items-center justify-between gap-4 text-sm ${
                notice.type === 'error'
                  ? 'bg-[#FDF2F0] border-[#E5B8B2] text-[#8C2318]'
                  : 'bg-[#FBF7EE] border-[#D6BE96] text-[#3B2D1D]'
              }`}
            >
              <span className="flex items-center gap-2.5">
                {notice.type === 'error' ? (
                  <AlertCircle className="w-4 h-4 shrink-0 text-[#9F2D20]" aria-hidden="true" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-[#8C6B3C]" aria-hidden="true" />
                )}
                <span>{notice.message}</span>
              </span>
              <button
                type="button"
                onClick={clearNotice}
                aria-label="Dismiss notification"
                className="text-xs text-[#6B5E53] hover:text-[#221A15] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Main Content Viewport */}
        <main className="flex-1 p-4 sm:p-8 lg:p-10 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function AdminLayout() {
  const { firebaseUser, profile, isAdmin, loading, signOutUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-[100svh] bg-background text-foreground flex items-center justify-center p-6">
        <div className="flex items-center gap-3 text-sm text-muted">
          <Loader2 className="w-4 h-4 animate-spin text-primary" aria-hidden="true" />
          <span>Verifying administrator credentials...</span>
        </div>
      </div>
    );
  }

  // Redirect unauthenticated visitors to Profile sign-in (/account)
  if (!firebaseUser) {
    return <Navigate to="/account" state={{ from: location.pathname }} replace />;
  }

  // Show explicit Access Denied screen to authenticated non-admin accounts
  if (!isAdmin) {
    const handleSwitchAccount = async () => {
      await signOutUser();
      navigate('/account', { replace: true });
    };

    return (
      <div className="min-h-[100svh] bg-background text-foreground flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-lg border border-border-subtle bg-surface p-8 sm:p-10 space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs tracking-[0.2em] text-amber-300 uppercase">
              <ShieldAlert className="w-4 h-4 stroke-[1.6]" aria-hidden="true" />
              <span>Access Denied</span>
            </div>
            <h1 className="font-serif text-3xl font-light text-foreground">
              Administrator permissions required.
            </h1>
            <p className="text-sm text-muted leading-relaxed">
              The account{' '}
              <span className="text-foreground font-medium">
                {profile?.email || firebaseUser.email}
              </span>{' '}
              does not have administrator privileges for Rooprani. Only explicitly authorized
              administrator accounts may manage catalogue products and categories.
            </p>
          </div>

          <div className="pt-4 border-t border-border-subtle flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void handleSwitchAccount()}
              className="px-6 py-3 min-h-[44px] bg-primary text-primary-foreground text-xs tracking-[0.18em] uppercase font-medium hover:bg-foreground hover:text-background transition-colors cursor-pointer whitespace-nowrap"
            >
              Sign Out &amp; Switch Account
            </button>

            <Link
              to="/"
              className="px-5 py-3 min-h-[44px] border border-border-subtle text-xs tracking-[0.18em] uppercase text-foreground hover:border-primary hover:text-primary transition-colors whitespace-nowrap"
            >
              Return to Website
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AdminCatalogueProvider>
      <AdminWorkspaceShell />
    </AdminCatalogueProvider>
  );
}
