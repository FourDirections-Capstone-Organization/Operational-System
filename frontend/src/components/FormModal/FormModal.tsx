import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, Loader2, X } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import ConfirmationModal from '../ConfirmationModal/ConfirmationModal';
import './FormModal.css';

export interface FormModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    infoCard?: {
        avatarText: string;
        title: string;
        subtitle: string;
        badgeText: string;
        badgeStatus: string;
    };
    onSubmit?: (e: React.FormEvent) => void;
    submitLabel?: string;
    cancelLabel?: string;
    isSubmitting?: boolean;
    submitDisabled?: boolean;
    apiError?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    footer?: React.ReactNode;
    children: React.ReactNode;
    /** If true, shows "Discard changes?" confirmation before closing when dirty */
    confirmOnCancel?: boolean;
    /** Indicates whether form fields have been modified */
    dirty?: boolean;
}

const FormModal: React.FC<FormModalProps> = ({
    isOpen,
    onClose,
    title,
    subtitle,
    infoCard,
    onSubmit,
    submitLabel = 'Save Changes',
    cancelLabel = 'Cancel',
    isSubmitting = false,
    submitDisabled = false,
    apiError,
    size = 'md',
    footer,
    children,
    confirmOnCancel = false,
    dirty = false,
}) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const [showConfirm, setShowConfirm] = useState(false);

    useEffect(() => {
        if (!isOpen) setShowConfirm(false);
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isOpen && e.key === 'Escape') {
                if (showConfirm) setShowConfirm(false);
                else handleCancelClick();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose, showConfirm]);

    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            if (showConfirm) setShowConfirm(false);
            else handleCancelClick();
        }
    };

    const handleCancelClick = () => {
        if (confirmOnCancel && dirty) {
            setShowConfirm(true);
        } else {
            onClose();
        }
    };

    const handleConfirmDiscard = () => {
        setShowConfirm(false);
        onClose();
    };

    if (!isOpen) return null;

    if (!isOpen) return null;

    if (!isOpen) return null;

    const content = (
        <div className="fm-modal-form-container">
            {infoCard && (
                <div className="fm-info-card">
                    <div className="fm-info-avatar">
                        {infoCard.avatarText.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="fm-info-details">
                        <h4 className="fm-info-name">{infoCard.title}</h4>
                        <span className="fm-info-subtext">{infoCard.subtitle}</span>
                    </div>
                    <StatusBadge status={infoCard.badgeText} />
                </div>
            )}

            <div className="fm-body">
                {children}
            </div>

            <div className="fm-footer">
                {footer ? (
                    footer
                ) : (
                    <>
                        <button
                            type="button"
                            className="fm-btn fm-btn-cancel"
                            onClick={handleCancelClick}
                            disabled={isSubmitting}
                        >
                            {cancelLabel}
                        </button>
                        {onSubmit && (
                            <button
                                type="submit"
                                className="fm-btn fm-btn-primary"
                                disabled={isSubmitting || submitDisabled}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 size={13} className="fm-spin" /> Saving…
                                    </>
                                ) : (
                                    submitLabel
                                )}
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    );

    return (
        <div className="fm-overlay" onClick={handleOverlayClick}>
            <ConfirmationModal
                isOpen={showConfirm}
                variant="warning"
                title="Discard changes?"
                description="You have unsaved changes. Are you sure you want to cancel?"
                confirmLabel="Discard"
                cancelLabel="Keep editing"
                onConfirm={handleConfirmDiscard}
                onCancel={() => setShowConfirm(false)}
            />
            <div
                className={`fm-card fm-size-${size}`}
                ref={cardRef}
                onClick={e => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
            >
                <div className="fm-header">
                    <div>
                        <h3 className="fm-title">{title}</h3>
                        {subtitle && <p className="fm-subtitle">{subtitle}</p>}
                    </div>
                    <button className="icon-btn" onClick={handleCancelClick}><X size={16} /></button>
                </div>

                {apiError && (
                    <div className="fm-api-error">
                        <AlertCircle size={14} />
                        <span>{apiError}</span>
                    </div>
                )}

                {onSubmit ? (
                    <form onSubmit={(e) => { e.preventDefault(); onSubmit(e); }} className="fm-form-wrapper">
                        {content}
                    </form>
                ) : (
                    content
                )}
            </div>
        </div>
    );
};

export default FormModal;
