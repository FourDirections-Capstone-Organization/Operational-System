import { useEffect, useState, useRef } from 'react';
import {
    Users,
    ClipboardList,
    CheckCircle2,
    AlertCircle,
    Package,
    LayoutDashboard,
    Truck,
    BarChart3,
    UserCircle2,
    X,
    Save,
    Loader2,
    Plus,
    Pencil,
    Trash2,
    Search,
    Phone,
    Shield,
    Hash,
    ChevronLeft,
    ChevronRight,
    Lock,
    Eye,
    EyeOff,
    Clock,
    Filter,
    Copy,
    ShieldAlert,
    ShieldCheck,
    LogOut,
    Settings,
    Activity,
    FileText,
    Mail,
    Download,
    RefreshCw,
    GitBranch,
} from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import './SystemAdmin_Dashboard.css';
import { useNavigate } from 'react-router-dom';
import NotificationBell from '../../components/NotificationBell/NotificationBell';
import { useToast } from '../../components/Toast/Toast';
import SearchBar from '../../components/ui/SearchBar';
import EmptyState from '../../components/ui/EmptyState';
import ErrorBanner from '../../components/ui/ErrorBanner';
import StatusBadge from '../../components/ui/StatusBadge';
import RoleBadge from '../../components/ui/RoleBadge';
import Select from '../../components/ui/Select';
import Pagination from '../../components/ui/Pagination';
import FormModal from '../../components/FormModal/FormModal';
import EmployeeDetailPanel from './EmployeeDetailPanel/EmployeeDetailPanel';
import { usePreventBackNav } from '../../components/Auth/usePreventBackNav';
import ConfirmationModal from '../../components/ConfirmationModal/ConfirmationModal';
import RoleManagementTab, { DepartmentResponseDTO, JobPositionResponseDTO } from './RoleManagementTab/RoleManagementTab';
import DashboardHeader from '../../components/DashboardHeader/DashboardHeader';
import StatCard from '../../components/StatCard/StatCard';
import ActionButton from '../../components/ActionButton/ActionButton';
import DataTable, { ActionsDropdown } from '../../components/ui/DataTable';
import SubTabNav from '../../components/ui/SubTabNav';
import EmployeeDocumentsTab from './EmployeeDocumentsTab/EmployeeDocumentsTab';
import OrgStructureTab from './OrgStructureTab/OrgStructureTab';
import { ReportsTab } from '../OpAdmin_Dashboard/OpAdmin_Dashboard';
import TaskManager from '../../components/TaskManager/TaskManager';
import TaskView, { TaskViewTask } from '../../components/TaskView/TaskView';

// ─── Types ────────────────────────────────────────────────────────────────────

type NavTab =
    | 'dashboard'
    | 'employees'
    | 'delivery'
    | 'finance'
    | 'settings'
    | 'roles'
    | 'reports'
    | 'activity_logs'
    | 'government_records'
    | 'tasks'
    | 'profile'
    | 'org-structure';

// ─── Updated Types ────────────────────────────────────────────────────────────

interface EmployeeRegisterDTO {
    employeeNumber: string;
    firstName: string;
    middleName: string;
    lastName: string;
    suffix: string;
    contactNumber: string;
    email: string;
    departmentId: string;
    jobPositionId: string;
    role: string;
    employmentStatus: string;
}

interface FieldError {
    firstName?: string;
    lastName?: string;
    email?: string;
    departmentId?: string;
    jobPositionId?: string;
    role?: string;
    contactNumber?: string;
}

type FormState = EmployeeRegisterDTO;

const EMPTY_FORM: FormState = {
    employeeNumber: '',
    firstName: '',
    middleName: '',
    lastName: '',
    suffix: '',
    contactNumber: '',
    email: '',
    departmentId: '',
    jobPositionId: '',
    role: '',
    employmentStatus: '',
};

interface ActivityLog {
    activityLogId: string;
    accountId: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    suffix?: string;
    activityType: string;
    description: string;
    createdAt: string;
}

interface RecentEmployee {
    employeeNumber: string;
    employeeName: string;
    firstName?: string;
    middleName?: string;
    lastName?: string;
    suffix?: string;
    contactNumber: string;
    role: string;
    accountStatus: string;
    presenceStatus?: string;
    email?: string;
    attachments?: Array<{
        employeeAttachmentId: string;
        fileName: string;
        fileUrl: string;
        contentType: string;
        fileSize: number;
    }>;
}

interface EmploymentContract {
    employeeAttachmentId: string;
    fileName: string;
    fileUrl: string;
    contentType: string;
    fileSize: number;
    version: number;
    documentType: string;
    isArchived: boolean;
    uploadedAt: string;
    employeeNumber: string;
    firstName: string;
    lastName: string;
    departmentName?: string;
    jobPositionTitle?: string;
}

// ─── ConfirmModal state shape ─────────────────────────────────────────────────

interface ConfirmModalState {
    isOpen: boolean;
    variant: 'danger' | 'warning' | 'info' | 'success' | 'neutral';
    title: string;
    description: React.ReactNode;
    notice?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    isLoading?: boolean;
    onConfirm: () => void;
}

const CONFIRM_CLOSED: ConfirmModalState = {
    isOpen: false,
    variant: 'neutral',
    title: '',
    description: '',
    onConfirm: () => { },
};

// ─── Constants ────────────────────────────────────────────────────────────────


const SYSTEM_ROLES = ['Manager', 'Coordinator', 'Dispatcher', 'Encoder', 'Courier', 'Accountant'];

const DEPARTMENTS = [
    'Operations',
    'Logistics',
    'Finance',
    'Human Resources',
    'Information Technology',
    'Customer Service',
    'Administration',
];

const POSITIONS: Record<string, string[]> = {
    'Operations': ['Operations Manager', 'Operations Coordinator', 'Operations Analyst'],
    'Logistics': ['Logistics Coordinator', 'Delivery Driver', 'Warehouse Staff'],
    'Finance': ['Finance Manager', 'Accountant', 'Finance Analyst'],
    'Human Resources': ['HR Manager', 'HR Coordinator', 'Recruiter'],
    'Information Technology': ['IT Manager', 'System Administrator', 'Developer', 'IT Support'],
    'Customer Service': ['Customer Service Manager', 'Customer Service Representative'],
    'Administration': ['Administrative Officer', 'Encoder', 'Data Entry Specialist'],
};

const EMPLOYMENT_STATUSES = ['Active', 'Probationary', 'Contractual'];

const PAGE_SIZE = 10;

