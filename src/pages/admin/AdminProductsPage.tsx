import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Edit3,
  PlusCircle,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { AdminConfirmDialog } from '../../components/admin/AdminConfirmDialog';
import { ResilientImage } from '../../components/ui/ResilientImage';
import { useAdminCatalogue } from '../../context/AdminCatalogueContext';
import { useAuth } from '../../context/AuthContext';
import { useDocumentMetadata } from '../../hooks/useDocumentMetadata';
import { formatInrPrice } from '../../lib/whatsapp/buildWhatsAppUrl';
import { AdminAuthExpiredError, deleteAdminProduct } from '../../services/adminApi';
import { isProductAvailable, type Product } from '../../types/catalogue';

function formatUpdatedDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return '';
  }
}

export function AdminProductsPage() {
  const { categories, products, loading, error, reloadAdminData, syncAfterMutation } =
    useAdminCatalogue();
  const { getIdToken, signOutUser } = useAuth();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [publishingFilter, setPublishingFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useDocumentMetadata({
    title: 'All Products — Rooprani Admin',
    description: 'Search, filter, edit, and manage all Rooprani jewellery products.',
  });

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return products.filter((product) => {
      if (selectedCategory !== 'all' && product.category_id !== selectedCategory) {
        return false;
      }
      if (publishingFilter === 'published' && !product.is_published) {
        return false;
      }
      if (publishingFilter === 'draft' && product.is_published) {
        return false;
      }
      if (!query) return true;
      return (
        product.title.toLowerCase().includes(query) ||
        (product.sku && product.sku.toLowerCase().includes(query))
      );
    });
  }, [products, searchQuery, selectedCategory, publishingFilter]);

  // Reset pagination to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, publishingFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + pageSize);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setPublishingFilter('all');
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete || deleting) return;
    setDeleting(true);
    setDeleteError(null);

    try {
      const targetId = productToDelete.numeric_id ?? Number(productToDelete.id);
      await deleteAdminProduct(getIdToken, targetId);
      const deletedTitle = productToDelete.title;
      setProductToDelete(null);
      await syncAfterMutation(`"${deletedTitle}" has been deleted.`);
    } catch (err) {
      if (err instanceof AdminAuthExpiredError) {
        await signOutUser();
        navigate('/account', { replace: true });
        return;
      }
      setDeleteError(
        err instanceof Error
          ? err.message
          : 'Failed to delete product. No changes were made.'
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-7">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.2em] uppercase text-[#8C6B3C] font-medium">
            Catalogue Inventory
          </p>
          <h1 className="mt-1 font-serif text-3xl sm:text-4xl font-normal text-[#221A15]">
            All Products{' '}
            <span className="text-xl text-[#7D7064] tabular-nums">({products.length})</span>
          </h1>
        </div>

        <Link
          to="/admin/products/new"
          className="inline-flex items-center gap-2 px-5 py-3 min-h-[44px] bg-[#231B16] text-[#F6F1E9] text-xs tracking-[0.16em] uppercase font-medium hover:bg-[#3A2D25] transition-colors self-start sm:self-auto whitespace-nowrap"
        >
          <PlusCircle className="w-4 h-4 text-primary" aria-hidden="true" />
          <span>Add Product</span>
        </Link>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-[#FFFDFA] border border-[#E2D8C8] p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search
            className="w-4 h-4 text-[#7D7064] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            aria-label="Search by product title"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by product title or code..."
            className="w-full min-h-[42px] bg-[#FAF6F0] border border-[#D5C9B8] pl-10 pr-9 py-2 text-sm text-[#221A15] placeholder:text-[#96897B] focus:border-[#8C6B3C] focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7D7064] hover:text-[#221A15] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            aria-label="Filter by category"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="min-h-[42px] bg-[#FAF6F0] border border-[#D5C9B8] px-3.5 py-2 text-xs tracking-[0.1em] uppercase text-[#221A15] focus:border-[#8C6B3C] focus:outline-none"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by publishing status"
            value={publishingFilter}
            onChange={(e) =>
              setPublishingFilter(e.target.value as 'all' | 'published' | 'draft')
            }
            className="min-h-[42px] bg-[#FAF6F0] border border-[#D5C9B8] px-3.5 py-2 text-xs tracking-[0.1em] uppercase text-[#221A15] focus:border-[#8C6B3C] focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div
          role="alert"
          className="border border-[#E5B8B2] bg-[#FDF2F0] p-4 flex items-center justify-between gap-4 text-sm text-[#8C2318]"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void reloadAdminData()}
            className="px-4 py-2 border border-[#9F2D20] text-xs uppercase tracking-[0.12em] hover:bg-[#9F2D20] hover:text-white transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading, Empty, or Populated Table / Mobile Cards */}
      {loading ? (
        <div className="border border-[#E2D8C8] bg-[#FFFDFA] divide-y divide-[#EAE1D3]">
          {[0, 1, 2, 3, 4].map((row) => (
            <div key={row} className="p-4 flex items-center gap-4 animate-pulse">
              <div className="w-12 h-16 bg-[#EFE8DC] shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-56 bg-[#EFE8DC]" />
                <div className="h-3 w-36 bg-[#EFE8DC]" />
              </div>
              <div className="h-8 w-24 bg-[#EFE8DC]" />
            </div>
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="border border-[#E2D8C8] bg-[#FFFDFA] py-16 px-6 text-center space-y-4">
          <p className="font-serif text-2xl text-[#221A15]">
            {products.length === 0
              ? 'No jewellery products have been added yet.'
              : 'No products match your search or filters.'}
          </p>
          <p className="text-sm text-[#6B5E53] max-w-md mx-auto">
            {products.length === 0
              ? 'Create your first jewellery listing to publish it to the Rooprani storefront.'
              : 'Try adjusting your search keywords, category, or publishing status filter.'}
          </p>
          {products.length === 0 ? (
            <Link
              to="/admin/products/new"
              className="inline-flex items-center gap-2 px-6 py-3 min-h-[44px] bg-[#231B16] text-[#F6F1E9] text-xs tracking-[0.16em] uppercase font-medium hover:bg-[#3A2D25] transition-colors"
            >
              <PlusCircle className="w-4 h-4 text-primary" aria-hidden="true" />
              <span>Add First Product</span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={resetFilters}
              className="px-6 py-3 min-h-[44px] border border-[#221A15] text-xs tracking-[0.16em] uppercase text-[#221A15] hover:bg-[#231B16] hover:text-[#F6F1E9] transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden lg:block border border-[#E2D8C8] bg-[#FFFDFA] overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E2D8C8] bg-[#FAF6F0] text-[11px] tracking-[0.15em] uppercase text-[#6B5E53]">
                  <th className="py-3.5 px-5 font-medium">Product</th>
                  <th className="py-3.5 px-4 font-medium">Category</th>
                  <th className="py-3.5 px-4 font-medium text-right">Price</th>
                  <th className="py-3.5 px-4 font-medium">Availability</th>
                  <th className="py-3.5 px-4 font-medium">Publishing Status</th>
                  <th className="py-3.5 px-4 font-medium">Last Updated</th>
                  <th className="py-3.5 px-5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE1D3] text-sm">
                {paginatedProducts.map((product) => {
                  const available = isProductAvailable(product.availability_status);
                  return (
                    <tr key={product.id} className="hover:bg-[#FAF6F0]/75 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3.5">
                          <div className="w-12 h-16 shrink-0 overflow-hidden border border-[#DED4C5] bg-[#EFE8DC]">
                            <ResilientImage
                              src={product.image_urls[0] ?? ''}
                              alt={product.title}
                              containerClassName="w-full h-full"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-[#221A15] truncate max-w-[260px]">
                              {product.title}
                            </p>
                            {product.sku && (
                              <p className="text-xs text-[#7D7064] mt-0.5">Code {product.sku}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-[#4A3F36] whitespace-nowrap">
                        {product.category_name}
                      </td>

                      <td className="py-3.5 px-4 text-right font-medium text-[#221A15] tabular-nums whitespace-nowrap">
                        {formatInrPrice(product.price_inr)}
                      </td>

                      <td className="py-3.5 px-4 text-xs whitespace-nowrap">
                        <span className={available ? 'text-[#1F5E3B]' : 'text-[#9F2D20]'}>
                          {available ? 'Available' : 'Unavailable'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-xs whitespace-nowrap">
                        <span
                          className={
                            product.is_published
                              ? 'text-[#221A15] font-medium'
                              : 'text-[#8C6B3C] font-medium'
                          }
                        >
                          {product.is_published ? 'Published' : 'Draft'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-xs text-[#6B5E53] tabular-nums whitespace-nowrap">
                        {formatUpdatedDate(product.updated_at)}
                      </td>

                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-2">
                          <Link
                            to={`/admin/products/${product.id}/edit`}
                            className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[36px] border border-[#D5C9B8] text-xs tracking-[0.12em] uppercase text-[#221A15] hover:border-[#221A15] transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Edit</span>
                          </Link>

                          <button
                            type="button"
                            onClick={() => {
                              setDeleteError(null);
                              setProductToDelete(product);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[36px] border border-[#E5B8B2] text-xs tracking-[0.12em] uppercase text-[#9F2D20] hover:bg-[#FDF2F0] hover:border-[#9F2D20] transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile & Tablet Compact Product Cards */}
          <div className="lg:hidden space-y-3">
            {paginatedProducts.map((product) => {
              const available = isProductAvailable(product.availability_status);
              return (
                <div
                  key={product.id}
                  className="border border-[#E2D8C8] bg-[#FFFDFA] p-4 space-y-4"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-16 h-20 shrink-0 overflow-hidden border border-[#DED4C5] bg-[#EFE8DC]">
                      <ResilientImage
                        src={product.image_urls[0] ?? ''}
                        alt={product.title}
                        containerClassName="w-full h-full"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-xs text-[#6B5E53]">
                        <span>{product.category_name}</span>
                        <span className="mx-1.5" aria-hidden="true">
                          ·
                        </span>
                        <span
                          className={
                            product.is_published
                              ? 'text-[#1F5E3B] font-medium'
                              : 'text-[#8C6B3C] font-medium'
                          }
                        >
                          {product.is_published ? 'Published' : 'Draft'}
                        </span>
                        <span className="mx-1.5" aria-hidden="true">
                          ·
                        </span>
                        <span className={available ? 'text-[#4A3F36]' : 'text-[#9F2D20]'}>
                          {available ? 'Available' : 'Unavailable'}
                        </span>
                      </p>

                      <h2 className="font-serif text-xl text-[#221A15] leading-snug">
                        {product.title}
                      </h2>

                      <p className="text-sm font-medium text-[#221A15] tabular-nums">
                        {formatInrPrice(product.price_inr)}
                        {product.sku ? (
                          <span className="text-xs font-normal text-[#7D7064] ml-2">
                            · Code {product.sku}
                          </span>
                        ) : null}
                      </p>

                      <p className="text-xs text-[#7D7064] tabular-nums">
                        Updated {formatUpdatedDate(product.updated_at)}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#EAE1D3] flex items-center justify-end gap-2.5">
                    <Link
                      to={`/admin/products/${product.id}/edit`}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 min-h-[40px] border border-[#D5C9B8] text-xs tracking-[0.12em] uppercase text-[#221A15] hover:border-[#221A15]"
                    >
                      <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Edit</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => {
                        setDeleteError(null);
                        setProductToDelete(product);
                      }}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 min-h-[40px] border border-[#E5B8B2] text-xs tracking-[0.12em] uppercase text-[#9F2D20] hover:bg-[#FDF2F0] cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Footer */}
          <div className="border border-[#E2D8C8] bg-[#FFFDFA] px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-[#5A4E44] tabular-nums">
            <div className="flex flex-wrap items-center gap-4">
              <span>
                Showing {startIndex + 1}–
                {Math.min(startIndex + pageSize, filteredProducts.length)} of{' '}
                {filteredProducts.length} products
              </span>

              <label className="inline-flex items-center gap-2">
                <span>Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="bg-[#FAF6F0] border border-[#D5C9B8] px-2 py-1 text-xs text-[#221A15] focus:outline-none"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 min-h-[36px] border border-[#D5C9B8] text-[#221A15] hover:border-[#221A15] disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Previous</span>
              </button>

              <span className="px-2">
                Page {safePage} of {totalPages}
              </span>

              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 min-h-[36px] border border-[#D5C9B8] text-[#221A15] hover:border-[#221A15] disabled:opacity-40 cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Delete Product Confirmation Dialog */}
      <AdminConfirmDialog
        open={Boolean(productToDelete)}
        title="Delete Product"
        description={
          productToDelete
            ? `Are you sure you want to permanently delete "${productToDelete.title}"? It will be removed from the Rooprani catalogue and any unreferenced uploaded photos will be cleaned up.`
            : ''
        }
        confirmLabel="Delete Product"
        loading={deleting}
        error={deleteError}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => {
          if (!deleting) {
            setProductToDelete(null);
            setDeleteError(null);
          }
        }}
      />
    </div>
  );
}
