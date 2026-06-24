import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './change_password.css';

export default function ChangePassword() {
    const navigate = useNavigate();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false,
    });

    const togglePassword = (field: 'current' | 'new' | 'confirm') =>
        setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));

    const passwordRules = [
        { test: (p: string) => p.length >= 15, label: 'At least 15 characters' },
        { test: (p: string) => /[A-Z]/.test(p), label: 'At least one uppercase letter' },
        { test: (p: string) => /[a-z]/.test(p), label: 'At least one lowercase letter' },
        { test: (p: string) => /[0-9]/.test(p), label: 'At least one number' },
        { test: (p: string) => /[^A-Za-z0-9]/.test(p), label: 'At least one special character' },
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
            setError('Please fill in all fields.');
            return;
        }

        const failedRules = passwordRules.filter(r => !r.test(newPassword));
        if (failedRules.length > 0) {
            setError(`Password must include: ${failedRules.map(r => r.label).join(', ')}.`);
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setIsLoading(true);
        try {
            const token = localStorage.getItem('authToken');

            const res = await fetch('/api/profile/change-password', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ currentPassword, newPassword }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.message || 'Password change failed.');
            }
            localStorage.setItem('isPasswordChanged', 'true'); 

            const role = localStorage.getItem('userRole') ?? '';
            const routes: Record<string, string> = {
                'SuperAdmin': '/SystemAdmin_Dashboard',
                'System Admin': '/SystemAdmin_Dashboard',
                'Operation Admin': '/OpAdmin_Dashboard',
                'OpAdmin': '/OpAdmin_Dashboard',
                'Employee': '/OpEmployee_Dashboard',
            };
            navigate(routes[role] ?? '/');

        } catch (err: any) {
            setError(err.message ?? 'Something went wrong.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={`change-password-page${mounted ? ' mounted' : ''}`}>
            <div className="cp-card">

                {/* Header */}
                <div className="card-header">
                    <span className="header-badge">Security</span>
                    <h2 className="card-title">Change Password</h2>
                    <p className="card-subtitle">You must change your password before continuing.</p>
                </div>

                {/* Error */}
                {error && (
                    <div className="status-bar error">{error}</div>
                )}

                {/* Form */}
                <form className="cp-form" onSubmit={handleSubmit}>

                    <div className="field-group">
                        <label className="field-label">Current Password</label>
                        <div className="field-wrapper">
                            <span className="field-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                </svg>
                            </span>
                            <input
                                className="field-input"
                                type={showPasswords.current ? 'text' : 'password'}
                                value={currentPassword}
                                onChange={e => setCurrentPassword(e.target.value)}
                                placeholder="Enter current password"
                                disabled={isLoading}
                            />
                            <button type="button" className="toggle-pw" onClick={() => togglePassword('current')}>
                                <EyeIcon open={showPasswords.current} />
                            </button>
                        </div>
                    </div>

                    <div className="field-group">
                        <label className="field-label">New Password</label>
                        <div className="field-wrapper">
                            <span className="field-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                </svg>
                            </span>
                            <input
                                className="field-input"
                                type={showPasswords.new ? 'text' : 'password'}
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                placeholder="Enter new password"
                                disabled={isLoading}
                            />
                            <button type="button" className="toggle-pw" onClick={() => togglePassword('new')}>
                                <EyeIcon open={showPasswords.new} />
                            </button>
                        </div>

                        {/* Live password rules */}
                        {newPassword.length > 0 && (
                            <ul style={{ listStyle: 'none', padding: 0, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {passwordRules.map(rule => {
                                    const passed = rule.test(newPassword);
                                    return (
                                        <li key={rule.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: passed ? '#1a7a00' : '#8a96a8' }}>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                {passed
                                                    ? <polyline points="20 6 9 17 4 12" />
                                                    : <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>
                                                }
                                            </svg>
                                            {rule.label}
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>

                    <div className="field-group">
                        <label className="field-label">Confirm Password</label>
                        <div className="field-wrapper">
                            <span className="field-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                </svg>
                            </span>
                            <input
                                className="field-input"
                                type={showPasswords.confirm ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                placeholder="Confirm new password"
                                disabled={isLoading}
                            />
                            <button type="button" className="toggle-pw" onClick={() => togglePassword('confirm')}>
                                <EyeIcon open={showPasswords.confirm} />
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className={`submit-btn${isLoading ? ' loading' : ''}`}
                        disabled={isLoading}
                    >
                        {isLoading
                            ? <><span className="btn-spinner" /> Saving…</>
                            : 'Set New Password'
                        }
                    </button>
                </form>

                <p className="card-footer">Your session is protected. Changes take effect immediately.</p>
            </div>
        </div>
    );
}

function EyeIcon({ open }: { open: boolean }) {
    return open ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
            <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
            <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
    ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    );
}