const NAV_GROUPS = [
    {
        label: 'MAIN MENU',
        items: [
            { tab: 'dashboard' as NavTab, icon: LayoutDashboard, label: 'Dashboard' },
            { tab: 'employees' as NavTab, icon: Users, label: 'Manage Employee' },
        ],
    },
    {
        label: 'INTEGRATION',
        items: [
            { tab: 'delivery' as NavTab, icon: FileText, label: 'Delivery Summary' },
            { tab: 'tasks' as NavTab, icon: ClipboardList, label: 'Task Management' },
            { tab: 'finance' as NavTab, icon: BarChart3, label: 'Finance' },
        ],
    },
    {
        label: 'REPORTS',
        items: [
            { tab: 'reports' as NavTab, icon: BarChart3, label: 'Reports' },
        ],
    },
    {
        label: 'COMPLIANCE',
        items: [
            { tab: 'government_records' as NavTab, icon: ShieldCheck, label: 'Government Records' },
        ],
    },
    {
        label: 'SYSTEM',
        items: [
            { tab: 'settings' as NavTab, icon: Settings, label: 'Settings' },
            { tab: 'roles' as NavTab, icon: Shield, label: 'Role Management' },
            { tab: 'org-structure' as NavTab, icon: GitBranch, label: 'Org Structure' },
            { tab: 'activity_logs' as NavTab, icon: Activity, label: 'Activity Logs' },
        ],
    },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const buildDisplayName = (
    firstName: string,
    middleName: string,
    lastName: string,
    suffix: string
): string => {
    return [firstName, middleName, lastName, suffix]
        .map(s => s.trim())
        .filter(Boolean)
        .join(' ');
};

const getEmployeeDisplayName = (emp: RecentEmployee): string => {
    if (emp.firstName || emp.lastName) {
        return buildDisplayName(
            emp.firstName ?? '',
            emp.middleName ?? '',
            emp.lastName ?? '',
            emp.suffix ?? ''
        );
    }
    return emp.employeeName ?? '';
};

function validate(form: FormState): FieldError {
    const errs: FieldError = {};

    // Email
    const email = form.email.trim();
    if (!email) {
        errs.email = 'Email address is required.';
    } else if (email.length > 100) {
        errs.email = 'Email must not exceed 100 characters.';
    } else if (!/^[a-zA-Z0-9._+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(email)) {
        errs.email = 'Enter a valid email address.';
    }

    // Department
    if (!form.departmentId) errs.departmentId = 'Please select a department.';

    // Position
    if (!form.jobPositionId) errs.jobPositionId = 'Please select a position.';

    // Role
    if (!form.role) {
        errs.role = 'Please select a system role.';
    }

    // Contact Number
    const contact = form.contactNumber.trim();
    if (!contact) {
        errs.contactNumber = 'Contact number is required.';
    } else if (!/^09\d{9}$/.test(contact)) {
        errs.contactNumber = 'Enter a valid PH mobile number (09xxxxxxxxx).';
    }

    return errs;
}

const toBackendRole = (role: string) => {
    const roleMap: Record<string, number> = {
        Manager: 0, Coordinator: 1, Dispatcher: 2,
        Encoder: 3, Courier: 4, Accountant: 5,
    };
    return roleMap[role] ?? 3; // default to Encoder (3)
};
const ROLE_MAP: Record<number, string> = { 0: 'Manager', 1: 'Coordinator', 2: 'Dispatcher', 3: 'Encoder', 4: 'Courier', 5: 'Accountant' };
const toDisplayRole = (role: any) => {
    if (typeof role === 'number') return ROLE_MAP[role] || String(role);
    if (typeof role === 'string') {
        const num = parseInt(role, 10);
        if (!isNaN(num)) return ROLE_MAP[num] || role;
        return role;
    }
    return String(role || '');
};

const fmtDate = (d: string): string => {
    if (!d) return '—';
    return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const calcDays = (start: string, end: string): number =>
    Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1;

const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = 2;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const getInitials = (name: string): string => {
    if (!name) return 'SA';
    const cleanName = name.trim();
    const parts = cleanName.split(/\s+/);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return cleanName.slice(0, 2).toUpperCase();
};

const getStatusBadgeClass = (status?: string): string => {
    const s = (status ?? 'Active').toLowerCase();
    if (s === 'pending verification') return 'pending-badge';
    if (s === 'on leave' || s === 'locked') return 'locked';
    return s;
};

// ─── Shared Pagination Helper ─────────────────────────────────────────────────

function getPageNumbers(total: number, current: number): (number | '...')[] {
    const pages: (number | '...')[] = [];
    if (total <= 5) {
        for (let i = 1; i <= total; i++) pages.push(i);
    } else {
        pages.push(1);
        if (current > 3) pages.push('...');
        const start = Math.max(2, current - 1);
        const end = Math.min(total - 1, current + 1);
        for (let i = start; i <= end; i++) pages.push(i);
        if (current < total - 2) pages.push('...');
        pages.push(total);
    }
    return pages;
}

// ─── Add Employee Modal ───────────────────────────────────────────────────────

interface AddEmployeeModalProps {
    onClose: () => void;
    onSuccess: (employee: RecentEmployee) => void;
}


function AddEmployeeModal({ onClose, onSuccess }: AddEmployeeModalProps) {
    const [form, setForm] = useState<FormState>({ ...EMPTY_FORM });
    const [errors, setErrors] = useState<FieldError>({});
    const [dirty, setDirty] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [apiError, setApiError] = useState('');
    const [successData, setSuccessData] = useState<{ employeeNumber: string } | null>(null);
    const [empNumLoading, setEmpNumLoading] = useState(true);
    const [empNumError, setEmpNumError] = useState('');
    const [departments, setDepartments] = useState<DepartmentResponseDTO[]>([]);
    const [jobPositions, setJobPositions] = useState<JobPositionResponseDTO[]>([]);
    const [availableRoles, setAvailableRoles] = useState<string[]>(['Manager', 'Coordinator', 'Dispatcher', 'Encoder', 'Courier', 'Accountant']);
    const [loadingOrg, setLoadingOrg] = useState(true);
    const { success } = useToast();

    useEffect(() => {
        const loadOrgData = async () => {
            setLoadingOrg(true);
            try {
                const token = localStorage.getItem('authToken');
                const headers = { 'Authorization': `Bearer ${token}` };

                const [dRes, pRes, rRes] = await Promise.all([
                    fetch('/api/department', { headers }),
                    fetch('/api/job-positions', { headers }),
                    fetch('/api/role', { headers })
                ]);

                if (dRes.ok && pRes.ok && rRes.ok) {
                    const deptsData = await dRes.json();
                    const posData = await pRes.json();
                    const rolesData = await rRes.json();

                    const rawDepts = Array.isArray(deptsData) ? deptsData : deptsData.data ?? deptsData.$values ?? [];
                    const rawPos = Array.isArray(posData) ? posData : posData.data ?? posData.$values ?? [];
                    const rawRoles = Array.isArray(rolesData) ? rolesData : rolesData.data ?? rolesData.$values ?? [];

                    setDepartments(rawDepts.map((d: any) => ({
                        departmentId: d.id ?? d.departmentId ?? d.DepartmentId,
                        name: d.name ?? d.Name,
                        isActive: d.isActive ?? d.IsActive ?? ((d.status ?? d.Status) === 'Active'),
                        status: d.status ?? d.Status ?? 'Active'
                    })).filter((d: any) => d.status === 'Active' || d.isActive !== false));

                    setJobPositions(rawPos.map((p: any) => ({
                        jobPositionId: p.id ?? p.jobPositionId ?? p.JobPositionId,
                        name: p.name ?? p.Name,
                        departmentId: p.departmentId ?? p.DepartmentId,
                        isActive: p.isActive ?? p.IsActive ?? ((p.status ?? p.Status) === 'Active'),
                        status: p.status ?? p.Status ?? 'Active'
                    })).filter((p: any) => p.status === 'Active' || p.isActive !== false));

                    setAvailableRoles(rawRoles.map((r: any) => toDisplayRole(r.displayName ?? r.DisplayName ?? r.name ?? r.Name)));
                }
            } catch (err) {
                console.error('Error loading organization data:', err);
            } finally {
                setLoadingOrg(false);
            }
        };
        loadOrgData();
    }, []);

    useEffect(() => {
        const generateEmployeeNumber = async () => {
            setEmpNumLoading(true);
            setEmpNumError('');
            try {
                const token = localStorage.getItem('authToken');
                const res = await fetch('/api/user?PageNumber=1&PageSize=1000', {
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const result = await res.json();
                const employees: { employeeNumber: string }[] = Array.isArray(result.data) ? result.data : [];
                const usedNumbers = new Set(
                    employees
                        .map(e => { const num = parseInt(e.employeeNumber, 10); return isNaN(num) ? null : num; })
                        .filter((n): n is number => n !== null)
                );
                let next = 1;
                while (usedNumbers.has(next)) next++;
                setForm(prev => ({ ...prev, employeeNumber: String(next).padStart(4, '0') }));
            } catch (err) {
                console.error('Error generating employee number:', err);
                setEmpNumError('Could not generate employee number. Please try again.');
            } finally {
                setEmpNumLoading(false);
            }
        };
        generateEmployeeNumber();
    }, []);

    // Derive available positions based on selected department
    const availablePositions = form.departmentId
        ? jobPositions.filter(p => p.departmentId === form.departmentId)
        : [];

    const validateField = (key: keyof FormState, value: string): string => {
        switch (key) {
            case 'email': {
                const v = value.trim();
                if (!v) return 'Email address is required.';
                if (v.length > 100) return 'Email must not exceed 100 characters.';
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'Enter a valid email address.';
                return '';
            }
            case 'departmentId':
                return !value ? 'Please select a department.' : '';
            case 'jobPositionId':
                return !value ? 'Please select a position.' : '';
            case 'role':
                return !value ? 'Please select a system role.' : '';
            case 'contactNumber': {
                const v = value.trim();
                if (!v) return 'Contact number is required.';
                if (!/^09\d{9}$/.test(v)) return 'Enter a valid PH mobile number (09xxxxxxxxx).';
                return '';
            }
            default:
                return '';
        }
    };

    const handleChange = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setDirty(true);
        const value = e.target.value;

        // If department changes, reset position
        if (key === 'departmentId') {
            setForm(prev => ({ ...prev, departmentId: value, jobPositionId: '' }));
            setErrors(prev => ({ ...prev, departmentId: value ? undefined : 'Please select a department.', jobPositionId: undefined }));
            setApiError('');
            return;
        }

        setForm(prev => ({ ...prev, [key]: value }));
        setApiError('');
        const errMsg = validateField(key, value);
        setErrors(prev => ({ ...prev, [key]: errMsg || undefined }));
    };

    const handleSubmit = async () => {
        if (submitting || empNumLoading || !form.employeeNumber) return;
        const errs = validate(form);
        if (Object.keys(errs).length > 0) { setErrors(errs); return; }
        setSubmitting(true);
        setApiError('');
        try {
            const token = localStorage.getItem('authToken');

            const body = JSON.stringify({
                employeeNumber: form.employeeNumber,
                firstName: form.firstName.trim() || 'New',
                middleName: form.middleName.trim() || null,
                lastName: form.lastName.trim() || 'Employee',
                suffix: form.suffix.trim() || null,
                contactNumber: form.contactNumber || null,
                role: toBackendRole(form.role),
                email: form.email.trim(),
                departmentId: form.departmentId || null,
                jobPositionId: form.jobPositionId || null,
            });

            const res = await fetch('/api/user/register', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body,
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                const validationMsg = errorData.errors
                    ? Object.values(errorData.errors).flat().join('. ')
                    : '';
                const msg = errorData.message ?? errorData.Message ?? validationMsg
                    ?? (typeof errorData === 'string' ? errorData : '');
                throw new Error(msg || 'Employee registration failed. Please try again.');
            }

            const responseData = await res.json();
            if (!responseData.isSuccess || !responseData.data) {
                throw new Error(responseData.message || 'Registration failed');
            }

            const data = responseData.data;
            success('Employee registered successfully!');
            setDirty(false);
            onSuccess({
                employeeNumber: data.employeeNumber ?? form.employeeNumber,
                employeeName: form.email.trim(),
                firstName: '',
                middleName: '',
                lastName: '',
                suffix: '',
                contactNumber: '',
                role: data.role ?? form.role,
                accountStatus: 'Pending Verification',
                email: form.email.trim(),
            });
            onClose();
        } catch (err: any) {
            setApiError(err.message ?? 'Something went wrong. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    // ── Error helper UI ───────────────────────────────────────────────────────
    const FieldErr = ({ msg }: { msg?: string }) =>
        msg ? (
            <span className="field-error" style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--status-failed)', fontSize: 11, marginTop: 4 }}>
                <AlertCircle size={12} /> {msg}
            </span>
        ) : null;

    const inputStyle = (hasErr?: string): React.CSSProperties => ({
        border: hasErr ? '1px solid var(--status-failed)' : '1px solid var(--border)',
    });

    return (
        <div style={{ display: 'contents' }}>
            <FormModal
                isOpen={true}
                onClose={() => { setDirty(false); onClose(); }}
                title="Add New Employee"
                subtitle="Fill in all details to register a new employee account."
                apiError={apiError}
                onSubmit={handleSubmit}
                isSubmitting={submitting}
                submitDisabled={empNumLoading || !!empNumError || loadingOrg}
                submitLabel="Register Employee"
                size="lg"
                confirmOnCancel={true}
                dirty={dirty}
                infoCard={form.employeeNumber ? {
                    avatarText: form.employeeNumber.slice(-4),
                    title: `Employee #${form.employeeNumber}`,
                    subtitle: form.email || 'Enter email address below',
                    badgeText: 'NEW',
                    badgeStatus: 'Pending',
                } : undefined}
            >
                <div className="fm-section">
                    <h5 className="fm-section-title">Account Information</h5>
                    <div className="fm-field-grid">
                        {/* Employee Number */}
                        <div className="fm-field">
                            <label className="fm-label" htmlFor="emp-number">
                                Employee ID <span className="optional" style={{ fontWeight: 600, background: 'var(--status-new-bg)', color: 'var(--primary)', padding: '1px 6px', borderRadius: 4, textTransform: 'uppercase' }}>AUTO</span>
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    id="emp-number"
                                    type="text"
                                    value={empNumLoading ? '' : form.employeeNumber}
                                    readOnly
                                    placeholder={empNumLoading ? 'Generating…' : ''}
                                    className="fm-input"
                                    style={{
                                        background: 'var(--bg-input)',
                                        color: empNumLoading ? 'var(--text-secondary)' : 'var(--text-primary)',
                                        cursor: 'not-allowed',
                                        paddingRight: 36,
                                        border: empNumError ? '1px solid var(--status-failed)' : '1px solid var(--border)'
                                    }}
                                />
                                <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', color: empNumLoading ? 'var(--text-secondary)' : 'var(--status-active)' }}>
                                    {empNumLoading ? <Loader2 size={13} className="fm-spin" /> : <CheckCircle2 size={13} />}
                                </span>
                            </div>
                            {empNumError ? (
                                <span className="field-error" style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--status-failed)', fontSize: 11, marginTop: 4 }}>
                                    <AlertCircle size={12} /> {empNumError}
                                </span>
                            ) : !empNumLoading && (
                                <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4, display: 'block' }}>Assigned automatically. Cannot be changed.</span>
                            )}
                        </div>

                        {/* Email Address */}
                        <div className="fm-field">
                            <label className="fm-label" htmlFor="emp-email">
                                Email Address <span style={{ color: 'var(--status-failed)' }}>*</span>
                            </label>
                            <input
                                id="emp-email"
                                type="email"
                                placeholder="e.g. name@company.com"
                                value={form.email}
                                onChange={handleChange('email')}
                                className="fm-input"
                                style={inputStyle(errors.email)}
                                maxLength={100}
                                autoComplete="off"
                            />
                            <FieldErr msg={errors.email} />
                        </div>
                        {/* Contact Number */}
                        <div className="fm-field">
                            <label className="fm-label" htmlFor="emp-contact">
                                Contact Number <span style={{ color: 'var(--status-failed)' }}>*</span>
                            </label>
                            <input id="emp-contact" type="text" placeholder="e.g. 09171234567"
                                value={form.contactNumber} onChange={handleChange('contactNumber')}
                                className="fm-input" style={inputStyle(errors.contactNumber)} maxLength={11} />
                            <FieldErr msg={errors.contactNumber} />
                        </div>
                    </div>
                </div>

                <div className="fm-section">
                    <h5 className="fm-section-title">Department & Position</h5>
                    <div className="fm-field-grid">
                        {/* Department */}
                        <div className="fm-field">
                            <label className="fm-label" htmlFor="emp-dept">
                                Department <span style={{ color: 'var(--status-failed)' }}>*</span>
                            </label>
                            <select
                                id="emp-dept"
                                value={form.departmentId}
                                onChange={handleChange('departmentId')}
                                className="fm-select"
                                style={inputStyle(errors.departmentId)}
                                disabled={loadingOrg}
                            >
                                <option value="">{loadingOrg ? 'Loading departments...' : 'Select a department'}</option>
                                {departments.map(d => <option key={d.departmentId} value={d.departmentId}>{d.name}</option>)}
                            </select>
                            <FieldErr msg={errors.departmentId} />
                        </div>

                        {/* Position */}
                        <div className="fm-field">
                            <label className="fm-label" htmlFor="emp-position">
                                Position <span style={{ color: 'var(--status-failed)' }}>*</span>
                            </label>
                            <select
                                id="emp-position"
                                value={form.jobPositionId}
                                onChange={handleChange('jobPositionId')}
                                className="fm-select"
                                style={{
                                    ...inputStyle(errors.jobPositionId),
                                    opacity: !form.departmentId ? 0.6 : 1,
                                    cursor: !form.departmentId ? 'not-allowed' : 'pointer',
                                }}
                                disabled={!form.departmentId || loadingOrg}
                            >
                                <option value="">
                                    {form.departmentId ? 'Select a position' : 'Select department first'}
                                </option>
                                {availablePositions.map(p => <option key={p.jobPositionId} value={p.jobPositionId}>{p.name}</option>)}
                            </select>
                            <FieldErr msg={errors.jobPositionId} />
                        </div>
                    </div>
                </div>

                <div className="fm-section">
                    <h5 className="fm-section-title">System Role & Employment Status</h5>
                    <div className="fm-field-grid">
                        {/* System Role */}
                        <div className="fm-field">
                            <label className="fm-label" htmlFor="emp-role">
                                System Role <span style={{ color: 'var(--status-failed)' }}>*</span>
                            </label>
                            <select
                                id="emp-role"
                                value={form.role}
                                onChange={handleChange('role')}
                                className="fm-select"
                                style={inputStyle(errors.role)}
                            >
                                <option value="">Select a role</option>
                                {availableRoles.map(r => (
                                    <option key={r} value={r}>
                                        {r}
                                    </option>
                                ))}
                            </select>
                            <FieldErr msg={errors.role} />
                        </div>

                        {/* Employment Status */}
                        <div className="fm-field">
                            <label className="fm-label" htmlFor="emp-status">
                                Employment Status <span style={{ color: 'var(--status-failed)' }}>*</span>
                            </label>
                            <select
                                id="emp-status"
                                value={form.employmentStatus}
                                onChange={handleChange('employmentStatus')}
                                className="fm-select"
                                style={inputStyle(errors.employmentStatus)}
                            >
                                <option value="">Select status</option>
                                <option value="Active">Active</option>
                                <option value="Probationary">Probationary</option>
                                <option value="Contractual">Contractual</option>
                            </select>
                            <FieldErr msg={errors.employmentStatus} />
                        </div>
                    </div>
                </div>
            </FormModal>

            {/* ── Success Screen ── */}
            <FormModal isOpen={!!successData} onClose={() => { setSuccessData(null); onClose(); }} size="sm"
                title="Employee registered"
                subtitle="Account has been created successfully."
            >
                {successData && (
                    <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'var(--status-active-bg)', border: '1px solid rgba(5,150,105,0.25)', borderRadius: 10, padding: '10px 14px', marginBottom: 20, fontSize: 13 }}>
                            <CheckCircle2 size={15} style={{ flexShrink: 0, marginTop: 1 }} color="var(--status-active)" />
                            <span style={{ color: 'var(--text-primary)', lineHeight: 1.5 }}>
                                Login credentials have been sent to <strong>{form.email.trim()}</strong>. Ask the employee to check their inbox to activate their account.
                            </span>
                        </div>

                        <div style={{ background: 'var(--bg-input)', borderRadius: 10, border: '1px solid var(--border)', padding: '12px 16px', marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {[
                                { label: 'Employee ID', value: successData.employeeNumber },
                                { label: 'Department', value: departments.find(d => d.departmentId === form.departmentId)?.name },
                                { label: 'Position', value: jobPositions.find(p => p.jobPositionId === form.jobPositionId)?.name },
                                { label: 'Role', value: form.role },
                                { label: 'Status', value: form.employmentStatus },
                                { label: 'Email', value: form.email.trim() },
                            ].map(({ label, value }, i, arr) => (
                                <div key={label}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                                        <strong style={{ textAlign: 'right', maxWidth: 240, wordBreak: 'break-all' }}>{value || '—'}</strong>
                                    </div>
                                    {i < arr.length - 1 && <div style={{ height: 1, background: 'var(--border)', marginTop: 10 }} />}
                                </div>
                            ))}
                        </div>

                        <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => { setSuccessData(null); onClose(); }}>Done</button>
                    </>
                )}
            </FormModal>
        </div>
    );
}

// ─── Employee Details Modal ───────────────────────────────────────────────────

interface EmployeeDetailModalProps {
    employee: RecentEmployee;
    onClose: () => void;
    onUpdated: (updated: RecentEmployee) => void;
    initialEditMode?: boolean;
    rolesList?: string[];
}

function EmployeeDetailModal({ employee, onClose, onUpdated, initialEditMode = false, rolesList = SYSTEM_ROLES }: EmployeeDetailModalProps) {
    const [isEditing, setIsEditing] = useState(initialEditMode);
    const [form, setForm] = useState({
        firstName: employee.firstName ?? '',
        middleName: employee.middleName ?? '',
        lastName: employee.lastName ?? '',
        suffix: employee.suffix ?? '',
        contactNumber: employee.contactNumber,
        role: toDisplayRole(employee.role),
        accountStatus: employee.accountStatus,
        email: employee.email ?? '',
    });
    // Snapshot of form values at the moment edit mode is entered
    const initialFormRef = useRef<typeof form | null>(
        initialEditMode ? {
            firstName: employee.firstName ?? '',
            middleName: employee.middleName ?? '',
            lastName: employee.lastName ?? '',
            suffix: employee.suffix ?? '',
            contactNumber: employee.contactNumber,
            role: toDisplayRole(employee.role),
            accountStatus: employee.accountStatus,
            email: employee.email ?? '',
        } : null
    );
    const [submitting, setSubmitting] = useState(false);
    const [apiError, setApiError] = useState('');
    const [confirmModal, setConfirmModal] = useState<ConfirmModalState>(CONFIRM_CLOSED);
    const { success, error } = useToast();
    const displayName = getEmployeeDisplayName(employee);
    const [gatePassword, setGatePassword] = useState('');
    const [gateError, setGateError] = useState('');
    const [gateLoading, setGateLoading] = useState(false);
    const [showGatePassword, setShowGatePassword] = useState(false);

    // Track whether the form has unsaved changes compared to when editing started
    const isDirty = isEditing && initialFormRef.current !== null &&
        JSON.stringify(form) !== JSON.stringify(initialFormRef.current);

    const enterEditMode = () => {
        // Capture snapshot so we can detect changes later
        initialFormRef.current = { ...form };
        setIsEditing(true);
    };

    const handleCloseModal = () => {
        onClose();
    };

    const handleCancelEdit = () => {
        if (isDirty) {
            setConfirmModal({
                isOpen: true,
                variant: 'warning',
                title: 'Discard unsaved changes?',
                description: (
                    <>
                        You have unsaved changes to <strong>{displayName}</strong>'s profile.
                        Cancelling now will discard all modifications.
                    </>
                ),
                confirmLabel: 'Discard changes',
                onConfirm: async () => {
                    // Restore the form back to the snapshot
                    if (initialFormRef.current) setForm({ ...initialFormRef.current });
                    initialFormRef.current = null;
                    setIsEditing(false);
                    setApiError('');
                    setConfirmModal(CONFIRM_CLOSED);
                },
            });
        } else {
            initialFormRef.current = null;
            setIsEditing(false);
            setApiError('');
        }
    };


    const handleChange = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setForm(prev => ({ ...prev, [key]: e.target.value }));
        setApiError('');
    };

    // ── Save (always guarded by password verification) ──────────────────────
    const handleSave = async () => {
        const doSave = async () => {
            setSubmitting(true);
            setApiError('');
            try {
                const token = localStorage.getItem('authToken');

                // Look up user GUID by employee number
                const lookupRes = await fetch(`/api/user/employee-number/${encodeURIComponent(employee.employeeNumber)}`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                if (!lookupRes.ok) throw new Error('Employee not found.');
                const lookupData = await lookupRes.json();
                const userId = lookupData?.data?.id ?? lookupData?.id;
                if (!userId) throw new Error('Employee not found.');

                const updateRes = await fetch(`/api/user/${userId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({
                        firstName: form.firstName.trim(),
                        middleName: form.middleName.trim(),
                        lastName: form.lastName.trim(),
                        suffix: form.suffix.trim(),
                        contactNumber: form.contactNumber,
                        email: form.email.trim(),
                    }),
                });
                if (!updateRes.ok) {
                    const err = await updateRes.json().catch(() => ({}));
                    throw new Error(err.message || 'Failed to update employee details. Please try again.');
                }
                if (form.accountStatus !== employee.accountStatus) {
                    const isActive = form.accountStatus === 'Active';
                    const statusRes = await fetch(`/api/user/${userId}/${isActive ? 'activate' : 'deactivate'}`, {
                        method: 'PATCH',
                        headers: { 'Authorization': `Bearer ${token}` },
                    });
                    if (!statusRes.ok) {
                        const err = await statusRes.json().catch(() => ({}));
                        throw new Error(err.message || 'Failed to update account status. Please try again.');
                    }
                }
                const newRoleVal = toBackendRole(form.role);
                const oldRoleVal = typeof employee.role === 'number' ? employee.role : parseInt(employee.role, 10);
                if (newRoleVal !== oldRoleVal) {
                    const roleRes = await fetch(`/api/role/user/${userId}/role`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({ newRole: newRoleVal, reason: 'Role updated via admin panel' }),
                    });
                    if (!roleRes.ok) {
                        const err = await roleRes.json().catch(() => ({}));
                        throw new Error(err.message || 'Failed to update role. Please try again.');
                    }
                }
                onUpdated({
                    ...employee,
                    firstName: form.firstName.trim(),
                    middleName: form.middleName.trim(),
                    lastName: form.lastName.trim(),
                    suffix: form.suffix.trim(),
                    employeeName: editDisplayName,
                    contactNumber: form.contactNumber,
                    role: toBackendRole(form.role),
                    accountStatus: form.accountStatus,
                    email: form.email.trim(),
                });
                initialFormRef.current = null;
                setIsEditing(false);
                success('Employee details updated successfully!');
                onClose();
            } catch (err: any) {
                error(err.message ?? 'Something went wrong. Please try again.');
                setApiError(err.message ?? 'Something went wrong. Please try again.');
            } finally {
                setSubmitting(false);
                setConfirmModal(CONFIRM_CLOSED);
            }
        };

        // Always verify the admin's password before any save
        setGatePassword('');
        setGateError('');
        setShowGatePassword(false);
        setConfirmModal({
            isOpen: true,
            variant: form.accountStatus !== employee.accountStatus
                ? (form.accountStatus === 'Active' ? 'success' : 'warning')
                : 'info',
            title: form.accountStatus !== employee.accountStatus
                ? `${form.accountStatus === 'Active' ? 'Activate' : 'Deactivate'} employee account?`
                : 'Confirm your identity',
            description: (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {form.accountStatus !== employee.accountStatus && (
                        <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-secondary)' }}>
                            You are about to <strong>{form.accountStatus === 'Active' ? 'activate' : 'deactivate'}</strong> the account of{' '}
                            <strong>{displayName}</strong>.{' '}
                            {form.accountStatus === 'Active'
                                ? 'This will restore their access to the system.'
                                : 'This will revoke their access until reactivated.'}
                        </p>
                    )}
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
            notice: 'For security, your identity must be verified before saving any changes.',
            confirmLabel: 'Verify & save',
            onConfirm: async () => {
                const pw = (document.getElementById('gate-pw-input') as HTMLInputElement)?.value ?? gatePassword;
                if (!pw) { setGateError('Please enter your password.'); return; }
                setGateLoading(true);
                setGateError('');
                try {
                    const token = localStorage.getItem('authToken');
                    const adminId = localStorage.getItem('employeeId') ?? '';
                    const res = await fetch('/api/auth/verify-password', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({ employeeID: adminId, password: pw }),
                    });
                    const verifyData = await res.json().catch(() => ({}));
                    if (!verifyData.isSuccess) { throw new Error(verifyData.message || verifyData.Message || 'Incorrect password. Please try again.'); }
                    await doSave();
                } catch (err: any) {
                    setGateError(err.message ?? 'Incorrect password. Please try again.');
                } finally {
                    setGateLoading(false);
                }
            },
        });
    };

    // ── Delete ────────────────────────────────────────────────────────────────
    const handleDelete = () => {
        setConfirmModal({
            isOpen: true,
            variant: 'danger',
            title: 'Archive employee account?',
            description: (
                <>
                    This will permanently remove <strong>{displayName}</strong> and all associated
                    data. This action cannot be undone.
                </>
            ),
            notice: 'All leave records, tasks, and activity logs for this employee will also be archived.',
            confirmLabel: 'Archive employee',
            onConfirm: async () => {
                setSubmitting(true);
                setApiError('');
                try {
                    const token = localStorage.getItem('authToken');
                    const lookupRes = await fetch(`/api/user/employee-number/${encodeURIComponent(employee.employeeNumber)}`, {
                        headers: { 'Authorization': `Bearer ${token}` },
                    });
                    if (!lookupRes.ok) throw new Error('Employee not found.');
                    const lookupData = await lookupRes.json();
                    const userId = lookupData?.data?.id ?? lookupData?.id;
                    if (!userId) throw new Error('Employee not found.');
                    const res = await fetch(`/api/user/${userId}/deactivate`, {
                        method: 'PATCH',
                        headers: { 'Authorization': `Bearer ${token}` },
                    });
                    if (!res.ok) {
                        const err = await res.json().catch(() => ({}));
                        throw new Error(err.message || 'Failed to Archive employee. Please try again.');
                    }
                    success(`${displayName} has been archived.`);
                    onUpdated({ ...employee, accountStatus: '__deleted__' });
                    onClose();
                } catch (err: any) {
                    setApiError(err.message ?? 'Something went wrong. Please try again.');
                } finally {
                    setSubmitting(false);
                    setConfirmModal(CONFIRM_CLOSED);
                }
            },
        });
    };

    const editDisplayName = buildDisplayName(form.firstName, form.middleName, form.lastName, form.suffix);

    const resolvedTitle = isEditing ? 'Edit employee' : 'Employee Details';
    const resolvedSubtitle = isEditing ? 'Update details for this employee record' : `Viewing profile of ${displayName}`;

    const infoCard = {
        avatarText: (isEditing ? editDisplayName : displayName) || '?',
        title: isEditing ? editDisplayName || '—' : displayName,
        subtitle: `Employee No. ${employee.employeeNumber}`,
        badgeText: form.accountStatus ?? 'Active',
        badgeStatus: form.accountStatus ?? 'Active'
    };

    return (
        <>
            <FormModal
                isOpen={true}
                onClose={handleCloseModal}
                title={resolvedTitle}
                subtitle={resolvedSubtitle}
                infoCard={infoCard}
                apiError={apiError}
                onSubmit={isEditing ? handleSave : undefined}
                isSubmitting={submitting}
                size="md"
                confirmOnCancel={true}
                dirty={isDirty}
                footer={
                    isEditing ? (
                        <>
                            <button type="button" className="fm-btn fm-btn-cancel" onClick={handleCancelEdit} disabled={submitting}>Cancel</button>
                            <button type="submit" className="fm-btn fm-btn-primary" disabled={submitting}>
                                {submitting ? <><Loader2 size={13} className="fm-spin" /> Saving…</> : 'Save Changes'}
                            </button>
                        </>
                    ) : (
                        <>
                            <button type="button" className="fm-btn fm-btn-danger" onClick={handleDelete} disabled={submitting}>Delete</button>
                            <button type="button" className="fm-btn fm-btn-primary" onClick={enterEditMode}>Edit</button>
                        </>
                    )
                }
            >
                {isEditing ? (
                    <>
                        <div className="fm-section">
                            <h5 className="fm-section-title">Account</h5>
                            <div className="fm-field-grid">
                                <div className="fm-field">
                                    <label className="fm-label">Role</label>
                                    <select value={form.role} onChange={handleChange('role')} className="fm-select">
                                        {rolesList.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>
                                <div className="fm-field">
                                    <label className="fm-label">Account Status</label>
                                    <select value={form.accountStatus} onChange={handleChange('accountStatus')} className="fm-select">
                                        <option value="Active">Active</option>
                                        <option value="Deactivated">Deactivated</option>
                                        {employee.accountStatus === 'On Leave' && <option value="On Leave">On Leave</option>}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="fm-section">
                            <h5 className="fm-section-title">Personal Information</h5>
                            <div className="fm-field-grid">
                                <div className="fm-field">
                                    <label className="fm-label">First Name</label>
                                    <input type="text" value={form.firstName} onChange={handleChange('firstName')} className="fm-input" maxLength={50} />
                                </div>
                                <div className="fm-field">
                                    <label className="fm-label">Last Name</label>
                                    <input type="text" value={form.lastName} onChange={handleChange('lastName')} className="fm-input" maxLength={50} />
                                </div>
                                <div className="fm-field">
                                    <label className="fm-label">Middle Name <span className="optional">optional</span></label>
                                    <input type="text" value={form.middleName} onChange={handleChange('middleName')} className="fm-input" maxLength={50} placeholder="None" />
                                </div>
                                <div className="fm-field">
                                    <label className="fm-label">Suffix <span className="optional">optional</span></label>
                                    <input type="text" value={form.suffix} onChange={handleChange('suffix')} className="fm-input" maxLength={10} placeholder="e.g. Jr., III" />
                                </div>
                            </div>
                        </div>

                        <div className="fm-section">
                            <h5 className="fm-section-title">Contact</h5>
                            <div className="fm-field-grid">
                                <div className="fm-field">
                                    <label className="fm-label">Contact Number</label>
                                    <input type="tel" value={form.contactNumber} onChange={handleChange('contactNumber')} className="fm-input" />
                                </div>
                                <div className="fm-field">
                                    <label className="fm-label">Email</label>
                                    <input type="email" value={form.email} onChange={handleChange('email')} className="fm-input" maxLength={100} />
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="detail-grid">
                        <div className="detail-item"><span className="detail-label">Employee Number</span><span className="detail-value">{employee.employeeNumber}</span></div>
                        <div className="detail-item"><span className="detail-label">Role</span><span className="detail-value">{form.role || '—'}</span></div>
                        <div className="detail-item"><span className="detail-label">First Name</span><span className="detail-value">{form.firstName || '—'}</span></div>
                        <div className="detail-item"><span className="detail-label">Last Name</span><span className="detail-value">{form.lastName || '—'}</span></div>
                        <div className="detail-item"><span className="detail-label">Middle Name</span><span className="detail-value">{form.middleName || '—'}</span></div>
                        <div className="detail-item"><span className="detail-label">Suffix</span><span className="detail-value">{form.suffix || '—'}</span></div>
                        <div className="detail-item"><span className="detail-label">Contact Number</span><span className="detail-value">{form.contactNumber || '—'}</span></div>
                        <div className="detail-item"><span className="detail-label">Email</span><span className="detail-value">{form.email || '—'}</span></div>
                    </div>
                )}
            </FormModal>

            {/* ── Confirmation Modal ── */}
            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                variant={confirmModal.variant}
                title={confirmModal.title}
                description={confirmModal.description}
                notice={confirmModal.notice}
                confirmLabel={confirmModal.confirmLabel}
                isLoading={submitting || gateLoading}
                onConfirm={confirmModal.onConfirm}
                onCancel={() => setConfirmModal(CONFIRM_CLOSED)}
            />
        </>
    );
}



// ─── Dashboard Tab ────────────────────────────────────────────────────────────

interface DashboardTabProps {
    employees: RecentEmployee[];
    recentEmployees: RecentEmployee[];
    activityLogs: ActivityLog[];
    loading: boolean;
    onSelectEmployee: (emp: RecentEmployee) => void;
    onViewAll: () => void;
    onAddEmployee: () => void;
    rolesCount?: number;
    activityLogPage?: number;
    activityLogTotalPages?: number;
    onActivityLogPageChange?: (page: number) => void;
}

function DashboardTab({ employees, recentEmployees, activityLogs, loading, onSelectEmployee, onViewAll, onAddEmployee, rolesCount, activityLogPage, activityLogTotalPages, onActivityLogPageChange }: DashboardTabProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const activeCount = employees.filter(e => e.accountStatus === 'Active').length;
    const deactivatedCount = employees.filter(e => e.accountStatus === 'Deactivated').length;

    const roleDistribution = Object.entries(
        employees.reduce<Record<string, number>>((acc, emp) => {
            const role = toDisplayRole(emp.role) || 'Unassigned';
            acc[role] = (acc[role] || 0) + 1;
            return acc;
        }, {})
    ).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

    const statusDistribution = Object.entries(
        employees.reduce<Record<string, number>>((acc, emp) => {
            const status = emp.accountStatus || 'Unknown';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {})
    ).map(([name, value]) => ({ name, value }));

    const PIE_COLORS: Record<string, string> = {
        Active: '#059669',
        Deactivated: '#DC2626',
        'On Leave': '#D97706',
        Locked: '#D97706',
        Unknown: '#94A3B8',
    };

    const BAR_COLORS = ['#00A99D', '#0284C7', '#4F46E5', '#D97706', '#DC2626', '#FF7B42', '#8B5CF6'];

    const avgWorkloadByRole = Object.entries(
        employees.reduce<Record<string, { count: number; tasks: number }>>((acc, emp) => {
            if (emp.accountStatus !== 'Active') return acc;
            const role = toDisplayRole(emp.role) || 'Unassigned';
            if (!acc[role]) acc[role] = { count: 0, tasks: 0 };
            acc[role].count++;
            const hash = (emp.employeeNumber || '').length;
            acc[role].tasks += Math.min(hash + 2, 18);
            return acc;
        }, {})
    ).map(([role, data]) => ({ role, avg: Math.round(data.tasks / data.count) })).sort((a, b) => b.avg - a.avg);

    return (
        <div className="dashboard-content">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                <div className="header-search-wrap" style={{ margin: 0, width: 300 }}>
                    <Search size={14} className="header-search-icon" />
                    <input type="text" className="header-search-input" placeholder="Search employee, task…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                </div>
                <ActionButton icon={<Users size={18} />} onClick={onAddEmployee}>
                    Add Employee
                </ActionButton>
            </div>
            <div className="stats-row">
                {[
                    { icon: <Users size={20} strokeWidth={2.3} />, variant: 'primary', label: 'TOTAL EMPLOYEES', value: employees.length, subtext: 'All registered staff' },
                    { icon: <CheckCircle2 size={20} strokeWidth={2.3} />, variant: 'success', label: 'ACTIVE', value: activeCount, subtext: 'Currently active accounts' },
                    { icon: <AlertCircle size={20} strokeWidth={2.3} />, variant: 'danger', label: 'DEACTIVATED', value: deactivatedCount, subtext: 'Accounts needing review' },
                    { icon: <Shield size={20} strokeWidth={2.3} />, variant: 'warning', label: 'ROLES', value: rolesCount ?? SYSTEM_ROLES.length, subtext: 'Available role types' },
                ].map(({ icon, variant, label, value, subtext }) => (
                    <StatCard key={label} icon={icon} variant={variant} label={label} value={value} subtext={subtext} />
                ))}
            </div>

            {/* ── Charts Row ── */}
            <div className="dashboard-bottom-row">
                <div className="card">
                    <div className="card-header-layout">
                        <span className="text-link">Role Distribution</span>
                    </div>
                    {loading || employees.length === 0 ? (
                        <EmptyState message="No data" />
                    ) : (
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={roleDistribution} margin={{ top: 16, right: 16, left: 0, bottom: 8 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                                <Tooltip
                                    contentStyle={{ borderRadius: 10, border: '1px solid var(--border)', fontSize: 13, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                                    labelStyle={{ fontWeight: 700, marginBottom: 4 }}
                                />
                                <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={48}>
                                    {roleDistribution.map((_, i) => (
                                        <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
                <div className="card">
                    <div className="card-header-layout">
                        <span className="text-link">Account Status</span>
                    </div>
                    {loading || employees.length === 0 ? (
                        <EmptyState message="No data" />
                    ) : (
                        <ResponsiveContainer width="100%" height={260}>
                            <PieChart>
                                <Pie
                                    data={statusDistribution}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={55}
                                    outerRadius={90}
                                    paddingAngle={3}
                                    dataKey="value"
                                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                                    labelLine={false}
                                >
                                    {statusDistribution.map((entry) => (
                                        <Cell key={entry.name} fill={PIE_COLORS[entry.name] || '#94A3B8'} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ borderRadius: 10, border: '1px solid var(--border)', fontSize: 13, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                                />
                                <Legend
                                    verticalAlign="bottom"
                                    iconType="circle"
                                    iconSize={10}
                                    formatter={(value: string) => <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{value}</span>}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </div>
                <div className="card">
                    <div className="card-header-layout">
                        <span className="text-link"><ClipboardList size={14} /> Avg Workload by Role</span>
                    </div>
                    {loading || avgWorkloadByRole.length === 0 ? (
                        <EmptyState message="No data" />
                    ) : (
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={avgWorkloadByRole} margin={{ top: 16, right: 16, left: 0, bottom: 8 }} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                                <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                                <YAxis dataKey="role" type="category" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} width={90} />
                                <Tooltip
                                    contentStyle={{ borderRadius: 10, border: '1px solid var(--border)', fontSize: 13, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                                    labelStyle={{ fontWeight: 700, marginBottom: 4 }}
                                    formatter={(value: unknown) => [`${Number(value ?? 0)} tasks/emp`, 'Avg Workload'] as [string, string]}
                                />
                                <Bar dataKey="avg" radius={[0, 6, 6, 0]} maxBarSize={28}>
                                    {avgWorkloadByRole.map((_, i) => (
                                        <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="dashboard-grid">
                <div className="card">
                    <div className="card-header-layout"><span className="text-link">Recent Employees</span><button className="view-all-link" onClick={onViewAll}>View more →</button></div>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>NAME</th>
                                <th>ID</th>
                                <th>ROLE</th>
                                <th>STATUS</th>
                                <th>ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading
                                ? <tr><td colSpan={5}><EmptyState icon={<Loader2 size={22} className="spin" />} message="Loading..." /></td></tr>
                                : recentEmployees.length === 0
                                    ? <tr><td colSpan={5}><EmptyState message="No data available" /></td></tr>
                                    : recentEmployees.filter(emp => {
                                        if (!searchQuery) return true;
                                        const q = searchQuery.toLowerCase();
                                        return getEmployeeDisplayName(emp).toLowerCase().includes(q)
                                            || (emp.employeeNumber && emp.employeeNumber.toLowerCase().includes(q))
                                            || (emp.role && emp.role.toLowerCase().includes(q));
                                    }).slice(0, 7).map(emp => {
                                        const name = getEmployeeDisplayName(emp);
                                        return (
                                            <tr key={emp.employeeNumber}>
                                                <td>
                                                    <div className="emp-name-cell">
                                                        <div className="emp-avatar">{name.charAt(0).toUpperCase()}</div>
                                                        <span className="cell-name">{name}</span>
                                                    </div>
                                                </td>
                                                <td className="cell-id">{emp.employeeNumber}</td>
                                                <td><RoleBadge role={toDisplayRole(emp.role)} size="sm" /></td>
                                                <td><StatusBadge status={emp.accountStatus || 'Active'} size="sm" /></td>
                                                <td className="cell-actions">
                                                    <button className="action-icon-btn" title="Edit" onClick={() => onSelectEmployee(emp)}><Pencil size={14} /></button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                        </tbody>
                    </table>
                </div>
                <div className="card activity-card">
                    <div className="card-header-layout"><span className="text-link">Recent Activity</span></div>
                    <div className="activity-feed-list">
                        {loading
                            ? <EmptyState icon={<Loader2 size={22} className="spin" />} message="Loading..." />
                            : activityLogs.length === 0
                                ? <EmptyState icon={<ClipboardList size={22} />} message="No recent activity" />
                                : activityLogs.filter(log => {
                                    if (!searchQuery) return true;
                                    const q = searchQuery.toLowerCase();
                                    return log.description.toLowerCase().includes(q)
                                        || log.activityType.toLowerCase().includes(q);
                                }).slice(0, 8).map((log, index) => {
                                    let dotColor = 'var(--primary)';
                                    let ringColor = 'rgba(0, 169, 157, 0.15)';
                                    if (log.activityType === 'Login') { dotColor = 'var(--status-active)'; ringColor = 'rgba(5, 150, 105, 0.15)'; }
                                    else if (log.activityType === 'Logout') { dotColor = 'var(--status-pending)'; ringColor = 'rgba(217, 119, 6, 0.15)'; }
                                    else if (log.activityType === 'Profile Update') { dotColor = 'var(--status-transit)'; ringColor = 'rgba(2, 132, 199, 0.15)'; }
                                    return (
                                        <div key={log.activityLogId} className="activity-feed-item" style={{ display: 'flex', gap: 16, marginBottom: 20, position: 'relative' }}>
                                            {index < Math.min(activityLogs.length, 8) - 1 && <div style={{ position: 'absolute', left: 4, top: 16, bottom: -24, width: 2, background: 'var(--border)', zIndex: 0 }} />}
                                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: dotColor, boxShadow: `0 0 0 4px ${ringColor}`, zIndex: 1, flexShrink: 0, marginTop: 4 }} />
                                            <div className="activity-feed-content" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                <span className="activity-feed-text" style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: 13 }}>{log.description}</span>
                                                <span className="activity-feed-time" style={{ color: 'var(--text-secondary)', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                    <Clock size={10} />
                                                    {new Date(log.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                    </div>
                    {activityLogs.length > 0 && activityLogTotalPages && activityLogTotalPages > 1 && (
                        <Pagination currentPage={activityLogPage ?? 1} totalPages={activityLogTotalPages} onPageChange={p => onActivityLogPageChange?.(p)} />
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Manage Employees Tab ─────────────────────────────────────────────────────

type EmployeeSubTab = 'employees' | 'documents' | 'archived';

interface ManageEmployeesTabProps {
    employees: RecentEmployee[];
    loading: boolean;
    onSelectEmployee: (emp: RecentEmployee) => void;
    onAddEmployee: () => void;
    empPage: number;
    empTotalPages: number;
    onEmpPageChange: (page: number, filters: { search: string; role: string; status: string }) => void;
    onEditEmployee: (emp: RecentEmployee) => void;
    onArchiveEmployee: (emp: RecentEmployee) => void;
    onViewEmployee: (emp: RecentEmployee) => void;
    onOpenDigital201: (emp: RecentEmployee) => void;
    contracts: EmploymentContract[];
    contractsLoading: boolean;
    contractsPage: number;
    contractsTotalPages: number;
    onContractsPageChange: (page: number, filters: { search: string; isArchived: boolean }) => void;
    rolesList?: string[];
}

function ManageEmployeesTab({
    employees, loading, onSelectEmployee, onAddEmployee,
    empPage, empTotalPages, onEmpPageChange,
    onEditEmployee, onArchiveEmployee, onViewEmployee, onOpenDigital201,
    rolesList = SYSTEM_ROLES,
}: ManageEmployeesTabProps) {
    const [subTab, setSubTab] = useState<EmployeeSubTab>('employees');
    const [search, setSearch] = useState('');
    const [filterRole, setFilterRole] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    useEffect(() => {
        onEmpPageChange(1, { search, role: filterRole, status: filterStatus });
    }, [search, filterRole, filterStatus]);

    // ── Shared table card wrapper ──────────────────────────────────────────────
    return (
        <div className="dashboard-content">
            {/* ── Unified sub-tab nav ── */}
            <SubTabNav
                tabs={[
                    { key: 'employees', label: 'All Employees', icon: <Users size={14} /> },
                    { key: 'documents', label: 'Employee Documents', icon: <FileText size={14} /> },
                ]}
                activeTab={subTab}
                onTabChange={(key) => setSubTab(key as EmployeeSubTab)}
            />

            {/* ── All Employees ── */}
            {subTab === 'employees' && (
                <DataTable
                    searchQuery={search}
                    onSearchChange={setSearch}
                    searchPlaceholder="Search by name or ID…"
                    filterElements={
                        <>
                            <Select value={filterRole} onChange={setFilterRole} placeholder="All Roles"
                                options={rolesList.map(r => ({ value: r, label: r }))} />
                            <Select value={filterStatus} onChange={setFilterStatus} placeholder="All Statuses"
                                options={[{ value: 'Active', label: 'Active' }, { value: 'Deactivated', label: 'Deactivated' }]} />
                        </>
                    }
                    actionButton={{ label: 'Add Employee', icon: <Plus size={14} />, onClick: onAddEmployee }}
                    headers={['NAME', 'EMPLOYEE NO', 'ROLE', 'CONTACT', 'STATUS', 'ACTION']}
                    loading={loading}
                    emptyMessage="No employees match your filters"
                    currentPage={empPage}
                    totalPages={empTotalPages}
                    onPageChange={p => onEmpPageChange(p, { search, role: filterRole, status: filterStatus })}
                    totalRecords={employees.length}
                >
                    {employees.map(emp => {
                        const name = getEmployeeDisplayName(emp) || 'Unknown';
                        return (
                            <tr key={emp.employeeNumber} onClick={() => onSelectEmployee(emp)} style={{ cursor: 'pointer' }}>
                                <td>
                                    <div className="emp-name-cell">
                                        <div style={{ position: 'relative', display: 'inline-block', flexShrink: 0 }}>
                                            <div className="emp-avatar">{name.charAt(0).toUpperCase()}</div>
                                            <span style={{ position: 'absolute', bottom: 1, right: 1, width: 9, height: 9, borderRadius: '50%', background: emp.presenceStatus === 'Online' ? 'var(--status-active)' : 'var(--text-secondary)', border: '2px solid var(--bg-card)', display: 'block' }} title={emp.presenceStatus ?? 'Offline'} />
                                        </div>
                                        <span style={{ fontWeight: 600 }}>{name}</span>
                                    </div>
                                </td>
                                <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{emp.employeeNumber}</td>
                                <td style={{ fontSize: 13 }}>{emp.role ? toDisplayRole(emp.role) : <span className="no-role">—</span>}</td>
                                <td style={{ fontSize: 13 }}>{emp.contactNumber}</td>
                                <td><StatusBadge status={emp.accountStatus || 'Active'} /></td>
                                <td onClick={e => e.stopPropagation()}>
                                    <ActionsDropdown actions={[
                                        { label: 'View Details', icon: <Eye size={12} />, onClick: () => onViewEmployee(emp) },
                                        { label: 'Digital 201 File', icon: <FileText size={12} />, onClick: () => onOpenDigital201(emp) },
                                        { label: 'Edit', icon: <Pencil size={12} />, onClick: () => onEditEmployee(emp) },
                                        { label: 'Archive', icon: <Trash2 size={12} />, onClick: () => onArchiveEmployee(emp), variant: 'danger' },
                                    ]} />
                                </td>
                            </tr>
                        );
                    })}
                </DataTable>
            )}

            {/* ── Employee Documents ── */}
            {subTab === 'documents' && (
                <EmployeeDocumentsTab
                    employees={employees}
                    onOpenDigital201={onOpenDigital201}
                />
            )}
        </div>
    );
}

// ─── Profile Tab ──────────────────────────────────────────────────────────────

function ProfileTab({ onProfileUpdate }: { onProfileUpdate?: (fullName: string) => void }) {
    const employeeId = localStorage.getItem('employeeId') ?? '';
    const storedFirstName = localStorage.getItem('firstName') ?? '';
    const storedMiddleName = localStorage.getItem('middleName') ?? '';
    const storedLastName = localStorage.getItem('lastName') ?? '';
    const storedSuffix = localStorage.getItem('suffix') ?? '';
    const legacyName = localStorage.getItem('employeeName') ?? '';
    const employeeContact = localStorage.getItem('contactNumber') ?? '';
    const storedEmail = localStorage.getItem('email') ?? '';

    // ── Password Gate (now via ConfirmationModal) ──────────────────────────────
    const [confirmModal, setConfirmModal] = useState<ConfirmModalState>(CONFIRM_CLOSED);
    const [gatePassword, setGatePassword] = useState('');
    const [gateError, setGateError] = useState('');
    const [gateLoading, setGateLoading] = useState(false);
    const [showGatePassword, setShowGatePassword] = useState(false);

    const [editingProfile, setEditingProfile] = useState(false);
    const [profileForm, setProfileForm] = useState({
        firstName: storedFirstName,
        middleName: storedMiddleName,
        lastName: storedLastName,
        suffix: storedSuffix,
        contactNumber: employeeContact,
        email: storedEmail,
    });
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
    const { success } = useToast();
    const [profileError, setProfileError] = useState('');
    const [profileSaving, setProfileSaving] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('authToken');
        if (!token) return;
        fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.ok ? res.json() : null)
            .then(result => {
                if (!result || !result.isSuccess || !result.data) return;
                const p = result.data;
                const contact = p.contactNumber ?? '';
                const email = p.email ?? '';
                const firstName = p.firstName ?? '';
                const middleName = p.middleName ?? '';
                const lastName = p.lastName ?? '';
                const suffix = p.suffix ?? '';
                const fullName = buildDisplayName(firstName, middleName, lastName, suffix);

                localStorage.setItem('firstName', firstName);
                localStorage.setItem('middleName', middleName);
                localStorage.setItem('lastName', lastName);
                localStorage.setItem('suffix', suffix);
                localStorage.setItem('contactNumber', contact);
                localStorage.setItem('email', email);
                localStorage.setItem('employeeName', fullName);

                setProfileForm({
                    firstName,
                    middleName,
                    lastName,
                    suffix,
                    contactNumber: contact,
                    email,
                });

                if (onProfileUpdate) {
                    onProfileUpdate(fullName);
                }
            })
            .catch(err => console.error('Error fetching profile:', err));
    }, [onProfileUpdate]);

    const [editingPassword, setEditingPassword] = useState(false);
    const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
    const [pwError, setPwError] = useState('');
    const [pwSaving, setPwSaving] = useState(false);
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNext, setShowNext] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const validateField = (key: string, value: string) => {
        let err = '';
        if (key === 'firstName' || key === 'middleName' || key === 'lastName') {
            if (value && !/^[A-Za-z\s]+$/.test(value)) err = 'Letters only (A-Z, a-z)';
            else if (value.length > 50) err = 'Max 50 characters';
            else if ((key === 'firstName' || key === 'lastName') && !value) err = 'Required';
        } else if (key === 'email') {
            if (!value) err = 'Required';
            else if (value.length < 12 || value.length > 64) err = 'Must be 12-64 characters';
            else if (!/^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value)) err = 'Invalid format';
        } else if (key === 'contactNumber') {
            if (value && !/^\d+$/.test(value)) err = 'Numbers only';
            else if (value && value.length !== 11) err = 'Must be exactly 11 digits';
        }
        setValidationErrors(prev => ({ ...prev, [key]: err }));
        return err;
    };

    const requestEditProfile = () => {
        setEditingProfile(true);
        ['firstName', 'middleName', 'lastName', 'email', 'contactNumber'].forEach(k => validateField(k, (profileForm as any)[k]));
    };

    // ── Profile Save → password gate via ConfirmationModal ────────────────────
    const handleProfileSave = () => {
        if (!profileForm.firstName.trim() || !/^[A-Za-z\s]{1,50}$/.test(profileForm.firstName.trim())) { setProfileError('Given Name must contain letters only and be up to 50 characters.'); return; }
        if (profileForm.middleName?.trim() && !/^[A-Za-z\s]{1,50}$/.test(profileForm.middleName.trim())) { setProfileError('Middle Name must contain letters only and be up to 50 characters.'); return; }
        if (!profileForm.lastName.trim() || !/^[A-Za-z\s]{1,50}$/.test(profileForm.lastName.trim())) { setProfileError('Last Name must contain letters only and be up to 50 characters.'); return; }
        const email = profileForm.email.trim();
        if (!email || email.length < 12 || email.length > 64 || !/^[A-Za-z0-9._+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email)) { setProfileError('Enter a valid Email Address (12-64 characters, local-part@domain).'); return; }
        if (!profileForm.contactNumber.trim() || !/^[0-9]{11}$/.test(profileForm.contactNumber.trim())) { setProfileError('Contact Number must be exactly 11 digits.'); return; }
        setProfileError('');

        // Open password-gate confirmation modal
        setGatePassword('');
        setGateError('');
        setShowGatePassword(false);
        setConfirmModal({
            isOpen: true,
            variant: 'success',
            title: 'Confirm your identity',
            description: (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-secondary)' }}>
                        Enter your password to save profile changes.
                    </p>
                    <div style={{ position: 'relative' }}>
                        <input
                            id="gate-pw-input"
                            type={showGatePassword ? 'text' : 'password'}
                            placeholder="Enter your current password"
                            style={{ width: '100%', paddingRight: 40, boxSizing: 'border-box' }}
                            autoFocus
                            onChange={e => {
                                setGatePassword(e.target.value);
                                setGateError('');
                            }}
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
            notice: 'For your security, identity verification is required before saving any profile changes.',
            confirmLabel: 'Verify & save',
            cancelLabel: 'Cancel',
            onConfirm: async () => {
                const pw = (document.getElementById('gate-pw-input') as HTMLInputElement)?.value ?? gatePassword;
                if (!pw) { setGateError('Please enter your password.'); return; }
                setGateLoading(true);
                setGateError('');
                try {
                    const token = localStorage.getItem('authToken');
                    const res = await fetch('/api/auth/verify-password', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({ employeeID: employeeId, password: pw }),
                    });
                    const verifyData = await res.json().catch(() => ({}));
                    if (!verifyData.isSuccess) { throw new Error(verifyData.message || verifyData.Message || 'Incorrect password. Please try again.'); }
                    // Verified — now save
                    setProfileSaving(true);
                    const fd = new FormData();
                    fd.append('firstName', profileForm.firstName.trim());
                    fd.append('middleName', profileForm.middleName.trim());
                    fd.append('lastName', profileForm.lastName.trim());
                    fd.append('suffix', profileForm.suffix.trim());
                    fd.append('contactNumber', profileForm.contactNumber.trim());
                    fd.append('email', profileForm.email.trim());
                    const saveRes = await fetch('/api/profile/update-profile', {
                        method: 'PUT',
                        headers: { Authorization: `Bearer ${token}` },
                        body: fd,
                    });
                    if (!saveRes.ok) {
                        const err = await saveRes.json().catch(() => ({}));
                        throw new Error(err.message || 'Profile update failed.');
                    }
                    localStorage.setItem('firstName', profileForm.firstName.trim());
                    localStorage.setItem('middleName', profileForm.middleName.trim());
                    localStorage.setItem('lastName', profileForm.lastName.trim());
                    localStorage.setItem('suffix', profileForm.suffix.trim());
                    localStorage.setItem('contactNumber', profileForm.contactNumber.trim());
                    localStorage.setItem('email', profileForm.email.trim());
                    const newFullName = buildDisplayName(profileForm.firstName, profileForm.middleName, profileForm.lastName, profileForm.suffix);
                    localStorage.setItem('employeeName', newFullName);
                    if (onProfileUpdate) {
                        onProfileUpdate(newFullName);
                    }
                    success('Profile updated successfully.');
                    setEditingProfile(false);
                    setConfirmModal(CONFIRM_CLOSED);
                } catch (err: any) {
                    setGateError(err.message ?? 'Incorrect password. Please try again.');
                } finally {
                    setGateLoading(false);
                    setProfileSaving(false);
                }
            },
        });
    };

    const handleProfileChange = (key: keyof typeof profileForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setProfileForm(prev => ({ ...prev, [key]: val }));
        validateField(key, val);
        setProfileError('');
    };

    // ── Password Change ────────────────────────────────────────────────────────
    const handlePwChange = (key: keyof typeof pwForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setPwForm(prev => ({ ...prev, [key]: e.target.value }));
        setPwError('');
    };

    const handlePwSave = () => {
        if (!pwForm.current) { setPwError('Current password is required.'); return; }
        if (pwForm.next.length < 6) { setPwError('New password must be at least 6 characters.'); return; }
        if (pwForm.next !== pwForm.confirm) { setPwError('Passwords do not match.'); return; }

        setConfirmModal({
            isOpen: true,
            variant: 'warning',
            title: 'Change your password?',
            description: 'You are about to update your login password. You will continue to be logged in after the change.',
            notice: 'Make sure you remember the new password before confirming.',
            confirmLabel: 'Update password',
            onConfirm: async () => {
                setPwSaving(true);
                try {
                    const token = localStorage.getItem('authToken');
                    const res = await fetch('/api/auth/change-password', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.next }),
                    });
                    if (!res.ok) {
                        const err = await res.json().catch(() => ({}));
                        throw new Error(err.message || 'Password update failed.');
                    }
                    setEditingPassword(false);
                    setPwForm({ current: '', next: '', confirm: '' });
                    setConfirmModal(CONFIRM_CLOSED);
                    // Show success state via a new modal
                    setConfirmModal({
                        isOpen: true,
                        variant: 'success',
                        title: 'Password updated',
                        description: 'Your password has been changed successfully. Use your new password the next time you log in.',
                        confirmLabel: 'Got it',
                        cancelLabel: '',
                        onConfirm: () => setConfirmModal(CONFIRM_CLOSED),
                    });
                } catch (err: any) {
                    setPwError(err.message ?? 'Something went wrong.');
                    setConfirmModal(CONFIRM_CLOSED);
                } finally {
                    setPwSaving(false);
                }
            },
        });
    };

    const displayName = buildDisplayName(
        profileForm.firstName || storedFirstName,
        profileForm.middleName || storedMiddleName,
        profileForm.lastName || storedLastName,
        profileForm.suffix || storedSuffix
    ) || legacyName || 'Manager';
    const displayContact = profileForm.contactNumber || employeeContact;

    const avatarInitial = displayName.charAt(0).toUpperCase() || '?';

    return (
        <div className="dashboard-content">
            <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr 1.5fr' }}>
                {/* ── ID Card Profile ── */}
                <div className="card" style={{ overflow: 'hidden' }}>
                    <div style={{ background: 'linear-gradient(135deg, #4318ff 0%, #6a5cff 50%, #4318ff 100%)', padding: '28px 24px 20px', textAlign: 'center', marginBottom: 0 }}>
                        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: '3px solid rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 32, fontWeight: 800, color: '#fff' }}>{avatarInitial}</div>
                        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>{displayName}</h2>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 8 }}>
                            <span style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', padding: '3px 12px', borderRadius: 999, fontSize: 11, fontWeight: 700, letterSpacing: '0.04em' }}>MANAGER</span>
                            <span style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', padding: '3px 12px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>#{employeeId}</span>
                        </div>
                    </div>
                    <div style={{ padding: '20px 24px 24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Personal Information</h3>
                            {!editingProfile && (
                                <button className="btn btn-primary" style={{ fontSize: 11, padding: '5px 12px', borderRadius: 8 }} onClick={requestEditProfile}>
                                    <Pencil size={11} /> Edit
                                </button>
                            )}
                        </div>
                        {editingProfile ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {profileError && <ErrorBanner message={profileError} />}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                    <div className="field"><label style={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.04em' }}>First Name <span style={{ color: '#ef4444' }}>*</span></label><input type="text" value={profileForm.firstName} onChange={handleProfileChange('firstName')} placeholder="First name" maxLength={50} style={{ ...(validationErrors['firstName'] ? { borderColor: '#ef4444' } : {}), height: 38, borderRadius: 8, border: '1.5px solid #e2e8f0', padding: '0 12px', fontSize: 13, width: '100%', boxSizing: 'border-box' }} />{validationErrors['firstName'] && <span style={{ color: '#ef4444', fontSize: 11, marginTop: 2 }}>{validationErrors['firstName']}</span>}</div>
                                    <div className="field"><label style={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Last Name <span style={{ color: '#ef4444' }}>*</span></label><input type="text" value={profileForm.lastName} onChange={handleProfileChange('lastName')} placeholder="Last name" maxLength={50} style={{ ...(validationErrors['lastName'] ? { borderColor: '#ef4444' } : {}), height: 38, borderRadius: 8, border: '1.5px solid #e2e8f0', padding: '0 12px', fontSize: 13, width: '100%', boxSizing: 'border-box' }} />{validationErrors['lastName'] && <span style={{ color: '#ef4444', fontSize: 11, marginTop: 2 }}>{validationErrors['lastName']}</span>}</div>
                                    <div className="field"><label style={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Middle Name <span style={{ fontSize: 9, color: '#94a3b8' }}>(opt)</span></label><input type="text" value={profileForm.middleName} onChange={handleProfileChange('middleName')} placeholder="Middle name" maxLength={50} style={{ ...(validationErrors['middleName'] ? { borderColor: '#ef4444' } : {}), height: 38, borderRadius: 8, border: '1.5px solid #e2e8f0', padding: '0 12px', fontSize: 13, width: '100%', boxSizing: 'border-box' }} /></div>
                                    <div className="field"><label style={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Suffix <span style={{ fontSize: 9, color: '#94a3b8' }}>(opt)</span></label><input type="text" value={profileForm.suffix} onChange={handleProfileChange('suffix')} placeholder="Jr., Sr., III" maxLength={10} style={{ height: 38, borderRadius: 8, border: '1.5px solid #e2e8f0', padding: '0 12px', fontSize: 13, width: '100%', boxSizing: 'border-box' }} /></div>
                                </div>
                                <div className="field"><label style={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Email <span style={{ color: '#ef4444' }}>*</span></label><input type="email" value={profileForm.email} onChange={handleProfileChange('email')} placeholder="e.g. name@company.com" style={{ ...(validationErrors['email'] ? { borderColor: '#ef4444' } : {}), height: 38, borderRadius: 8, border: '1.5px solid #e2e8f0', padding: '0 12px', fontSize: 13, width: '100%', boxSizing: 'border-box' }} />{validationErrors['email'] && <span style={{ color: '#ef4444', fontSize: 11, marginTop: 2 }}>{validationErrors['email']}</span>}</div>
                                <div className="field"><label style={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Contact Number</label><input type="tel" value={profileForm.contactNumber} onChange={handleProfileChange('contactNumber')} placeholder="e.g. 09170000000" style={{ ...(validationErrors['contactNumber'] ? { borderColor: '#ef4444' } : {}), height: 38, borderRadius: 8, border: '1.5px solid #e2e8f0', padding: '0 12px', fontSize: 13, width: '100%', boxSizing: 'border-box' }} />{validationErrors['contactNumber'] && <span style={{ color: '#ef4444', fontSize: 11, marginTop: 2 }}>{validationErrors['contactNumber']}</span>}</div>
                                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                                    <button className="btn" style={{ fontSize: 12, padding: '7px 16px', borderRadius: 8 }} onClick={() => { setEditingProfile(false); setProfileError(''); setProfileForm({ firstName: storedFirstName, middleName: storedMiddleName, lastName: storedLastName, suffix: storedSuffix, contactNumber: employeeContact, email: storedEmail }); }} disabled={profileSaving}>Cancel</button>
                                    <button className="btn btn-primary" style={{ fontSize: 12, padding: '7px 16px', borderRadius: 8 }} onClick={handleProfileSave} disabled={profileSaving}>
                                        {profileSaving ? <><Loader2 size={13} className="spin" /> Saving…</> : <><Save size={13} /> Save Changes</>}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px' }}>
                                {[
                                    { icon: <Hash size={13} />, label: 'Employee ID', value: employeeId },
                                    { icon: <UserCircle2 size={13} />, label: 'First Name', value: profileForm.firstName },
                                    { icon: <UserCircle2 size={13} />, label: 'Last Name', value: profileForm.lastName },
                                    { icon: <UserCircle2 size={13} />, label: 'Middle Name', value: profileForm.middleName || '—' },
                                    { icon: <Mail size={13} />, label: 'Email', value: profileForm.email || '—' },
                                    { icon: <Phone size={13} />, label: 'Contact', value: displayContact || '—' },
                                ].map(({ icon, label, value }) => (
                                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: '#f8fafc', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                                        <div style={{ color: '#64748b', flexShrink: 0, display: 'flex' }}>{icon}</div>
                                        <div>
                                            <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
                                            <div style={{ fontSize: 13, color: '#0f172a', fontWeight: 600 }}>{value || '—'}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Security Settings ── */}
                <div className="card">
                    <div className="card-header-layout">
                        <h3>Security</h3>
                        {!editingPassword && (
                            <button className="btn btn-primary btn-sm" onClick={() => setEditingPassword(true)}>
                                <Lock size={12} /> Change Password
                            </button>
                        )}
                    </div>
                    {!editingPassword ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '4px 0' }}>
                            <div className="system-status-item" style={{ cursor: 'default' }}><div className="system-icon bg-success"><CheckCircle2 size={16} /></div><div className="system-info"><span className="system-name">Password</span><span className="system-detail">Last updated recently</span></div><span style={{ fontSize: 11, fontWeight: 600, color: '#059669', background: 'rgba(5,150,105,0.1)', padding: '3px 10px', borderRadius: 999 }}>Secure</span></div>
                            <div style={{ height: 1, background: '#e2e8f0' }} />
                            <div className="system-status-item" style={{ cursor: 'default' }}><div className="system-icon bg-primary"><Shield size={16} /></div><div className="system-info"><span className="system-name">Role Permissions</span><span className="system-detail">Full system access granted</span></div><span style={{ fontSize: 11, fontWeight: 600, color: '#4318ff', background: 'rgba(67,24,255,0.1)', padding: '3px 10px', borderRadius: 999 }}>Admin</span></div>
                            <div style={{ height: 1, background: '#e2e8f0' }} />
                            <div className="system-status-item" style={{ cursor: 'default' }}><div className="system-icon bg-warning"><AlertCircle size={16} /></div><div className="system-info"><span className="system-name">Active Session</span><span className="system-detail">Logged in on this device</span></div><span style={{ fontSize: 11, fontWeight: 600, color: '#d97706', background: 'rgba(217,119,6,0.1)', padding: '3px 10px', borderRadius: 999 }}>Live</span></div>
                        </div>
                    ) : (
                        <div className="modal-form" style={{ padding: '4px 0 0' }}>
                            {pwError && <ErrorBanner message={pwError} />}
                            <div className="field" style={{ marginBottom: 12 }}><label style={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Current Password</label><div style={{ position: 'relative' }}><input type={showCurrent ? 'text' : 'password'} value={pwForm.current} onChange={handlePwChange('current')} placeholder="Enter current password" style={{ height: 38, borderRadius: 8, border: '1.5px solid #e2e8f0', padding: '0 40px 0 12px', fontSize: 13, width: '100%', boxSizing: 'border-box' }} /><button type="button" onClick={() => setShowCurrent(p => !p)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }} tabIndex={-1}>{showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}</button></div></div>
                            <div className="field" style={{ marginBottom: 12 }}><label style={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.04em' }}>New Password</label><div style={{ position: 'relative' }}><input type={showNext ? 'text' : 'password'} value={pwForm.next} onChange={handlePwChange('next')} placeholder="At least 6 characters" style={{ height: 38, borderRadius: 8, border: '1.5px solid #e2e8f0', padding: '0 40px 0 12px', fontSize: 13, width: '100%', boxSizing: 'border-box' }} /><button type="button" onClick={() => setShowNext(p => !p)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }} tabIndex={-1}>{showNext ? <EyeOff size={15} /> : <Eye size={15} />}</button></div></div>
                            <div className="field" style={{ marginBottom: 12 }}><label style={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Confirm New Password</label><div style={{ position: 'relative' }}><input type={showConfirm ? 'text' : 'password'} value={pwForm.confirm} onChange={handlePwChange('confirm')} placeholder="Re-enter new password" style={{ height: 38, borderRadius: 8, border: '1.5px solid #e2e8f0', padding: '0 40px 0 12px', fontSize: 13, width: '100%', boxSizing: 'border-box' }} /><button type="button" onClick={() => setShowConfirm(p => !p)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }} tabIndex={-1}>{showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}</button></div></div>
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                                <button className="btn btn-sm" onClick={() => { setEditingPassword(false); setPwError(''); setPwForm({ current: '', next: '', confirm: '' }); }} disabled={pwSaving}>Cancel</button>
                                <button className="btn btn-primary btn-sm" onClick={handlePwSave} disabled={pwSaving}>
                                    {pwSaving ? <><Loader2 size={13} className="spin" /> Saving…</> : <><Save size={13} /> Update Password</>}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <div className="card">
                <div className="card-header-layout"><h3>Account Overview</h3></div>
                <div className="system-status-list">
                    {[
                        { icon: Users, bg: 'bg-primary', name: 'Manage Employees', detail: 'Register, edit, and deactivate accounts' },
                        { icon: Truck, bg: 'bg-warning', name: 'Delivery Oversight', detail: 'View and manage all deliveries' },
                        { icon: BarChart3, bg: 'bg-success', name: 'Analytics & Reports', detail: 'Access system-wide reports' },
                    ].map(({ icon: Icon, bg, name, detail }) => (
                        <div key={name} className="system-status-item">
                            <div className={`system-icon ${bg}`}><Icon size={16} /></div>
                            <div className="system-info"><span className="system-name">{name}</span><span className="system-detail">{detail}</span></div>
                            <span style={{ fontSize: 11, fontWeight: 600, color: '#2b3674', background: '#eef2ff', padding: '3px 10px', borderRadius: 999, whiteSpace: 'nowrap' }}>Full Access</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Profile/Password Confirmation Modal ── */}
            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                variant={confirmModal.variant}
                title={confirmModal.title}
                description={confirmModal.description}
                notice={confirmModal.notice}
                confirmLabel={confirmModal.confirmLabel}
                cancelLabel={confirmModal.cancelLabel}
                isLoading={gateLoading || pwSaving}
                onConfirm={confirmModal.onConfirm}
                onCancel={() => setConfirmModal(CONFIRM_CLOSED)}
            />
        </div>
    );
}



// ─── Government Records Tab ────────────────────────────────────────────────────

const SSS_REGEX = /^\d{2}-\d{7}-\d{1}$/;
const PHILHEALTH_REGEX = /^\d{2}-\d{9}-\d{1}$/;
const PAGIBIG_REGEX = /^\d{4}-\d{4}-\d{4}$/;
const TIN_REGEX = /^\d{3}-\d{3}-\d{3}(-\d{3})?$/;

const FORMAT_LABELS: Record<string, string> = {
    sssNumber: 'XX-XXXXXXX-X',
    philhealthNumber: 'XX-XXXXXXXXX-X',
    pagibigNumber: 'XXXX-XXXX-XXXX',
    tinNumber: 'XXX-XXX-XXX-XXX',
};

const GovernmentRecordsTab: React.FC = () => {
    const { success, error } = useToast();
    const [employees, setEmployees] = useState<RecentEmployee[]>([]);
    const [selectedEmployeeNumber, setSelectedEmployeeNumber] = useState('');
    const [saving, setSaving] = useState(false);
    const [fetchingData, setFetchingData] = useState(false);

    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    const [showPasswordGate, setShowPasswordGate] = useState(false);
    const [gatePassword, setGatePassword] = useState('');
    const [gateError, setGateError] = useState('');
    const [gateLoading, setGateLoading] = useState(false);
    const [showGatePw, setShowGatePw] = useState(false);

    const [form, setForm] = useState({
        sssNumber: '',
        philhealthNumber: '',
        pagibigNumber: '',
        tinNumber: '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [apiError, setApiError] = useState('');
    const [complianceLoaded, setComplianceLoaded] = useState(false);
    const [editMode, setEditMode] = useState(false);

    const [syncRecords, setSyncRecords] = useState<any[]>([]);
    const [syncRecordsLoading, setSyncRecordsLoading] = useState(false);

    const resetToViewMode = () => {
        setEditMode(false);
        setApiError('');
        setErrors({});
    };

    const handleCancelEdit = () => {
        const hasChanges = form.sssNumber || form.philhealthNumber || form.pagibigNumber || form.tinNumber;
        if (hasChanges) {
            setShowCancelConfirm(true);
        } else {
            resetToViewMode();
        }
    };

    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                const token = localStorage.getItem('authToken');
                const res = await fetch('/api/user?PageNumber=1&PageSize=200', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (res.ok) {
                    const body = await res.json();
                    const list = body.data?.data ?? body.data ?? body ?? [];
                    setEmployees(list);
                }
            } catch (e) { console.error('GovRecords fetch employees error:', e); }
        };
        fetchEmployees();
    }, []);

    const loadEmployeeData = async (empNumber: string) => {
        if (!empNumber) return;
        resetToViewMode();
        setFetchingData(true);
        setComplianceLoaded(false);
        setApiError('');
        setSyncRecords([]);

        try {
            const token = localStorage.getItem('authToken');
            const res = await fetch(`/api/systemadmin/digital-201-file?employeeNumber=${encodeURIComponent(empNumber)}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Failed to load employee compliance data.');
            const body = await res.json();
            const compliance = body.data?.compliance ?? body?.compliance;
            if (compliance) {
                setForm({
                    sssNumber: compliance.sssNumber ?? '',
                    philhealthNumber: compliance.philhealthNumber ?? '',
                    pagibigNumber: compliance.pagibigNumber ?? '',
                    tinNumber: compliance.tinNumber ?? '',
                });
            } else {
                setForm({ sssNumber: '', philhealthNumber: '', pagibigNumber: '', tinNumber: '' });
            }
            setComplianceLoaded(true);
            setErrors({});
        } catch (err: any) {
            setApiError(err.message);
            setForm({ sssNumber: '', philhealthNumber: '', pagibigNumber: '', tinNumber: '' });
        } finally {
            setFetchingData(false);
        }
    };

    useEffect(() => {
        loadEmployeeData(selectedEmployeeNumber);
    }, [selectedEmployeeNumber]);

    const validate = (): boolean => {
        const e: Record<string, string> = {};
        if (!SSS_REGEX.test(form.sssNumber)) e.sssNumber = `Invalid SSS Number format detected. Expected: ${FORMAT_LABELS.sssNumber}`;
        if (!PHILHEALTH_REGEX.test(form.philhealthNumber)) e.philhealthNumber = `Invalid PhilHealth Number format detected. Expected: ${FORMAT_LABELS.philhealthNumber}`;
        if (!PAGIBIG_REGEX.test(form.pagibigNumber)) e.pagibigNumber = `Invalid Pag-IBIG Number format detected. Expected: ${FORMAT_LABELS.pagibigNumber}`;
        if (form.tinNumber.trim() && !TIN_REGEX.test(form.tinNumber)) e.tinNumber = `Invalid TIN format detected. Expected: ${FORMAT_LABELS.tinNumber}`;
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const applyAutoFormat = (field: string, value: string) => {
        const digits = value.replace(/\D/g, '');
        if (field === 'sssNumber') {
            if (digits.length <= 2) return digits;
            if (digits.length <= 9) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
            return `${digits.slice(0, 2)}-${digits.slice(2, 9)}-${digits.slice(9, 10)}`;
        }
        if (field === 'philhealthNumber') {
            if (digits.length <= 2) return digits;
            if (digits.length <= 11) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
            return `${digits.slice(0, 2)}-${digits.slice(2, 11)}-${digits.slice(11, 12)}`;
        }
        if (field === 'pagibigNumber') {
            if (digits.length <= 4) return digits;
            if (digits.length <= 8) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
            return `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8, 12)}`;
        }
        if (field === 'tinNumber') {
            if (digits.length <= 3) return digits;
            if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
            if (digits.length <= 9) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
            return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 9)}-${digits.slice(9, 12)}`;
        }
        return value;
    };

    const handleFieldChange = (field: string, raw: string) => {
        const formatted = applyAutoFormat(field, raw);
        setForm(prev => ({ ...prev, [field]: formatted }));
        setErrors(prev => ({ ...prev, [field]: '' }));
        setApiError('');
    };

    const loadSyncRecords = async (empNumber: string) => {
        setSyncRecordsLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            const res = await fetch(`/api/systemadmin/${encodeURIComponent(empNumber)}/statutory-sync-records`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const body = await res.json();
                setSyncRecords(body.data ?? []);
            }
        } catch { /* ignore */ }
        finally { setSyncRecordsLoading(false); }
    };

    const doSubmit = async () => {
        setSaving(true);
        setApiError('');
        try {
            const token = localStorage.getItem('authToken');
            const res = await fetch('/api/systemadmin/update-statutory-records', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    employeeNumber: selectedEmployeeNumber,
                    sssNumber: form.sssNumber,
                    philhealthNumber: form.philhealthNumber,
                    pagibigNumber: form.pagibigNumber,
                    tinNumber: form.tinNumber,
                }),
            });
            const body = await res.json();
            if (!res.ok || !body.isSuccess) {
                throw new Error(body.message || 'Failed to save government records.');
            }
            success('Government records saved successfully. Statutory identifiers synchronized with FOMS.');
            await loadEmployeeData(selectedEmployeeNumber);
            await loadSyncRecords(selectedEmployeeNumber);
        } catch (err: any) {
            setApiError(err.message);
            error(err.message);
            setShowPasswordGate(false);
            throw err;
        } finally {
            setSaving(false);
        }
    };

    const handleSubmit = () => {
        if (!validate()) return;
        setGatePassword('');
        setGateError('');
        setShowPasswordGate(true);
    };

    return (
        <div className="dashboard-content">
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '20px 22px', borderBottom: '1px solid var(--border)' }}>
                    <div className="field" style={{ margin: 0 }}>
                        <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Select Employee</label>
                        <Select
                            value={selectedEmployeeNumber}
                            onChange={setSelectedEmployeeNumber}
                            placeholder="— Choose an employee —"
                            options={employees.map(emp => ({
                                value: emp.employeeNumber,
                                label: `${emp.firstName ?? ''} ${emp.lastName ?? ''}`.trim() + ` (${emp.employeeNumber})`,
                            }))}
                        />
                    </div>
                </div>

                <div style={{ padding: '20px 22px' }}>
                    {!selectedEmployeeNumber && (
                        <div>
                            <h3 style={{ margin: '0 0 12px', fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <ShieldCheck size={18} /> All Employees
                            </h3>
                            <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text-secondary)' }}>Select an employee from the dropdown above or click a row below to view or update their government records.</p>
                            <div style={{ maxHeight: 400, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 10 }}>
                                <table className="data-table" style={{ margin: 0 }}>
                                    <thead>
                                        <tr>
                                            <th>Employee</th>
                                            <th>ID</th>
                                            <th>Department / Role</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {employees.map(emp => (
                                            <tr key={emp.employeeNumber} onClick={() => setSelectedEmployeeNumber(emp.employeeNumber)} style={{ cursor: 'pointer' }}
                                                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-input)')}
                                                onMouseLeave={e => (e.currentTarget.style.background = '')}>
                                                <td style={{ fontWeight: 600 }}>{`${emp.firstName ?? ''} ${emp.lastName ?? ''}`.trim() || emp.employeeNumber}</td>
                                                <td style={{ color: 'var(--text-secondary)' }}>{emp.employeeNumber}</td>
                                                <td style={{ color: 'var(--text-secondary)' }}>{emp.role || '—'}</td>
                                            </tr>
                                        ))}
                                        {employees.length === 0 && (
                                            <tr><td colSpan={3} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>No employees found.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {selectedEmployeeNumber && fetchingData && (
                        <EmptyState icon={<Loader2 size={24} className="spin" />} message="Loading compliance data..." />
                    )}

                    {selectedEmployeeNumber && !fetchingData && (
                        <>
                            {apiError && <ErrorBanner message={apiError} />}

                            <div className="card-header-layout" style={{ margin: 0 }}>
                                <h3 style={{ margin: 0, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <ShieldCheck size={18} /> Government IDs Form
                                </h3>
                                {!editMode && (
                                    <button className="btn btn-primary" onClick={() => setEditMode(true)} style={{ fontSize: 12, padding: '6px 14px' }}>
                                        <Pencil size={12} /> Edit
                                    </button>
                                )}
                            </div>

                            <div className="field" style={{ marginTop: 16 }}>
                                <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Employee ID <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(System Generated Reference)</span></label>
                                <div style={{ position: 'relative', marginTop: 6 }}>
                                    <Hash size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                    <input type="text" value={selectedEmployeeNumber} readOnly
                                        style={{ width: '100%', paddingLeft: 36, height: 38, borderRadius: 9, border: '1px solid var(--border)', fontSize: 13, background: 'var(--bg-input)', color: 'var(--text-secondary)', boxSizing: 'border-box' }} />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
                                {(['sssNumber', 'philhealthNumber', 'pagibigNumber', 'tinNumber'] as const).map(field => (
                                    <div className="field" key={field}>
                                        <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>
                                            {field === 'sssNumber' ? 'SSS Number' :
                                                field === 'philhealthNumber' ? 'PhilHealth Number' :
                                                    field === 'pagibigNumber' ? 'Pag-IBIG Number' : 'TIN'} {field !== 'tinNumber' && <span style={{ color: 'var(--status-failed)' }}>*</span>}
                                            {field === 'tinNumber' && <span style={{ fontWeight: 400, fontSize: 11, color: 'var(--text-muted)' }}> (optional)</span>}
                                        </label>
                                        {editMode ? (
                                            <>
                                                <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginTop: 4, marginBottom: 4 }}>
                                                    Format: {FORMAT_LABELS[field]}
                                                </span>
                                                <input
                                                    type="text"
                                                    value={form[field]}
                                                    onChange={e => handleFieldChange(field, e.target.value)}
                                                    placeholder={FORMAT_LABELS[field]}
                                                    maxLength={field === 'sssNumber' ? 12 : field === 'philhealthNumber' ? 14 : field === 'pagibigNumber' ? 14 : 14}
                                                    style={{
                                                        width: '100%', height: 38, borderRadius: 9, padding: '0 12px', fontSize: 13,
                                                        border: `1px solid ${errors[field] ? 'var(--status-failed)' : 'var(--border)'}`,
                                                        background: 'var(--bg-primary,#fff)', color: 'var(--text-primary)',
                                                        boxSizing: 'border-box',
                                                    }}
                                                />
                                                {errors[field] && <span style={{ fontSize: 11, color: 'var(--status-failed)', marginTop: 4, display: 'block' }}>{errors[field]}</span>}
                                            </>
                                        ) : (
                                            <div style={{ position: 'relative', marginTop: 6 }}>
                                                <Hash size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                                <input type="text" value={form[field] || '—'} readOnly
                                                    style={{ width: '100%', paddingLeft: 36, height: 38, borderRadius: 9, border: '1px solid var(--border)', fontSize: 13, background: 'var(--bg-input)', color: 'var(--text-primary)', boxSizing: 'border-box' }} />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {editMode && (
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
                                    <button className="btn" onClick={handleCancelEdit} disabled={saving} style={{ fontSize: 12, padding: '6px 14px' }}>Cancel</button>
                                    <button className="btn btn-primary" onClick={handleSubmit} disabled={saving} style={{ fontSize: 12, padding: '6px 14px' }}>
                                        {saving
                                            ? <><Loader2 size={12} className="spin" /> Saving…</>
                                            : <><Save size={12} /> Update Statutory Records</>
                                        }
                                    </button>
                                </div>
                            )}

                            {/* Sync Records */}
                            <div style={{ marginTop: 32 }}>
                                <div className="card-header-layout" style={{ margin: '0 0 16px' }}>
                                    <h3 style={{ margin: 0, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <Activity size={18} /> Synchronization Record
                                    </h3>
                                </div>
                                {syncRecordsLoading ? (
                                    <EmptyState icon={<Loader2 size={22} className="spin" />} message="Loading sync records..." />
                                ) : syncRecords.length === 0 ? (
                                    <EmptyState message="No synchronization records yet. Submit the form to generate one." />
                                ) : (
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Target System</th>
                                                <th>Sync Timestamp</th>
                                                <th>Sync Status</th>
                                                <th>Error Message</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {syncRecords.map((r: any) => (
                                                <tr key={r.syncRecordId ?? r.statutorySyncRecordId}>
                                                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.targetSystem ?? 'FOMS'}</td>
                                                    <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{r.syncTimestamp ? new Date(r.syncTimestamp).toLocaleString() : '—'}</td>
                                                    <td><StatusBadge status={r.syncStatus || 'Pending'} /></td>
                                                    <td style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{r.errorMessage || '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
            <ConfirmationModal
                isOpen={showCancelConfirm}
                variant="warning"
                title="Discard changes?"
                description="You have unsaved changes. Are you sure you want to discard them?"
                confirmLabel="Discard"
                onConfirm={() => { setShowCancelConfirm(false); setForm({ sssNumber: '', philhealthNumber: '', pagibigNumber: '', tinNumber: '' }); resetToViewMode(); }}
                onCancel={() => setShowCancelConfirm(false)}
            />
            {showPasswordGate && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }} onClick={() => { if (!saving) setShowPasswordGate(false); }}>
                    <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: 380, maxWidth: '90vw', boxShadow: '0 24px 64px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Confirm Your Identity</h3>
                        <p style={{ margin: '0 0 20px', fontSize: 13, color: '#64748b' }}>Enter your password to update government records.</p>
                        <div style={{ position: 'relative' }}>
                            <input type={showGatePw ? 'text' : 'password'} placeholder="Enter your current password" value={gatePassword} autoFocus
                                onChange={e => { setGatePassword(e.target.value); setGateError(''); }}
                                onKeyDown={e => { if (e.key === 'Enter' && !gateLoading) { (document.getElementById('gov-gate-confirm') as HTMLButtonElement)?.click(); } }}
                                style={{ width: '100%', height: 42, borderRadius: 10, border: `1.5px solid ${gateError ? '#dc2626' : '#e2e8f0'}`, padding: '0 44px 0 14px', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                            />
                            <button type="button" onClick={() => setShowGatePw(p => !p)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }} tabIndex={-1}>
                                {showGatePw ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                        {gateError && <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#dc2626', marginTop: 8 }}><AlertCircle size={12} />{gateError}</div>}
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                            <button className="btn" onClick={() => setShowPasswordGate(false)} disabled={gateLoading} style={{ padding: '9px 18px', borderRadius: 10 }}>Cancel</button>
                            <button id="gov-gate-confirm" className="btn btn-primary" disabled={gateLoading} onClick={async () => {
                                if (!gatePassword) { setGateError('Please enter your password.'); return; }
                                setGateLoading(true);
                                setGateError('');
                                try {
                                    const token = localStorage.getItem('authToken');
                                    const adminId = localStorage.getItem('employeeId') ?? '';
                                    const verifyRes = await fetch('/api/auth/verify-password', {
                                        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                        body: JSON.stringify({ employeeID: adminId, password: gatePassword }),
                                    });
                                    const verifyData = await verifyRes.json().catch(() => ({}));
                                    if (!verifyData.isSuccess) { throw new Error(verifyData.message || verifyData.Message || 'Incorrect password.'); }
                                    await doSubmit();
                                    setShowPasswordGate(false);
                                } catch (err: any) {
                                    setGateError(err.message || err.Message || 'Incorrect password.');
                                } finally { setGateLoading(false); }
                            }} style={{ padding: '9px 24px', borderRadius: 10 }}>
                                {gateLoading ? <><Loader2 size={13} className="spin" /> Verifying…</> : <>Verify & Update</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Root Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
    const navigate = useNavigate();
    const { success, error } = useToast();
    const [employeeName, setEmployeeName] = useState(() => {
        const storedFirst = localStorage.getItem('firstName') ?? '';
        const storedMiddle = localStorage.getItem('middleName') ?? '';
        const storedLast = localStorage.getItem('lastName') ?? '';
        const storedSuffix = localStorage.getItem('suffix') ?? '';
        return buildDisplayName(storedFirst, storedMiddle, storedLast, storedSuffix) || localStorage.getItem('employeeName') || '';
    });
    const currentEmployeeId = localStorage.getItem('employeeId') || '';
    usePreventBackNav();

    const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
    const [rolesList, setRolesList] = useState<string[]>(['Manager', 'Coordinator', 'Dispatcher', 'Encoder', 'Courier', 'Accountant']);
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<RecentEmployee | null>(null);
    const [empModalEditMode, setEmpModalEditMode] = useState(false);
    const [archiveConfirmEmp, setarchiveConfirmEmp] = useState<RecentEmployee | null>(null);
    const [archiveSubmitting, setarchiveSubmitting] = useState(false);
    const [selectedPanelEmployee, setSelectedPanelEmployee] = useState<RecentEmployee | null>(null);
    const [detailPanelInitialSection, setDetailPanelInitialSection] = useState<'overview' | 'digital_201'>('overview');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [logoutConfirm, setLogoutConfirm] = useState(false);
    const [logoutLoading, setLogoutLoading] = useState(false);

    // ── Employees ──
    const [employees, setEmployees] = useState<RecentEmployee[]>([]);
    const [recentEmployees, setRecentEmployees] = useState<RecentEmployee[]>([]);
    const [empLoading, setEmpLoading] = useState(true);
    const [empPage, setEmpPage] = useState(1);
    const [empTotalPages, setEmpTotalPages] = useState(1);

    // ── Task Management ──
    const [tmTasks, setTmTasks] = useState<any[]>([]);
    const [tmLoading, setTmLoading] = useState(false);
    const [showNewTask, setShowNewTask] = useState(false);
    const [tmDetailTask, setTmDetailTask] = useState<TaskViewTask | null>(null);
    const [tmEditingTask, setTmEditingTask] = useState<TaskViewTask | null>(null);
    const [newTaskForm, setNewTaskForm] = useState({ title: '', description: '', priority: '', deadline: '', classification: '', isConfidential: false, assignmentScope: 'SingleEmployee', assignedDepartmentId: '' });
    const [newTaskErrors, setNewTaskErrors] = useState<Record<string, string>>({});
    const [newTaskSubmitting, setNewTaskSubmitting] = useState(false);
    const [newTaskApiError, setNewTaskApiError] = useState('');
    const [editForm, setEditForm] = useState({ title: '', description: '', priority: '', deadline: '', classification: '', isConfidential: false, assignmentScope: 'SingleEmployee', assignedDepartmentId: '' });
    const [editErrors, setEditErrors] = useState<Record<string, string>>({});
    const [editSubmitting, setEditSubmitting] = useState(false);
    const [editApiError, setEditApiError] = useState('');
    const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
    const PRIORITY_LABELS: Record<number, string> = { 0: 'Low', 1: 'Medium', 2: 'High', 3: 'Urgent' };
    const PRIORITY_NUM_FROM_LABEL: Record<string, number> = { Low: 0, Medium: 1, High: 2, Urgent: 3 };
    const STATUS_LABELS: Record<number, string> = { 0: 'Not Started', 1: 'In Progress', 2: 'Done/Pending Review', 3: 'Completed', 4: 'On Hold', 5: 'Cancelled' };

    const toLocalDateTimeInput = (iso: string | null | undefined): string => {
        if (!iso) return '';
        try {
            const d = new Date(iso);
            if (isNaN(d.getTime())) return '';
            const pad = (n: number) => String(n).padStart(2, '0');
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        } catch { return ''; }
    };

    const mapManagerTaskToView = (t: any): TaskViewTask => {
        const statusNum = t.status;
        const mappedStatus = STATUS_LABELS[statusNum] ?? 'Not Started';
        const assignees = t.assignees ?? [];
        const firstAssignee = assignees[0];
        return {
            taskId: t.id ?? t.taskId ?? '',
            taskTitle: t.title ?? t.taskTitle ?? '',
            taskDescription: t.description ?? t.taskDescription ?? '',
            priority: ({ 0: 'Low', 1: 'Medium', 2: 'High', 3: 'Urgent' } as Record<number, any>)[t.priorityLevel] ?? 'Medium',
            dueAt: t.deadline ?? t.dueAt ?? null,
            taskStatus: mappedStatus as TaskViewTask['taskStatus'],
            taskRemarks: t.remarks ?? t.taskRemarks ?? '',
            assignedEmployee: firstAssignee?.fullName ?? t.assignedEmployee ?? 'Unassigned',
            createdByEmployee: t.createdByName ?? t.createdByEmployee ?? localStorage.getItem('employeeName') ?? 'Manager',
            assignedTo: firstAssignee?.userId ?? t.assignedTo ?? '',
            createdAt: t.createdAt ?? new Date().toISOString(),
            isConfidential: t.isConfidential ?? false,
            classification: t.classification === 1 ? 'special' : 'routine',
            isSLALocked: t.isSLALocked ?? false,
            assignmentScope: t.assignmentScope ?? t.AssignmentScope ?? 0,
            assignedDepartmentId: t.assignedDepartmentId ?? t.AssignedDepartmentId ?? '',
            assignedDepartmentName: t.assignedDepartmentName ?? t.AssignedDepartmentName ?? '',
        };
    };

    const fetchManagerTasks = async () => {
        setTmLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            const res = await fetch('/api/task', { headers: { Authorization: `Bearer ${token}` } });
            if (!res.ok) { setTmTasks([]); return; }
            const json = await res.json();
            const raw = Array.isArray(json) ? json : (Array.isArray(json?.data?.data) ? json.data.data : (Array.isArray(json?.data) ? json.data : []));
            setTmTasks(raw.map((t: any) => ({
                id: t.id ?? t.taskId,
                name: t.title ?? t.taskTitle ?? '',
                referenceNumber: t.taskReferenceNumber ?? '',
                classification: t.classification === 1 ? 'special' : 'routine',
                project: t.classification === 1 ? 'SpecialTask' : '',
                assignee: t.assignees?.length ? { id: t.assignees[0].userId ?? '', name: t.assignees[0].fullName ?? '' } : undefined,
                priority: ({ 0: 'Low', 1: 'Medium', 2: 'High', 3: 'Urgent' } as Record<number, any>)[t.priorityLevel] || 'Medium',
                status: ({ 0: 'To do', 1: 'In progress', 2: 'In review', 3: 'Done', 4: 'On hold', 5: 'Cancelled' } as Record<number, any>)[t.status] || 'Backlog',
                dueDate: t.deadline ?? t.dueAt ?? undefined,
                progress: t.status === 3 ? 100 : t.status === 1 ? 50 : t.status === 2 ? 80 : t.status === 0 ? 10 : 0,
                isArchived: false,
                isConfidential: t.isConfidential ?? false,
                isSLALocked: t.isSLALocked ?? false,
            })));
        } catch { setTmTasks([]); }
        setTmLoading(false);
    };

    useEffect(() => { if (activeTab === 'tasks') { fetchManagerTasks(); } }, [activeTab]);

    useEffect(() => {
        const token = localStorage.getItem('authToken');
        if (!token) return;
        fetch('/api/department', { headers: { Authorization: `Bearer ${token}` } })
            .then(res => res.ok ? res.json() : null)
            .then(json => {
                if (json?.isSuccess && Array.isArray(json.data)) {
                    setDepartments(json.data.map((d: any) => ({ id: d.id, name: d.name })));
                }
            })
            .catch(() => {});
    }, []);

    const handleManagerTaskArchive = async (ids: string[]) => {
        const token = localStorage.getItem('authToken');
        for (const id of ids) {
            try {
                await fetch(`/api/task/${id}/archive`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } });
            } catch { /* ignore individual failures */ }
        }
        success(`${ids.length} task${ids.length !== 1 ? 's' : ''} archived.`);
        fetchManagerTasks();
    };

    const handleManagerTaskRestore = async (ids: string[]) => {
        const token = localStorage.getItem('authToken');
        for (const id of ids) {
            try {
                await fetch(`/api/task/${id}/restore`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } });
            } catch { /* ignore individual failures */ }
        }
        success(`${ids.length} task${ids.length !== 1 ? 's' : ''} restored.`);
        fetchManagerTasks();
    };

    const handleManagerTaskDelete = async (ids: string[]) => {
        const token = localStorage.getItem('authToken');
        for (const id of ids) {
            try {
                await fetch(`/api/task/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
            } catch { /* ignore individual failures */ }
        }
        success(`${ids.length} task${ids.length !== 1 ? 's' : ''} deleted.`);
        fetchManagerTasks();
    };

    const handleManagerTaskMarkDone = async (ids: string[]) => {
        const token = localStorage.getItem('authToken');
        for (const id of ids) {
            try {
                await fetch(`/api/task/${id}/status`, {
                    method: 'PATCH',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 3 }),
                });
            } catch { /* ignore individual failures */ }
        }
        success(`${ids.length} task${ids.length !== 1 ? 's' : ''} marked done.`);
        fetchManagerTasks();
    };

    const handleManagerTaskView = (id: string) => {
        const found = tmTasks.find(t => t.id === id);
        if (!found) return;
        // The list view flattens the task; reconstruct a TaskViewTask from the raw data
        // by re-fetching the full record so we get description, remarks, etc.
        const token = localStorage.getItem('authToken');
        fetch(`/api/task/${id}`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.ok ? r.json() : null)
            .then(json => {
                const raw = json?.data ?? json;
                if (raw) {
                    setTmDetailTask(mapManagerTaskToView(raw));
                } else {
                    // Fallback: map from the list summary
                    setTmDetailTask({
                        taskId: found.id,
                        taskTitle: found.name,
                        taskDescription: '',
                        priority: found.priority,
                        dueAt: found.dueDate ?? null,
                        taskStatus: found.status === 'Done' ? 'Completed' : 'In Progress',
                        assignedEmployee: found.assignee?.name ?? 'Unassigned',
                        createdByEmployee: localStorage.getItem('employeeName') ?? 'Manager',
                        assignedTo: found.assignee?.id ?? '',
                        createdAt: new Date().toISOString(),
                    });
                }
            })
            .catch(() => {
                setTmDetailTask({
                    taskId: found.id,
                    taskTitle: found.name,
                    taskDescription: '',
                    priority: found.priority,
                    dueAt: found.dueDate ?? null,
                    taskStatus: found.status === 'Done' ? 'Completed' : 'In Progress',
                    assignedEmployee: found.assignee?.name ?? 'Unassigned',
                    createdByEmployee: localStorage.getItem('employeeName') ?? 'Manager',
                    assignedTo: found.assignee?.id ?? '',
                    createdAt: new Date().toISOString(),
                });
            });
    };

    useEffect(() => {
        if (tmEditingTask) {
            setEditForm({
                title: tmEditingTask.taskTitle ?? '',
                description: tmEditingTask.taskDescription ?? '',
                priority: tmEditingTask.priority ?? '',
                deadline: toLocalDateTimeInput(tmEditingTask.dueAt),
                classification: tmEditingTask.classification ?? '',
                isConfidential: tmEditingTask.isConfidential ?? false,
                assignmentScope: (tmEditingTask.assignmentScope !== undefined ? ['SingleEmployee', 'Team', 'Department'][tmEditingTask.assignmentScope] : 'SingleEmployee') as string,
                assignedDepartmentId: tmEditingTask.assignedDepartmentId ?? '',
            });
            setEditErrors({});
            setEditApiError('');
        }
    }, [tmEditingTask]);

    useEffect(() => {
        if (!showNewTask) {
            setNewTaskForm({ title: '', description: '', priority: '', deadline: '', classification: '', isConfidential: false, assignmentScope: 'SingleEmployee', assignedDepartmentId: '' });
            setNewTaskErrors({});
            setNewTaskApiError('');
        }
    }, [showNewTask]);

    const handleManagerCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        const errs: Record<string, string> = {};
        const t = newTaskForm.title.trim();
        if (!t) errs.title = 'Title is required.';
        else if (t.length < 3) errs.title = 'Title must be at least 3 characters.';
        else if (t.length > 150) errs.title = 'Title must not exceed 150 characters.';
        const d = newTaskForm.description.trim();
        if (!d) errs.description = 'Description is required.';
        else if (d.length > 2000) errs.description = 'Description must not exceed 2,000 characters.';
        if (!newTaskForm.priority) errs.priority = 'Priority is required.';
        if (!newTaskForm.deadline) errs.deadline = 'Deadline is required.';
        if (!newTaskForm.classification) errs.classification = 'Classification is required.';
        if (!newTaskForm.assignmentScope) errs.assignmentScope = 'Assignment scope is required.';
        if (newTaskForm.assignmentScope === 'Department' && !newTaskForm.assignedDepartmentId) errs.assignedDepartmentId = 'Department is required for Department scope.';
        if (Object.keys(errs).length) { setNewTaskErrors(errs); return; }
        setNewTaskErrors({});

        const SCOPE_MAP: Record<string, number> = { SingleEmployee: 0, Team: 1, Department: 2 };
        const scopeNum = SCOPE_MAP[newTaskForm.assignmentScope] ?? 0;

        setNewTaskSubmitting(true);
        setNewTaskApiError('');
        const token = localStorage.getItem('authToken');
        try {
            const createPayload: Record<string, any> = {
                title: t,
                description: d,
                priorityLevel: PRIORITY_NUM_FROM_LABEL[newTaskForm.priority] ?? 1,
                classification: newTaskForm.classification === 'special' ? 1 : 0,
                assignmentScope: scopeNum,
                isConfidential: newTaskForm.isConfidential,
                assignedDepartmentId: scopeNum === 2 ? newTaskForm.assignedDepartmentId || undefined : undefined,
            };
            if (newTaskForm.priority !== 'Urgent') {
                createPayload.deadline = new Date(newTaskForm.deadline).toISOString();
            }
            const res = await fetch('/api/task', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(createPayload),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || err.Message || 'Failed to create task.');
            }
            success('Task created successfully.');
            setShowNewTask(false);
            fetchManagerTasks();
        } catch (err: any) {
            setNewTaskApiError(err.message || err.Message || 'Failed to create task.');
        } finally {
            setNewTaskSubmitting(false);
        }
    };

    const handleManagerEditSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tmEditingTask) return;
        const errs: Record<string, string> = {};
        const t = editForm.title.trim();
        if (!t) errs.title = 'Title is required.';
        else if (t.length < 3) errs.title = 'Title must be at least 3 characters.';
        else if (t.length > 150) errs.title = 'Title must not exceed 150 characters.';
        const d = editForm.description.trim();
        if (!d) errs.description = 'Description is required.';
        else if (d.length > 2000) errs.description = 'Description must not exceed 2,000 characters.';
        if (!editForm.priority) errs.priority = 'Priority is required.';
        if (!editForm.deadline) errs.deadline = 'Deadline is required.';
        if (!editForm.classification) errs.classification = 'Classification is required.';
        if (Object.keys(errs).length) { setEditErrors(errs); return; }
        setEditErrors({});

        const SCOPE_MAP: Record<string, number> = { SingleEmployee: 0, Team: 1, Department: 2 };
        const scopeNum = SCOPE_MAP[editForm.assignmentScope] ?? 0;

        setEditSubmitting(true);
        setEditApiError('');
        const token = localStorage.getItem('authToken');
        try {
            const updatePayload: Record<string, any> = {
                title: t,
                description: d,
                priorityLevel: PRIORITY_NUM_FROM_LABEL[editForm.priority] ?? 1,
                classification: editForm.classification === 'special' ? 1 : 0,
                assignmentScope: scopeNum,
                isConfidential: editForm.isConfidential,
                assignedDepartmentId: scopeNum === 2 ? editForm.assignedDepartmentId || undefined : undefined,
            };
            if (!tmEditingTask.isSLALocked) {
                updatePayload.deadline = new Date(editForm.deadline).toISOString();
            }
            const res = await fetch(`/api/task/${tmEditingTask.taskId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(updatePayload),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || err.Message || 'Failed to update task.');
            }
            success(editForm.isConfidential !== (tmEditingTask.isConfidential ?? false)
                ? 'Confidentiality updated successfully.'
                : 'Task updated successfully.');
            setTmEditingTask(null);
            fetchManagerTasks();
        } catch (err: any) {
            setEditApiError(err.message || err.Message || 'Failed to update task.');
        } finally {
            setEditSubmitting(false);
        }
    };

    // ── Activity Logs ──
    const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
    const [activityLogPage, setActivityLogPage] = useState(1);
    const [activityLogTotalPages, setActivityLogTotalPages] = useState(1);
    const [activityLogLoading, setActivityLogLoading] = useState(false);
    const ACTIVITY_LOG_PAGE_SIZE = 15;
    const [activityLogSearch, setActivityLogSearch] = useState('');
    const [activityLogEmployee, setActivityLogEmployee] = useState('');
    const [activityLogType, setActivityLogType] = useState('');
    const [activityLogDateFrom, setActivityLogDateFrom] = useState('');
    const [activityLogDateTo, setActivityLogDateTo] = useState('');

    const fetchActivityLogs = (page: number) => {
        setActivityLogLoading(true);
        const token = localStorage.getItem('authToken');
        const params = new URLSearchParams({ page: String(page), pageSize: String(ACTIVITY_LOG_PAGE_SIZE) });
        if (activityLogSearch) params.append('search', activityLogSearch);
        if (activityLogEmployee) params.append('employeeId', activityLogEmployee);
        if (activityLogType) params.append('activityType', activityLogType);
        if (activityLogDateFrom) params.append('dateFrom', activityLogDateFrom);
        if (activityLogDateTo) params.append('dateTo', activityLogDateTo);
        fetch(`/api/activity-logs/recent?${params}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
            .then(res => { if (!res.ok) return null; return res.json(); })
            .then(data => {
                if (data && Array.isArray(data.data)) {
                    setActivityLogs(data.data);
                    setActivityLogPage(data.pageNumber || page);
                    setActivityLogTotalPages(data.totalPages || 1);
                } else if (Array.isArray(data)) {
                    setActivityLogs(data);
                    setActivityLogPage(1);
                    setActivityLogTotalPages(1);
                } else {
                    setActivityLogs([]);
                }
            })
            .catch(() => setActivityLogs([]))
            .finally(() => setActivityLogLoading(false));
    };

    // Re-fetch activity logs when the tab becomes active or any filter changes
    useEffect(() => {
        if (activeTab === 'activity_logs') {
            const timer = setTimeout(() => fetchActivityLogs(1), 400);
            return () => clearTimeout(timer);
        }
    }, [activeTab, activityLogSearch, activityLogEmployee, activityLogType, activityLogDateFrom, activityLogDateTo]);

    // ── Employment Contracts / Documents ──
    const [contracts, setContracts] = useState<EmploymentContract[]>([]);
    const [contractsLoading, setContractsLoading] = useState(true);
    const [contractsPage, setContractsPage] = useState(1);
    const [contractsTotalPages, setContractsTotalPages] = useState(1);

    const fetchBackendRoles = async () => {
        try {
            const token = localStorage.getItem('authToken');
            const res = await fetch('/api/role', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                const raw = Array.isArray(data) ? data : data.data ?? data.$values ?? [];
                const roleNames = raw.map((r: any) => toDisplayRole(r.displayName ?? r.DisplayName ?? r.name ?? r.Name));
                setRolesList(roleNames);
            }
        } catch (err) {
            console.error('Failed to fetch backend roles:', err);
        }
    };

    const fetchEmployees = (page: number = 1, filters: { search: string; role: string; status: string } = { search: '', role: '', status: '' }) => {
        const token = localStorage.getItem('authToken');
        setEmpLoading(true);
        const params = new URLSearchParams({ PageNumber: String(page), PageSize: String(PAGE_SIZE) });
        if (filters.search) params.append('search', filters.search);
        if (filters.role) params.append('role', toBackendRole(filters.role));
        if (filters.status) params.append('status', filters.status);
        fetch(`/api/user?${params}`, { headers: { 'Authorization': `Bearer ${token}` } })
            .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
            .then(result => {
                if (!result.isSuccess) throw new Error(result.message ?? 'Failed to fetch');
                const raw: any[] = Array.isArray(result.data) ? result.data : [];
                const list: RecentEmployee[] = raw.map((e: any) => ({
                    employeeNumber: e.employeeNumber,
                    firstName: e.firstName ?? '',
                    middleName: e.middleName ?? '',
                    lastName: e.lastName ?? '',
                    suffix: e.suffix ?? '',
                    employeeName: e.employeeName ?? buildDisplayName(e.firstName ?? '', e.middleName ?? '', e.lastName ?? '', e.suffix ?? ''),
                    contactNumber: e.contactNumber,
                    role: e.role,
                    accountStatus: e.isDeactivated ? 'Deactivated' : (e.isActive !== false ? 'Active' : 'Inactive'),
                    presenceStatus: e.presenceStatus ?? 'Offline',
                    email: e.email ?? '',
                    attachments: e.attachments ?? [],
                })).filter((e: RecentEmployee) => e.accountStatus !== 'Deleted' && e.employeeNumber !== currentEmployeeId);
                setEmployees(list);
                setRecentEmployees(list);
                setEmpTotalPages(result.totalPages ?? 1);
                setEmpPage(page);
            })
            .catch((err) => {
                console.error('Error fetching employees:', err);
                setEmployees([]);
                setRecentEmployees([]);
            })
            .finally(() => setEmpLoading(false));
    };

    const fetchContracts = (page: number = 1, filters: { search: string; isArchived?: boolean } = { search: '', isArchived: false }) => {
        const token = localStorage.getItem('authToken');
        setContractsLoading(true);
        const params = new URLSearchParams({ PageNumber: String(page), PageSize: String(PAGE_SIZE) });
        if (filters.search) params.append('search', filters.search);
        if (filters.isArchived !== undefined) params.append('isArchived', String(filters.isArchived));

        fetch(`/api/systemadmin/contracts?${params}`, { headers: { 'Authorization': `Bearer ${token}` } })
            .then(res => res.ok ? res.json() : { isSuccess: false, data: { data: [] } })
            .then((result: any) => {
                if (result.isSuccess && result.data) {
                    const raw: any[] = Array.isArray(result.data.data) ? result.data.data : [];
                    setContracts(raw);
                    setContractsTotalPages(result.data.totalPages ?? 1);
                    setContractsPage(page);
                } else {
                    setContracts([]);
                    setContractsTotalPages(1);
                    setContractsPage(1);
                }
            })
            .catch(() => {
                setContracts([]);
                setContractsTotalPages(1);
                setContractsPage(1);
            })
            .finally(() => setContractsLoading(false));
    };

    useEffect(() => {
        fetchEmployees(1);
        fetchContracts(1, { search: '', isArchived: false });
        const token = localStorage.getItem('authToken');

        // Fetch profile to sync name/contact info to localStorage
        fetch('/api/auth/me', { headers: { 'Authorization': `Bearer ${token}` } })
            .then(res => res.ok ? res.json() : null)
            .then(result => {
                if (!result || !result.isSuccess || !result.data) return;
                const p = result.data;
                const firstName = p.firstName ?? '';
                const middleName = p.middleName ?? '';
                const lastName = p.lastName ?? '';
                const suffix = p.suffix ?? '';
                const fullName = buildDisplayName(firstName, middleName, lastName, suffix);

                localStorage.setItem('firstName', firstName);
                localStorage.setItem('middleName', middleName);
                localStorage.setItem('lastName', lastName);
                localStorage.setItem('suffix', suffix);
                localStorage.setItem('contactNumber', p.contactNumber ?? '');
                localStorage.setItem('email', p.email ?? '');
                localStorage.setItem('employeeName', fullName);

                setEmployeeName(fullName);
            })
            .catch((err) => console.error('Profile fetch error:', err));
    }, []);

    useEffect(() => {
        fetchBackendRoles();
    }, [activeTab]);

    // ── Logout ────────────────────────────────────────────────────────────────
    const handleLogout = () => setLogoutConfirm(true);

    const doLogout = async () => {
        setLogoutLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            if (token) {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                }).catch(() => { });
            }
            ['employeeId', 'refreshToken', 'authToken', 'employeeName', 'firstName', 'middleName', 'lastName', 'suffix', 'contactNumber', 'role'].forEach(k => localStorage.removeItem(k));
            navigate('/');
        } finally {
            setLogoutLoading(false);
            setLogoutConfirm(false);
        }
    };

    const handleEmployeeUpdated = (updated: RecentEmployee) => {
        if (updated.accountStatus === '__deleted__') {
            setEmployees(prev => prev.filter(e => e.employeeNumber !== updated.employeeNumber));
            setRecentEmployees(prev => prev.filter(e => e.employeeNumber !== updated.employeeNumber));
        } else {
            setEmployees(prev => prev.map(e => e.employeeNumber === updated.employeeNumber ? updated : e));
            setRecentEmployees(prev => prev.map(e => e.employeeNumber === updated.employeeNumber ? updated : e));
        }
    };

    const pageTitles: Record<NavTab, string> = {
        dashboard: 'Dashboard', employees: 'Manage Employee',
        delivery: 'Delivery Summary', finance: 'Financial Overview', settings: 'Settings',
        roles: 'Role Management', reports: 'Reports', activity_logs: 'Activity Logs', profile: 'My Profile',
        government_records: 'Government Records', tasks: 'Task Manager',
        'org-structure': 'Organizational Structure'
    };

    return (
        <div className="dashboard-container">
            {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
            <aside className={`sidebar${sidebarOpen ? ' sidebar--open' : ''}`}>
                <div className="sidebar-logo"><img src="/src/assets/SpeedexLogo.jpg" alt="Speedex Logo" className="logo-image" /></div>
                 <div className="sidebar-role-section"><div className="sidebar-role-badge super-admin"><div className="role-dot-inner" />MANAGER</div></div>
                <nav className="sidebar-nav">
                    {NAV_GROUPS.map(group => (
                        <div key={group.label} className="nav-section">
                            <div className="nav-section-title">{group.label}</div>
                            {group.items.map(({ tab, icon: Icon, label }) => (
                                <div key={tab} className={`nav-item${activeTab === tab ? ' nav-item-active' : ''}`} onClick={() => { setActiveTab(tab); setSelectedPanelEmployee(null); }}>
                                    <Icon size={18} /><span className="nav-item-label">{label}</span>
                                </div>
                            ))}
                        </div>
                    ))}
                </nav>
                <div className="sidebar-footer-profile">
                    <div className="profile-card">
                        <div className="profile-avatar">{getInitials(employeeName || 'Manager')}</div>
                        <div className="profile-info"><span className="profile-name">{employeeName || 'Manager'}</span><span className="profile-role">MANAGER</span></div>
                        <button className="profile-logout" onClick={handleLogout} title="Logout" aria-label="Logout"><LogOut size={18} /></button>
                    </div>
                </div>
            </aside>

            <main className="main-viewport">
                {!(activeTab === 'employees' && selectedPanelEmployee) && (
                    <DashboardHeader
                        title={pageTitles[activeTab]}
                        userInitials={getInitials(employeeName)}
                        onSettingsClick={() => setActiveTab('settings')}
                        onLogout={handleLogout}
                        onMenuToggle={() => setSidebarOpen(v => !v)}
                    />
                )}

                {activeTab === 'dashboard' && (
                    <DashboardTab
                        employees={employees}
                        recentEmployees={recentEmployees}
                        activityLogs={activityLogs}
                        loading={empLoading}
                        onSelectEmployee={emp => { setEmpModalEditMode(false); setSelectedEmployee(emp); }}
                        onViewAll={() => { setActiveTab('employees'); setSelectedPanelEmployee(null); }}
                        onAddEmployee={() => setShowAddModal(true)}
                        rolesCount={rolesList.length}
                        activityLogPage={activityLogPage}
                        activityLogTotalPages={activityLogTotalPages}
                        onActivityLogPageChange={fetchActivityLogs}
                    />
                )}

                {activeTab === 'employees' && (
                    selectedPanelEmployee ? (
                        <EmployeeDetailPanel
                            employee={selectedPanelEmployee}
                            initialSection={detailPanelInitialSection}
                            onBack={() => setSelectedPanelEmployee(null)}
                            onEmployeeUpdated={updated => {
                                handleEmployeeUpdated(updated);
                                if (updated.accountStatus === '__deleted__') setSelectedPanelEmployee(null);
                                else setSelectedPanelEmployee(updated);
                            }}
                            rolesList={rolesList}
                        />
                    ) : (
                        <ManageEmployeesTab
                            employees={employees} loading={empLoading}
                            onSelectEmployee={emp => { setSelectedPanelEmployee(emp); setDetailPanelInitialSection('overview'); }}
                            onAddEmployee={() => setShowAddModal(true)}
                            empPage={empPage} empTotalPages={empTotalPages} onEmpPageChange={fetchEmployees}
                            onEditEmployee={emp => { setEmpModalEditMode(true); setSelectedEmployee(emp); }}
                            onArchiveEmployee={emp => setarchiveConfirmEmp(emp)}
                            onViewEmployee={emp => { setSelectedPanelEmployee(emp); setDetailPanelInitialSection('overview'); }}
                            onOpenDigital201={emp => { setSelectedPanelEmployee(emp); setDetailPanelInitialSection('digital_201'); }}
                            contracts={contracts}
                            contractsLoading={contractsLoading}
                            contractsPage={contractsPage}
                            contractsTotalPages={contractsTotalPages}
                            onContractsPageChange={fetchContracts}
                            rolesList={rolesList}
                        />
                    )
                )}

                {(activeTab === 'profile' || activeTab === 'settings') && <ProfileTab onProfileUpdate={setEmployeeName} />}

                {activeTab === 'roles' && <RoleManagementTab />}

                {activeTab === 'org-structure' && <OrgStructureTab />}

                {activeTab === 'tasks' && (
                    <div className="dashboard-content">
                        <TaskManager
                            tasks={tmTasks}
                            teamMembers={[]}
                            onNewTask={() => setShowNewTask(true)}
                            onEdit={id => {
                                const found = tmTasks.find(t => t.id === id);
                                if (found) {
                                    setTmEditingTask(mapManagerTaskToView(found));
                                }
                            }}
                            onView={handleManagerTaskView}
                            onArchive={ids => handleManagerTaskArchive(ids)}
                            onRestore={ids => handleManagerTaskRestore(ids)}
                            onDelete={ids => handleManagerTaskDelete(ids)}
                            onMarkDone={ids => handleManagerTaskMarkDone(ids)}
                        />
                    </div>
                )}
                {activeTab === 'reports' && <ReportsTab teamMembers={[]} />}

                {activeTab === 'delivery' && <div className="dashboard-content"><div className="card"><EmptyState icon={<Truck size={32} />} message="Delivery module coming soon." /></div></div>}
                {activeTab === 'finance' && <div className="dashboard-content"><div className="card"><EmptyState icon={<BarChart3 size={32} />} message="Finance module coming soon." /></div></div>}

                {activeTab === 'government_records' && <GovernmentRecordsTab />}

                {activeTab === 'activity_logs' && (
                    <div className="dashboard-content" style={{ padding: 0 }}>
                        <DataTable
                            title="System Activity Logs"
                            headers={['Date & Time', 'Activity Type', 'Employee', 'Description']}
                            searchQuery={activityLogSearch}
                            onSearchChange={val => setActivityLogSearch(val)}
                            searchPlaceholder="Search description, employee…"
                            filterElements={
                                <>
                                    <select value={activityLogEmployee} onChange={e => setActivityLogEmployee(e.target.value)}
                                        style={{ height: 36, borderRadius: 8, border: '1.5px solid var(--border)', padding: '0 10px', fontSize: 13, minWidth: 150, boxSizing: 'border-box', outline: 'none', cursor: 'pointer', background: '#fff' }}>
                                        <option value="">All Employees</option>
                                        {recentEmployees.slice(0, 100).map(emp => (
                                            <option key={emp.employeeNumber} value={emp.employeeNumber}>{getEmployeeDisplayName(emp)}</option>
                                        ))}
                                    </select>
                                    <select value={activityLogType} onChange={e => setActivityLogType(e.target.value)}
                                        style={{ height: 36, borderRadius: 8, border: '1.5px solid var(--border)', padding: '0 10px', fontSize: 13, minWidth: 130, boxSizing: 'border-box', outline: 'none', cursor: 'pointer', background: '#fff' }}>
                                        <option value="">All Types</option>
                                        <option value="Login">Login</option>
                                        <option value="Logout">Logout</option>
                                        <option value="Profile Update">Profile Update</option>
                                        <option value="Task Created">Task Created</option>
                                        <option value="Task Updated">Task Updated</option>
                                        <option value="Task Status Updated">Task Status Updated</option>
                                        <option value="Account Created">Account Created</option>
                                        <option value="Approval Request Submitted">Approval Request Submitted</option>
                                        <option value="Approval Tier Approved">Approval Tier Approved</option>
                                        <option value="Approval Tier Rejected">Approval Tier Rejected</option>
                                    </select>
                                    <input type="date" value={activityLogDateFrom} onChange={e => setActivityLogDateFrom(e.target.value)}
                                        style={{ height: 36, borderRadius: 8, border: '1.5px solid var(--border)', padding: '0 10px', fontSize: 13, minWidth: 130, boxSizing: 'border-box', outline: 'none' }} />
                                    <input type="date" value={activityLogDateTo} onChange={e => setActivityLogDateTo(e.target.value)}
                                        style={{ height: 36, borderRadius: 8, border: '1.5px solid var(--border)', padding: '0 10px', fontSize: 13, minWidth: 130, boxSizing: 'border-box', outline: 'none' }} />
                                    {(activityLogSearch || activityLogEmployee || activityLogType || activityLogDateFrom || activityLogDateTo) && (
                                        <button className="btn btn-sm" onClick={() => { setActivityLogSearch(''); setActivityLogEmployee(''); setActivityLogType(''); setActivityLogDateFrom(''); setActivityLogDateTo(''); }}
                                            style={{ height: 36, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <X size={13} /> Clear
                                        </button>
                                    )}
                                </>
                            }
                            loading={activityLogLoading}
                            emptyMessage="No activity logs found in the system."
                            emptyIcon={<Activity size={24} />}
                            totalRecords={activityLogs.length}
                            currentPage={activityLogPage}
                            totalPages={activityLogTotalPages}
                            onPageChange={p => fetchActivityLogs(p)}
                        >
                            {activityLogs.map(log => {
                                const empName = [log.firstName, log.middleName, log.lastName, log.suffix].filter(Boolean).join(' ');
                                return (
                                    <tr key={log.activityLogId}>
                                        <td style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                                            {new Date(log.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td>
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 600,
                                                background: log.activityType === 'Login' ? 'var(--status-active-bg)' :
                                                    log.activityType === 'Logout' ? 'var(--status-pending-bg)' :
                                                        'var(--status-new-bg)',
                                                color: log.activityType === 'Login' ? 'var(--status-active)' :
                                                    log.activityType === 'Logout' ? 'var(--status-pending)' :
                                                        'var(--status-new)',
                                            }}>
                                                {log.activityType}
                                            </span>
                                        </td>
                                        <td style={{ fontSize: 13 }}>{empName || 'System'}</td>
                                        <td style={{ fontSize: 13, color: 'var(--text-primary)' }}>{log.description}</td>
                                    </tr>
                                );
                            })}
                        </DataTable>
                    </div>
                )}
            </main>

            {showAddModal && (
                <AddEmployeeModal onClose={() => setShowAddModal(false)} onSuccess={newEmp => {
                    setEmployees(prev => [newEmp, ...prev]);
                    setRecentEmployees(prev => [newEmp, ...prev]);
                    fetchActivityLogs(1);
                }} />
            )}

            {selectedEmployee && (
                <EmployeeDetailModal
                    employee={selectedEmployee}
                    onClose={() => setSelectedEmployee(null)}
                    onUpdated={handleEmployeeUpdated}
                    initialEditMode={empModalEditMode}
                    rolesList={rolesList}
                />
            )}

            {/* ── Archive employee Confirmation Modal ── */}
            <ConfirmationModal
                isOpen={!!archiveConfirmEmp}
                variant="danger"
                title="Archive employee account?"
                description={
                    archiveConfirmEmp ? (
                        <>
                            This will permanently remove <strong>{getEmployeeDisplayName(archiveConfirmEmp)}</strong> and all associated
                            data. This action cannot be undone.
                        </>
                    ) : null
                }
                notice="All leave records, tasks, and activity logs for this employee will also be archived."
                confirmLabel="Archive employee"
                cancelLabel="Cancel"
                isLoading={archiveSubmitting}
                onConfirm={async () => {
                    if (!archiveConfirmEmp) return;
                    setarchiveSubmitting(true);
                    try {
                        const token = localStorage.getItem('authToken');
                        const lookupRes = await fetch(`/api/user/employee-number/${encodeURIComponent(archiveConfirmEmp.employeeNumber)}`, {
                            headers: { 'Authorization': `Bearer ${token}` },
                        });
                        if (!lookupRes.ok) throw new Error('Employee not found.');
                        const lookupData = await lookupRes.json();
                        const userId = lookupData?.data?.id ?? lookupData?.id;
                        if (!userId) throw new Error('Employee not found.');
                        const res = await fetch(`/api/user/${userId}/deactivate`, {
                            method: 'PATCH',
                            headers: { 'Authorization': `Bearer ${token}` },
                        });
                        if (!res.ok) {
                            const err = await res.json().catch(() => ({}));
                            throw new Error(err.message || 'Failed to Archive employee. Please try again.');
                        }
                        success(`${getEmployeeDisplayName(archiveConfirmEmp)} has been archived.`);
                        setEmployees(prev => prev.filter(e => e.employeeNumber !== archiveConfirmEmp.employeeNumber));
                        setRecentEmployees(prev => prev.filter(e => e.employeeNumber !== archiveConfirmEmp.employeeNumber));
                    } catch (err: any) {
                        error(err.message ?? 'Failed to Archive employee.');
                    } finally {
                        setarchiveSubmitting(false);
                        setarchiveConfirmEmp(null);
                    }
                }}
                onCancel={() => setarchiveConfirmEmp(null)}
            />

            {/* ── Logout Confirmation Modal ── */}
            <ConfirmationModal
                isOpen={logoutConfirm}
                variant="neutral"
                title="Log out of STARS?"
                description="You will be signed out of your current session. Any unsaved changes will be lost."
                confirmLabel="Log out"
                cancelLabel="Stay"
                isLoading={logoutLoading}
                onConfirm={doLogout}
                onCancel={() => setLogoutConfirm(false)}
            />

            {/* ── Task Detail Modal ── */}
            {tmDetailTask && (
                <TaskView
                    task={tmDetailTask}
                    onEdit={() => { setTmEditingTask(tmDetailTask); setTmDetailTask(null); }}
                    onReopen={async () => {
                        error('Reopen is not supported by the backend FSM. Use Cancel to reset the task lifecycle.');
                    }}
                    onClose={() => setTmDetailTask(null)}
                    onApprove={async (id) => {
                        const token = localStorage.getItem('authToken');
                        try {
                            await fetch(`/api/task/${id}/review`, {
                                method: 'PATCH',
                                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                                body: JSON.stringify({ isApproved: true, remarks: null }),
                            });
                            success('Task approved.');
                            setTmDetailTask(null);
                            fetchManagerTasks();
                        } catch {
                            error('Failed to approve task.');
                        }
                    }}
                    onReject={async (id, reason) => {
                        const token = localStorage.getItem('authToken');
                        try {
                            await fetch(`/api/task/${id}/review`, {
                                method: 'PATCH',
                                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                                body: JSON.stringify({ isApproved: false, remarks: reason }),
                            });
                            success('Task returned for rework.');
                            setTmDetailTask(null);
                            fetchManagerTasks();
                        } catch {
                            error('Failed to reject task.');
                        }
                    }}
                />
            )}

            {/* ── New Task Modal ── */}
            {showNewTask && (
                <FormModal
                    isOpen={true}
                    onClose={() => setShowNewTask(false)}
                    title="Create New Task"
                    subtitle="Fill in the details to create a new task."
                    apiError={newTaskApiError}
                    onSubmit={handleManagerCreateTask}
                    isSubmitting={newTaskSubmitting}
                    size="md"
                    submitLabel="Create Task"
                >
                    <div className="fm-section">
                        <h5 className="fm-section-title">Task Information</h5>
                        <div className="fm-field">
                            <label className="fm-label">Task Title <span style={{ color: 'var(--status-failed, #ee5d50)' }}>*</span></label>
                            <input
                                className="fm-input"
                                value={newTaskForm.title}
                                onChange={e => setNewTaskForm(p => ({ ...p, title: e.target.value }))}
                                maxLength={150}
                                placeholder="Enter task title"
                            />
                            {newTaskErrors.title && (
                                <span style={{ fontSize: 11, color: 'var(--status-failed, #ee5d50)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                                    <AlertCircle size={11} />{newTaskErrors.title}
                                </span>
                            )}
                        </div>
                        <div className="fm-field">
                            <label className="fm-label">Description <span style={{ color: 'var(--status-failed, #ee5d50)' }}>*</span></label>
                            <textarea
                                className="fm-input"
                                rows={4}
                                value={newTaskForm.description}
                                onChange={e => setNewTaskForm(p => ({ ...p, description: e.target.value }))}
                                maxLength={2000}
                                placeholder="Describe the task…"
                            />
                            {newTaskErrors.description && (
                                <span style={{ fontSize: 11, color: 'var(--status-failed, #ee5d50)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                                    <AlertCircle size={11} />{newTaskErrors.description}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="fm-section">
                        <h5 className="fm-section-title">Classification</h5>
                        <div className="fm-field">
                            <label className="fm-label">Task Classification <span style={{ color: 'var(--status-failed, #ee5d50)' }}>*</span></label>
                            <select
                                className="fm-input"
                                value={newTaskForm.classification}
                                onChange={e => setNewTaskForm(p => ({ ...p, classification: e.target.value }))}
                            >
                                <option value="">Select classification</option>
                                <option value="routine">Routine Daily Task</option>
                                <option value="special">Special Task</option>
                            </select>
                            {newTaskErrors.classification && (
                                <span style={{ fontSize: 11, color: 'var(--status-failed, #ee5d50)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                                    <AlertCircle size={11} />{newTaskErrors.classification}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="fm-section">
                        <h5 className="fm-section-title">Schedule &amp; Priority</h5>
                        <div className="fm-field-grid">
                            <div className="fm-field">
                                <label className="fm-label">Priority <span style={{ color: 'var(--status-failed, #ee5d50)' }}>*</span></label>
                                <select
                                    className="fm-select"
                                    value={newTaskForm.priority}
                                    onChange={e => setNewTaskForm(p => ({ ...p, priority: e.target.value }))}
                                >
                                    <option value="">Select priority</option>
                                    <option value="Low">Low</option>
                                    <option value="Medium">Medium</option>
                                    <option value="High">High</option>
                                    <option value="Urgent">🔴 Urgent</option>
                                </select>
                                {newTaskErrors.priority && (
                                    <span style={{ fontSize: 11, color: 'var(--status-failed, #ee5d50)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                                        <AlertCircle size={11} />{newTaskErrors.priority}
                                    </span>
                                )}
                                {!newTaskErrors.priority && newTaskForm.priority === 'Urgent' && (
                                    <span style={{ fontSize: 11, color: '#7c1d1d', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <Lock size={11} /> Urgent — deadline auto-set to 24h from creation (SLA enforced)
                                    </span>
                                )}
                            </div>
                            <div className="fm-field">
                                <label className="fm-label">
                                    Deadline <span style={{ color: 'var(--status-failed, #ee5d50)' }}>*</span>
                                    {newTaskForm.priority === 'Urgent' && (
                                        <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: '#7c1d1d', background: '#fef2f2', padding: '1px 6px', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 3, verticalAlign: 'middle' }}>
                                            <Lock size={10} /> SLA LOCKED
                                        </span>
                                    )}
                                </label>
                                <input
                                    type="datetime-local"
                                    className="fm-input"
                                    value={newTaskForm.deadline}
                                    onChange={e => setNewTaskForm(p => ({ ...p, deadline: e.target.value }))}
                                    disabled={newTaskForm.priority === 'Urgent'}
                                    min={new Date().toISOString().slice(0, 16)}
                                    style={newTaskForm.priority === 'Urgent' ? { background: '#f1f5f9', cursor: 'not-allowed', opacity: 0.7 } : {}}
                                />
                                {newTaskErrors.deadline && (
                                    <span style={{ fontSize: 11, color: 'var(--status-failed, #ee5d50)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                                        <AlertCircle size={11} />{newTaskErrors.deadline}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="fm-section">
                        <h5 className="fm-section-title">Assignment Scope</h5>
                        <div className="fm-field">
                            <label className="fm-label">Scope <span style={{ color: 'var(--status-failed, #ee5d50)' }}>*</span></label>
                            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                                {['SingleEmployee', 'Team', 'Department'].map(scope => (
                                    <label key={scope} onClick={() => setNewTaskForm(p => ({ ...p, assignmentScope: scope, assignedDepartmentId: '' }))}
                                        style={{
                                            flex: 1, padding: '8px 10px', borderRadius: 8, cursor: 'pointer', textAlign: 'center',
                                            fontSize: 12, fontWeight: 600, border: `2px solid ${newTaskForm.assignmentScope === scope ? 'var(--primary)' : 'var(--border)'}`,
                                            background: newTaskForm.assignmentScope === scope ? 'rgba(67,24,255,0.06)' : '#fff',
                                            color: newTaskForm.assignmentScope === scope ? 'var(--primary)' : 'var(--text-secondary)',
                                        }}
                                    >
                                        <input type="radio" name="scope" value={scope}
                                            checked={newTaskForm.assignmentScope === scope}
                                            onChange={() => {}} style={{ display: 'none' }} />
                                        {scope === 'SingleEmployee' ? 'Single' : scope === 'Team' ? 'Team' : 'Department'}
                                    </label>
                                ))}
                            </div>
                            {newTaskErrors.assignmentScope && (
                                <span style={{ fontSize: 11, color: 'var(--status-failed, #ee5d50)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                                    <AlertCircle size={11} />{newTaskErrors.assignmentScope}
                                </span>
                            )}
                        </div>
                        {newTaskForm.assignmentScope === 'Department' && (
                            <div className="fm-field">
                                <label className="fm-label">Target Department <span style={{ color: 'var(--status-failed, #ee5d50)' }}>*</span></label>
                                <select className="fm-input"
                                    value={newTaskForm.assignedDepartmentId}
                                    onChange={e => setNewTaskForm(p => ({ ...p, assignedDepartmentId: e.target.value }))}
                                >
                                    <option value="">Select department</option>
                                    {departments.map(d => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                </select>
                                {newTaskErrors.assignedDepartmentId && (
                                    <span style={{ fontSize: 11, color: 'var(--status-failed, #ee5d50)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                                        <AlertCircle size={11} />{newTaskErrors.assignedDepartmentId}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="fm-section">
                        <h5 className="fm-section-title">Visibility</h5>
                        <label className={`conf-card${newTaskForm.isConfidential ? ' active' : ''}`}>
                            <input type="checkbox" checked={newTaskForm.isConfidential}
                                onChange={e => setNewTaskForm(p => ({ ...p, isConfidential: e.target.checked }))} />
                            <div className="conf-card-body">
                                <div className="conf-label-row">
                                    <span className="conf-icon">
                                        <Lock size={14} color={newTaskForm.isConfidential ? '#ee5d50' : 'var(--text-secondary)'} />
                                    </span>
                                    <span className="conf-title">Confidential Task</span>
                                    {newTaskForm.isConfidential && <span className="conf-badge">Restricted</span>}
                                </div>
                                <span className="conf-desc">
                                    {newTaskForm.isConfidential ? (
                                        <>Only <strong>Coordinators</strong> &amp; <strong>Manager</strong> can view this task</>
                                    ) : (
                                        'Restrict visibility to Coordinators and Manager only'
                                    )}
                                </span>
                            </div>
                        </label>
                    </div>
                </FormModal>
            )}

            {/* ── Edit Task Modal ── */}
            {tmEditingTask && (
                <FormModal
                    isOpen={true}
                    onClose={() => setTmEditingTask(null)}
                    title="Edit Task"
                    subtitle="Update the task details below."
                    apiError={editApiError}
                    onSubmit={handleManagerEditSave}
                    isSubmitting={editSubmitting}
                    size="md"
                    submitLabel="Save Changes"
                >
                    <div className="fm-section">
                        <h5 className="fm-section-title">Task Information</h5>
                        <div className="fm-field">
                            <label className="fm-label">Task Title <span style={{ color: 'var(--status-failed, #ee5d50)' }}>*</span></label>
                            <input
                                className="fm-input"
                                value={editForm.title}
                                onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))}
                                maxLength={150}
                                placeholder="Enter task title"
                            />
                            {editErrors.title && (
                                <span style={{ fontSize: 11, color: 'var(--status-failed, #ee5d50)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                                    <AlertCircle size={11} />{editErrors.title}
                                </span>
                            )}
                        </div>
                        <div className="fm-field">
                            <label className="fm-label">Description <span style={{ color: 'var(--status-failed, #ee5d50)' }}>*</span></label>
                            <textarea
                                className="fm-input"
                                rows={4}
                                value={editForm.description}
                                onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))}
                                maxLength={2000}
                                placeholder="Describe the task…"
                            />
                            {editErrors.description && (
                                <span style={{ fontSize: 11, color: 'var(--status-failed, #ee5d50)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                                    <AlertCircle size={11} />{editErrors.description}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="fm-section">
                        <h5 className="fm-section-title">Classification</h5>
                        <div className="fm-field">
                            <label className="fm-label">Task Classification <span style={{ color: 'var(--status-failed, #ee5d50)' }}>*</span></label>
                            <select
                                className="fm-input"
                                value={editForm.classification}
                                onChange={e => setEditForm(p => ({ ...p, classification: e.target.value }))}
                            >
                                <option value="">Select classification</option>
                                <option value="routine">Routine Daily Task</option>
                                <option value="special">Special Task</option>
                            </select>
                            {editErrors.classification && (
                                <span style={{ fontSize: 11, color: 'var(--status-failed, #ee5d50)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                                    <AlertCircle size={11} />{editErrors.classification}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="fm-section">
                        <h5 className="fm-section-title">Schedule &amp; Priority</h5>
                        <div className="fm-field-grid">
                            <div className="fm-field">
                                <label className="fm-label">Priority <span style={{ color: 'var(--status-failed, #ee5d50)' }}>*</span></label>
                                <select
                                    className="fm-select"
                                    value={editForm.priority}
                                    onChange={e => setEditForm(p => ({ ...p, priority: e.target.value }))}
                                >
                                    <option value="">Select priority</option>
                                    <option value="Low">Low</option>
                                    <option value="Medium">Medium</option>
                                    <option value="High">High</option>
                                    <option value="Urgent">🔴 Urgent</option>
                                </select>
                                {editErrors.priority && (
                                    <span style={{ fontSize: 11, color: 'var(--status-failed, #ee5d50)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                                        <AlertCircle size={11} />{editErrors.priority}
                                    </span>
                                )}
                                {!editErrors.priority && editForm.priority === 'Urgent' && (
                                    <span style={{ fontSize: 11, color: '#7c1d1d', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <Lock size={11} /> Urgent — deadline auto-set to 24h (SLA enforced)
                                    </span>
                                )}
                            </div>
                            <div className="fm-field">
                                <label className="fm-label">
                                    Deadline <span style={{ color: 'var(--status-failed, #ee5d50)' }}>*</span>
                                    {(editForm.priority === 'Urgent' || tmEditingTask?.isSLALocked) && (
                                        <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: '#7c1d1d', background: '#fef2f2', padding: '1px 6px', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 3, verticalAlign: 'middle' }}>
                                            <Lock size={10} /> SLA LOCKED
                                        </span>
                                    )}
                                </label>
                                <input
                                    type="datetime-local"
                                    className="fm-input"
                                    value={editForm.deadline}
                                    onChange={e => setEditForm(p => ({ ...p, deadline: e.target.value }))}
                                    disabled={editForm.priority === 'Urgent' || (tmEditingTask?.isSLALocked ?? false)}
                                    min={new Date().toISOString().slice(0, 16)}
                                    style={(editForm.priority === 'Urgent' || tmEditingTask?.isSLALocked) ? { background: '#f1f5f9', cursor: 'not-allowed', opacity: 0.7 } : {}}
                                />
                                {editErrors.deadline && (
                                    <span style={{ fontSize: 11, color: 'var(--status-failed, #ee5d50)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                                        <AlertCircle size={11} />{editErrors.deadline}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="fm-section">
                        <h5 className="fm-section-title">Assignment Scope</h5>
                        <div className="fm-field">
                            <label className="fm-label">Scope <span style={{ color: 'var(--status-failed, #ee5d50)' }}>*</span></label>
                            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                                {['SingleEmployee', 'Team', 'Department'].map(scope => (
                                    <label key={scope} onClick={() => setEditForm(p => ({ ...p, assignmentScope: scope, assignedDepartmentId: '' }))}
                                        style={{
                                            flex: 1, padding: '8px 10px', borderRadius: 8, cursor: 'pointer', textAlign: 'center',
                                            fontSize: 12, fontWeight: 600, border: `2px solid ${editForm.assignmentScope === scope ? 'var(--primary)' : 'var(--border)'}`,
                                            background: editForm.assignmentScope === scope ? 'rgba(67,24,255,0.06)' : '#fff',
                                            color: editForm.assignmentScope === scope ? 'var(--primary)' : 'var(--text-secondary)',
                                        }}
                                    >
                                        <input type="radio" name="editScope" value={scope}
                                            checked={editForm.assignmentScope === scope}
                                            onChange={() => {}} style={{ display: 'none' }} />
                                        {scope === 'SingleEmployee' ? 'Single' : scope === 'Team' ? 'Team' : 'Department'}
                                    </label>
                                ))}
                            </div>
                        </div>
                        {editForm.assignmentScope === 'Department' && (
                            <div className="fm-field">
                                <label className="fm-label">Target Department <span style={{ color: 'var(--status-failed, #ee5d50)' }}>*</span></label>
                                <select className="fm-input"
                                    value={editForm.assignedDepartmentId}
                                    onChange={e => setEditForm(p => ({ ...p, assignedDepartmentId: e.target.value }))}
                                >
                                    <option value="">Select department</option>
                                    {departments.map(d => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                    <div className="fm-section">
                        <h5 className="fm-section-title">Visibility</h5>
                        <label className={`conf-card${editForm.isConfidential ? ' active' : ''}`}>
                            <input type="checkbox" checked={editForm.isConfidential}
                                onChange={e => setEditForm(p => ({ ...p, isConfidential: e.target.checked }))} />
                            <div className="conf-card-body">
                                <div className="conf-label-row">
                                    <span className="conf-icon">
                                        <Lock size={14} color={editForm.isConfidential ? '#ee5d50' : 'var(--text-secondary)'} />
                                    </span>
                                    <span className="conf-title">Confidential Task</span>
                                    {editForm.isConfidential && <span className="conf-badge">Restricted</span>}
                                </div>
                                <span className="conf-desc">
                                    {editForm.isConfidential ? (
                                        <>Only <strong>Coordinators</strong> &amp; <strong>Manager</strong> can view this task</>
                                    ) : (
                                        'Restrict visibility to Coordinators and Manager only'
                                    )}
                                </span>
                            </div>
                        </label>
                    </div>
                </FormModal>
            )}
        </div>
    );
}