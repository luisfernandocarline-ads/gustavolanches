import { useEffect, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'danger' | 'neutral';
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Voltar',
  tone = 'danger',
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    cancelBtnRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/55 p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-desc"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
    >
      <div className="bg-white border border-stone-200 rounded-xl w-full max-w-md shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-200 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={`mt-0.5 p-2 rounded-lg shrink-0 ${
                tone === 'danger' ? 'bg-red-50 text-[#B91C1C]' : 'bg-stone-100 text-stone-700'
              }`}
            >
              <AlertTriangle className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <h2 id="confirm-dialog-title" className="text-base font-bold text-stone-900">
                {title}
              </h2>
            </div>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            aria-label="Fechar confirmação"
            className="min-w-9 min-h-9 flex items-center justify-center text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg cursor-pointer disabled:opacity-40"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="px-6 py-4">
          <p id="confirm-dialog-desc" className="text-sm text-stone-700 leading-relaxed">
            {description}
          </p>
        </div>

        <div className="px-6 py-4 bg-stone-50 border-t border-stone-200 flex items-center justify-end gap-2.5">
          <button
            ref={cancelBtnRef}
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="min-h-10 px-4 py-2 text-sm font-medium text-stone-800 bg-white border border-stone-300 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={`min-h-10 px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors cursor-pointer disabled:opacity-50 ${
              tone === 'danger'
                ? 'bg-[#B91C1C] hover:bg-[#991B1B]'
                : 'bg-stone-900 hover:bg-stone-800'
            }`}
          >
            {busy ? 'Processando...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
