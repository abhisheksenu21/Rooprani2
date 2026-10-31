import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { formatInrPrice } from '../../lib/whatsapp/buildWhatsAppUrl';
import type { Product } from '../../types/catalogue';
import { BlurReveal } from '../ui/BlurReveal';
import { ResilientImage } from '../ui/ResilientImage';
import { WhatsAppButton } from '../ui/WhatsAppButton';

interface FeaturedSectionProps {
  product: Product | undefined;
}

export function FeaturedSection({ product }: FeaturedSectionProps) {
  const prefersReducedMotion = useReducedMotion();

  if (!product) {
    return null;
  }

  const scrollToCollection = () => {
    const el = document.getElementById('collection');
    if (el) {
      el.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    }
  };

  return (
    <section
      id="featured"
      aria-labelledby="featured-heading"
      className="border-t border-border-subtle bg-surface/40"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-20 sm:py-28 lg:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-stretch">
          {/* Left Side: Large Editorial Jewellery Photograph */}
          <div className="lg:col-span-6">
            <BlurReveal className="h-full">
              <Link
                to={`/products/${product.slug}`}
                className="group block relative aspect-[3/4] lg:aspect-auto lg:h-full lg:min-h-[560px] overflow-hidden border border-border-subtle bg-surface"
              >
                <ResilientImage
                  src={product.image_urls[0] ?? ''}
                  alt={`${product.name} — Featured jewellery piece by Rooprani`}
                  fallbackLabel={product.name}
                  containerClassName="w-full h-full"
                  className={`w-full h-full object-cover ${
                    prefersReducedMotion
                      ? ''
                      : 'transition-transform duration-700 ease-out group-hover:scale-[1.03]'
                  }`}
                />
              </Link>
            </BlurReveal>
          </div>

          {/* Right Side: Featured Editorial Copy & Real WhatsApp CTA */}
          <div className="lg:col-span-6 flex flex-col justify-center py-2 lg:py-8">
            <BlurReveal delay={0.12}>
              <p className="text-xs tracking-[0.26em] text-primary mb-4">FEATURED</p>

              <h2
                id="featured-heading"
                className="font-serif text-[clamp(2rem,3.8vw,3.15rem)] font-light text-foreground leading-[1.15] text-balance"
              >
                A touch of timeless elegance.
              </h2>

              <div className="mt-8 pt-8 border-t border-border-subtle">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted">
                  <span className="uppercase tracking-[0.14em]">{product.category_name}</span>
                  {product.sku && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>Code {product.sku}</span>
                    </>
                  )}
                </div>

                <Link
                  to={`/products/${product.slug}`}
                  className="inline-block mt-2 font-serif text-2xl sm:text-[1.7rem] text-foreground hover:text-primary transition-colors"
                >
                  {product.name}
                </Link>

                <p className="mt-3 text-sm sm:text-base font-light text-muted leading-relaxed max-w-xl">
                  {product.description}
                </p>

                <p className="mt-6 text-xl sm:text-2xl font-normal text-foreground tabular-nums">
                  {formatInrPrice(product.price_inr)}
                </p>
              </div>

              <div className="mt-9 flex flex-wrap items-center gap-6">
                <WhatsAppButton product={product} variant="solid">
                  ENQUIRE ON WHATSAPP
                </WhatsAppButton>

                <button
                  type="button"
                  onClick={scrollToCollection}
                  className="group inline-flex items-center gap-2 py-2 text-xs tracking-[0.18em] text-foreground/85 hover:text-primary transition-colors duration-200 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span className="border-b border-primary/50 pb-0.5 group-hover:border-primary transition-colors">
                    Explore the collection
                  </span>
                  <ArrowRight
                    className="w-3.5 h-3.5 stroke-[1.5] transition-transform duration-200 group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </button>
              </div>
            </BlurReveal>
          </div>
        </div>
      </div>
    </section>
  );
}
