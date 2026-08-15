import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { AlertTriangle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface ConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  icon?: LucideIcon;
  variant?: 'danger' | 'warning' | 'default';
  isLoading?: boolean;
}

export function ConfirmationDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  icon: Icon = AlertTriangle,
  variant = 'default',
  isLoading = false,
}: ConfirmationDialogProps) {
  const confirmVariant = variant === 'danger' ? 'danger' : 'primary';

  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div className="text-center">
        <div
          className={`h-12 w-12 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
            variant === 'danger'
              ? 'bg-danger/10'
              : variant === 'warning'
                ? 'bg-warning/10'
                : 'bg-surface-tertiary'
          }`}
        >
          <Icon
            className={`h-6 w-6 ${
              variant === 'danger'
                ? 'text-danger'
                : variant === 'warning'
                  ? 'text-warning'
                  : 'text-content-secondary'
            }`}
          />
        </div>
        <h3 className="text-base font-semibold text-content mb-1">{title}</h3>
        <p className="text-sm text-content-secondary mb-6">{message}</p>
        <div className="flex items-center gap-2 justify-center">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button
            variant={confirmVariant}
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
