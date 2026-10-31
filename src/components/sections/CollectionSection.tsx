import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { isProductAvailable, type Category, type Product } from '../../types/catalogue';
import { ProductCard } from '../products/ProductCard';
import { BlurReveal } from '../ui/BlurReveal';
import { WhatsAppButton } from '../ui/WhatsAppButton';

interface CollectionSectionProps {
  products: Product[];
  categories: Category[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => Promise<void>;
}

const ALL_CATEGORY_SLUG = 'all';

export function CollectionSection({
  products,
  categories,
  loading = false,
  error = null,
  onRetry,
}: CollectionSectionProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCategory = searchParams.get('category') || ALL_CATEGORY_SLUG;

  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    const paramCategory = searchParams.get('category');
    if (paramCategory) {
      if (categories.length === 0 || categories.some((c) => c.slug === paramCategory)) {
        setSelectedCategory(paramCategory);
      }
    } else {
      setSelectedCategory(ALL_CATEGORY_SLUG);
    }
  }, [searchParams, categories]);

  const handleCategoryChange = (slug: string) => {
    setSelectedCategory(slug);
    const nextParams = new URLSearchParams(searchParams);
    if (slug === ALL_CATEGORY_SLUG) {
      nextParams.delete('category');
    } else {
      nextParams.set('category', slug);
    }
    setSearchParams(nextParams, { replace: true });
  };

  const activeProducts = useMemo(
    () =>
      products.filter(
        (item) => item.is_published && item.is_active && isProductAvailable(item.availability_status)
      ),
    [products]
  );

  const filteredProducts = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    return activeProducts.filter((product) => {
      const matchesCategory =
        selectedCategory === ALL_CATEGORY_SLUG || product.category_slug === selectedCategory;

      if (!matchesCategory) return false;
      if (!normalizedQuery) return true;

      const productTitle = (product.title || product.name).toLowerCase();
      return (
        productTitle.includes(normalizedQuery) ||
        product.category_name.toLowerCase().includes(normalizedQuery) ||
        product.description.toLowerCase().includes(normalizedQuery) ||
        (product.sku && product.sku.toLowerCase().includes(normalizedQuery))
      );
    });
  }, [activeProducts, selectedCategory, searchQuery]);

  const resetFilters = () => {
    handleCategoryChange(ALL_CATEGORY_SLUG);
    setSearchQuery('');
  };

  return (
    <section
      id="collection"
      aria-labelledby="collection-heading"
      className="py-24 sm:py-28 lg:py-32 px-4 sm:px-8 lg:px-12 bg-background scroll-mt-20"
    >
      <div className="max-w-7xl mx-auto">
        {/* Section Header & Search */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 pb-10 border-b border-border-subtle">
          <BlurReveal>
            <p className="text-xs tracking-[0.24em] text-primary mb-3">THE COLLECTION</p>
            <h2
              id="collection-heading"
              className="font-serif text-[clamp(2rem,4vw,3.15rem)] font-light text-foreground leading-[1.15] text-balance"
            >
              Find your signature.
            </h2>
          </BlurReveal>

          {/* Search Input */}
          <div className="w-full lg:w-80">
            <label htmlFor="catalogue-search" className="sr-only">
              Search jewellery by name, category, or product code
            </label>
            <div className="relative flex items-center border-b border-border-subtle focus-within:border-primary transition-colors duration-200">
              <Search
                className="w-4 h-4 text-muted stroke-[1.5] shrink-0 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="catalogue-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search bangles, kade, necklaces..."
                className="w-full bg-transparent py-2.5 pl-3 pr-8 text-sm text-foreground placeholder:text-muted/75 focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search query"
                  className="absolute right-0 p-1.5 text-muted hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4 stroke-[1.5]" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Category Filter Bar */}
        <div
          role="tablist"
          aria-label="Filter jewellery by category"
          className="mt-6 flex items-center gap-2 sm:gap-3 overflow-x-auto pb-2 no-scrollbar"
        >
          <button
            type="button"
            role="tab"
            aria-selected={selectedCategory === ALL_CATEGORY_SLUG}
            onClick={() => handleCategoryChange(ALL_CATEGORY_SLUG)}
            className={`px-4 py-2.5 min-h-[42px] text-xs tracking-[0.16em] transition-colors duration-200 border whitespace-nowrap shrink-0 cursor-pointer ${
              selectedCategory === ALL_CATEGORY_SLUG
                ? 'border-primary bg-primary text-primary-foreground font-medium'
                : 'border-border-subtle bg-transparent text-muted hover:text-foreground hover:border-primary/50'
            }`}
          >
            All Jewellery
          </button>

          {categories.map((category) => {
            const isSelected = selectedCategory === category.slug;
            return (
              <button
                key={category.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => handleCategoryChange(category.slug)}
                className={`px-4 py-2.5 min-h-[42px] text-xs tracking-[0.16em] transition-colors duration-200 border whitespace-nowrap shrink-0 cursor-pointer ${
                  isSelected
                    ? 'border-primary bg-primary text-primary-foreground font-medium'
                    : 'border-border-subtle bg-transparent text-muted hover:text-foreground hover:border-primary/50'
                }`}
              >
                {category.name}
              </button>
            );
          })}
        </div>

        {/* Loading, Error, Grid, or Empty State */}
        {loading ? (
          <div
            aria-live="polite"
            className="mt-12 grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-4 gap-x-5 sm:gap-x-7 gap-y-12"
          >
            {[0, 1, 2, 3].map((slot) => (
              <div key={slot} className="space-y-4 animate-pulse">
                <div className="aspect-[3/4] w-full bg-surface border border-border-subtle" />
                <div className="h-3 w-24 bg-surface" />
                <div className="h-5 w-3/4 bg-surface" />
                <div className="h-4 w-20 bg-surface" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="mt-14 py-16 px-6 border border-border-subtle bg-surface/50 text-center space-y-4">
            <p className="font-serif text-2xl text-foreground">{error}</p>
            {onRetry && (
              <button
                type="button"
                onClick={() => void onRetry()}
                className="inline-flex items-center justify-center px-6 py-3 min-h-[44px] border border-primary/60 text-xs tracking-[0.18em] text-primary hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer"
              >
                TRY AGAIN
              </button>
            )}
          </div>
        ) : activeProducts.length === 0 ? (
          <div className="mt-14 py-20 px-6 border border-border-subtle bg-surface/50 text-center">
            <p className="text-xs tracking-[0.22em] text-primary uppercase mb-3">
              CURATED CATALOGUE
            </p>
            <p className="font-serif text-2xl sm:text-3xl font-light text-foreground">
              New jewellery pieces are arriving shortly.
            </p>
            <p className="mt-3 text-sm text-muted max-w-md mx-auto leading-relaxed">
              Our boutique catalogue is currently being refreshed. Connect directly with Rooprani on
              WhatsApp for bespoke availability and seasonal designs.
            </p>
            <div className="mt-7">
              <WhatsAppButton variant="outline">ENQUIRE ON WHATSAPP</WhatsAppButton>
            </div>
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="mt-12 grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-4 gap-x-5 sm:gap-x-7 gap-y-12 sm:gap-y-14">
            {filteredProducts.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} />
            ))}
          </div>
        ) : (
          <div className="mt-14 py-20 px-6 border border-border-subtle bg-surface/50 text-center">
            <p className="font-serif text-2xl text-foreground">
              No pieces match your current selection.
            </p>
            <p className="mt-2 text-sm text-muted max-w-md mx-auto">
              Try exploring another jewellery category or clearing your search terms to view our
              available pieces.
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="mt-6 inline-flex items-center justify-center px-6 py-3 min-h-[44px] border border-primary/60 text-xs tracking-[0.18em] text-primary hover:bg-primary hover:text-primary-foreground transition-colors duration-200 whitespace-nowrap shrink-0 cursor-pointer"
            >
              VIEW ALL JEWELLERY
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
