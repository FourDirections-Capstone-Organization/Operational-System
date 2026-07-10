import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, Mail, ArrowLeft, Package, AlertCircle, UserX, Clock, X, Loader2, CheckCircle2 } from 'lucide-react';
import './account_locked.css';

function FeatureItem({ title, description }: { title: string; description: string }) {
    return (
        <div className="feature-item">
            <strong>{title}</strong>
            <span>{description}</span>
        </div>
    );
}

function getReasonMeta(reason: string): {
    icon: React.ReactNode;
    title: string;
    description: string;
    why: string;
    type: 'failed' | 'leave' | 'deactivated';
} {
    const r = reason.toLowerCase();

    if (r.includes('3 consecutive') || r.includes('failed login') || r.includes('attempts')) {
        return {
            icon: <Lock size={18} />,
            title: 'Too Many Failed Attempts',
            description: 'Your account has been locked due to 3 consecutive failed login attempts.',
            why: 'The system automatically locks accounts after 3 failed login attempts to prevent unauthorized access.',
            type: 'failed',
        };
    }

    if (r.includes('leave')) {
        return {
            icon: <Clock size={18} />,
            title: 'Account On Leave',
            description: 'Your account is currently on leave and cannot be accessed.',
            why: 'Access is restricted while your account is in leave status. Contact your administrator for emergency access.',
            type: 'leave',
        };
    }

    return {
        icon: <UserX size={18} />,
        title: 'Account Deactivated',
        description: 'Your account has been deactivated by a Manager.',
        why: 'An administrator has manually deactivated your account. Please contact them directly for reactivation.',
        type: 'deactivated',
    };
}

// ─── Contact Admin Modal ───────────────────────────────────────────────────────

