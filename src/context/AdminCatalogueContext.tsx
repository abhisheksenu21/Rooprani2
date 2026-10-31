import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AdminAuthExpiredError,
  fetchAdminDashboard,
} from '../services/adminApi';
import type {
  AdminSummary,
  Category,
  CustomerEnquiry,
  Product,
} from '../types/catalogue';
import { useAuth } from './AuthContext';
import { useCatalogue } from './CatalogueContext';

export interface AdminNotice {
  type: 'success' | 'error';
  message: string;
}

interface AdminCatalogueContextValue {
  summary: AdminSummary;
  categories: Category[];
  products: Product[];
  enquiries: CustomerEnquiry[];
  loading: boolean;
  error: string | null;
  notice: AdminNotice | null;
  showNotice: (type: 'success' | 'error', message: string) => void;
  clearNotice: () => void;
  reloadAdminData: () => Promise<void>;
  syncAfterMutation: (successMessage?: string) => Promise<void>;
}

const DEFAULT_SUMMARY: AdminSummary = {
  totalProducts: 0,
  publishedProducts: 0,
  draftProducts: 0,
  totalCategories: 0,
};

const AdminCatalogueContext = createContext<AdminCatalogueContextValue | null>(null);

export function AdminCatalogueProvider({ children }: { children: ReactNode }) {
  const { firebaseUser, isAdmin, getIdToken, signOutUser } = useAuth();
  const { refreshCatalogue } = useCatalogue();
  const navigate = useNavigate();

  const [summary, setSummary] = useState<AdminSummary>(DEFAULT_SUMMARY);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [enquiries, setEnquiries] = useState<CustomerEnquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<AdminNotice | null>(null);

  const clearNotice = useCallback(() => setNotice(null), []);

  const showNotice = useCallback((type: 'success' | 'error', message: string) => {
    setNotice({ type, message });
    if (type === 'success') {
      window.setTimeout(() => {
        setNotice((prev) => (prev?.message === message ? null : prev));
      }, 4500);
    }
  }, []);

  const reloadAdminData = useCallback(async () => {
    if (!firebaseUser || !isAdmin) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminDashboard(getIdToken);
      setSummary(data.summary ?? DEFAULT_SUMMARY);
      setCategories(Array.isArray(data.categories) ? data.categories : []);
      setProducts(Array.isArray(data.products) ? data.products : []);
      setEnquiries(Array.isArray(data.enquiries) ? data.enquiries : []);
    } catch (err) {
      if (err instanceof AdminAuthExpiredError) {
        await signOutUser();
        navigate('/account', { replace: true });
        return;
      }
      setError(
        err instanceof Error ? err.message : 'Unable to load administrator catalogue data.'
      );
    } finally {
      setLoading(false);
    }
  }, [firebaseUser, isAdmin, getIdToken, signOutUser, navigate]);

  useEffect(() => {
    if (firebaseUser && isAdmin) {
      void reloadAdminData();
    }
  }, [firebaseUser, isAdmin, reloadAdminData]);

  const syncAfterMutation = useCallback(
    async (successMessage?: string) => {
      await Promise.all([reloadAdminData(), refreshCatalogue()]);
      if (successMessage) {
        showNotice('success', successMessage);
      }
    },
    [reloadAdminData, refreshCatalogue, showNotice]
  );

  return (
    <AdminCatalogueContext.Provider
      value={{
        summary,
        categories,
        products,
        enquiries,
        loading,
        error,
        notice,
        showNotice,
        clearNotice,
        reloadAdminData,
        syncAfterMutation,
      }}
    >
      {children}
    </AdminCatalogueContext.Provider>
  );
}

export function useAdminCatalogue() {
  const ctx = useContext(AdminCatalogueContext);
  if (!ctx) {
    throw new Error('useAdminCatalogue must be used within an AdminCatalogueProvider');
  }
  return ctx;
}
