import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export default function Modal({ open, onClose, title, subtitle, children, footer, wide }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  // Portal to <body> so `position: fixed` escapes any transformed ancestor
  // (e.g. a page's `animate-fade-in`) and always covers the full viewport.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div
        className={`relative w-full ${wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'} max-h-[92dvh] flex flex-col
                    bg-white border border-slate-200 rounded-t-3xl sm:rounded-2xl shadow-card
                    animate-slide-up sm:animate-scale-in`}
      >
        {/* Grab handle — signals a draggable bottom sheet on mobile */}
        <div className="sm:hidden pt-2.5 pb-1 flex justify-center shrink-0">
          <div className="h-1.5 w-10 rounded-full bg-slate-300" />
        </div>

        <div className="flex items-start justify-between gap-4 px-5 sm:px-6 pt-2 sm:pt-5 pb-4 border-b border-slate-200 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer -mr-1 p-1 -m-1" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 sm:px-6 py-5 overflow-y-auto overscroll-contain">{children}</div>

        {footer && (
          <div className="px-5 sm:px-6 pt-3 pb-[calc(0.875rem+env(safe-area-inset-bottom))] sm:pb-4 border-t border-slate-200 shrink-0
                          flex flex-wrap items-center gap-2.5 sm:justify-end [&>button]:flex-1 [&>button]:justify-center sm:[&>button]:flex-none">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
