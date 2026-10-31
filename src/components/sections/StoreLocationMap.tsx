import { lazy, Suspense } from 'react';
import { ExternalLink, MapPin } from 'lucide-react';
import { appConfig } from '../../lib/config/env';

const InteractiveGoogleMapCanvas = lazy(() => import('./InteractiveGoogleMapCanvas'));

interface KeylessEmbeddedMapProps {
  addressQuery: string;
  fallbackMapsUrl: string;
}

function KeylessEmbeddedMap({ addressQuery, fallbackMapsUrl }: KeylessEmbeddedMapProps) {
  const embedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(
    addressQuery
  )}&t=m&z=16&ie=UTF8&iwloc=&output=embed`;

  return (
    <div className="h-[380px] sm:h-[420px] w-full flex flex-col overflow-hidden border border-border-subtle bg-surface">
      <div className="relative flex-1 w-full bg-surface">
        <iframe
          title="Rooprani store location in Rewa, Madhya Pradesh"
          src={embedUrl}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="w-full h-full border-0"
          allowFullScreen
        />
      </div>
      <div className="px-4 py-3 border-t border-border-subtle bg-surface flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-muted min-w-0">
          <MapPin className="w-3.5 h-3.5 text-primary stroke-[1.5] shrink-0" aria-hidden="true" />
          <span className="truncate">{addressQuery}</span>
        </div>
        <a
          href={fallbackMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs tracking-[0.16em] text-primary hover:text-foreground transition-colors whitespace-nowrap shrink-0"
        >
          <span>OPEN IN GOOGLE MAPS</span>
          <ExternalLink className="w-3.5 h-3.5 stroke-[1.5]" aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}

export function StoreLocationMap() {
  const addressQuery = appConfig.storeAddress;
  const fallbackMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    addressQuery
  )}`;

  const embeddedFallback = (
    <KeylessEmbeddedMap addressQuery={addressQuery} fallbackMapsUrl={fallbackMapsUrl} />
  );

  if (!appConfig.googleMapsApiKey) {
    return embeddedFallback;
  }

  return (
    <Suspense fallback={embeddedFallback}>
      <InteractiveGoogleMapCanvas
        apiKey={appConfig.googleMapsApiKey}
        addressQuery={addressQuery}
        fallbackMapsUrl={fallbackMapsUrl}
        fallbackElement={embeddedFallback}
      />
    </Suspense>
  );
}