function ContactAdminModal({
    employeeNumber,
    employeeName,
    onClose,
}: {
    employeeNumber: string;
    employeeName: string;
    onClose: () => void;
}) {
    const [message, setMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async () => {
        if (!message.trim()) { setError('Please enter a message.'); return; }
        setSubmitting(true);
        setError('');
        try {
            const res = await fetch('/api/contact/activation-request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employeeNumber,
                    employeeName,
                    message: message.trim(),
                }),
            });
            if (!res.ok) throw new Error('Failed to send request.');
            setSubmitted(true);
        } catch (err: any) {
            setError(err.message ?? 'Something went wrong.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
            onClick={onClose}
        >
            <div
                style={{ background: 'white', borderRadius: 16, padding: '2rem', width: 420, maxWidth: '90vw' }}
                onClick={e => e.stopPropagation()}
            >
                {submitted ? (
                    <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(5,205,153,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                            <CheckCircle2 size={28} color="#05cd99" />
                        </div>
                        <h3 style={{ margin: '0 0 8px', fontSize: 18 }}>Request Sent</h3>
                        <p style={{ color: '#666', fontSize: 14, margin: '0 0 20px' }}>
                            Your activation request has been sent to a Manager.
                        </p>
                        <button onClick={onClose} style={{ width: '100%', padding: '10px', borderRadius: 10, border: '1px solid #ddd', cursor: 'pointer', fontSize: 14 }}>
                            Close
                        </button>
                    </div>
                ) : (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: 18 }}>Request Account Activation</h3>
                                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#666' }}>Send a message to a Manager.</p>
                            </div>
                            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}>
                                <X size={18} />
                            </button>
                        </div>

                        <div style={{ background: 'var(--bg-input)', borderRadius: 10, padding: '12px 14px', marginBottom: 16, fontSize: 13 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#666' }}>Employee Number</span>
                                <strong>{employeeNumber}</strong>
                            </div>
                            <div style={{ height: 1, background: '#eee', margin: '8px 0' }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#666' }}>Name</span>
                                <strong>{employeeName !== 'Employee' ? employeeName : '—'}</strong>
                            </div>
                        </div>

                        {error && (
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'var(--status-failed-bg)', border: '1px solid rgba(238,93,80,0.25)', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 13, color: 'var(--status-failed)' }}>
                                <AlertCircle size={14} />{error}
                            </div>
                        )}

                        <div style={{ marginBottom: 16 }}>
                            <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>Message to Administrator</label>
                            <textarea
                                rows={4}
                                maxLength={500}
                                placeholder="Explain why you need your account reactivated..."
                                value={message}
                                onChange={e => { setMessage(e.target.value); setError(''); }}
                                style={{ width: '100%', borderRadius: 8, border: '1px solid #ddd', padding: '8px 10px', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
                            />
                            <div style={{ fontSize: 11, color: '#999', textAlign: 'right', marginTop: 3 }}>{message.length} / 500</div>
                        </div>

                        <div style={{ display: 'flex', gap: 10 }}>
                            <button onClick={onClose} disabled={submitting} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid #ddd', cursor: 'pointer', fontSize: 14, background: 'white' }}>
                                Cancel
                            </button>
                            <button onClick={handleSubmit} disabled={submitting} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 14, background: 'var(--primary)', color: 'white', fontWeight: 500 }}>
                                {submitting ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><Loader2 size={14} /> Sending…</span> : 'Send Request'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function AccountLocked() {
    const navigate = useNavigate();
    const location = useLocation();

    const state = location.state as {
        employeeNumber?: string;
        employeeName?: string;
        reason?: string;
    } | null;

    const employeeName = state?.employeeName || 'Employee';
    const employeeNumber = state?.employeeNumber || '—';
    const reason = state?.reason || '';
    const meta = getReasonMeta(reason);

    const [showContactModal, setShowContactModal] = useState(false);

    const initials = employeeName
        .split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

    return (
        <div className="locked-page">

            {/* LEFT PANEL */}
            <aside className="locked-left">
                <div className="locked-left-content">
                    <div className="login-brand">
                        <div className="brand-icon"><Package size={20} /></div>
                        <div>
                            <h1 className="brand-name">Speedex</h1>
                            <p className="brand-sub">COURIER & FORWARDER, INC.</p>
                        </div>
                    </div>
                    <div className="login-headline">
                        <h2>
                            Secure access,<br />
                            <span className="headline-accent">protected operations.</span>
                        </h2>
                        <p className="headline-body">
                            Your account security is our priority.
                            Multiple failed attempts trigger protection mechanisms.
                        </p>
                    </div>
                    <p className="brand-sub">HOW TO UNLOCK YOUR ACCOUNT?</p>
                    <div className="feature-list">
                        <FeatureItem title="STEP 1" description="Contact your Manager." />
                        <FeatureItem title="STEP 2" description="A Manager will verify your identity and reactivate your account." />
                        <FeatureItem title="STEP 3" description="You will receive a new system-generated password." />
                    </div>
                </div>
            </aside>

            {/* RIGHT PANEL */}
            <div className="locked-right">
                <div className="locked-card">
                    <div className="locked-header">
                        <div className="locked-icon-wrapper"><Lock size={32} /></div>
                        <span className="locked-label label" style={{ color: 'var(--status-failed)' }}>
                            ACCOUNT LOCKED
                        </span>
                        <h2 className="locked-title">Access Restricted</h2>
                        <p className="locked-text">{meta.description}</p>
                    </div>

                    <div className="locked-info-box">
                        <div className="locked-info-icon"><AlertCircle size={18} /></div>
                        <div>
                            <strong>{meta.title}</strong>
                            <p>{meta.why}</p>
                        </div>
                    </div>

                    <div className="locked-user-card">
                        <div className="locked-user-avatar">{initials}</div>
                        <div className="locked-user-info">
                            <strong>{employeeNumber}</strong>
                            <span>{employeeName !== 'Employee' ? employeeName : '—'}</span>
                        </div>
                        <span className="locked-user-badge">
                            {meta.icon}
                            {meta.title}
                        </span>
                    </div>

                    {/* ACTION BUTTONS */}
                    {meta.type !== 'leave' && (
                        <button
                            className="locked-contact-btn"
                            onClick={() => setShowContactModal(true)}
                        >
                            <Mail size={18} />
                            CONTACT ADMINISTRATOR
                        </button>
                    )}

                    <button
                        type="button"
                        className="locked-back-link"
                        onClick={() => navigate('/')}
                    >
                        <ArrowLeft size={16} />
                        Back to Login
                    </button>

                    <div className="locked-footer">
                        © 2026{' '}
                        <a href="#">Speedex Courier & Forwarder, Inc.</a>
                        {' '}· All rights reserved.
                    </div>
                </div>
            </div>

            {/* MODALS */}
            {showContactModal && (
                <ContactAdminModal
                    employeeNumber={employeeNumber}
                    employeeName={employeeName}
                    onClose={() => setShowContactModal(false)}
                />
            )}
        </div>
    );
}