import React, { useEffect, useRef, useState, useId, KeyboardEvent, ReactNode } from "react";
import { createPortal } from "react-dom";
import Button from '../Buttons/Buttons';
import "./ConfirmModal.css";

export interface ConfirmModalProps {
  /** Controlled open state */
  isOpen: boolean;
  /** Modal title text */
  title: string;
  /** Detailed description or body text. Leave empty when using `children` for custom form content. */
  message: string;
  /** Primary action variant. Set to 'danger' for destructive actions (e.g. delete/deactivate) */
  variant?: "primary" | "danger" | "success" | "warning";
  /** Cancel button text (defaults to 'Cancel') */
  cancelLabel?: string;
  /** Confirm button text (defaults to 'Confirm') */
  confirmLabel?: string;
  /** Handler when modal is cancelled or overlay is clicked */
  onCancel: () => void;
  /** Handler when confirm action is clicked */
  onConfirm: () => void;
  /** Optional icon override (e.g., Tabler icon class like 'ti-trash') */
  icon?: string;
  /** High friction text confirmation (e.g. must type 'DELETE' to confirm) */
  requiredPasscode?: string;
  /** State value for user's text confirmation input */
  passcodeValue?: string;
  /** Change handler for passcode confirmation */
  onPasscodeChange?: (val: string) => void;
  /** Optional loading state spinner for async confirmations */
  loading?: boolean;
  /**
   * Optional custom body content (e.g. read-only fields, form inputs) rendered
   * below `message`. When provided alongside form fields, the dialog widens
   * and left-aligns text for readability.
   */
  children?: ReactNode;
  /** Disable the confirm button (e.g. while a form is invalid) */
  confirmDisabled?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  variant = "primary",
  cancelLabel = "Cancel",
  confirmLabel = "Confirm",
  onCancel,
  onConfirm,
  icon,
  requiredPasscode,
  passcodeValue = "",
  onPasscodeChange,
  loading = false,
  children,
  confirmDisabled = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);
  const dialogId = useId();

  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);

  // Sync open states with transitions
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setIsClosing(false);
    } else if (shouldRender) {
      setIsClosing(true);
      const timer = setTimeout(() => {
        setShouldRender(false);
        setIsClosing(false);
      }, 180); // matches the 0.18s exit animation
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Auto-focus on Cancel button for safety when opening
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (cancelBtnRef.current) {
          cancelBtnRef.current.focus();
        }
      }, 50);
    }
  }, [isOpen]);

  // Trap Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onCancel]);

  // Trap Tab key inside the modal
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab" || !containerRef.current) return;
    const focusable = containerRef.current.querySelectorAll(
      'button, input, textarea, select, [tabindex="0"]'
    );
    if (focusable.length === 0) return;

    const firstEl = focusable[0] as HTMLElement;
    const lastEl = focusable[focusable.length - 1] as HTMLElement;

    if (e.shiftKey) {
      if (document.activeElement === firstEl) {
        lastEl.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === lastEl) {
        firstEl.focus();
        e.preventDefault();
      }
    }
  };

  if (!shouldRender) return null;

  const isDestructive = variant === "danger";
  const defaultIcon = isDestructive ? "ti-alert-triangle" : "ti-info-circle";
  const resolvedIcon = icon || defaultIcon;

  const isConfirmDisabled =
    confirmDisabled ||
    (requiredPasscode ? passcodeValue.trim() !== requiredPasscode : false);

  const hasCustomBody = !!children;
  const titleId = `${dialogId}-title`;
  const descId = `${dialogId}-desc`;

  return createPortal(
    <div
      className={`dt-overlay${isClosing ? " closing" : ""}`}
      role="presentation"
      onClick={onCancel}
    >
      <div
        className={`dt-dialog${isClosing ? " closing" : ""}${
          hasCustomBody ? " dt-dialog--form" : ""
        }`}
        ref={containerRef}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={message ? descId : undefined}
        style={{
          borderColor: isDestructive ? "var(--err-r)" : "var(--teal-ring)",
        }}
      >
        <div
          className="dt-dialog-icon"
          style={{
            background: isDestructive ? "var(--err-bg)" : "var(--teal-bg)",
            color: isDestructive ? "var(--err)" : "var(--teal)",
          }}
        >
          <i className={`ti ${resolvedIcon}`} aria-hidden="true" />
        </div>
        <h3 className="dt-dialog-title" id={titleId} style={{ fontFamily: "var(--fh)" }}>
          {title}
        </h3>
        {message && (
          <p className="dt-dialog-msg" id={descId}>
            {message}
          </p>
        )}

        {hasCustomBody && (
          <div className="dt-dialog-body">{children}</div>
        )}

        {requiredPasscode && (
          <div className="dt-dialog-passcode">
            <label className="tf-label" htmlFor="dt-dialog-passcode-input">
              Type <strong style={{ color: "var(--tp)" }}>{requiredPasscode}</strong> to confirm
            </label>
            <input
              id="dt-dialog-passcode-input"
              type="text"
              className="tf-input dt-dialog-passcode-input"
              value={passcodeValue}
              onChange={(e) => onPasscodeChange?.(e.target.value)}
              placeholder={`Type "${requiredPasscode}"`}
              autoFocus
              disabled={loading}
            />
          </div>
        )}

        <div className="dt-dialog-actions">
          <Button
            ref={cancelBtnRef}
            title={cancelLabel}
            variant="secondary"
            size="sm"
            onClick={onCancel}
            disabled={loading}
          />
          <Button
            title={confirmLabel}
            variant={variant}
            size="sm"
            disabled={isConfirmDisabled}
            loading={loading}
            onClick={onConfirm}
          />
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ConfirmModal;
