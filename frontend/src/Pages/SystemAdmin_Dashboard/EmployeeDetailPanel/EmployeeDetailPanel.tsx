import { useEffect, useState } from 'react';
import {
    User,
    Phone,
    Shield,
    Hash,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Pencil,
    Save,
    X,
    Truck,
    ClipboardList,
    Package,
    ToggleLeft,
    ToggleRight,
    Trash2,
    Calendar,
    Clock,
    ChevronLeft,
    Mail,
    FileText,
    Download,
    Eye,
    EyeOff,
    Lock,
    Activity,
} from 'lucide-react';
import './EmployeeDetailPanel.css';
import { useToast } from '../../../components/Toast/Toast';
import FormModal from '../../../components/FormModal/FormModal';
import Digital201FileView from './../Digital201FileView/Digital201FileView';
import ConfirmationModal from '../../../components/ConfirmationModal/ConfirmationModal';
import DataTable from '../../../components/ui/DataTable';

interface ConfirmModalState {
    isOpen: boolean;
    variant: 'neutral' | 'danger' | 'warning' | 'info' | 'success';
    title: string;
    description: React.ReactNode;
    notice?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
}

const CONFIRM_CLOSED: ConfirmModalState = {
    isOpen: false,
    variant: 'neutral',
    title: '',
    description: '',
    onConfirm: () => {},
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface RecentEmployee {
    employeeNumber: string;
    employeeName: string;
    contactNumber: string;
    role: string;
    accountStatus: string;
    email?: string;
    attachments?: Array<{
        employeeAttachmentId: string;
        fileName: string;
        fileUrl: string;
        contentType: string;
        fileSize: number;
    }>;
}

interface DeliveryRecord {
    deliveryId: string;
    trackingNumber: string;
    recipient: string;
    destination: string;
    status: string;
    deliveredAt: string | null;
    assignedAt: string;
}

interface ActivityLog {
    id: number;
    description: string;
    timestamp: string;
}

// ─── Constants & Helpers ──────────────────────────────────────────────────────

const ROLES = [
    'System Admin',
    'Operation Admin',
    'Operation Team',
    'Coordinator',
    'Delivery Driver',
    'Encoder',
];

const toBackendRole = (role: string) => role.replace(/\s+/g, '');
const toDisplayRole = (role: string) => role.replace(/([a-z])([A-Z])/g, '$1 $2');

const fmtDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
};

const fmtDateTime = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const deliveryStatusClass = (s: string) => {
    const map: Record<string, string> = {
        delivered: 'ds-delivered',
        'in-transit': 'ds-transit',
        pending: 'ds-pending',
        failed: 'ds-failed',
        returned: 'ds-returned',
    };
    return map[s?.toLowerCase()] ?? 'ds-pending';
};

