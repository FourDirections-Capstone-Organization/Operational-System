import React, { useEffect, useState, useRef } from 'react';
import { HubConnectionBuilder, HubConnection } from '@microsoft/signalr';
import { useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    ClipboardList,
    UserCircle2,
    CheckCircle2,
    Clock,
    AlertCircle,
    ChevronRight,
    X,
    Save,
    Eye,
    EyeOff,
    Pencil,
    Lock,
    User,
    Phone,
    Loader2,
    Hash,
    Shield,
    CalendarDays,
    CalendarCheck,
    CalendarX,
    CalendarClock,
    FileText,
    Plus,
    ChevronDown,
    ChevronUp,
    ChevronLeft,
    MessageSquare,
    RefreshCw,
    LogOut,
    Mail,
    Activity,
    Search,
} from 'lucide-react';
import './OpEmployee_Dashboard.css';
import NotificationBell from '../../components/NotificationBell/NotificationBell';
import LeaveRequestModal, {
    LeaveRecord,
    LeaveType,
    LeaveStatus,
    LEAVE_TYPES,
} from '../../components/LeaveRequestModal/LeaveRequestModal';
import { usePreventBackNav } from '../../components/Auth/usePreventBackNav';
import { useToast } from '../../components/Toast/Toast';
import DashboardHeader from '../../components/DashboardHeader/DashboardHeader';
import StatCard from '../../components/StatCard/StatCard';
import Digital201FileView from '../SystemAdmin_Dashboard/Digital201FileView/Digital201FileView';
import ApprovalTracker, { TrackerData } from '../../components/ApprovalTracker/ApprovalTracker';
import FormModal from '../../components/FormModal/FormModal';
import EmptyState from '../../components/ui/EmptyState';
import DataTable from '../../components/ui/DataTable';
import TaskComments from '../../components/TaskComments/TaskComments';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getAccountIdFromToken = (): string => {
    try {
        const token = localStorage.getItem('authToken');
        if (!token) return '';
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload?.nameidentifier || payload?.sub || '';
    } catch { return ''; }
};

// ─── Types ────────────────────────────────────────────────────────────────────

type Priority = 'high' | 'medium' | 'low';
type TaskStatus = 'pending' | 'assigned' | 'in-progress' | 'pending-review' | 'done' | 'completed' | 'overdue';
type NavTab = 'dashboard' | 'my-tasks' | 'leave' | 'profile' | 'digital_201' | 'activity_logs';

interface Task {
    id: string;
    name: string;
    description: string;
    deadline: string;
    priority: Priority;
    status: TaskStatus;
    progress: number;
    assignedBy: string;
    remarks?: string;
    category?: string;
    supportingEvidenceUrl?: string;
    referenceNumber?: string;
}

interface TaskResponseDTO {
    taskId: string;
    taskTitle: string;
    taskDescription?: string;
    taskCategory?: string;
    priority: string;
    dueAt: string;
    taskStatus: string;
    assignedEmployee: string;
    createdByEmployee: string;
    createdAt: string;
    supportingEvidenceUrl?: string;
    taskReferenceNumber?: string;
}

interface UserProfile {
    employeeId: string;
    fullName: string;
    phone: string;
    email: string;
    role: string;
    accountStatus: string;
    presenceStatus?: string;
}

// ─── API Helpers ──────────────────────────────────────────────────────────────

