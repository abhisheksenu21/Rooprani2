import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { AdminProductForm } from '../../components/admin/AdminProductForm';
import { useDocumentMetadata } from '../../hooks/useDocumentMetadata';

export function AdminAddProductPage() {
  useDocumentMetadata({
    title: 'Add Product — Rooprani Admin',
    description: 'Create and publish a new jewellery piece in the Rooprani catalogue.',
  });

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
          Add Jewellery Product
        </h1>
        <p className="text-sm text-[#6B5E53] mt-1">
          Published and available products appear immediately in the public Rooprani catalogue.
        </p>
      </div>

      <AdminProductForm mode="create" />
    </div>
  );
}
