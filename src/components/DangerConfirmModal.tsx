import React, { useEffect, useId, useRef, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

const DEFAULT_PHRASE = 'INITIATE';

interface TypeToConfirmFieldProps {
  value: string;
  onChange: (value: string) => void;
  requireText?: string;
  inputId?: string;
  autoFocus?: boolean;
  onEnter?: () => void;
  className?: string;
}

export function TypeToConfirmField({
  value,
  onChange,
  requireText = DEFAULT_PHRASE,
  inputId,
  autoFocus = false,
  onEnter,
  className = '',
}: TypeToConfirmFieldProps) {
  const generatedId = useId();
  const fieldId = inputId ?? generatedId;
  const matched = value.trim() === requireText;
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label htmlFor={fieldId} className="ui-label">
        Type <span className="font-mono text-red-700 dark:text-red-400">{requireText}</span> to confirm
      </label>
      <input
        id={fieldId}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && matched) {
            e.preventDefault();
            onEnter?.();
          }
        }}
        autoFocus={autoFocus}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="characters"
        spellCheck={false}
        placeholder={requireText}
        aria-describedby={`${fieldId}-hint`}
        data-confirmed={matched}
        className="ui-field font-mono data-[confirmed=true]:border-emerald-500 dark:data-[confirmed=true]:border-emerald-600"
      />
      <p id={`${fieldId}-hint`} data-confirmed={matched} className="text-pretty text-xs text-slate-500 data-[confirmed=true]:text-emerald-700 dark:text-slate-400 dark:data-[confirmed=true]:text-emerald-400">
        {matched
          ? 'Confirmed — the action button is now enabled.'
          : 'All caps, spelled exactly. The action stays locked until the word matches.'}
      </p>
    </div>
  );
}

interface DangerConfirmModalProps {
  isOpen: boolean;
  title: string;
  children: React.ReactNode;
  confirmLabel?: string;
  requireText?: string;
  onConfirm: () => void;
  onClose: () => void;
}

export default function DangerConfirmModal({
  isOpen,
  title,
  children,
  confirmLabel = 'Delete Permanently',
  requireText = DEFAULT_PHRASE,
  onConfirm,
  onClose,
}: DangerConfirmModalProps) {
  const [typed, setTyped] = useState('');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const inputId = useId();
  const matched = typed.trim() === requireText;

  useEffect(() => {
    if (isOpen) {
      setTyped('');
      if (!dialogRef.current?.open) dialogRef.current?.showModal();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const confirm = () => {
    if (!matched) return;
    setTyped('');
    onConfirm();
  };

  return (
    <dialog
      ref={dialogRef}
      role="alertdialog"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="ui-dialog ui-confirm-dialog m-auto max-w-md p-0"
    >
      <div className="ui-dialog-header">
        <AlertTriangle className="size-5 shrink-0 text-red-600 dark:text-red-400" aria-hidden="true" />
        <h3 id={titleId} className="ui-section-title flex-1">{title}</h3>
        <button type="button" onClick={onClose} aria-label="Cancel" className="ui-icon-button">
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>
      <div className="ui-dialog-body space-y-5">
        <div id={descriptionId} className="text-pretty text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          {children}
        </div>
        <TypeToConfirmField
          value={typed}
          onChange={setTyped}
          requireText={requireText}
          inputId={inputId}
          autoFocus
          onEnter={confirm}
        />
      </div>
      <div className="ui-dialog-footer">
        <button type="button" onClick={onClose} className="ui-button">Cancel</button>
        <button type="button" onClick={confirm} disabled={!matched} className="ui-button-danger">
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
