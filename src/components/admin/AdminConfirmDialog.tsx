import { useEffect } from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

interface AdminConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function AdminConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Delete Product',
  cancelLabel = 'Cancel',
  loading = false,
  error = null,
  onConfirm,
  onCancel,
}: AdminConfirmDialogProps) {
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !loading) {
        onCancel();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, loading, onCancel]);

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-confirm-dialog-title"
          onClick={() => {
            if (!loading) onCancel();
          }}
        >
          <motion.div
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[#FFFDFA] border border-[#DED4C5] p-6 sm:p-7 text-[#221A15] shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#EAE1D3]">
              <div className="flex items-center gap-2.5">
                <AlertTriangle
                  className="w-5 h-5 text-[#9F2D20] stroke-[1.75] shrink-0"
                  aria-hidden="true"
                />
                <h2
                  id="admin-confirm-dialog-title"
                  className="font-serif text-2xl font-normal text-[#221A15]"
                >
                  {title}
                </h2>
              </div>
              <button
                type="button"
                disabled={loading}
                onClick={onCancel}
                aria-label="Close confirmation dialog"
                className="min-w-[40px] min-h-[40px] -mr-2 -mt-2 flex items-center justify-center text-[#6B5E53] hover:text-[#221A15] disabled:opacity-50 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-5 space-y-4">
              <p className="text-sm text-[#4A3F36] leading-relaxed">{description}</p>

              {error && (
                <div
                  role="alert"
                  className="border border-[#E5B8B2] bg-[#FDF2F0] px-3.5 py-2.5 text-xs text-[#8C2318]"
                >
                  {error}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-[#EAE1D3] flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={loading}
                onClick={onCancel}
                className="px-4 py-2.5 min-h-[42px] border border-[#D5C9B8] bg-transparent text-xs tracking-[0.14em] uppercase text-[#4A3F36] hover:border-[#221A15] hover:text-[#221A15] transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
              >
                {cancelLabel}
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={onConfirm}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[42px] bg-[#9F2D20] text-white text-xs tracking-[0.14em] uppercase font-medium hover:bg-[#7F2217] transition-colors disabled:opacity-60 cursor-pointer whitespace-nowrap"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>{confirmLabel}</span>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
