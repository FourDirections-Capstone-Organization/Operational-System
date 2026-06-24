import React, { useEffect, useState } from 'react';
import {
    Shield,
    Plus,
    Pencil,
    Trash2,
    Loader2,
    AlertCircle,
    Info,
    Settings,
    Key,
    Building2,
    Briefcase,
    ToggleLeft,
    ToggleRight,
    Users,
    CheckCircle2,
    XCircle,
    BarChart2,
    Clock,
    RefreshCw,
    TrendingUp,
    Activity,
    Lock,
    Calendar,
} from 'lucide-react';
import { useToast } from '../../../components/Toast/Toast';
import StatCard from '../../../components/StatCard/StatCard';
import DataTable, { ActionsDropdown } from '../../../components/ui/DataTable';
import SubTabNav from '../../../components/ui/SubTabNav';
import FormModal from '../../../components/FormModal/FormModal';
import ConfirmationModal from '../../../components/ConfirmationModal/ConfirmationModal';
import StatusBadge from '../../../components/ui/StatusBadge';
import './RoleManagementTab.css';

// ─── Types ────────────────────────────────────────────────────────────────────

type SubTab = 'roles' | 'departments' | 'positions' | 'overview';

// ── Audit / Activity ──
export interface OrgAuditEntry {
    id: string;
    action: string;
    entityType: 'Department' | 'JobPosition' | 'Role';
    entityName: string;
    performedBy: string;
    performedAt: string;
    details?: string;
}

// ── Roles ──
export interface RoleResponseDTO {
    roleId: string;
    name: string;
    description?: string;
    isSystemDefined: boolean;
    permissions: string[];
}
export interface PermissionResponseDTO {
    permissionId: string;
    name: string;
    description?: string;
}
export interface CreateRoleDTO { name: string; description?: string; permissions: string[]; }
export interface UpdateRoleDTO { description?: string; permissions: string[]; }

// ── Departments ──
export interface DepartmentResponseDTO {
    departmentId: string;
    name: string;
    description?: string;
    code?: string;
    isActive?: boolean;
    status?: 'Active' | 'Inactive';
    employeeCount?: number;
    headEmployeeId?: string;
    headEmployeeName?: string;
    effectiveDate?: string;
    createdAt?: string;
}
export interface CreateDepartmentDTO {
    name: string;
    description?: string;
    code: string;
    status: 'Active' | 'Inactive';
    headEmployeeId?: string;
    effectiveDate: string;
}

// ── Employees (for dropdowns) ──
export interface EmployeeSummaryDTO {
    employeeId: string;
    fullName: string;
    jobPositionName?: string;
}

// ── Job Positions ──
export type EmploymentType = 'Regular' | 'Probationary' | 'Contractual' | 'Project-Based';
export type PositionLevel = 'Entry Level' | 'Staff' | 'Supervisor' | 'Manager' | 'Executive';

export interface JobPositionResponseDTO {
    jobPositionId: string;
    name: string;
    description?: string;
    departmentId: string;
    departmentName: string;
    code?: string;
    isActive?: boolean;
    status?: 'Active' | 'Inactive';
    employeeCount?: number;
    reportsToId?: string;
    reportsToName?: string;
    employmentType?: EmploymentType;
    positionLevel?: PositionLevel;
    effectiveDate?: string;
    createdAt?: string;
}
export interface CreateJobPositionDTO {
    name: string;
    description?: string;
    departmentId: string;
    code: string;
    status: 'Active' | 'Inactive';
    reportsToId?: string;
    employmentType: EmploymentType;
    positionLevel: PositionLevel;
    effectiveDate: string;
}

// ── Shared ──
interface ConfirmState {
    isOpen: boolean;
    variant: 'danger' | 'warning' | 'info' | 'success' | 'neutral';
    icon?: string;
    title: string;
    description: React.ReactNode;
    notice?: string;
    confirmLabel?: string;
    onConfirm: () => void;
}
const CONFIRM_CLOSED: ConfirmState = { isOpen: false, variant: 'neutral', title: '', description: '', onConfirm: () => { } };

// ─── Permission Helpers ───────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
    SystemAdmin: 'System Administration', Users: 'User Management',
    Roles: 'Role Management', Departments: 'Department Management',
    JobPositions: 'Job Position Management', Tasks: 'Task Management',
    Approvals: 'Approval Management', Recruitment: 'Recruitment Management',
    Dashboard: 'Dashboard', Reporting: 'Reporting',
};
function formatCategory(cat: string) { return CATEGORY_LABELS[cat] || cat.replace(/([A-Z])/g, ' $1').trim(); }
function groupPermissions(perms: PermissionResponseDTO[]): Record<string, PermissionResponseDTO[]> {
    const g: Record<string, PermissionResponseDTO[]> = {};
    perms.forEach(p => { const cat = p.name.split('.').length > 2 ? p.name.split('.')[1] : 'General'; if (!g[cat]) g[cat] = []; g[cat].push(p); });
    return g;
}
function getFriendlyName(name: string) { const p = name.split('.'); return p.length > 2 ? p.slice(2).join(' ').replace(/([A-Z])/g, ' $1').trim() : name; }
function togglePerm(set: Set<string>, name: string) { const n = new Set(set); n.has(name) ? n.delete(name) : n.add(name); return n; }
function toggleCat(set: Set<string>, perms: PermissionResponseDTO[], add: boolean) { const n = new Set(set); perms.forEach(p => (add ? n.add(p.name) : n.delete(p.name))); return n; }

// ─── SVG Donut Chart ─────────────────────────────────────────────────────────

const DONUT_COLORS = ['#00A99D', '#4318FF', '#FFB547', '#E31A1A', '#01B574', '#7551FF', '#3965FF', '#F59E0B'];

const DonutChart: React.FC<{ slices: { label: string; value: number }[]; total: number }> = ({ slices, total }) => {
    const r = 52; const circ = 2 * Math.PI * r;
    let offset = 0;
    const segments = slices.map((s, i) => {
        const pct = total > 0 ? s.value / total : 0;
        const dash = pct * circ;
        const seg = { color: DONUT_COLORS[i % DONUT_COLORS.length], dash, offset: -offset, pct };
        offset += dash;
        return seg;
    });
    return (
        <svg width="130" height="130" viewBox="0 0 130 130">
            <circle cx="65" cy="65" r={r} fill="none" stroke="#f1f5f9" strokeWidth="14" />
            {segments.map((seg, i) => seg.dash > 0 && (
                <circle key={i} cx="65" cy="65" r={r} fill="none"
                    stroke={seg.color} strokeWidth="14"
                    strokeDasharray={`${seg.dash} ${circ}`}
                    strokeDashoffset={seg.offset}
                    transform="rotate(-90 65 65)" />
            ))}
            <text x="65" y="61" textAnchor="middle" fontSize="20" fontWeight="800" fill="#1B254B">{total}</text>
            <text x="65" y="77" textAnchor="middle" fontSize="9" fill="#A3AED0">Total</text>
        </svg>
    );
};

// ─── Audit Entry Row ──────────────────────────────────────────────────────────

const AUDIT_ICON_MAP: Record<string, { icon: React.ReactNode; bg: string; color: string }> = {
    Created: { icon: <Plus size={11} />, bg: '#dcfce7', color: '#16a34a' },
    Updated: { icon: <Pencil size={11} />, bg: '#dbeafe', color: '#2563eb' },
    Deleted: { icon: <Trash2 size={11} />, bg: '#fee2e2', color: '#dc2626' },
    Activated: { icon: <CheckCircle2 size={11} />, bg: '#d1fae5', color: '#059669' },
    Deactivated: { icon: <XCircle size={11} />, bg: '#fef3c7', color: '#d97706' },
    Default: { icon: <Activity size={11} />, bg: '#ede9fe', color: '#7c3aed' },
};

function getAuditStyle(action: string) {
    const key = Object.keys(AUDIT_ICON_MAP).find(k => action.includes(k)) ?? 'Default';
    return AUDIT_ICON_MAP[key];
}