const authHeader = (): HeadersInit => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('authToken') ?? ''}`,
});

const dtoToLeaveRecord = (dto: any): LeaveRecord => {
    const statusMap: Record<string, LeaveStatus> = {
        Pending: 'Pending', pending: 'Pending',
        Approved: 'Approved', approved: 'Approved',
        Declined: 'Declined', declined: 'Declined',
        Rejected: 'Declined', rejected: 'Declined',
    };
    const leaveTypeMap: Record<string, LeaveType> = {
        vacation: 'vacation', sick: 'sick', 'sick leave': 'sick',
        emergency: 'emergency', personal: 'personal',
        maternity: 'maternity', paternity: 'maternity', other: 'other',
    };
    const rawLeaveType = (dto.leave_Type ?? dto.Leave_Type ?? dto.leaveType ?? '').toLowerCase();
    const rawStatus = dto.approval_Status ?? dto.Approval_Status ?? dto.approvalStatus ?? '';
    const rawStart = dto.start_Date ?? dto.Start_Date ?? dto.startDate ?? '';
    const rawEnd = dto.end_Date ?? dto.End_Date ?? dto.endDate ?? '';
    return {
        id: dto.leaveId ?? dto.LeaveId ?? String(Date.now()),
        leaveType: leaveTypeMap[rawLeaveType] ?? 'other',
        startDate: rawStart.split('T')[0],
        endDate: rawEnd.split('T')[0],
        reason: dto.reason ?? dto.Reason ?? '',
        status: statusMap[rawStatus] ?? 'Pending',
        submittedAt: rawStart.split('T')[0],
        reviewedBy: dto.approvedBy ?? dto.Approved_By ?? undefined,
        reviewNote: dto.leaveRequestNote ?? dto.LeaveRequestNote ?? undefined,
    };
};

const dtoToTask = (dto: TaskResponseDTO): Task => {
    const priorityMap: Record<string, Priority> = {
        High: 'high', Medium: 'medium', Low: 'low',
    };
    const statusMap: Record<string, TaskStatus> = {
        Draft: 'pending', Pending: 'pending', Assigned: 'assigned',
        'In Progress': 'in-progress', 'Pending Admin Review': 'pending-review', Done: 'done', Completed: 'completed',
    };
    const status: TaskStatus = statusMap[dto.taskStatus] ?? 'pending';
    const defaultProgress: Record<TaskStatus, number> = {
        pending: 0, assigned: 0, 'in-progress': 50, 'pending-review': 90, done: 90, completed: 100, overdue: 0,
    };
    return {
        id: dto.taskId,
        name: dto.taskTitle,
        description: dto.taskDescription ?? '',
        deadline: dto.dueAt ? dto.dueAt.split('T')[0] : '',
        priority: priorityMap[dto.priority] ?? 'medium',
        status,
        progress: defaultProgress[status],
        assignedBy: dto.createdByEmployee,
        category: dto.taskCategory,
        supportingEvidenceUrl: dto.supportingEvidenceUrl,
        referenceNumber: dto.taskReferenceNumber,
    };
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (d: string): string => {
    if (!d) return '—';
    return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
    });
};

const isEffectivelyOverdue = (t: Task): boolean =>
    t.status !== 'completed' && t.status !== 'done' && t.status !== 'pending-review' && t.status !== 'assigned' && !!t.deadline && new Date(t.deadline + 'T00:00:00') < new Date();

const effectiveStatus = (t: Task): TaskStatus =>
    isEffectivelyOverdue(t) ? 'overdue' : t.status;

const toDisplayRole = (role: string) => role.replace(/([a-z])([A-Z])/g, '$1 $2');

const calcDays = (start: string, end: string): number =>
    Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1;

const getInitials = (name: string): string => {
    if (!name) return 'OP';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
};

// ─── Meta Maps ────────────────────────────────────────────────────────────────

const statusMeta: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    pending: { label: 'Pending', cls: 'badge-blue', icon: <Clock size={11} /> },
    assigned: { label: 'Assigned', cls: 'badge-purple', icon: <Clock size={11} /> },
    'in-progress': { label: 'In Progress', cls: 'badge-amber', icon: <Loader2 size={11} /> },
    'pending-review': { label: 'Pending Review', cls: 'badge-purple', icon: <Eye size={11} /> },
    done: { label: 'Done', cls: 'badge-blue', icon: <CheckCircle2 size={11} /> },
    completed: { label: 'Completed', cls: 'badge-green', icon: <CheckCircle2 size={11} /> },
    overdue: { label: 'Overdue', cls: 'badge-red', icon: <AlertCircle size={11} /> },
};

const FSM_EMPLOYEE_TRANSITIONS: Record<string, TaskStatus[]> = {
    pending: ['in-progress'],
    assigned: ['in-progress'],
    'in-progress': ['pending-review'],
    done: [],
    completed: [],
};

const priorityMeta: Record<Priority, { cls: string; bar: string }> = {
    high: { cls: 'prio-high', bar: 'bar-red' },
    medium: { cls: 'prio-medium', bar: 'bar-amber' },
    low: { cls: 'prio-low', bar: 'bar-green' },
};

const leaveStatusMeta: Record<LeaveStatus, { label: string; cls: string; icon: React.ReactNode }> = {
    Pending: { label: 'Pending', cls: 'badge-amber', icon: <CalendarClock size={12} /> },
    Approved: { label: 'Approved', cls: 'badge-green', icon: <CalendarCheck size={12} /> },
    Declined: { label: 'Declined', cls: 'badge-red', icon: <CalendarX size={12} /> },
};

const leaveTypeLabel = (key: LeaveType) =>
    LEAVE_TYPES.find(lt => lt.key === key)?.label ?? key;

// ─── Nav Config ───────────────────────────────────────────────────────────────

const NAV_GROUPS: { label: string; items: { tab: NavTab; icon: React.FC<any>; label: string }[] }[] = [
    {
        label: 'MAIN MENU',
        items: [
            { tab: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { tab: 'my-tasks', icon: ClipboardList, label: 'My Tasks' },
        ],
    },
    {
        label: 'PERSONAL',
        items: [
            { tab: 'digital_201', icon: FileText, label: 'Digital 201 File' },
            { tab: 'leave', icon: CalendarDays, label: 'Leave' },
            { tab: 'profile', icon: UserCircle2, label: 'Profile' },
            { tab: 'activity_logs', icon: Activity, label: 'Activity Logs' },
        ],
    },
];

// ─── Task Detail Modal ────────────────────────────────────────────────────────

interface TaskDetailProps {
    task: Task;
    onUpdate: () => void;
    onClose: () => void;
}

const TaskDetail: React.FC<TaskDetailProps> = ({ task, onUpdate, onClose }) => {
    const es = effectiveStatus(task);
    const sm = statusMeta[es];
    const pm = priorityMeta[task.priority];
    const [showComments, setShowComments] = useState(false);
    const accountId = getAccountIdFromToken();

    return (
        <FormModal isOpen onClose={onClose} title={task.name} subtitle={sm.label} size="md"
            footer={
                <div style={{ display: 'flex', gap: 8, width: '100%', justifyContent: 'flex-end' }}>
                    <button className="btn" onClick={onClose}>Close</button>
                    {task.status !== 'completed' && task.status !== 'done' && (
                        <button className="btn btn-primary" onClick={onUpdate}>
                            <Pencil size={13} /> Update Progress
                        </button>
                    )}
                </div>
            }
        >
            {task.description && (
                <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Description</label>
                    <p style={{ margin: '4px 0 0', fontSize: 14 }}>{task.description}</p>
                </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                {[
                    { label: 'Deadline', value: fmtDate(task.deadline) },
                    { label: 'Priority', value: task.priority, style: { textTransform: 'capitalize' as const } },
                    { label: 'Assigned by', value: task.assignedBy },
                    { label: 'Progress', value: `${task.progress}%` },
                    ...(task.referenceNumber ? [{ label: 'Ref #', value: task.referenceNumber }] : []),
                    ...(task.category ? [{ label: 'Category', value: task.category }] : []),
                    { label: 'Document', value: task.supportingEvidenceUrl ?? '' },
                ].map(({ label, value, style }: { label: string; value: string; style?: any }) => (
                    <div key={label}>
                        <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{label}</label>
                        {label === 'Document' ? (
                            value ? (
                                <a href={value} target="_blank" rel="noopener noreferrer"
                                    style={{ marginTop: 4, fontSize: 13, color: 'var(--primary)', textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                    <FileText size={13} /> {value.split('/').pop() || 'View'}
                                </a>
                            ) : (
                                <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>No document</p>
                            )
                        ) : (
                            <p style={{ margin: '4px 0 0', fontSize: 14, ...(style || {}) }}>{value}</p>
                        )}
                    </div>
                ))}
            </div>
            <div className="tc-bar" style={{ height: 8, marginBottom: 12 }}>
                <div className={`tc-fill ${pm.bar}`} style={{ width: `${task.progress}%` }} />
            </div>
            {task.remarks && (
                <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Remarks</label>
                    <p style={{ margin: '4px 0 0', fontSize: 14 }}>{task.remarks}</p>
                </div>
            )}

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                <div
                    style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => setShowComments(v => !v)}
                >
                    <MessageSquare size={16} />
                    <span style={{ fontWeight: 600, fontSize: 14 }}>Comments</span>
                    {showComments ? <ChevronUp size={14} style={{ marginLeft: 'auto' }} /> : <ChevronDown size={14} style={{ marginLeft: 'auto' }} />}
                </div>
                {showComments && (
                    <div style={{ marginTop: 12, maxHeight: 320, overflowY: 'auto' }}>
                        <TaskComments taskId={task.id} currentEmployeeId={accountId} taskReferenceNumber={task.referenceNumber} />
                    </div>
                )}
            </div>
        </FormModal>
    );
};

// ─── Progress Update Modal ────────────────────────────────────────────────────

interface ProgressModalProps {
    task: Task;
    onSave: (id: string, status: TaskStatus, progress: number, remarks: string) => Promise<void>;
    onClose: () => void;
}

const ProgressModal: React.FC<ProgressModalProps> = ({ task, onSave, onClose }) => {
    const baseStatus = task.status === 'overdue' ? 'in-progress' : task.status;
    const [status, setStatus] = useState<TaskStatus>(baseStatus);
    const [progress, setProgress] = useState(task.progress);
    const [remarks, setRemarks] = useState(task.remarks ?? '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [fsmError, setFsmError] = useState('');

    const handleStatusChange = (s: TaskStatus) => {
        const validNext = FSM_EMPLOYEE_TRANSITIONS[baseStatus] ?? [];
        if (!validNext.includes(s)) {
            setFsmError(`Invalid transition: cannot move from "${statusMeta[baseStatus]?.label ?? baseStatus}" to "${statusMeta[s]?.label ?? s}". Status sequence violation detected.`);
            return;
        }
        setFsmError('');
        setStatus(s);
        if (s === 'pending-review') setProgress(100);
        if (s === 'in-progress' && progress === 0) setProgress(25);
    };

    const handleSave = async () => {
        if (status === baseStatus && (!remarks.trim() || remarks.trim() === (task.remarks ?? '').trim())) {
            setFsmError('No changes detected. Update the status or remarks to proceed.');
            return;
        }
        setError('');
        setSaving(true);
        try {
            await onSave(task.id, validNext.length > 0 ? status : baseStatus, progress, remarks);
            onClose();
        } catch (err: any) {
            setError(err.message ?? 'Failed to save. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const validNext = FSM_EMPLOYEE_TRANSITIONS[baseStatus] ?? [];
    const statusOptions: { value: TaskStatus; label: string }[] = validNext.map(s => ({
        value: s,
        label: statusMeta[s]?.label ?? s,
    }));

    return (
        <FormModal isOpen onClose={onClose} title="Update Progress" subtitle={task.name} size="sm"
            footer={
                <div style={{ display: 'flex', gap: 8, width: '100%', justifyContent: 'flex-end' }}>
                    <button className="btn" onClick={onClose} disabled={saving}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                        {saving ? <><Loader2 size={13} className="spin" /> Saving…</> : <><Save size={13} /> Save</>}
                    </button>
                </div>
            }
        >
            {error && (
                <div className="form-api-error" style={{ marginBottom: 12 }}>
                    <AlertCircle size={14} /><span>{error}</span>
                </div>
            )}
            {fsmError && (
                <div className="form-api-error" style={{ marginBottom: 12 }}>
                    <AlertCircle size={14} /><span>{fsmError}</span>
                </div>
            )}
            {validNext.length === 0 ? (
                <div className="field" style={{ padding: '16px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <AlertCircle size={18} style={{ marginBottom: 6 }} />
                    <p style={{ fontSize: 13 }}>This task is in "{statusMeta[baseStatus]?.label ?? baseStatus}" status and cannot be updated further. Contact your admin if you need changes.</p>
                </div>
            ) : (
                <>
                    <div className="field">
                        <label>Status — <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>current: {statusMeta[baseStatus]?.label ?? baseStatus}</span></label>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {statusOptions.map(opt => (
                                <button
                                    key={opt.value}
                                    className={`filter-pill${status === opt.value ? ' active' : ''}`}
                                    onClick={() => handleStatusChange(opt.value)}
                                >
                                    {statusMeta[opt.value].icon} {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="field">
                        <label>Progress — {progress}%</label>
                        <input
                            type="range" min={0} max={100} step={5} value={progress}
                            onChange={e => setProgress(Number(e.target.value))}
                            style={{ width: '100%', accentColor: 'var(--primary)' }}
                        />
                        <div className="tc-bar" style={{ marginTop: 6, height: 8 }}>
                            <div
                                className={`tc-fill ${priorityMeta[task.priority].bar}`}
                                style={{ width: `${progress}%`, transition: 'width 0.2s' }}
                            />
                        </div>
                    </div>
                </>
            )}

            <div className="field">
                <label>Remarks <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                <textarea
                    className="leave-reason-textarea" rows={3} maxLength={300}
                    placeholder="Add any notes about your progress…"
                    value={remarks}
                    onChange={e => setRemarks(e.target.value)}
                />
                <div className="leave-char-count">{remarks.length} / 300</div>
            </div>
        </FormModal>
    );
};

// ─── Task Card ────────────────────────────────────────────────────────────────

interface TaskCardProps {
    task: Task;
    onView: (id: string) => void;
    onUpdate: (id: string) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onView, onUpdate }) => {
    const es = effectiveStatus(task);
    const sm = statusMeta[es];
    const pm = priorityMeta[task.priority];
    const od = es === 'overdue';
    const daysLeft = task.deadline
        ? Math.ceil((new Date(task.deadline + 'T00:00:00').getTime() - Date.now()) / 86400000)
        : null;

    return (
        <div
            className={`task-card task-card-clickable${od ? ' task-card-overdue' : ''}`}
            onClick={() => onView(task.id)}
            role="button" tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && onView(task.id)}
        >
            <div className="tc-top">
                <span className={`prio-strip ${pm.cls}`} />
                <div className="tc-header">
                    <h4 className="tc-name">{task.name}</h4>
                    <span className={`badge ${sm.cls}`}>{sm.icon}{sm.label}</span>
                </div>
            </div>
            <p className="tc-desc">{task.description}</p>
            <div className="tc-meta">
                <span className={`tc-deadline${od ? ' overdue-text' : daysLeft !== null && daysLeft <= 2 ? ' warning-text' : ''}`}>
                    {od ? '⚠ Overdue'
                        : daysLeft !== null
                            ? daysLeft === 0 ? 'Due today'
                                : daysLeft === 1 ? 'Due tomorrow'
                                    : `${daysLeft}d left`
                            : fmtDate(task.deadline)}
                </span>
                <span className="tc-date">{fmtDate(task.deadline)}</span>
            </div>
            <div className="tc-progress-row">
                <div className="tc-bar">
                    <div className={`tc-fill ${pm.bar}`} style={{ width: `${task.progress}%` }} />
                </div>
                <span className="tc-pct">{task.progress}%</span>
            </div>
            {task.status === 'completed' && (
                <div className="tc-actions">
                    <span className="completed-pill"><CheckCircle2 size={12} /> Done</span>
                </div>
            )}
        </div>
    );
};

// ─── Dashboard Tab ────────────────────────────────────────────────────────────

interface DashboardTabProps {
    tasks: Task[];
    user: UserProfile;
    onView: (id: string) => void;
    onUpdate: (id: string) => void;
    onGoTasks: () => void;
}

const DashboardTab: React.FC<DashboardTabProps> = ({ tasks, user, onView, onUpdate, onGoTasks }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const total = tasks.length;
    const done = tasks.filter(t => t.status === 'completed').length;
    const inProg = tasks.filter(t => t.status === 'in-progress').length;
    const overdue = tasks.filter(t => effectiveStatus(t) === 'overdue').length;
    const pct = total ? Math.round(done / total * 100) : 0;
    const filteredTasks = searchQuery
        ? tasks.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()))
        : tasks;
    const urgent = filteredTasks.filter(t => t.priority === 'high' && t.status !== 'completed');
    const firstName = user.fullName ? user.fullName.split(' ')[0] : 'Employee';
    const initials = getInitials(user.fullName);
    const [recentTrackers, setRecentTrackers] = useState<TrackerData[]>([]);
    const [activeTrackerCount, setActiveTrackerCount] = useState(0);
    const [trackersLoading, setTrackersLoading] = useState(true);

    const fetchRecentTrackers = async () => {
        try {
            const res = await fetch('/api/approvalrequests/my-trackers?pageSize=5', {
                headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
            });
            if (res.ok) {
                const json = await res.json();
                const list = json?.data?.data ?? json?.data ?? json ?? [];
                setRecentTrackers(Array.isArray(list) ? list : []);
                setActiveTrackerCount(json?.data?.activeCount ?? list.filter((t: any) => t.status === 'Pending').length);
            }
        } catch { /* silent */ }
        finally { setTrackersLoading(false); }
    };

    useEffect(() => { fetchRecentTrackers(); }, []);

    const trackerConnectionRef = useRef<HubConnection | null>(null);

    useEffect(() => {
        const accountId = localStorage.getItem('employeeId');
        if (!accountId) return;

        const conn = new HubConnectionBuilder()
            .withUrl('/hubs/workflow')
            .withAutomaticReconnect()
            .build();

        conn.on('TrackerUpdated', () => {
            fetchRecentTrackers();
        });

        conn.start().then(() => {
            conn.invoke('JoinUserGroup', accountId).catch(() => {});
        }).catch(() => {});

        trackerConnectionRef.current = conn;

        return () => {
            conn.stop().catch(() => {});
        };
    }, []);

    return (
        <div className="tab-content">
            <div className="welcome-banner">
                <div className="wb-left">
                    <div className="wb-avatar">{initials}</div>
                    <div>
                        <h2 className="wb-name">Good day, {firstName} 👋</h2>
                        <p className="wb-sub">{toDisplayRole(user.role)}</p>
                    </div>
                </div>
                <div className="wb-right">
                    <div className="wb-ring-wrap">
                        <svg viewBox="0 0 60 60" className="wb-ring">
                            <circle cx="30" cy="30" r="24" className="ring-bg" />
                            <circle
                                cx="30" cy="30" r="24" className="ring-fill"
                                strokeDasharray={`${2 * Math.PI * 24}`}
                                strokeDashoffset={`${2 * Math.PI * 24 * (1 - pct / 100)}`}
                            />
                        </svg>
                        <div className="wb-ring-text">
                            <span className="wb-pct">{pct}%</span>
                            <span className="wb-pct-sub">done</span>
                        </div>
                    </div>
                    <div className="wb-stats">
                        <div className="wb-stat"><span className="wbs-val">{total}</span><span className="wbs-label">Total</span></div>
                        <div className="wb-stat"><span className="wbs-val green">{done}</span><span className="wbs-label">Done</span></div>
                        <div className="wb-stat"><span className="wbs-val amber">{inProg}</span><span className="wbs-label">Active</span></div>
                        <div className="wb-stat"><span className="wbs-val red">{overdue}</span><span className="wbs-label">Overdue</span></div>
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 16 }}>
                <div style={{ position: 'relative', width: 300 }}>
                    <Search size={14} style={{ position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input type="text" placeholder="Search task…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                        style={{ width: '100%', height: 46, borderRadius: 999, border: '1px solid #dbe3f0', background: '#f8fafc', padding: '0 20px 0 42px', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                        onFocus={e => { e.target.style.background = '#ffffff'; e.target.style.borderColor = '#14b8a6'; e.target.style.boxShadow = '0 0 0 4px rgba(20,184,166,0.08)'; }}
                        onBlur={e => { e.target.style.background = '#f8fafc'; e.target.style.borderColor = '#dbe3f0'; e.target.style.boxShadow = 'none'; }} />
                </div>
            </div>

            <div className="stats-row">
                {[
                    { label: 'My Tasks', value: total, icon: <ClipboardList size={20} strokeWidth={2.3} />, variant: 'primary', subtext: 'Assigned to me' },
                    { label: 'In Progress', value: inProg, icon: <Loader2 size={20} strokeWidth={2.3} />, variant: 'warning', subtext: 'Currently active' },
                    { label: 'Completed', value: done, icon: <CheckCircle2 size={20} strokeWidth={2.3} />, variant: 'success', subtext: 'Finished tasks' },
                    { label: 'Overdue', value: overdue, icon: <AlertCircle size={20} strokeWidth={2.3} />, variant: 'danger', subtext: 'Needs attention' },
                ].map(s => (
                    <StatCard key={s.label} icon={s.icon} variant={s.variant} label={s.label} value={s.value} subtext={s.subtext} />
                ))}
            </div>

            <div className="dashboard-grid">
                <div className="card">
                    <div className="card-header-layout">
                        <h3>High Priority Tasks</h3>
                        <button className="link-btn" onClick={onGoTasks}>All tasks <ChevronRight size={13} /></button>
                    </div>
                    {urgent.length === 0 ? (
                        <div className="empty-state"><CheckCircle2 size={22} /><p>No urgent tasks — great work!</p></div>
                    ) : urgent.map(t => (
                        <div key={t.id} className="dash-task-row" onClick={() => onView(t.id)}>
                            <div className="dtr-left">
                                <span className={`prio-dot ${priorityMeta[t.priority].cls}`} />
                                <div>
                                    <div className="dtr-name">{t.name}</div>
                                    <div className="dtr-date">{fmtDate(t.deadline)}</div>
                                </div>
                            </div>
                            <div className="dtr-right">
                                <span className={`badge ${statusMeta[effectiveStatus(t)].cls}`}>
                                    {statusMeta[effectiveStatus(t)].label}
                                </span>
                                {t.status !== 'completed' && (
                                    <button
                                        className="btn btn-xs btn-primary"
                                        onClick={e => { e.stopPropagation(); onUpdate(t.id); }}
                                    >
                                        Update
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="card">
                    <div className="card-header-layout"><h3>My Progress</h3></div>
                    <div className="progress-summary">
                        {filteredTasks.map(t => (
                            <div key={t.id} className="ps-item" onClick={() => onView(t.id)}>
                                <div className="ps-info">
                                    <span className="ps-name">{t.name}</span>
                                    <span className="ps-pct">{t.progress}%</span>
                                </div>
                                <div className="ps-bar">
                                    <div className={`ps-fill ${priorityMeta[t.priority].bar}`} style={{ width: `${t.progress}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="card" style={{ marginTop: 16 }}>
                    <div className="card-header-layout">
                        <h3><Shield size={15} style={{ marginRight: 6, verticalAlign: 'middle' }} />Pending Approvals</h3>
                        {activeTrackerCount > 0 && (
                            <span className="badge badge-purple" style={{ fontSize: 12 }}>{activeTrackerCount} active</span>
                        )}
                    </div>
                    {trackersLoading ? (
                        <EmptyState icon={<Loader2 size={18} className="spin" />} title="Loading trackers..." />
                    ) : recentTrackers.length === 0 ? (
                        <EmptyState icon={<Shield size={22} />} title="No approval requests yet" />
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 0 4px' }}>
                            {recentTrackers.slice(0, 3).map(t => (
                                <div key={t.approvalRequestId} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', background: t.status === 'Pending' ? 'rgba(67,24,255,0.03)' : 'transparent' }}>
                                    <ApprovalTracker tracker={t} compact />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ─── My Tasks Tab ─────────────────────────────────────────────────────────────

interface MyTasksTabProps {
    tasks: Task[];
    loading: boolean;
    error: string;
    onView: (id: string) => void;
    onUpdate: (id: string) => void;
    onRetry: () => void;
}

const MyTasksTab: React.FC<MyTasksTabProps> = ({ tasks, loading, error, onView, onUpdate, onRetry }) => {
    const [filter, setFilter] = useState<'all' | TaskStatus>('all');

    const filters: { key: 'all' | TaskStatus; label: string; count: number }[] = [
        { key: 'all', label: 'All', count: tasks.length },
        { key: 'pending', label: 'Pending', count: tasks.filter(t => t.status === 'pending').length },
        { key: 'in-progress', label: 'In Progress', count: tasks.filter(t => t.status === 'in-progress').length },
        { key: 'completed', label: 'Completed', count: tasks.filter(t => t.status === 'completed').length },
        { key: 'overdue', label: 'Overdue', count: tasks.filter(t => effectiveStatus(t) === 'overdue').length },
    ];

    const filtered = filter === 'all'
        ? tasks
        : filter === 'overdue'
            ? tasks.filter(t => effectiveStatus(t) === 'overdue')
            : tasks.filter(t => t.status === filter);

    if (loading) {
        return (
            <div className="tab-content">
                <div className="card">
                    <div className="empty-state">
                        <Loader2 size={22} className="spin" />
                        <p>Loading your tasks…</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="tab-content">
                <div className="card">
                    <div className="empty-state">
                        <AlertCircle size={22} style={{ color: 'var(--danger)' }} />
                        <p>{error}</p>
                        <button className="btn btn-primary" onClick={onRetry} style={{ marginTop: 8 }}>
                            <RefreshCw size={13} /> Retry
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="tab-content">
            <div className="filter-pills">
                {filters.map(f => (
                    <button
                        key={f.key}
                        className={`filter-pill${filter === f.key ? ' active' : ''}`}
                        onClick={() => setFilter(f.key)}
                    >
                        {f.label}<span className="fp-count">{f.count}</span>
                    </button>
                ))}
            </div>
            {filtered.length === 0 ? (
                <div className="card">
                    <div className="empty-state"><ClipboardList size={22} /><p>No tasks in this category</p></div>
                </div>
            ) : (
                <div className="task-grid">
                    {filtered.map(t => <TaskCard key={t.id} task={t} onView={onView} onUpdate={onUpdate} />)}
                </div>
            )}
        </div>
    );
};

// ─── Leave Record Card ────────────────────────────────────────────────────────

const LeaveRecordCard: React.FC<{ record: LeaveRecord }> = ({ record }) => {
    const [expanded, setExpanded] = useState(false);
    const sm = leaveStatusMeta[record.status];
    const days = calcDays(record.startDate, record.endDate);

    const borderColor =
        record.status === 'Approved' ? '#05cd99' :
            record.status === 'Declined' ? '#ee5d50' :
                '#ffb547';

    return (
        <div style={{
            border: '1px solid var(--border)', borderRadius: 12,
            overflow: 'hidden', borderLeft: `3px solid ${borderColor}`,
        }}>
            {/* Main row */}
            <div
                style={{
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px', cursor: 'pointer',
                }}
                onClick={() => setExpanded(e => !e)}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: 'rgba(67,24,255,0.08)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--primary)', flexShrink: 0,
                    }}>
                        {LEAVE_TYPES.find(lt => lt.key === record.leaveType)?.icon ?? <CalendarDays size={16} />}
                    </div>
                    <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                            {leaveTypeLabel(record.leaveType)}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                            {fmtDate(record.startDate)}
                            {record.startDate !== record.endDate && <> — {fmtDate(record.endDate)}</>}
                            <span style={{ marginLeft: 6, fontWeight: 600 }}>
                                · {days} {days === 1 ? 'day' : 'days'}
                            </span>
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className={`badge ${sm.cls}`}>{sm.icon}{sm.label}</span>
                    <button
                        className="icon-btn"
                        onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
                    >
                        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                </div>
            </div>

            {/* Expanded detail */}
            {expanded && (
                <div style={{
                    borderTop: '1px solid var(--border)',
                    padding: '12px 16px',
                    background: 'var(--bg-secondary, #f9f9fc)',
                    display: 'flex', flexDirection: 'column', gap: 8,
                }}>
                    {[
                        { label: 'Submitted', value: fmtDate(record.submittedAt) },
                        { label: 'Reason', value: record.reason },
                        ...(record.reviewedBy ? [{ label: 'Reviewed by', value: record.reviewedBy }] : []),
                    ].map(({ label, value }) => (
                        <div key={label} style={{ display: 'flex', gap: 12, fontSize: 13 }}>
                            <span style={{ width: 90, color: 'var(--text-secondary)', fontWeight: 600, flexShrink: 0 }}>
                                {label}
                            </span>
                            <span style={{ color: 'var(--text-primary)' }}>{value}</span>
                        </div>
                    ))}
                    {record.reviewNote && (
                        <div style={{
                            display: 'flex', alignItems: 'flex-start', gap: 8,
                            marginTop: 4, padding: '8px 12px', borderRadius: 8,
                            background: record.status === 'Approved'
                                ? 'rgba(5,205,153,0.08)' : 'rgba(238,93,80,0.08)',
                            border: `1px solid ${record.status === 'Approved'
                                ? 'rgba(5,205,153,0.2)' : 'rgba(238,93,80,0.2)'}`,
                            fontSize: 12, color: 'var(--text-primary)',
                        }}>
                            <FileText size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                            <span>{record.reviewNote}</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ─── Leave Tab ────────────────────────────────────────────────────────────────

const LeaveTab: React.FC<{
    records: LeaveRecord[];
    loading: boolean;
    onNewRecord: (r: LeaveRecord) => void;
}> = ({ records, loading, onNewRecord }) => {
    const { success } = useToast();
    const [showModal, setShowModal] = useState(false);
    const [histFilter, setHistFilter] = useState<'all' | LeaveStatus>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const PAGE_SIZE = 5;

    const pendingCount = records.filter(r => r.status === 'Pending').length;
    const approvedCount = records.filter(r => r.status === 'Approved').length;
    const declinedCount = records.filter(r => r.status === 'Declined').length;

    const filteredRecords = histFilter === 'all'
        ? records
        : records.filter(r => r.status === histFilter);
    const sortedRecords = [...filteredRecords].sort((a, b) =>
        b.submittedAt.localeCompare(a.submittedAt)
    );
    const totalPages = Math.max(1, Math.ceil(sortedRecords.length / PAGE_SIZE));
    const paginatedRecords = sortedRecords.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE
    );

    const handleFilterChange = (f: 'all' | LeaveStatus) => {
        setHistFilter(f);
        setCurrentPage(1);
    };

    const handleSubmit = (record: LeaveRecord) => {
        onNewRecord(record);
        success('Your request has been submitted — pending review.');
    };

    return (
        <div className="tab-content">

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    <Plus size={14} /> Request Leave
                </button>
            </div>

            {/* Stat cards */}
            <div className="stats-row" style={{ marginBottom: 16 }}>
                {[
                    { label: 'TOTAL REQUESTS', value: records.length, icon: <ClipboardList size={20} strokeWidth={2.3} />, variant: 'primary', subtext: 'All submitted' },
                    { label: 'PENDING', value: pendingCount, icon: <AlertCircle size={20} strokeWidth={2.3} />, variant: 'warning', subtext: 'Awaiting review' },
                    { label: 'APPROVED', value: approvedCount, icon: <CheckCircle2 size={20} strokeWidth={2.3} />, variant: 'success', subtext: 'This period' },
                    { label: 'DECLINED', value: declinedCount, icon: <X size={20} strokeWidth={2.3} />, variant: 'danger', subtext: 'Not approved' },
                ].map(s => (
                    <StatCard key={s.label} icon={s.icon} variant={s.variant} label={s.label} value={s.value} subtext={s.subtext} />
                ))}
            </div>

            {/* History card */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="card-header-layout" style={{ padding: '16px 20px 14px' }}>
                    <h3>My Leave History</h3>
                </div>

                {/* Filter pills */}
                <div style={{ padding: '0 20px 12px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {(['all', 'Pending', 'Approved', 'Declined'] as const).map(f => (
                        <button
                            key={f}
                            className={`filter-pill${histFilter === f ? ' active' : ''}`}
                            onClick={() => handleFilterChange(f)}
                            style={{ fontSize: 12, padding: '4px 11px' }}
                        >
                            {f === 'all' ? 'All' : f}
                            <span style={{
                                marginLeft: 5, fontSize: 11, fontWeight: 600,
                                padding: '1px 6px', borderRadius: 999,
                                background: histFilter === f ? 'rgba(67,24,255,0.15)' : 'var(--border)',
                                color: histFilter === f ? 'var(--primary)' : 'var(--text-secondary)',
                            }}>
                                {f === 'all' ? records.length : records.filter(r => r.status === f).length}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Records list */}
                <div style={{ padding: '0 20px' }}>
                    {loading ? (
                        <div className="empty-state" style={{ padding: '32px 0' }}>
                            <Loader2 size={20} className="spin" /><p>Loading leave records…</p>
                        </div>
                    ) : paginatedRecords.length === 0 ? (
                        <div className="empty-state" style={{ padding: '36px 0' }}>
                            <div style={{
                                width: 56, height: 56, borderRadius: '50%',
                                background: 'rgba(67,24,255,0.07)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                marginBottom: 8,
                            }}>
                                <CalendarDays size={26} color="var(--primary)" />
                            </div>
                            <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                                {histFilter === 'all' ? 'No leave requests yet' : `No ${histFilter} requests`}
                            </p>
                            {histFilter === 'all' && (
                                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                    Click "Request Leave" to submit your first request.
                                </span>
                            )}
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 16 }}>
                            {paginatedRecords.map(r => <LeaveRecordCard key={r.id} record={r} />)}
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {sortedRecords.length > PAGE_SIZE && (
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 20px', borderTop: '1px solid var(--border)',
                    }}>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                            Showing {(currentPage - 1) * PAGE_SIZE + 1}–
                            {Math.min(currentPage * PAGE_SIZE, sortedRecords.length)} of {sortedRecords.length}
                        </span>
                        <div style={{ display: 'flex', gap: 4 }}>
                            <button className="btn btn-xs" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}>
                                <ChevronLeft size={13} />
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                <button
                                    key={page}
                                    className={`btn btn-xs${currentPage === page ? ' btn-primary' : ''}`}
                                    onClick={() => setCurrentPage(page)}
                                    style={{ minWidth: 28 }}
                                >
                                    {page}
                                </button>
                            ))}
                            <button className="btn btn-xs" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages}>
                                <ChevronRight size={13} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {showModal && (
                <LeaveRequestModal
                    onClose={() => setShowModal(false)}
                    onSubmit={handleSubmit}
                />
            )}
        </div>
    );
};

// ─── Profile Tab ──────────────────────────────────────────────────────────────

interface ProfileTabProps {
    user: UserProfile;
    onUpdateUser: (u: UserProfile) => void;
}

const ProfileTab: React.FC<ProfileTabProps> = ({ user, onUpdateUser }) => {
    const { success, error } = useToast();
    const [passwordGate, setPasswordGate] = useState(false);
    const [gatePassword, setGatePassword] = useState('');
    const [gateError, setGateError] = useState('');
    const [gateLoading, setGateLoading] = useState(false);
    const [showGatePassword, setShowGatePassword] = useState(false);

    const [editMode, setEditMode] = useState(false);
    const [pwdMode, setPwdMode] = useState(false);
    const [form, setForm] = useState({
        firstName: localStorage.getItem('firstName') ?? '',
        middleName: localStorage.getItem('middleName') ?? '',
        lastName: localStorage.getItem('lastName') ?? '',
        contactNumber: user.phone,
        email: localStorage.getItem('email') ?? ''
    });
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
    const [profileSaving, setProfileSaving] = useState(false);

    const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' });
    const [showPwd, setShowPwd] = useState({ current: false, next: false, confirm: false });
    const [pwdError, setPwdError] = useState('');
    const [pwdSaving, setPwdSaving] = useState(false);

    useEffect(() => {
        setForm({
            firstName: localStorage.getItem('firstName') ?? '',
            middleName: localStorage.getItem('middleName') ?? '',
            lastName: localStorage.getItem('lastName') ?? '',
            contactNumber: localStorage.getItem('contactNumber') ?? '',
            email: localStorage.getItem('email') ?? ''
        });
    }, [user.fullName, user.phone]);

    const requestSave = () => {
        if (!form.firstName.trim() || !/^[A-Za-z\s]{1,50}$/.test(form.firstName.trim())) { error('Given Name must contain letters only and be up to 50 characters.'); return; }
        if (form.middleName.trim() && !/^[A-Za-z\s]{1,50}$/.test(form.middleName.trim())) { error('Middle Name must contain letters only and be up to 50 characters.'); return; }
        if (!form.lastName.trim() || !/^[A-Za-z\s]{1,50}$/.test(form.lastName.trim())) { error('Last Name must contain letters only and be up to 50 characters.'); return; }

        const email = form.email.trim();
        if (!email || email.length < 12 || email.length > 64 || !/^[A-Za-z0-9._+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email)) {
            error('Enter a valid Email Address (12-64 characters, local-part@domain).'); return;
        }

        if (!form.contactNumber.trim() || !/^[0-9]{11}$/.test(form.contactNumber.trim())) {
            error('Contact Number must be exactly 11 digits.'); return;
        }
        setGatePassword('');
        setGateError('');
        setShowGatePassword(false);
        setPasswordGate(true);
    };

    const handleGateConfirm = async () => {
        if (!gatePassword) { setGateError('Please enter your password.'); return; }
        setGateLoading(true);
        setGateError('');
        try {
            const employeeId = localStorage.getItem('employeeId') ?? '';
            const verifyRes = await fetch('/api/authentication/verify-password', {
                method: 'POST',
                headers: authHeader(),
                body: JSON.stringify({ employeeID: employeeId, password: gatePassword }),
            });
            const verifyData = await verifyRes.json().catch(() => ({}));
            if (!verifyData.isSuccess) { throw new Error(verifyData.message || verifyData.Message || 'Incorrect password. Please try again.'); }
            setPasswordGate(false);
            setGatePassword('');
            await performSave();
        } catch (err: any) {
            setGateError(err.message ?? 'Incorrect password. Please try again.');
        } finally {
            setGateLoading(false);
        }
    };

    const performSave = async () => {
        setProfileSaving(true);
        try {
            const employeeId = localStorage.getItem('employeeId') ?? '';
            const firstName = form.firstName.trim();
            const lastName = form.lastName.trim();
            const middleName = form.middleName.trim();
            const formData = new FormData();
            formData.append('employeeNumber', employeeId);
            formData.append('firstName', firstName);
            formData.append('middleName', middleName);
            formData.append('lastName', lastName);
            formData.append('contactNumber', form.contactNumber.trim());
            formData.append('email', form.email.trim());

            const token = localStorage.getItem('authToken') ?? '';
            const res = await fetch(`/api/profile/update-profile?employeeNumber=${encodeURIComponent(employeeId)}`, {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: formData,
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error((err as any).message || 'Profile update failed.');
            }
            const newFullName = [firstName, middleName, lastName].filter(Boolean).join(' ');
            localStorage.setItem('employeeName', newFullName);
            localStorage.setItem('firstName', firstName);
            localStorage.setItem('middleName', middleName);
            localStorage.setItem('lastName', lastName);
            localStorage.setItem('contactNumber', form.contactNumber.trim());
            localStorage.setItem('email', form.email.trim());
            onUpdateUser({ ...user, fullName: newFullName, phone: form.contactNumber.trim() });
            success('Profile updated successfully.');
            setEditMode(false);
        } catch (err: any) {
            error(err.message ?? 'Something went wrong.');
        } finally {
            setProfileSaving(false);
        }
    };

    const handleCancelEdit = () => {
        setEditMode(false);
        setPwdMode(false);
        setForm({
            firstName: localStorage.getItem('firstName') ?? '',
            middleName: localStorage.getItem('middleName') ?? '',
            lastName: localStorage.getItem('lastName') ?? '',
            contactNumber: user.phone,
            email: localStorage.getItem('email') ?? ''
        });
    };

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

    const setF = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setForm(prev => ({ ...prev, [k]: val }));
        validateField(k, val);
    };

    const handleChangePwd = async () => {
        setPwdError('');
        if (!pwd.current) { setPwdError('Current password is required.'); return; }
        if (pwd.next.length < 6) { setPwdError('New password must be at least 6 characters.'); return; }
        if (pwd.next !== pwd.confirm) { setPwdError('Passwords do not match.'); return; }
        setPwdSaving(true);
        try {
            const res = await fetch('/api/profile/change-password', {
                method: 'PATCH',
                headers: authHeader(),
                body: JSON.stringify({ currentPassword: pwd.current, newPassword: pwd.next }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error((err as any).message || 'Password update failed.');
            }
            setPwdMode(false);
            setPwd({ current: '', next: '', confirm: '' });
        } catch (err: any) {
            setPwdError(err.message ?? 'Something went wrong.');
        } finally {
            setPwdSaving(false);
        }
    };

    const toggleShow = (k: keyof typeof showPwd) =>
        setShowPwd(prev => ({ ...prev, [k]: !prev[k] }));

    const initials = getInitials(user.fullName);

    return (
        <div className="tab-content">

            {/* Password Gate Modal */}
            <FormModal isOpen={passwordGate} onClose={() => setPasswordGate(false)}
                title="Confirm Your Identity" subtitle="Enter your password to save your profile changes." size="sm"
                footer={
                    <>
                        <button className="btn" onClick={() => setPasswordGate(false)} disabled={gateLoading}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleGateConfirm} disabled={gateLoading || !gatePassword}>
                            {gateLoading
                                ? <><Loader2 size={13} className="spin" /> Verifying…</>
                                : <><Shield size={13} /> Confirm & Save</>
                            }
                        </button>
                    </>
                }
            >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 0 16px', gap: 8 }}>
                    <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(67,24,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Lock size={22} color="var(--primary)" />
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center', margin: 0 }}>
                        For your security, please verify your identity before saving changes.
                    </p>
                </div>
                {gateError && <div className="form-api-error" style={{ marginBottom: 12 }}><AlertCircle size={14} /><span>{gateError}</span></div>}
                <div className="field" style={{ marginBottom: 20 }}>
                    <label>Password</label>
                    <div style={{ position: 'relative' }}>
                        <input type={showGatePassword ? 'text' : 'password'} value={gatePassword}
                            onChange={e => { setGatePassword(e.target.value); setGateError(''); }}
                            onKeyDown={e => e.key === 'Enter' && handleGateConfirm()}
                            placeholder="Enter your current password" style={{ paddingRight: 40, width: '100%' }} autoFocus />
                        <button type="button" onClick={() => setShowGatePassword(p => !p)}
                            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }} tabIndex={-1}>
                            {showGatePassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                    </div>
                </div>
            </FormModal>

            {/* Profile Hero */}
            <div className="profile-hero card">
                <div className="ph-avatar">{initials}</div>
                <div className="ph-info">
                    <h2 className="ph-name">{user.fullName || '—'}</h2>
                    <p className="ph-role">{toDisplayRole(user.role)}</p>
                    <div className="ph-badges">
                        <span className="badge badge-blue">{user.employeeId}</span>
                        <span className={`badge ${user.accountStatus === 'Active' ? 'badge-green' : 'badge-red'}`}>
                            {user.accountStatus}
                        </span>
                        <span
                            className={`badge ${user.presenceStatus === 'Online' ? 'badge-green' : 'badge-gray'}`}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                            <span style={{
                                display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
                                background: user.presenceStatus === 'Online' ? '#05cd99' : '#a3aed0',
                            }} />
                            {user.presenceStatus ?? 'Offline'}
                        </span>
                    </div>
                </div>
                <button
                    className={`btn ${editMode ? 'btn-danger' : 'btn-primary'} ph-edit-btn`}
                    onClick={editMode ? handleCancelEdit : () => {
                        setEditMode(true);
                        ['firstName', 'middleName', 'lastName', 'email', 'contactNumber'].forEach(k => validateField(k, (form as any)[k]));
                    }}
                >
                    {editMode ? <><X size={13} /> Cancel</> : <><Pencil size={13} /> Edit Profile</>}
                </button>
            </div>

            <div className="profile-grid">
                {/* Basic Information */}
                <div className="card">
                    <div className="card-header-layout">
                        <h3>Basic Information</h3>
                        {editMode && (
                            <button className="btn btn-primary" onClick={requestSave} disabled={profileSaving}>
                                {profileSaving
                                    ? <><Loader2 size={13} className="spin" /> Saving…</>
                                    : <><Save size={13} /> Save</>
                                }
                            </button>
                        )}
                    </div>
                    <div className="info-fields">
                        <div className="info-field">
                            <label>Employee ID</label>
                            <div className="if-value">
                                <span className="if-icon"><Hash size={15} /></span>
                                <span className="read-only-val">{user.employeeId || '—'}</span>
                            </div>
                        </div>
                        {editMode ? (
                            <>
                                <div className="info-field">
                                    <label>Given Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                                    <div className="if-input-wrap" style={validationErrors['firstName'] ? { borderColor: 'var(--danger)' } : {}}>
                                        <span className="if-icon"><User size={15} /></span>
                                        <input type="text" value={form.firstName} onChange={setF('firstName')} placeholder="Given Name" maxLength={50} />
                                    </div>
                                    {validationErrors['firstName'] && <span style={{ color: 'var(--danger)', fontSize: 11, marginTop: 4 }}>{validationErrors['firstName']}</span>}
                                </div>
                                <div className="info-field">
                                    <label>Middle Name <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>(optional)</span></label>
                                    <div className="if-input-wrap" style={validationErrors['middleName'] ? { borderColor: 'var(--danger)' } : {}}>
                                        <span className="if-icon"><User size={15} /></span>
                                        <input type="text" value={form.middleName} onChange={setF('middleName')} placeholder="Middle Name" maxLength={50} />
                                    </div>
                                    {validationErrors['middleName'] && <span style={{ color: 'var(--danger)', fontSize: 11, marginTop: 4 }}>{validationErrors['middleName']}</span>}
                                </div>
                                <div className="info-field">
                                    <label>Last Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                                    <div className="if-input-wrap" style={validationErrors['lastName'] ? { borderColor: 'var(--danger)' } : {}}>
                                        <span className="if-icon"><User size={15} /></span>
                                        <input type="text" value={form.lastName} onChange={setF('lastName')} placeholder="Last Name" maxLength={50} />
                                    </div>
                                    {validationErrors['lastName'] && <span style={{ color: 'var(--danger)', fontSize: 11, marginTop: 4 }}>{validationErrors['lastName']}</span>}
                                </div>
                            </>
                        ) : (
                            <div className="info-field">
                                <label>Full Name</label>
                                <div className="if-value">
                                    <span className="if-icon"><User size={15} /></span>
                                    <span>{user.fullName || '—'}</span>
                                </div>
                            </div>
                        )}
                        <div className="info-field">
                            <label>Email Address <span style={{ color: 'var(--danger)' }}>*</span></label>
                            {editMode ? (
                                <>
                                    <div className="if-input-wrap" style={validationErrors['email'] ? { borderColor: 'var(--danger)' } : {}}>
                                        <span className="if-icon"><Mail size={15} /></span>
                                        <input type="email" value={form.email} onChange={setF('email')} placeholder="e.g. name@company.com" />
                                    </div>
                                    {validationErrors['email'] && <span style={{ color: 'var(--danger)', fontSize: 11, marginTop: 4 }}>{validationErrors['email']}</span>}
                                </>
                            ) : (
                                <div className="if-value">
                                    <span className="if-icon"><Mail size={15} /></span>
                                    <span>{form.email || '—'}</span>
                                </div>
                            )}
                        </div>
                        <div className="info-field">
                            <label>Contact Number</label>
                            {editMode ? (
                                <>
                                    <div className="if-input-wrap" style={validationErrors['contactNumber'] ? { borderColor: 'var(--danger)' } : {}}>
                                        <span className="if-icon"><Phone size={15} /></span>
                                        <input type="tel" value={form.contactNumber} onChange={setF('contactNumber')} placeholder="e.g. 09170000000" />
                                    </div>
                                    {validationErrors['contactNumber'] && <span style={{ color: 'var(--danger)', fontSize: 11, marginTop: 4 }}>{validationErrors['contactNumber']}</span>}
                                </>
                            ) : (
                                <div className="if-value">
                                    <span className="if-icon"><Phone size={15} /></span>
                                    <span>{user.phone || '—'}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Account & Security */}
                <div className="card">
                    <div className="card-header-layout"><h3>Account & Security</h3></div>
                    <div className="account-info">
                        <div className="info-field">
                            <label>Role</label>
                            <div className="if-value">
                                <span className="if-icon"><Shield size={15} /></span>
                                <span className="read-only-val">{toDisplayRole(user.role) || '—'}</span>
                            </div>
                        </div>
                        <div className="info-field">
                            <label>Account Status</label>
                            <div className="if-value">
                                <span className={`status-badge ${(user.accountStatus ?? 'active').toLowerCase()}`}>
                                    {user.accountStatus ?? 'Active'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="pwd-section">
                        <div className="pwd-header">
                            <div className="pwd-title"><Lock size={15} /><span>Change Password</span></div>
                            <button
                                className={`btn ${pwdMode ? '' : 'btn-primary'} btn-sm`}
                                onClick={() => { setPwdMode(m => !m); setPwdError(''); setEditMode(false); }}
                            >
                                {pwdMode ? 'Cancel' : 'Change'}
                            </button>
                        </div>
                        {pwdMode && (
                            <div className="pwd-form">
                                {pwdError && (
                                    <div className="form-api-error" style={{ marginBottom: 8 }}>
                                        <AlertCircle size={14} /><span>{pwdError}</span>
                                    </div>
                                )}
                                {(['current', 'next', 'confirm'] as const).map((k, i) => (
                                    <div className="field" key={k}>
                                        <label>
                                            {i === 0 ? 'Current Password' : i === 1 ? 'New Password' : 'Confirm New Password'}
                                        </label>
                                        <div className="pwd-input-wrap">
                                            <input
                                                type={showPwd[k] ? 'text' : 'password'}
                                                value={pwd[k]}
                                                onChange={e => setPwd(p => ({ ...p, [k]: e.target.value }))}
                                                placeholder={
                                                    i === 0 ? 'Enter current password'
                                                        : i === 1 ? 'At least 6 characters'
                                                            : 'Re-enter new password'
                                                }
                                            />
                                            <button className="pwd-toggle" onClick={() => toggleShow(k)} tabIndex={-1}>
                                                {showPwd[k] ? <EyeOff size={14} /> : <Eye size={14} />}
                                            </button>
                                        </div>
                                        {k === 'next' && pwd.next.length > 0 && (
                                            <div style={{ marginTop: 6 }}>
                                                <div style={{ display: 'flex', gap: 4 }}>
                                                    {[1, 2, 3].map(lv => (
                                                        <div key={lv} style={{
                                                            flex: 1, height: 4, borderRadius: 2,
                                                            background: pwd.next.length >= lv * 4
                                                                ? lv === 1 ? '#ee5d50' : lv === 2 ? '#ffb547' : '#05cd99'
                                                                : '#e9edf7',
                                                            transition: 'background 0.2s',
                                                        }} />
                                                    ))}
                                                </div>
                                                <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 3, display: 'block' }}>
                                                    {pwd.next.length < 4 ? 'Weak' : pwd.next.length < 8 ? 'Fair' : 'Strong'}
                                                </span>
                                            </div>
                                        )}
                                        {k === 'confirm' && pwd.confirm.length > 0 && (
                                            <span style={{
                                                fontSize: 11,
                                                color: pwd.next === pwd.confirm ? '#05cd99' : 'var(--danger)',
                                                marginTop: 3, display: 'block',
                                            }}>
                                                {pwd.next === pwd.confirm ? '✓ Passwords match' : 'Passwords do not match'}
                                            </span>
                                        )}
                                    </div>
                                ))}
                                <button
                                    className="btn btn-primary"
                                    style={{ width: '100%', justifyContent: 'center' }}
                                    onClick={handleChangePwd}
                                    disabled={pwdSaving}
                                >
                                    {pwdSaving
                                        ? <><Loader2 size={13} className="spin" /> Saving…</>
                                        : <><Lock size={13} /> Update Password</>
                                    }
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Root Component ───────────────────────────────────────────────────────────

export default function EmployeeDashboard() {
    const navigate = useNavigate();
    usePreventBackNav();

    const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
    const [tasks, setTasks] = useState<Task[]>([]);
    const [tasksLoading, setTasksLoading] = useState(true);
    const [tasksError, setTasksError] = useState('');
    const [viewingId, setViewingId] = useState<string | null>(null);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [leaveRecords, setLeaveRecords] = useState<LeaveRecord[]>([]);
    const [leaveLoading, setLeaveLoading] = useState(false);
    const [loadingUser, setLoadingUser] = useState(true);

    const [user, setUser] = useState<UserProfile>({
        employeeId: localStorage.getItem('employeeId') ?? '',
        fullName: localStorage.getItem('employeeName') ?? '',
        phone: localStorage.getItem('contactNumber') ?? '',
        email: localStorage.getItem('email') ?? '',
        role: localStorage.getItem('role') ?? '',
        accountStatus: 'Active',
    });

    // -- Activity Logs --
    const [activityLogs, setActivityLogs] = useState<any[]>([]);
    const [activityLogPage, setActivityLogPage] = useState(1);
    const [activityLogTotalPages, setActivityLogTotalPages] = useState(1);
    const ACTIVITY_LOG_PAGE_SIZE = 15;

    const fetchActivityLogs = (page: number) => {
        const t = localStorage.getItem('authToken');
        if (!t) return;
        fetch(`/api/activity-logs/my-logs?page=${page}&pageSize=${ACTIVITY_LOG_PAGE_SIZE}`, { headers: { Authorization: `Bearer ${t}` }, cache: 'no-store' })
            .then(res => { if (!res.ok) return null; return res.json(); })
            .then(data => {
                if (data && Array.isArray(data.data)) {
                    setActivityLogs(data.data);
                    setActivityLogPage(data.pageNumber || page);
                    setActivityLogTotalPages(data.totalPages || 1);
                } else {
                    setActivityLogs([]);
                }
            })
            .catch(() => setActivityLogs([]));
    };

    const handleLogout = async () => {
        const token = localStorage.getItem('authToken');
        if (token) {
            await fetch('/api/authentication/logout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            }).catch(() => { });
        }
        ['employeeId', 'refreshToken', 'authToken', 'employeeName', 'contactNumber', 'role']
            .forEach(k => localStorage.removeItem(k));
        navigate('/');
    };

    const fetchTasks = async () => {
        setTasksLoading(true);
        setTasksError('');
        try {
            const res = await fetch('/api/task/my-tasks', { headers: authHeader() });
            if (res.status === 401) { handleLogout(); return; }
            if (!res.ok) {
                setTasks([]);
                return;
            }
            const json = await res.json();
            const rawList: TaskResponseDTO[] = Array.isArray(json) ? json : (Array.isArray(json?.data) ? json.data : []);
            setTasks(rawList.map(dtoToTask));
        } catch {
            setTasks([]);
        } finally {
            setTasksLoading(false);
        }
    };

    const fetchLeaveRecords = async () => {
        setLeaveLoading(true);
        try {
            const res = await fetch('/api/leaverequest/my-leave-requests', { headers: authHeader() });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data: any[] = await res.json();
            setLeaveRecords(data.map(dtoToLeaveRecord));
        } catch (err) {
            console.warn('Could not load leave records:', err);
            setLeaveRecords([]);
        } finally {
            setLeaveLoading(false);
        }
    };

    useEffect(() => {
        const token = localStorage.getItem('authToken');
        const employeeId = localStorage.getItem('employeeId');
        if (!token || !employeeId) { setLoadingUser(false); return; }

        fetch('/api/profile/view-profile', { headers: authHeader() })
            .then(res => { if (!res.ok) throw new Error(); return res.json(); })
            .then((resJson: any) => {
                if (!resJson || !resJson.isSuccess || !resJson.data) throw new Error('Invalid response structure');
                const data = resJson.data;
                const fetchedFullName = (data.firstName || data.lastName)
                    ? [data.firstName, data.middleName, data.lastName, data.suffix].map(s => (s ?? '').trim()).filter(Boolean).join(' ')
                    : (data.employeeName ?? localStorage.getItem('employeeName') ?? '');

                const fetched: UserProfile = {
                    employeeId: data.employeeNumber ?? employeeId,
                    fullName: fetchedFullName,
                    phone: data.contactNumber ?? localStorage.getItem('contactNumber') ?? '',
                    email: data.email ?? localStorage.getItem('email') ?? '',
                    role: data.role ?? localStorage.getItem('role') ?? '',
                    accountStatus: data.accountStatus ?? 'Active',
                    presenceStatus: data.presenceStatus ?? 'Offline',
                };
                setUser(fetched);
                localStorage.setItem('employeeName', fetched.fullName);
                localStorage.setItem('contactNumber', fetched.phone);
                localStorage.setItem('email', fetched.email);
                localStorage.setItem('role', fetched.role);

                localStorage.setItem('firstName', data.firstName ?? '');
                localStorage.setItem('middleName', data.middleName ?? '');
                localStorage.setItem('lastName', data.lastName ?? '');
                localStorage.setItem('suffix', data.suffix ?? '');
            })
            .catch(err => console.warn('Could not fetch profile:', err))
            .finally(() => setLoadingUser(false));

        fetchTasks();
        fetchLeaveRecords();
        fetchActivityLogs(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const toBackendStatus = (status: TaskStatus): string => ({
        pending: 'Pending', assigned: 'Assigned', 'in-progress': 'In Progress',
        'pending-review': 'Pending Admin Review', done: 'Done', completed: 'Completed', overdue: 'In Progress',
    }[status] ?? 'Assigned');

    const handleSaveProgress = async (
        id: string, status: TaskStatus, progress: number, remarks: string
    ): Promise<void> => {
        const formData = new FormData();
        formData.append('TaskStatus', toBackendStatus(status));
        if (remarks.trim()) formData.append('TaskRemarks', remarks.trim());
        const res = await fetch(`/api/task/${id}/progress`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${localStorage.getItem('authToken') ?? ''}` },
            body: formData,
        });
        if (res.status === 401) { handleLogout(); return; }
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error((err as any).message || 'Failed to update task progress.');
        }
        setTasks(ts => ts.map(t => t.id === id ? {
            ...t,
            status: status === 'overdue' ? 'in-progress' : status,
            progress: status === 'done' ? 100 : status === 'completed' ? 100 : progress,
            remarks: remarks.trim() || t.remarks,
        } : t));
    };

    const viewingTask = viewingId != null ? tasks.find(t => t.id === viewingId) ?? null : null;
    const updatingTask = updatingId != null ? tasks.find(t => t.id === updatingId) ?? null : null;
    const pendingLeaveCount = leaveRecords.filter(r => r.status === 'Pending').length;
    const initials = getInitials(user.fullName);

    const pageTitles: Record<NavTab, string> = {
        dashboard: 'My Dashboard',
        'my-tasks': 'My Tasks',
        leave: 'Leave Requests',
        profile: 'My Profile',
        digital_201: 'My Digital 201 File',
        activity_logs: 'Activity Logs',
    };

    const today = new Date().toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

    return (
        <div className="dashboard-container">

            {/* ── Sidebar ── */}
            <aside className="sidebar">
                <div className="sidebar-logo">
                    <img src="/src/assets/SpeedexLogo.jpg" alt="Speedex Logo" className="sidebar-logo-img" />
                </div>

                <div className="sidebar-role-section">
                    <div className="sidebar-role-badge">
                        <div className="role-dot-inner" />
                        {toDisplayRole(user.role) || 'EMPLOYEE'}
                    </div>
                </div>

                <nav className="sidebar-nav">
                    {NAV_GROUPS.map(group => (
                        <div key={group.label} className="nav-section">
                            <div className="nav-section-title">{group.label}</div>
                            {group.items.map(({ tab, icon: Icon, label }) => (
                                <div
                                    key={tab}
                                    className={`nav-item${activeTab === tab ? ' nav-item-active' : ''}`}
                                    onClick={() => setActiveTab(tab)}
                                >
                                    <Icon size={18} />
                                    <span className="nav-item-label">{label}</span>
                                    {tab === 'leave' && pendingLeaveCount > 0 && (
                                        <span className="nav-badge">{pendingLeaveCount}</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    ))}
                </nav>

                <div className="sidebar-footer-profile">
                    <div className="profile-card">
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                            <div className="profile-avatar">
                                {loadingUser ? <Loader2 size={16} className="spin" /> : initials}
                            </div>
                            <span style={{
                                position: 'absolute', bottom: 1, right: 1,
                                width: 9, height: 9, borderRadius: '50%',
                                background: user.presenceStatus === 'Online' ? '#05cd99' : '#a3aed0',
                                border: '2px solid var(--sidebar-bg, #1b2559)',
                                display: 'block',
                            }} />
                        </div>
                        <div className="profile-info">
                            <span className="profile-name">{user.fullName || 'Employee'}</span>
                            <span className="profile-role">{toDisplayRole(user.role) || 'EMPLOYEE'}</span>
                        </div>
                        <button className="profile-logout" onClick={handleLogout} title="Logout" aria-label="Logout">
                            <LogOut size={16} />
                        </button>
                    </div>
                </div>
            </aside>

            {/* ── Main ── */}
            <main className="main-viewport">
                <DashboardHeader
                    title={pageTitles[activeTab]}
                    notificationApi="/api/notification/my-notifications"
                    userInitials={initials}
                    onSettingsClick={() => setActiveTab('profile')}
                    onLogout={handleLogout}
                />

                {activeTab === 'dashboard' && (
                    <DashboardTab
                        tasks={tasks} user={user}
                        onView={setViewingId} onUpdate={setUpdatingId}
                        onGoTasks={() => setActiveTab('my-tasks')}
                    />
                )}
                {activeTab === 'my-tasks' && (
                    <MyTasksTab
                        tasks={tasks} loading={tasksLoading} error={tasksError}
                        onView={setViewingId} onUpdate={setUpdatingId}
                        onRetry={fetchTasks}
                    />
                )}
                {activeTab === 'leave' && (
                    <LeaveTab
                        records={leaveRecords}
                        loading={leaveLoading}
                        onNewRecord={r => setLeaveRecords(prev => [r, ...prev])}
                    />
                )}
                {activeTab === 'profile' && (
                    <ProfileTab user={user} onUpdateUser={setUser} />
                )}
                {activeTab === 'digital_201' && (
                    <div className="tab-content" style={{ padding: '0 28px 28px' }}>
                        <Digital201FileView
                            employeeNumber={user.employeeId}
                            readOnly={false}
                        />
                    </div>
                )}
                {activeTab === 'activity_logs' && (
                    <div className="dashboard-content" style={{ padding: '0 28px 28px' }}>
                        <DataTable
                            title="My Activity Logs"
                            headers={['Date & Time', 'Activity Type', 'Description']}
                            loading={false}
                            emptyMessage="No activity logs found."
                            emptyIcon={<Activity size={24} />}
                            totalRecords={activityLogs.length}
                            currentPage={activityLogPage}
                            totalPages={activityLogTotalPages}
                            onPageChange={p => fetchActivityLogs(p)}
                        >
                            {activityLogs.map((log: any) => (
                                <tr key={log.activityLogId}>
                                    <td style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                                        {new Date(log.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                    <td>
                                        <span style={{
                                            display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 600,
                                            background: log.activityType === 'Login' ? 'var(--status-active-bg)' :
                                                log.activityType === 'Logout' ? 'var(--status-pending-bg)' : 'var(--status-new-bg)',
                                            color: log.activityType === 'Login' ? 'var(--status-active)' :
                                                log.activityType === 'Logout' ? 'var(--status-pending)' : 'var(--status-new)',
                                        }}>
                                            {log.activityType}
                                        </span>
                                    </td>
                                    <td style={{ fontSize: 13, color: 'var(--text-primary)' }}>{log.description}</td>
                                </tr>
                            ))}
                        </DataTable>
                    </div>
                )}
            </main>

            {/* ── Modals ── */}
            {viewingTask && (
                <TaskDetail
                    task={viewingTask}
                    onUpdate={() => { setUpdatingId(viewingTask.id); setViewingId(null); }}
                    onClose={() => setViewingId(null)}
                />
            )}
            {updatingTask && (
                <ProgressModal
                    task={updatingTask}
                    onSave={handleSaveProgress}
                    onClose={() => setUpdatingId(null)}
                />
            )}
        </div>
    );
}