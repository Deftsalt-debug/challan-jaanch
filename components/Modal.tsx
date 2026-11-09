'use client';

import { ReactNode, useEffect, useRef } from 'react';
import { cx } from './ui';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  /** Where the panel sits: a side drawer, a bottom sheet that centres on wide screens, or a centred box. */
  placement?: 'drawer' | 'sheet' | 'center';
  children: ReactNode;
}

/**
 * A modal built on the native <dialog>. `showModal()` traps focus, closes on
 * Escape, makes the rest of the page inert and returns focus to the control
 * that opened it, which hand-rolled overlays here previously did not do.
 */
export function Modal({ open, onClose, labelledBy, placement = 'center', children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // showModal() focuses the first focusable node, which can be a scrollable
      // panel. Prefer the control the caller marked.
      dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      className={cx('modal', `modal-${placement}`)}
      onClose={onClose}
      // A press that starts on the backdrop itself, not inside the panel, dismisses.
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      {open && children}
    </dialog>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** A destructive-action confirmation. The safe choice takes initial focus. */
export function ConfirmDialog({ open, title, body, confirmLabel, cancelLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onCancel} labelledBy="confirm-dialog-title">
      <section className="card w-full max-w-md p-6 shadow-2xl">
        <h2 id="confirm-dialog-title" className="h2">{title}</h2>
        <p className="help mt-2">{body}</p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" data-autofocus onClick={onCancel} className="btn btn-secondary">{cancelLabel}</button>
          <button type="button" onClick={onConfirm} className="btn btn-danger">{confirmLabel}</button>
        </div>
      </section>
    </Modal>
  );
}
