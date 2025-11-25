import type { ReactNode } from 'react';
import {
  Dialog as PrimitiveDialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

type DialogProps = {
  visible: boolean;
  onClose?: () => void;
  title?: string;
  description?: string;
  children?: ReactNode;
  /**
   * Optional footer content. When omitted, the caller is responsible for
   * rendering actions inside `children`.
   */
  footer?: ReactNode;
};

export function Dialog({ visible, onClose, title, description, children, footer }: DialogProps) {
  return (
    <PrimitiveDialog open={visible} onOpenChange={(open) => !open && onClose?.()}>
      <DialogContent>
        {(title || description) && (
          <DialogHeader>
            {title ? <DialogTitle>{title}</DialogTitle> : null}
            {description ? <DialogDescription>{description}</DialogDescription> : null}
          </DialogHeader>
        )}
        {children}
        {footer ? <DialogFooter>{footer}</DialogFooter> : null}
      </DialogContent>
    </PrimitiveDialog>
  );
}

