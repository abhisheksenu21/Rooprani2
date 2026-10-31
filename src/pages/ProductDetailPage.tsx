import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Loader2 } from 'lucide-react';
import { ProductCard } from '../components/products/ProductCard';
import { BlurReveal } from '../components/ui/BlurReveal';
import { ResilientImage } from '../components/ui/ResilientImage';
import { WhatsAppButton } from '../components/ui/WhatsAppButton';
import { useCatalogue } from '../context/CatalogueContext';
import { useDocumentMetadata } from '../hooks/useDocumentMetadata';
import { formatInrPrice } from '../lib/whatsapp/buildWhatsAppUrl';
import { formatAvailabilityLabel, isProductAvailable } from '../types/catalogue';

export function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { products, loading } = useCatalogue();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    setSelectedImageIndex(0);
  }, [slug]);

  const product = useMemo(
    () =>
      products.find(
        (item) =>
          item.slug === slug &&
          item.is_published &&
          item.is_active &&
          isProductAvailable(item.availability_status)
      ),
    [products, slug]
  );

  const productTitle = product ? product.title || product.name : '';

  useDocumentMetadata({
    title: product
      ? `${productTitle} — Rooprani Jewellery Catalogue`
      : loading
        ? 'Rooprani Jewellery Catalogue'
        : 'Piece Not Found — Rooprani',
    description: product
      ? `${productTitle} (${formatInrPrice(product.price_inr)}) — ${product.description}`
      : 'Explore thoughtfully curated artificial jewellery, bangles, kade, necklaces, and earrings by Rooprani.',
  });

  const relatedProducts = useMemo(() => {
    if (!product) return [];
    const sameCategory = products.filter(
      (item) =>
        item.is_published &&
        item.is_active &&
        isProductAvailable(item.availability_status) &&
        item.id !== product.id &&
        item.category_slug === product.category_slug
    );
    const others = products.filter(
      (item) =>
        item.is_published &&
        item.is_active &&
        isProductAvailable(item.availability_status) &&
        item.id !== product.id &&
        item.category_slug !== product.category_slug
    );
    return [...sameCategory, ...others].slice(0, 4);
  }, [products, product]);

  if (loading && !product) {
    return (
      <section className="pt-36 pb-28 px-4 sm:px-8 lg:px-12 bg-background">
        <div className="max-w-2xl mx-auto border border-border-subtle bg-surface/40 p-12 flex items-center justify-center gap-3 text-sm text-muted">
          <Loader2 className="w-4 h-4 animate-spin text-primary" aria-hidden="true" />
          <span>Loading jewellery details...</span>
        </div>
      </section>
    );
  }

  if (!product) {
    return (
      <section className="pt-36 pb-28 px-4 sm:px-8 lg:px-12 bg-background">
        <div className="max-w-2xl mx-auto text-center border border-border-subtle bg-surface/40 p-10 sm:p-16">
          <p className="text-xs tracking-[0.24em] text-primary mb-3">CATALOGUE NOTICE</p>
          <h1 className="font-serif text-3xl sm:text-4xl font-light text-foreground">
            This piece is unavailable.
          </h1>
          <p className="mt-4 text-sm sm:text-base font-light text-muted leading-relaxed">
            The jewellery piece you followed may have been archived, sold out, or moved. Explore
            our active collection to discover available pieces.
          </p>
          <div className="mt-8">
            <Link
              to="/#collection"
              className="inline-flex items-center gap-2 px-7 py-3.5 min-h-[46px] border border-primary/70 text-xs tracking-[0.2em] text-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4 stroke-[1.5]" aria-hidden="true" />
              <span>RETURN TO COLLECTION</span>
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const images = product.image_urls.length > 0 ? product.image_urls : [''];
  const activeImage = images[selectedImageIndex] ?? images[0] ?? '';
  const availabilityLabel = formatAvailabilityLabel(product.availability_status);

  return (
    <div className="pt-24 sm:pt-28 pb-24 sm:pb-32 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12">
        {/* Breadcrumb Navigation */}
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-2 text-xs text-muted pb-8"
        >
          <Link to="/" className="hover:text-primary transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5 stroke-[1.5]" aria-hidden="true" />
          <Link
            to={`/?category=${product.category_slug}#collection`}
            className="hover:text-primary transition-colors"
          >
            {product.category_name}
          </Link>
          <ChevronRight className="w-3.5 h-3.5 stroke-[1.5]" aria-hidden="true" />
          <span className="text-foreground/90 truncate max-w-[240px] sm:max-w-none">
            {productTitle}
          </span>
        </nav>

        {/* Contiguous Gallery + Enquiry Module */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
          {/* Left: Product Gallery */}
          <div className="lg:col-span-6 space-y-4">
            <div className="aspect-[3/4] w-full overflow-hidden border border-border-subtle bg-surface">
              <ResilientImage
                src={activeImage}
                alt={`${productTitle} — ${product.category_name}`}
                fallbackLabel={productTitle}
                priority
                containerClassName="w-full h-full"
                className="w-full h-full object-cover"
              />
            </div>

            {images.length > 1 && (
              <div className="grid grid-cols-4 gap-3">
                {images.map((imgUrl, idx) => (
                  <button
                    key={`${product.id}-thumb-${idx}`}
                    type="button"
                    onClick={() => setSelectedImageIndex(idx)}
                    aria-label={`View image ${idx + 1} of ${productTitle}`}
                    className={`aspect-[3/4] overflow-hidden border transition-colors cursor-pointer ${
                      selectedImageIndex === idx
                        ? 'border-primary'
                        : 'border-border-subtle opacity-70 hover:opacity-100'
                    }`}
                  >
                    <ResilientImage
                      src={imgUrl}
                      alt={`${productTitle} view ${idx + 1}`}
                      containerClassName="w-full h-full"
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Contiguous Product Details & Enquiry-to-Buy */}
          <div className="lg:col-span-6 lg:sticky lg:top-28">
            <BlurReveal>
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted">
                <span className="uppercase tracking-[0.18em] text-primary">
                  {product.category_name}
                </span>
                <span aria-hidden="true">·</span>
                <span>{availabilityLabel}</span>
                {product.sku && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>Code {product.sku}</span>
                  </>
                )}
              </div>

              <h1 className="mt-3 font-serif text-[clamp(2rem,3.6vw,3rem)] font-light text-foreground leading-[1.15] text-balance">
                {productTitle}
              </h1>

              <p className="mt-5 text-2xl sm:text-[1.75rem] font-normal text-foreground tabular-nums">
                {formatInrPrice(product.price_inr)}
              </p>

              <div className="mt-7 pt-7 border-t border-border-subtle space-y-6">
                <p className="text-sm sm:text-base font-light text-foreground/85 leading-relaxed">
                  {product.description}
                </p>

                {product.variants && (product.variants.finish || product.variants.sizes?.length) && (
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-sm">
                    {product.variants.finish && (
                      <div className="border-t border-border-subtle/70 pt-3">
                        <dt className="text-xs tracking-[0.16em] text-muted uppercase">Finish</dt>
                        <dd className="mt-1 text-foreground">{product.variants.finish}</dd>
                      </div>
                    )}
                    {product.variants.sizes && product.variants.sizes.length > 0 && (
                      <div className="border-t border-border-subtle/70 pt-3">
                        <dt className="text-xs tracking-[0.16em] text-muted uppercase">
                          Available Sizes
                        </dt>
                        <dd className="mt-1 text-foreground">
                          {product.variants.sizes.join(' · ')}
                        </dd>
                      </div>
                    )}
                  </dl>
                )}

                <div className="pt-4 space-y-3">
                  <WhatsAppButton product={product} variant="solid" className="w-full sm:w-auto">
                    ENQUIRE ON WHATSAPP
                  </WhatsAppButton>

                  <p className="text-xs text-muted leading-relaxed">
                    Opens WhatsApp with a pre-filled enquiry containing this piece’s title, INR
                    price, product link, and code.
                  </p>
                </div>
              </div>
            </BlurReveal>
          </div>
        </div>

        {/* Related Pieces */}
        {relatedProducts.length > 0 && (
          <section
            aria-labelledby="related-heading"
            className="mt-24 sm:mt-32 pt-16 border-t border-border-subtle"
          >
            <div className="flex items-end justify-between gap-4 mb-10">
              <div>
                <p className="text-xs tracking-[0.24em] text-primary mb-2">CONTINUE EXPLORING</p>
                <h2
                  id="related-heading"
                  className="font-serif text-2xl sm:text-3xl font-light text-foreground"
                >
                  Complementary pieces.
                </h2>
              </div>
              <Link
                to="/#collection"
                className="text-xs tracking-[0.18em] text-muted hover:text-primary transition-colors whitespace-nowrap"
              >
                VIEW ALL
              </Link>
            </div>

            <div className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-4 gap-x-5 sm:gap-x-7 gap-y-12">
              {relatedProducts.map((related, idx) => (
                <ProductCard key={related.id} product={related} index={idx} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
