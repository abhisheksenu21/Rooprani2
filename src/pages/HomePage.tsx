import { useMemo } from 'react';
import { BrandStorySection } from '../components/sections/BrandStorySection';
import { CollectionSection } from '../components/sections/CollectionSection';
import { FeaturedSection } from '../components/sections/FeaturedSection';
import { HeroSection } from '../components/sections/HeroSection';
import { ManifestoSection } from '../components/sections/ManifestoSection';
import { WhatsAppContactSection } from '../components/sections/WhatsAppContactSection';
import { useCatalogue } from '../context/CatalogueContext';
import { useDocumentMetadata } from '../hooks/useDocumentMetadata';

export function HomePage() {
  const { products, categories, loading, error, refreshCatalogue } = useCatalogue();

  useDocumentMetadata({
    title: 'Rooprani — Elegance in Every Detail | Indian Jewellery Catalogue',
    description:
      "Discover Rooprani's thoughtfully curated collection of artificial jewellery, bangles, kade, Bentex jewellery, earrings, necklaces, and fashion accessories.",
  });

  const featuredProduct = useMemo(
    () => products.find((item) => item.is_featured && item.is_active) ?? products[0],
    [products]
  );

  return (
    <>
      <HeroSection />
      <ManifestoSection />
      <CollectionSection
        products={products}
        categories={categories}
        loading={loading}
        error={error}
        onRetry={refreshCatalogue}
      />
      <FeaturedSection product={featuredProduct} />
      <BrandStorySection />
      <WhatsAppContactSection />
    </>
  );
}
