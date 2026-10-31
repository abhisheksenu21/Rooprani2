import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { catalogueMedia } from '../assets/catalogueMedia';
import { BlurReveal } from '../components/ui/BlurReveal';
import { ResilientImage } from '../components/ui/ResilientImage';
import { WhatsAppButton } from '../components/ui/WhatsAppButton';
import { useCatalogue } from '../context/CatalogueContext';
import { useDocumentMetadata } from '../hooks/useDocumentMetadata';
import { isProductAvailable } from '../types/catalogue';

interface CuratedMeta {
  subtitle: string;
  fallbackImage: string;
}

const DEFAULT_COLLECTION_META: Record<string, CuratedMeta> = {
  bangles: {
    subtitle: 'Engraved chooda sets and finely filigreed stacks crafted for graceful movement.',
    fallbackImage: catalogueMedia.productGoldBangles,
  },
  kade: {
    subtitle: 'Sculptural hinged bracelets with heritage relief work and enamel detailing.',
    fallbackImage: catalogueMedia.productSculptedKade,
  },
  necklaces: {
    subtitle: 'Statement polki-inspired chokers and collar silhouettes framed with pearl drops.',
    fallbackImage: catalogueMedia.productKundanNecklace,
  },
  earrings: {
    subtitle: 'Luminous chandbalis and beaded jhumkas balanced for effortless wear.',
    fallbackImage: catalogueMedia.productChandbaliEarrings,
  },
  'bentex-jewellery': {
    subtitle: 'Traditional matte gold-toned temple haar sets rich in lotus and coin motifs.',
    fallbackImage: catalogueMedia.productBentexHaar,
  },
  accessories: {
    subtitle: 'Delicate maang tikkas and pearl hathphool adornments for festive occasions.',
    fallbackImage: catalogueMedia.productMaangTikka,
  },
};

export function CollectionsPage() {
  const prefersReducedMotion = useReducedMotion();
  const { categories, products, loading, error, refreshCatalogue } = useCatalogue();

  useDocumentMetadata({
    title: 'Collections — Rooprani Jewellery Catalogue',
    description:
      'Explore Rooprani jewellery by collection: Bangles, Kade, Necklaces, Earrings, Bentex Jewellery, and Fashion Accessories.',
  });

  const displayCollections = useMemo(() => {
    return categories.map((category) => {
      const meta = DEFAULT_COLLECTION_META[category.slug];
      const matchingProducts = products.filter(
        (p) =>
          p.is_published &&
          p.is_active &&
          isProductAvailable(p.availability_status) &&
          p.category_slug === category.slug
      );
      const firstWithImage = matchingProducts.find((p) => p.image_urls[0]);

      return {
        slug: category.slug,
        name: category.name,
        pieceCount: matchingProducts.length,
        subtitle:
          meta?.subtitle ||
          `Explore curated ${category.name.toLowerCase()} pieces crafted for festive and everyday elegance.`,
        image:
          firstWithImage?.image_urls[0] ||
          meta?.fallbackImage ||
          catalogueMedia.productKundanNecklace,
      };
    });
  }, [categories, products]);

  return (
    <section className="pt-28 sm:pt-36 pb-24 sm:pb-32 px-4 sm:px-8 lg:px-12 bg-background">
      <div className="max-w-7xl mx-auto">
        <BlurReveal>
          <p className="text-xs tracking-[0.26em] text-primary mb-3">COLLECTIONS</p>
          <h1 className="font-serif text-[clamp(2.2rem,4.5vw,3.6rem)] font-light text-foreground leading-[1.12] text-balance">
            Curated expressions of adornment.
          </h1>
          <p className="mt-4 text-sm sm:text-base font-light text-muted max-w-xl leading-relaxed">
            Select a category below to filter the Rooprani catalogue directly to the silhouettes
            that speak to your occasion.
          </p>
        </BlurReveal>

        {loading ? (
          <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10">
            {[0, 1, 2, 3, 4, 5].map((slot) => (
              <div
                key={slot}
                className="border border-border-subtle bg-surface/40 animate-pulse"
              >
                <div className="aspect-[3/4] w-full bg-surface" />
                <div className="p-6 space-y-3">
                  <div className="h-6 w-1/2 bg-surface" />
                  <div className="h-4 w-full bg-surface" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="mt-14 py-16 px-6 border border-border-subtle bg-surface/50 text-center space-y-4">
            <p className="font-serif text-2xl text-foreground">{error}</p>
            <button
              type="button"
              onClick={() => void refreshCatalogue()}
              className="inline-flex items-center justify-center px-6 py-3 min-h-[44px] border border-primary/60 text-xs tracking-[0.18em] text-primary hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer"
            >
              TRY AGAIN
            </button>
          </div>
        ) : displayCollections.length === 0 ? (
          <div className="mt-14 py-20 px-6 border border-border-subtle bg-surface/50 text-center">
            <p className="font-serif text-2xl sm:text-3xl font-light text-foreground">
              Collections are being curated.
            </p>
            <p className="mt-3 text-sm text-muted max-w-md mx-auto leading-relaxed">
              Our jewellery categories are currently being updated. Reach out to Rooprani directly
              on WhatsApp for piece availability.
            </p>
            <div className="mt-7">
              <WhatsAppButton variant="outline">ENQUIRE ON WHATSAPP</WhatsAppButton>
            </div>
          </div>
        ) : (
          <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10">
            {displayCollections.map((collection) => (
              <Link
                key={collection.slug}
                to={`/?category=${collection.slug}#collection`}
                className="group flex flex-col border border-border-subtle bg-surface/40 hover:border-primary/50 transition-colors duration-300"
              >
                <div className="aspect-[3/4] w-full overflow-hidden bg-surface">
                  <ResilientImage
                    src={collection.image}
                    alt={`${collection.name} collection by Rooprani`}
                    fallbackLabel={collection.name}
                    containerClassName="w-full h-full"
                    className={`w-full h-full object-cover ${
                      prefersReducedMotion
                        ? ''
                        : 'transition-transform duration-700 ease-out group-hover:scale-[1.04]'
                    }`}
                  />
                </div>

                <div className="p-6 flex flex-col flex-1 justify-between">
                  <div>
                    <div className="flex items-baseline justify-between gap-2">
                      <h2 className="font-serif text-2xl font-normal text-foreground group-hover:text-primary transition-colors">
                        {collection.name}
                      </h2>
                      <span className="text-[11px] tracking-[0.14em] text-muted uppercase tabular-nums">
                        {collection.pieceCount} {collection.pieceCount === 1 ? 'Piece' : 'Pieces'}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-light text-muted leading-relaxed">
                      {collection.subtitle}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-border-subtle flex items-center justify-between text-xs tracking-[0.18em] text-foreground/85 group-hover:text-primary transition-colors">
                    <span>EXPLORE {collection.name.toUpperCase()}</span>
                    <ArrowRight
                      className="w-4 h-4 stroke-[1.5] transition-transform duration-200 group-hover:translate-x-1"
                      aria-hidden="true"
                    />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
