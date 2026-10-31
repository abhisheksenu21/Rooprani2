import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Check, Copy, Loader2, MessageCircle, User as UserIcon, X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ResilientImage } from '../components/ui/ResilientImage';
import { appConfig } from '../lib/config/env';
import {
  buildEnquiryWithCustomerDetailsMessage,
  buildGeneralEnquiryMessage,
  buildProductEnquiryMessage,
  buildWhatsAppLink,
  formatInrPrice,
} from '../lib/whatsapp/buildWhatsAppUrl';
import type { Product } from '../types/catalogue';
import { useAuth } from './AuthContext';

interface ActiveEnquiryTarget {
  product: Product | null;
}

interface WhatsAppEnquiryContextValue {
  hasValidNumber: boolean;
  openProductEnquiry: (product: Product) => void;
  openGeneralEnquiry: () => void;
  getProductHref: (product: Product) => string | null;
  getGeneralHref: () => string | null;
}

const WhatsAppEnquiryContext = createContext<WhatsAppEnquiryContextValue | null>(null);

export function WhatsAppEnquiryProvider({ children }: { children: ReactNode }) {
  const {
    firebaseUser,
    profile,
    googleAuthAvailable,
    signInWithGoogle,
    getIdToken,
    refreshProfile,
  } = useAuth();
  const [target, setTarget] = useState<ActiveEnquiryTarget | null>(null);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [preferredSize, setPreferredSize] = useState('');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submittedWhatsAppUrl, setSubmittedWhatsAppUrl] = useState<string | null>(null);
  const [preparedMessage, setPreparedMessage] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const autoLaunchAnchorRef = useRef<HTMLAnchorElement | null>(null);
  const prefersReducedMotion = useReducedMotion();

  // Sync customer details from authenticated profile whenever modal opens or user signs in
  useEffect(() => {
    if (!target) return;
    if (profile?.fullName || firebaseUser?.displayName) {
      setCustomerName((prev) => prev || profile?.fullName || firebaseUser?.displayName || '');
    }
    if (profile?.phone) {
      setCustomerPhone((prev) => prev || profile.phone || '');
    }
    if (profile?.email || firebaseUser?.email) {
      setCustomerEmail((prev) => prev || profile?.email || firebaseUser?.email || '');
    }
  }, [target, profile, firebaseUser]);

  const closeModal = useCallback(() => {
    setTarget(null);
    setSubmitting(false);
    setFormError(null);
    setSubmittedWhatsAppUrl(null);
    setPreparedMessage('');
    setCopied(false);
  }, []);

  useEffect(() => {
    if (!target) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeModal();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [target, closeModal]);

  // Automatically trigger the WhatsApp anchor once the enquiry is saved
  useEffect(() => {
    if (submittedWhatsAppUrl && autoLaunchAnchorRef.current) {
      autoLaunchAnchorRef.current.click();
    }
  }, [submittedWhatsAppUrl]);

  const initializeFormDefaults = useCallback(
    (selectedProduct: Product | null) => {
      setCustomerName(profile?.fullName || firebaseUser?.displayName || '');
      setCustomerPhone(profile?.phone || '');
      setCustomerEmail(profile?.email || firebaseUser?.email || '');
      setPreferredSize(selectedProduct?.variants?.sizes?.[0] ?? '');
      setNotes('');
      setFormError(null);
      setSubmittedWhatsAppUrl(null);
      setPreparedMessage('');
      setCopied(false);
    },
    [profile, firebaseUser]
  );

  const openProductEnquiry = useCallback(
    (product: Product) => {
      initializeFormDefaults(product);
      setTarget({ product });
    },
    [initializeFormDefaults]
  );

  const openGeneralEnquiry = useCallback(() => {
    initializeFormDefaults(null);
    setTarget({ product: null });
  }, [initializeFormDefaults]);

  const getProductHref = useCallback((product: Product) => {
    return buildWhatsAppLink(buildProductEnquiryMessage(product));
  }, []);

  const getGeneralHref = useCallback(() => {
    return buildWhatsAppLink(buildGeneralEnquiryMessage());
  }, []);

  const handleSubmitEnquiry = async (event: FormEvent) => {
    event.preventDefault();
    if (!target) return;

    const cleanName = customerName.trim();
    const cleanPhone = customerPhone.trim();
    const cleanEmail = customerEmail.trim();

    if (cleanName.length < 2) {
      setFormError('Please enter your full name.');
      return;
    }

    const phoneDigits = cleanPhone.replace(/[^\d]/g, '');
    if (phoneDigits.length < 8 || phoneDigits.length > 15) {
      setFormError('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setFormError('Please enter a valid email address.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const token = await getIdToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      try {
        const rawStored = window.localStorage.getItem('rooprani_auth_session_v1');
        if (rawStored) {
          const parsedStored = JSON.parse(rawStored) as { supabaseAccessToken?: string | null };
          if (parsedStored?.supabaseAccessToken) {
            headers['X-Supabase-Auth'] = parsedStored.supabaseAccessToken;
          }
        }
      } catch {
        // Ignore storage read error
      }

      const selectedProduct = target.product;
      const selectedProductTitle = selectedProduct
        ? selectedProduct.title || selectedProduct.name
        : 'Direct Boutique Enquiry';
      const numericProductId =
        selectedProduct?.numeric_id ??
        (selectedProduct && /^\d+$/.test(selectedProduct.id) ? Number(selectedProduct.id) : null);

      const response = await fetch('/api/enquiries', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          productId: numericProductId,
          productName: selectedProductTitle,
          productPriceInr: selectedProduct ? selectedProduct.price_inr : null,
          productSku: selectedProduct?.sku ?? null,
          customerName: cleanName,
          customerPhone: cleanPhone,
          customerEmail: cleanEmail,
          preferredSize: preferredSize.trim() || null,
          notes: notes.trim() || null,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Unable to submit your enquiry. Please try again.');
      }

      if (token) {
        void refreshProfile();
      }

      const fullMessage = buildEnquiryWithCustomerDetailsMessage({
        product: selectedProduct,
        customerName: cleanName,
        customerPhone: cleanPhone,
        customerEmail: cleanEmail,
        preferredSize,
        notes,
      });

      setPreparedMessage(fullMessage);
      const waLink = buildWhatsAppLink(fullMessage);
      setSubmittedWhatsAppUrl(waLink);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Unable to submit your enquiry right now.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyMessage = async () => {
    if (!preparedMessage) return;
    try {
      await navigator.clipboard.writeText(preparedMessage);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2400);
    } catch {
      setCopied(false);
    }
  };

  const activeProduct = target?.product ?? null;
  const activeProductTitle = activeProduct ? activeProduct.title || activeProduct.name : '';
  const availableSizes = activeProduct?.variants?.sizes ?? [];
  const directWhatsAppHref = activeProduct ? getProductHref(activeProduct) : getGeneralHref();

  return (
    <WhatsAppEnquiryContext.Provider
      value={{
        hasValidNumber: appConfig.hasValidWhatsAppNumber,
        openProductEnquiry,
        openGeneralEnquiry,
        getProductHref,
        getGeneralHref,
      }}
    >
      {children}

      <AnimatePresence>
        {target && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rooprani-enquiry-heading"
            onClick={closeModal}
          >
            <motion.div
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 14, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xl bg-surface border border-border-subtle p-6 sm:p-8 text-foreground shadow-2xl my-auto"
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between gap-4 pb-5 border-b border-border-subtle">
                <div>
                  <p className="text-xs tracking-[0.24em] text-primary mb-1.5">
                    {activeProduct ? 'ENQUIRE TO BUY' : 'DIRECT BOUTIQUE ENQUIRY'}
                  </p>
                  <h2
                    id="rooprani-enquiry-heading"
                    className="font-serif text-2xl sm:text-3xl font-light text-foreground leading-tight"
                  >
                    {submittedWhatsAppUrl
                      ? 'Enquiry Ready for WhatsApp'
                      : 'Share your details to order'}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  aria-label="Close enquiry dialog"
                  className="min-w-[44px] min-h-[44px] -mr-2 -mt-2 flex items-center justify-center text-muted hover:text-foreground transition-colors"
                >
                  <X className="w-5 h-5 stroke-[1.5]" />
                </button>
              </div>

              {/* Selected Product Preview Strip */}
              {activeProduct && (
                <div className="py-4 border-b border-border-subtle flex items-center gap-4">
                  <div className="w-16 h-20 shrink-0 overflow-hidden border border-border-subtle bg-background">
                    <ResilientImage
                      src={activeProduct.image_urls[0] ?? ''}
                      alt={activeProductTitle}
                      fallbackLabel={activeProductTitle}
                      containerClassName="w-full h-full"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] tracking-[0.16em] text-primary uppercase">
                      {activeProduct.category_name}
                      {activeProduct.sku ? ` · Code ${activeProduct.sku}` : ''}
                    </p>
                    <p className="font-serif text-lg sm:text-xl text-foreground truncate">
                      {activeProductTitle}
                    </p>
                    <p className="text-sm font-normal text-foreground/90 tabular-nums mt-0.5">
                      {formatInrPrice(activeProduct.price_inr)}
                    </p>
                  </div>
                </div>
              )}

              {!submittedWhatsAppUrl ? (
                <form onSubmit={handleSubmitEnquiry} className="pt-5 space-y-4">
                  {!firebaseUser && (
                    <div className="flex flex-wrap items-center justify-between gap-2 bg-background/70 border border-border-subtle px-3.5 py-2.5 text-xs text-muted">
                      <span>Save your details &amp; track orders?</span>
                      <div className="flex items-center gap-3">
                        <Link
                          to="/account"
                          onClick={closeModal}
                          className="inline-flex items-center gap-1.5 text-primary hover:text-foreground transition-colors tracking-[0.12em] uppercase font-medium"
                        >
                          <UserIcon className="w-3.5 h-3.5 stroke-[1.5]" aria-hidden="true" />
                          <span>Sign In / Register</span>
                        </Link>
                        {googleAuthAvailable && (
                          <>
                            <span aria-hidden="true" className="text-border-subtle">
                              |
                            </span>
                            <button
                              type="button"
                              onClick={async () => {
                                setFormError(null);
                                const res = await signInWithGoogle();
                                if (!res.ok && res.error) {
                                  setFormError(res.error);
                                }
                              }}
                              className="text-foreground/85 hover:text-primary transition-colors tracking-[0.12em] uppercase cursor-pointer"
                            >
                              Google
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {formError && (
                    <div
                      role="alert"
                      className="border border-amber-500/40 bg-amber-950/30 px-4 py-3 text-xs sm:text-sm text-amber-200"
                    >
                      {formError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="enquiry-customer-name"
                        className="block text-xs tracking-[0.16em] text-muted uppercase mb-1.5"
                      >
                        Full Name *
                      </label>
                      <input
                        id="enquiry-customer-name"
                        type="text"
                        required
                        autoComplete="name"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Your full name"
                        className="w-full min-h-[44px] bg-background border border-border-subtle px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted/60 focus:border-primary focus:outline-none transition-colors"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="enquiry-customer-phone"
                        className="block text-xs tracking-[0.16em] text-muted uppercase mb-1.5"
                      >
                        Phone / WhatsApp No. *
                      </label>
                      <input
                        id="enquiry-customer-phone"
                        type="tel"
                        required
                        autoComplete="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full min-h-[44px] bg-background border border-border-subtle px-3.5 py-2.5 text-sm text-foreground tabular-nums placeholder:text-muted/60 focus:border-primary focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="enquiry-customer-email"
                      className="block text-xs tracking-[0.16em] text-muted uppercase mb-1.5"
                    >
                      Email Address *
                    </label>
                    <input
                      id="enquiry-customer-email"
                      type="email"
                      required
                      autoComplete="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full min-h-[44px] bg-background border border-border-subtle px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted/60 focus:border-primary focus:outline-none transition-colors"
                    />
                  </div>

                  {availableSizes.length > 0 && (
                    <div>
                      <span className="block text-xs tracking-[0.16em] text-muted uppercase mb-2">
                        Preferred Size
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {availableSizes.map((size) => {
                          const selected = preferredSize === size;
                          return (
                            <button
                              key={size}
                              type="button"
                              onClick={() => setPreferredSize(size)}
                              className={`px-3.5 py-2 min-h-[40px] text-xs tracking-[0.12em] border transition-colors ${
                                selected
                                  ? 'border-primary bg-primary text-primary-foreground font-medium'
                                  : 'border-border-subtle bg-background text-foreground/85 hover:border-primary/60'
                              }`}
                            >
                              {size}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor="enquiry-customer-notes"
                      className="block text-xs tracking-[0.16em] text-muted uppercase mb-1.5"
                    >
                      City / Order Note (Optional)
                    </label>
                    <textarea
                      id="enquiry-customer-notes"
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Delivery city, quantity, or occasion details..."
                      className="w-full bg-background border border-border-subtle px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted/60 focus:border-primary focus:outline-none transition-colors resize-none"
                    />
                  </div>

                  <div className="pt-3 border-t border-border-subtle space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <p className="text-xs text-muted leading-relaxed">
                        Connects directly with Rooprani ({appConfig.whatsappDisplay || '+91 87360 49360'})
                      </p>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 min-h-[46px] bg-primary text-primary-foreground text-xs tracking-[0.18em] font-medium hover:bg-foreground hover:text-background transition-colors disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                            <span>PREPARING...</span>
                          </>
                        ) : (
                          <>
                            <MessageCircle className="w-4 h-4 stroke-[1.6]" aria-hidden="true" />
                            <span>BUY / ENQUIRE ON WHATSAPP</span>
                          </>
                        )}
                      </button>
                    </div>

                    {directWhatsAppHref && (
                      <div className="flex items-center justify-end">
                        <a
                          href={directWhatsAppHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={closeModal}
                          className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.15em] uppercase text-muted hover:text-primary transition-colors"
                        >
                          <span>Or open WhatsApp directly with pre-filled piece details</span>
                          <ArrowUpRight className="w-3.5 h-3.5 stroke-[1.5]" aria-hidden="true" />
                        </a>
                      </div>
                    )}
                  </div>
                </form>
              ) : (
                <div className="pt-5 space-y-5">
                  {/* Hidden programmatic anchor so WhatsApp opens immediately without window.open */}
                  <a
                    ref={autoLaunchAnchorRef}
                    href={submittedWhatsAppUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="sr-only"
                    tabIndex={-1}
                    aria-hidden="true"
                  >
                    Launch WhatsApp
                  </a>

                  <p className="text-sm text-foreground/85 leading-relaxed">
                    Your enquiry details have been recorded for Rooprani. If WhatsApp did not open
                    automatically in a new tab, select the button below to send your pre-filled
                    order message.
                  </p>

                  <div className="bg-background border border-border-subtle p-4 text-xs text-foreground/90 whitespace-pre-line leading-relaxed max-h-44 overflow-y-auto">
                    {preparedMessage}
                  </div>

                  <div className="pt-2 border-t border-border-subtle flex flex-wrap items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={handleCopyMessage}
                      className="inline-flex items-center justify-center gap-2 px-4 py-3 min-h-[44px] border border-border-subtle text-xs tracking-[0.16em] text-foreground hover:border-primary hover:text-primary transition-colors whitespace-nowrap"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 text-primary" aria-hidden="true" />
                          <span>COPIED</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 stroke-[1.5]" aria-hidden="true" />
                          <span>COPY DETAILS</span>
                        </>
                      )}
                    </button>

                    <a
                      href={submittedWhatsAppUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={closeModal}
                      className="inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[44px] bg-primary text-primary-foreground text-xs tracking-[0.18em] font-medium hover:bg-foreground hover:text-background transition-colors whitespace-nowrap"
                    >
                      <span>OPEN WHATSAPP CHAT</span>
                      <ArrowUpRight className="w-4 h-4 stroke-[1.6]" aria-hidden="true" />
                    </a>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </WhatsAppEnquiryContext.Provider>
  );
}

export function useWhatsAppEnquiry() {
  const ctx = useContext(WhatsAppEnquiryContext);
  if (!ctx) {
    throw new Error('useWhatsAppEnquiry must be used within a WhatsAppEnquiryProvider');
  }
  return ctx;
}
