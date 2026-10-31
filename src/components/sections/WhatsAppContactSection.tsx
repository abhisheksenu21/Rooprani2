import { ExternalLink, Mail, MapPin, MessageCircle } from 'lucide-react';
import { appConfig } from '../../lib/config/env';
import { BlurReveal } from '../ui/BlurReveal';
import { WhatsAppButton } from '../ui/WhatsAppButton';
import { StoreLocationMap } from './StoreLocationMap';

export function WhatsAppContactSection() {
  const directionsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    appConfig.storeAddress
  )}`;

  return (
    <section
      id="contact"
      aria-labelledby="contact-heading"
      className="bg-background py-24 sm:py-32 px-4 sm:px-8 lg:px-12 scroll-mt-20"
    >
      <div className="max-w-7xl mx-auto">
        {/* Champagne-Gold Hairline Divider */}
        <div aria-hidden="true" className="w-24 h-px bg-primary/65 mx-auto mb-14" />

        {/* Primary WhatsApp Enquiry Invitation */}
        <div className="max-w-3xl mx-auto text-center">
          <BlurReveal>
            <h2
              id="contact-heading"
              className="font-serif text-[clamp(2rem,4vw,3.2rem)] font-light text-foreground leading-[1.18] text-balance"
            >
              Something caught your eye?
            </h2>

            <p className="mt-5 text-base sm:text-lg font-light text-muted leading-relaxed max-w-lg mx-auto text-balance">
              Have a question about a piece? Connect with us directly on WhatsApp.
            </p>

            <div className="mt-10">
              <WhatsAppButton variant="outline">TALK TO US</WhatsAppButton>
            </div>
          </BlurReveal>
        </div>

        {/* Boutique Location, Contact Details & Interactive Google Map */}
        <div className="mt-20 sm:mt-24 pt-16 border-t border-border-subtle grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-stretch">
          <div className="lg:col-span-5 flex flex-col justify-center">
            <BlurReveal>
              <p className="text-xs tracking-[0.24em] text-primary mb-3">VISIT &amp; CONNECT</p>
              <h3 className="font-serif text-2xl sm:text-3xl font-light text-foreground leading-snug text-balance">
                Rooprani in Rewa, Madhya Pradesh.
              </h3>

              <dl className="mt-8 space-y-6 text-sm">
                {appConfig.whatsappDisplay && (
                  <div className="flex items-start gap-3.5">
                    <MessageCircle
                      className="w-4 h-4 text-primary stroke-[1.5] mt-1 shrink-0"
                      aria-hidden="true"
                    />
                    <div>
                      <dt className="text-xs tracking-[0.18em] text-muted uppercase">WhatsApp</dt>
                      <dd className="mt-1 text-foreground tabular-nums">
                        <WhatsAppButton variant="inline" className="text-foreground hover:text-primary">
                          {appConfig.whatsappDisplay}
                        </WhatsAppButton>
                      </dd>
                    </div>
                  </div>
                )}

                {appConfig.contactEmail && (
                  <div className="flex items-start gap-3.5">
                    <Mail
                      className="w-4 h-4 text-primary stroke-[1.5] mt-1 shrink-0"
                      aria-hidden="true"
                    />
                    <div>
                      <dt className="text-xs tracking-[0.18em] text-muted uppercase">Email</dt>
                      <dd className="mt-1">
                        <a
                          href={`mailto:${appConfig.contactEmail}`}
                          className="text-foreground hover:text-primary transition-colors break-all"
                        >
                          {appConfig.contactEmail}
                        </a>
                      </dd>
                    </div>
                  </div>
                )}

                {appConfig.storeAddress && (
                  <div className="flex items-start gap-3.5">
                    <MapPin
                      className="w-4 h-4 text-primary stroke-[1.5] mt-1 shrink-0"
                      aria-hidden="true"
                    />
                    <div>
                      <dt className="text-xs tracking-[0.18em] text-muted uppercase">Location</dt>
                      <dd className="mt-1 text-foreground/90 leading-relaxed">
                        {appConfig.storeAddress}
                      </dd>
                      <dd className="mt-3">
                        <a
                          href={directionsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs tracking-[0.18em] text-primary hover:text-foreground transition-colors whitespace-nowrap"
                        >
                          <span>OPEN IN GOOGLE MAPS</span>
                          <ExternalLink className="w-3.5 h-3.5 stroke-[1.5]" aria-hidden="true" />
                        </a>
                      </dd>
                    </div>
                  </div>
                )}
              </dl>
            </BlurReveal>
          </div>

          <div className="lg:col-span-7">
            <BlurReveal delay={0.12}>
              <StoreLocationMap />
            </BlurReveal>
          </div>
        </div>
      </div>
    </section>
  );
}
