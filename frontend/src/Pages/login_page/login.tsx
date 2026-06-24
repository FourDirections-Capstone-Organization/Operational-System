import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Package, User, Lock, Eye, EyeOff, Briefcase, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useToast } from '../../components/Toast/Toast';
import './login.css';

/* ── Types ── */
type StatusType = 'success' | 'error' | 'info' | '';

type UserRole =
    | 'SuperAdmin'
    | 'System Admin'
    | 'Operation Admin'
    | 'OpAdmin'
    | 'Coordinator'
    | 'Encoder';

interface LoginResponse {
    accessToken: string;
    role: UserRole;
    employeeName: string;
    employeeNumber: string;
    message?: string;
    isPasswordChanged: boolean;
}

/* ── Role helpers ── */
const normalizeRole = (role: string): UserRole | '' => {
    const map: Record<string, UserRole> = {
        superadmin: 'SuperAdmin',
        systemadmin: 'System Admin',
        'system admin': 'System Admin',
        operationadmin: 'Operation Admin',
        'operation admin': 'Operation Admin',
        opadmin: 'OpAdmin',
        coordinator: 'Coordinator',
        encoder: 'Encoder',
    };
    return map[role.toLowerCase()] ?? '';
};

const dashboardRoutes: Record<UserRole, string> = {
    SuperAdmin: '/SystemAdmin_Dashboard',
    'System Admin': '/SystemAdmin_Dashboard',
    'Operation Admin': '/OpAdmin_Dashboard',
    OpAdmin: '/OpAdmin_Dashboard',
    Coordinator: '/OpEmployee_Dashboard',
    Encoder: '/OpEmployee_Dashboard',
};

