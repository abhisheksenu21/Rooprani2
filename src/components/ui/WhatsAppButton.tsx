import type { ReactNode } from 'react';
import { useWhatsAppEnquiry } from '../../context/WhatsAppEnquiryContext';
import type { Product } from '../../types/catalogue';

interface WhatsAppButtonProps {
  product?: Product;
  children: ReactNode;
  variant?: 'solid' | 'outline' | 'inline';
  className?: string;
}

export function WhatsAppButton({
  product,
  children,
  variant = 'solid',
  className = '',
}: WhatsAppButtonProps) {
  const { openProductEnquiry, openGeneralEnquiry } = useWhatsAppEnquiry();

  const variantClasses =
    variant === 'solid'
      ? 'inline-flex items-center justify-center gap-2.5 px-7 py-3.5 min-h-[46px] bg-primary text-primary-foreground text-xs tracking-[0.2em] font-medium hover:bg-foreground hover:text-background transition-colors duration-200 whitespace-nowrap shrink-0 cursor-pointer'
      : variant === 'outline'
        ? 'inline-flex items-center justify-center gap-2.5 px-7 py-3.5 min-h-[46px] border border-primary/60 text-foreground text-xs tracking-[0.2em] font-normal hover:border-primary hover:bg-primary hover:text-primary-foreground transition-colors duration-200 whitespace-nowrap shrink-0 cursor-pointer'
        : 'inline-flex items-center gap-1.5 text-sm text-muted hover:text-primary transition-colors duration-200 whitespace-nowrap shrink-0 cursor-pointer';

  const combinedClassName = `${variantClasses} ${className}`.trim();

  return (
    <button
      type="button"
      onClick={() => (product ? openProductEnquiry(product) : openGeneralEnquiry())}
      className={combinedClassName}
    >
      {children}
    </button>
  );
}
