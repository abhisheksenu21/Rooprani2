import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { AdminProductForm } from '../../components/admin/AdminProductForm';
import { useAuth } from '../../context/AuthContext';
import { useDocumentMetadata } from '../../hooks/useDocumentMetadata';
import { AdminAuthExpiredError, fetchAdminProductById } from '../../services/adminApi';
import type { Product } from '../../types/catalogue';

export function AdminEditProductPage() {
  const { id } = useParams<{ id: string }>();
  const { getIdToken, signOutUser } = useAuth();
  const navigate = useNavigate();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useDocumentMetadata({
    title: product ? `Edit ${product.title} — Rooprani Admin` : 'Edit Product — Rooprani Admin',
    description: 'Update product details, photos, pricing, and publishing status.',
  });

  useEffect(() => {
    let active = true;
    const numericId = Number(id);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      setError('Invalid product identifier.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    fetchAdminProductById(getIdToken, numericId)
      .then((loaded) => {
        if (active) setProduct(loaded);
      })
      .catch(async (err) => {
        if (!active) return;
        if (err instanceof AdminAuthExpiredError) {
          await signOutUser();
          navigate('/account', { replace: true });
          return;
        }
        setError(err instanceof Error ? err.message : 'Unable to load product.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id, getIdToken, signOutUser, navigate]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/admin/products"
          className="inline-flex items-center gap-1.5 text-xs tracking-[0.15em] uppercase text-[#6B5E53] hover:text-[#221A15] transition-colors mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Back to All Products</span>
        </Link>
        <h1 className="font-serif text-3xl sm:text-4xl font-normal text-[#221A15]">
          {product ? `Edit: ${product.title}` : 'Edit Product'}
        </h1>
      </div>

      {loading ? (
        <div className="border border-[#E2D8C8] bg-[#FFFDFA] p-12 flex items-center justify-center gap-3 text-sm text-[#6B5E53]">
          <Loader2 className="w-4 h-4 animate-spin text-[#8C6B3C]" aria-hidden="true" />
          <span>Loading product details...</span>
        </div>
      ) : error || !product ? (
        <div className="border border-[#E5B8B2] bg-[#FDF2F0] p-6 space-y-4 text-sm text-[#8C2318]">
          <p>{error || 'Product not found.'}</p>
          <Link
            to="/admin/products"
            className="inline-flex items-center px-4 py-2 border border-[#9F2D20] text-xs uppercase tracking-[0.14em]"
          >
            Return to All Products
          </Link>
        </div>
      ) : (
        <AdminProductForm key={product.id} mode="edit" initialProduct={product} />
      )}
    </div>
  );
}