function formatRelativeTime(isoString: string): string {
    try {
        const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
        if (diff < 60) return `${diff}s ago`;
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return new Date(isoString).toLocaleDateString();
    } catch { return isoString; }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const RoleTypeBadge = ({ isSystem }: { isSystem: boolean }) => (
    <StatusBadge status={isSystem ? 'System' : 'Custom'} />
);

const ActiveStatusBadge = ({ isActive = true }: { isActive?: boolean }) => (
    <StatusBadge
        status={isActive ? 'Active' : 'Inactive'}
        icon={isActive ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
    />
);

interface PermSelectorProps {
    grouped: Record<string, PermissionResponseDTO[]>;
    selected: Set<string>;
    setSelected: (s: Set<string>) => void;
    disabled?: boolean;
}
const PermissionSelector: React.FC<PermSelectorProps> = ({ grouped, selected, setSelected, disabled }) => {
    const [searchQuery, setSearchQuery] = useState('');

    const filtered = Object.entries(grouped).reduce((acc, [cat, perms]) => {
        const filteredPerms = searchQuery
            ? perms.filter(p =>
                p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
                getFriendlyName(p.name).toLowerCase().includes(searchQuery.toLowerCase())
            )
            : perms;
        if (filteredPerms.length > 0) acc[cat] = filteredPerms;
        return acc;
    }, {} as Record<string, PermissionResponseDTO[]>);

    return (
        <div className="rm2-perm-selector">
            <div className="rm2-perm-selector__header">
                <span className="rm2-form-label">Assign Permissions</span>
                <span className="rm2-perm-count">{selected.size} selected</span>
            </div>
            <div style={{ padding: '0 16px 8px' }}>
                <input type="text" className="report-input" placeholder="Search permissions..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{ width: '100%', fontSize: 13 }} />
            </div>
            <div className="rm2-perm-groups">
                {Object.entries(filtered).map(([cat, perms]) => {
                    const allSel = perms.every(p => selected.has(p.name));
                    const someSel = perms.some(p => selected.has(p.name)) && !allSel;
                    return (
                        <div key={cat} className="rm2-perm-group">
                            <label className="rm2-perm-category">
                                <input type="checkbox" checked={allSel} disabled={disabled}
                                    ref={el => { if (el) el.indeterminate = someSel; }}
                                    onChange={e => setSelected(toggleCat(selected, perms, e.target.checked))} />
                                <span>{formatCategory(cat)} <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>({perms.length})</span></span>
                            </label>
                            <div className="rm2-perm-items">
                                {perms.map(perm => (
                                    <label key={perm.permissionId} className="rm2-perm-item" title={perm.description}>
                                        <input type="checkbox" checked={selected.has(perm.name)} disabled={disabled}
                                            onChange={() => setSelected(togglePerm(selected, perm.name))} />
                                        <div className="rm2-perm-item__info">
                                            <span className="rm2-perm-item__name">{getFriendlyName(perm.name)}</span>
                                            {perm.description && <span className="rm2-perm-item__desc">{perm.description}</span>}
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>
                    );
                })}
                {Object.keys(filtered).length === 0 && <p className="rm2-perm-empty">No permissions match your search.</p>}
            </div>
        </div>
    );
};

// ─── Constants ────────────────────────────────────────────────────────────────

const EMPLOYMENT_TYPES: EmploymentType[] = ['Regular', 'Probationary', 'Contractual', 'Project-Based'];
const POSITION_LEVELS: PositionLevel[] = ['Entry Level', 'Staff', 'Supervisor', 'Manager', 'Executive'];

// ─── Main Component ────────────────────────────────────────────────────────────

const PER_PAGE = 10;

// ─── Default form states ──────────────────────────────────────────────────────

const DEFAULT_DEPT_FORM = {
    name: '',
    description: '',
    code: '',
    status: 'Active' as 'Active' | 'Inactive',
    headEmployeeId: '',
    effectiveDate: '',
};

const DEFAULT_POS_FORM = {
    name: '',
    description: '',
    code: '',
    departmentId: '',
    status: 'Active' as 'Active' | 'Inactive',
    reportsToId: '',
    employmentType: 'Regular' as EmploymentType,
    positionLevel: 'Staff' as PositionLevel,
    effectiveDate: '',
};

export default function RoleManagementTab() {
    const { success: toastSuccess, error: toastError } = useToast();
    const [subTab, setSubTab] = useState<SubTab>('roles');

    // ── Loading states ──
    const [rolesLoading, setRolesLoading] = useState(true);
    const [deptsLoading, setDeptsLoading] = useState(false);
    const [posLoading, setPosLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [employeesLoading, setEmployeesLoading] = useState(false);

    // ── Data ──
    const [roles, setRoles] = useState<RoleResponseDTO[]>([]);
    const [permissions, setPermissions] = useState<PermissionResponseDTO[]>([]);
    const [departments, setDepartments] = useState<DepartmentResponseDTO[]>([]);
    const [positions, setPositions] = useState<JobPositionResponseDTO[]>([]);
    const [employees, setEmployees] = useState<EmployeeSummaryDTO[]>([]);

    // ── Search / page ──
    const [roleSearch, setRoleSearch] = useState(''); const [rolePage, setRolePage] = useState(1);
    const [deptSearch, setDeptSearch] = useState(''); const [deptPage, setDeptPage] = useState(1);
    const [posSearch, setPosSearch] = useState(''); const [posPage, setPosPage] = useState(1);

    // ── Modals ──
    const [confirmModal, setConfirmModal] = useState<ConfirmState>(CONFIRM_CLOSED);

    // Role form
    const [isCreateRoleOpen, setIsCreateRoleOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<RoleResponseDTO | null>(null);
    const [createRoleName, setCreateRoleName] = useState('');
    const [createRoleDesc, setCreateRoleDesc] = useState('');
    const [createRolePerms, setCreateRolePerms] = useState<Set<string>>(new Set());
    const [createRoleErrors, setCreateRoleErrors] = useState<Record<string, string>>({});
    const [createRoleDirty, setCreateRoleDirty] = useState(false);
    const [editRoleDirty, setEditRoleDirty] = useState(false);
    const [editRoleDesc, setEditRoleDesc] = useState('');
    const [editRolePerms, setEditRolePerms] = useState<Set<string>>(new Set());
    const [editRoleError, setEditRoleError] = useState('');

    // Dept form
    const [isCreateDeptOpen, setIsCreateDeptOpen] = useState(false);
    const [editingDept, setEditingDept] = useState<DepartmentResponseDTO | null>(null);
    const [deptForm, setDeptForm] = useState(DEFAULT_DEPT_FORM);
    const [deptFormErrors, setDeptFormErrors] = useState<Record<string, string>>({});
    const [deptDirty, setDeptDirty] = useState(false);

    // Position form
    const [isCreatePosOpen, setIsCreatePosOpen] = useState(false);
    const [editingPos, setEditingPos] = useState<JobPositionResponseDTO | null>(null);
    const [posForm, setPosForm] = useState(DEFAULT_POS_FORM);
    const [posFormErrors, setPosFormErrors] = useState<Record<string, string>>({});
    const [posDirty, setPosDirty] = useState(false);

    // Quick-create dept from within position modal
    const [showQuickDept, setShowQuickDept] = useState(false);
    const [quickDeptForm, setQuickDeptForm] = useState({ name: '', code: '', effectiveDate: '' });
    const [quickDeptLoading, setQuickDeptLoading] = useState(false);
    const [quickDeptErrors, setQuickDeptErrors] = useState<Record<string, string>>({});

    // Audit / Activity Log
    const [auditEntries, setAuditEntries] = useState<OrgAuditEntry[]>([]);
    const [auditLoading, setAuditLoading] = useState(false);

    const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('authToken')}`, 'Content-Type': 'application/json' });

    // ─────────────────────────── Fetch Functions ──────────────────────────────

    const fetchRoles = async () => {
        setRolesLoading(true);
        try {
            const [rRes, pRes] = await Promise.all([
                fetch('/api/roles', { headers: authHeaders() }),
                fetch('/api/roles/permissions', { headers: authHeaders() }),
            ]);
            if (!rRes.ok) throw new Error(`Failed to fetch roles`);
            if (!pRes.ok) throw new Error(`Failed to fetch permissions`);
            const rd = await rRes.json(); const pd = await pRes.json();
            const normalize = (d: any): RoleResponseDTO => ({
                roleId: d.roleId ?? d.RoleId, name: d.name ?? d.Name,
                description: d.description ?? d.Description,
                isSystemDefined: d.isSystemDefined ?? d.IsSystemDefined ?? false,
                permissions: d.permissions ?? d.Permissions ?? [],
            });
            setRoles((Array.isArray(rd) ? rd : rd.data ?? rd.$values ?? []).map(normalize));
            setPermissions((Array.isArray(pd) ? pd : pd.data ?? pd.$values ?? []).map((p: any) => ({
                permissionId: p.permissionId ?? p.PermissionId,
                name: p.name ?? p.Name, description: p.description ?? p.Description,
            })));
        } catch (e: any) { toastError(e.message || 'Failed to load roles'); } finally { setRolesLoading(false); }
    };

    const fetchDepartments = async () => {
        setDeptsLoading(true);
        try {
            const res = await fetch('/api/organization/departments', { headers: authHeaders() });
            if (!res.ok) throw new Error(`Failed to fetch departments`);
            const data = await res.json();
            const normalize = (d: any): DepartmentResponseDTO => ({
                departmentId: d.departmentId ?? d.DepartmentId,
                name: d.name ?? d.Name,
                description: d.description ?? d.Description,
                code: d.code ?? d.Code ?? '',
                isActive: d.isActive ?? d.IsActive ?? ((d.status ?? d.Status) === 'Active'),
                status: d.status ?? d.Status ?? (d.isActive ?? d.IsActive ? 'Active' : 'Inactive'),
                employeeCount: d.employeeCount ?? d.EmployeeCount ?? 0,
                headEmployeeId: d.headEmployeeId ?? d.HeadEmployeeId ?? '',
                headEmployeeName: d.headEmployeeName ?? d.HeadEmployeeName ?? '',
                effectiveDate: d.effectiveDate ?? d.EffectiveDate ?? '',
                createdAt: d.createdAt ?? d.CreatedAt,
            });
            setDepartments((Array.isArray(data) ? data : data.data ?? data.$values ?? []).map(normalize));
        } catch (e: any) { toastError(e.message || 'Failed to load departments'); } finally { setDeptsLoading(false); }
    };

    const fetchPositions = async () => {
        setPosLoading(true);
        try {
            const res = await fetch('/api/organization/job-positions', { headers: authHeaders() });
            if (!res.ok) throw new Error(`Failed to fetch positions`);
            const data = await res.json();
            const normalize = (p: any): JobPositionResponseDTO => ({
                jobPositionId: p.jobPositionId ?? p.JobPositionId,
                name: p.name ?? p.Name,
                description: p.description ?? p.Description,
                departmentId: p.departmentId ?? p.DepartmentId,
                departmentName: p.departmentName ?? p.DepartmentName ?? '',
                code: p.code ?? p.Code ?? '',
                isActive: p.isActive ?? p.IsActive ?? ((p.status ?? p.Status) === 'Active'),
                status: p.status ?? p.Status ?? (p.isActive ?? p.IsActive ? 'Active' : 'Inactive'),
                employeeCount: p.employeeCount ?? p.EmployeeCount ?? 0,
                reportsToId: p.reportsToId ?? p.ReportsToId ?? '',
                reportsToName: p.reportsToName ?? p.ReportsToName ?? '',
                employmentType: p.employmentType ?? p.EmploymentType ?? 'Regular',
                positionLevel: p.positionLevel ?? p.PositionLevel ?? 'Staff',
                effectiveDate: p.effectiveDate ?? p.EffectiveDate ?? '',
                createdAt: p.createdAt ?? p.CreatedAt,
            });
            setPositions((Array.isArray(data) ? data : data.data ?? data.$values ?? []).map(normalize));
        } catch (e: any) { toastError(e.message || 'Failed to load job positions'); } finally { setPosLoading(false); }
    };

    const fetchEmployees = async () => {
        if (employees.length > 0) return; // already loaded
        setEmployeesLoading(true);
        try {
            const res = await fetch('/api/employees?status=Active&pageSize=500', { headers: authHeaders() });
            if (!res.ok) { setEmployees([]); return; }
            const data = await res.json();
            const raw: any[] = Array.isArray(data) ? data : data.data ?? data.$values ?? data.items ?? [];
            setEmployees(raw.map((e: any): EmployeeSummaryDTO => ({
                employeeId: e.employeeId ?? e.EmployeeId ?? e.id,
                fullName: e.fullName ?? e.FullName ?? `${e.firstName ?? ''} ${e.lastName ?? ''}`.trim(),
                jobPositionName: e.jobPositionName ?? e.JobPositionName ?? e.position,
            })));
        } catch { setEmployees([]); } finally { setEmployeesLoading(false); }
    };

    const fetchAuditLog = async () => {
        setAuditLoading(true);
        try {
            const res = await fetch('/api/activity-logs?module=organization&limit=20', { headers: authHeaders() });
            if (!res.ok) { setAuditEntries([]); return; }
            const data = await res.json();
            const raw: any[] = Array.isArray(data) ? data : data.data ?? data.$values ?? data.items ?? [];
            setAuditEntries(raw.map((e: any): OrgAuditEntry => ({
                id: e.id ?? e.activityLogId ?? e.ActivityLogId ?? String(Math.random()),
                action: e.action ?? e.Action ?? e.description ?? e.Description ?? 'Activity',
                entityType: e.entityType ?? e.EntityType ?? 'Department',
                entityName: e.entityName ?? e.EntityName ?? e.targetName ?? '',
                performedBy: e.performedBy ?? e.PerformedBy ?? e.actorName ?? e.ActorName ?? 'System',
                performedAt: e.performedAt ?? e.PerformedAt ?? e.createdAt ?? e.CreatedAt ?? new Date().toISOString(),
                details: e.details ?? e.Details,
            })));
        } catch { setAuditEntries([]); } finally { setAuditLoading(false); }
    };

    useEffect(() => { fetchRoles(); }, []);
    useEffect(() => { if (subTab === 'departments') { if (departments.length === 0) fetchDepartments(); fetchEmployees(); } }, [subTab]);
    useEffect(() => {
        if (subTab === 'positions') {
            if (positions.length === 0) fetchPositions();
            if (departments.length === 0) fetchDepartments();
        }
    }, [subTab]);
    useEffect(() => {
        if (subTab === 'overview') {
            if (departments.length === 0) fetchDepartments();
            if (positions.length === 0) fetchPositions();
            fetchAuditLog();
        }
    }, [subTab]);

    // Fetch employees when dept/pos modals open
    useEffect(() => { if (isCreateDeptOpen || !!editingDept) fetchEmployees(); }, [isCreateDeptOpen, editingDept]);

    // ─── Derived Data ─────────────────────────────────────────────────────────

    const grouped = groupPermissions(permissions);

    const filteredRoles = roles.filter(r =>
        r.name.toLowerCase().includes(roleSearch.toLowerCase()) ||
        (r.description || '').toLowerCase().includes(roleSearch.toLowerCase()));
    const roleTotalPages = Math.max(1, Math.ceil(filteredRoles.length / PER_PAGE));
    const pagedRoles = filteredRoles.slice((rolePage - 1) * PER_PAGE, rolePage * PER_PAGE);

    const filteredDepts = departments.filter(d =>
        d.name.toLowerCase().includes(deptSearch.toLowerCase()) ||
        (d.code || '').toLowerCase().includes(deptSearch.toLowerCase()) ||
        (d.description || '').toLowerCase().includes(deptSearch.toLowerCase()));
    const deptTotalPages = Math.max(1, Math.ceil(filteredDepts.length / PER_PAGE));
    const pagedDepts = filteredDepts.slice((deptPage - 1) * PER_PAGE, deptPage * PER_PAGE);

    const filteredPos = positions.filter(p =>
        p.name.toLowerCase().includes(posSearch.toLowerCase()) ||
        (p.code || '').toLowerCase().includes(posSearch.toLowerCase()) ||
        p.departmentName.toLowerCase().includes(posSearch.toLowerCase()));
    const posTotalPages = Math.max(1, Math.ceil(filteredPos.length / PER_PAGE));
    const pagedPos = filteredPos.slice((posPage - 1) * PER_PAGE, posPage * PER_PAGE);

    // ─── Role Actions ─────────────────────────────────────────────────────────

    const openCreateRole = () => {
        setCreateRoleName(''); setCreateRoleDesc(''); setCreateRolePerms(new Set()); setCreateRoleErrors({});
        setIsCreateRoleOpen(true);
    };

    const openCreatePos = () => {
        setPosForm(DEFAULT_POS_FORM); setPosFormErrors({});
        setShowQuickDept(false); setQuickDeptForm({ name: '', code: '', effectiveDate: '' }); setQuickDeptErrors({});
        setIsCreatePosOpen(true);
    };

    const handleQuickCreateDept = async () => {
        const errors: Record<string, string> = {};
        if (!quickDeptForm.name.trim()) errors.name = 'Name is required.';
        if (!quickDeptForm.code.trim()) errors.code = 'Code is required.';
        else if (!/^[a-zA-Z0-9]+$/.test(quickDeptForm.code.trim())) errors.code = 'Alphanumeric only.';
        if (!quickDeptForm.effectiveDate) errors.effectiveDate = 'Effective date is required.';
        if (Object.keys(errors).length) { setQuickDeptErrors(errors); return; }
        setQuickDeptLoading(true);
        try {
            const res = await fetch('/api/organization/departments', {
                method: 'POST', headers: authHeaders(),
                body: JSON.stringify({
                    name: quickDeptForm.name.trim(),
                    code: quickDeptForm.code.trim().toUpperCase(),
                    status: 'Active',
                    effectiveDate: quickDeptForm.effectiveDate,
                }),
            });
            if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || 'Failed to create department.'); }
            const created = await res.json();
            toastSuccess(`Department "${created.name ?? quickDeptForm.name}" created!`);
            await fetchDepartments();
            const newId = created.departmentId ?? created.DepartmentId ?? '';
            if (newId) setPosForm(f => ({ ...f, departmentId: newId }));
            setShowQuickDept(false);
            setQuickDeptForm({ name: '', code: '', effectiveDate: '' }); setQuickDeptErrors({});
        } catch (e: any) { toastError(e.message); setQuickDeptErrors({ api: e.message }); } finally { setQuickDeptLoading(false); }
    };

    const handleCreateRole = async (e: React.FormEvent) => {
        e.preventDefault();
        const errors: Record<string, string> = {};
        if (!createRoleName.trim()) errors.name = 'Role name is required.';
        else if (!/^[a-zA-Z0-9_ -]{3,50}$/.test(createRoleName.trim()))
            errors.name = 'Role name must be 3–50 characters (letters, numbers, spaces, underscores, dashes).';
        if (Object.keys(errors).length) { setCreateRoleErrors(errors); return; }
        setActionLoading(true);
        try {
            const res = await fetch('/api/roles', {
                method: 'POST', headers: authHeaders(),
                body: JSON.stringify({ name: createRoleName.trim(), description: createRoleDesc.trim() || undefined, permissions: Array.from(createRolePerms) }),
            });
            if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || 'Failed to create role.'); }
            toastSuccess('Role created successfully!');
            setCreateRoleDirty(false); setIsCreateRoleOpen(false); fetchRoles();
        } catch (e: any) { toastError(e.message); setCreateRoleErrors({ api: e.message }); } finally { setActionLoading(false); }
    };

    const openEditRole = (role: RoleResponseDTO) => {
        setEditRoleDirty(false); setEditingRole(role); setEditRoleDesc(role.description || ''); setEditRolePerms(new Set(role.permissions)); setEditRoleError('');
    };

    const handleEditRole = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingRole) return;
        setActionLoading(true);
        try {
            const res = await fetch(`/api/roles/${editingRole.roleId}`, {
                method: 'PUT', headers: authHeaders(),
                body: JSON.stringify({ description: editRoleDesc.trim() || undefined, permissions: Array.from(editRolePerms) }),
            });
            if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || 'Failed to update role.'); }
            toastSuccess('Role updated successfully!');
            setEditRoleDirty(false); setEditingRole(null); fetchRoles();
        } catch (e: any) { toastError(e.message); setEditRoleError(e.message); } finally { setActionLoading(false); }
    };

    const confirmDeleteRole = (role: RoleResponseDTO) => {
        setConfirmModal({
            isOpen: true, variant: 'danger', icon: 'ti-trash',
            title: `Delete Role: ${role.name}?`,
            description: (<>Permanently delete role <strong>{role.name}</strong>? This cannot be undone.</>),
            notice: 'Accounts currently assigned to this role must be reassigned first.',
            confirmLabel: 'Delete Role',
            onConfirm: async () => {
                setActionLoading(true);
                try {
                    const res = await fetch(`/api/roles/${role.roleId}`, { method: 'DELETE', headers: authHeaders() });
                    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || 'Failed.'); }
                    toastSuccess('Role deleted.'); setConfirmModal(CONFIRM_CLOSED); fetchRoles();
                } catch (e: any) { toastError(e.message); setConfirmModal(CONFIRM_CLOSED); } finally { setActionLoading(false); }
            },
        });
    };

    // ─── Department Actions ───────────────────────────────────────────────────

    const openCreateDept = () => {
        setDeptForm(DEFAULT_DEPT_FORM);
        setDeptFormErrors({});
        setIsCreateDeptOpen(true);
    };

    const validateDeptForm = () => {
        const errors: Record<string, string> = {};

        // Name: required, unique, letters/numbers/spaces, max 100
        if (!deptForm.name.trim()) {
            errors.name = 'Department name is required.';
        } else if (deptForm.name.trim().length < 2) {
            errors.name = 'Name must be at least 2 characters.';
        } else if (deptForm.name.trim().length > 100) {
            errors.name = 'Name must not exceed 100 characters.';
        } else if (!/^[a-zA-Z0-9 ]+$/.test(deptForm.name.trim())) {
            errors.name = 'Name may only contain letters, numbers, and spaces.';
        } else {
            const existing = departments.find(d =>
                d.name.toLowerCase() === deptForm.name.trim().toLowerCase() &&
                d.departmentId !== (editingDept?.departmentId ?? ''));
            if (existing) errors.name = 'A department with this name already exists.';
        }

        // Code: required, unique, alphanumeric, max 20
        if (!deptForm.code.trim()) {
            errors.code = 'Department code is required.';
        } else if (!/^[a-zA-Z0-9]+$/.test(deptForm.code.trim())) {
            errors.code = 'Code must be alphanumeric (no spaces or special characters).';
        } else if (deptForm.code.trim().length > 20) {
            errors.code = 'Code must not exceed 20 characters.';
        } else {
            const codeExists = departments.find(d =>
                (d.code || '').toLowerCase() === deptForm.code.trim().toLowerCase() &&
                d.departmentId !== (editingDept?.departmentId ?? ''));
            if (codeExists) errors.code = 'This department code is already in use.';
        }

        // Description: optional, max 500
        if (deptForm.description.length > 500) {
            errors.description = 'Description must not exceed 500 characters.';
        }

        // Effective Date: required
        if (!deptForm.effectiveDate) {
            errors.effectiveDate = 'Effective date is required.';
        }

        return errors;
    };

    const handleCreateDept = async (e: React.FormEvent) => {
        e.preventDefault();
        const errors = validateDeptForm();
        if (Object.keys(errors).length) { setDeptFormErrors(errors); return; }
        setActionLoading(true);
        try {
            const payload: CreateDepartmentDTO = {
                name: deptForm.name.trim(),
                description: deptForm.description.trim() || undefined,
                code: deptForm.code.trim(),
                status: deptForm.status,
                headEmployeeId: deptForm.headEmployeeId || undefined,
                effectiveDate: deptForm.effectiveDate,
            };
            const res = await fetch('/api/organization/departments', { method: 'POST', headers: authHeaders(), body: JSON.stringify(payload) });
            if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || 'Failed to create department.'); }
            toastSuccess('Department created successfully!');
            setDeptDirty(false); setIsCreateDeptOpen(false); fetchDepartments();
        } catch (e: any) { toastError(e.message); setDeptFormErrors({ api: e.message }); } finally { setActionLoading(false); }
    };

    const openEditDept = (dept: DepartmentResponseDTO) => {
        setEditingDept(dept);
        setDeptForm({
            name: dept.name,
            description: dept.description || '',
            code: dept.code || '',
            status: dept.status ?? (dept.isActive !== false ? 'Active' : 'Inactive'),
            headEmployeeId: dept.headEmployeeId || '',
            effectiveDate: dept.effectiveDate ? dept.effectiveDate.split('T')[0] : '',
        });
        setDeptFormErrors({});
    };

    const handleEditDept = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingDept) return;
        const errors = validateDeptForm();
        if (Object.keys(errors).length) { setDeptFormErrors(errors); return; }
        setActionLoading(true);
        try {
            const payload: CreateDepartmentDTO = {
                name: deptForm.name.trim(),
                description: deptForm.description.trim() || undefined,
                code: deptForm.code.trim(),
                status: deptForm.status,
                headEmployeeId: deptForm.headEmployeeId || undefined,
                effectiveDate: deptForm.effectiveDate,
            };
            const res = await fetch(`/api/organization/departments/${editingDept.departmentId}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(payload) });
            if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || 'Failed to update department.'); }
            toastSuccess('Department updated successfully!');
            setEditingDept(null); fetchDepartments();
        } catch (e: any) { toastError(e.message); setDeptFormErrors({ api: e.message }); } finally { setActionLoading(false); }
    };

    const confirmToggleDeptStatus = (dept: DepartmentResponseDTO) => {
        const currentlyActive = dept.status === 'Active' || dept.isActive !== false;
        const activate = !currentlyActive;
        setConfirmModal({
            isOpen: true, variant: activate ? 'success' : 'warning',
            icon: activate ? 'ti-check' : 'ti-alert-triangle',
            title: `${activate ? 'Activate' : 'Deactivate'} Department?`,
            description: (<>Are you sure you want to <strong>{activate ? 'activate' : 'deactivate'}</strong> the department <strong>{dept.name}</strong>?</>),
            notice: !activate ? 'Deactivated departments will not be available for new employee assignments.' : undefined,
            confirmLabel: activate ? 'Activate' : 'Deactivate',
            onConfirm: async () => {
                setActionLoading(true);
                try {
                    const patchRes = await fetch(`/api/organization/departments/${dept.departmentId}/toggle-status`, { method: 'PATCH', headers: authHeaders() });
                    if (!patchRes.ok) {
                        const putRes = await fetch(`/api/organization/departments/${dept.departmentId}`, {
                            method: 'PUT', headers: authHeaders(),
                            body: JSON.stringify({ name: dept.name, description: dept.description, code: dept.code, status: activate ? 'Active' : 'Inactive', effectiveDate: dept.effectiveDate }),
                        });
                        if (!putRes.ok) { const e = await putRes.json().catch(() => ({})); throw new Error(e.message || 'Failed to update status.'); }
                    }
                    toastSuccess(`Department ${activate ? 'activated' : 'deactivated'}.`);
                    setConfirmModal(CONFIRM_CLOSED); fetchDepartments();
                } catch (e: any) { toastError(e.message); setConfirmModal(CONFIRM_CLOSED); } finally { setActionLoading(false); }
            },
        });
    };

    const confirmDeleteDept = (dept: DepartmentResponseDTO) => {
        const empCount = dept.employeeCount ?? 0;
        setConfirmModal({
            isOpen: true, variant: 'danger', icon: 'ti-trash',
            title: `Delete Department: ${dept.name}?`,
            description: (<>Permanently delete department <strong>{dept.name}</strong>? This cannot be undone.</>),
            notice: empCount > 0
                ? `This department has ${empCount} active employee(s). Reassign them before deleting.`
                : 'All associated job positions will also be removed.',
            confirmLabel: empCount > 0 ? undefined : 'Delete Department',
            onConfirm: empCount > 0 ? () => setConfirmModal(CONFIRM_CLOSED) : async () => {
                setActionLoading(true);
                try {
                    const res = await fetch(`/api/organization/departments/${dept.departmentId}`, { method: 'DELETE', headers: authHeaders() });
                    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || 'Failed to delete department.'); }
                    toastSuccess('Department deleted.'); setConfirmModal(CONFIRM_CLOSED); fetchDepartments();
                } catch (e: any) { toastError(e.message); setConfirmModal(CONFIRM_CLOSED); } finally { setActionLoading(false); }
            },
        });
    };

    // ─── Position Actions ─────────────────────────────────────────────────────

    const validatePosForm = () => {
        const errors: Record<string, string> = {};

        // Position Title: required, unique within dept, max 100
        if (!posForm.name.trim()) {
            errors.name = 'Position title is required.';
        } else if (posForm.name.trim().length > 100) {
            errors.name = 'Title must not exceed 100 characters.';
        } else {
            const existing = positions.find(p =>
                p.name.toLowerCase() === posForm.name.trim().toLowerCase() &&
                p.departmentId === posForm.departmentId &&
                p.jobPositionId !== (editingPos?.jobPositionId ?? ''));
            if (existing) errors.name = 'A position with this title already exists in this department.';
        }

        // Code: required, unique, max 20
        if (!posForm.code.trim()) {
            errors.code = 'Position code is required.';
        } else if (posForm.code.trim().length > 20) {
            errors.code = 'Code must not exceed 20 characters.';
        } else {
            const codeExists = positions.find(p =>
                (p.code || '').toLowerCase() === posForm.code.trim().toLowerCase() &&
                p.jobPositionId !== (editingPos?.jobPositionId ?? ''));
            if (codeExists) errors.code = 'This position code is already in use.';
        }

        // Department: required
        if (!posForm.departmentId) errors.departmentId = 'Department is required.';

        // Description: optional, max 1000
        if (posForm.description.length > 1000) {
            errors.description = 'Description must not exceed 1,000 characters.';
        }

        // Effective Date: required
        if (!posForm.effectiveDate) {
            errors.effectiveDate = 'Effective date is required.';
        }

        return errors;
    };

    const handleCreatePos = async (e: React.FormEvent) => {
        e.preventDefault();
        const errors = validatePosForm();
        if (Object.keys(errors).length) { setPosFormErrors(errors); return; }
        setActionLoading(true);
        try {
            const payload: CreateJobPositionDTO = {
                name: posForm.name.trim(),
                description: posForm.description.trim() || undefined,
                departmentId: posForm.departmentId,
                code: posForm.code.trim(),
                status: posForm.status,
                reportsToId: posForm.reportsToId || undefined,
                employmentType: posForm.employmentType,
                positionLevel: posForm.positionLevel,
                effectiveDate: posForm.effectiveDate,
            };
            const res = await fetch('/api/organization/job-positions', { method: 'POST', headers: authHeaders(), body: JSON.stringify(payload) });
            if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || 'Failed to create position.'); }
            toastSuccess('Position created successfully!');
            setIsCreatePosOpen(false); fetchPositions();
        } catch (e: any) { toastError(e.message); setPosFormErrors({ api: e.message }); } finally { setActionLoading(false); }
    };

    const openEditPos = (pos: JobPositionResponseDTO) => {
        setEditingPos(pos);
        setPosForm({
            name: pos.name,
            description: pos.description || '',
            code: pos.code || '',
            departmentId: pos.departmentId,
            status: pos.status ?? (pos.isActive !== false ? 'Active' : 'Inactive'),
            reportsToId: pos.reportsToId || '',
            employmentType: pos.employmentType ?? 'Regular',
            positionLevel: pos.positionLevel ?? 'Staff',
            effectiveDate: pos.effectiveDate ? pos.effectiveDate.split('T')[0] : '',
        });
        setPosFormErrors({});
    };

    const handleEditPos = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingPos) return;
        const errors = validatePosForm();
        if (Object.keys(errors).length) { setPosFormErrors(errors); return; }
        setActionLoading(true);
        try {
            const payload: CreateJobPositionDTO = {
                name: posForm.name.trim(),
                description: posForm.description.trim() || undefined,
                departmentId: posForm.departmentId,
                code: posForm.code.trim(),
                status: posForm.status,
                reportsToId: posForm.reportsToId || undefined,
                employmentType: posForm.employmentType,
                positionLevel: posForm.positionLevel,
                effectiveDate: posForm.effectiveDate,
            };
            const res = await fetch(`/api/organization/job-positions/${editingPos.jobPositionId}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(payload) });
            if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || 'Failed to update position.'); }
            toastSuccess('Position updated successfully!');
            setEditingPos(null); fetchPositions();
        } catch (e: any) { toastError(e.message); setPosFormErrors({ api: e.message }); } finally { setActionLoading(false); }
    };

    const confirmTogglePosStatus = (pos: JobPositionResponseDTO) => {
        const currentlyActive = pos.status === 'Active' || pos.isActive !== false;
        const activate = !currentlyActive;
        setConfirmModal({
            isOpen: true, variant: activate ? 'success' : 'warning',
            icon: activate ? 'ti-check' : 'ti-alert-triangle',
            title: `${activate ? 'Activate' : 'Deactivate'} Position?`,
            description: (<>Are you sure you want to <strong>{activate ? 'activate' : 'deactivate'}</strong> the position <strong>{pos.name}</strong>?</>),
            notice: !activate ? 'Deactivated positions will not be available for new employee assignments.' : undefined,
            confirmLabel: activate ? 'Activate' : 'Deactivate',
            onConfirm: async () => {
                setActionLoading(true);
                try {
                    const patchRes = await fetch(`/api/organization/job-positions/${pos.jobPositionId}/toggle-status`, { method: 'PATCH', headers: authHeaders() });
                    if (!patchRes.ok) {
                        const putRes = await fetch(`/api/organization/job-positions/${pos.jobPositionId}`, {
                            method: 'PUT', headers: authHeaders(),
                            body: JSON.stringify({ name: pos.name, description: pos.description, departmentId: pos.departmentId, code: pos.code, status: activate ? 'Active' : 'Inactive' }),
                        });
                        if (!putRes.ok) { const e = await putRes.json().catch(() => ({})); throw new Error(e.message || 'Failed to update status.'); }
                    }
                    toastSuccess(`Position ${activate ? 'activated' : 'deactivated'}.`);
                    setConfirmModal(CONFIRM_CLOSED); fetchPositions();
                } catch (e: any) { toastError(e.message); setConfirmModal(CONFIRM_CLOSED); } finally { setActionLoading(false); }
            },
        });
    };

    const confirmDeletePos = (pos: JobPositionResponseDTO) => {
        const empCount = pos.employeeCount ?? 0;
        setConfirmModal({
            isOpen: true, variant: 'danger', icon: 'ti-trash',
            title: `Delete Position: ${pos.name}?`,
            description: (<>Permanently delete position <strong>{pos.name}</strong>? This cannot be undone.</>),
            notice: empCount > 0
                ? `This position has ${empCount} active employee(s). Reassign them before deleting.`
                : undefined,
            confirmLabel: empCount > 0 ? undefined : 'Delete Position',
            onConfirm: empCount > 0 ? () => setConfirmModal(CONFIRM_CLOSED) : async () => {
                setActionLoading(true);
                try {
                    const res = await fetch(`/api/organization/job-positions/${pos.jobPositionId}`, { method: 'DELETE', headers: authHeaders() });
                    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || 'Failed to delete position.'); }
                    toastSuccess('Position deleted.'); setConfirmModal(CONFIRM_CLOSED); fetchPositions();
                } catch (e: any) { toastError(e.message); setConfirmModal(CONFIRM_CLOSED); } finally { setActionLoading(false); }
            },
        });
    };

    // ─── Stats per sub-tab ────────────────────────────────────────────────────

    const systemRoles = roles.filter(r => r.isSystemDefined).length;
    const customRoles = roles.filter(r => !r.isSystemDefined).length;
    const activeDepts = departments.filter(d => d.status === 'Active' || d.isActive !== false).length;
    const activePositions = positions.filter(p => p.status === 'Active' || p.isActive !== false).length;

    // ─── Shared form helpers ──────────────────────────────────────────────────

    const setDeptField = <K extends keyof typeof deptForm>(key: K, value: typeof deptForm[K]) => {
        setDeptDirty(true);
        setDeptForm(f => ({ ...f, [key]: value }));
        setDeptFormErrors(p => ({ ...p, [key]: '' }));
    };

    const setPosField = <K extends keyof typeof posForm>(key: K, value: typeof posForm[K]) => {
        setPosDirty(true);
        setPosForm(f => ({ ...f, [key]: value }));
        setPosFormErrors(p => ({ ...p, [key]: '' }));
    };

    // ─── Render ───────────────────────────────────────────────────────────────

    // Shared dept form body (used in both create & edit modals)
    const renderDeptFormBody = () => (
        <div className="rm2-form-body">
            {/* Row 1: Name + Code */}
            <div className="rm2-field-row">
                <div className="rm2-field">
                    <label className="rm2-form-label">
                        Department Name <span className="rm2-req">*</span>
                    </label>
                    <input
                        type="text"
                        className={`form-input${deptFormErrors.name ? ' rm2-input--error' : ''}`}
                        placeholder="e.g. Human Resources"
                        value={deptForm.name}
                        maxLength={100}
                        onChange={e => setDeptField('name', e.target.value)}
                    />
                    <div className="rm2-field-footer">
                        {deptFormErrors.name
                            ? <span className="rm2-field-error"><AlertCircle size={11} /> {deptFormErrors.name}</span>
                            : <span className="rm2-field-hint">Letters, numbers, and spaces only.</span>
                        }
                        <span className="rm2-char-count">{deptForm.name.length}/100</span>
                    </div>
                </div>
                <div className="rm2-field rm2-field--sm">
                    <label className="rm2-form-label">
                        Code <span className="rm2-req">*</span>
                    </label>
                    <input
                        type="text"
                        className={`form-input${deptFormErrors.code ? ' rm2-input--error' : ''}`}
                        placeholder="e.g. HR"
                        value={deptForm.code}
                        maxLength={20}
                        onChange={e => setDeptField('code', e.target.value.toUpperCase())}
                    />
                    <div className="rm2-field-footer">
                        {deptFormErrors.code
                            ? <span className="rm2-field-error"><AlertCircle size={11} /> {deptFormErrors.code}</span>
                            : <span className="rm2-field-hint">Alphanumeric only.</span>
                        }
                        <span className="rm2-char-count">{deptForm.code.length}/20</span>
                    </div>
                </div>
            </div>

            {/* Row 2: Description */}
            <div className="rm2-field">
                <label className="rm2-form-label">Description</label>
                <textarea
                    className={`form-input${deptFormErrors.description ? ' rm2-input--error' : ''}`}
                    rows={3}
                    placeholder="Describe this department's purpose and scope…"
                    value={deptForm.description}
                    maxLength={500}
                    onChange={e => setDeptField('description', e.target.value)}
                />
                <div className="rm2-field-footer">
                    {deptFormErrors.description
                        ? <span className="rm2-field-error"><AlertCircle size={11} /> {deptFormErrors.description}</span>
                        : <span />
                    }
                    <span className="rm2-char-count">{deptForm.description.length}/500</span>
                </div>
            </div>

            {/* Row 3: Department Head + Status */}
            <div className="rm2-field-row">
                <div className="rm2-field">
                    <label className="rm2-form-label">
                        Department Head
                        <span className="rm2-field-optional"> (optional)</span>
                    </label>
                    <select
                        className="form-input"
                        value={deptForm.headEmployeeId}
                        onChange={e => setDeptField('headEmployeeId', e.target.value)}
                        disabled={employeesLoading}
                    >
                        <option value="">
                            {employeesLoading ? 'Loading employees…' : '— None —'}
                        </option>
                        {employees.map(emp => (
                            <option key={emp.employeeId} value={emp.employeeId}>
                                {emp.fullName}{emp.jobPositionName ? ` · ${emp.jobPositionName}` : ''}
                            </option>
                        ))}
                    </select>
                    <span className="rm2-field-hint"><Info size={11} /> Select an active employee to lead this department.</span>
                </div>
                <div className="rm2-field rm2-field--sm">
                    <label className="rm2-form-label">
                        Status <span className="rm2-req">*</span>
                    </label>
                    <select
                        className="form-input"
                        value={deptForm.status}
                        onChange={e => setDeptField('status', e.target.value as 'Active' | 'Inactive')}
                    >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                    </select>
                </div>
            </div>

            {/* Row 4: Effective Date */}
            <div className="rm2-field rm2-field--half">
                <label className="rm2-form-label">
                    <Calendar size={13} className="rm2-label-icon" />
                    Effective Date <span className="rm2-req">*</span>
                </label>
                <input
                    type="date"
                    className={`form-input${deptFormErrors.effectiveDate ? ' rm2-input--error' : ''}`}
                    value={deptForm.effectiveDate}
                    onChange={e => setDeptField('effectiveDate', e.target.value)}
                />
                {deptFormErrors.effectiveDate && (
                    <span className="rm2-field-error"><AlertCircle size={11} /> {deptFormErrors.effectiveDate}</span>
                )}
            </div>
        </div>
    );

    // Shared position form body
    const renderPosFormBody = () => (
        <div className="rm2-form-body">
            {/* Row 1: Title + Code */}
            <div className="rm2-field-row">
                <div className="rm2-field">
                    <label className="rm2-form-label">
                        Position Title <span className="rm2-req">*</span>
                    </label>
                    <input
                        type="text"
                        className={`form-input${posFormErrors.name ? ' rm2-input--error' : ''}`}
                        placeholder="e.g. Operations Manager"
                        value={posForm.name}
                        maxLength={100}
                        onChange={e => setPosField('name', e.target.value)}
                    />
                    <div className="rm2-field-footer">
                        {posFormErrors.name
                            ? <span className="rm2-field-error"><AlertCircle size={11} /> {posFormErrors.name}</span>
                            : <span className="rm2-field-hint">Must be unique within the selected department.</span>
                        }
                        <span className="rm2-char-count">{posForm.name.length}/100</span>
                    </div>
                </div>
                <div className="rm2-field rm2-field--sm">
                    <label className="rm2-form-label">
                        Code <span className="rm2-req">*</span>
                    </label>
                    <input
                        type="text"
                        className={`form-input${posFormErrors.code ? ' rm2-input--error' : ''}`}
                        placeholder="e.g. OPS-MGR"
                        value={posForm.code}
                        maxLength={20}
                        onChange={e => setPosField('code', e.target.value.toUpperCase())}
                    />
                    <div className="rm2-field-footer">
                        {posFormErrors.code
                            ? <span className="rm2-field-error"><AlertCircle size={11} /> {posFormErrors.code}</span>
                            : <span />
                        }
                        <span className="rm2-char-count">{posForm.code.length}/20</span>
                    </div>
                </div>
            </div>

            {/* Row 2: Department */}
            <div className="rm2-field">
                <label className="rm2-form-label">
                    Department <span className="rm2-req">*</span>
                </label>
                <div className="rm2-dept-select-wrap">
                    <select
                        className={`form-input rm2-dept-select${posFormErrors.departmentId ? ' rm2-input--error' : ''}`}
                        value={showQuickDept ? '__create__' : posForm.departmentId}
                        onChange={e => {
                            if (e.target.value === '__create__') {
                                setShowQuickDept(true);
                                setPosField('departmentId', '');
                            } else {
                                setShowQuickDept(false);
                                setPosField('departmentId', e.target.value);
                            }
                        }}
                    >
                        <option value="">— Select a department —</option>
                        {departments
                            .filter(d => d.status === 'Active' || d.isActive !== false)
                            .map(d => (
                                <option key={d.departmentId} value={d.departmentId}>{d.name}</option>
                            ))
                        }
                        <option value="__create__" className="rm2-create-option">+ Create New Department</option>
                    </select>
                    {!showQuickDept && (
                        <button type="button" className="rm2-dept-add-btn" onClick={() => setShowQuickDept(true)} title="Create new department">
                            <Plus size={14} />
                        </button>
                    )}
                </div>
                {posFormErrors.departmentId && (
                    <span className="rm2-field-error"><AlertCircle size={11} /> {posFormErrors.departmentId}</span>
                )}
                {departments.filter(d => d.status === 'Active' || d.isActive !== false).length === 0 && !showQuickDept && (
                    <span className="rm2-field-hint" style={{ color: '#f59e0b' }}>
                        <AlertCircle size={11} /> No departments yet.
                    </span>
                )}

                {/* Inline quick-create department panel */}
                {showQuickDept && (
                    <div className="rm2-quick-create-panel">
                        <div className="rm2-quick-create-header">
                            <Building2 size={13} />
                            <span>Quick Create Department</span>
                            <button type="button" className="rm2-quick-create-close" onClick={() => { setShowQuickDept(false); setQuickDeptErrors({}); }}>
                                ✕
                            </button>
                        </div>
                        <div className="rm2-quick-create-body">
                            <div className="rm2-quick-row">
                                <div className="rm2-quick-field">
                                    <label className="rm2-form-label">Name <span className="rm2-req">*</span></label>
                                    <input
                                        type="text"
                                        className={`form-input${quickDeptErrors.name ? ' rm2-input--error' : ''}`}
                                        placeholder="e.g. Human Resources"
                                        value={quickDeptForm.name}
                                        onChange={e => setQuickDeptForm(f => ({ ...f, name: e.target.value }))}
                                    />
                                    {quickDeptErrors.name && <span className="rm2-field-error"><AlertCircle size={11} /> {quickDeptErrors.name}</span>}
                                </div>
                                <div className="rm2-quick-field rm2-quick-field--sm">
                                    <label className="rm2-form-label">Code <span className="rm2-req">*</span></label>
                                    <input
                                        type="text"
                                        className={`form-input${quickDeptErrors.code ? ' rm2-input--error' : ''}`}
                                        placeholder="e.g. HR"
                                        maxLength={20}
                                        value={quickDeptForm.code}
                                        onChange={e => setQuickDeptForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                                    />
                                    {quickDeptErrors.code && <span className="rm2-field-error"><AlertCircle size={11} /> {quickDeptErrors.code}</span>}
                                </div>
                                <div className="rm2-quick-field rm2-quick-field--sm">
                                    <label className="rm2-form-label">Effective Date <span className="rm2-req">*</span></label>
                                    <input
                                        type="date"
                                        className={`form-input${quickDeptErrors.effectiveDate ? ' rm2-input--error' : ''}`}
                                        value={quickDeptForm.effectiveDate}
                                        onChange={e => setQuickDeptForm(f => ({ ...f, effectiveDate: e.target.value }))}
                                    />
                                    {quickDeptErrors.effectiveDate && <span className="rm2-field-error"><AlertCircle size={11} /> {quickDeptErrors.effectiveDate}</span>}
                                </div>
                            </div>
                            {quickDeptErrors.api && <span className="rm2-field-error"><AlertCircle size={11} /> {quickDeptErrors.api}</span>}
                            <div className="rm2-quick-create-actions">
                                <button type="button" className="rm2-btn rm2-btn--ghost rm2-btn--sm" onClick={() => { setShowQuickDept(false); setQuickDeptErrors({}); }}>
                                    Cancel
                                </button>
                                <button type="button" className="rm2-btn rm2-btn--primary rm2-btn--sm" onClick={handleQuickCreateDept} disabled={quickDeptLoading}>
                                    {quickDeptLoading ? <><Loader2 size={12} className="rm2-spin" /> Creating…</> : <><Plus size={12} /> Create Department</>}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>


            {/* Row 3: Employment Type + Position Level */}
            <div className="rm2-field-row">
                <div className="rm2-field">
                    <label className="rm2-form-label">
                        Employment Type <span className="rm2-req">*</span>
                    </label>
                    <select
                        className="form-input"
                        value={posForm.employmentType}
                        onChange={e => setPosField('employmentType', e.target.value as EmploymentType)}
                    >
                        {EMPLOYMENT_TYPES.map(t => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                </div>
                <div className="rm2-field">
                    <label className="rm2-form-label">
                        Position Level <span className="rm2-req">*</span>
                    </label>
                    <select
                        className="form-input"
                        value={posForm.positionLevel}
                        onChange={e => setPosField('positionLevel', e.target.value as PositionLevel)}
                    >
                        {POSITION_LEVELS.map(l => (
                            <option key={l} value={l}>{l}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Row 4: Reporting Position */}
            <div className="rm2-field">
                <label className="rm2-form-label">
                    Reporting Position
                    <span className="rm2-field-optional"> (optional)</span>
                </label>
                <select
                    className="form-input"
                    value={posForm.reportsToId}
                    onChange={e => setPosField('reportsToId', e.target.value)}
                >
                    <option value="">— None (top-level position) —</option>
                    {positions
                        .filter(p => p.jobPositionId !== editingPos?.jobPositionId && (p.status === 'Active' || p.isActive !== false))
                        .map(p => (
                            <option key={p.jobPositionId} value={p.jobPositionId}>
                                {p.name} ({p.departmentName})
                            </option>
                        ))
                    }
                </select>
                <span className="rm2-field-hint"><Info size={11} /> Defines the organizational reporting hierarchy.</span>
            </div>

            {/* Row 5: Description */}
            <div className="rm2-field">
                <label className="rm2-form-label">Description</label>
                <textarea
                    className={`form-input${posFormErrors.description ? ' rm2-input--error' : ''}`}
                    rows={3}
                    placeholder="Describe this position's responsibilities and scope…"
                    value={posForm.description}
                    maxLength={1000}
                    onChange={e => setPosField('description', e.target.value)}
                />
                <div className="rm2-field-footer">
                    {posFormErrors.description
                        ? <span className="rm2-field-error"><AlertCircle size={11} /> {posFormErrors.description}</span>
                        : <span />
                    }
                    <span className="rm2-char-count">{posForm.description.length}/1,000</span>
                </div>
            </div>

            {/* Row 6: Status + Effective Date */}
            <div className="rm2-field-row">
                <div className="rm2-field rm2-field--sm">
                    <label className="rm2-form-label">
                        Status <span className="rm2-req">*</span>
                    </label>
                    <select
                        className="form-input"
                        value={posForm.status}
                        onChange={e => setPosField('status', e.target.value as 'Active' | 'Inactive')}
                    >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                    </select>
                </div>
                <div className="rm2-field">
                    <label className="rm2-form-label">
                        <Calendar size={13} className="rm2-label-icon" />
                        Effective Date <span className="rm2-req">*</span>
                    </label>
                    <input
                        type="date"
                        className={`form-input${posFormErrors.effectiveDate ? ' rm2-input--error' : ''}`}
                        value={posForm.effectiveDate}
                        onChange={e => setPosField('effectiveDate', e.target.value)}
                    />
                    {posFormErrors.effectiveDate && (
                        <span className="rm2-field-error"><AlertCircle size={11} /> {posFormErrors.effectiveDate}</span>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div className="rm2-root">

            {/* ── Sub-tab Navigation ── */}
            <SubTabNav
                tabs={[
                    { key: 'roles', label: 'Roles & Permissions', icon: <Shield size={15} /> },
                    { key: 'departments', label: 'Departments', icon: <Building2 size={15} /> },
                    { key: 'positions', label: 'Job Positions', icon: <Briefcase size={15} /> },
                    { key: 'overview', label: 'Overview & Logs', icon: <BarChart2 size={15} /> },
                ]}
                activeTab={subTab}
                onTabChange={(key: string) => setSubTab(key as SubTab)}
            />
            {/* ─────────────────────────────── ROLES TAB ────────────────────── */}
            {subTab === 'roles' && (
                <>
                    <div className="rm2-stats-grid">
                        <StatCard icon={<Shield size={18} />} label="Total Roles" value={roles.length} subtext={`${systemRoles} system · ${customRoles} custom`} variant="primary" />
                        <StatCard icon={<Settings size={18} />} label="Custom Roles" value={customRoles} subtext="Created by administrators" variant="warning" />
                        <StatCard icon={<Lock size={18} />} label="System Roles" value={systemRoles} subtext="Protected by the system" variant="success" />
                        <StatCard icon={<Key size={18} />} label="Total Permissions" value={permissions.length} subtext="Available across all roles" variant="primary" />
                    </div>

                    <DataTable
                        title="Roles" totalResults={filteredRoles.length}
                        searchQuery={roleSearch} setSearchQuery={v => { setRoleSearch(v); setRolePage(1); }}
                        searchPlaceholder="Search roles…"
                        headers={['Role Name', 'Type', 'Permissions', 'Actions']}
                        loading={rolesLoading} emptyMessage="No roles match your search." emptyIcon={<Shield size={20} />}
                        actionButton={{ label: 'Create Role', icon: <Plus size={14} />, onClick: openCreateRole }}
                        currentPage={rolePage} totalPages={roleTotalPages} onPageChange={setRolePage}
                    >
                        {pagedRoles.map(role => (
                            <tr key={role.roleId}>
                                <td>
                                    <div className="rm2-role-name-cell">
                                        <div className={`rm2-role-icon ${role.isSystemDefined ? 'rm2-role-icon--system' : 'rm2-role-icon--custom'}`}><Shield size={14} /></div>
                                        <div>
                                            <div className="rm2-role-name">{role.name}</div>
                                            <div className="rm2-role-desc">{role.description || <span className="rm2-no-desc">No description</span>}</div>
                                        </div>
                                    </div>
                                </td>
                                <td><RoleTypeBadge isSystem={role.isSystemDefined} /></td>
                                <td><span className="rm2-perm-pill">{role.permissions.length} permissions</span></td>
                                <td>
                                    <ActionsDropdown actions={[
                                        { label: 'Edit Role', icon: <Pencil size={13} />, onClick: () => openEditRole(role) },
                                        ...(!role.isSystemDefined ? [{ label: 'Delete Role', icon: <Trash2 size={13} />, onClick: () => confirmDeleteRole(role), variant: 'danger' as const }] : []),
                                    ]} />
                                </td>
                            </tr>
                        ))}
                    </DataTable>
                </>
            )}

            {/* ───────────────────────────── DEPARTMENTS TAB ────────────────── */}
            {subTab === 'departments' && (
                <>
                    <div className="rm2-stats-grid">
                        <StatCard icon={<Building2 size={18} />} label="Total Departments" value={departments.length} subtext="In the organization" variant="primary" />
                        <StatCard icon={<CheckCircle2 size={18} />} label="Active Departments" value={activeDepts} subtext="Currently operational" variant="success" />
                        <StatCard icon={<XCircle size={18} />} label="Inactive Departments" value={departments.length - activeDepts} subtext="Deactivated units" variant="warning" />
                        <StatCard icon={<Users size={18} />} label="Total Positions" value={positions.length || '—'} subtext="Across all departments" variant="primary" />
                    </div>

                    <DataTable
                        title="Departments" totalResults={filteredDepts.length}
                        searchQuery={deptSearch} setSearchQuery={v => { setDeptSearch(v); setDeptPage(1); }}
                        searchPlaceholder="Search by name or code…"
                        headers={['Department', 'Code', 'Head', 'Status', 'Effective Date', 'Employees', 'Actions']}
                        loading={deptsLoading} emptyMessage="No departments found." emptyIcon={<Building2 size={20} />}
                        actionButton={{ label: 'Add Department', icon: <Plus size={14} />, onClick: openCreateDept }}
                        currentPage={deptPage} totalPages={deptTotalPages} onPageChange={setDeptPage}
                    >
                        {pagedDepts.map(dept => (
                            <tr key={dept.departmentId}>
                                <td>
                                    <div className="rm2-role-name-cell">
                                        <div className="rm2-role-icon rm2-role-icon--dept"><Building2 size={14} /></div>
                                        <div>
                                            <div className="rm2-role-name">{dept.name}</div>
                                            <div className="rm2-role-desc">{dept.description || <span className="rm2-no-desc">No description</span>}</div>
                                        </div>
                                    </div>
                                </td>
                                <td>{dept.code ? <StatusBadge status={dept.code} size="sm" /> : <span className="rm2-no-desc">—</span>}</td>
                                <td>{dept.headEmployeeName ? <span className="rm2-reports-to">{dept.headEmployeeName}</span> : <span className="rm2-no-desc">—</span>}</td>
                                <td><ActiveStatusBadge isActive={dept.status === 'Active' || dept.isActive !== false} /></td>
                                <td>
                                    {dept.effectiveDate
                                        ? <span className="rm2-date-text">{new Date(dept.effectiveDate).toLocaleDateString()}</span>
                                        : <span className="rm2-no-desc">—</span>
                                    }
                                </td>
                                <td><span className="rm2-count-text">{dept.employeeCount ?? 0} employees</span></td>
                                <td>
                                    <ActionsDropdown actions={[
                                        { label: 'Edit', icon: <Pencil size={13} />, onClick: () => openEditDept(dept) },
                                        {
                                            label: (dept.status === 'Active' || dept.isActive !== false) ? 'Deactivate' : 'Activate',
                                            icon: (dept.status === 'Active' || dept.isActive !== false) ? <ToggleLeft size={13} /> : <ToggleRight size={13} />,
                                            onClick: () => confirmToggleDeptStatus(dept),
                                            variant: (dept.status === 'Active' || dept.isActive !== false) ? 'danger' as const : 'success' as const,
                                        },
                                        { label: 'Delete', icon: <Trash2 size={13} />, onClick: () => confirmDeleteDept(dept), variant: 'danger' as const },
                                    ]} />
                                </td>
                            </tr>
                        ))}
                    </DataTable>
                </>
            )}

            {/* ─────────────────────────── JOB POSITIONS TAB ────────────────── */}
            {subTab === 'positions' && (
                <>
                    <div className="rm2-stats-grid">
                        <StatCard icon={<Briefcase size={18} />} label="Total Positions" value={positions.length} subtext="Across all departments" variant="primary" />
                        <StatCard icon={<CheckCircle2 size={18} />} label="Active Positions" value={activePositions} subtext="Currently operational" variant="success" />
                        <StatCard icon={<XCircle size={18} />} label="Inactive Positions" value={positions.length - activePositions} subtext="Deactivated positions" variant="warning" />
                        <StatCard icon={<Building2 size={18} />} label="Departments" value={departments.length} subtext="Available departments" variant="primary" />
                    </div>

                    <DataTable
                        title="Job Positions" totalResults={filteredPos.length}
                        searchQuery={posSearch} setSearchQuery={v => { setPosSearch(v); setPosPage(1); }}
                        searchPlaceholder="Search by name, code, or department…"
                        headers={['Position', 'Code', 'Department', 'Type', 'Level', 'Status', 'Effective Date', 'Employees', 'Actions']}
                        loading={posLoading} emptyMessage="No positions found." emptyIcon={<Briefcase size={20} />}
                        actionButton={{ label: 'Add Position', icon: <Plus size={14} />, onClick: openCreatePos }}
                        currentPage={posPage} totalPages={posTotalPages} onPageChange={setPosPage}
                    >
                        {pagedPos.map(pos => (
                            <tr key={pos.jobPositionId}>
                                <td>
                                    <div className="rm2-role-name-cell">
                                        <div className="rm2-role-icon rm2-role-icon--pos"><Briefcase size={14} /></div>
                                        <div>
                                            <div className="rm2-role-name">{pos.name}</div>
                                            <div className="rm2-role-desc">{pos.description || <span className="rm2-no-desc">No description</span>}</div>
                                        </div>
                                    </div>
                                </td>
                                <td>{pos.code ? <StatusBadge status={pos.code} size="sm" /> : <span className="rm2-no-desc">—</span>}</td>
                                <td><span className="rm2-dept-tag">{pos.departmentName}</span></td>
                                <td>{pos.employmentType ? <span className="rm2-type-pill">{pos.employmentType}</span> : <span className="rm2-no-desc">—</span>}</td>
                                <td>{pos.positionLevel ? <span className="rm2-level-pill">{pos.positionLevel}</span> : <span className="rm2-no-desc">—</span>}</td>
                                <td><ActiveStatusBadge isActive={pos.status === 'Active' || pos.isActive !== false} /></td>
                                <td>
                                    {pos.effectiveDate
                                        ? <span className="rm2-date-text">{new Date(pos.effectiveDate).toLocaleDateString()}</span>
                                        : <span className="rm2-no-desc">—</span>
                                    }
                                </td>
                                <td><span className="rm2-count-text">{pos.employeeCount ?? 0}</span></td>
                                <td>
                                    <ActionsDropdown actions={[
                                        { label: 'Edit', icon: <Pencil size={13} />, onClick: () => openEditPos(pos) },
                                        {
                                            label: (pos.status === 'Active' || pos.isActive !== false) ? 'Deactivate' : 'Activate',
                                            icon: (pos.status === 'Active' || pos.isActive !== false) ? <ToggleLeft size={13} /> : <ToggleRight size={13} />,
                                            onClick: () => confirmTogglePosStatus(pos),
                                            variant: (pos.status === 'Active' || pos.isActive !== false) ? 'danger' as const : 'success' as const,
                                        },
                                        { label: 'Delete', icon: <Trash2 size={13} />, onClick: () => confirmDeletePos(pos), variant: 'danger' as const },
                                    ]} />
                                </td>
                            </tr>
                        ))}
                    </DataTable>
                </>
            )}

            {/* ─── CREATE ROLE MODAL ───────────────────────────────────────── */}
            <FormModal isOpen={isCreateRoleOpen} onClose={() => { setCreateRoleDirty(false); setIsCreateRoleOpen(false); }}
                title="Create Custom Role" subtitle="Define a new role and assign permissions."
                onSubmit={handleCreateRole} submitLabel="Create Role" isSubmitting={actionLoading}
                apiError={createRoleErrors.api} size="md"
                confirmOnCancel={true} dirty={createRoleDirty}>
                <div className="rm2-form-body">
                    <div className="rm2-field">
                        <label className="rm2-form-label">Role Name <span className="rm2-req">*</span></label>
                        <input type="text" className={`form-input${createRoleErrors.name ? ' rm2-input--error' : ''}`}
                            placeholder="e.g. Operation Auditor" value={createRoleName}
                            onChange={e => { setCreateRoleName(e.target.value); setCreateRoleDirty(true); setCreateRoleErrors(p => ({ ...p, name: '' })); }} />
                        {createRoleErrors.name && <span className="rm2-field-error"><AlertCircle size={11} /> {createRoleErrors.name}</span>}
                    </div>
                    <div className="rm2-field">
                        <label className="rm2-form-label">Description</label>
                        <textarea className="form-input" rows={2} placeholder="Briefly describe what this role does…"
                            value={createRoleDesc} onChange={e => { setCreateRoleDesc(e.target.value); setCreateRoleDirty(true); }} />
                    </div>
                    <PermissionSelector grouped={grouped} selected={createRolePerms} setSelected={(s) => { setCreateRolePerms(s); setCreateRoleDirty(true); }} />
                </div>
            </FormModal>

            {/* ─── EDIT ROLE MODAL ─────────────────────────────────────────── */}
            <FormModal isOpen={!!editingRole} onClose={() => { setEditRoleDirty(false); setEditingRole(null); }}
                title={editingRole ? `Edit Role: ${editingRole.name}` : ''} subtitle="Update role description and permissions."
                onSubmit={handleEditRole} submitLabel="Save Changes" isSubmitting={actionLoading}
                apiError={editRoleError} size="md"
                confirmOnCancel={true} dirty={editRoleDirty}>
                {editingRole && (
                    <div className="rm2-form-body">
                        <div className="rm2-field">
                            <label className="rm2-form-label">Role Name</label>
                            <input type="text" className="form-input rm2-input--disabled" value={editingRole.name} disabled />
                            <span className="rm2-field-hint"><Info size={11} /> Role names cannot be changed after creation.</span>
                        </div>
                        <div className="rm2-field">
                            <label className="rm2-form-label">Description</label>
                            <textarea className="form-input" rows={2} value={editRoleDesc} onChange={e => { setEditRoleDesc(e.target.value); setEditRoleDirty(true); }} />
                        </div>
                        <PermissionSelector grouped={grouped} selected={editRolePerms} setSelected={(s) => { setEditRolePerms(s); setEditRoleDirty(true); }} />
                    </div>
                )}
            </FormModal>

            {/* ─── CREATE DEPT MODAL ───────────────────────────────────────── */}
            <FormModal
                isOpen={isCreateDeptOpen}
                onClose={() => { setDeptDirty(false); setIsCreateDeptOpen(false); }}
                title="Add Department"
                subtitle="Create a new department in the organization."
                onSubmit={handleCreateDept}
                submitLabel="Create Department"
                isSubmitting={actionLoading}
                apiError={deptFormErrors.api}
                size="md"
                confirmOnCancel={true}
                dirty={deptDirty}
            >
                {renderDeptFormBody()}
            </FormModal>

            {/* ─── EDIT DEPT MODAL ─────────────────────────────────────────── */}
            <FormModal
                isOpen={!!editingDept}
                onClose={() => { setDeptDirty(false); setEditingDept(null); }}
                title={editingDept ? `Edit: ${editingDept.name}` : ''}
                subtitle="Update department information."
                onSubmit={handleEditDept}
                submitLabel="Save Changes"
                isSubmitting={actionLoading}
                apiError={deptFormErrors.api}
                size="md"
                confirmOnCancel={true}
                dirty={deptDirty}
            >
                {editingDept && renderDeptFormBody()}
            </FormModal>

            {/* ─── CREATE POSITION MODAL ───────────────────────────────────── */}
            <FormModal
                isOpen={isCreatePosOpen}
                onClose={() => { setPosDirty(false); setIsCreatePosOpen(false); }}
                title="Add Job Position"
                subtitle="Create a new position and associate it with a department."
                onSubmit={handleCreatePos}
                submitLabel="Create Position"
                isSubmitting={actionLoading}
                apiError={posFormErrors.api}
                size="md"
                confirmOnCancel={true}
                dirty={posDirty}
            >
                {renderPosFormBody()}
            </FormModal>

            {/* ─── EDIT POSITION MODAL ─────────────────────────────────────── */}
            <FormModal
                isOpen={!!editingPos}
                onClose={() => { setPosDirty(false); setEditingPos(null); }}
                title={editingPos ? `Edit: ${editingPos.name}` : ''}
                subtitle="Update position information."
                onSubmit={handleEditPos}
                submitLabel="Save Changes"
                isSubmitting={actionLoading}
                apiError={posFormErrors.api}
                size="md"
                confirmOnCancel={true}
                dirty={posDirty}
            >
                {editingPos && renderPosFormBody()}
            </FormModal>

            {/* ──────────────────────────── OVERVIEW TAB ────────────────────── */}
            {subTab === 'overview' && (() => {
                const activeDeptCount = departments.filter(d => d.status === 'Active' || d.isActive !== false).length;
                const inactiveDeptCount = departments.length - activeDeptCount;
                const activePosCount = positions.filter(p => p.status === 'Active' || p.isActive !== false).length;
                const inactivePosCount = positions.length - activePosCount;
                const totalEmployees = departments.reduce((s, d) => s + (d.employeeCount ?? 0), 0);

                const posByDept = departments.map(d => ({
                    dept: d,
                    posCount: positions.filter(p => p.departmentId === d.departmentId).length,
                    activePosCount: positions.filter(p => p.departmentId === d.departmentId && (p.status === 'Active' || p.isActive !== false)).length,
                })).sort((a, b) => b.posCount - a.posCount);

                const deptDonutSlices = [
                    { label: 'Active', value: activeDeptCount },
                    { label: 'Inactive', value: inactiveDeptCount },
                ];
                const posDonutSlices = [
                    { label: 'Active', value: activePosCount },
                    { label: 'Inactive', value: inactivePosCount },
                ];

                return (
                    <>
                        <div className="rm2-stats-grid">
                            <StatCard icon={<Building2 size={18} />} label="Total Departments" value={departments.length} subtext={`${activeDeptCount} active · ${inactiveDeptCount} inactive`} variant="primary" />
                            <StatCard icon={<Briefcase size={18} />} label="Total Positions" value={positions.length} subtext={`${activePosCount} active · ${inactivePosCount} inactive`} variant="success" />
                            <StatCard icon={<Shield size={18} />} label="Total Roles" value={roles.length} subtext={`${roles.filter(r => r.isSystemDefined).length} system · ${roles.filter(r => !r.isSystemDefined).length} custom`} variant="warning" />
                            <StatCard icon={<Users size={18} />} label="Employees on Record" value={totalEmployees > 0 ? totalEmployees : '—'} subtext="Across all departments" variant="primary" />
                        </div>

                        <div className="rm2-overview-grid">
                            <div className="rm2-overview-card">
                                <div className="rm2-overview-card__header">
                                    <TrendingUp size={15} />
                                    <span>Department Overview</span>
                                </div>
                                {departments.length === 0 ? (
                                    <div className="rm2-overview-empty"><Building2 size={28} /><p>No departments yet</p></div>
                                ) : (
                                    <div className="rm2-chart-area">
                                        <DonutChart slices={deptDonutSlices} total={departments.length} />
                                        <div className="rm2-chart-legend">
                                            {deptDonutSlices.map((s, i) => s.value > 0 && (
                                                <div key={i} className="rm2-legend-row">
                                                    <span className="rm2-legend-dot" style={{ background: ['#00A99D', '#FFB547'][i] }} />
                                                    <span>{s.label}</span>
                                                    <strong>{s.value} ({departments.length > 0 ? Math.round((s.value / departments.length) * 100) : 0}%)</strong>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="rm2-overview-card">
                                <div className="rm2-overview-card__header">
                                    <TrendingUp size={15} />
                                    <span>Position Overview</span>
                                </div>
                                {positions.length === 0 ? (
                                    <div className="rm2-overview-empty"><Briefcase size={28} /><p>No positions yet</p></div>
                                ) : (
                                    <div className="rm2-chart-area">
                                        <DonutChart slices={posDonutSlices} total={positions.length} />
                                        <div className="rm2-chart-legend">
                                            {posDonutSlices.map((s, i) => s.value > 0 && (
                                                <div key={i} className="rm2-legend-row">
                                                    <span className="rm2-legend-dot" style={{ background: ['#01B574', '#FFB547'][i] }} />
                                                    <span>{s.label}</span>
                                                    <strong>{s.value} ({positions.length > 0 ? Math.round((s.value / positions.length) * 100) : 0}%)</strong>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="rm2-overview-card rm2-overview-card--wide">
                                <div className="rm2-overview-card__header">
                                    <Activity size={15} />
                                    <span>Organization Activity Log</span>
                                    <button className="rm2-refresh-btn" onClick={fetchAuditLog} title="Refresh">
                                        <RefreshCw size={12} className={auditLoading ? 'rm2-spin' : ''} />
                                    </button>
                                </div>
                                {auditLoading ? (
                                    <div className="rm2-overview-empty"><Loader2 size={22} className="rm2-spin" /></div>
                                ) : auditEntries.length === 0 ? (
                                    <div className="rm2-overview-empty">
                                        <Clock size={28} />
                                        <p>No activity logs yet</p>
                                        <span className="rm2-overview-empty__hint">Logs will appear here once the backend audit logging is enabled.</span>
                                    </div>
                                ) : (
                                    <div className="rm2-audit-list">
                                        {auditEntries.map(entry => {
                                            const style = getAuditStyle(entry.action);
                                            return (
                                                <div key={entry.id} className="rm2-audit-item">
                                                    <div className="rm2-audit-icon" style={{ background: style.bg, color: style.color }}>
                                                        {style.icon}
                                                    </div>
                                                    <div className="rm2-audit-body">
                                                        <div className="rm2-audit-action">
                                                            <span className="rm2-audit-entity-type">{entry.entityType}</span>
                                                            {' '}{entry.action}
                                                            {entry.entityName && <> — <strong>{entry.entityName}</strong></>}
                                                        </div>
                                                        <div className="rm2-audit-meta">
                                                            by {entry.performedBy} · {formatRelativeTime(entry.performedAt)}
                                                            {entry.details && <span className="rm2-audit-detail"> · {entry.details}</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="rm2-overview-card">
                            <div className="rm2-overview-card__header">
                                <BarChart2 size={15} />
                                <span>Position Distribution by Department</span>
                            </div>
                            {posByDept.length === 0 ? (
                                <div className="rm2-overview-empty"><Briefcase size={28} /><p>No data yet</p></div>
                            ) : (
                                <div className="rm2-dist-table-wrap">
                                    <table className="rm2-dist-table">
                                        <thead>
                                            <tr>
                                                <th>Department</th>
                                                <th>Status</th>
                                                <th>Total Positions</th>
                                                <th>Active Positions</th>
                                                <th>Employees</th>
                                                <th>Distribution</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {posByDept.map(({ dept, posCount, activePosCount }) => {
                                                const pct = positions.length > 0 ? Math.round((posCount / positions.length) * 100) : 0;
                                                return (
                                                    <tr key={dept.departmentId}>
                                                        <td>
                                                            <div className="rm2-role-name-cell">
                                                                <div className="rm2-role-icon rm2-role-icon--dept"><Building2 size={13} /></div>
                                                                <div>
                                                                    <div className="rm2-role-name">{dept.name}</div>
                                                                    {dept.code && <div className="rm2-role-desc">{dept.code}</div>}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td><ActiveStatusBadge isActive={dept.status === 'Active' || dept.isActive !== false} /></td>
                                                        <td style={{ textAlign: 'center', fontWeight: 600 }}>{posCount}</td>
                                                        <td style={{ textAlign: 'center' }}>{activePosCount}</td>
                                                        <td style={{ textAlign: 'center' }}>{dept.employeeCount ?? 0}</td>
                                                        <td>
                                                            <div className="rm2-dist-bar-wrap">
                                                                <div className="rm2-dist-bar">
                                                                    <div className="rm2-dist-bar__fill" style={{ width: `${pct}%` }} />
                                                                </div>
                                                                <span className="rm2-dist-pct">{pct}%</span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </>
                );
            })()}

            {/* ─── Confirmation Modal ───────────────────────────────────────── */}
            <ConfirmationModal
                isOpen={confirmModal.isOpen} variant={confirmModal.variant}
                title={confirmModal.title} description={confirmModal.description}
                notice={confirmModal.notice} confirmLabel={confirmModal.confirmLabel}
                isLoading={actionLoading} onConfirm={confirmModal.onConfirm}
                onCancel={() => setConfirmModal(CONFIRM_CLOSED)} />
        </div>
    );
}