import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { Category, Product } from '../types/catalogue';

interface CatalogueContextValue {
  categories: Category[];
  products: Product[];
  loading: boolean;
  error: string | null;
  refreshCatalogue: () => Promise<void>;
}

const CatalogueContext = createContext<CatalogueContextValue | null>(null);

export function CatalogueProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshCatalogue = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch('/api/catalogue');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Unable to load the Rooprani jewellery catalogue.');
      }
      setCategories(Array.isArray(data.categories) ? data.categories : []);
      setProducts(Array.isArray(data.products) ? data.products : []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to load the Rooprani jewellery catalogue.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshCatalogue();
  }, [refreshCatalogue]);

  return (
    <CatalogueContext.Provider
      value={{
        categories,
        products,
        loading,
        error,
        refreshCatalogue,
      }}
    >
      {children}
    </CatalogueContext.Provider>
  );
}

export function useCatalogue() {
  const ctx = useContext(CatalogueContext);
  if (!ctx) {
    throw new Error('useCatalogue must be used within a CatalogueProvider');
  }
  return ctx;
}
