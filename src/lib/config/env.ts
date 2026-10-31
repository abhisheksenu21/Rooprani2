const DEFAULT_WHATSAPP_NUMBER = '918736049360';
const DEFAULT_CONTACT_EMAIL = 'roopranijewellery@gmail.com';
const DEFAULT_STORE_ADDRESS =
  'G7MW+X3V, Narendra Nagar, Amaiya Colony, Rewa, Madhya Pradesh 486001';

const rawWhatsApp = (
  import.meta.env.VITE_BUSINESS_WHATSAPP_NUMBER || DEFAULT_WHATSAPP_NUMBER
).trim();
const rawSiteUrl = (import.meta.env.VITE_SITE_URL ?? '').trim();
const rawContactEmail = (
  import.meta.env.VITE_CONTACT_EMAIL || DEFAULT_CONTACT_EMAIL
).trim();
const rawStoreAddress = (
  import.meta.env.VITE_STORE_ADDRESS || DEFAULT_STORE_ADDRESS
).trim();
const rawGoogleMapsApiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '').trim();

/**
 * Validates and normalizes WhatsApp numbers into international wa.me format:
 * Country code + digits only, without spaces, '+', or punctuation.
 * Automatically prefixes India's country code ('91') when a 10-digit Indian mobile number is supplied.
 */
export function normalizeWhatsAppNumber(input: string): string | null {
  if (!input) return null;
  if (/^my_|placeholder|example|000000/i.test(input)) return null;

  const digitsOnly = input.replace(/[^\d]/g, '');

  // 10-digit Indian mobile number -> prefix '91'
  if (/^[6-9]\d{9}$/.test(digitsOnly)) {
    return `91${digitsOnly}`;
  }

  if (!/^[1-9]\d{7,14}$/.test(digitsOnly)) {
    return null;
  }
  return digitsOnly;
}

export function formatWhatsAppDisplay(normalizedDigits: string | null): string {
  if (!normalizedDigits) return '';
  if (normalizedDigits.startsWith('91') && normalizedDigits.length === 12) {
    const local = normalizedDigits.slice(2);
    return `+91 ${local.slice(0, 5)} ${local.slice(5)}`;
  }
  return `+${normalizedDigits}`;
}

const resolvedWhatsApp = normalizeWhatsAppNumber(rawWhatsApp);

export const appConfig = {
  whatsappNumber: resolvedWhatsApp,
  whatsappDisplay: formatWhatsAppDisplay(resolvedWhatsApp),
  hasValidWhatsAppNumber: resolvedWhatsApp !== null,
  rawWhatsAppConfigured: rawWhatsApp.length > 0,
  contactEmail: rawContactEmail && rawContactEmail.includes('@') ? rawContactEmail : null,
  storeAddress: rawStoreAddress,
  googleMapsApiKey:
    rawGoogleMapsApiKey && !/^my_|placeholder/i.test(rawGoogleMapsApiKey)
      ? rawGoogleMapsApiKey
      : '',
  getSiteOrigin(): string {
    if (rawSiteUrl && /^https?:\/\//i.test(rawSiteUrl)) {
      return rawSiteUrl.replace(/\/+$/, '');
    }
    if (typeof window !== 'undefined' && window.location?.origin) {
      return window.location.origin;
    }
    return '';
  },
};
