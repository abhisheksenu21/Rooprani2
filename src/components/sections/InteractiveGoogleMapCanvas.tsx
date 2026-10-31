import { useEffect, useState, type ReactNode } from 'react';
import {
  AdvancedMarker,
  APILoadingStatus,
  APIProvider,
  InfoWindow,
  Map,
  Pin,
  useAdvancedMarkerRef,
  useApiLoadingStatus,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import { ExternalLink } from 'lucide-react';

interface ResolvedStorePlace {
  position: google.maps.LatLngLiteral;
  formattedAddress: string;
  googleMapsURI: string | null;
}

interface StorePlaceControllerProps {
  addressQuery: string;
  onResolved: (place: ResolvedStorePlace) => void;
}

function StorePlaceController({ addressQuery, onResolved }: StorePlaceControllerProps) {
  const map = useMap();
  const placesLib = useMapsLibrary('places');

  useEffect(() => {
    if (!map || !placesLib || !addressQuery) return;

    let cancelled = false;

    const resolveLocation = async () => {
      const candidateQueries = [addressQuery, addressQuery.replace(/^[^,]+,\s*/, '')];

      for (const textQuery of candidateQueries) {
        if (!textQuery.trim()) continue;
        try {
          const response = await placesLib.Place.searchByText({
            textQuery,
            fields: [
              'id',
              'displayName',
              'formattedAddress',
              'location',
              'viewport',
              'googleMapsURI',
            ],
            maxResultCount: 1,
            language: 'en',
            region: 'IN',
          });

          const firstPlace = response?.places?.[0];
          if (!cancelled && firstPlace?.location) {
            const lat = firstPlace.location.lat();
            const lng = firstPlace.location.lng();
            const position = { lat, lng };

            if (firstPlace.viewport) {
              map.fitBounds(firstPlace.viewport);
              const currentZoom = map.getZoom();
              if (typeof currentZoom === 'number' && currentZoom > 17) {
                map.setZoom(17);
              }
            } else {
              map.panTo(position);
              map.setZoom(16);
            }

            onResolved({
              position,
              formattedAddress: firstPlace.formattedAddress || addressQuery,
              googleMapsURI: firstPlace.googleMapsURI || null,
            });
            return;
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (
            message.includes('RESOURCE_EXHAUSTED') ||
            message.includes('OVER_QUERY_LIMIT') ||
            message.includes('QuotaExceeded') ||
            message.includes('429')
          ) {
            window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
            return;
          }
          console.error('Places searchByText lookup failed:', error);
        }
      }
    };

    void resolveLocation();

    return () => {
      cancelled = true;
    };
  }, [map, placesLib, addressQuery, onResolved]);

  return null;
}

interface StoreMapCanvasProps {
  addressQuery: string;
  fallbackMapsUrl: string;
  fallbackElement: ReactNode;
}

function StoreMapCanvas({
  addressQuery,
  fallbackMapsUrl,
  fallbackElement,
}: StoreMapCanvasProps) {
  const loadingStatus = useApiLoadingStatus();
  const [resolvedPlace, setResolvedPlace] = useState<ResolvedStorePlace | null>(null);
  const [infoWindowOpen, setInfoWindowOpen] = useState(true);
  const [markerRef, marker] = useAdvancedMarkerRef();

  if (
    loadingStatus === APILoadingStatus.FAILED ||
    loadingStatus === APILoadingStatus.AUTH_FAILURE
  ) {
    return <>{fallbackElement}</>;
  }

  return (
    <div className="relative h-[380px] sm:h-[420px] w-full overflow-hidden border border-border-subtle bg-surface">
      <Map
        defaultCenter={{ lat: 20.5937, lng: 78.9629 }}
        defaultZoom={5}
        mapId="DEMO_MAP_ID"
        gestureHandling="cooperative"
        clickableIcons={false}
        internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
        className="w-full h-full"
      >
        <StorePlaceController addressQuery={addressQuery} onResolved={setResolvedPlace} />

        {resolvedPlace && (
          <>
            <AdvancedMarker
              ref={markerRef}
              position={resolvedPlace.position}
              title="Rooprani — Rewa, Madhya Pradesh"
              onClick={() => setInfoWindowOpen(true)}
            >
              <Pin
                background="#C9A87C"
                borderColor="#2B211B"
                glyphColor="#151413"
                scale={1.15}
              />
            </AdvancedMarker>

            {infoWindowOpen && marker && (
              <InfoWindow
                anchor={marker}
                maxWidth={260}
                onCloseClick={() => setInfoWindowOpen(false)}
              >
                <div className="p-1 text-[#151413] font-sans">
                  <p className="font-serif text-base font-semibold tracking-wide text-[#151413]">
                    Rooprani
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-[#2B211B]">
                    {resolvedPlace.formattedAddress}
                  </p>
                  <a
                    href={resolvedPlace.googleMapsURI || fallbackMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[#7A5628] hover:underline"
                  >
                    <span>Directions on Google Maps</span>
                    <ExternalLink className="w-3 h-3" aria-hidden="true" />
                  </a>
                </div>
              </InfoWindow>
            )}
          </>
        )}
      </Map>
    </div>
  );
}

export interface InteractiveGoogleMapCanvasProps {
  apiKey: string;
  addressQuery: string;
  fallbackMapsUrl: string;
  fallbackElement: ReactNode;
}

export default function InteractiveGoogleMapCanvas({
  apiKey,
  addressQuery,
  fallbackMapsUrl,
  fallbackElement,
}: InteractiveGoogleMapCanvasProps) {
  return (
    <APIProvider apiKey={apiKey} language="en" region="IN">
      <StoreMapCanvas
        addressQuery={addressQuery}
        fallbackMapsUrl={fallbackMapsUrl}
        fallbackElement={fallbackElement}
      />
    </APIProvider>
  );
}
