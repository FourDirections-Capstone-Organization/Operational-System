import { useEffect, useState, useRef } from 'react';
import {
    Building2, Briefcase, Users, ArrowRight, Loader2, AlertCircle, CheckCircle2,
    Plus, Pencil, Trash2, X, Search, RefreshCw, GitBranch, UserCircle2,
    Shield, Mail, Phone, Hash, XCircle, Eye, Download
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useToast } from '../../../components/Toast/Toast';
import DataTable, { ActionsDropdown } from '../../../components/ui/DataTable';
import SubTabNav from '../../../components/ui/SubTabNav';
import FormModal from '../../../components/FormModal/FormModal';
import ConfirmationModal from '../../../components/ConfirmationModal/ConfirmationModal';
import StatCard from '../../../components/StatCard/StatCard';
import StatusBadge from '../../../components/ui/StatusBadge';
import './OrgStructureTab.css';

// ─── Types ────────────────────────────────────────────────────────────────────

type SubTab = 'org-chart' | 'departments' | 'positions' | 'transfers';

interface DeptDTO {
    id: string;
    name: string;
    description?: string;
    isActive: boolean;
    createdAt: string;
    userCount: number;
    positionCount: number;
}

interface PosDTO {
    id: string;
    name: string;
    departmentId: string;
    departmentName?: string;
    isActive: boolean;
    createdAt: string;
    userCount: number;
}

interface EmployeeDTO {
    id: string;
    employeeNumber: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    suffix?: string;
    email: string;
    role: string;
    departmentId?: string;
    departmentName?: string;
    jobPositionId?: string;
    jobPositionName?: string;
    isActive: boolean;
    isDeactivated: boolean;
}

interface ConfirmState {
    isOpen: boolean;
    variant: 'danger' | 'warning' | 'info' | 'success' | 'neutral';
    title: string;
    description: React.ReactNode;
    confirmLabel?: string;
    onConfirm: () => void;
}

const CONFIRM_CLOSED: ConfirmState = { isOpen: false, variant: 'neutral', title: '', description: '', onConfirm: () => { } };

const ROLE_COLORS: Record<string, string> = {
    Manager: '#4318FF', Coordinator: '#00A99D', Dispatcher: '#FFB547',
    Encoder: '#01B574', Courier: '#E31A1A', Accountant: '#7551FF'
};

const ROLE_CLASSES: Record<string, string> = {
    Manager: 'manager-card', Coordinator: 'coordinator-card', Dispatcher: 'dispatcher-card',
    Encoder: 'encoder-card', Courier: 'courier-card'
};

const ROLE_MAP: Record<number, string> = { 0: 'Manager', 1: 'Coordinator', 2: 'Dispatcher', 3: 'Encoder', 4: 'Courier', 5: 'Accountant' };

const toDisplayRole = (role: any): string => {
    if (typeof role === 'number') return ROLE_MAP[role] || String(role);
    if (typeof role === 'string') {
        const n = parseInt(role, 10);
        if (!isNaN(n)) return ROLE_MAP[n] || role;
        return role;
    }
    return String(role || '');
};

const PER_PAGE = 10;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getAuthHeaders = (): HeadersInit => ({
    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
    'Content-Type': 'application/json',
});

const apiGet = async <T,>(url: string): Promise<T | null> => {
    try {
        const res = await fetch(url, { headers: getAuthHeaders() });
        if (!res.ok) return null;
        const json = await res.json();
        return (json?.data ?? json ?? null) as T;
    } catch { return null; }
};

const apiPost = async <T,>(url: string, body: any): Promise<{ ok: boolean; data?: T; message?: string }> => {
    try {
        const res = await fetch(url, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(body) });
        const json = await res.json();
        if (!res.ok) return { ok: false, message: json.message || json.Message || 'Request failed' };
        return { ok: true, data: json?.data ?? json };
    } catch (err: any) {
        return { ok: false, message: err.message || 'Network error' };
    }
};

const apiPut = async <T,>(url: string, body: any): Promise<{ ok: boolean; data?: T; message?: string }> => {
    try {
        const res = await fetch(url, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(body) });
        const json = await res.json();
        if (!res.ok) return { ok: false, message: json.message || json.Message || 'Request failed' };
        return { ok: true, data: json?.data ?? json };
    } catch (err: any) {
        return { ok: false, message: err.message || 'Network error' };
    }
};