/* ══════════════════════════════════════════
   LOGIN PAGE
══════════════════════════════════════════ */
export default function Login() {
    const navigate = useNavigate();
    const { success } = useToast();

    const [employeeId, setEmployeeId] = useState('');
    const [password, setPassword] = useState('');
    const [statusMessage, setStatusMessage] = useState('');
    const [statusType, setStatusType] = useState<StatusType>('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [employeeIdError, setEmployeeIdError] = useState('');
    const [passwordError, setPasswordError] = useState('');

    useEffect(() => { setMounted(true); }, []);

    useEffect(() => {
        ['authToken', 'refreshToken', 'employeeId', 'employeeName',
            'firstName', 'middleName', 'lastName', 'suffix',
            'contactNumber', 'email', 'role', 'isPasswordChanged', 'userRole']
            .forEach(k => localStorage.removeItem(k));
    }, []);

    const updateStatus = (message: string, type: StatusType) => {
        setStatusMessage(message);
        setStatusType(type);
    };

    const validateEmployeeId = (value: string): string => {
        if (!value.trim()) return 'Employee ID is required.';
        if (value.trim().length > 20) return 'Employee ID must not exceed 20 characters.';
        const isStandard = /^[A-Za-z0-9-]{1,20}$/.test(value.trim());
        if (!isStandard) {
            return 'Enter a valid Employee ID (e.g. 0000 or 0001).';
        }
        return '';
    };

    const validatePassword = (value: string): string => {
        if (!value) return 'Password is required.';
        return '';
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const idErr = validateEmployeeId(employeeId);
        const pwErr = validatePassword(password);
        setEmployeeIdError(idErr);
        setPasswordError(pwErr);
        if (idErr || pwErr) return;

        setIsLoading(true);
        updateStatus('Authenticating...', 'info');

        try {
            const response = await fetch('/api/authentication/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employeeNumber: employeeId.trim(),
                    password,
                }),
            });

            let data: any = null;
            try {
                data = await response.json();
            } catch {
                // Non-JSON response — use status text if available
            }

            if (!response.ok) {
                const message = data?.message?.toLowerCase() ?? '';
                const statusMessage = data?.message || response.statusText || '';

                if (message.includes('on leave') || message.includes('onleave')) {
                    navigate('/account_locked', {
                        state: {
                            employeeNumber: employeeId.trim(),
                            employeeName: data?.employeeName ?? data?.EmployeeName ?? '',
                            reason: data?.message ?? data?.Message ?? '',
                            overrideToken: data?.overrideToken,
                            leaveId: data?.leaveId,
                        }
                    });
                    return;
                }

                if (message.includes('deactivated') || message.includes('locked')) {
                    navigate('/account_locked', {
                        state: {
                            employeeNumber: employeeId.trim(),
                            employeeName: data?.employeeName ?? data?.EmployeeName ?? '',
                            reason: data?.message ?? data?.Message ?? '',
                        }
                    });
                    return;
                }

                if (message.includes('verified') || message.includes('unverified') || message.includes('verify your email') || message.includes('email not verified')) {
                    updateStatus('Your account is not yet verified. Please check your email for the verification link.', 'error');
                    return;
                }

                updateStatus(statusMessage || 'Invalid Employee ID or password.', 'error');
                return;
            }

            const normalizedRole = normalizeRole(data.role);
            if (!normalizedRole) {
                updateStatus(`Unknown role: "${data.role}". Contact your administrator.`, 'error');
                return;
            }

            localStorage.setItem('authToken', data.accessToken);
            localStorage.setItem('userRole', normalizedRole);
            localStorage.setItem('employeeId', employeeId.trim());
            localStorage.setItem('isPasswordChanged', data.isPasswordChanged.toString());
            localStorage.setItem('contactNumber', data.contactNumber ?? data.contact ?? data.phoneNumber ?? '');
            localStorage.setItem('email', data.email ?? '');
            localStorage.setItem('firstName', data.firstName ?? '');
            localStorage.setItem('middleName', data.middleName ?? '');
            localStorage.setItem('lastName', data.lastName ?? '');
            localStorage.setItem('suffix', data.suffix ?? '');

            const fullName = [data.firstName, data.middleName, data.lastName, data.suffix]
                .map(s => (s ?? '').trim())
                .filter(Boolean)
                .join(' ');
            localStorage.setItem('employeeName', fullName || data.employeeName || '');

            updateStatus('Login successful. Redirecting...', 'success');
            success('Login successful! Welcome back.');

            if (!data.isPasswordChanged) {
                const isSeededSysAdmin = employeeId.trim() === '0000';
                if (isSeededSysAdmin) {
                    updateStatus('Please set your password.', 'info');
                    setTimeout(() => navigate('/set-password'), 800);
                } else {
                    updateStatus('Please complete your profile.', 'info');
                    setTimeout(() => navigate('/onboarding?fresh=true'), 800);
                }
                return;
            }

            setTimeout(() => {
                navigate(dashboardRoutes[normalizedRole]);
            }, 800);

        } catch {
            updateStatus('System not available at the moment. Please try again later.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={`login-page${mounted ? ' mounted' : ''}`}>

            {/* ── LEFT PANEL ── */}
            <aside className="login-left">
                <div className="login-left-content">

                    {/* Brand */}
                    <div className="login-brand">
                        <div className="brand-icon">
                            <Package size={22} />
                        </div>
                        <div>
                            <h1 className="brand-name">Speedex</h1>
                            <p className="brand-sub">COURIER & FORWARDER, INC.</p>
                        </div>
                    </div>

                    {/* Headline */}
                    <div className="login-headline">
                        <h2>
                            Fast deliveries,<br />
                            <span className="headline-accent">smarter logistics.</span>
                        </h2>
                        <p className="headline-body">
                            Manage shipments, monitor deliveries, and access your
                            operational dashboard — all in one place.
                        </p>
                    </div>

                    {/* Features */}
                    <div className="feature-list">
                        <FeatureItem
                            title="Real-Time Delivery Tracking"
                            description="Live shipment visibility and updates"
                        />
                        <FeatureItem
                            title="Operational Task Management"
                            description="Personalized and organized task workflow experience"
                        />
                        <FeatureItem
                            title="Courier Management"
                            description="Secured and efficient management of courier operations"
                        />
                    </div>

                    {/* ── Careers CTA (left panel) ── */}
                    <div className="careers-cta">
                        <div className="careers-cta-inner">
                            <div className="careers-cta-badge">
                                <span className="careers-dot" />
                                We're Hiring
                            </div>
                            <p className="careers-cta-text">
                                Interested in joining Speedex? Apply for open positions online.
                            </p>
                            <Link to="/apply" className="careers-cta-link">
                                View open positions →
                            </Link>
                        </div>
                    </div>

                </div>
            </aside>

            {/* ── RIGHT PANEL ── */}
            <main className="login-right">
                <div className="login-card">

                    {/* Card header */}
                    <div className="card-header">
                        <span className="header-badge">LOGIN PORTAL</span>
                        <h1 className="card-title">Welcome!</h1>
                        <p className="card-subtitle">
                            Sign in to continue to your workspace.
                        </p>
                    </div>

                    {/* Status message */}
                    {statusMessage && (
                        <div className={`status-bar ${statusType}`} role="alert">
                            <StatusIcon type={statusType} />
                            {statusMessage}
                        </div>
                    )}

                    {/* Form */}
                    <form className="login-form" onSubmit={handleSubmit} noValidate>

                        {/* Employee ID */}
                        <div className="field-group">
                            <label htmlFor="employeeId" className="field-label">
                                Employee ID <span style={{ color: 'var(--status-failed, #E31A1A)' }}>*</span>
                            </label>
                            <div className={`field-wrapper${employeeIdError ? ' field-error' : employeeId && !employeeIdError ? ' field-success' : ''}`}>
                                <span className="field-icon">
                                    <User size={16} />
                                </span>
                                <input
                                    id="employeeId"
                                    type="text"
                                    className="field-input"
                                    placeholder="e.g. 0001"
                                    value={employeeId}
                                    onChange={(e) => {
                                        setEmployeeId(e.target.value);
                                        setEmployeeIdError(validateEmployeeId(e.target.value));
                                    }}
                                    disabled={isLoading}
                                    autoComplete="username"
                                    autoFocus
                                    maxLength={20}
                                    required
                                />
                            </div>
                            {employeeIdError && (
                                <span className="field-err-msg">{employeeIdError}</span>
                            )}
                        </div>

                        {/* Password */}
                        <div className="field-group">
                            <label htmlFor="password" className="field-label">
                                Password <span style={{ color: 'var(--status-failed, #E31A1A)' }}>*</span>
                            </label>
                            <div className={`field-wrapper${passwordError ? ' field-error' : password && !passwordError ? ' field-success' : ''}`}>
                                <span className="field-icon">
                                    <Lock size={16} />
                                </span>
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    className="field-input"
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        setPasswordError(validatePassword(e.target.value));
                                    }}
                                    disabled={isLoading}
                                    autoComplete="current-password"
                                    maxLength={100}
                                    required
                                />
                                <button
                                    type="button"
                                    className="toggle-pw"
                                    onClick={() => setShowPassword((v) => !v)}
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            {passwordError && (
                                <span className="field-err-msg">{passwordError}</span>
                            )}
                        </div>

                        {/* Remember me / Forgot password */}
                        <div className="form-options">
                            <label className="remember-label">
                                <input type="checkbox" />
                                Remember me
                            </label>
                            <Link to="/forgotpassword_page" className="forgot-link">
                                Forgot password?
                            </Link>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            className={`submit-btn${isLoading ? ' loading' : ''}`}
                            disabled={isLoading}
                        >
                            {isLoading
                                ? <Loader2 size={18} className="spin" />
                                : 'LOGIN'
                            }
                        </button>

                    </form>

                    {/* ── Applicant portal divider ── */}
                    <div className="applicant-divider">
                        <span className="applicant-divider-line" />
                        <span className="applicant-divider-text">Not an employee?</span>
                        <span className="applicant-divider-line" />
                    </div>

                    {/* ── Apply now banner ── */}
                    <Link to="/apply" className="applicant-portal-btn">
                        <span className="applicant-portal-icon">
                            <Briefcase size={18} />
                        </span>
                        <span className="applicant-portal-content">
                            <span className="applicant-portal-label">Apply for a position</span>
                            <span className="applicant-portal-sub">Browse open roles at Speedex Courier</span>
                        </span>
                        <span className="applicant-portal-arrow">→</span>
                    </Link>

                    <div className="login-terms">
                        By using this service, you understand and agree to the PUP Online Services{' '}
                        <a href="#" className="terms-link">Terms of Use</a> and{' '}
                        <a href="#" className="terms-link">Privacy Statement</a>.
                    </div>

                    <p className="right-footer">
                        © 2026 Speedex Courier &amp; Forwarder, Inc. All rights reserved.
                    </p>
                </div>
            </main>
        </div>
    );
}

/* ── Sub-components ── */

function FeatureItem({ title, description }: { title: string; description: string }) {
    return (
        <div className="feature-item">
            <strong>{title}</strong>
            <span>{description}</span>
        </div>
    );
}

function StatusIcon({ type }: { type: StatusType }) {
    if (type === 'error') return <AlertCircle size={16} style={{ flexShrink: 0 }} />;
    if (type === 'success') return <CheckCircle size={16} style={{ flexShrink: 0 }} />;
    return <AlertCircle size={16} style={{ flexShrink: 0 }} />;
}