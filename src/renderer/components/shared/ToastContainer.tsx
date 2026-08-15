import { useToastStore } from '@/stores/toast-store';
import { cn } from '@/utils/cn';
import { Check, X, Printer, Info } from 'lucide-react';
import { AppleSpinner } from '@/components/ui/Loading';

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-4 z-[99999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-[12px] font-medium',
            'animate-slide-up min-w-[280px] max-w-[380px]',
            toast.type === 'success' && 'bg-[#e8f5e9] border-[#4CAF50]/30 text-[#2e7d32]',
            toast.type === 'error' && 'bg-[#fce4ec] border-[#f44336]/30 text-[#c62828]',
            toast.type === 'info' && 'bg-[#e3f2fd] border-[#2196F3]/30 text-[#1565C0]',
            toast.type === 'printing' && 'bg-[#fff3e0] border-[#FF9800]/30 text-[#e65100]',
          )}
        >
          {/* Icon */}
          <span className={cn(
            'h-7 w-7 rounded-full flex items-center justify-center shrink-0',
            toast.type === 'success' && 'bg-[#4CAF50] text-white',
            toast.type === 'error' && 'bg-[#f44336] text-white',
            toast.type === 'info' && 'bg-[#2196F3] text-white',
            toast.type === 'printing' && 'bg-[#FF9800] text-white',
          )}>
            {toast.type === 'success' ? <Check className="h-3.5 w-3.5" /> :
             toast.type === 'error' ? <X className="h-3.5 w-3.5" /> :
             toast.type === 'printing' ? <AppleSpinner size="sm" className="text-white" /> :
             <Info className="h-3.5 w-3.5" />}
          </span>
          {/* Content */}
          <div className="flex-1 min-w-0">
            {toast.title && <p className="text-[10px] font-semibold opacity-70 uppercase tracking-wide">{toast.title}</p>}
            <p className="text-[11px] leading-tight">{toast.message}</p>
          </div>
          {/* Close */}
          <button onClick={() => removeToast(toast.id)} className="text-current opacity-50 hover:opacity-100 shrink-0">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
