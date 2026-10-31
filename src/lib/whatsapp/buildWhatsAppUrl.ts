import { appConfig, normalizeWhatsAppNumber } from '../config/env';
import type { Product } from '../../types/catalogue';

const inrFormatter = new Intl.NumberFormat('en-IN', {
  maximumFractionDigits: 0,
});

export function formatInrNumber(amount: number): string {
  return inrFormatter.format(Math.max(0, amount));
}

export function formatInrPrice(amount: number): string {
  return `₹${formatInrNumber(amount)}`;
}

export function getProductCanonicalUrl(slug: string): string {
  const origin = appConfig.getSiteOrigin();
  return `${origin}/products/${encodeURIComponent(slug)}`;
}

export function buildProductEnquiryMessage(product: Product): string {
  const productUrl = getProductCanonicalUrl(product.slug);
  const formattedPrice = formatInrNumber(product.price_inr);
  const displayTitle = product.title || product.name;
  const skuSegment = product.sku ? ` (Code: ${product.sku})` : '';

  return `Hello Rooprani! I'm interested in this product: ${displayTitle}${skuSegment}. Price: ₹${formattedPrice}. Product link: ${productUrl}. Please share more details and availability.`;
}

export function buildGeneralEnquiryMessage(): string {
  return `Hello Rooprani! I visited your jewellery catalogue and would love to enquire about your pieces and availability.`;
}

export function buildEnquiryWithCustomerDetailsMessage(params: {
  product?: Product | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  preferredSize?: string;
  notes?: string;
}): string {
  const lines: string[] = [];

  if (params.product) {
    const productUrl = getProductCanonicalUrl(params.product.slug);
    const displayTitle = params.product.title || params.product.name;
    const skuText = params.product.sku ? ` (Code: ${params.product.sku})` : '';
    lines.push(`Hello Rooprani! I would like to buy / enquire about this piece:`);
    lines.push(`• Piece: ${displayTitle}${skuText}`);
    lines.push(`• Price: ${formatInrPrice(params.product.price_inr)}`);
    if (params.preferredSize?.trim()) {
      lines.push(`• Preferred Size: ${params.preferredSize.trim()}`);
    }
    lines.push(`• Link: ${productUrl}`);
  } else {
    lines.push(`Hello Rooprani! I would like to enquire about your jewellery collection.`);
  }

  lines.push('');
  lines.push(`Customer Details:`);
  lines.push(`• Name: ${params.customerName.trim()}`);
  lines.push(`• Phone: ${params.customerPhone.trim()}`);
  lines.push(`• Email: ${params.customerEmail.trim()}`);
  if (params.notes?.trim()) {
    lines.push(`• Message: ${params.notes.trim()}`);
  }

  return lines.join('\n');
}

export function buildWhatsAppLink(message: string): string | null {
  if (!appConfig.whatsappNumber) {
    return null;
  }
  return `https://wa.me/${appConfig.whatsappNumber}?text=${encodeURIComponent(message)}`;
}

export function buildCustomerDirectWhatsAppLink(params: {
  customerPhone: string;
  customerName: string;
  productName: string;
}): string | null {
  const normalized = normalizeWhatsAppNumber(params.customerPhone);
  if (!normalized) return null;
  const reply = `Hello ${params.customerName}, thank you for your enquiry with Rooprani regarding "${params.productName}". Let us assist you with availability and purchase details.`;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(reply)}`;
}
