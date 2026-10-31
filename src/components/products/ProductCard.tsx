import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { formatInrPrice } from '../../lib/whatsapp/buildWhatsAppUrl';
import { formatAvailabilityLabel, type Product } from '../../types/catalogue';
import { ResilientImage } from '../ui/ResilientImage';

interface ProductCardProps {
  product: Product;
  index?: number;
}

export function ProductCard({ product, index = 0 }: ProductCardProps) {
  const prefersReducedMotion = useReducedMotion();
  const primaryImage = product.image_urls[0] ?? '';
  const productTitle = product.title || product.name;
  const availabilityText = formatAvailabilityLabel(product.availability_status);

  return (
    <motion.article
      initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{
        duration: 0.85,
        delay: Math.min(index * 0.08, 0.32),
        ease: [0.22, 1, 0.36, 1],
      }}
      className="group flex flex-col h-full"
    >
      <Link
        to={`/products/${product.slug}`}
        className="flex flex-col h-full focus-visible:outline-primary"
      >
        {/* Uniform 3:4 Image Frame */}
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-surface border border-border-subtle">
          <ResilientImage
            src={primaryImage}
            alt={`${productTitle} — ${product.category_name} by Rooprani`}
            fallbackLabel={productTitle}
            containerClassName="w-full h-full"
            className={`w-full h-full object-cover ${
              prefersReducedMotion
                ? ''
                : 'transition-transform duration-700 ease-out group-hover:scale-[1.04]'
            }`}
          />
        </div>

        {/* Clean Unboxed Metadata & Editorial Hierarchy */}
        <div className="pt-4 flex flex-col flex-1 justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] sm:text-xs tracking-[0.14em] text-muted uppercase">
              <span>{product.category_name}</span>
              <span aria-hidden="true">·</span>
              <span className="normal-case tracking-normal">{availabilityText}</span>
            </div>

            <div className="mt-2 inline-block max-w-full">
              <h3 className="font-serif text-lg sm:text-xl font-normal text-foreground leading-snug group-hover:text-primary transition-colors duration-200">
                {productTitle}
              </h3>
              <span
                aria-hidden="true"
                className="block h-px w-full bg-primary/80 scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-500 ease-out mt-1"
              />
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-border-subtle/70 flex items-center justify-between gap-3">
            <span className="text-sm sm:text-[15px] font-normal text-foreground tabular-nums">
              {formatInrPrice(product.price_inr)}
            </span>

            <span className="inline-flex items-center gap-1.5 text-xs tracking-[0.14em] text-muted group-hover:text-primary transition-colors duration-200 whitespace-nowrap shrink-0">
              <span>View Details</span>
              <ArrowRight
                className="w-3.5 h-3.5 stroke-[1.5] transition-transform duration-200 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </span>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}