function Skeleton({ w = '100%', h = 16 }: { w?: string | number; h?: number }) {
    return <div className="skel" style={{ width: w, height: h }} />;
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

interface EditModalProps {
    profile: RecentEmployee;
    onClose: () => void;
    onSaved: (updated: RecentEmployee) => void;
    rolesList?: string[];
}

function EditProfileModal({ profile, onClose, onSaved, rolesList }: EditModalProps) {
    const [form, setForm] = useState({
        employeeName: profile.employeeName,
        contactNumber: profile.contactNumber,
        role: toDisplayRole(profile.role),
        accountStatus: profile.accountStatus,
        email: profile.email ?? '',
    });
    const [submitting, setSubmitting] = useState(false);
    const [apiError, setApiError] = useState('');
    const { success, error } = useToast();
    const [confirmModal, setConfirmModal] = useState<ConfirmModalState>(CONFIRM_CLOSED);
    const [gatePassword, setGatePassword] = useState('');
    const [gateError, setGateError] = useState('');
    const [gateLoading, setGateLoading] = useState(false);
    const [showGatePassword, setShowGatePassword] = useState(false);

    const initialValues = {
        employeeName: profile.employeeName,
        contactNumber: profile.contactNumber,
        role: toDisplayRole(profile.role),
        accountStatus: profile.accountStatus,
        email: profile.email ?? '',
    };
    const isDirty = JSON.stringify(form) !== JSON.stringify(initialValues);

    const handleClose = () => {
        onClose();
    };

    const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setForm(prev => ({ ...prev, [key]: e.target.value }));
        setApiError('');
    };

    const doSave = async () => {
        setSubmitting(true);
        try {
            const token = localStorage.getItem('authToken');

            const nameParts = form.employeeName.trim().split(/\s+/);
            let firstName = '';
            let middleName = '';
            let lastName = '';
            let suffix = '';

            if (nameParts.length === 1) {
                firstName = nameParts[0];
            } else if (nameParts.length === 2) {
                firstName = nameParts[0];
                lastName = nameParts[1];
            } else if (nameParts.length >= 3) {
                const lastPart = nameParts[nameParts.length - 1];
                const isSuffix = ['jr', 'sr', 'ii', 'iii', 'iv', 'v'].includes(lastPart.toLowerCase().replace(/\./g, ''));
                if (isSuffix) {
                    suffix = lastPart;
                    lastName = nameParts[nameParts.length - 2];
                    firstName = nameParts[0];
                    middleName = nameParts.slice(1, nameParts.length - 2).join(' ');
                } else {
                    lastName = lastPart;
                    firstName = nameParts[0];
                    middleName = nameParts.slice(1, nameParts.length - 1).join(' ');
                }
            }

            // 1. Update personal details
            const updateRes = await fetch(
                `/api/systemadmin/update-user?employeeNumber=${encodeURIComponent(profile.employeeNumber)}`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        employeeNumber: profile.employeeNumber,
                        firstName,
                        middleName,
                        lastName,
                        suffix,
                        contactNumber: form.contactNumber,
                        email: form.email.trim(),
                    }),
                }
            );
            if (!updateRes.ok) throw new Error('Failed to update employee details. Please try again.');

            // 2. Update role if changed
            if (toBackendRole(form.role) !== profile.role) {
                const roleRes = await fetch('/api/systemadmin/assign-role', {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        employeeNumber: profile.employeeNumber,
                        roleName: toBackendRole(form.role),
                    }),
                });
                if (!roleRes.ok) throw new Error('Failed to update employee role. Please try again.');
            }

            // 3. Update status in database if changed
            if (form.accountStatus !== profile.accountStatus) {
                const statusEndpoint =
                    form.accountStatus === 'Active'
                        ? '/api/systemadmin/activate-user'
                        : '/api/systemadmin/deactivate-user';

                const statusRes = await fetch(statusEndpoint, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        employeeNumber: profile.employeeNumber,
                    }),
                });
                if (!statusRes.ok) throw new Error('Failed to update account status. Please try again.');
            }

            onSaved({
                ...profile,
                employeeName: form.employeeName,
                contactNumber: form.contactNumber,
                role: toBackendRole(form.role),
                accountStatus: form.accountStatus,
                email: form.email.trim(),
            });
            success('Employee details updated successfully!');
            onClose();
        } catch (err: any) {
            error(err.message ?? 'Something went wrong.');
            setApiError(err.message ?? 'Something went wrong.');
        } finally {
            setSubmitting(false);
            setConfirmModal(CONFIRM_CLOSED);
        }
    };

    const handleSave = () => {
        if (!form.employeeName.trim()) {
            setApiError('Full name is required.');
            return;
        }
        setGatePassword('');
        setGateError('');
        setShowGatePassword(false);
        setConfirmModal({
            isOpen: true,
            variant: form.accountStatus !== profile.accountStatus
                ? (form.accountStatus === 'Active' ? 'success' : 'warning')
                : 'info',
            title: form.accountStatus !== profile.accountStatus
                ? `${form.accountStatus === 'Active' ? 'Activate' : 'Deactivate'} Account`
                : 'Confirm your identity',
            description: form.accountStatus !== profile.accountStatus
                ? `You are about to ${form.accountStatus === 'Active' ? 'activate' : 'deactivate'} ${profile.employeeName}. Enter your password to confirm.`
                : 'Enter your password to save these changes.',
            confirmLabel: form.accountStatus !== profile.accountStatus
                ? (form.accountStatus === 'Active' ? 'Activate account' : 'Deactivate account')
                : 'Verify & save',
            onConfirm: () => {
                setConfirmModal(CONFIRM_CLOSED);
                setGatePassword('');
                setGateError('');
                setShowGatePassword(false);
                setConfirmModal({
                    isOpen: true,
                    variant: 'info',
                    title: 'Confirm your identity',
                    description: (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-secondary)' }}>
                                Enter your password to confirm these changes.
                            </p>
                            <div style={{ position: 'relative' }}>
                                <input
                                    id="gate-pw-input"
                                    type={showGatePassword ? 'text' : 'password'}
                                    placeholder="Enter your current password"
                                    style={{ width: '100%', paddingRight: 40, boxSizing: 'border-box' }}
                                    autoFocus
                                    onChange={e => { setGatePassword(e.target.value); setGateError(''); }}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            const btn = document.getElementById('gate-confirm-btn');
                                            btn?.click();
                                        }
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowGatePassword(p => !p)}
                                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center' }}
                                    tabIndex={-1}
                                >
                                    {showGatePassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>
                            {gateError && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-danger)' }}>
                                    <AlertCircle size={12} />{gateError}
                                </div>
                            )}
                        </div>
                    ),
                    confirmLabel: gateLoading ? 'Verifying…' : 'Verify & save',
                    onConfirm: async () => {
                        const pw = (document.getElementById('gate-pw-input') as HTMLInputElement)?.value ?? gatePassword;
                        if (!pw) { setGateError('Please enter your password.'); return; }
                        setGateLoading(true);
                        setGateError('');
                        try {
                            const token = localStorage.getItem('authToken');
                            const adminId = localStorage.getItem('employeeId') ?? '';
                            const res = await fetch('/api/authentication/verify-password', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                body: JSON.stringify({ employeeID: adminId, password: pw }),
                            });
                            const verifyData = await res.json().catch(() => ({}));
                            if (!verifyData.isSuccess) { throw new Error(verifyData.message || verifyData.Message || 'Incorrect password. Please try again.'); }
                            setConfirmModal(CONFIRM_CLOSED);
                            await doSave();
                        } catch (err: any) {
                            setGateError(err.message ?? 'Incorrect password. Please try again.');
                        } finally {
                            setGateLoading(false);
                        }
                    },
                });
            },
        });
    };

    const infoCard = {
        avatarText: form.employeeName || '?',
        title: form.employeeName,
        subtitle: `Employee No. ${profile.employeeNumber}`,
        badgeText: form.accountStatus ?? 'Active',
        badgeStatus: form.accountStatus ?? 'Active'
    };

    return (
        <>
            <FormModal
                isOpen={true}
                onClose={handleClose}
                title="Edit Employee"
                subtitle={`Update details for ${profile.employeeName}`}
                infoCard={infoCard}
                apiError={apiError}
                onSubmit={handleSave}
                isSubmitting={submitting}
                size="md"
                confirmOnCancel={true}
                dirty={isDirty}
            >
                <div className="fm-section">
                    <h5 className="fm-section-title">Personal Information</h5>
                    <div className="fm-field-grid">
                        <div className="fm-field fm-field-full">
                            <label className="fm-label">Full Name</label>
                            <input type="text" value={form.employeeName} onChange={set('employeeName')} className="fm-input" />
                        </div>
                        <div className="fm-field">
                            <label className="fm-label">Email</label>
                            <input type="email" value={form.email} onChange={set('email')} className="fm-input" />
                        </div>
                        <div className="fm-field">
                            <label className="fm-label">Contact Number</label>
                            <input type="tel" value={form.contactNumber} onChange={set('contactNumber')} className="fm-input" />
                        </div>
                    </div>
                </div>

                <div className="fm-section">
                    <h5 className="fm-section-title">Account</h5>
                    <div className="fm-field-grid">
                        <div className="fm-field">
                            <label className="fm-label">Role</label>
                            <select value={form.role} onChange={set('role')} className="fm-select">
                                {(rolesList && rolesList.length > 0 ? rolesList : ROLES).map(r => (
                                    <option key={r} value={r}>
                                        {r}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="fm-field">
                            <label className="fm-label">Account Status</label>
                            <select value={form.accountStatus} onChange={set('accountStatus')} className="fm-select">
                                <option value="Active">Active</option>
                                <option value="Deactivated">Deactivated</option>
                                {profile.accountStatus === 'On Leave' && <option value="On Leave">On Leave</option>}
                                {profile.accountStatus === 'Emergency Overriden' && <option value="Emergency Overriden">Emergency Overriden</option>}
                            </select>
                        </div>
                    </div>
                </div>
            </FormModal>

            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                variant={confirmModal.variant}
                title={confirmModal.title}
                description={confirmModal.description}
                confirmLabel={confirmModal.confirmLabel}
                cancelLabel={confirmModal.cancelLabel}
                onConfirm={confirmModal.onConfirm}
                onCancel={() => setConfirmModal(CONFIRM_CLOSED)}
            />
        </>
    );
}

// ─── Main Panel Component ────────────────────────────────────────────────────

interface EmployeeDetailPanelProps {
    employee: RecentEmployee;
    initialSection?: 'overview' | 'deliveries' | 'activity' | 'digital_201';
    onBack: () => void;
    onEmployeeUpdated: (updated: RecentEmployee) => void;
    rolesList?: string[];
}

export default function EmployeeDetailPanel({
    employee,
    initialSection = 'overview',
    onBack,
    onEmployeeUpdated,
    rolesList,
}: EmployeeDetailPanelProps) {
    const [profile, setProfile] = useState<RecentEmployee>(employee);
    const [deliveries, setDeliveries] = useState<DeliveryRecord[]>([]);
    const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
    const [activityLogPage, setActivityLogPage] = useState(1);
    const activityLogPageSize = 10;

    const [loadingDeliveries, setLoadingDeliveries] = useState(true);
    const [loadingLogs, setLoadingLogs] = useState(true);
    const [showEdit, setShowEdit] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [activeSection, setActiveSection] = useState<'overview' | 'deliveries' | 'activity' | 'digital_201'>(initialSection);
    const { success, error } = useToast();
    const [confirmModal, setConfirmModal] = useState<ConfirmModalState>(CONFIRM_CLOSED);

    // Sync active section if initialSection prop changes
    useEffect(() => {
        setActiveSection(initialSection);
    }, [initialSection]);

    // Sync profile state if employee prop changes
    useEffect(() => {
        setProfile(employee);
    }, [employee]);

    // Fetch Deliveries
    useEffect(() => {
        const token = localStorage.getItem('authToken');
        setLoadingDeliveries(true);
        fetch(`/api/systemadmin/employee/${encodeURIComponent(profile.employeeNumber)}/deliveries`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(res => (res.ok ? res.json() : []))
            .then(data => setDeliveries(Array.isArray(data) ? data : []))
            .catch(() => setDeliveries([]))
            .finally(() => setLoadingDeliveries(false));
    }, [profile.employeeNumber]);

    // Fetch Activity Logs
    useEffect(() => {
        const token = localStorage.getItem('authToken');
        setLoadingLogs(true);
        fetch(`/api/activity-logs/employee/${encodeURIComponent(profile.employeeNumber)}`, {
            headers: { 'Authorization': `Bearer ${token}` },
            cache: 'no-store'
        })
            .then(res => (res.ok ? res.json() : []))
            .then(data => setActivityLogs(Array.isArray(data) ? data.map((log: any) => ({
                id: log.activityLogId,
                description: log.description,
                timestamp: log.createdAt,
            })) : []))
            .catch(() => setActivityLogs([]))
            .finally(() => setLoadingLogs(false));
    }, [profile.employeeNumber]);

    // Password gate helpers
    const [gatePassword, setGatePassword] = useState('');
    const [gateError, setGateError] = useState('');
    const [gateLoading, setGateLoading] = useState(false);
    const [showGatePassword, setShowGatePassword] = useState(false);
    const [pendingAction, setPendingAction] = useState<{ type: 'archive' | 'toggle'; nextStatus?: string } | null>(null);

    const showPasswordGate = (title: string, description: string, variant: 'danger' | 'warning' | 'info', action: { type: 'archive' | 'toggle'; nextStatus?: string }) => {
        setGatePassword('');
        setGateError('');
        setShowGatePassword(false);
        setPendingAction(action);
        setConfirmModal({
            isOpen: true,
            variant,
            title,
            description: (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>{description}</p>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>Enter your password to confirm.</p>
                    <div style={{ position: 'relative' }}>
                        <input id="gate-pw-input" type={showGatePassword ? 'text' : 'password'} placeholder="Enter your current password" style={{ width: '100%', paddingRight: 40, boxSizing: 'border-box', height: 38, borderRadius: 8, border: '1.5px solid #e2e8f0', padding: '0 40px 0 12px', fontSize: 13, outline: 'none' }} autoFocus onChange={e => { setGatePassword(e.target.value); setGateError(''); }} onKeyDown={e => { if (e.key === 'Enter') document.getElementById('gate-confirm-btn')?.click(); }} />
                        <button type="button" onClick={() => setShowGatePassword(p => !p)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }} tabIndex={-1}>{showGatePassword ? <EyeOff size={15} /> : <Eye size={15} />}</button>
                    </div>
                    {gateError && <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#dc2626' }}><AlertCircle size={12} />{gateError}</div>}
                </div>
            ),
            confirmLabel: 'Verify & proceed',
            onConfirm: async () => {
                const pw = (document.getElementById('gate-pw-input') as HTMLInputElement)?.value ?? gatePassword;
                if (!pw) { setGateError('Please enter your password.'); return; }
                setGateLoading(true);
                setGateError('');
                try {
                    const token = localStorage.getItem('authToken');
                    const adminId = localStorage.getItem('employeeId') ?? '';
                    const verifyRes = await fetch('/api/authentication/verify-password', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify({ employeeID: adminId, password: pw }),
                    });
                    const verifyData = await verifyRes.json().catch(() => ({}));
                    if (!verifyData.isSuccess) { throw new Error(verifyData.message || verifyData.Message || 'Incorrect password.'); }
                    setConfirmModal(CONFIRM_CLOSED);
                    if (action.type === 'archive') {
                        setDeleting(true);
                        try {
                            const delRes = await fetch('/api/systemadmin/delete-user', {
                                method: 'DELETE', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                body: JSON.stringify({ employeeNumber: profile.employeeNumber }),
                            });
                            if (!delRes.ok) throw new Error();
                            success(`Successfully archived ${profile.employeeName}.`);
                            onEmployeeUpdated({ ...profile, accountStatus: '__deleted__' });
                        } catch { error('Failed to Archive Employee.'); } finally { setDeleting(false); }
                    } else {
                        const next = action.nextStatus!;
                        const endpoint = next === 'Active' ? '/api/systemadmin/activate-user' : '/api/systemadmin/deactivate-user';
                        try {
                            const statusRes = await fetch(endpoint, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ employeeNumber: profile.employeeNumber }) });
                            if (!statusRes.ok) throw new Error();
                            const updatedProfile = { ...profile, accountStatus: next };
                            setProfile(updatedProfile);
                            onEmployeeUpdated(updatedProfile);
                            success(`Successfully ${next === 'Active' ? 'activated' : 'deactivated'} ${profile.employeeName}.`);
                        } catch { error(`Failed to ${next === 'Active' ? 'activate' : 'deactivate'} employee.`); }
                    }
                } catch (err: any) { setGateError(err.message ?? 'Incorrect password.'); }
                finally { setGateLoading(false); }
            },
        });
    };

    // Archive Employee
    const handleDelete = () => {
        showPasswordGate('Archive Employee', `Are you sure you want to permanently archive ${profile.employeeName}? This action cannot be undone.`, 'danger', { type: 'archive' });
    };

    // Toggle status (Activate/Deactivate)
    const handleToggleStatus = () => {
        const isActive = ['Active', 'On Leave', 'Emergency Overriden'].includes(profile.accountStatus);
        const next = isActive ? 'Deactivated' : 'Active';
        showPasswordGate(`${next === 'Active' ? 'Activate' : 'Deactivate'} Employee`, `Are you sure you want to ${next === 'Deactivated' ? 'deactivate' : 'activate'} ${profile.employeeName}?`, 'warning', { type: 'toggle', nextStatus: next });
    };

    const completedCount = deliveries.filter(d => d.status?.toLowerCase() === 'delivered').length;
    const transitCount = deliveries.filter(d => d.status?.toLowerCase() === 'in-transit').length;
    const failedCount = deliveries.filter(d => ['failed', 'returned'].includes(d.status?.toLowerCase())).length;

    return (
        <div className="ed-main" style={{ minHeight: 'calc(100vh - 84px)', display: 'flex', flexDirection: 'column' }}>
            {/* Top actions bar */}
            <div className="ed-topbar">
                <button className="ed-btn ed-btn-ghost" onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <ChevronLeft size={16} /> Back to Employees
                </button>
                <div className="ed-topbar-actions">
                    <button
                        className={`ed-btn ed-btn-ghost ${['Active', 'On Leave', 'Emergency Overriden'].includes(profile.accountStatus) ? 'deactivate' : 'activate'}`}
                        onClick={handleToggleStatus}
                    >
                        {['Active', 'On Leave', 'Emergency Overriden'].includes(profile.accountStatus) ? (
                            <>
                                <ToggleLeft size={15} /> Deactivate
                            </>
                        ) : (
                            <>
                                <ToggleRight size={15} /> Activate
                            </>
                        )}
                    </button>
                    <button className="ed-btn ed-btn-secondary" onClick={() => setShowEdit(true)}>
                        <Pencil size={14} /> Edit Profile
                    </button>
                    <button className="ed-btn ed-btn-danger" onClick={handleDelete} disabled={deleting}>
                        {deleting ? <Loader2 size={14} className="spin" /> : <Trash2 size={14} />} Delete
                    </button>
                </div>
            </div>

            {/* Hero banner */}
            <div className="ed-hero">
                <div className="ed-hero-inner">
                    <div className="ed-hero-avatar">{profile.employeeName.charAt(0).toUpperCase()}</div>
                    <div className="ed-hero-info">
                        <div className="ed-hero-name-row">
                            <h1>{profile.employeeName}</h1>
                            <span className={`ed-status-pill ${profile.accountStatus.toLowerCase().replace(/\s+/g, '-')}`}>
                                {profile.accountStatus}
                            </span>
                        </div>
                        <div className="ed-hero-meta">
                            <span>
                                <Hash size={13} /> {profile.employeeNumber}
                            </span>
                            <span>
                                <Mail size={13} /> {profile.email || '—'}
                            </span>
                            <span>
                                <Shield size={13} /> {toDisplayRole(profile.role)}
                            </span>
                            <span>
                                <Phone size={13} /> {profile.contactNumber || '—'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="ed-hero-stats">
                    {[
                        { label: 'Total Deliveries', value: deliveries.length, cls: '' },
                        { label: 'Completed', value: completedCount, cls: 'green' },
                        { label: 'In Transit', value: transitCount, cls: 'amber' },
                        { label: 'Failed / Returned', value: failedCount, cls: 'red' },
                        { label: 'Activity Logs', value: activityLogs.length, cls: '' },
                    ].map(({ label, value, cls }) => (
                        <div key={label} className="ed-hero-stat">
                            <span className={`ed-hero-stat-value ${cls}`}>
                                {loadingDeliveries ? '—' : value}
                            </span>
                            <span className="ed-hero-stat-label">{label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Section tabs */}
            <div className="ed-section-tabs">
                {([
                    { key: 'overview', icon: User, label: 'Overview' },
                    { key: 'deliveries', icon: Truck, label: 'Delivery History' },
                    { key: 'activity', icon: ClipboardList, label: 'Activity Logs' },
                    { key: 'digital_201', icon: FileText, label: 'Digital 201 File' },
                ] as const).map(({ key, icon: Icon, label }) => (
                    <button
                        key={key}
                        className={`ed-section-tab ${activeSection === key ? 'active' : ''}`}
                        onClick={() => setActiveSection(key)}
                    >
                        <Icon size={15} /> {label}
                    </button>
                ))}
            </div>

            {/* Body content */}
            <div className="ed-body" style={{ flex: 1 }}>
                {activeSection === 'overview' && (
                    <div className="ed-overview-grid">
                        {/* Personal Information */}
                        <div className="ed-card">
                            <div className="ed-card-header">
                                <h3>
                                    <User size={15} /> Personal Information
                                </h3>
                            </div>
                            <div className="ed-field-list">
                                {[
                                    { label: 'Employee Number', value: profile.employeeNumber, icon: Hash },
                                    { label: 'Full Name', value: profile.employeeName, icon: User },
                                    { label: 'Email', value: profile.email || '—', icon: Mail },
                                    { label: 'Contact Number', value: profile.contactNumber || '—', icon: Phone },
                                    { label: 'Role', value: toDisplayRole(profile.role), icon: Shield },
                                    { label: 'Account Status', value: profile.accountStatus, icon: CheckCircle2 },
                                ].map(({ label, value, icon: Icon }) => (
                                    <div key={label} className="ed-info-row">
                                        <span className="ed-info-label">
                                            <Icon size={12} /> {label}
                                        </span>
                                        <span
                                            className={`ed-info-value ${label === 'Account Status' ? `status-${value.toLowerCase()}` : ''
                                                }`}
                                        >
                                            {value}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Recent Activity */}
                        <div className="ed-card">
                            <div className="ed-card-header">
                                <h3>
                                    <Clock size={15} /> Recent Activity
                                </h3>
                                <button className="ed-view-all" onClick={() => setActiveSection('activity')}>
                                    View all →
                                </button>
                            </div>
                            {loadingLogs ? (
                                <div className="ed-log-list">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="ed-log-item">
                                            <Skeleton w="70%" />
                                            <Skeleton w="25%" />
                                        </div>
                                    ))}
                                </div>
                            ) : activityLogs.length === 0 ? (
                                <div className="ed-empty">
                                    <ClipboardList size={18} />
                                    <p>No activity recorded</p>
                                </div>
                            ) : (
                                <div className="ed-log-list">
                                    {activityLogs.slice(0, 5).map(log => (
                                        <div key={log.id} className="ed-log-item">
                                            <span className="ed-log-dot" />
                                            <span className="ed-log-desc">{log.description}</span>
                                            <span className="ed-log-time">{fmtDateTime(log.timestamp)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Uploaded Documents */}
                        <div className="ed-card ed-card-full" style={{ marginTop: 20 }}>
                            <div className="ed-card-header">
                                <h3>
                                    <FileText size={15} /> Uploaded Documents / Attachments
                                </h3>
                                <span className="ed-badge-count">
                                    {profile.attachments?.length ?? 0} files
                                </span>
                            </div>
                            <div style={{ padding: '20px' }}>
                                {!profile.attachments || profile.attachments.length === 0 ? (
                                    <div className="ed-empty" style={{ padding: '24px 0' }}>
                                        <FileText size={20} />
                                        <p>No documents uploaded yet</p>
                                    </div>
                                ) : (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                                        {profile.attachments.map(att => {
                                            const sizeMB = (att.fileSize / (1024 * 1024)).toFixed(2);
                                            return (
                                                <div key={att.employeeAttachmentId} style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', background: 'var(--bg-main)', borderRadius: 12, border: '1px solid var(--border)', justifyContent: 'space-between' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                                                        <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(67, 24, 255, 0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                            <FileText size={16} color="var(--primary)" />
                                                        </div>
                                                        <div style={{ minWidth: 0 }}>
                                                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={att.fileName}>
                                                                {att.fileName}
                                                            </div>
                                                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                                                                {sizeMB} MB
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <a href={att.fileUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 6, border: '1.5px solid var(--border)', color: 'var(--text-secondary)', transition: 'all 0.15s ease' }} title="Download / Open file">
                                                        <Download size={14} />
                                                    </a>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeSection === 'deliveries' && (
                    <div className="ed-card">
                        <div className="ed-card-header">
                            <h3>
                                <Truck size={15} /> Delivery History
                            </h3>
                            <span className="ed-badge-count">{deliveries.length} records</span>
                        </div>
                        {loadingDeliveries ? (
                            <div className="ed-empty">
                                <Loader2 size={22} className="spin" />
                                <p>Loading deliveries…</p>
                            </div>
                        ) : deliveries.length === 0 ? (
                            <div className="ed-empty">
                                <Package size={24} />
                                <p>No delivery records found</p>
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table className="ed-table">
                                    <thead>
                                        <tr>
                                            <th>Tracking #</th>
                                            <th>Recipient</th>
                                            <th>Destination</th>
                                            <th>Status</th>
                                            <th>Assigned</th>
                                            <th>Delivered</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {deliveries.map(d => (
                                            <tr key={d.deliveryId}>
                                                <td className="ed-tracking-num">{d.trackingNumber}</td>
                                                <td>{d.recipient}</td>
                                                <td>{d.destination}</td>
                                                <td>
                                                    <span className={`ed-delivery-badge ${deliveryStatusClass(d.status)}`}>
                                                        {d.status}
                                                    </span>
                                                </td>
                                                <td>{fmtDate(d.assignedAt)}</td>
                                                <td>{fmtDate(d.deliveredAt)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {activeSection === 'activity' && (
                    <div className="ed-card">
                        <div className="ed-card-header">
                            <h3>
                                <ClipboardList size={15} /> Activity Logs
                            </h3>
                            <span className="ed-badge-count">{activityLogs.length} entries</span>
                        </div>
                        {loadingLogs ? (
                            <div className="ed-empty">
                                <Loader2 size={22} className="spin" />
                                <p>Loading logs…</p>
                            </div>
                        ) : (
                            <DataTable
                                headers={['Date & Time', 'Description']}
                                loading={false}
                                emptyMessage="No activity logs found"
                                emptyIcon={<Activity size={24} />}
                                totalRecords={activityLogs.length}
                                currentPage={activityLogPage}
                                totalPages={Math.max(1, Math.ceil(activityLogs.length / activityLogPageSize))}
                                onPageChange={p => setActivityLogPage(p)}
                            >
                                {activityLogs
                                    .slice((activityLogPage - 1) * activityLogPageSize, activityLogPage * activityLogPageSize)
                                    .map(log => (
                                    <tr key={log.id}>
                                        <td style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                                            {fmtDateTime(log.timestamp)}
                                        </td>
                                        <td style={{ fontSize: 13, color: 'var(--text-primary)' }}>{log.description}</td>
                                    </tr>
                                ))}
                            </DataTable>
                        )}
                    </div>
                )}

                {activeSection === 'digital_201' && (
                    <Digital201FileView
                        employeeNumber={profile.employeeNumber}
                        readOnly={true}
                        onAttachmentsChanged={(attachments) => {
                            const updatedProfile = {
                                ...profile,
                                attachments: attachments.map(a => ({
                                    employeeAttachmentId: a.employeeAttachmentId,
                                    fileName: a.fileName,
                                    fileUrl: a.fileUrl,
                                    contentType: a.contentType,
                                    fileSize: a.fileSize
                                }))
                            };
                            setProfile(updatedProfile);
                            onEmployeeUpdated(updatedProfile);
                        }}
                    />
                )}
            </div>

            {showEdit && (
                <EditProfileModal
                    profile={profile}
                    rolesList={rolesList}
                    onClose={() => setShowEdit(false)}
                    onSaved={updated => {
                        setProfile(updated);
                        onEmployeeUpdated(updated);
                        setShowEdit(false);
                    }}
                />
            )}

            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                variant={confirmModal.variant}
                title={confirmModal.title}
                description={confirmModal.description}
                confirmLabel={confirmModal.confirmLabel}
                cancelLabel={confirmModal.cancelLabel}
                isLoading={gateLoading}
                onConfirm={confirmModal.onConfirm}
                onCancel={() => setConfirmModal(CONFIRM_CLOSED)}
            />
        </div>
    );
}