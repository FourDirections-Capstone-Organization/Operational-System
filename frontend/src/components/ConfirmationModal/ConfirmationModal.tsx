import React, { useEffect, useRef } from "react";
import { Trash2, AlertTriangle, AlertCircle, Info, HelpCircle, Check, Loader2, Lock } from "lucide-react";
import "./ConfirmationModal.css";

export type ConfirmationVariant =
    | "danger"
    | "warning"
    | "info"
    | "success"
    | "neutral";

export interface ConfirmationModalProps {
    isOpen: boolean;
    variant?: ConfirmationVariant;
    title: string;
    description: React.ReactNode;
    notice?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    isLoading?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

const VARIANT_DEFAULTS: Record<
    ConfirmationVariant,
    { icon: React.ReactNode; confirmLabel: string }
> = {
    danger: { icon: <Trash2 size={22} />, confirmLabel: "Delete" },
    warning: { icon: <AlertTriangle size={22} />, confirmLabel: "Proceed" },
    info: { icon: <Info size={22} />, confirmLabel: "Confirm" },
    success: { icon: <Check size={22} />, confirmLabel: "Save" },
    neutral: { icon: <HelpCircle size={22} />, confirmLabel: "Confirm" },
};

const NOTICE_ICONS: Record<ConfirmationVariant, React.ReactNode> = {
    danger: <AlertTriangle size={14} />,
    warning: <AlertCircle size={14} />,
    info: <Info size={14} />,
    success: <Lock size={14} />,
    neutral: <Info size={14} />,
};

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    variant = "neutral",
    title,
    description,
    notice,
    confirmLabel,
    cancelLabel = "Cancel",
    isLoading = false,
    onConfirm,
    onCancel,
}) => {
    const modalRef = useRef<HTMLDivElement>(null);
    const confirmBtnRef = useRef<HTMLButtonElement>(null);

    const defaults = VARIANT_DEFAULTS[variant];
    const resolvedConfirmLabel = confirmLabel ?? defaults.confirmLabel;

    useEffect(() => {
        if (isOpen) {
            confirmBtnRef.current?.focus();
        }
    }, [isOpen]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;
            if (e.key === "Escape") onCancel();
            if (e.key === "Enter" && !isLoading) onConfirm();
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, isLoading, onConfirm, onCancel]);

    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) onCancel();
    };

    if (!isOpen) return null;

    return (
        <div
            className={`cm-overlay`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cm-title"
            aria-describedby="cm-desc"
            onClick={handleOverlayClick}
        >
            <div className={`cm-card cm-variant-${variant}`} ref={modalRef}>

                <div className="cm-header">
                    <div className={`cm-icon-circle cm-icon-${variant}`}>
                        {defaults.icon}
                    </div>
                    <div className="cm-header-text">
                        <p className="cm-title" id="cm-title">{title}</p>
                        <div className="cm-desc" id="cm-desc">{description}</div>
                    </div>
                </div>

                {notice && (
                    <div className={`cm-notice cm-notice-${variant}`}>
                        <span className="cm-notice-icon">{NOTICE_ICONS[variant]}</span>
                        <span>{notice}</span>
                    </div>
                )}

                <div className="cm-actions">
                    <button
                        type="button"
                        className="cm-btn cm-btn-cancel"
                        onClick={onCancel}
                        disabled={isLoading}
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        className={`cm-btn cm-btn-confirm cm-btn-${variant}`}
                        onClick={onConfirm}
                        disabled={isLoading}
                        ref={confirmBtnRef}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 size={16} className="cm-spin" />
                                <span>Processing...</span>
                            </>
                        ) : (
                            <>
                                {defaults.icon}
                                <span>{resolvedConfirmLabel}</span>
                            </>
                        )}
                    </button>
                </div>

            </div>
        </div>
    );
};

export default ConfirmationModal;