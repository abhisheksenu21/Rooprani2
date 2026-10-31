import { Link } from 'react-router-dom';
import { BlurReveal } from '../components/ui/BlurReveal';
import { useDocumentMetadata } from '../hooks/useDocumentMetadata';
import { appConfig } from '../lib/config/env';

export function PrivacyPolicyPage() {
  useDocumentMetadata({
    title: 'Privacy Policy — Rooprani',
    description:
      'Learn how Rooprani handles customer enquiries via WhatsApp, Google Maps store location features, and account information.',
  });

  return (
    <section className="pt-32 sm:pt-40 pb-24 sm:pb-32 px-4 sm:px-8 lg:px-12 bg-background">
      <div className="max-w-3xl mx-auto">
        <BlurReveal>
          <p className="text-xs tracking-[0.26em] text-primary mb-3">LEGAL</p>
          <h1 className="font-serif text-[clamp(2.1rem,4vw,3.2rem)] font-light text-foreground leading-tight">
            Privacy Policy
          </h1>

          <div className="mt-10 pt-10 border-t border-border-subtle space-y-8 text-sm sm:text-base font-light text-foreground/85 leading-relaxed">
            <div className="space-y-2">
              <h2 className="font-serif text-2xl text-foreground font-normal">
                1. Catalogue Browsing &amp; WhatsApp Enquiries
              </h2>
              <p className="text-muted">
                Visitors may browse the Rooprani jewellery catalogue freely without creating an
                account. When you select &ldquo;Enquire on WhatsApp&rdquo; or &ldquo;Talk to
                Us&rdquo;, you are redirected to WhatsApp ({appConfig.whatsappDisplay}) with a
                pre-filled message containing the selected piece&apos;s details. Any conversation,
                phone number, or delivery details shared on WhatsApp are initiated explicitly by you
                and governed by WhatsApp&apos;s privacy practices as well as our direct customer
                care.
              </p>
            </div>

            <div className="space-y-2">
              <h2 className="font-serif text-2xl text-foreground font-normal">
                2. Customer Account Information
              </h2>
              <p className="text-muted">
                When customer accounts are active, we store only the profile details you explicitly
                provide—such as your name and email address—using encrypted authentication services.
                Plaintext passwords are never stored or accessible by Rooprani.
              </p>
            </div>

            <div className="space-y-2">
              <h2 className="font-serif text-2xl text-foreground font-normal">
                3. Google Maps Features
              </h2>
              <p className="text-muted">
                Our contact section integrates interactive Google Maps features to display our
                boutique location in Rewa, Madhya Pradesh. Use of Google Maps features and content
                is subject to the{' '}
                <a
                  href="https://policies.google.com/privacy?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Google Privacy Policy
                </a>
                .
              </p>
            </div>

            <div className="space-y-2">
              <h2 className="font-serif text-2xl text-foreground font-normal">
                4. Data Usage &amp; Contact
              </h2>
              <p className="text-muted">
                Rooprani does not sell customer contact information to third parties. To request
                updates or removal of your information, please reach out via WhatsApp at{' '}
                {appConfig.whatsappDisplay}
                {appConfig.contactEmail ? (
                  <>
                    {' '}
                    or email us at{' '}
                    <a
                      href={`mailto:${appConfig.contactEmail}`}
                      className="text-primary hover:underline"
                    >
                      {appConfig.contactEmail}
                    </a>
                  </>
                ) : null}
                . Location: {appConfig.storeAddress}.
              </p>
            </div>
          </div>
        </BlurReveal>
      </div>
    </section>
  );
}