const apiDelete = async (url: string): Promise<{ ok: boolean; message?: string }> => {
    try {
        const res = await fetch(url, { method: 'DELETE', headers: getAuthHeaders() });
        const json = await res.json();
        if (!res.ok) return { ok: false, message: json.message || json.Message || 'Request failed' };
        return { ok: true };
    } catch (err: any) {
        return { ok: false, message: err.message || 'Network error' };
    }
};

const buildName = (e: EmployeeDTO) => [e.firstName, e.middleName, e.lastName, e.suffix].filter(Boolean).join(' ');

// ─── View Members Modal ───────────────────────────────────────────────────────

function ViewMembersModal({ isOpen, onClose, title, members, icon }: {
    isOpen: boolean; onClose: () => void; title: string;
    members: EmployeeDTO[]; icon: React.ReactNode;
}) {
    const [search, setSearch] = useState('');
    const filtered = search
        ? members.filter(e => {
            const q = search.toLowerCase();
            return buildName(e).toLowerCase().includes(q)
                || e.employeeNumber.toLowerCase().includes(q)
                || e.email.toLowerCase().includes(q);
        })
        : members;

    return (
        <FormModal isOpen={isOpen} onClose={() => { setSearch(''); onClose(); }} title={title}
            subtitle={`${members.length} member${members.length !== 1 ? 's' : ''}`}
            size="lg"
            footer={
                <button className="fm-btn fm-btn-primary" onClick={() => { setSearch(''); onClose(); }}>Close</button>
            }
        >
            <div className="table-card-search-input-wrap" style={{ marginBottom: 14, width: '100%' }}>
                <Search size={14} className="table-card-search-icon" />
                <input type="text" className="table-card-search-input" value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search members by name, ID, or email..." />
            </div>
            {filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-secondary)' }}>
                    {icon}
                    <p style={{ marginTop: 8, fontSize: 13 }}>No members match your search.</p>
                </div>
            ) : (
                <div style={{ maxHeight: 380, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
                    {filtered.map(e => {
                        const role = toDisplayRole(e.role);
                        return (
                            <div key={e.id} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '10px 14px', borderBottom: '1px solid var(--border)',
                                transition: 'background 0.15s'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{
                                        width: 32, height: 32, borderRadius: '50%',
                                        background: ROLE_COLORS[role] || '#ccc', color: 'white',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 11, fontWeight: 700, flexShrink: 0
                                    }}>
                                        {buildName(e).split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 500 }}>{buildName(e)}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', gap: 8 }}>
                                            <span>#{e.employeeNumber}</span>
                                            <span>{e.jobPositionName || '—'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <StatusBadge status={role} size="sm" />
                                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{e.departmentName || '—'}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </FormModal>
    );
}

// ─── Org Chart Sub-Tab ────────────────────────────────────────────────────────

function OrgChartView({ departments, positions, employees }: {
    departments: DeptDTO[]; positions: PosDTO[]; employees: EmployeeDTO[];
}) {
    const chartRef = useRef<HTMLDivElement>(null);
    const [pdfLoading, setPdfLoading] = useState(false);
    const activeEmps = employees.filter(e => e.isActive && !e.isDeactivated);
    const byRole = (role: string) => activeEmps.filter(e => toDisplayRole(e.role) === role);
    const roles = ['Manager', 'Coordinator', 'Dispatcher', 'Encoder', 'Courier'];
    const hasRole = (r: string) => byRole(r).length > 0;

    const downloadPdf = async () => {
        if (!chartRef.current) return;
        setPdfLoading(true);
        try {
            const canvas = await html2canvas(chartRef.current, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
            });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            let heightLeft = pdfHeight;
            let position = 0;
            const pageHeight = pdf.internal.pageSize.getHeight();

            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
            heightLeft -= pageHeight;

            while (heightLeft > 0) {
                position -= pageHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
                heightLeft -= pageHeight;
            }

            pdf.save('organizational-chart.pdf');
        } catch (err) {
            console.error('PDF generation failed:', err);
        } finally {
            setPdfLoading(false);
        }
    };

    if (!roles.some(r => hasRole(r))) {
        return (
            <div className="org-chart-container" style={{ padding: 60 }}>
                <Users size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
                <div style={{ fontWeight: 600 }}>No employees assigned yet</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Add employees with roles to see the organizational chart.</div>
            </div>
        );
    }

    return (
        <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>Organizational Chart</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button className="btn btn-outline btn-sm" onClick={downloadPdf} disabled={pdfLoading}>
                        {pdfLoading ? <Loader2 size={14} className="fm-spin" /> : <Download size={14} />}
                        {pdfLoading ? 'Generating...' : 'Download PDF'}
                    </button>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{activeEmps.length} employee{activeEmps.length !== 1 ? 's' : ''}</span>
                </div>
            </div>
            <div className="org-chart-container" ref={chartRef}>
                {hasRole('Manager') && (
                    <>
                        <div className="org-chart-level">
                            <div className="org-chart-level-label">Management</div>
                            <div className="org-chart-level-row">
                                {byRole('Manager').map(e => (
                                    <div key={e.id} className="org-chart-node">
                                        <div className="org-chart-node-card manager-card">
                                            <div className="node-role" style={{ color: ROLE_COLORS.Manager }}>Manager</div>
                                            <div style={{ fontSize: 13, fontWeight: 500 }}>{buildName(e)}</div>
                                            <div className="node-count">{e.departmentName || '—'}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="org-chart-connector" />
                    </>
                )}

                {hasRole('Coordinator') && (
                    <>
                        <div className="org-chart-level">
                            <div className="org-chart-level-label">Coordinators</div>
                            <div className="org-chart-level-row">
                                {byRole('Coordinator').map(e => (
                                    <div key={e.id} className="org-chart-node">
                                        <div className="org-chart-node-card coordinator-card">
                                            <div className="node-role" style={{ color: ROLE_COLORS.Coordinator }}>Coordinator</div>
                                            <div style={{ fontSize: 13, fontWeight: 500 }}>{buildName(e)}</div>
                                            <div className="node-count">{e.departmentName || '—'} • {e.jobPositionName || '—'}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="org-chart-connector" />
                    </>
                )}

                <div className="org-chart-level">
                    <div className="org-chart-level-label">Staff</div>
                    <div className="org-chart-level-row" style={{ alignItems: 'flex-start' }}>
                        {departments.filter(d => d.isActive).map(dept => {
                            const staff = activeEmps.filter(e =>
                                e.departmentId === dept.id &&
                                !['Manager', 'Coordinator', 'Accountant'].includes(toDisplayRole(e.role))
                            );
                            if (staff.length === 0) return null;
                            return (
                                <div key={dept.id} className="org-chart-department-group">
                                    <div className="dept-header">{dept.name}</div>
                                    <div className="dept-members">
                                        {staff.map(e => {
                                            const role = toDisplayRole(e.role);
                                            return (
                                                <div key={e.id} className="dept-member" style={{ borderLeft: `3px solid ${ROLE_COLORS[role] || '#ccc'}` }}>
                                                    <span style={{ fontWeight: 500, fontSize: 13 }}>{buildName(e)}</span>
                                                    <span style={{ fontSize: 11, color: ROLE_COLORS[role] || '#999', fontWeight: 600 }}>{role}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Departments Table ────────────────────────────────────────────────────────

function DepartmentsView({ departments, employees, onRefresh }: {
    departments: DeptDTO[]; employees: EmployeeDTO[]; onRefresh: () => void;
}) {
    const { success, error } = useToast();
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<DeptDTO | null>(null);
    const [formName, setFormName] = useState('');
    const [formDesc, setFormDesc] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [apiErr, setApiErr] = useState('');
    const [confirm, setConfirm] = useState<ConfirmState>(CONFIRM_CLOSED);
    const [viewDept, setViewDept] = useState<DeptDTO | null>(null);

    const filtered = departments.filter(d => {
        if (!search) return true;
        const q = search.toLowerCase();
        return d.name.toLowerCase().includes(q) || (d.description || '').toLowerCase().includes(q);
    });
    const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
    const totalPages = Math.ceil(filtered.length / PER_PAGE) || 1;
    const activeDepts = departments.filter(d => d.isActive).length;

    const openCreate = () => { setEditing(null); setFormName(''); setFormDesc(''); setApiErr(''); setShowForm(true); };
    const openEdit = (d: DeptDTO) => { setEditing(d); setFormName(d.name); setFormDesc(d.description || ''); setApiErr(''); setShowForm(true); };

    const handleSubmit = async () => {
        const name = formName.trim();
        if (!name) { setApiErr('Department name is required.'); return; }
        setSubmitting(true); setApiErr('');
        const res = editing
            ? await apiPut(`/api/department/${editing.id}`, { name, description: formDesc.trim() || null })
            : await apiPost('/api/department', { name, description: formDesc.trim() || null });
        setSubmitting(false);
        if (!res.ok) { setApiErr(res.message || 'Failed to save department.'); return; }
        success(editing ? 'Department updated.' : 'Department created.');
        setShowForm(false);
        onRefresh();
    };

    const handleDelete = (d: DeptDTO) => {
        if (d.userCount > 0) {
            setConfirm({
                isOpen: true, variant: 'warning', title: 'Cannot Delete',
                description: <>Transfer users out of <strong>{d.name}</strong> first before deactivating.</>,
                confirmLabel: 'Okay', onConfirm: () => setConfirm(CONFIRM_CLOSED),
            });
            return;
        }
        setConfirm({
            isOpen: true, variant: 'danger', title: 'Deactivate Department?',
            description: <>Are you sure you want to deactivate <strong>{d.name}</strong>?</>,
            confirmLabel: 'Deactivate',
            onConfirm: async () => {
                const res = await apiDelete(`/api/department/${d.id}`);
                if (!res.ok) { error(res.message || 'Failed.'); setConfirm(CONFIRM_CLOSED); return; }
                success('Department deactivated.');
                setConfirm(CONFIRM_CLOSED);
                onRefresh();
            },
        });
    };

    const deptMembers = (deptId: string) => employees.filter(e => e.departmentId === deptId && e.isActive && !e.isDeactivated);

    return (
        <div className="org-content">
            <div className="org-stats-grid">
                <StatCard icon={<Building2 size={18} />} label="Total Departments" value={departments.length} subtext="In the organization" variant="primary" />
                <StatCard icon={<CheckCircle2 size={18} />} label="Active" value={activeDepts} subtext="Currently operational" variant="success" />
                <StatCard icon={<XCircle size={18} />} label="Inactive" value={departments.length - activeDepts} subtext="Deactivated" variant="warning" />
                <StatCard icon={<Briefcase size={18} />} label="Positions" value={departments.reduce((s, d) => s + d.positionCount, 0)} subtext="Across all depts" variant="primary" />
            </div>

            <DataTable
                title="Departments" totalResults={filtered.length}
                searchQuery={search} setSearchQuery={v => { setSearch(v); setPage(1); }}
                searchPlaceholder="Search by name or description…"
                headers={['Department', 'Description', 'Status', 'Users', 'Positions', 'Actions']}
                loading={false} emptyMessage="No departments found." emptyIcon={<Building2 size={20} />}
                actionButton={{ label: 'Add Department', icon: <Plus size={14} />, onClick: openCreate }}
                currentPage={page} totalPages={totalPages} onPageChange={setPage}
            >
                {paged.map(d => (
                    <tr key={d.id}>
                        <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => setViewDept(d)}>
                                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#e6faf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Building2 size={15} color="var(--primary)" />
                                </div>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 600 }}>{d.name}</div>
                                </div>
                            </div>
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--text-secondary)', maxWidth: 250 }}>{d.description || '—'}</td>
                        <td><StatusBadge status={d.isActive ? 'Active' : 'Inactive'} /></td>
                        <td><span style={{ fontWeight: 500, fontSize: 13 }}>{d.userCount}</span></td>
                        <td><span style={{ fontWeight: 500, fontSize: 13 }}>{d.positionCount}</span></td>
                        <td>
                            <ActionsDropdown actions={[
                                { label: 'View Members', icon: <Eye size={13} />, onClick: () => setViewDept(d) },
                                { label: 'Edit', icon: <Pencil size={13} />, onClick: () => openEdit(d) },
                                { label: 'Deactivate', icon: <Trash2 size={13} />, onClick: () => handleDelete(d), variant: 'danger' },
                            ]} />
                        </td>
                    </tr>
                ))}
            </DataTable>

            {viewDept && (
                <ViewMembersModal isOpen={true} onClose={() => setViewDept(null)}
                    title={`${viewDept.name} Members`} icon={<Building2 size={24} />}
                    members={deptMembers(viewDept.id)} />
            )}

            {showForm && (
                <FormModal isOpen={true} onClose={() => setShowForm(false)} title={editing ? 'Edit Department' : 'New Department'}
                    subtitle={editing ? 'Update department details.' : 'Create a new department.'}
                    apiError={apiErr} onSubmit={handleSubmit} isSubmitting={submitting} submitLabel={editing ? 'Save Changes' : 'Create Department'} size="sm">
                    <div className="fm-field">
                        <label className="fm-label">Department Name <span style={{ color: 'var(--status-failed)' }}>*</span></label>
                        <input className="fm-input" value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. Dispatch Team" maxLength={100} />
                    </div>
                    <div className="fm-field">
                        <label className="fm-label">Description</label>
                        <textarea className="fm-input" value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Optional description" maxLength={500} rows={3} style={{ resize: 'vertical' }} />
                    </div>
                </FormModal>
            )}

            <ConfirmationModal {...confirm} onCancel={() => setConfirm(CONFIRM_CLOSED)} />
        </div>
    );
}

// ─── Positions Table ──────────────────────────────────────────────────────────

function PositionsView({ positions, departments, employees, onRefresh }: {
    positions: PosDTO[]; departments: DeptDTO[]; employees: EmployeeDTO[]; onRefresh: () => void;
}) {
    const { success, error } = useToast();
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [filterDept, setFilterDept] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<PosDTO | null>(null);
    const [formName, setFormName] = useState('');
    const [formDeptId, setFormDeptId] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [apiErr, setApiErr] = useState('');
    const [confirm, setConfirm] = useState<ConfirmState>(CONFIRM_CLOSED);
    const [viewPos, setViewPos] = useState<PosDTO | null>(null);

    const filtered = positions.filter(p => {
        if (filterDept && p.departmentId !== filterDept) return false;
        if (!search) return true;
        const q = search.toLowerCase();
        return p.name.toLowerCase().includes(q) || (p.departmentName || '').toLowerCase().includes(q);
    });
    const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
    const totalPages = Math.ceil(filtered.length / PER_PAGE) || 1;
    const activePositions = positions.filter(p => p.isActive).length;

    const openCreate = () => { setEditing(null); setFormName(''); setFormDeptId(''); setApiErr(''); setShowForm(true); };
    const openEdit = (p: PosDTO) => { setEditing(p); setFormName(p.name); setFormDeptId(p.departmentId); setApiErr(''); setShowForm(true); };

    const handleSubmit = async () => {
        if (!formName.trim() || !formDeptId) { setApiErr('Name and department are required.'); return; }
        setSubmitting(true); setApiErr('');
        const res = editing
            ? await apiPut(`/api/job-positions/${editing.id}`, { name: formName.trim(), departmentId: formDeptId })
            : await apiPost('/api/job-positions', { name: formName.trim(), departmentId: formDeptId });
        setSubmitting(false);
        if (!res.ok) { setApiErr(res.message || 'Failed to save position.'); return; }
        success(editing ? 'Position updated.' : 'Position created.');
        setShowForm(false);
        onRefresh();
    };

    const handleDelete = (p: PosDTO) => {
        if (p.userCount > 0) {
            setConfirm({
                isOpen: true, variant: 'warning', title: 'Cannot Delete',
                description: <>Transfer users out of <strong>{p.name}</strong> first before deactivating.</>,
                confirmLabel: 'Okay', onConfirm: () => setConfirm(CONFIRM_CLOSED),
            });
            return;
        }
        setConfirm({
            isOpen: true, variant: 'danger', title: 'Deactivate Position?',
            description: <>Are you sure you want to deactivate <strong>{p.name}</strong>?</>,
            confirmLabel: 'Deactivate',
            onConfirm: async () => {
                const res = await apiDelete(`/api/job-positions/${p.id}`);
                if (!res.ok) { error(res.message || 'Failed.'); setConfirm(CONFIRM_CLOSED); return; }
                success('Position deactivated.');
                setConfirm(CONFIRM_CLOSED);
                onRefresh();
            },
        });
    };

    const posMembers = (posId: string) => employees.filter(e => e.jobPositionId === posId && e.isActive && !e.isDeactivated);

    return (
        <div className="org-content">
            <div className="org-stats-grid">
                <StatCard icon={<Briefcase size={18} />} label="Total Positions" value={positions.length} subtext="Across all departments" variant="primary" />
                <StatCard icon={<CheckCircle2 size={18} />} label="Active" value={activePositions} subtext="Currently operational" variant="success" />
                <StatCard icon={<XCircle size={18} />} label="Inactive" value={positions.length - activePositions} subtext="Deactivated" variant="warning" />
                <StatCard icon={<Building2 size={18} />} label="Departments" value={departments.length} subtext="Available" variant="primary" />
            </div>

            <DataTable
                title="Job Positions" totalResults={filtered.length}
                searchQuery={search} setSearchQuery={v => { setSearch(v); setPage(1); }}
                searchPlaceholder="Search by name or department…"
                headers={['Position', 'Department', 'Status', 'Users', 'Actions']}
                loading={false} emptyMessage="No positions found." emptyIcon={<Briefcase size={20} />}
                actionButton={{ label: 'Add Position', icon: <Plus size={14} />, onClick: openCreate }}
                currentPage={page} totalPages={totalPages} onPageChange={setPage}
                filterElements={
                    <select value={filterDept} onChange={e => { setFilterDept(e.target.value); setPage(1); }}
                        style={{ height: 36, borderRadius: 8, border: '1.5px solid var(--border)', padding: '0 10px', fontSize: 13, minWidth: 160, boxSizing: 'border-box', outline: 'none', cursor: 'pointer', background: '#fff' }}>
                        <option value="">All Departments</option>
                        {departments.filter(d => d.isActive).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                }
            >
                {paged.map(p => (
                    <tr key={p.id}>
                        <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => setViewPos(p)}>
                                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#fff3db', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Briefcase size={15} color="#FFB547" />
                                </div>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
                                </div>
                            </div>
                        </td>
                        <td><span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{p.departmentName || '—'}</span></td>
                        <td><StatusBadge status={p.isActive ? 'Active' : 'Inactive'} /></td>
                        <td><span style={{ fontWeight: 500, fontSize: 13 }}>{p.userCount}</span></td>
                        <td>
                            <ActionsDropdown actions={[
                                { label: 'View Members', icon: <Eye size={13} />, onClick: () => setViewPos(p) },
                                { label: 'Edit', icon: <Pencil size={13} />, onClick: () => openEdit(p) },
                                { label: 'Deactivate', icon: <Trash2 size={13} />, onClick: () => handleDelete(p), variant: 'danger' },
                            ]} />
                        </td>
                    </tr>
                ))}
            </DataTable>

            {viewPos && (
                <ViewMembersModal isOpen={true} onClose={() => setViewPos(null)}
                    title={`${viewPos.name} - Members`} icon={<Briefcase size={24} />}
                    members={posMembers(viewPos.id)} />
            )}

            {showForm && (
                <FormModal isOpen={true} onClose={() => setShowForm(false)} title={editing ? 'Edit Position' : 'New Position'}
                    subtitle={editing ? 'Update position details.' : 'Create a new job position.'}
                    apiError={apiErr} onSubmit={handleSubmit} isSubmitting={submitting} submitLabel={editing ? 'Save Changes' : 'Create Position'} size="sm">
                    <div className="fm-field">
                        <label className="fm-label">Position Name <span style={{ color: 'var(--status-failed)' }}>*</span></label>
                        <input className="fm-input" value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. Operational Admin" maxLength={100} />
                    </div>
                    <div className="fm-field">
                        <label className="fm-label">Department <span style={{ color: 'var(--status-failed)' }}>*</span></label>
                        <select className="fm-select" value={formDeptId} onChange={e => setFormDeptId(e.target.value)}>
                            <option value="">Select department</option>
                            {departments.filter(d => d.isActive).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                    </div>
                </FormModal>
            )}

            <ConfirmationModal {...confirm} onCancel={() => setConfirm(CONFIRM_CLOSED)} />
        </div>
    );
}

// ─── Transfers Sub-Tab ────────────────────────────────────────────────────────

function TransfersView({ employees, departments, positions, onRefresh }: {
    employees: EmployeeDTO[]; departments: DeptDTO[]; positions: PosDTO[]; onRefresh: () => void;
}) {
    const { success, error } = useToast();
    const [search, setSearch] = useState('');
    const [selectedEmp, setSelectedEmp] = useState<EmployeeDTO | null>(null);
    const [targetDeptId, setTargetDeptId] = useState('');
    const [targetPosId, setTargetPosId] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [apiErr, setApiErr] = useState('');
    const [confirmTransfer, setConfirmTransfer] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');

    const activeEmps = employees.filter(e => e.isActive && !e.isDeactivated);
    const filteredEmps = search
        ? activeEmps.filter(e => {
            const name = buildName(e).toLowerCase();
            const num = e.employeeNumber.toLowerCase();
            const q = search.toLowerCase();
            return name.includes(q) || num.includes(q) || e.email.toLowerCase().includes(q);
        })
        : activeEmps.slice(0, 20);

    const targetPositions = targetDeptId
        ? positions.filter(p => p.departmentId === targetDeptId)
        : [];

    const resetForm = () => { setSelectedEmp(null); setTargetDeptId(''); setTargetPosId(''); setApiErr(''); setConfirmTransfer(false); };

    const handleTransfer = () => {
        if (!selectedEmp || !targetDeptId || !targetPosId) { setApiErr('Please complete all fields.'); return; }
        setConfirmTransfer(true);
    };

    const doTransfer = async () => {
        setSubmitting(true); setApiErr('');
        const res = await apiPost(`/api/transfer/${selectedEmp!.id}`, {
            newDepartmentId: targetDeptId,
            newJobPositionId: targetPosId,
        });
        setSubmitting(false);
        if (!res.ok) { setApiErr(res.message || 'Transfer failed.'); setConfirmTransfer(false); return; }
        success('Employee transferred successfully.');
        const deptName = departments.find(d => d.id === targetDeptId)?.name || '';
        const posName = positions.find(p => p.id === targetPosId)?.name || '';
        setSuccessMsg(`${buildName(selectedEmp!)} transferred to ${deptName} (${posName})`);
        setShowSuccess(true);
        resetForm();
        onRefresh();
    };

    const targetDept = departments.find(d => d.id === targetDeptId);
    const targetPos = positions.find(p => p.id === targetPosId);

    return (
        <div className="org-content">
            <div className="card">
                <div className="transfer-layout">
                    <div className="transfer-panel">
                        <h4 className="transfer-panel-title"><UserCircle2 size={16} /> Select Employee</h4>
                        <div className="table-card-search-input-wrap" style={{ marginBottom: 10, width: '100%' }}>
                            <Search size={14} className="table-card-search-icon" />
                            <input type="text" className="table-card-search-input" value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search by name, ID, or email..." />
                        </div>
                        <div className="employee-select-list" style={{ maxHeight: 320 }}>
                            {filteredEmps.length === 0 ? (
                                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>No employees found.</div>
                            ) : filteredEmps.map(e => (
                                <div key={e.id} className={`employee-select-item${selectedEmp?.id === e.id ? ' selected' : ''}`}
                                    onClick={() => { setSelectedEmp(e); setTargetDeptId(''); setTargetPosId(''); setApiErr(''); }}>
                                    <div>
                                        <div className="esi-name">{buildName(e)}</div>
                                        <div className="esi-detail">#{e.employeeNumber} • {toDisplayRole(e.role)} • {e.departmentName || '—'}</div>
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{e.jobPositionName || '—'}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="transfer-divider" />

                    <div className="transfer-panel">
                        <h4 className="transfer-panel-title"><ArrowRight size={16} /> Transfer Destination</h4>
                        <div className="transfer-fields">
                            <div className="tf-field">
                                <label className="tf-label">Target Department <span style={{ color: 'var(--status-failed)' }}>*</span></label>
                                <select className="fm-select" value={targetDeptId}
                                    onChange={e => { setTargetDeptId(e.target.value); setTargetPosId(''); }}
                                    disabled={!selectedEmp}
                                    style={{ opacity: !selectedEmp ? 0.6 : 1, cursor: !selectedEmp ? 'not-allowed' : 'pointer' }}>
                                    <option value="">{selectedEmp ? 'Select department' : 'Select employee first'}</option>
                                    {departments.filter(d => d.isActive && d.id !== selectedEmp?.departmentId).map(d => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="tf-field">
                                <label className="tf-label">Target Position <span style={{ color: 'var(--status-failed)' }}>*</span></label>
                                <select className="fm-select" value={targetPosId} onChange={e => setTargetPosId(e.target.value)}
                                    disabled={!targetDeptId}
                                    style={{ opacity: !targetDeptId ? 0.6 : 1, cursor: !targetDeptId ? 'not-allowed' : 'pointer' }}>
                                    <option value="">{targetDeptId ? 'Select position' : 'Select department first'}</option>
                                    {targetPositions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                        </div>

                        {selectedEmp && targetDept && targetPos && (
                            <div className="transfer-preview" style={{ marginTop: 16 }}>
                                <div className="tp-row"><span className="tp-label">Employee</span><span className="tp-value">{buildName(selectedEmp)}</span></div>
                                <div className="tp-row"><span className="tp-label">From</span><span className="tp-value">{selectedEmp.departmentName || '—'} → {selectedEmp.jobPositionName || '—'}</span></div>
                                <div className="tp-row"><span className="tp-label">To</span><span className="tp-value tp-highlight">{targetDept.name} → {targetPos.name}</span></div>
                                <div className="tp-row"><span className="tp-label">Role</span><span className="tp-value">{toDisplayRole(selectedEmp.role)}</span></div>
                            </div>
                        )}

                        {apiErr && (
                            <div className="transfer-error"><AlertCircle size={14} /> {apiErr}</div>
                        )}

                        <button className="btn btn-primary transfer-btn"
                            disabled={!targetPosId || submitting} onClick={handleTransfer}>
                            {submitting ? <Loader2 size={15} className="fm-spin" /> : <ArrowRight size={15} />}
                            {submitting ? 'Transferring...' : 'Transfer Employee'}
                        </button>
                    </div>
                </div>
            </div>

            <ConfirmationModal isOpen={confirmTransfer} variant="warning" title="Confirm Transfer"
                description={
                    selectedEmp && targetDept && targetPos ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div>Transfer <strong>{buildName(selectedEmp)}</strong>?</div>
                            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>From: {selectedEmp.departmentName || '—'} → {selectedEmp.jobPositionName || '—'}</div>
                            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>To: <strong style={{ color: 'var(--primary)' }}>{targetDept.name}</strong> → <strong style={{ color: 'var(--primary)' }}>{targetPos.name}</strong></div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'var(--bg-input)', padding: '8px 10px', borderRadius: 6, marginTop: 4 }}>
                                Task visibility and assignment scope will update for the new department.
                            </div>
                        </div>
                    ) : ''
                }
                confirmLabel="Confirm Transfer" isLoading={submitting}
                onConfirm={doTransfer} onCancel={() => setConfirmTransfer(false)}
            />

            {showSuccess && (
                <FormModal isOpen={true} onClose={() => setShowSuccess(false)} size="sm"
                    title="Transfer Complete" subtitle={successMsg}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'var(--status-active-bg)', border: '1px solid rgba(5,150,105,0.25)', borderRadius: 10, padding: '10px 14px', marginBottom: 20, fontSize: 13 }}>
                        <CheckCircle2 size={15} style={{ flexShrink: 0 }} color="var(--status-active)" />
                        <span>Employee transferred successfully. Task visibility updated.</span>
                    </div>
                    <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setShowSuccess(false)}>Done</button>
                </FormModal>
            )}
        </div>
    );
}

// ─── Main OrgStructureTab ─────────────────────────────────────────────────────

export default function OrgStructureTab() {
    const [subTab, setSubTab] = useState<SubTab>('org-chart');
    const [departments, setDepartments] = useState<DeptDTO[]>([]);
    const [positions, setPositions] = useState<PosDTO[]>([]);
    const [employees, setEmployees] = useState<EmployeeDTO[]>([]);
    const [loading, setLoading] = useState(true);

    const SUB_TABS: { key: SubTab; label: string }[] = [
        { key: 'org-chart', label: 'Org Chart' },
        { key: 'departments', label: 'Departments' },
        { key: 'positions', label: 'Job Positions' },
        { key: 'transfers', label: 'Transfers' },
    ];

    const fetchAll = async () => {
        setLoading(true);
        const [depts, pos, emps] = await Promise.all([
            apiGet<DeptDTO[]>('/api/department'),
            apiGet<PosDTO[]>('/api/job-positions'),
            apiGet<EmployeeDTO[]>('/api/user'),
        ]);
        if (depts) setDepartments(depts);
        if (pos) setPositions(pos);
        if (emps) setEmployees(emps);
        setLoading(false);
    };

    useEffect(() => { fetchAll(); }, []);

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 80, flexDirection: 'column', gap: 12 }}>
                <Loader2 size={28} className="fm-spin" style={{ color: 'var(--primary)' }} />
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Loading organization data...</span>
            </div>
        );
    }

    return (
        <div className="org-root">
            <SubTabNav tabs={SUB_TABS} activeTab={subTab} onTabChange={t => setSubTab(t as SubTab)} />

            {subTab === 'org-chart' && <OrgChartView departments={departments} positions={positions} employees={employees} />}
            {subTab === 'departments' && <DepartmentsView departments={departments} employees={employees} onRefresh={fetchAll} />}
            {subTab === 'positions' && <PositionsView positions={positions} departments={departments} employees={employees} onRefresh={fetchAll} />}
            {subTab === 'transfers' && <TransfersView employees={employees} departments={departments} positions={positions} onRefresh={fetchAll} />}
        </div>
    );
}
