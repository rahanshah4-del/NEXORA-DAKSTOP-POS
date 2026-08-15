import { create } from 'zustand';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'printing';
  title?: string;
}

interface ToastStore {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>()((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
    setTimeout(() => { set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })); }, 3000);
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

// ── Helper functions ──
export function notifyPrint(message: string) {
  useToastStore.getState().addToast({ message, type: 'printing', title: '🖨 Printing' });
}

export function notifySuccess(message: string) {
  useToastStore.getState().addToast({ message, type: 'success', title: '✓ Success' });
}

export function notifyError(message: string) {
  useToastStore.getState().addToast({ message, type: 'error', title: '✗ Error' });
}

export function notifyInfo(message: string) {
  useToastStore.getState().addToast({ message, type: 'info', title: 'ℹ Info' });
}