export function TermsPage() {
  useDocumentMetadata({
    title: 'Terms and Conditions — Rooprani',
    description:
      'Terms and conditions governing the Rooprani jewellery catalogue, WhatsApp enquiry process, and embedded Google Maps services.',
  });

  return (
    <section className="pt-32 sm:pt-40 pb-24 sm:pb-32 px-4 sm:px-8 lg:px-12 bg-background">
      <div className="max-w-3xl mx-auto">
        <BlurReveal>
          <p className="text-xs tracking-[0.26em] text-primary mb-3">LEGAL</p>
          <h1 className="font-serif text-[clamp(2.1rem,4vw,3.2rem)] font-light text-foreground leading-tight">
            Terms and Conditions
          </h1>

          <div className="mt-10 pt-10 border-t border-border-subtle space-y-8 text-sm sm:text-base font-light text-foreground/85 leading-relaxed">
            <div className="space-y-2">
              <h2 className="font-serif text-2xl text-foreground font-normal">
                1. Catalogue &amp; Enquiry Nature
              </h2>
              <p className="text-muted">
                Rooprani operates as an online jewellery showcase and enquiry catalogue for
                artificial jewellery, bangles, kade, Bentex jewellery, earrings, necklaces, and
                fashion accessories. Clicking &ldquo;Enquire on WhatsApp&rdquo; initiates a direct
                conversation with {appConfig.whatsappDisplay} to confirm availability, sizing, and
                purchase arrangements; it does not constitute an automated online checkout.
              </p>
            </div>

            <div className="space-y-2">
              <h2 className="font-serif text-2xl text-foreground font-normal">
                2. Pricing &amp; Availability
              </h2>
              <p className="text-muted">
                All prices in the catalogue are displayed in Indian Rupees (INR). Because pieces may
                be available in limited runs or made to order, final availability and dispatch
                timelines are confirmed directly with you during your WhatsApp enquiry.
              </p>
            </div>

            <div className="space-y-2">
              <h2 className="font-serif text-2xl text-foreground font-normal">
                3. Product Representation
              </h2>
              <p className="text-muted">
                We photograph and describe each piece with care. Subtle variations in metallic tone,
                stone setting, or enamel detail may occur due to lighting, screen calibration, and
                artisanal finishing.
              </p>
            </div>

            <div className="space-y-2">
              <h2 className="font-serif text-2xl text-foreground font-normal">
                4. Google Maps End User Terms
              </h2>
              <p className="text-muted">
                This website integrates Google Maps features and content to display our Rewa store
                location ({appConfig.storeAddress}). Use of Google Maps features and content is
                subject to the then-current versions of the{' '}
                <a
                  href="https://maps.google.com/help/terms_maps/?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Google Maps/Google Earth Additional Terms of Service
                </a>{' '}
                and{' '}
                <a
                  href="https://policies.google.com/privacy?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Google Privacy Policy
                </a>
                .
              </p>
            </div>
          </div>
        </BlurReveal>
      </div>
    </section>
  );
}

export function NotFoundPage() {
  useDocumentMetadata({
    title: 'Page Not Found — Rooprani',
    description: 'The page you are looking for could not be found on Rooprani.',
  });

  return (
    <section className="pt-36 pb-28 px-4 sm:px-8 lg:px-12 bg-background">
      <div className="max-w-xl mx-auto text-center border border-border-subtle bg-surface/40 p-10 sm:p-16">
        <p className="text-xs tracking-[0.24em] text-primary mb-3">404</p>
        <h1 className="font-serif text-3xl sm:text-4xl font-light text-foreground">
          Page not found.
        </h1>
        <p className="mt-4 text-sm sm:text-base font-light text-muted leading-relaxed">
          The page you requested does not exist or may have moved. Explore the Rooprani collection
          from our homepage.
        </p>
        <div className="mt-8">
          <Link
            to="/"
            className="inline-flex items-center justify-center px-7 py-3.5 min-h-[46px] bg-primary text-primary-foreground text-xs tracking-[0.2em] font-medium hover:bg-foreground hover:text-background transition-colors"
          >
            RETURN TO ROOPRANI
          </Link>
        </div>
      </div>
    </section>
  );
}
