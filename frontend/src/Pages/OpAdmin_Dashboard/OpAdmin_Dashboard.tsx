import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import * as signalR from '@microsoft/signalr';
import {
    ClipboardList,
    CheckCircle2,
    AlertCircle,
    Package,
    LayoutDashboard,
    Truck,
    BarChart3,
    UserCircle2,
    Plus,
    Pencil,
    X,
    Hash,
    Eye,
    EyeOff,
    Shield,
    Phone,
    Lock,
    ChevronRight,
    ChevronLeft,
    LogOut,
    Save,
    Loader2,
    Users,
    Search,
    Trash2,
    CalendarDays,
    Mail,
    RotateCcw,
    ThumbsUp,
    ThumbsDown,
    Download,
    FileText,
    Calendar,
    Filter,
    Repeat,
    ToggleLeft,
    Copy,
    Clock,
    Activity,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import './OpAdmin_Dashboard.css';
import { useNavigate } from 'react-router-dom';
import NotificationBell from '../../components/NotificationBell/NotificationBell';
import TaskView, { TaskViewTask } from '../../components/TaskView/TaskView';
import { useToast } from '../../components/Toast/Toast';
import ApprovalTracker, { TrackerData } from '../../components/ApprovalTracker/ApprovalTracker';
import LeaveRequestModal, {
    LeaveRecord,
    LeaveType,
    LeaveStatus,
    LEAVE_TYPES,
} from '../../components/LeaveRequestModal/LeaveRequestModal';
import PendingApprovalsTab from './PendingApprovalsTab';
import RoutingManagementTab from './RoutingManagementTab';
import { usePreventBackNav } from '../../components/Auth/usePreventBackNav';
import DashboardHeader from '../../components/DashboardHeader/DashboardHeader';
import StatCard from '../../components/StatCard/StatCard';
import DataTable, { ActionsDropdown } from '../../components/ui/DataTable';
import FormModal from '../../components/FormModal/FormModal';
import ActionButton from '../../components/ActionButton/ActionButton';
import ConfirmationModal from '../../components/ConfirmationModal/ConfirmationModal';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import SubTabNav from '../../components/ui/SubTabNav';
import TaskManager, { TMTask } from '../../components/TaskManager/TaskManager';

interface ConfirmModalState {
    isOpen: boolean;
    variant: 'neutral' | 'danger' | 'warning' | 'info' | 'success';
    title: string;
    description: string;
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
    onConfirm: () => { },
};

// --- Dashboard API Types ------------------------------------------------------

interface DashboardEmployeeWorkload {
    employeeId: string;
    employeeName: string;
    totalAssigned: number;
    activeTasks: number;
    completedTasks: number;
    overdueTasks: number;
}

interface DashboardResponse {
    totalTasksAssigned: number;
    totalActiveTasks: number;
    totalCompletedTasks: number;
    totalOverdueTasks: number;
    averageTasksPerEmployee: number;
    employeeWorkloadDistribution: DashboardEmployeeWorkload[];
    taskAssignmentDistribution: Record<string, number>;
    workflowTrackers: any[];
}

interface EmployeeFilterOption {
    employeeId: string;
    employeeName: string;
}

interface DepartmentFilterOption {
    departmentId: string;
    departmentName: string;
}

interface ApiResponse<T> {
    isSuccess: boolean;
    message: string;
    data: T | null;
}

// --- Types --------------------------------------------------------------------

type Priority = 'Critical' | 'High' | 'Medium' | 'Low';  // match backend casing
type TaskStatus = 'Draft' | 'Assigned' | 'Pending' | 'In Progress' | 'Pending Admin Review' | 'Done' | 'Completed' | 'Overdue';
type NavTab =
    | 'dashboard'
    | 'tasks'
    | 'team'
    | 'leave'
    | 'reports'
    | 'profile'
    | 'reopen'
    | 'templates'
    | 'approvals'
    | 'activity_logs';

interface TeamMember {
    accountId: string;
    employeeName: string;
    role: string;
    presenceStatus?: string;
}

interface Task {
    taskId: string;
    taskTitle: string;
    taskDescription: string;
    taskCategory?: string;
    taskReferenceNumber?: string;
    priority: Priority;
    dueAt: string | null;
    taskStatus: TaskStatus;
    taskRemarks?: string;
    assignedEmployee: string;
    createdByEmployee: string;
    assignedTo: string;
    createdAt: string;
    updatedAt?: string;
    deleted?: boolean;
    Deleted?: boolean;
    supportingEvidenceUrl?: string;
}

// DTOs matching backend
interface CreateTaskDTO {
    taskTitle: string;
    taskDescription: string;
    priority: string;
    dueAt: string;
    assignedTo?: string;
    taskCategory?: string;
    recommendedEmployeeId?: string;
    taskRemarks?: string;
    supportingEvidence?: File;
    IsDuplicateAcknowledged?: boolean;
}

interface UpdateTaskDTO {
    taskTitle: string;
    taskDescription: string;
    priority: Priority;
    dueAt: string | null;
    assignedTo: string;
    taskCategory?: string;
    taskRemarks?: string;
}

// DTO from backend for duplicate warnings
interface DuplicateWarningDTO {
    existingTaskTitle: string;
    existingTaskId: string;
    existingTaskStatus: string;
    similarityPercentage: number;
}

// --- Reopen Request Types ------------------------------------------------------

interface ReopenRequest {
    requestId: string;
    referenceNumber?: string;
    taskId: string;
    taskTitle: string;
    employeeName: string;
    employeeId: string;
    reason: string;
    supportingEvidence?: string;
    currentStatus: TaskStatus;
    status: 'Pending' | 'Approved' | 'Rejected';
    submittedAt: string;
    reviewedAt?: string;
    adminRemarks?: string;
}

// --- Report Types --------------------------------------------------------------

interface ReportFilter {
    dateRangeStart: string;
    dateRangeEnd: string;
    employeeId: string;
    taskPriorityLevel: string;
    taskStatus: string;
    taskCategory: string;
}

interface TaskCompletionReport {
    totalTasksAssigned: number;
    totalTasksCompleted: number;
    totalTasksInProgress: number;
    totalTasksPendingReview: number;
    totalOverdueTasks: number;
    taskCompletionRate: number;
    averageTaskCompletionTimeHours: number;
    employeePerformanceSummary: EmployeePerformance[];
}

interface EmployeePerformance {
    employeeName: string;
    totalAssigned: number;
    totalCompleted: number;
    completionRate: number;
    averageCompletionTimeHours: number;
}

interface OperationalFilter {
    dateRangeStart: string;
    dateRangeEnd: string;
    departmentId: string;
    employeeId: string;
    reportFormat: string;
}

interface OperationalSummaryReport {
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
    overdueTasks: number;
    taskCompletionRate: number;
    employeePerformanceSummary: OperationalEmployeePerformance[];
    workloadByCategory: WorkloadItem[];
    workloadByDepartment: WorkloadItem[];
    workloadByPriority: WorkloadItem[];
}

interface OperationalEmployeePerformance {
    employeeName: string;
    assigned: number;
    completed: number;
    overdue: number;
    completionRate: number;
}

interface WorkloadItem {
    categoryName: string;
    taskCount: number;
    percentage: number;
}

interface ReportFilterOption {
    id: string;
    name: string;
}

const TASK_CATEGORIES = [
    'Delivery',
    'Warehouse',
    'Maintenance',
    'Administrative',
    'Logistics',
];

const TASK_STATUSES_FILTER = [
    'Pending',
    'In Progress',
    'Pending Admin Review',
    'Done',
    'Completed',
    'Overdue',
];

const PRIORITY_LEVELS = ['Critical', 'High', 'Medium', 'Low'];

// --- Task Template Types -------------------------------------------------------

interface TaskTemplateDTO {
    templateId: string;
    templateName: string;
    templateDescription: string;
    priorityLevel: string;
    recurrenceType: string;
    recurrenceStartDate: string;
    assignedEmployeeId: string | null;
    assignedEmployeeName: string | null;
    templateStatus: string;
    nextGenerationDate: string | null;
    lastGeneratedDate: string | null;
    createdBy: string;
    createdByName: string | null;
    createdAt: string;
}

interface CreateTemplateDTO {
    templateName: string;
    templateDescription: string;
    priorityLevel: string;
    recurrenceType: string;
    recurrenceStartDate: string;
    assignedEmployee: string | null;
    templateStatus: string;
}

const RECURRENCE_TYPES = ['Daily', 'Weekly', 'Monthly'];
const TEMPLATE_STATUSES = ['Active', 'Inactive'];
const RECURRENCE_LABELS: Record<string, string> = { Daily: 'Every day', Weekly: 'Every week', Monthly: 'Every month' };

// --- Mock Template Data (toggle to test without backend) ----------------------






const NAV_GROUPS = [
    {
        label: 'MAIN MENU',
        items: [
            { tab: 'dashboard' as NavTab, icon: LayoutDashboard, label: 'Dashboard' },
            { tab: 'tasks' as NavTab, icon: Package, label: 'Tasks' },
            { tab: 'team' as NavTab, icon: Users, label: 'Team' },
        ],
    },
    {
        label: 'TEMPLATES',
        items: [
            { tab: 'templates' as NavTab, icon: Copy, label: 'Task Templates' },
        ],
    },
    {
        label: 'REPORTS',
        items: [
            { tab: 'reports' as NavTab, icon: BarChart3, label: 'Reports' },
        ],
    },
    {
        label: 'REQUESTS',
        items: [
            { tab: 'approvals' as NavTab, icon: Shield, label: 'Approvals' },
            { tab: 'reopen' as NavTab, icon: RotateCcw, label: 'Reopen Requests' },
        ],
    },
    {
        label: 'ACCOUNT',
        items: [
            { tab: 'profile' as NavTab, icon: UserCircle2, label: 'Profile' },
            { tab: 'leave' as NavTab, icon: CalendarDays, label: 'Leave Requests' },
            { tab: 'activity_logs' as NavTab, icon: Activity, label: 'Activity Logs' },
        ],
    },
];

// --- Helpers ------------------------------------------------------------------
const isEffectivelyOverdue = (t: Task): boolean =>
    t.taskStatus !== 'Completed' && t.taskStatus !== 'Draft' && t.taskStatus !== 'Done' && t.taskStatus !== 'Pending Admin Review' && !!t.dueAt && new Date(t.dueAt) < new Date();

const getInitials = (name: string): string => {
    if (!name) return 'OA';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
};

const statusBadgeClass = (s: string): string =>
({
    'Draft': 'badge badge-gray',
    'Assigned': 'badge badge-purple',
    'Pending': 'badge badge-blue',
    'In Progress': 'badge badge-amber',
    'Pending Admin Review': 'badge badge-purple',
    'Done': 'badge badge-blue',
    'Completed': 'badge badge-green',
    'Overdue': 'badge badge-red'
}[s] ?? 'badge badge-blue');

// --- FSM (Finite State Machine) Task Status Transitions ----------------------
const FSM_TRANSITIONS: Record<string, string[]> = {
    'Draft': ['Assigned'],
    'Assigned': ['In Progress'],
    'In Progress': ['Pending Admin Review'],
    'Pending Admin Review': ['Completed', 'In Progress'],
    'Done': ['Completed'],
    'Completed': [],
    'Pending': [],
    'Overdue': [],
};

const isTransitionValid = (from: string, to: string): boolean =>
    FSM_TRANSITIONS[from]?.includes(to) ?? false;

const priorityDotClass = (p: Priority): string =>
    ({ Critical: 'prio-dot critical', High: 'prio-dot high', Medium: 'prio-dot medium', Low: 'prio-dot low' }[p]);

const fmtDate = (d: string): string => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const fmtDateTime = (d: string): string => {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
};

const statusToProgress = (s: string): number => ({
    'Draft': 0,
    'Assigned': 10,
    'In Progress': 45,
    'Pending Admin Review': 75,
    'Done': 90,
    'Completed': 100,
    'Overdue': 45,
}[s] ?? 0);

// --- Sub-components -----------------------------------------------------------

const Avatar: React.FC<{ member: TeamMember; size?: 'sm' | 'md' }> = ({ member, size = 'sm' }) => (
    <div style={{ position: 'relative', display: 'inline-block' }}>
        <div className={`avatar-chip av-blue ${size === 'md' ? 'avatar-md' : ''}`}>
            {member.employeeName.charAt(0).toUpperCase()}
        </div>
        <span style={{
            position: 'absolute', bottom: 1, right: 1,
            width: 9, height: 9, borderRadius: '50%',
            background: member.presenceStatus === 'Online' ? 'var(--status-active)' : 'var(--text-secondary)',
            border: '2px solid var(--bg-primary, #fff)',
            display: 'block'
        }} title={member.presenceStatus ?? 'Offline'} />
    </div>
);

const PRIO_META: Record<string, { label: string; color: string; bg: string; border: string; icon: string }> = {
    Critical: { label: 'Critical', color: '#7c1d1d', bg: '#fef2f2', border: '#fecaca', icon: '🔴' },
    High: { label: 'High', color: '#b91c1c', bg: '#fff7ed', border: '#fed7aa', icon: '🟠' },
    Medium: { label: 'Medium', color: '#92400e', bg: '#fffbeb', border: '#fde68a', icon: '🟡' },
    Low: { label: 'Low', color: '#065f46', bg: '#f0fdf4', border: '#bbf7d0', icon: '🟢' },
};

const PrioBadge: React.FC<{ p: Priority }> = ({ p }) => {
    const m = PRIO_META[p] ?? PRIO_META.Medium;
    return (
        <span style={{
            fontSize: '0.65rem', padding: '1px 8px', borderRadius: 999, fontWeight: 700,
            color: m.color, background: m.bg, border: `1px solid ${m.border}`,
            display: 'inline-flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap',
        }}>
            {m.icon} {m.label}
        </span>
    );
};

const ProgressBar: React.FC<{ pct: number; cls: string }> = ({ pct, cls }) => (
    <div className="progress-bar">
        <div className={`progress-fill ${cls}`} style={{ width: `${pct}%` }} />
    </div>
);

interface TaskRowProps {
    task: Task;
    onView: (id: string) => void;   // string not number
    onEdit?: (id: string) => void;
    showEditBtn?: boolean;
}

const TaskRow: React.FC<TaskRowProps> = ({ task, onView, onEdit, showEditBtn = false }) => {
    const od = isEffectivelyOverdue(task);
    const effectiveStatus = od ? 'Overdue' : task.taskStatus;
    const progress = statusToProgress(effectiveStatus);
    const refDisplay = task.taskReferenceNumber || task.taskId.slice(0, 8).toUpperCase();

    return (
        <div className="task-item" onClick={() => onView(task.taskId)}>
            <div className="task-row-top">
                <span className={priorityDotClass(task.priority)} />
                <span className="task-name">
                    <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, letterSpacing: '0.05em', marginRight: 6 }}>
                        #{refDisplay}
                    </span>
                    {task.taskTitle}
                </span>
                <span className={statusBadgeClass(effectiveStatus)}>{effectiveStatus}</span>
                {showEditBtn && onEdit && (
                    <ActionsDropdown
                        actions={[
                            {
                                label: 'Edit',
                                icon: <Pencil size={12} />,
                                onClick: () => onEdit(task.taskId)
                            },
                            {
                                label: 'View Details',
                                icon: <Eye size={12} />,
                                onClick: () => onView(task.taskId)
                            }
                        ]}
                    />
                )}
            </div>
            <div style={{ margin: '6px 0 4px', height: 4, background: '#e8ecf4', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: `${progress}%`, height: '100%', background: progress >= 100 ? '#05cd99' : progress >= 75 ? '#4318ff' : progress >= 45 ? '#ffb547' : '#94a3b8', borderRadius: 2, transition: 'width 0.3s ease' }} />
            </div>
            <div className="task-row-bottom">
                <span className="task-assignee">{task.assignedEmployee || 'Unassigned'}</span>
                <span style={{ fontSize: 11, color: '#94a3b8', marginRight: 12 }}>{task.updatedAt ? fmtDateTime(task.updatedAt) : ''}</span>
                <span className={`task-due${od ? ' overdue' : ''}`}>{task.dueAt ? fmtDate(task.dueAt) : '—'}</span>
            </div>
        </div>
    );
};

// --- Modal: New / Edit Task ---------------------------------------------------

interface WorkloadInfo {
    employeeName: string;
    accountId: string;
    availabilityStatus: string;
    workload: number;
    role: string;
    isRecommended: boolean;
    recommendationReason: string;
}

interface Recommendation {
    employeeName: string;
    accountId: string;
    availabilityStatus: string;
    workload: number;
    reason: string;
}

interface TaskModalProps {
    mode: 'new' | 'edit';
    initial?: Partial<Task>;
    teamMembers: TeamMember[];
    tasks: Task[];
    onSave: (data: CreateTaskDTO | UpdateTaskDTO) => void;
    onClose: () => void;
    onDelete?: () => void;
    showSuccess?: (msg: string) => void;
}

const TaskModal: React.FC<TaskModalProps> = ({ mode, initial = {}, teamMembers, tasks, onSave, onClose, onDelete, showSuccess }) => {
    const resolvedAssignedTo =
        initial.assignedTo ||
        teamMembers.find(m => m.employeeName === initial.assignedEmployee)?.accountId ||
        '';

    const [form, setForm] = useState({
        taskTitle: initial.taskTitle ?? '',
        taskDescription: initial.taskDescription ?? '',
        dueAt: initial.dueAt ? initial.dueAt.substring(0, 16) : '',
        priority: initial.priority ?? '' as Priority,
        assignedTo: resolvedAssignedTo,
        taskCategory: initial.taskCategory ?? '',
        taskRemarks: initial.taskRemarks ?? '',
    });
    const [supportingEvidence, setSupportingEvidence] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState('');
    const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
    const [eligibleEmployees, setEligibleEmployees] = useState<WorkloadInfo[]>([]);
    const [recommendationAccepted, setRecommendationAccepted] = useState(true);

    useEffect(() => {
        const fetchRecommendations = async () => {
            try {
                const token = localStorage.getItem('authToken');
                const res = await fetch('/api/task/assignable-employees?pageNumber=1&pageSize=50', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const json = await res.json();
                if (json.isSuccess && json.data?.data) {
                    const mapped: WorkloadInfo[] = json.data.data.map((emp: any) => ({
                        employeeName: emp.displayName.replace(/ \(\d+ tasks\)( - Recommended)?$/, ''),
                        accountId: emp.accountId,
                        availabilityStatus: emp.availabilityStatus || 'Active',
                        workload: emp.activeTaskCount,
                        role: emp.role,
                        isRecommended: emp.isRecommended,
                        recommendationReason: emp.recommendationReason,
                    }));
                    setEligibleEmployees(mapped);
                    const recommended = mapped.find(e => e.isRecommended);
                    if (recommended) {
                        setRecommendation({
                            employeeName: recommended.employeeName,
                            accountId: recommended.accountId,
                            availabilityStatus: recommended.availabilityStatus,
                            workload: recommended.workload,
                            reason: recommended.recommendationReason,
                        });
                    }
                }
            } catch {
            }
        };
        fetchRecommendations();
    }, []);

    // -- Per-field live validator ------------------------------------------
    const validateField = (key: string, value: string): string => {
        switch (key) {
            case 'taskTitle': {
                const v = value.trim();
                if (!v) return 'Task title is required.';
                if (v.length < 3) return 'Title must be at least 3 characters.';
                if (v.length > 150) return 'Title must not exceed 150 characters.';
                return '';
            }
            case 'taskDescription': {
                const v = value.trim();
                if (!v) return 'Task description is required.';
                if (v.length > 2000) return 'Description must not exceed 2,000 characters.';
                return '';
            }
            case 'dueAt': {
                if (!value) return 'Deadline is required.';
                const selected = new Date(value);
                const now = new Date();
                if (selected < now) return 'Deadline must be a future date and time.';
                return '';
            }
            case 'assignedTo': {
                return '';
            }
            case 'priority': {
                if (!value) return 'Priority is required.';
                if (!['Critical', 'High', 'Medium', 'Low'].includes(value)) return 'Please select a valid priority.';
                return '';
            }
            default:
                return '';
        }
    };

    // -- Validate all fields on submit -------------------------------------
    const validateAll = (): boolean => {
        const newErrors: Record<string, string> = {};
        (['taskTitle', 'taskDescription', 'dueAt', 'priority'] as const).forEach(key => {
            const msg = validateField(key, form[key] ?? '');
            if (msg) newErrors[key] = msg;
        });
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // -- Live change handler -----------------------------------------------
    const set = (key: keyof typeof form) =>
        (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
            const value = e.target.value;
            setForm(prev => ({ ...prev, [key]: value }));
            setFormError('');
            const msg = validateField(key, value);
            setErrors(prev => ({ ...prev, [key]: msg || '' }));
        };

    const handleSave = () => {
        if (!validateAll()) return;
        setSubmitting(true);
        const payload: CreateTaskDTO = {
            taskTitle: form.taskTitle.trim(),
            taskDescription: form.taskDescription.trim(),
            priority: form.priority,
            dueAt: form.dueAt || '',
            assignedTo: form.assignedTo || undefined,
            taskCategory: form.taskCategory.trim() || undefined,
            recommendedEmployeeId: recommendation?.accountId || undefined,
            taskRemarks: form.taskRemarks.trim() || undefined,
        };
        if (supportingEvidence) {
            payload.supportingEvidence = supportingEvidence;
        }
        onSave(payload);
        if (mode === 'new' && showSuccess) {
            showSuccess('Task created successfully.');
        }
        setSubmitting(false);
    };

    // -- Shared field error renderer ---------------------------------------
    const FieldErr = ({ name }: { name: string }) =>
        errors[name] ? (
            <span style={{ fontSize: 11, color: 'var(--status-failed, #ee5d50)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                <AlertCircle size={11} />{errors[name]}
            </span>
        ) : null;

    // -- Char counter renderer ---------------------------------------------
    const CharCount = ({ value, max }: { value: string; max: number }) => (
        <span style={{
            fontSize: 11, marginTop: 3, display: 'block', textAlign: 'right',
            color: value.length > max * 0.9 ? (value.length >= max ? 'var(--status-failed, #ee5d50)' : '#c05c00') : 'var(--text-secondary)',
        }}>
            {value.length}/{max}
        </span>
    );

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-card" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div>
                        <h3>{mode === 'new' ? 'Create New Task' : 'Edit Task'}</h3>
                        <p className="modal-subtitle">
                            {mode === 'new' ? 'Fill in the details to create a new task.' : 'Update the task details below.'}
                        </p>
                    </div>
                    <button className="icon-btn" onClick={onClose}><X size={16} /></button>
                </div>

                <div className="modal-form">

                    {/* -- Task Title -- */}
                    <div className="field">
                        <label>Task Title <span style={{ color: 'var(--status-failed, #ee5d50)' }}>*</span></label>
                        <input
                            value={form.taskTitle}
                            onChange={set('taskTitle')}
                            placeholder="e.g. Route planning update"
                            className={errors.taskTitle ? 'input-error' : ''}
                            maxLength={150}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <FieldErr name="taskTitle" />
                            {!errors.taskTitle && form.taskTitle.trim().length >= 3 && (
                                <span style={{ fontSize: 11, color: 'var(--status-active)', marginTop: 3 }}>✓ Looks good</span>
                            )}
                            <CharCount value={form.taskTitle} max={150} />
                        </div>
                    </div>

                    {/* -- Description -- */}
                    <div className="field">
                        <label>Description <span style={{ color: 'var(--status-failed, #ee5d50)' }}>*</span></label>
                        <textarea
                            value={form.taskDescription}
                            onChange={set('taskDescription')}
                            placeholder="Describe the task..."
                            rows={3}
                            className={errors.taskDescription ? 'input-error' : ''}
                            maxLength={2000}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <FieldErr name="taskDescription" />
                            <CharCount value={form.taskDescription} max={2000} />
                        </div>
                    </div>

                    {/* -- Due Date + Priority -- */}
                    <div className="field-row">
                        <div className="field">
                            <label>
                                Due Date <span style={{ color: 'var(--status-failed, #ee5d50)' }}>*</span>
                            </label>
                            <input
                                type="datetime-local"
                                value={form.dueAt}
                                onChange={set('dueAt')}
                                className={errors.dueAt ? 'input-error' : form.dueAt ? 'input-success' : ''}
                            />
                            <FieldErr name="dueAt" />
                            {!errors.dueAt && form.dueAt && (
                                <span style={{ fontSize: 11, color: 'var(--status-active)', marginTop: 3, display: 'block' }}>
                                    ✓ {new Date(form.dueAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </span>
                            )}
                            {!form.dueAt && !errors.dueAt && (
                                <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 3, display: 'block' }}>
                                    Cannot be in the past.
                                </span>
                            )}
                        </div>
                        <div className="field">
                            <label>
                                Priority <span style={{ color: 'var(--status-failed, #ee5d50)' }}>*</span>
                            </label>
                            <select
                                value={form.priority}
                                onChange={set('priority')}
                                className={errors.priority ? 'input-error' : ''}
                            >
                                <option value="">Select priority</option>
                                <option value="Critical">🔴 Critical</option>
                                <option value="High">🟠 High</option>
                                <option value="Medium">🟡 Medium</option>
                                <option value="Low">🟢 Low</option>
                            </select>
                            <FieldErr name="priority" />
                            {!errors.priority && form.priority && (
                                <span style={{
                                    fontSize: 11, marginTop: 3, display: 'block',
                                    color: form.priority === 'Critical' ? '#7c1d1d' : form.priority === 'High' ? 'var(--status-failed)' : form.priority === 'Medium' ? 'var(--status-pending)' : 'var(--status-active)',
                                }}>
                                    {form.priority === 'Critical' && '🔴 Critical — requires immediate attention'}
                                    {form.priority === 'High' && '🟠 High priority — will be flagged for urgent attention'}
                                    {form.priority === 'Medium' && '🟡 Medium priority selected'}
                                    {form.priority === 'Low' && '🟢 Low priority selected'}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* -- Task Category -- */}
                    <div className="field">
                        <label>Task Category <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400 }}>(optional)</span></label>
                        <select
                            value={form.taskCategory}
                            onChange={set('taskCategory')}
                        >
                            <option value="">Select category</option>
                            <option value="Operations">Operations</option>
                            <option value="Logistics">Logistics</option>
                            <option value="IT & Admin">IT & Admin</option>
                            <option value="Customer Service">Customer Service</option>
                            <option value="Maintenance">Maintenance</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    {/* -- Supporting Document -- */}
                    <div className="field">
                        <label>Supporting Document <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400 }}>(optional)</span></label>
                        {initial.supportingEvidenceUrl && !supportingEvidence && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, padding: '8px 12px', background: 'rgba(67,24,255,0.04)', border: '1px solid rgba(67,24,255,0.15)', borderRadius: 8, marginBottom: 8 }}>
                                <span style={{ fontSize: 12, color: 'var(--primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {(initial.supportingEvidenceUrl.split('/').pop() || '').replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_/i, '')}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => window.open(initial.supportingEvidenceUrl, '_blank')}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', padding: 4, fontSize: 11, fontWeight: 600 }}
                                >
                                    View
                                </button>
                            </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png"
                                onChange={e => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
                                        const allowed = ['pdf', 'docx', 'xlsx', 'jpg', 'jpeg', 'png'];
                                        if (!allowed.includes(ext)) {
                                            setFormError('Invalid file format. Allowed: PDF, DOCX, XLSX, JPG, PNG.');
                                            return;
                                        }
                                        if (file.size > 20 * 1024 * 1024) {
                                            setFormError('File size must not exceed 20MB.');
                                            return;
                                        }
                                        setFormError('');
                                        setSupportingEvidence(file);
                                    }
                                }}
                                style={{ flex: 1, fontSize: 13 }}
                            />
                            {supportingEvidence && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSupportingEvidence(null);
                                        if (fileInputRef.current) fileInputRef.current.value = '';
                                    }}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ee5d50', padding: 4 }}
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                        {supportingEvidence ? (
                            <span style={{ fontSize: 11, color: 'var(--status-active)', marginTop: 3, display: 'block' }}>
                                ✓ {supportingEvidence.name} ({(supportingEvidence.size / 1024 / 1024).toFixed(1)} MB)
                            </span>
                        ) : initial.supportingEvidenceUrl ? (
                            <span style={{ fontSize: 11, color: '#94a3b8', marginTop: 3, display: 'block' }}>
                                Leave empty to keep current file. Select a new file above to replace it.
                            </span>
                        ) : null}
                    </div>

                    {/* -- Smart Task Routing Recommendation -- */}
                    {recommendation && (
                        <div className="sr-section">
                            <div className="sr-header">
                                <div className="sr-title-row">
                                    <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>
                                        Smart Task Routing
                                    </span>
                                    <span className="sr-badge">Recommendation Ready</span>
                                </div>
                            </div>

                            <div className="sr-recommendation">
                                <div className="sr-rec-avatar">
                                    {recommendation.employeeName.charAt(0).toUpperCase()}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div className="sr-rec-name">{recommendation.employeeName}</div>
                                    <div className="sr-rec-meta">
                                        <span>Workload: <strong>{recommendation.workload} active tasks</strong></span>
                                        <span className={`sr-status-dot ${recommendation.availabilityStatus === 'Active' || recommendation.availabilityStatus === 'Online' ? 'online' : ''}`} />
                                        <span>Status: <strong>{recommendation.availabilityStatus}</strong></span>
                                    </div>
                                    <div className="sr-rec-reason">{recommendation.reason}</div>
                                </div>
                            </div>

                            {eligibleEmployees.length > 0 && (
                                <div className="sr-eligible-list">
                                    <div className="sr-eligible-title">Employee Availability & Workload</div>
                                    <div className="sr-eligible-header">
                                        <span>Employee</span>
                                        <span>Status</span>
                                        <span>Workload</span>
                                        <span />
                                    </div>
                                    {eligibleEmployees.map(e => (
                                        <div key={e.accountId} className={`sr-eligible-row${e.accountId === recommendation.accountId ? ' recommended' : ''}`}>
                                            <span className="sr-emp-name">{e.employeeName}</span>
                                            <span className={`sr-status-tag ${e.availabilityStatus === 'Active' || e.availabilityStatus === 'Online' ? 'active' : e.availabilityStatus === 'Offline' ? 'offline' : 'leave'}`}>
                                                {e.availabilityStatus}
                                            </span>
                                            <span className="sr-workload">{e.workload} tasks</span>
                                            {e.accountId === recommendation.accountId && (
                                                <span className="sr-rec-tag">Recommended</span>
                                            )}
                                        </div>
                                    ))}
                                    {teamMembers.filter(m => m.presenceStatus === 'Offline' || m.presenceStatus === 'On Leave').map(m => (
                                        <div key={m.accountId} className="sr-eligible-row excluded">
                                            <span className="sr-emp-name">{m.employeeName}</span>
                                            <span className={`sr-status-tag ${m.presenceStatus === 'Offline' ? 'offline' : 'leave'}`}>
                                                {m.presenceStatus}
                                            </span>
                                            <span className="sr-workload">—</span>
                                            <span className="sr-excluded-tag">Excluded</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="sr-note">
                                The system recommended <strong>{recommendation.employeeName}</strong> based on lowest workload.
                                You can accept this recommendation or select a different employee below.
                            </div>
                        </div>
                    )}

                    {/* -- Assign To -- */}
                    <div className="field">
                        <label>
                            {mode === 'new' ? 'Final Assigned Employee' : 'Assign To'}
                        </label>
                        <div
                            className={`assignee-select${errors.assignedTo ? ' input-error' : ''}`}
                            tabIndex={0}
                            onBlur={e => {
                                if (!e.currentTarget.contains(e.relatedTarget))
                                    e.currentTarget.querySelector<HTMLElement>('.assignee-options')?.style.setProperty('display', 'none');
                            }}
                        >
                            <div
                                className="assignee-trigger"
                                onClick={e => {
                                    const opts = e.currentTarget.nextElementSibling as HTMLElement;
                                    opts.style.display = opts.style.display === 'block' ? 'none' : 'block';
                                }}
                            >
                                <span className={form.assignedTo ? 'assignee-trigger-value' : 'assignee-trigger-placeholder'}>
                                    {form.assignedTo
                                        ? teamMembers.find(m => m.accountId === form.assignedTo)?.employeeName ?? 'Select employee'
                                        : 'Select employee'}
                                </span>
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                    <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                </svg>
                            </div>
                            <div className="assignee-options" style={{ display: 'none' }}>
                                <div
                                    className="assignee-option placeholder-opt"
                                    onClick={e => {
                                        setForm(prev => ({ ...prev, assignedTo: '' }));
                                        setErrors(prev => ({ ...prev, assignedTo: '' }));
                                        setRecommendationAccepted(false);
                                        (e.currentTarget.closest('.assignee-options') as HTMLElement).style.display = 'none';
                                    }}
                                >
                                    Select employee
                                </div>
                                {teamMembers.map(m => (
                                    <div
                                        key={m.accountId}
                                        className={`assignee-option${form.assignedTo === m.accountId ? ' selected' : ''}`}
                                        onClick={e => {
                                            setForm(prev => ({ ...prev, assignedTo: m.accountId }));
                                            setErrors(prev => ({ ...prev, assignedTo: '' }));
                                            if (recommendation && m.accountId !== recommendation.accountId) {
                                                setRecommendationAccepted(false);
                                            }
                                            (e.currentTarget.closest('.assignee-options') as HTMLElement).style.display = 'none';
                                        }}
                                    >
                                        <span className="assignee-opt-name">{m.employeeName}</span>
                                        <span className="assignee-opt-role">{m.role}</span>
                                        {recommendation && m.accountId === recommendation.accountId && (
                                            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--primary)', background: 'rgba(67,24,255,0.08)', padding: '2px 6px', borderRadius: 4, marginLeft: 8 }}>Recommended</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <FieldErr name="assignedTo" />
                        {!errors.assignedTo && form.assignedTo && (
                            <span style={{ fontSize: 11, color: 'var(--status-active)', marginTop: 3, display: 'block' }}>
                                ✓ {teamMembers.find(m => m.accountId === form.assignedTo)?.employeeName} assigned
                            </span>
                        )}
                    </div>

                    {/* -- Remarks (edit mode only) -- */}
                    {mode === 'edit' && (
                        <div className="field">
                            <label>Remarks</label>
                            <input
                                value={form.taskRemarks}
                                onChange={set('taskRemarks')}
                                placeholder="Optional remarks..."
                                maxLength={200}
                            />
                            <CharCount value={form.taskRemarks} max={200} />
                        </div>
                    )}
                </div>

                {formError && (
                    <div className="form-api-error" style={{ marginBottom: 8 }}>
                        <AlertCircle size={14} /><span>{formError}</span>
                    </div>
                )}

                <div className="modal-actions">
                    <div style={{ display: 'flex', gap: 8, flex: 1 }}>
                        {mode === 'edit' && onDelete && (
                            <button className="btn btn-danger" onClick={() => onDelete()} disabled={submitting}>
                                <Trash2 size={13} /> Delete Task
                            </button>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn" onClick={onClose} disabled={submitting}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleSave} disabled={submitting}>
                            {submitting
                                ? <><Loader2 size={13} className="spin" /> Saving�</>
                                : <><Save size={13} /> Save Changes</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Modal: View Task ---------------------------------------------------------

interface ViewModalProps {
    task: Task;
    onEdit: () => void;
    onReopen: () => void;
    onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
    onAdminOverride: (taskId: string) => void;
    onClose: () => void;
    onViewMore?: () => void;
    onReview?: () => void;
}

const ViewModal: React.FC<ViewModalProps> = ({ task, onEdit, onReopen, onStatusChange, onAdminOverride, onClose, onViewMore, onReview }) => {
    const nextStatus = (FSM_TRANSITIONS[task.taskStatus]?.[0] ?? '') as TaskStatus;
    const canTransition = !!nextStatus;
    const statusLabel: Record<string, string> = {
        'Draft': 'Assign Task',
        'Assigned': 'Mark In Progress',
        'In Progress': 'Mark Done',
        'Done': 'Approve & Complete',
        'Pending Admin Review': 'Review & Complete',
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-card view-modal-card" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="view-modal-header">
                    <div>
                        <h3 className="view-modal-title">{task.taskTitle}</h3>
                        <p className="view-modal-subtitle">Created by: {task.createdByEmployee}</p>
                    </div>
                </div>

                {/* Meta row */}
                <div className="view-modal-meta">
                    <div className="view-modal-meta-item">
                        <span className="view-modal-label">Due Date</span>
                        <span className="view-modal-meta-value">{task.dueAt ? fmtDate(task.dueAt) : '�'}</span>
                    </div>
                    <div className="view-modal-meta-item">
                        <span className="view-modal-label">Priority</span>
                        <PrioBadge p={task.priority} />
                    </div>
                    <div className="view-modal-meta-item">
                        <span className="view-modal-label">Status</span>
                        <span className={statusBadgeClass(task.taskStatus)}>{task.taskStatus}</span>
                    </div>
                </div>

                {/* Description */}
                <div className="view-modal-section">
                    <label className="view-modal-label">Description</label>
                    <div className="view-modal-desc-box">
                        {task.taskDescription || ''}
                    </div>
                </div>

                {/* Assigned To */}
                <div className="view-modal-section">
                    <label className="view-modal-label">Assigned To:</label>
                    <div className="view-modal-assignee-box">
                        {task.assignedEmployee || '�'}
                    </div>
                </div>

                {/* Remarks if any */}
                {task.taskRemarks && (
                    <div className="view-modal-section">
                        <label className="view-modal-label">Remarks</label>
                        <div className="view-modal-desc-box">{task.taskRemarks}</div>
                    </div>
                )}

                {/* Actions */}
                <div className="view-modal-actions">
                    {canTransition && task.taskStatus !== 'Pending Admin Review' && (
                        <button className="btn btn-primary" onClick={() => onStatusChange(task.taskId, nextStatus)}
                            title={`Transition to ${nextStatus}`}>
                            {statusLabel[task.taskStatus] ?? `Move to ${nextStatus}`}
                        </button>
                    )}
                    {task.taskStatus === 'Pending Admin Review' && (
                        <button className="btn btn-primary" onClick={onReview}
                            title="Review task submission">
                            <Eye size={13} /> Review Task
                        </button>
                    )}
                    {task.taskStatus === 'Completed' && (
                        <button className="btn btn-primary" onClick={() => onAdminOverride(task.taskId)}
                            title="Admin override for completed task">
                            <RotateCcw size={13} /> Admin Override
                        </button>
                    )}
                    <button className="btn btn-primary" onClick={onViewMore}>
                        View More
                    </button>
                    {task.taskStatus !== 'Completed' && (
                        <button className="btn btn-primary" onClick={onEdit}>
                            <Pencil size={13} /> Edit Task
                        </button>
                    )}
                    <button className="btn" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
};

// --- Admin Override Modal ------------------------------------------------------
const OVERRIDE_TARGETS = ['Assigned', 'In Progress', 'Done'];

interface AdminOverrideModalProps {
    task: Task;
    onSubmit: (reason: string, remarks: string, requestedStatus: string) => void;
    onClose: () => void;
}

const AdminOverrideModal: React.FC<AdminOverrideModalProps> = ({ task, onSubmit, onClose }) => {
    const [requestedStatus, setRequestedStatus] = useState('In Progress');
    const [reason, setReason] = useState('');
    const [remarks, setRemarks] = useState('');
    const [confirmed, setConfirmed] = useState(false);
    const [errors, setErrors] = useState<{ reason?: string; remarks?: string; confirmed?: string; requestedStatus?: string }>({});

    const handleSubmit = () => {
        const e: typeof errors = {};
        if (!requestedStatus) e.requestedStatus = 'Target status is required.';
        if (!reason.trim()) e.reason = 'Override reason is required.';
        else if (reason.length > 500) e.reason = 'Override reason must not exceed 500 characters.';
        if (!remarks.trim()) e.remarks = 'Admin remarks are required.';
        else if (remarks.length > 500) e.remarks = 'Admin remarks must not exceed 500 characters.';
        if (!confirmed) e.confirmed = 'You must confirm this override.';
        setErrors(e);
        if (Object.keys(e).length === 0) onSubmit(reason.trim(), remarks.trim(), requestedStatus);
    };

    return (
        <FormModal isOpen onClose={onClose} title="Admin Override" subtitle={`Modifying completed task: ${task.taskTitle}`} size="sm" confirmOnCancel={true}
            footer={
                <>
                    <button className="btn" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleSubmit}
                        style={{ background: 'var(--status-failed)', borderColor: 'var(--status-failed)' }}>
                        <Shield size={14} /> Submit Override
                    </button>
                </>
            }
        >
            <div className="view-modal-meta" style={{ marginBottom: 16 }}>
                <div className="view-modal-meta-item">
                    <span className="view-modal-label">Task ID</span>
                    <span className="view-modal-meta-value" style={{ fontSize: 12 }}>{task.taskId}</span>
                </div>
                <div className="view-modal-meta-item">
                    <span className="view-modal-label">Current Status</span>
                    <span className={statusBadgeClass(task.taskStatus)}>{task.taskStatus}</span>
                </div>
                <div className="view-modal-meta-item">
                    <span className="view-modal-label">Priority</span>
                    <PrioBadge p={task.priority} />
                </div>
            </div>

            <div className="field">
                <label>Requested Status *</label>
                <select value={requestedStatus} onChange={e => setRequestedStatus(e.target.value)}
                    className={errors.requestedStatus ? 'report-input report-input-error' : 'report-input'}>
                    {OVERRIDE_TARGETS.map(s => (<option key={s} value={s}>{s}</option>))}
                </select>
                {errors.requestedStatus && <span className="report-field-error">{errors.requestedStatus}</span>}
            </div>

            <div className="field">
                <label>Override Reason *</label>
                <textarea className={errors.reason ? 'report-input report-input-error' : 'report-input'}
                    rows={3} maxLength={500} value={reason}
                    onChange={e => { setReason(e.target.value); setErrors(p => ({ ...p, reason: '' })); }}
                    placeholder="Explain why this completed task needs modification..." />
                {errors.reason && <span className="report-field-error">{errors.reason}</span>}
                <span style={{ fontSize: 11, marginTop: 3, display: 'block', textAlign: 'right', color: reason.length > 450 ? (reason.length >= 500 ? 'var(--status-failed)' : '#c05c00') : 'var(--text-secondary)' }}>
                    {reason.length}/500
                </span>
            </div>

            <div className="field">
                <label>Admin Remarks *</label>
                <textarea className={errors.remarks ? 'report-input report-input-error' : 'report-input'}
                    rows={3} maxLength={500} value={remarks}
                    onChange={e => { setRemarks(e.target.value); setErrors(p => ({ ...p, remarks: '' })); }}
                    placeholder="Additional notes for the audit log..." />
                {errors.remarks && <span className="report-field-error">{errors.remarks}</span>}
                <span style={{ fontSize: 11, marginTop: 3, display: 'block', textAlign: 'right', color: remarks.length > 450 ? (remarks.length >= 500 ? 'var(--status-failed)' : '#c05c00') : 'var(--text-secondary)' }}>
                    {remarks.length}/500
                </span>
            </div>

            <div className="field" style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <input type="checkbox" id="override-confirm" checked={confirmed}
                    onChange={e => { setConfirmed(e.target.checked); setErrors(p => ({ ...p, confirmed: '' })); }}
                    style={{ marginTop: 3 }} />
                <label htmlFor="override-confirm" style={{ fontSize: 13, fontWeight: 500, margin: 0, textTransform: 'none', letterSpacing: 0, color: 'var(--text-primary)' }}>
                    I confirm this admin override. I understand this action will be recorded in the Audit Log and the task will be reopened for modification.
                </label>
            </div>
            {errors.confirmed && <span className="report-field-error">{errors.confirmed}</span>}
        </FormModal>
    );
};

// --- Task Review Modal (Approve & Close / Return for Rework) ------------------
interface TaskReviewModalProps {
    task: Task;
    onSubmit: (taskId: string, adminDecision: 'Approve & Close' | 'Return for Rework', reviewerRemarks: string) => Promise<void>;
    onClose: () => void;
}

const TaskReviewModal: React.FC<TaskReviewModalProps> = ({ task, onSubmit, onClose }) => {
    const [decision, setDecision] = useState<'Approve & Close' | 'Return for Rework' | ''>('');
    const [remarks, setRemarks] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async () => {
        if (!decision) { setError('Please select an admin decision.'); return; }
        if (decision === 'Return for Rework' && !remarks.trim()) {
            setError('Reviewer Remarks are required when returning a task for rework.');
            return;
        }
        setError('');
        setSubmitting(true);
        try {
            await onSubmit(task.taskId, decision, remarks.trim());
            onClose();
        } catch (err: any) {
            setError(err.message ?? 'Failed to submit review decision.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <FormModal isOpen onClose={onClose} title="Review Task Submission" subtitle={`Reviewing: ${task.taskTitle}`} size="md" confirmOnCancel={true}
            footer={
                <>
                    <button className="btn" onClick={onClose} disabled={submitting}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting || !decision}>
                        {submitting
                            ? <><Loader2 size={13} className="spin" /> Submitting�</>
                            : <><Shield size={13} /> Submit Review Decision</>
                        }
                    </button>
                </>
            }
        >
            <div className="view-modal-meta" style={{ marginBottom: 16 }}>
                <div className="view-modal-meta-item">
                    <span className="view-modal-label">Task ID</span>
                    <span className="view-modal-meta-value" style={{ fontSize: 12 }}>{task.taskId}</span>
                </div>
                <div className="view-modal-meta-item">
                    <span className="view-modal-label">Assigned To</span>
                    <span className="view-modal-meta-value">{task.assignedEmployee}</span>
                </div>
                <div className="view-modal-meta-item">
                    <span className="view-modal-label">Priority</span>
                    <PrioBadge p={task.priority} />
                </div>
            </div>

            {task.taskRemarks && (
                <div className="field">
                    <label>Employee Notes</label>
                    <div style={{ padding: '10px 12px', background: 'var(--bg-main)', borderRadius: 8, fontSize: 13, lineHeight: 1.5, color: 'var(--text-primary)' }}>
                        {task.taskRemarks}
                    </div>
                </div>
            )}

            <div className="field">
                <label>Admin Decision <span style={{ color: 'var(--status-failed)' }}>*</span></label>
                <select className="report-select" value={decision}
                    onChange={e => { setDecision(e.target.value as 'Approve & Close' | 'Return for Rework'); setError(''); }}>
                    <option value="">Select decision</option>
                    <option value="Approve & Close">Approve & Close</option>
                    <option value="Return for Rework">Return for Rework</option>
                </select>
            </div>

            <div className="field">
                <label>
                    Reviewer Remarks
                    {decision === 'Return for Rework' && <span style={{ color: 'var(--status-failed)' }}> * (Required for rework)</span>}
                </label>
                <textarea className={remarks.length > 500 ? 'report-input report-input-error' : 'report-input'}
                    rows={4} maxLength={500} value={remarks}
                    onChange={e => { setRemarks(e.target.value); setError(''); }}
                    placeholder={decision === 'Return for Rework' ? 'Provide specific instructions on what needs to be improved...' : 'Optional closing remarks...'}
                    disabled={!decision} />
                <span style={{ fontSize: 11, marginTop: 3, display: 'block', textAlign: 'right', color: remarks.length > 450 ? (remarks.length >= 500 ? 'var(--status-failed)' : '#c05c00') : 'var(--text-secondary)' }}>
                    {remarks.length}/500
                </span>
            </div>

            {error && <div className="form-api-error" style={{ marginBottom: 10 }}><AlertCircle size={14} /><span>{error}</span></div>}
        </FormModal>
    );
};

// --- Dashboard Tab ------------------------------------------------------------

const DashboardTab: React.FC<{
    dashboardData: DashboardResponse | null;
    dashboardEmployees: EmployeeFilterOption[];
    dashboardDepartments: DepartmentFilterOption[];
    dashboardLoading: boolean;
    dashboardError: string | null;
    filters: { dateStart: string; dateEnd: string; employeeId: string; departmentId: string; taskStatus: string };
    onFilterChange: (filters: { dateStart: string; dateEnd: string; employeeId: string; departmentId: string; taskStatus: string }) => void;
    onClearFilters: () => void;
    onNewTask: () => void;
}> = ({ dashboardData, dashboardEmployees, dashboardDepartments, dashboardLoading, dashboardError, filters, onFilterChange, onClearFilters, onNewTask }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const hasAnyFilter = filters.dateStart || filters.dateEnd || filters.employeeId || filters.departmentId || filters.taskStatus;
    const td = dashboardData;

    const total = td?.totalTasksAssigned ?? 0;
    const active = td?.totalActiveTasks ?? 0;
    const completed = td?.totalCompletedTasks ?? 0;
    const overdue = td?.totalOverdueTasks ?? 0;
    const avgPerEmployee = td?.averageTasksPerEmployee?.toFixed(1) ?? '0';
    const pct = total > 0 ? Math.round(completed / total * 100) : 0;
    const completionColor = pct >= 80 ? 'var(--status-active)' : pct >= 50 ? 'var(--status-pending)' : 'var(--status-failed)';
    const workloads = td?.employeeWorkloadDistribution ?? [];
    const filteredWorkloads = searchQuery
        ? workloads.filter(w => w.employeeName.toLowerCase().includes(searchQuery.toLowerCase()))
        : workloads;
    const taskDist = td?.taskAssignmentDistribution ?? {};
    const pendingReview = taskDist['Pending Admin Review'] ?? 0;
    const done = taskDist['Done'] ?? 0;

    const statusChartData = [
        { name: 'Active', value: active, color: 'var(--status-pending)' },
        { name: 'Pending Review', value: pendingReview, color: 'var(--primary)' },
        { name: 'Completed', value: completed, color: 'var(--status-active)' },
        { name: 'Overdue', value: overdue, color: 'var(--status-failed)' },
    ].filter(d => d.value > 0);

    const workloadChartData = workloads.map(w => ({
        name: w.employeeName.split(' ')[0],
        Total: w.totalAssigned,
        Completed: w.completedTasks,
        Overdue: w.overdueTasks,
    }));

    const donutColors = statusChartData.map(d => d.color);

    return (
        <div className="dashboard-content">
            {dashboardLoading ? (
                <EmptyState icon={<Loader2 size={24} className="spin" />} title="Loading workload data..." />
            ) : (
                <>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                        <div style={{ position: 'relative', width: 300, margin: 0 }}>
                            <Search size={14} style={{ position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input type="text" placeholder="Search employee…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                style={{ width: '100%', height: 46, borderRadius: 999, border: '1px solid #dbe3f0', background: '#f8fafc', padding: '0 20px 0 42px', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                                onFocus={e => { e.target.style.background = '#ffffff'; e.target.style.borderColor = '#14b8a6'; e.target.style.boxShadow = '0 0 0 4px rgba(20,184,166,0.08)'; }}
                                onBlur={e => { e.target.style.background = '#f8fafc'; e.target.style.borderColor = '#dbe3f0'; e.target.style.boxShadow = 'none'; }} />
                        </div>
                        <button className="btn btn-primary" onClick={onNewTask} style={{ display: 'flex', alignItems: 'center', gap: 6, height: 36, padding: '0 16px', borderRadius: 9, fontSize: 13, whiteSpace: 'nowrap' }}>
                            <Plus size={14} /> New Task
                        </button>
                    </div>
                    <div className="stats-row">
                        {[
                            { label: 'TOTAL', value: total, icon: <ClipboardList size={20} strokeWidth={2.3} />, variant: 'primary' as const, subtext: `${total} task${total !== 1 ? 's' : ''}` },
                            { label: 'ACTIVE', value: active, icon: <Loader2 size={20} strokeWidth={2.3} />, variant: 'warning' as const, subtext: 'In Progress / Assigned' },
                            { label: 'DONE', value: done, icon: <CheckCircle2 size={20} strokeWidth={2.3} />, variant: 'primary' as const, subtext: 'Awaiting completion' },
                            { label: 'COMPLETED', value: completed, icon: <CheckCircle2 size={20} strokeWidth={2.3} />, variant: 'success' as const, subtext: `${pct}% completion rate` },
                            { label: 'PENDING REVIEW', value: pendingReview, icon: <Eye size={20} strokeWidth={2.3} />, variant: 'primary' as const, subtext: 'Awaiting admin' },
                            { label: 'OVERDUE', value: overdue, icon: <AlertCircle size={20} strokeWidth={2.3} />, variant: 'danger' as const, subtext: 'Past deadline' },
                        ].map(s => (
                            <StatCard key={s.label} icon={s.icon} variant={s.variant} label={s.label} value={s.value} subtext={s.subtext} />
                        ))}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <div style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
                                <svg viewBox="0 0 80 80" style={{ transform: 'rotate(-90deg)' }}>
                                    <circle cx="40" cy="40" r="34" fill="none" stroke="var(--border)" strokeWidth="6" />
                                    <circle cx="40" cy="40" r="34" fill="none" stroke={completionColor} strokeWidth="6"
                                        strokeDasharray={`${2 * Math.PI * 34}`}
                                        strokeDashoffset={`${2 * Math.PI * 34 * (1 - pct / 100)}`}
                                        strokeLinecap="round"
                                        style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
                                </svg>
                                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                    <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{pct}%</span>
                                    <span style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600 }}>done</span>
                                </div>
                            </div>
                            <div>
                                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>COMPLETION RATE</span>
                                <p style={{ fontSize: 13, color: 'var(--text-primary)', margin: '4px 0 0', fontWeight: 500 }}>
                                    {completed} of {total} tasks completed
                                </p>
                                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                    {overdue > 0 ? `${overdue} overdue — ` : ''}
                                    {pendingReview > 0 ? `${pendingReview} pending review` : 'No pending reviews'}
                                </span>
                            </div>
                        </div>

                        <div className="card">
                            <div className="card-header-layout" style={{ margin: 0, marginBottom: 12 }}>
                                <h3 style={{ fontSize: 13 }}>Quick Summary</h3>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', fontSize: 12 }}>
                                {[
                                    { label: 'Total Tasks', value: total },
                                    { label: 'Employees', value: workloads.length },
                                    { label: 'Avg/Employee', value: avgPerEmployee },
                                    { label: 'Active %', value: total > 0 ? `${Math.round(active / total * 100)}%` : '0%' },
                                    { label: 'Overdue %', value: total > 0 ? `${Math.round(overdue / total * 100)}%` : '0%' },
                                    { label: 'Review %', value: total > 0 ? `${Math.round(pendingReview / total * 100)}%` : '0%' },
                                ].map(s => (
                                    <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                                        <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{s.label}</span>
                                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{s.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, marginBottom: 16 }}>
                        <div className="card">
                            <div className="card-header-layout" style={{ margin: 0, marginBottom: 12 }}>
                                <h3>Employee Workload Distribution</h3>
                                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{workloads.length} employees</span>
                            </div>
                            {workloadChartData.length === 0 ? (
                                <EmptyState title="No workload data available." />
                            ) : (
                                <ResponsiveContainer width="100%" height={Math.max(200, workloads.length * 36)}>
                                    <BarChart data={workloadChartData} margin={{ left: -10, right: 10, top: 0, bottom: 0 }} barCategoryGap="20%">
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                                        <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                                        <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', fontSize: 12 }} />
                                        <Bar dataKey="Total" fill="var(--primary)" radius={[3, 3, 0, 0]} name="Total" />
                                        <Bar dataKey="Completed" fill="var(--status-active)" radius={[3, 3, 0, 0]} name="Completed" />
                                        <Bar dataKey="Overdue" fill="var(--status-failed)" radius={[3, 3, 0, 0]} name="Overdue" />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>

                        <div className="card">
                            <div className="card-header-layout" style={{ margin: 0, marginBottom: 12 }}>
                                <h3>Task Status Distribution</h3>
                                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{total} total</span>
                            </div>
                            {statusChartData.length === 0 ? (
                                <EmptyState title="No data to display." />
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <ResponsiveContainer width={180} height={180}>
                                        <PieChart>
                                            <Pie data={statusChartData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" stroke="none">
                                                {statusChartData.map((_, idx) => (<Cell key={idx} fill={donutColors[idx]} />))}
                                            </Pie>
                                            <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', fontSize: 12 }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        {statusChartData.map(d => {
                                            const pctVal = Math.round(d.value / total * 100);
                                            return (
                                                <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                                                            <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{d.name}</span>
                                                            <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>{d.value} ({pctVal}%)</span>
                                                        </div>
                                                        <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, marginTop: 2, overflow: 'hidden' }}>
                                                            <div style={{ width: `${pctVal}%`, height: '100%', background: d.color, borderRadius: 2 }} />
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <DataTable
                        title="Workload Summary per Employee"
                        filterElements={
                            <>
                                {[{ label: '1 Month', months: 1 }, { label: '3 Months', months: 3 }, { label: '6 Months', months: 6 }, { label: '12 Months', months: 12 }].map(p => {
                                    const isActive = filters.dateStart && filters.dateEnd && (() => {
                                        const end = new Date(); const start = new Date(); start.setMonth(start.getMonth() - p.months);
                                        return filters.dateStart === start.toISOString().split('T')[0];
                                    })();
                                    return (
                                        <span key={p.label} className={`filter-pill${isActive ? ' active' : ''}`}
                                            onClick={e => {
                                                e.stopPropagation();
                                                const end = new Date(); const start = new Date(); start.setMonth(start.getMonth() - p.months);
                                                onFilterChange({ ...filters, dateStart: start.toISOString().split('T')[0], dateEnd: end.toISOString().split('T')[0] });
                                            }}
                                            style={{ fontSize: 12, padding: '6px 12px', height: 38, cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
                                            {p.label}
                                        </span>
                                    );
                                })}
                                <select value={filters.employeeId}
                                    onChange={e => onFilterChange({ ...filters, employeeId: e.target.value })}>
                                    <option value="">All Employees</option>
                                    {dashboardEmployees.map(m => (<option key={m.employeeId} value={m.employeeId}>{m.employeeName}</option>))}
                                </select>
                                <select value={filters.departmentId}
                                    onChange={e => onFilterChange({ ...filters, departmentId: e.target.value })}>
                                    <option value="">All Departments</option>
                                    {dashboardDepartments.map(d => (<option key={d.departmentId} value={d.departmentId}>{d.departmentName}</option>))}
                                </select>
                                <select value={filters.taskStatus}
                                    onChange={e => onFilterChange({ ...filters, taskStatus: e.target.value })}>
                                    <option value="">All Statuses</option>
                                    <option value="Assigned">Assigned</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Pending Admin Review">Pending Admin Review</option>
                                    <option value="Completed">Completed</option>
                                    <option value="Overdue">Overdue</option>
                                </select>
                                {hasAnyFilter && (
                                    <button className="btn btn-sm" onClick={onClearFilters} style={{ height: 38, whiteSpace: 'nowrap' }}><X size={12} /> Clear</button>
                                )}
                            </>
                        }
                        headers={['EMPLOYEE', 'TOTAL', 'ACTIVE', 'COMPLETED', 'OVERDUE', 'COMPLETION']}
                        loading={false}
                        emptyMessage="No workload data available."
                        totalRecords={filteredWorkloads.length}
                    >
                        {filteredWorkloads.map((w, idx) => {
                            const compPct = w.totalAssigned > 0 ? Math.round(w.completedTasks / w.totalAssigned * 100) : 0;
                            return (
                                <tr key={w.employeeId}>
                                    <td style={{ fontWeight: 600 }}>{w.employeeName}</td>
                                    <td style={{ textAlign: 'center', fontWeight: 700 }}>{w.totalAssigned}</td>
                                    <td style={{ textAlign: 'center', color: 'var(--status-pending)', fontWeight: 700 }}>{w.activeTasks}</td>
                                    <td style={{ textAlign: 'center', color: 'var(--status-active)', fontWeight: 700 }}>{w.completedTasks}</td>
                                    <td style={{ textAlign: 'center', color: w.overdueTasks > 0 ? 'var(--status-failed)' : 'var(--text-muted)', fontWeight: 700 }}>
                                        {w.overdueTasks || '�'}
                                    </td>
                                    <td>
                                        {w.totalAssigned > 0 ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <div style={{ flex: 1, maxWidth: 100, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                                                    <div style={{ width: `${compPct}%`, height: '100%', background: compPct >= 80 ? 'var(--status-active)' : compPct >= 50 ? 'var(--status-pending)' : 'var(--status-failed)', borderRadius: 3 }} />
                                                </div>
                                                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>{compPct}%</span>
                                            </div>
                                        ) : <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>�</span>}
                                    </td>
                                </tr>
                            );
                        })}
                    </DataTable>
                </>
            )}
        </div>
    );
};

// --- Tasks Tab ----------------------------------------------------------------

const TASK_STATUS_FILTERS = ['Draft', 'Assigned', 'In Progress', 'Pending Admin Review', 'Done', 'Completed', 'Overdue'];

const PRIORITY_WEIGHTS: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };

const TasksTab: React.FC<{
    tasks: Task[];
    binTasks: Task[];
    teamMembers: TeamMember[];
    loading: boolean;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    onView: (id: string) => void;
    onEdit: (id: string) => void;
    onRestore: (taskId: string) => void;
    onEmptyBin: () => void;
    onNewTask: () => void;
}> = ({ tasks, binTasks, teamMembers, loading, searchQuery, setSearchQuery, onView, onEdit, onRestore, onEmptyBin, onNewTask }) => {
    const [filterStatus, setFilterStatus] = useState('');
    const [filterPriority, setFilterPriority] = useState('');
    const [filterEmployee, setFilterEmployee] = useState('');
    const [filterDeadline, setFilterDeadline] = useState('');
    const [sortBy, setSortBy] = useState('');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [subTab, setSubTab] = useState<'active' | 'bin'>('active');
    const [searchError, setSearchError] = useState('');

    const deletedTasks = binTasks;

    const handleSearchChange = (val: string) => {
        if (val.length > 150) {
            setSearchError('Search must not exceed 150 characters.');
            return;
        }
        setSearchError('');
        setSearchQuery(val);
    };

    const sorted = [...tasks]
        .filter(t =>
            (!filterStatus || t.taskStatus === filterStatus) &&
            (!filterPriority || t.priority === filterPriority) &&
            (!filterEmployee || t.assignedTo === filterEmployee) &&
            (!filterDeadline || (t.dueAt && t.dueAt.startsWith(filterDeadline))) &&
            (!searchQuery || t.taskTitle.toLowerCase().includes(searchQuery.toLowerCase()))
        )
        .sort((a, b) => {
            if (!sortBy) return 0;
            const dir = sortOrder === 'asc' ? 1 : -1;
            switch (sortBy) {
                case 'taskTitle':
                    return dir * a.taskTitle.localeCompare(b.taskTitle);
                case 'deadline':
                    return dir * ((a.dueAt ?? '') > (b.dueAt ?? '') ? 1 : -1);
                case 'priority':
                    return dir * ((PRIORITY_WEIGHTS[a.priority] ?? 0) - (PRIORITY_WEIGHTS[b.priority] ?? 0));
                case 'status':
                    return dir * a.taskStatus.localeCompare(b.taskStatus);
                case 'assignedEmployee':
                    return dir * a.assignedEmployee.localeCompare(b.assignedEmployee);
                default:
                    return 0;
            }
        });

    return (
        <div className="dashboard-content">
            <DataTable
                tabs={[
                    { key: 'active', label: 'Active Tasks', icon: <Package size={14} />, badge: tasks.filter(t => t.taskStatus !== 'Completed' && t.taskStatus !== 'Done').length || undefined },
                    { key: 'bin', label: 'Bin', icon: <Trash2 size={14} />, badge: deletedTasks.length },
                ]}
                activeTab={subTab}
                onTabChange={key => setSubTab(key as 'active' | 'bin')}
                searchQuery={subTab === 'active' ? searchQuery : undefined}
                setSearchQuery={subTab === 'active' ? handleSearchChange : undefined}
                searchPlaceholder="Search tasks..."
                filterElements={subTab === 'active' ? (
                    <>
                        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                            <option value="">All Statuses</option>
                            {TASK_STATUS_FILTERS.map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
                            <option value="">All Priorities</option>
                            <option value="Critical">Critical</option>
                            <option value="High">High</option>
                            <option value="Medium">Medium</option>
                            <option value="Low">Low</option>
                        </select>
                        <select value={filterEmployee} onChange={e => setFilterEmployee(e.target.value)}>
                            <option value="">All Employees</option>
                            {teamMembers.map(m => (
                                <option key={m.accountId} value={m.accountId}>{m.employeeName}</option>
                            ))}
                        </select>
                        <input type="date" value={filterDeadline}
                            onChange={e => setFilterDeadline(e.target.value)}
                            style={{ height: 38, borderRadius: 8, border: '1.5px solid var(--border, #e8ecf4)', padding: '0 12px', fontSize: '0.82rem', fontFamily: 'inherit', background: 'white', color: 'var(--text-primary)', outline: 'none' }} />
                        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                            style={{ borderLeft: '2px solid var(--border, #e8ecf4)', paddingLeft: 12, borderRadius: 0 }}>
                            <option value="">Sort By</option>
                            <option value="taskTitle">Task Title</option>
                            <option value="deadline">Deadline</option>
                            <option value="priority">Priority Level</option>
                            <option value="status">Status</option>
                            <option value="assignedEmployee">Assigned Employee</option>
                        </select>
                        <select value={sortOrder} onChange={e => setSortOrder(e.target.value as 'asc' | 'desc')}>
                            <option value="asc">Ascending</option>
                            <option value="desc">Descending</option>
                        </select>
                    </>
                ) : (
                    deletedTasks.length > 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(238,93,80,0.06)', border: '1px solid rgba(238,93,80,0.18)', borderRadius: 10, fontSize: 13, color: '#b42318', flex: 1 }}>
                            <Trash2 size={14} />
                            Items in the bin are soft-deleted. You can restore them or empty the bin.
                        </div>
                    ) : undefined
                )}
                actionButton={subTab === 'active' ? {
                    label: 'New Task',
                    icon: <Plus size={14} />,
                    onClick: onNewTask
                } : (
                    deletedTasks.length > 0 ? {
                        label: 'Empty Bin',
                        icon: <Trash2 size={13} />,
                        onClick: onEmptyBin
                    } : undefined
                )}
                headers={['TASK', 'ASSIGNEE', 'PRIORITY', 'DUE DATE'].concat(subTab === 'bin' ? ['ACTIONS'] : [])}
                loading={loading}
                emptyIcon={subTab === 'bin' ? <Trash2 size={24} /> : <Package size={20} />}
                emptyMessage={subTab === 'bin' ? 'Bin is empty' : 'No matching task records found.'}
            >
                {searchError && (
                    <tr><td colSpan={subTab === 'bin' ? 5 : 4} style={{ padding: '8px 20px 0', border: 'none' }}>
                        <span style={{ fontSize: 12, color: 'var(--status-failed)' }}>{searchError}</span>
                    </td></tr>
                )}
                {subTab === 'active' && sorted.length > 0 && sorted.map(t => {
                    const od = isEffectivelyOverdue(t);
                    const effectiveStatus = od ? 'Overdue' : t.taskStatus;
                    const refDisplay = t.taskReferenceNumber || t.taskId.slice(0, 8).toUpperCase();
                    return (
                        <tr key={t.taskId} onClick={() => onView(t.taskId)} style={{ cursor: 'pointer' }}>
                            <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span className={priorityDotClass(t.priority)} />
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, letterSpacing: '0.05em' }}>#{refDisplay}</span>
                                            {t.taskTitle}
                                        </div>
                                        <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span className={statusBadgeClass(effectiveStatus)} style={{ fontSize: 10, padding: '1px 8px' }}>{effectiveStatus}</span>
                                            <div style={{ width: 100, height: 4, background: '#e8ecf4', borderRadius: 2, overflow: 'hidden' }}>
                                                <div style={{ width: `${statusToProgress(effectiveStatus)}%`, height: '100%', background: statusToProgress(effectiveStatus) >= 100 ? '#05cd99' : statusToProgress(effectiveStatus) >= 75 ? '#4318ff' : statusToProgress(effectiveStatus) >= 45 ? '#ffb547' : '#94a3b8', borderRadius: 2 }} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </td>
                            <td style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>{t.assignedEmployee || 'Unassigned'}</td>
                            <td><PrioBadge p={t.priority} /></td>
                            <td style={{ fontSize: 12, color: od ? 'var(--status-failed)' : 'var(--text-secondary)', fontWeight: od ? 700 : 400 }}>{t.dueAt ? fmtDate(t.dueAt) : '—'}</td>
                        </tr>
                    );
                })}
                {subTab !== 'active' && deletedTasks.map((t, binIdx) => (
                    <tr key={t.taskId ?? binIdx} style={{ opacity: 0.75 }}>
                        <td>
                            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', textDecoration: 'line-through', textDecorationColor: 'var(--text-secondary)' }}>
                                {t.taskTitle}
                            </div>
                            {t.taskDescription && (
                                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {t.taskDescription}
                                </div>
                            )}
                        </td>
                        <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                            {t.assignedEmployee || '—'}
                        </td>
                        <td><PrioBadge p={t.priority} /></td>
                        <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                            {t.dueAt ? fmtDate(t.dueAt) : '—'}
                        </td>
                        <td>
                            <ActionsDropdown
                                actions={[
                                    {
                                        label: 'Restore',
                                        icon: <CheckCircle2 size={12} />,
                                        onClick: () => onRestore(t.taskId),
                                        variant: 'success'
                                    }
                                ]}
                            />
                        </td>
                    </tr>
                ))}
            </DataTable>
        </div>
    );
};



// --- Task Template Tab ---------------------------------------------------------

const TemplateTab: React.FC<{ teamMembers: TeamMember[] }> = ({ teamMembers }) => {
    const { success, error } = useToast();
    const [templates, setTemplates] = useState<TaskTemplateDTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<TaskTemplateDTO | null>(null);

    const fetchTemplates = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/taskTemplate?pageNumber=1&pageSize=50', {
                headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
            });
            if (!res.ok) throw new Error('Failed to fetch templates.');
            const body = await res.json();
            const paginated = body.data;
            setTemplates(paginated?.data ?? []);
        } catch {
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchTemplates(); }, []);

    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    const handleDeleteTemplate = async (templateId: string) => {
        try {
            const res = await fetch(`/api/taskTemplate/${templateId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
            });
            if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || 'Failed to delete template.'); }
            success('Task template deleted successfully.');
            setDeleteConfirm(null);
            await fetchTemplates();
        } catch (err: any) {
            error(err.message ?? 'Failed to delete template.');
        }
    };

    const handleToggle = async (templateId: string) => {
        try {
            const res = await fetch(`/api/taskTemplate/${templateId}/toggle-status`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
            });
            if (!res.ok) throw new Error('Failed to toggle template status.');
            success('Template status toggled successfully.');
            await fetchTemplates();
        } catch (err: any) {
            error(err.message ?? 'Failed to toggle template status.');
        }
    };

    const handleSave = async (data: CreateTemplateDTO, templateId?: string) => {
        if (templateId) {
            const res = await fetch(`/api/taskTemplate/${templateId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('authToken')}` },
                body: JSON.stringify(data),
            });
            if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || 'Failed to update template.'); }
            success('Task template updated successfully.');
        } else {
            const res = await fetch('/api/taskTemplate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('authToken')}` },
                body: JSON.stringify(data),
            });
            if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || 'Failed to create template.'); }
            success('Task template created successfully.');
        }
        await fetchTemplates();
        setShowModal(false);
        setEditingTemplate(null);
    };

    const openEdit = (t: TaskTemplateDTO) => {
        setEditingTemplate(t);
        setShowModal(true);
    };

    const fmtTemplateDate = (d: string | null) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '�';

    return (
        <div className="dashboard-content">
            <DataTable
                title="Task Templates"
                totalResults={templates.length}
                actionButton={{ label: 'Create Template', icon: <Plus size={14} />, onClick: () => { setEditingTemplate(null); setShowModal(true); } }}
                loading={loading}
                emptyMessage="No task templates found."
                emptyIcon={<Copy size={20} />}
                headers={['TEMPLATE NAME', 'PRIORITY', 'RECURRENCE', 'NEXT GENERATION', 'ASSIGNEE', 'STATUS', 'ACTIONS']}
            >
                {templates.map(t => (
                    <tr key={t.templateId}>
                        <td>
                            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{t.templateName}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.templateDescription}</div>
                        </td>
                        <td><PrioBadge p={t.priorityLevel as Priority} /></td>
                        <td>
                            <span style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Repeat size={12} /> {RECURRENCE_LABELS[t.recurrenceType] ?? t.recurrenceType}
                            </span>
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{fmtTemplateDate(t.nextGenerationDate)}</td>
                        <td style={{ fontSize: 13 }}>{t.assignedEmployeeName || 'Auto-assign'}</td>
                        <td>
                            <StatusBadge status={t.templateStatus} size="sm" />
                        </td>
                        <td>
                            <ActionsDropdown
                                actions={[
                                    { label: 'Edit', icon: <Pencil size={12} />, onClick: () => openEdit(t) },
                                    {
                                        label: t.templateStatus === 'Active' ? 'Deactivate' : 'Activate',
                                        icon: <ToggleLeft size={12} />,
                                        onClick: () => handleToggle(t.templateId),
                                        variant: 'default' as const,
                                    },
                                    {
                                        label: 'Delete',
                                        icon: <Trash2 size={12} />,
                                        onClick: () => setDeleteConfirm(t.templateId),
                                        variant: 'danger' as const,
                                    },
                                ]}
                            />
                        </td>
                    </tr>
                ))}
            </DataTable>

            <ConfirmationModal
                isOpen={deleteConfirm !== null}
                variant="danger"
                title="Delete Task Template"
                description="Are you sure you want to delete this task template? This action cannot be undone."
                confirmLabel="Delete"
                cancelLabel="Cancel"
                onConfirm={() => deleteConfirm && handleDeleteTemplate(deleteConfirm)}
                onCancel={() => setDeleteConfirm(null)}
            />

            {showModal && (
                <TemplateModal
                    template={editingTemplate}
                    teamMembers={teamMembers}
                    onSave={handleSave}
                    onClose={() => { setShowModal(false); setEditingTemplate(null); }}
                />
            )}
        </div>
    );
};

// --- Template Create/Edit Modal ----------------------------------------------

interface TemplateModalProps {
    template: TaskTemplateDTO | null;
    teamMembers: TeamMember[];
    onSave: (data: CreateTemplateDTO, templateId?: string) => Promise<void>;
    onClose: () => void;
}

const TemplateModal: React.FC<TemplateModalProps> = ({ template, teamMembers, onSave, onClose }) => {
    const isEdit = !!template;
    const [form, setForm] = useState({
        templateName: template?.templateName ?? '',
        templateDescription: template?.templateDescription ?? '',
        priorityLevel: template?.priorityLevel ?? 'Medium',
        recurrenceType: template?.recurrenceType ?? 'Daily',
        recurrenceStartDate: template?.recurrenceStartDate ? template.recurrenceStartDate.substring(0, 10) : '',
        assignedEmployee: template?.assignedEmployeeId ?? '',
        templateStatus: template?.templateStatus ?? 'Active',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const [apiError, setApiError] = useState('');

    const validate = (): boolean => {
        const e: Record<string, string> = {};
        if (!form.templateName.trim()) e.templateName = 'Template name is required.';
        else if (form.templateName.length > 150) e.templateName = 'Must not exceed 150 characters.';
        if (!form.templateDescription.trim()) e.templateDescription = 'Description is required.';
        else if (form.templateDescription.length > 2000) e.templateDescription = 'Must not exceed 2000 characters.';
        if (!form.recurrenceStartDate) e.recurrenceStartDate = 'Start date is required.';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setSubmitting(true);
        setApiError('');
        try {
            await onSave({
                templateName: form.templateName.trim(),
                templateDescription: form.templateDescription.trim(),
                priorityLevel: form.priorityLevel,
                recurrenceType: form.recurrenceType,
                recurrenceStartDate: form.recurrenceStartDate,
                assignedEmployee: form.assignedEmployee || null,
                templateStatus: form.templateStatus,
            }, template?.templateId);
        } catch (err: any) {
            setApiError(err.message ?? 'Operation failed.');
        } finally {
            setSubmitting(false);
        }
    };

    const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setForm(p => ({ ...p, [key]: e.target.value }));
        setErrors(p => ({ ...p, [key]: '' }));
    };

    const FieldErr = ({ name }: { name: string }) => errors[name] ? <span className="report-field-error">{errors[name]}</span> : null;

    return (
        <FormModal isOpen onClose={onClose}
            title={isEdit ? 'Edit Task Template' : 'Create Task Template'}
            subtitle={isEdit ? 'Update the template details below.' : 'Fill in the details to create a recurring task template.'}
            size="md" confirmOnCancel={true}
            footer={
                <>
                    <button className="btn" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
                        {submitting ? <><Loader2 size={13} className="spin" /> Saving�</> : <><Save size={13} /> {isEdit ? 'Update Template' : 'Create Template'}</>}
                    </button>
                </>
            }
        >
            {apiError && <div className="report-error-msg" style={{ marginBottom: 14 }}>{apiError}</div>}

            <div className="field">
                <label>Template Name *</label>
                <input type="text" className={errors.templateName ? 'report-input report-input-error' : 'report-input'}
                    value={form.templateName} onChange={set('templateName')} maxLength={150} placeholder="e.g. Weekly Warehouse Inventory" />
                <FieldErr name="templateName" />
            </div>

            <div className="field">
                <label>Template Description *</label>
                <textarea className={errors.templateDescription ? 'report-input report-input-error' : 'report-input'}
                    rows={3} value={form.templateDescription} onChange={set('templateDescription')} maxLength={2000} placeholder="Describe the recurring task..." />
                <FieldErr name="templateDescription" />
                <span style={{ fontSize: 11, marginTop: 3, display: 'block', textAlign: 'right', color: 'var(--text-secondary)' }}>{form.templateDescription.length}/2000</span>
            </div>

            <div className="field-row">
                <div className="field">
                    <label>Priority Level</label>
                    <select className="report-select" value={form.priorityLevel} onChange={set('priorityLevel')}>
                        {PRIORITY_LEVELS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>
                <div className="field">
                    <label>Recurrence Type</label>
                    <select className="report-select" value={form.recurrenceType} onChange={set('recurrenceType')}>
                        {RECURRENCE_TYPES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                </div>
            </div>

            <div className="field-row">
                <div className="field">
                    <label>Recurrence Start Date *</label>
                    <input type="date" className={errors.recurrenceStartDate ? 'report-input report-input-error' : 'report-input'}
                        value={form.recurrenceStartDate} onChange={set('recurrenceStartDate')} />
                    <FieldErr name="recurrenceStartDate" />
                </div>
                <div className="field">
                    <label>Assigned Employee</label>
                    <select className="report-select" value={form.assignedEmployee} onChange={set('assignedEmployee')}>
                        <option value="">Auto-assign (unassigned)</option>
                        {teamMembers.map(m => <option key={m.accountId} value={m.accountId}>{m.employeeName}</option>)}
                    </select>
                </div>
            </div>

            <div className="field">
                <label>Template Status</label>
                <div style={{ display: 'flex', gap: 8 }}>
                    {TEMPLATE_STATUSES.map(s => (
                        <button key={s} type="button"
                            className={`filter-pill${form.templateStatus === s ? ' active' : ''}`}
                            onClick={() => { setForm(p => ({ ...p, templateStatus: s })); }}>
                            {s}
                        </button>
                    ))}
                </div>
            </div>
        </FormModal>
    );
};

// --- Team Tab -----------------------------------------------------------------

const TeamTab: React.FC<{
    tasks: Task[];
    teamMembers: TeamMember[];
    onView: (id: string) => void;
}> = ({ tasks, teamMembers, onView }) => {
    const [selectedMemberId, setSelectedMemberId] = useState(teamMembers[0]?.accountId ?? '');

    return (
        <div className="dashboard-content">
            <div className="dashboard-grid">
                <div className="card">
                    <div className="card-header-layout"><h3>Team Members</h3></div>
                    {teamMembers.length === 0 ? (
                        <EmptyState icon={<Users size={20} />} title="No team members found" />
                    ) : teamMembers.map(m => {
                        const mt = tasks.filter(t => t.assignedEmployee === m.employeeName);
                        const mc = mt.filter(t => t.taskStatus === 'Completed').length;
                        return (
                            <div
                                key={m.accountId}
                                className={`member-row${selectedMemberId === m.accountId ? ' selected' : ''}`}
                                onClick={() => setSelectedMemberId(m.accountId)}
                            >
                                <Avatar member={m} />
                                <div style={{ flex: 1 }}>
                                    <div className="member-name">{m.employeeName}</div>
                                    <div className="member-role">{m.role}</div>
                                </div>
                                <span className="badge badge-blue">{mt.length} tasks</span>
                                <span className="badge badge-green">{mc} done</span>
                            </div>
                        );
                    })}
                </div>
                <div className="card">
                    <div className="card-header-layout"><h3>Workload Distribution</h3></div>
                    <div className="perf-bars">
                        {teamMembers.map(m => {
                            const mt = tasks.filter(t => t.assignedEmployee === m.employeeName);
                            const mc = mt.filter(t => t.taskStatus === 'Completed').length;
                            const pct = mt.length > 0 ? Math.round(mc / mt.length * 100) : 0;
                            return (
                                <div key={m.accountId} className="perf-item">
                                    <span className="perf-label">{m.employeeName.split(' ')[0]}</span>
                                    <div className="perf-track">
                                        <div className="perf-fill" style={{ width: `${pct}%`, background: pct >= 80 ? 'var(--status-active)' : pct >= 50 ? 'var(--status-pending)' : 'var(--status-failed)', borderRadius: 3, height: '100%', transition: 'width 0.4s ease' }} />
                                    </div>
                                    <span className="perf-pct">{mc}/{mt.length}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
            <div className="card">
                <div className="card-header-layout">
                    <h3>{teamMembers.find(m => m.accountId === selectedMemberId)?.employeeName}'s Tasks</h3>
                </div>
                {tasks.filter(t => t.assignedEmployee === teamMembers.find(m => m.accountId === selectedMemberId)?.employeeName).length === 0
                    ? <EmptyState icon={<Package size={20} />} title="No tasks assigned" />
                    : tasks
                        .filter(t => t.assignedEmployee === teamMembers.find(m => m.accountId === selectedMemberId)?.employeeName)
                        .map(t => <TaskRow key={t.taskId} task={t} onView={onView} />)
                }
            </div>
        </div>
    );
};

// --- Approvals Wrapper (sub-tab navigation) -----------------------------------

const ApprovalsWrapper: React.FC = () => {
    const [subTab, setSubTab] = useState<'pending' | 'matrices'>('pending');
    return (
        <div className="dashboard-content">
            <div className="report-subtabs">
                <button className={`filter-pill${subTab === 'pending' ? ' active' : ''}`}
                    onClick={() => setSubTab('pending')}>
                    <Shield size={14} /> Pending Approvals
                </button>
                <button className={`filter-pill${subTab === 'matrices' ? ' active' : ''}`}
                    onClick={() => setSubTab('matrices')}>
                    <RotateCcw size={14} /> Routing Config
                </button>
            </div>
            {subTab === 'pending' ? <PendingApprovalsTab /> : <RoutingManagementTab />}
        </div>
    );
};

// --- Reports Tab --------------------------------------------------------------

export const ReportsTab: React.FC<{ teamMembers: TeamMember[] }> = ({ teamMembers }) => {
    const { success, error } = useToast();
    const [reportSubTab, setReportSubTab] = useState<'task-completion' | 'operational-summary'>('task-completion');

    const DATE_PRESETS = [
        { label: '1 Month', months: 1 },
        { label: '3 Months', months: 3 },
        { label: '6 Months', months: 6 },
        { label: '12 Months', months: 12 },
    ] as const;

    // --- Task Completion State ---
    const [tcFilter, setTcFilter] = useState<ReportFilter>({
        dateRangeStart: '', dateRangeEnd: '', employeeId: '',
        taskPriorityLevel: '', taskStatus: '', taskCategory: '',
    });
    const [tcReport, setTcReport] = useState<TaskCompletionReport | null>(null);
    const [tcLoading, setTcLoading] = useState(false);
    const [tcError, setTcError] = useState('');
    const [tcNoRecords, setTcNoRecords] = useState(false);
    const [tcGeneratedAt, setTcGeneratedAt] = useState('');

    const applyTcPreset = (months: number) => {
        const end = new Date();
        const start = new Date();
        start.setMonth(start.getMonth() - months);
        setTcFilter(p => ({
            ...p,
            dateRangeStart: start.toISOString().split('T')[0],
            dateRangeEnd: end.toISOString().split('T')[0],
        }));
    };

    const handleTcGenerate = async () => {
        if (!tcFilter.dateRangeStart || !tcFilter.dateRangeEnd) {
            setTcError('Please select a date range preset first.');
            return;
        }
        setTcLoading(true); setTcError(''); setTcNoRecords(false); setTcReport(null);
        try {
            const params = new URLSearchParams();
            params.set('DateRangeStart', tcFilter.dateRangeStart);
            params.set('DateRangeEnd', tcFilter.dateRangeEnd);
            if (tcFilter.employeeId) params.set('EmployeeId', tcFilter.employeeId);
            if (tcFilter.taskPriorityLevel) params.set('TaskPriorityLevel', tcFilter.taskPriorityLevel);
            if (tcFilter.taskStatus) params.set('TaskStatus', tcFilter.taskStatus);
            if (tcFilter.taskCategory) params.set('TaskCategory', tcFilter.taskCategory);

            const res = await fetch(`/api/reporting/task-completion?${params}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
            });

            if (res.status === 400) { setTcError('Invalid date range selected.'); setTcLoading(false); return; }
            if (!res.ok) { setTcError('Failed to generate report. Please try again.'); setTcLoading(false); return; }

            const data = await res.json();
            if (data.isSuccess && data.data) { setTcReport(data.data); setTcGeneratedAt(new Date().toLocaleString()); }
            else { setTcNoRecords(true); }
        } catch { setTcError('Failed to generate report. Please try again.'); }
        finally { setTcLoading(false); }
    };

    const handleTcReset = () => {
        setTcFilter({ dateRangeStart: '', dateRangeEnd: '', employeeId: '', taskPriorityLevel: '', taskStatus: '', taskCategory: '' });
        setTcReport(null); setTcError(''); setTcNoRecords(false); setTcGeneratedAt('');
    };

    const exportCSV = () => {
        if (!tcReport) return;
        const rows: string[] = [];
        rows.push('Task Completion Report');
        rows.push(`Generated,${tcGeneratedAt}`);
        rows.push(''); rows.push('Summary');
        rows.push(`Total Tasks Assigned,${tcReport.totalTasksAssigned}`);
        rows.push(`Total Tasks Completed,${tcReport.totalTasksCompleted}`);
        rows.push(`Total Tasks In Progress,${tcReport.totalTasksInProgress}`);
        rows.push(`Total Tasks Pending Review,${tcReport.totalTasksPendingReview}`);
        rows.push(`Total Overdue Tasks,${tcReport.totalOverdueTasks}`);
        rows.push(`Task Completion Rate,${tcReport.taskCompletionRate}%`);
        rows.push(`Avg Completion Time (Hours),${tcReport.averageTaskCompletionTimeHours.toFixed(1)}`);
        rows.push(''); rows.push('Employee Performance');
        rows.push('Employee,Assigned,Completed,Completion Rate,Avg Time (Hours)');
        for (const ep of tcReport.employeePerformanceSummary) {
            rows.push(`${ep.employeeName},${ep.totalAssigned},${ep.totalCompleted},${ep.completionRate}%,${ep.averageCompletionTimeHours.toFixed(1)}`);
        }
        const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `task-completion-report-${tcFilter.dateRangeStart}-to-${tcFilter.dateRangeEnd}.csv`;
        a.click(); URL.revokeObjectURL(url);
        success('CSV exported successfully.');
    };

    const tcChartData = tcReport
        ? [
            { name: 'Completed', value: tcReport.totalTasksCompleted, fill: 'var(--status-active)' },
            { name: 'In Progress', value: tcReport.totalTasksInProgress, fill: 'var(--status-pending)' },
            { name: 'Pending Review', value: tcReport.totalTasksPendingReview, fill: 'var(--primary)' },
            { name: 'Overdue', value: tcReport.totalOverdueTasks, fill: 'var(--status-failed)' },
        ].filter(d => d.value > 0) : [];

    // --- Operational Summary State ---
    const [opFilter, setOpFilter] = useState<OperationalFilter>({
        dateRangeStart: '', dateRangeEnd: '', departmentId: '', employeeId: '', reportFormat: 'PDF',
    });
    const [opReport, setOpReport] = useState<OperationalSummaryReport | null>(null);
    const [opLoading, setOpLoading] = useState(false);
    const [opError, setOpError] = useState('');
    const [opNoRecords, setOpNoRecords] = useState(false);
    const [opGeneratedAt, setOpGeneratedAt] = useState('');
    const [departments, setDepartments] = useState<ReportFilterOption[]>([]);
    const [employees, setEmployees] = useState<ReportFilterOption[]>([]);

    useEffect(() => {
        const fetchOptions = async () => {
            try {
                const res = await fetch('/api/reporting/filter-options', {
                    headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.isSuccess && data.data) {
                        setDepartments(data.data.departments || []);
                        setEmployees(data.data.employees || []);
                    }
                }
            } catch { }
        };
        fetchOptions();
    }, []);

    const applyOpPreset = (months: number) => {
        const end = new Date();
        const start = new Date();
        start.setMonth(start.getMonth() - months);
        setOpFilter(p => ({
            ...p,
            dateRangeStart: start.toISOString().split('T')[0],
            dateRangeEnd: end.toISOString().split('T')[0],
        }));
    };

    const handleOpGenerate = async () => {
        if (!opFilter.dateRangeStart || !opFilter.dateRangeEnd) {
            setOpError('Please select a date range preset first.');
            return;
        }
        setOpLoading(true); setOpError(''); setOpNoRecords(false); setOpReport(null);
        try {
            const params = new URLSearchParams();
            params.set('DateRangeStart', opFilter.dateRangeStart);
            params.set('DateRangeEnd', opFilter.dateRangeEnd);
            if (opFilter.departmentId) params.set('DepartmentId', opFilter.departmentId);
            if (opFilter.employeeId) params.set('EmployeeId', opFilter.employeeId);

            const res = await fetch(`/api/reporting/operational-summary?${params}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
            });

            if (res.status === 400) { setOpError('Invalid date range selected.'); setOpLoading(false); return; }
            if (res.status === 404) { setOpNoRecords(true); setOpLoading(false); return; }
            if (!res.ok) { setOpError('Failed to generate report. Please try again.'); setOpLoading(false); return; }

            const data = await res.json();
            if (data.isSuccess && data.data) { setOpReport(data.data); setOpGeneratedAt(new Date().toLocaleString()); }
            else { setOpNoRecords(true); }
        } catch { setOpError('Failed to generate report. Please try again.'); }
        finally { setOpLoading(false); }
    };

    const handleOpReset = () => {
        setOpFilter({ dateRangeStart: '', dateRangeEnd: '', departmentId: '', employeeId: '', reportFormat: 'PDF' });
        setOpReport(null); setOpError(''); setOpNoRecords(false); setOpGeneratedAt('');
    };

    const handleOpDownload = async () => {
        if (!opReport) return;
        setOpLoading(true);
        try {
            const params = new URLSearchParams();
            params.set('DateRangeStart', opFilter.dateRangeStart);
            params.set('DateRangeEnd', opFilter.dateRangeEnd);
            if (opFilter.departmentId) params.set('DepartmentId', opFilter.departmentId);
            if (opFilter.employeeId) params.set('EmployeeId', opFilter.employeeId);
            params.set('ReportFormat', opFilter.reportFormat);

            const res = await fetch(`/api/reporting/operational-summary/download?${params}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => null);
                error(errData?.message || 'Failed to download report.');
                setOpLoading(false);
                return;
            }

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const ext = opFilter.reportFormat === 'EXCEL' ? 'xlsx' : 'pdf';
            a.href = url;
            a.download = `OperationalSummaryReport_${new Date().toISOString().slice(0, 10)}.${ext}`;
            a.click(); URL.revokeObjectURL(url);
            success('Report downloaded successfully.');
        } catch { error('Failed to download report.'); }
        finally { setOpLoading(false); }
    };

    return (
        <div className="dashboard-content">
            <SubTabNav
                tabs={[
                    { key: 'task-completion', label: 'Task Completion Report', icon: <FileText size={14} /> },
                    { key: 'operational-summary', label: 'Operational Summary Report', icon: <BarChart3 size={14} /> },
                ]}
                activeTab={reportSubTab}
                onTabChange={key => setReportSubTab(key as 'task-completion' | 'operational-summary')}
            />

            {reportSubTab === 'task-completion' && (
                <>
                    <div className="card report-filter-card">
                        <div className="card-header-layout">
                            <h3><FileText size={18} style={{ marginRight: 6, verticalAlign: 'middle' }} />Task Completion Reports</h3>
                        </div>
                        <div className="report-filter-grid">
                            <div className="field">
                                <label>Date Range *</label>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    {DATE_PRESETS.map(p => (
                                        <button key={p.label} type="button"
                                            className={`filter-pill${tcFilter.dateRangeStart && tcFilter.dateRangeEnd && (() => {
                                                const start = new Date(); start.setMonth(start.getMonth() - p.months);
                                                return tcFilter.dateRangeStart === start.toISOString().split('T')[0];
                                            })() ? ' active' : ''}`}
                                            onClick={() => applyTcPreset(p.months)}
                                            style={{ fontSize: 12, padding: '6px 14px' }}>
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                                {tcFilter.dateRangeStart && tcFilter.dateRangeEnd && (
                                    <span style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, display: 'block' }}>
                                        {tcFilter.dateRangeStart} → {tcFilter.dateRangeEnd}
                                    </span>
                                )}
                            </div>
                            <div className="field">
                                <label>Employee</label>
                                <select className="report-select"
                                    value={tcFilter.employeeId}
                                    onChange={e => setTcFilter(p => ({ ...p, employeeId: e.target.value }))}>
                                    <option value="">All Employees</option>
                                    {teamMembers.map(m => (
                                        <option key={m.accountId} value={m.accountId}>{m.employeeName}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="field">
                                <label>Priority</label>
                                <select className="report-select"
                                    value={tcFilter.taskPriorityLevel}
                                    onChange={e => setTcFilter(p => ({ ...p, taskPriorityLevel: e.target.value }))}>
                                    <option value="">All Priorities</option>
                                    {PRIORITY_LEVELS.map(p => (
                                        <option key={p} value={p}>{p}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="field">
                                <label>Status</label>
                                <select className="report-select"
                                    value={tcFilter.taskStatus}
                                    onChange={e => setTcFilter(p => ({ ...p, taskStatus: e.target.value }))}>
                                    <option value="">All Statuses</option>
                                    {TASK_STATUSES_FILTER.map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="field">
                                <label>Category</label>
                                <select className="report-select"
                                    value={tcFilter.taskCategory}
                                    onChange={e => setTcFilter(p => ({ ...p, taskCategory: e.target.value }))}>
                                    <option value="">All Categories</option>
                                    {TASK_CATEGORIES.map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="report-filter-actions">
                            <button className="btn" onClick={handleTcReset}><RotateCcw size={14} /> Reset</button>
                            <button className="btn btn-primary" onClick={handleTcGenerate} disabled={tcLoading}>
                                {tcLoading ? <Loader2 size={14} className="spin" /> : <Filter size={14} />}
                                {' '}{tcLoading ? 'Generating...' : 'Generate Report'}
                            </button>
                        </div>
                    </div>

                    {tcError && <div className="report-error-msg">{tcError}</div>}
                    {tcNoRecords && <div className="report-empty-state"><FileText size={22} /><p>No records found for selected criteria.</p></div>}

                    {tcReport && (
                        <>
                            <div className="report-summary-grid">
                                <StatCard icon={<ClipboardList size={20} strokeWidth={2.3} />} variant="primary" label="ASSIGNED" value={String(tcReport.totalTasksAssigned)} subtext="Total tasks" />
                                <StatCard icon={<CheckCircle2 size={20} strokeWidth={2.3} />} variant="success" label="COMPLETED" value={String(tcReport.totalTasksCompleted)} subtext="Tasks finished" />
                                <StatCard icon={<Loader2 size={20} strokeWidth={2.3} />} variant="warning" label="IN PROGRESS" value={String(tcReport.totalTasksInProgress)} subtext="Ongoing" />
                                <StatCard icon={<Eye size={20} strokeWidth={2.3} />} variant="primary" label="PENDING REVIEW" value={String(tcReport.totalTasksPendingReview)} subtext="Awaiting review" />
                                <StatCard icon={<AlertCircle size={20} strokeWidth={2.3} />} variant="danger" label="OVERDUE" value={String(tcReport.totalOverdueTasks)} subtext="Past deadline" />
                                <StatCard icon={<BarChart3 size={20} strokeWidth={2.3} />} variant="success" label="COMPLETION RATE" value={`${tcReport.taskCompletionRate}%`} subtext="Overall rate" />
                                <StatCard icon={<Calendar size={20} strokeWidth={2.3} />} variant="warning" label="AVG TIME" value={`${tcReport.averageTaskCompletionTimeHours.toFixed(1)}h`} subtext="Per task" />
                            </div>
                            <div className="card">
                                <DataTable title="Employee Performance Summary"
                                    headers={['Employee', 'Assigned', 'Completed', 'Rate', 'Avg Time (h)']}
                                    loading={false} emptyMessage="No employee data for selected criteria."
                                    totalRecords={tcReport.employeePerformanceSummary.length}>
                                    {tcReport.employeePerformanceSummary.map(ep => (
                                        <tr key={ep.employeeName}>
                                            <td style={{ fontWeight: 600 }}>{ep.employeeName}</td>
                                            <td>{ep.totalAssigned}</td>
                                            <td>{ep.totalCompleted}</td>
                                            <td>{ep.completionRate}%</td>
                                            <td>{ep.averageCompletionTimeHours.toFixed(1)}</td>
                                        </tr>
                                    ))}
                                </DataTable>
                            </div>
                            <div className="card">
                                <div className="card-header-layout"><h3>Task Status Distribution</h3></div>
                                {tcChartData.length === 0 ? (
                                    <div className="report-empty-state" style={{ padding: '20px 0' }}><p>No status data available.</p></div>
                                ) : (
                                    <ResponsiveContainer width="100%" height={220}>
                                        <BarChart data={tcChartData} margin={{ top: 8, right: 8, left: -8, bottom: 4 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e9edf7" />
                                            <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
                                            <Tooltip />
                                            <Bar dataKey="value" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                            <div className="report-export-row">
                                <span className="report-generated-badge"><Calendar size={12} /> Report generated at: {tcGeneratedAt}</span>
                                <button className="btn btn-primary" onClick={exportCSV}>
                                    <Download size={14} /> Export CSV
                                </button>
                            </div>
                        </>
                    )}
                </>
            )}

            {reportSubTab === 'operational-summary' && (
                <>
                    <div className="card report-filter-card">
                        <div className="card-header-layout">
                            <h3><BarChart3 size={18} style={{ marginRight: 6, verticalAlign: 'middle' }} />Operational Summary Report</h3>
                        </div>
                        <div className="report-filter-grid">
                            <div className="field">
                                <label>Date Range *</label>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    {DATE_PRESETS.map(p => (
                                        <button key={p.label} type="button"
                                            className={`filter-pill${opFilter.dateRangeStart && opFilter.dateRangeEnd && (() => {
                                                const start = new Date(); start.setMonth(start.getMonth() - p.months);
                                                return opFilter.dateRangeStart === start.toISOString().split('T')[0];
                                            })() ? ' active' : ''}`}
                                            onClick={() => applyOpPreset(p.months)}
                                            style={{ fontSize: 12, padding: '6px 14px' }}>
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                                {opFilter.dateRangeStart && opFilter.dateRangeEnd && (
                                    <span style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, display: 'block' }}>
                                        {opFilter.dateRangeStart} → {opFilter.dateRangeEnd}
                                    </span>
                                )}
                            </div>
                            <div className="field">
                                <label>Department</label>
                                <select className="report-select"
                                    value={opFilter.departmentId}
                                    onChange={e => setOpFilter(p => ({ ...p, departmentId: e.target.value }))}>
                                    <option value="">All Departments</option>
                                    {departments.map(d => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="field">
                                <label>Employee</label>
                                <select className="report-select"
                                    value={opFilter.employeeId}
                                    onChange={e => setOpFilter(p => ({ ...p, employeeId: e.target.value }))}>
                                    <option value="">All Employees</option>
                                    {employees.map(e => (
                                        <option key={e.id} value={e.id}>{e.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="field">
                                <label>Report Format</label>
                                <select className="report-select"
                                    value={opFilter.reportFormat}
                                    onChange={e => setOpFilter(p => ({ ...p, reportFormat: e.target.value }))}>
                                    <option value="PDF">PDF</option>
                                    <option value="EXCEL">Excel</option>
                                </select>
                            </div>
                        </div>
                        <div className="report-filter-actions">
                            <button className="btn" onClick={handleOpReset}><RotateCcw size={14} /> Reset</button>
                            <button className="btn btn-primary" onClick={handleOpGenerate} disabled={opLoading}>
                                {opLoading ? <Loader2 size={14} className="spin" /> : <Filter size={14} />}
                                {' '}{opLoading ? 'Generating...' : 'Generate Report'}
                            </button>
                        </div>
                    </div>

                    {opError && <div className="report-error-msg">{opError}</div>}
                    {opNoRecords && <div className="report-empty-state"><FileText size={22} /><p>No records found for selected criteria.</p></div>}

                    {opReport && (
                        <>
                            <div className="report-summary-grid">
                                <StatCard icon={<ClipboardList size={20} strokeWidth={2.3} />} variant="primary" label="TOTAL TASKS" value={String(opReport.totalTasks)} subtext="All tasks" />
                                <StatCard icon={<CheckCircle2 size={20} strokeWidth={2.3} />} variant="success" label="COMPLETED" value={String(opReport.completedTasks)} subtext="Tasks finished" />
                                <StatCard icon={<Loader2 size={20} strokeWidth={2.3} />} variant="warning" label="PENDING" value={String(opReport.pendingTasks)} subtext="Not yet completed" />
                                <StatCard icon={<AlertCircle size={20} strokeWidth={2.3} />} variant="danger" label="OVERDUE" value={String(opReport.overdueTasks)} subtext="Past deadline" />
                                <StatCard icon={<BarChart3 size={20} strokeWidth={2.3} />} variant="success" label="COMPLETION RATE" value={`${opReport.taskCompletionRate.toFixed(1)}%`} subtext="Overall rate" />
                            </div>

                            <div className="card">
                                <DataTable title="Employee Performance Summary"
                                    headers={['Employee', 'Assigned', 'Completed', 'Overdue', 'Completion Rate']}
                                    loading={false} emptyMessage="No employee data for selected criteria."
                                    totalRecords={opReport.employeePerformanceSummary.length}>
                                    {opReport.employeePerformanceSummary.map(ep => (
                                        <tr key={ep.employeeName}>
                                            <td style={{ fontWeight: 600 }}>{ep.employeeName}</td>
                                            <td>{ep.assigned}</td>
                                            <td>{ep.completed}</td>
                                            <td>{ep.overdue}</td>
                                            <td>{ep.completionRate.toFixed(1)}%</td>
                                        </tr>
                                    ))}
                                </DataTable>
                            </div>

                            {opReport.workloadByCategory.length > 0 && (
                                <div className="card">
                                    <div className="card-header-layout"><h3>Workload by Category</h3></div>
                                    <DataTable headers={['Category', 'Task Count', 'Percentage']}
                                        loading={false} emptyMessage="No data."
                                        totalRecords={opReport.workloadByCategory.length}>
                                        {opReport.workloadByCategory.map(w => (
                                            <tr key={w.categoryName}>
                                                <td style={{ fontWeight: 600 }}>{w.categoryName}</td>
                                                <td>{w.taskCount}</td>
                                                <td>{w.percentage.toFixed(1)}%</td>
                                            </tr>
                                        ))}
                                    </DataTable>
                                </div>
                            )}

                            {opReport.workloadByDepartment.length > 0 && (
                                <div className="card">
                                    <div className="card-header-layout"><h3>Workload by Department</h3></div>
                                    <DataTable headers={['Department', 'Task Count', 'Percentage']}
                                        loading={false} emptyMessage="No data."
                                        totalRecords={opReport.workloadByDepartment.length}>
                                        {opReport.workloadByDepartment.map(w => (
                                            <tr key={w.categoryName}>
                                                <td style={{ fontWeight: 600 }}>{w.categoryName}</td>
                                                <td>{w.taskCount}</td>
                                                <td>{w.percentage.toFixed(1)}%</td>
                                            </tr>
                                        ))}
                                    </DataTable>
                                </div>
                            )}

                            {opReport.workloadByPriority.length > 0 && (
                                <div className="card">
                                    <div className="card-header-layout"><h3>Workload by Priority</h3></div>
                                    <DataTable headers={['Priority', 'Task Count', 'Percentage']}
                                        loading={false} emptyMessage="No data."
                                        totalRecords={opReport.workloadByPriority.length}>
                                        {opReport.workloadByPriority.map(w => (
                                            <tr key={w.categoryName}>
                                                <td style={{ fontWeight: 600 }}>{w.categoryName}</td>
                                                <td>{w.taskCount}</td>
                                                <td>{w.percentage.toFixed(1)}%</td>
                                            </tr>
                                        ))}
                                    </DataTable>
                                </div>
                            )}

                            <div className="report-export-row">
                                <span className="report-generated-badge"><Calendar size={12} /> Report generated at: {opGeneratedAt}</span>
                                <button className="btn btn-primary" onClick={handleOpDownload} disabled={opLoading}>
                                    {opLoading ? <Loader2 size={14} className="spin" /> : <Download size={14} />}
                                    {' '}{opLoading ? 'Preparing...' : `Download ${opFilter.reportFormat === 'EXCEL' ? 'Excel' : 'PDF'}`}
                                </button>
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
    );
};

// --- Profile Tab --------------------------------------------------------------

function ProfileTab() {
    const { success, error } = useToast();
    const employeeId = localStorage.getItem('employeeId') ?? '';
    const firstName = localStorage.getItem('firstName') ?? '';
    const middleName = localStorage.getItem('middleName') ?? '';
    const lastName = localStorage.getItem('lastName') ?? '';
    const employeeNameStored = [firstName, middleName, lastName].filter(Boolean).join(' ');
    const employeeContact = localStorage.getItem('contactNumber') ?? '';
    const storedEmail = localStorage.getItem('email') ?? '';

    // -- Profile edit state ---------------------------------------------------
    const [editingProfile, setEditingProfile] = useState(false);
    const [profileForm, setProfileForm] = useState({
        firstName: firstName,
        middleName: middleName,
        lastName: lastName,
        contactNumber: employeeContact,
        email: storedEmail,
    });
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
    const [profileSaving, setProfileSaving] = useState(false);

    // -- Password Gate state --------------------------------------------------
    const [passwordGate, setPasswordGate] = useState(false);
    const [gatePassword, setGatePassword] = useState('');
    const [gateError, setGateError] = useState('');
    const [gateLoading, setGateLoading] = useState(false);
    const [showGatePassword, setShowGatePassword] = useState(false);

    // -- Password change state ------------------------------------------------
    const [editingPassword, setEditingPassword] = useState(false);
    const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
    const [pwError, setPwError] = useState('');
    const [pwSaving, setPwSaving] = useState(false);
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNext, setShowNext] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    useEffect(() => {
        const t = localStorage.getItem('authToken');
        if (!t) return;
        fetch('/api/profile/view-profile', {
            headers: { Authorization: `Bearer ${t}` },
        })
            .then(res => res.ok ? res.json() : null)
            .then(resJson => {
                if (!resJson || !resJson.isSuccess || !resJson.data) return;
                const data = resJson.data;
                const contact = data.contactNumber ?? data.contact ?? data.phoneNumber ?? '';
                const email = data.email ?? '';
                const firstNameVal = data.firstName ?? '';
                const middleNameVal = data.middleName ?? '';
                const lastNameVal = data.lastName ?? '';
                const suffixVal = data.suffix ?? '';

                if (firstNameVal) localStorage.setItem('firstName', firstNameVal);
                if (middleNameVal) localStorage.setItem('middleName', middleNameVal);
                if (lastNameVal) localStorage.setItem('lastName', lastNameVal);
                if (suffixVal) localStorage.setItem('suffix', suffixVal);
                if (contact) localStorage.setItem('contactNumber', contact);
                if (email) localStorage.setItem('email', email);

                setProfileForm(prev => ({
                    ...prev,
                    firstName: firstNameVal || prev.firstName,
                    middleName: middleNameVal || prev.middleName,
                    lastName: lastNameVal || prev.lastName,
                    contactNumber: contact || prev.contactNumber,
                    email: email || prev.email,
                }));
            })
            .catch(() => { });
    }, []);

    const authHeader = () => ({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('authToken')}`,
    });

    // -- "Save Changes" clicked: validate first, then open gate ---------------
    const requestSave = () => {
        if (!profileForm.firstName.trim() || !/^[A-Za-z\s]{1,50}$/.test(profileForm.firstName.trim())) {
            error('Given Name must contain letters only and be up to 50 characters.');
            return;
        }
        if (profileForm.middleName?.trim() && !/^[A-Za-z\s]{1,50}$/.test(profileForm.middleName.trim())) {
            error('Middle Name must contain letters only and be up to 50 characters.');
            return;
        }
        if (!profileForm.lastName.trim() || !/^[A-Za-z\s]{1,50}$/.test(profileForm.lastName.trim())) {
            error('Last Name must contain letters only and be up to 50 characters.');
            return;
        }
        const email = profileForm.email.trim();
        if (!email || email.length < 12 || email.length > 64 || !/^[A-Za-z0-9._+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email)) {
            error('Enter a valid Email Address (12-64 characters, local-part@domain).');
            return;
        }
        if (!profileForm.contactNumber.trim() || !/^[0-9]{11}$/.test(profileForm.contactNumber.trim())) {
            error('Contact Number must be exactly 11 digits.');
            return;
        }
        setGatePassword('');
        setGateError('');
        setShowGatePassword(false);
        setPasswordGate(true);
    };

    // -- Gate confirmed: verify password then save ----------------------------
    const handleGateConfirm = async () => {
        if (!gatePassword) { setGateError('Please enter your password.'); return; }
        setGateLoading(true);
        setGateError('');
        try {
            const verifyRes = await fetch('/api/authentication/verify-password', {
                method: 'POST',
                headers: authHeader(),
                body: JSON.stringify({
                    employeeID: employeeId,
                    password: gatePassword,
                }),
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

    // -- Actual save (only called after password verified) --------------------
    const performSave = async () => {
        setProfileSaving(true);
        try {
            const token = localStorage.getItem('authToken') ?? '';
            const fd = new FormData();
            fd.append('firstName', profileForm.firstName.trim());
            fd.append('middleName', profileForm.middleName.trim());
            fd.append('lastName', profileForm.lastName.trim());
            fd.append('contactNumber', profileForm.contactNumber.trim());
            fd.append('email', profileForm.email.trim());
            const res = await fetch('/api/profile/update-profile', {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}` },
                body: fd,
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error((err as any).message || 'Profile update failed.');
            }
            localStorage.setItem('firstName', profileForm.firstName.trim());
            localStorage.setItem('middleName', profileForm.middleName.trim());
            localStorage.setItem('lastName', profileForm.lastName.trim());
            localStorage.setItem('contactNumber', profileForm.contactNumber.trim());
            localStorage.setItem('email', profileForm.email.trim());
            setEditingProfile(false);
            success('Profile updated successfully.');
        } catch (err: any) {
            error(err.message ?? 'Something went wrong.');
        } finally {
            setProfileSaving(false);
        }
    };

    const handlePwChange = (key: keyof typeof pwForm) =>
        (e: React.ChangeEvent<HTMLInputElement>) => {
            setPwForm(prev => ({ ...prev, [key]: e.target.value }));
            setPwError('');
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

    const handleProfileChange = (key: keyof typeof profileForm) =>
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const val = e.target.value;
            setProfileForm(prev => ({ ...prev, [key]: val }));
            validateField(key, val);
        };

    const handlePwSave = async () => {
        if (!pwForm.current) { setPwError('Current password is required.'); return; }
        if (pwForm.next.length < 6) { setPwError('New password must be at least 6 characters.'); return; }
        if (pwForm.next !== pwForm.confirm) { setPwError('Passwords do not match.'); return; }
        setPwSaving(true);
        try {
            const res = await fetch('/api/profile/change-password', {
                method: 'PATCH',
                headers: authHeader(),
                body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.next }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error((err as any).message || 'Password update failed.');
            }
            success('Password changed successfully!');
            setEditingPassword(false);
            setPwForm({ current: '', next: '', confirm: '' });
        } catch (err: any) {
            setPwError(err.message ?? 'Something went wrong.');
        } finally {
            setPwSaving(false);
        }
    };

    const displayName = [profileForm.firstName, profileForm.middleName, profileForm.lastName]
        .filter(Boolean).join(' ') || 'Operation Admin';
    const displayContact = profileForm.contactNumber || employeeContact;

    return (
        <div className="dashboard-content">

            {/* -- Password Gate Modal ---------------------------------------- */}
            {passwordGate && (
                <FormModal isOpen={passwordGate} onClose={() => setPasswordGate(false)}
                    title="Confirm Your Identity" subtitle="Enter your password to save your profile changes." size="sm"
                    footer={
                        <>
                            <button className="btn" onClick={() => setPasswordGate(false)} disabled={gateLoading}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleGateConfirm} disabled={gateLoading || !gatePassword}>
                                {gateLoading ? <><Loader2 size={13} className="spin" /> Verifying�</> : <><Shield size={13} /> Confirm & Save</>}
                            </button>
                        </>
                    }
                >
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 0 16px', gap: 8 }}>
                        <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(0,169,157,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
            )}

            <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr 1.5fr' }}>

                {/* -- Profile Card ------------------------------------------- */}
                <div className="card">
                    <div className="card-header-layout">
                        <h3>My Profile</h3>
                        {!editingProfile && (
                            <button
                                className="btn btn-primary"
                                style={{ fontSize: 12, padding: '6px 14px', width: 'fit-content', flexShrink: 0, marginLeft: 'auto' }}
                                onClick={() => {
                                    setEditingProfile(true);
                                    ['firstName', 'middleName', 'lastName', 'email', 'contactNumber'].forEach(k => validateField(k, (profileForm as any)[k]));
                                }}
                            >
                                <Pencil size={12} /> Edit Profile
                            </button>
                        )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0 16px', gap: 10 }}>
                        <div
                            className="avatar-circle large"
                            style={{
                                width: 72, height: 72, fontSize: 28,
                                background: 'linear-gradient(135deg, #4318ff, #6a5cff)',
                                boxShadow: '0 8px 20px rgba(67,24,255,0.28)',
                            }}
                        >
                            {displayName.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <h4 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>{displayName}</h4>
                            <StatusBadge status="Active" />
                        </div>
                    </div>

                    {editingProfile ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div className="field">
                                <label>First Name <span style={{ color: 'var(--status-failed)' }}>*</span></label>
                                <input
                                    type="text"
                                    value={profileForm.firstName}
                                    onChange={handleProfileChange('firstName')}
                                    placeholder="Enter first name"
                                    maxLength={50}
                                    style={validationErrors['firstName'] ? { borderColor: 'var(--status-failed)' } : {}}
                                />
                                {validationErrors['firstName'] && <span style={{ color: 'var(--status-failed)', fontSize: 11, marginTop: 4 }}>{validationErrors['firstName']}</span>}
                            </div>
                            <div className="field">
                                <label>Middle Name <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>(optional)</span></label>
                                <input
                                    type="text"
                                    value={profileForm.middleName}
                                    onChange={handleProfileChange('middleName')}
                                    placeholder="Enter middle name"
                                    maxLength={50}
                                    style={validationErrors['middleName'] ? { borderColor: 'var(--status-failed)' } : {}}
                                />
                                {validationErrors['middleName'] && <span style={{ color: 'var(--status-failed)', fontSize: 11, marginTop: 4 }}>{validationErrors['middleName']}</span>}
                            </div>
                            <div className="field">
                                <label>Last Name <span style={{ color: 'var(--status-failed)' }}>*</span></label>
                                <input
                                    type="text"
                                    value={profileForm.lastName}
                                    onChange={handleProfileChange('lastName')}
                                    placeholder="Enter last name"
                                    maxLength={50}
                                    style={validationErrors['lastName'] ? { borderColor: 'var(--status-failed)' } : {}}
                                />
                                {validationErrors['lastName'] && <span style={{ color: 'var(--status-failed)', fontSize: 11, marginTop: 4 }}>{validationErrors['lastName']}</span>}
                            </div>
                            <div className="field">
                                <label>Email Address <span style={{ color: 'var(--status-failed)' }}>*</span></label>
                                <input
                                    type="email"
                                    value={profileForm.email}
                                    onChange={handleProfileChange('email')}
                                    placeholder="e.g. name@company.com"
                                    style={validationErrors['email'] ? { borderColor: 'var(--status-failed)' } : {}}
                                />
                                {validationErrors['email'] && <span style={{ color: 'var(--status-failed)', fontSize: 11, marginTop: 4 }}>{validationErrors['email']}</span>}
                            </div>
                            <div className="field">
                                <label>Contact Number</label>
                                <input
                                    type="tel"
                                    value={profileForm.contactNumber}
                                    onChange={handleProfileChange('contactNumber')}
                                    placeholder="e.g. 09170000000"
                                    style={validationErrors['contactNumber'] ? { borderColor: 'var(--status-failed)' } : {}}
                                />
                                {validationErrors['contactNumber'] && <span style={{ color: 'var(--status-failed)', fontSize: 11, marginTop: 4 }}>{validationErrors['contactNumber']}</span>}
                            </div>
                            <div className="detail-grid" style={{ marginTop: 4 }}>
                                <div className="detail-item">
                                    <span className="detail-label">Employee ID</span>
                                    <span className="detail-value">{employeeId || '�'}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Role</span>
                                    <span className="detail-value">Operation Admin</span>
                                </div>
                            </div>
                            <div className="modal-actions" style={{ padding: '4px 0 0' }}>
                                <button
                                    className="btn"
                                    onClick={() => {
                                        setEditingProfile(false);
                                        setProfileForm({
                                            firstName: localStorage.getItem('firstName') ?? '',
                                            middleName: localStorage.getItem('middleName') ?? '',
                                            lastName: localStorage.getItem('lastName') ?? '',
                                            contactNumber: employeeContact,
                                            email: storedEmail,
                                        });
                                    }}
                                    disabled={profileSaving}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="btn btn-primary"
                                    onClick={requestSave}
                                    disabled={profileSaving}
                                >
                                    {profileSaving
                                        ? <><Loader2 size={13} className="spin" /> Saving�</>
                                        : <><Save size={13} /> Save Changes</>
                                    }
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="detail-grid" style={{ marginTop: 4 }}>
                            <div className="detail-item">
                                <span className="detail-label">
                                    <Hash size={11} style={{ display: 'inline', marginRight: 4 }} />Employee ID
                                </span>
                                <span className="detail-value">{employeeId || '�'}</span>
                            </div>
                            <div className="detail-item">
                                <span className="detail-label">
                                    <UserCircle2 size={11} style={{ display: 'inline', marginRight: 4 }} />First Name
                                </span>
                                <span className="detail-value">{profileForm.firstName || '�'}</span>
                            </div>
                            <div className="detail-item">
                                <span className="detail-label">
                                    <UserCircle2 size={11} style={{ display: 'inline', marginRight: 4 }} />Middle Name
                                </span>
                                <span className="detail-value">{profileForm.middleName || '�'}</span>
                            </div>
                            <div className="detail-item">
                                <span className="detail-label">
                                    <UserCircle2 size={11} style={{ display: 'inline', marginRight: 4 }} />Last Name
                                </span>
                                <span className="detail-value">{profileForm.lastName || '�'}</span>
                            </div>
                            <div className="detail-item">
                                <span className="detail-label">
                                    <Mail size={11} style={{ display: 'inline', marginRight: 4 }} />Email Address
                                </span>
                                <span className="detail-value">{profileForm.email || '�'}</span>
                            </div>
                            <div className="detail-item">
                                <span className="detail-label">
                                    <Shield size={11} style={{ display: 'inline', marginRight: 4 }} />Role
                                </span>
                                <span className="detail-value">Operation Admin</span>
                            </div>
                            <div className="detail-item">
                                <span className="detail-label">
                                    <Phone size={11} style={{ display: 'inline', marginRight: 4 }} />Contact
                                </span>
                                <span className="detail-value">{displayContact || '�'}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* -- Security Card ------------------------------------------- */}
                <div className="card">
                    <div className="card-header-layout">
                        <h3>Security Settings</h3>
                        {!editingPassword && (
                            <button
                                className="btn btn-primary"
                                style={{ fontSize: 12, padding: '6px 14px', width: 'fit-content', flexShrink: 0, marginLeft: 'auto' }}
                                onClick={() => setEditingPassword(true)}
                            >
                                <Lock size={12} /> Change Password
                            </button>
                        )}
                    </div>

                    {!editingPassword ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '4px 0' }}>
                            <div className="system-status-item" style={{ cursor: 'default' }}>
                                <div className="system-icon bg-success"><CheckCircle2 size={16} /></div>
                                <div className="system-info">
                                    <span className="system-name">Password</span>
                                    <span className="system-detail">Last updated recently</span>
                                </div>
                                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--status-active)', background: 'rgba(5,205,153,0.12)', padding: '4px 10px', borderRadius: 999, whiteSpace: 'nowrap' }}>
                                    Secure
                                </span>
                            </div>
                            <div style={{ height: 1, background: 'var(--border)' }} />
                            <div className="system-status-item" style={{ cursor: 'default' }}>
                                <div className="system-icon bg-primary"><Shield size={16} /></div>
                                <div className="system-info">
                                    <span className="system-name">Role Permissions</span>
                                    <span className="system-detail">Operations access granted</span>
                                </div>
                                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary)', background: 'rgba(67,24,255,0.1)', padding: '4px 10px', borderRadius: 999, whiteSpace: 'nowrap' }}>
                                    Op Admin
                                </span>
                            </div>
                            <div style={{ height: 1, background: 'var(--border)' }} />
                            <div className="system-status-item" style={{ cursor: 'default' }}>
                                <div className="system-icon bg-warning"><AlertCircle size={16} /></div>
                                <div className="system-info">
                                    <span className="system-name">Active Session</span>
                                    <span className="system-detail">Logged in on this device</span>
                                </div>
                                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--status-pending)', background: 'rgba(255,181,71,0.15)', padding: '4px 10px', borderRadius: 999, whiteSpace: 'nowrap' }}>
                                    Live
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="modal-form" style={{ padding: '4px 0 0' }}>
                            {pwError && (
                                <div className="form-api-error" style={{ marginBottom: 8 }}>
                                    <AlertCircle size={14} /><span>{pwError}</span>
                                </div>
                            )}
                            <div className="field">
                                <label>Current Password</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showCurrent ? 'text' : 'password'}
                                        value={pwForm.current}
                                        onChange={handlePwChange('current')}
                                        placeholder="Enter current password"
                                        style={{ paddingRight: 40, width: '100%' }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowCurrent(p => !p)}
                                        style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}
                                        tabIndex={-1}
                                    >
                                        {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                                    </button>
                                </div>
                            </div>
                            <div className="field">
                                <label>New Password</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showNext ? 'text' : 'password'}
                                        value={pwForm.next}
                                        onChange={handlePwChange('next')}
                                        placeholder="At least 6 characters"
                                        style={{ paddingRight: 40, width: '100%' }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNext(p => !p)}
                                        style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}
                                        tabIndex={-1}
                                    >
                                        {showNext ? <EyeOff size={15} /> : <Eye size={15} />}
                                    </button>
                                </div>
                                {pwForm.next.length > 0 && (
                                    <div style={{ marginTop: 6 }}>
                                        <div style={{ display: 'flex', gap: 4 }}>
                                            {[1, 2, 3].map(level => (
                                                <div key={level} style={{
                                                    flex: 1, height: 4, borderRadius: 2,
                                                    background: pwForm.next.length >= level * 4
                                                        ? level === 1 ? 'var(--status-failed)' : level === 2 ? 'var(--status-pending)' : 'var(--status-active)'
                                                        : '#e9edf7',
                                                    transition: 'background 0.2s',
                                                }} />
                                            ))}
                                        </div>
                                        <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 3, display: 'block' }}>
                                            {pwForm.next.length < 4 ? 'Weak' : pwForm.next.length < 8 ? 'Fair' : 'Strong'}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <div className="field">
                                <label>Confirm New Password</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showConfirm ? 'text' : 'password'}
                                        value={pwForm.confirm}
                                        onChange={handlePwChange('confirm')}
                                        placeholder="Re-enter new password"
                                        style={{ paddingRight: 40, width: '100%' }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirm(p => !p)}
                                        style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}
                                        tabIndex={-1}
                                    >
                                        {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                                    </button>
                                </div>
                                {pwForm.confirm.length > 0 && pwForm.next !== pwForm.confirm && (
                                    <span style={{ fontSize: 11, color: 'var(--status-failed)', marginTop: 3, display: 'block' }}>
                                        Passwords do not match
                                    </span>
                                )}
                                {pwForm.confirm.length > 0 && pwForm.next === pwForm.confirm && (
                                    <span style={{ fontSize: 11, color: 'var(--status-active)', marginTop: 3, display: 'block' }}>
                                        ? Passwords match
                                    </span>
                                )}
                            </div>
                            <div className="modal-actions" style={{ padding: '4px 0 0' }}>
                                <button
                                    className="btn"
                                    onClick={() => {
                                        setEditingPassword(false);
                                        setPwError('');
                                        setPwForm({ current: '', next: '', confirm: '' });
                                    }}
                                    disabled={pwSaving}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="btn btn-primary"
                                    onClick={handlePwSave}
                                    disabled={pwSaving}
                                >
                                    {pwSaving
                                        ? <><Loader2 size={13} className="spin" /> Saving�</>
                                        : <><Save size={13} /> Update Password</>
                                    }
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* -- Account Overview ------------------------------------------- */}
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
                            <div className="system-info">
                                <span className="system-name">{name}</span>
                                <span className="system-detail">{detail}</span>
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', background: '#eef2ff', padding: '4px 10px', borderRadius: 999, whiteSpace: 'nowrap' }}>
                                Full Access
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}


// --- Leave Requests Tab --------------------------------------------------------------

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
        success('Request submitted — your manager will review it shortly.');
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

            <DataTable
                title="My Leave History"
                filterElements={
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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
                }
                loading={loading}
                emptyIcon={<CalendarDays size={26} color="var(--primary)" />}
                emptyMessage={histFilter === 'all' ? 'No leave requests yet' : `No ${histFilter} requests`}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
            >
                <div style={{ padding: '0 20px 16px', display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
                    {paginatedRecords.map(r => <LeaveRecordCard key={r.id} record={r} />)}
                </div>
            </DataTable>

            {showModal && (
                <LeaveRequestModal
                    onClose={() => setShowModal(false)}
                    onSubmit={handleSubmit}
                />
            )}
        </div>
    );
};


const LeaveRecordCard: React.FC<{ record: LeaveRecord }> = ({ record }) => {
    const statusColors: Record<LeaveStatus, { bg: string; color: string }> = {
        Pending: { bg: 'rgba(255,181,71,0.12)', color: '#c05c00' },
        Approved: { bg: 'rgba(5,205,153,0.12)', color: 'var(--status-active)' },
        Declined: { bg: 'rgba(238,93,80,0.12)', color: 'var(--status-failed)' },
    };
    const meta = statusColors[record.status];

    return (
        <div style={{
            border: '1px solid var(--border)', borderRadius: 10,
            padding: '12px 16px', background: 'var(--bg-card)',
            display: 'flex', flexDirection: 'column', gap: 6,
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>
                    {record.leaveType}
                </span>
                <span style={{
                    fontSize: 12, fontWeight: 600, padding: '3px 10px',
                    borderRadius: 999, background: meta.bg, color: meta.color,
                }}>
                    {record.status}
                </span>
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-secondary)' }}>
                <span>From: <strong style={{ color: 'var(--text-primary)' }}>{record.startDate}</strong></span>
                <span>To: <strong style={{ color: 'var(--text-primary)' }}>{record.endDate}</strong></span>
            </div>
            {record.reason && (
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
                    {record.reason}
                </p>
            )}
            {record.reviewNote && (
                <div style={{
                    fontSize: 12, padding: '6px 10px', borderRadius: 8,
                    background: meta.bg, color: meta.color,
                }}>
                    <strong>Note:</strong> {record.reviewNote}
                </div>
            )}
        </div>
    );
};

// --- Modal: Reopen Approval --------------------------------------------------

interface ReopenApprovalModalProps {
    request: ReopenRequest;
    onApprove: (requestId: string, remarks: string) => void;
    onReject: (requestId: string, remarks: string) => void;
    onClose: () => void;
}

const ReopenApprovalModal: React.FC<ReopenApprovalModalProps> = ({ request, onApprove, onReject, onClose }) => {
    const [decision, setDecision] = useState<'Approve' | 'Reject' | ''>('');
    const [remarks, setRemarks] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);

    const validate = (): boolean => {
        const errs: Record<string, string> = {};
        if (!decision) errs.decision = 'Please select an approval decision.';
        if (!remarks.trim()) errs.remarks = 'Admin remarks are required.';
        else if (remarks.trim().length > 500) errs.remarks = 'Remarks must not exceed 500 characters.';
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = () => {
        if (!validate()) return;
        setSubmitting(true);
        if (decision === 'Approve') {
            onApprove(request.requestId, remarks.trim());
        } else {
            onReject(request.requestId, remarks.trim());
        }
        setSubmitting(false);
    };

    return (
        <FormModal isOpen onClose={onClose} title="Reopen Task Approval" subtitle="Review and decide on the reopening request." size="md" confirmOnCancel={true}
            footer={
                <>
                    <div style={{ flex: 1 }} />
                    <button className="btn" onClick={onClose} disabled={submitting}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting || !decision}>
                        {submitting ? <><Loader2 size={13} className="spin" /> Submitting�</> : <><ThumbsUp size={13} /> Submit Decision</>}
                    </button>
                </>
            }
        >
            <div className="reopen-info-grid">
                <div className="reopen-info-item">
                    <span className="reopen-info-label">Request Ref</span>
                    <span className="reopen-info-value" style={{ fontFamily: 'monospace', fontWeight: 700 }}>{request.referenceNumber || request.requestId.slice(0, 8).toUpperCase()}</span>
                </div>
                <div className="reopen-info-item">
                    <span className="reopen-info-label">Task ID</span>
                    <span className="reopen-info-value">{request.taskId}</span>
                </div>
                <div className="reopen-info-item">
                    <span className="reopen-info-label">Task Title</span>
                    <span className="reopen-info-value">{request.taskTitle}</span>
                </div>
                <div className="reopen-info-item">
                    <span className="reopen-info-label">Employee</span>
                    <span className="reopen-info-value">{request.employeeName}</span>
                </div>
                <div className="reopen-info-item">
                    <span className="reopen-info-label">Current Status</span>
                    <span className={statusBadgeClass(request.currentStatus)} style={{ fontSize: 11 }}>{request.currentStatus}</span>
                </div>
                <div className="reopen-info-item">
                    <span className="reopen-info-label">Submitted</span>
                    <span className="reopen-info-value">{fmtDate(request.submittedAt)}</span>
                </div>
            </div>

            <div className="field">
                <label>Reopening Reason</label>
                <div className="reopen-reason-box">{request.reason}</div>
            </div>

            {request.supportingEvidence && (
                <div className="field">
                    <label>Supporting Evidence</label>
                    <div className="reopen-evidence-box">
                        <span style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 500 }}>{request.supportingEvidence}</span>
                    </div>
                </div>
            )}

            <div className="field">
                <label>Approval Decision <span style={{ color: 'var(--status-failed)' }}>*</span></label>
                <select value={decision}
                    onChange={e => { setDecision(e.target.value as 'Approve' | 'Reject'); setErrors(prev => ({ ...prev, decision: '' })); }}
                    className={errors.decision ? 'input-error' : ''}>
                    <option value="">Select decision</option>
                    <option value="Approve">Approve</option>
                    <option value="Reject">Reject</option>
                </select>
                {errors.decision && (
                    <span style={{ fontSize: 11, color: 'var(--status-failed)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <AlertCircle size={11} />{errors.decision}
                    </span>
                )}
            </div>

            <div className="field">
                <label>Admin Remarks <span style={{ color: 'var(--status-failed)' }}>*</span></label>
                <textarea value={remarks}
                    onChange={e => { setRemarks(e.target.value); setErrors(prev => ({ ...prev, remarks: '' })); }}
                    placeholder="Provide a reason for your decision..." rows={3}
                    className={errors.remarks ? 'input-error' : ''} maxLength={500} />
                {errors.remarks && (
                    <span style={{ fontSize: 11, color: 'var(--status-failed)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <AlertCircle size={11} />{errors.remarks}
                    </span>
                )}
                <span style={{ fontSize: 11, marginTop: 3, display: 'block', textAlign: 'right', color: remarks.length > 450 ? (remarks.length >= 500 ? 'var(--status-failed)' : '#c05c00') : 'var(--text-secondary)' }}>
                    {remarks.length}/500
                </span>
            </div>
        </FormModal>
    );
};

// --- Tab: Reopen Requests -----------------------------------------------------

const ReopenTab: React.FC<{
    requests: ReopenRequest[];
    onReview: (req: ReopenRequest) => void;
}> = ({ requests, onReview }) => {
    const pending = requests.filter(r => r.status === 'Pending');
    const history = requests.filter(r => r.status !== 'Pending');

    return (
        <div className="dashboard-content">
            {/* Stat cards */}
            <div className="stats-row">
                {[
                    { label: 'PENDING REQUESTS', value: pending.length, icon: <RotateCcw size={20} strokeWidth={2.3} />, variant: 'warning', subtext: 'Awaiting review' },
                    { label: 'APPROVED', value: history.filter(r => r.status === 'Approved').length, icon: <ThumbsUp size={20} strokeWidth={2.3} />, variant: 'success', subtext: 'Task reopened' },
                    { label: 'REJECTED', value: history.filter(r => r.status === 'Rejected').length, icon: <ThumbsDown size={20} strokeWidth={2.3} />, variant: 'danger', subtext: 'Declined requests' },
                    { label: 'TOTAL', value: requests.length, icon: <ClipboardList size={20} strokeWidth={2.3} />, variant: 'primary', subtext: 'All time' },
                ].map(s => (
                    <StatCard key={s.label} icon={s.icon} variant={s.variant} label={s.label} value={s.value} subtext={s.subtext} />
                ))}
            </div>

            {/* Pending Requests */}
            <div className="reopen-section">
                <div className="reopen-section-header">
                    <h3>Pending Reopen Requests</h3>
                    {pending.length > 0 && <span className="badge badge-amber">{pending.length} pending</span>}
                </div>
                <DataTable
                    headers={['REQUEST ID', 'TASK', 'EMPLOYEE', 'REASON', 'SUBMITTED', 'ACTIONS']}
                    loading={false}
                    emptyMessage="No pending reopen requests."
                    emptyIcon={<RotateCcw size={24} />}
                    totalRecords={pending.length}
                >
                    {pending.map(r => (
                        <tr key={r.requestId}>
                            <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>{r.referenceNumber || r.requestId.slice(0, 8).toUpperCase()}</td>
                            <td><div style={{ fontWeight: 600, fontSize: 13 }}>{r.taskTitle}</div></td>
                            <td style={{ fontSize: 13 }}>{r.employeeName}</td>
                            <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13 }}>{r.reason}</td>
                            <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{fmtDate(r.submittedAt)}</td>
                            <td>
                                <button className="btn btn-primary" onClick={() => onReview(r)} style={{ fontSize: 11, padding: '4px 12px' }}>
                                    <Eye size={12} /> Review
                                </button>
                            </td>
                        </tr>
                    ))}
                </DataTable>
            </div>

            {/* History */}
            {history.length > 0 && (
                <div style={{ marginTop: 24 }}>
                    <h3 style={{ marginBottom: 12, fontSize: 15 }}>Request History</h3>
                    <DataTable
                        headers={['REQUEST ID', 'TASK', 'EMPLOYEE', 'DECISION', 'REMARKS', 'REVIEWED']}
                        loading={false}
                        totalRecords={history.length}
                    >
                        {history.map(r => (
                            <tr key={r.requestId}>
                                <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>{r.referenceNumber || r.requestId.slice(0, 8).toUpperCase()}</td>
                                <td><div style={{ fontWeight: 600, fontSize: 13 }}>{r.taskTitle}</div></td>
                                <td style={{ fontSize: 13 }}>{r.employeeName}</td>
                                <td><StatusBadge status={r.status} size="sm" /></td>
                                <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13 }}>{r.adminRemarks || '�'}</td>
                                <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{r.reviewedAt ? fmtDate(r.reviewedAt) : '�'}</td>
                            </tr>
                        ))}
                    </DataTable>
                </div>
            )}
        </div>
    );
};

// --- Duplicate Warning Modal --------------------------------------------------

interface DuplicateWarningModalProps {
    duplicates: DuplicateWarningDTO[];
    onContinue: () => void;
    onCancel: () => void;
}

const DuplicateWarningModal: React.FC<DuplicateWarningModalProps> = ({ duplicates, onContinue, onCancel }) => (
    <FormModal isOpen onClose={onCancel}
        title="Potential duplicate task detected."
        subtitle={`The system found ${duplicates.length} similar task${duplicates.length !== 1 ? 's' : ''} in existing records. Review the matches below.`}
        size="lg"
        footer={
            <div className="modal-actions" style={{ width: '100%', justifyContent: 'flex-end' }}>
                <button className="btn" onClick={onCancel}><X size={13} /> Cancel</button>
                <button className="btn btn-primary" onClick={onContinue}><CheckCircle2 size={13} /> Continue Anyway</button>
            </div>
        }
    >
        <div style={{ overflowX: 'auto', margin: '8px 0 4px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                    <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                        <th style={{ padding: '8px 8px', fontWeight: 700, color: 'var(--text-secondary)' }}>Existing Task Title</th>
                        <th style={{ padding: '8px 8px', fontWeight: 700, color: 'var(--text-secondary)' }}>Task ID</th>
                        <th style={{ padding: '8px 8px', fontWeight: 700, color: 'var(--text-secondary)' }}>Status</th>
                        <th style={{ padding: '8px 8px', fontWeight: 700, color: 'var(--text-secondary)' }}>Similarity</th>
                    </tr>
                </thead>
                <tbody>
                    {duplicates.map((d, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '10px 8px', fontWeight: 600, color: 'var(--text-primary)' }}>{d.existingTaskTitle}</td>
                            <td style={{ padding: '10px 8px', fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                                {d.existingTaskId.length > 8 ? d.existingTaskId.slice(0, 8) + '...' : d.existingTaskId}
                            </td>
                            <td style={{ padding: '10px 8px' }}>
                                <span className={statusBadgeClass(d.existingTaskStatus)} style={{ fontSize: 11 }}>{d.existingTaskStatus}</span>
                            </td>
                            <td style={{ padding: '10px 8px', fontWeight: 700, color: d.similarityPercentage >= 90 ? 'var(--status-failed)' : d.similarityPercentage >= 80 ? '#c05c00' : d.similarityPercentage >= 70 ? '#9a6e00' : 'var(--text-primary)' }}>
                                {d.similarityPercentage}%
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </FormModal>
);

// --- Root Component -----------------------------------------------------------

export default function OpsAdminDashboard() {
    const navigate = useNavigate();
    usePreventBackNav();

    const employeeId = localStorage.getItem('employeeId') ?? '';
    const firstName = localStorage.getItem('firstName') ?? '';
    const lastName = localStorage.getItem('lastName') ?? '';
    const middleName = localStorage.getItem('middleName') ?? '';
    const employeeName = [firstName, middleName, lastName].filter(Boolean).join(' ') || 'Op Admin';
    const { success, error } = useToast();
    const [confirmModal, setConfirmModal] = useState<ConfirmModalState>(CONFIRM_CLOSED);

    const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
    const [tasks, setTasks] = useState<Task[]>([]);
    const tmTasks = useMemo(() => tasks.map(t => ({
        id: t.taskId,
        name: t.taskTitle,
        referenceNumber: t.taskReferenceNumber,
        project: t.taskCategory,
        assignee: t.assignedTo ? { id: t.assignedTo, name: t.assignedEmployee || 'Unassigned' } : undefined,
        priority: t.priority as TMTask['priority'],
        status: ({ Draft: 'Backlog', Assigned: 'To do', Pending: 'To do', 'In Progress': 'In progress', 'Pending Admin Review': 'In review', Done: 'Done', Completed: 'Done', Overdue: 'In progress' } as Record<string, TMTask['status']>)[t.taskStatus] || 'Backlog',
        dueDate: t.dueAt || undefined,
        progress: t.taskStatus === 'Completed' || t.taskStatus === 'Done' ? 100 : t.taskStatus === 'In Progress' ? 50 : t.taskStatus === 'Pending Admin Review' ? 80 : t.taskStatus === 'Assigned' || t.taskStatus === 'Pending' ? 10 : 0,
        isArchived: false,
        isDeleted: t.deleted || t.Deleted || false,
    })), [tasks]);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [loadingTasks, setLoadingTasks] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [userPresenceStatus, setUserPresenceStatus] = useState('Offline');

    const [showNew, setShowNew] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [viewingTask, setViewingTask] = useState<Task | null>(null);
    const [detailTask, setDetailTask] = useState<TaskViewTask | null>(null);
    const [overrideTask, setOverrideTask] = useState<Task | null>(null);
    const [reviewTask, setReviewTask] = useState<Task | null>(null);

    const token = () => localStorage.getItem('authToken');

    // -- Fetch Tasks --
    const [allTasks, setAllTasks] = useState<Task[]>([]);
    const [deletedTaskIds, setDeletedTaskIds] = useState<Set<string>>(new Set());
    const [binTasks, setBinTasks] = useState<Task[]>([]);

    // Fetch Leave records
    const [leaveRecords, setLeaveRecords] = useState<LeaveRecord[]>([]);
    const [leaveLoading, setLeaveLoading] = useState(false);

    // Reopen Requests state
    const [reopenRequests, setReopenRequests] = useState<ReopenRequest[]>([]);
    const [reopenLoading, setReopenLoading] = useState(false);
    const [reviewingRequest, setReviewingRequest] = useState<ReopenRequest | null>(null);

    // Duplicate warning state
    const [duplicateWarnings, setDuplicateWarnings] = useState<DuplicateWarningDTO[]>([]);
    const [pendingTaskData, setPendingTaskData] = useState<CreateTaskDTO | null>(null);

    // -- Dashboard Data --
    const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);
    const [dashboardLoading, setDashboardLoading] = useState(false);
    const [dashboardError, setDashboardError] = useState<string | null>(null);
    const [dashboardEmployees, setDashboardEmployees] = useState<EmployeeFilterOption[]>([]);
    const [dashboardDepartments, setDashboardDepartments] = useState<DepartmentFilterOption[]>([]);
    const [dashboardFilters, setDashboardFilters] = useState({ dateStart: '', dateEnd: '', employeeId: '', departmentId: '', taskStatus: '' });

    // -- Activity Logs --
    const [activityLogs, setActivityLogs] = useState<any[]>([]);
    const [activityLogPage, setActivityLogPage] = useState(1);
    const [activityLogTotalPages, setActivityLogTotalPages] = useState(1);
    const ACTIVITY_LOG_PAGE_SIZE = 15;

    const fetchActivityLogs = (page: number) => {
        const t = token();
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

    const fetchDashboardData = useCallback(async () => {
        setDashboardLoading(true);
        setDashboardError(null);
        try {
            const params = new URLSearchParams();
            if (dashboardFilters.dateStart) params.append('dateRangeStart', dashboardFilters.dateStart);
            if (dashboardFilters.dateEnd) params.append('dateRangeEnd', dashboardFilters.dateEnd);
            if (dashboardFilters.employeeId) params.append('employeeId', dashboardFilters.employeeId);
            if (dashboardFilters.departmentId) params.append('departmentId', dashboardFilters.departmentId);
            if (dashboardFilters.taskStatus) params.append('taskStatus', dashboardFilters.taskStatus);
            const res = await fetch(`/api/dashboard/workload?${params}`, {
                headers: { Authorization: `Bearer ${token()}` },
            });
            if (!res.ok) {
                const errBody = await res.json().catch(() => null);
                throw new Error(errBody?.message || 'Failed to load dashboard data');
            }
            const body: ApiResponse<DashboardResponse> = await res.json();
            if (!body.isSuccess) {
                setDashboardError(body.message || 'No workload data available.');
                setDashboardData(null);
            } else {
                setDashboardData(body.data);
                setDashboardError(null);
            }
        } catch (err: any) {
            setDashboardError(err.message || 'No workload data available.');
            setDashboardData(null);
        } finally {
            setDashboardLoading(false);
        }
    }, [dashboardFilters]);

    const fetchDashboardFilterOptions = useCallback(async () => {
        try {
            const [empRes, deptRes] = await Promise.all([
                fetch('/api/dashboard/filter-employees', { headers: { Authorization: `Bearer ${token()}` } }),
                fetch('/api/dashboard/filter-departments', { headers: { Authorization: `Bearer ${token()}` } }),
            ]);
            if (empRes.ok) {
                const empBody: ApiResponse<EmployeeFilterOption[]> = await empRes.json();
                if (empBody.isSuccess && empBody.data) setDashboardEmployees(empBody.data);
            }
            if (deptRes.ok) {
                const deptBody: ApiResponse<DepartmentFilterOption[]> = await deptRes.json();
                if (deptBody.isSuccess && deptBody.data) setDashboardDepartments(deptBody.data);
            }
        } catch { /* non-fatal */ }
    }, []);

    const handleDashboardClearFilters = useCallback(() => {
        setDashboardFilters({ dateStart: '', dateEnd: '', employeeId: '', departmentId: '', taskStatus: '' });
    }, []);

    // -- Update fetchTasks --
    const fetchTasks = async () => {
        setLoadingTasks(true);
        try {
            const res = await fetch('/api/task/all-tasks', {
                headers: { Authorization: `Bearer ${token()}` },
            });
            if (!res.ok) throw new Error();
            const jsonRes = await res.json();
            const rawList: any[] = Array.isArray(jsonRes) ? jsonRes : (Array.isArray(jsonRes?.data?.data) ? jsonRes.data.data : (Array.isArray(jsonRes?.data) ? jsonRes.data : []));

            const normalized: Task[] = rawList.map(t => ({
                ...t,
                deleted: deletedTaskIds.has(t.taskId),
            }));

            setAllTasks(normalized);
            setTasks(normalized.filter(t => !t.deleted));
        } catch {
        } finally {
            setLoadingTasks(false);
        }
    };

    const fetchBinRecords = async () => {
        try {
            const res = await fetch(
                `/api/task/bin-records/${employeeId}`,
                {
                    headers: {
                        Authorization: `Bearer ${token()}`,
                    },
                }
            );

            if (!res.ok) throw new Error();

            const data = await res.json();

            setBinTasks(data);
        } catch {
            setBinTasks([]);
        }
    };

    // -- Restore task --
    const handleRestoreTask = async (taskId: string) => {
        try {
            const res = await fetch(`/api/task/${taskId}/restore-task`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${token()}` },
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || 'Failed to restore task.');
            }
            setAllTasks(prev => prev.map(t =>
                t.taskId === taskId ? { ...t, deleted: false } : t
            ));
            setTasks(prev => {
                const restored = allTasks.find(t => t.taskId === taskId);
                return restored ? [...prev, { ...restored, deleted: false }] : prev;
            });
            success('Task restored successfully.');
            await fetchTasks();
            await fetchDashboardData();
            await fetchBinRecords();
        } catch (err: any) {
            error(err.message ?? 'Failed to restore task.');
        }
    };

    const handleEmptyBin = () => {
        setConfirmModal({
            isOpen: true,
            variant: 'danger',
            title: 'Empty Trash Bin',
            description: 'Permanently remove all items in the bin? This action cannot be undone.',
            confirmLabel: 'Empty Bin',
            onConfirm: async () => {
                setConfirmModal(CONFIRM_CLOSED);
                try {
                    const res = await fetch(
                        `/api/task/empty-bin/${employeeId}`,
                        {
                            method: 'DELETE',
                            headers: {
                                Authorization: `Bearer ${token()}`,
                            },
                        }
                    );

                    if (!res.ok) {
                        const err = await res.json().catch(() => ({}));
                        throw new Error(err.message || 'Failed to empty bin.');
                    }

                    setBinTasks([]);
                    await fetchTasks();
                    success('Bin emptied successfully.');
                } catch (err: any) {
                    error(err.message ?? 'Failed to empty bin.');
                }
            }
        });
    };

    // -- Fetch Team Members (for assignee dropdown) --
    const fetchTeamMembers = async () => {
        try {
            const res = await fetch('/api/task/assignable-employees?pageNumber=1&pageSize=100', {
                headers: { Authorization: `Bearer ${token()}` },
            });
            if (!res.ok) throw new Error();
            const body = await res.json();
            const rawList: any[] = Array.isArray(body) ? body : (Array.isArray(body?.data?.data) ? body.data.data : (Array.isArray(body?.data) ? body.data : []));

            setTeamMembers(rawList.map(e => ({
                accountId: e.accountId ?? e.AccountId ?? e.id,
                employeeName: (e.displayName ?? e.employeeName ?? e.EmployeeName ?? e.name ?? '').replace(/\(.*?\)/g, '').replace(/-\s*Recommended\s*$/i, '').trim(),
                role: e.role ?? '',
                presenceStatus: e.availabilityStatus ?? 'Active',
            })));
        } catch {
            setTeamMembers([]);
        }
    };

    const fetchLeaveRecords = async () => {
        setLeaveLoading(true);
        try {
            const res = await fetch('/api/leaverequest/my-leave-requests', {
                headers: { Authorization: `Bearer ${token()}` },
            });
            if (!res.ok) throw new Error();
            const data = await res.json();
            setLeaveRecords(Array.isArray(data) ? data : []);
        } catch {
            setLeaveRecords([]);
        } finally {
            setLeaveLoading(false);
        }
    };

    const fetchReopenRequests = async () => {
        setReopenLoading(true);
        try {
            const res = await fetch('/api/task/reopen-requests', {
                headers: { Authorization: `Bearer ${token()}` },
            });
            if (!res.ok) throw new Error();
            const data: any[] = await res.json();
            setReopenRequests(data.map((r: any) => ({
                requestId: r.requestId,
                referenceNumber: r.referenceNumber,
                taskId: r.taskId,
                taskTitle: r.taskTitle,
                employeeName: r.employeeName,
                employeeId: r.employeeId,
                reason: r.reason,
                supportingEvidence: r.supportingEvidence,
                currentStatus: r.currentStatus,
                status: r.status,
                submittedAt: r.submittedAt,
                reviewedAt: r.reviewedAt,
                adminRemarks: r.adminRemarks,
            })));
        } catch {
            setReopenRequests([]);
        } finally {
            setReopenLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
        fetchBinRecords();
        fetchTeamMembers();
        fetchLeaveRecords();
        fetchReopenRequests();
        fetchDashboardFilterOptions();
        const t = localStorage.getItem('authToken');
        if (!t) return;
        fetch('/api/profile/view-profile', {
            headers: { Authorization: `Bearer ${t}` },
        })
            .then(res => res.ok ? res.json() : null)
            .then(resJson => {
                if (!resJson || !resJson.isSuccess || !resJson.data) return;
                const data = resJson.data;
                const contact = data.contactNumber ?? data.contact ?? data.phoneNumber ?? '';
                const email = data.email ?? '';
                const firstNameVal = data.firstName ?? '';
                const middleNameVal = data.middleName ?? '';
                const lastNameVal = data.lastName ?? '';
                const suffixVal = data.suffix ?? '';

                if (firstNameVal) localStorage.setItem('firstName', firstNameVal);
                if (middleNameVal) localStorage.setItem('middleName', middleNameVal);
                if (lastNameVal) localStorage.setItem('lastName', lastNameVal);
                if (suffixVal) localStorage.setItem('suffix', suffixVal);
                if (contact) localStorage.setItem('contactNumber', contact);
                if (email) localStorage.setItem('email', email);

                const fullName = [firstNameVal, middleNameVal, lastNameVal, suffixVal].map(s => (s ?? '').trim()).filter(Boolean).join(' ');
                if (fullName) localStorage.setItem('employeeName', fullName);
            })
            .catch(() => { });
    }, []);

    // -- Create Task --
    const handleNewTask = async (data: CreateTaskDTO) => {
        try {
            const formData = new FormData();
            formData.append('taskTitle', data.taskTitle);
            formData.append('taskDescription', data.taskDescription);
            formData.append('priority', data.priority);
            formData.append('dueAt', new Date(data.dueAt).toISOString());
            if (data.assignedTo) formData.append('assignedTo', data.assignedTo);
            if (data.taskCategory) formData.append('taskCategory', data.taskCategory);
            if (data.recommendedEmployeeId) formData.append('recommendedEmployeeId', data.recommendedEmployeeId);
            if (data.supportingEvidence) formData.append('supportingEvidence', data.supportingEvidence);

            const res = await fetch('/api/task/create-task', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token()}` },
                body: formData,
            });
            if (res.status === 409) {
                const errBody = await res.json().catch(() => ({}));
                if (errBody.data && Array.isArray(errBody.data) && errBody.data.length > 0) {
                    setDuplicateWarnings(errBody.data);
                    setPendingTaskData(data);
                    return;
                }
                throw new Error(errBody.message || 'Potential duplicate task detected.');
            }
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || 'Failed to create task.');
            }
            await fetchTasks();
            await fetchDashboardData();
            setShowNew(false);
            success('Task created successfully.');
        } catch (err: any) {
            error(err.message ?? 'Failed to create task.');
        }
    };

    // -- Update Task --
    const handleEditTask = async (taskId: string, data: UpdateTaskDTO) => {
        try {
            const formData = new FormData();
            formData.append('TaskTitle', data.taskTitle);
            formData.append('TaskDescription', data.taskDescription);
            formData.append('Priority', data.priority);
            if (data.dueAt) formData.append('DueAt', new Date(data.dueAt).toISOString());
            if (data.assignedTo) formData.append('AssignedTo', data.assignedTo);
            if (data.taskCategory) formData.append('TaskCategory', data.taskCategory);
            if (data.taskRemarks) formData.append('TaskRemarks', data.taskRemarks);
            const dto = data as any;
            if (dto.supportingEvidence) formData.append('SupportingEvidence', dto.supportingEvidence);
            const res = await fetch(`/api/task/update-task/${taskId}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token()}` },
                body: formData,
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || 'Failed to update task.');
            }
            await fetchTasks();
            await fetchDashboardData();
            setEditingTask(null);
            success('Task updated successfully.');
        } catch (err: any) {
            error(err.message ?? 'Failed to update task.');
        }
    };

    // -- Reopen Task (direct admin override) --
    const handleReopenTask = async (taskId: string) => {
        try {
            const formData = new FormData();
            formData.append('Reason', 'Admin reopen request');
            const res = await fetch(`/api/task/${taskId}/reopen-request`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token()}` },
                body: formData,
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || 'Failed to reopen task.');
            }
            await fetchTasks();
            await fetchDashboardData();
            await fetchReopenRequests();
            success('Reopen request submitted for review.');
        } catch (err: any) {
            error(err.message ?? 'Failed to reopen task.');
        }
    };

    // -- FSM Status Transition --
    const handleStatusTransition = async (taskId: string, newStatus: TaskStatus) => {
        const task = tasks.find(t => t.taskId === taskId);
        if (!task) { error('Task not found.'); return; }
        if (!isTransitionValid(task.taskStatus, newStatus)) {
            error(`Invalid task status transition: ${task.taskStatus} ? ${newStatus}. Status sequence violation detected.`);
            return;
        }
        try {
            const formData = new FormData();
            formData.append('TaskStatus', newStatus);
            const res = await fetch(`/api/task/${taskId}/progress`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${token()}` },
                body: formData,
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || 'Failed to update task status.');
            }
            await fetchTasks();
            await fetchDashboardData();
            setViewingTask(null);
            success('Task status updated successfully.');
        } catch (err: any) {
            error(err.message ?? 'Invalid task status transition.');
        }
    };

    // -- Task Review (Approve & Close / Return for Rework) --
    const handleReviewTask = async (taskId: string, adminDecision: 'Approve & Close' | 'Return for Rework', reviewerRemarks: string) => {
        try {
            const res = await fetch(`/api/task/${taskId}/review`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token()}`,
                },
                body: JSON.stringify({
                    AdminDecision: adminDecision,
                    ReviewerRemarks: reviewerRemarks.length > 0 ? reviewerRemarks : undefined,
                }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || 'Failed to process review decision.');
            }
            await fetchTasks();
            await fetchDashboardData();
            success(
                adminDecision === 'Approve & Close'
                    ? 'Task officially closed and recorded.'
                    : 'Task returned for rework. The employee has been notified.'
            );
        } catch (err: any) {
            error(err.message ?? 'Failed to submit review decision.');
        }
    };

    // -- Admin Override (completed task) --
    const handleAdminOverride = async (taskId: string, reason: string, remarks: string, requestedStatus: string) => {
        try {
            const res = await fetch(`/api/task/${taskId}/override`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token()}`,
                },
                body: JSON.stringify({
                    OverrideReason: reason,
                    AdminRemarks: remarks,
                    ApprovalConfirmation: true,
                    RequestedStatus: requestedStatus,
                }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || 'Failed to process admin override.');
            }
            await fetchTasks();
            setOverrideTask(null);
            success('Administrator override applied � Task reopened � Audit Log entry generated.');
        } catch (err: any) {
            error(err.message ?? 'Administrator override failed.');
        }
    };

    // -- Approve Reopen Request --
    const handleApproveReopen = async (requestId: string, adminRemarks: string) => {
        try {
            const res = await fetch(`/api/task/reopen-requests/${requestId}/review`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token()}`,
                },
                body: JSON.stringify({
                    ApprovalDecision: 'Approve',
                    AdminRemarks: adminRemarks,
                }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error((err as any).message || 'Failed to approve reopen request.');
            }
            setReopenRequests(prev => prev.map(r =>
                r.requestId === requestId
                    ? { ...r, status: 'Approved', adminRemarks, reviewedAt: new Date().toISOString() }
                    : r
            ));
            await fetchTasks();
            await fetchDashboardData();
            setReviewingRequest(null);
            success('Reopening request approved � Task reopened � Task history preserved � Audit Log entry generated.');
        } catch (err: any) {
            error(err.message ?? 'Failed to approve reopen request.');
        }
    };

    // -- Reject Reopen Request --
    const handleRejectReopen = async (requestId: string, adminRemarks: string) => {
        try {
            const res = await fetch(`/api/task/reopen-requests/${requestId}/review`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token()}`,
                },
                body: JSON.stringify({
                    ApprovalDecision: 'Reject',
                    AdminRemarks: adminRemarks,
                }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error((err as any).message || 'Failed to reject reopen request.');
            }
            setReopenRequests(prev => prev.map(r =>
                r.requestId === requestId
                    ? { ...r, status: 'Rejected', adminRemarks, reviewedAt: new Date().toISOString() }
                    : r
            ));
            await fetchDashboardData();
            setReviewingRequest(null);
            success('Reopening request rejected � Original task preserved � Audit Log entry generated.');
        } catch (err: any) {
            error(err.message ?? 'Failed to reject reopen request.');
        }
    };

    const handleDeleteTask = (taskId: string) => {
        setConfirmModal({
            isOpen: true,
            variant: 'danger',
            title: 'Delete Task',
            description: 'Delete this task? This cannot be undone.',
            confirmLabel: 'Delete',
            cancelLabel: 'Keep',
            onConfirm: async () => {
                setConfirmModal(CONFIRM_CLOSED);
                try {
                    const res = await fetch(`/api/task/${taskId}/delete-task`, {
                        method: 'DELETE',
                        headers: { Authorization: `Bearer ${token()}` },
                    });
                    if (!res.ok) {
                        const err = await res.json().catch(() => ({}));
                        throw new Error(err.message || 'Failed to delete task.');
                    }

                    // Track locally so refetches don't resurrect the task
                    setDeletedTaskIds(prev => new Set(prev).add(taskId));
                    setAllTasks(prev => prev.map(t =>
                        t.taskId === taskId ? { ...t, deleted: true } : t
                    ));
                    setTasks(prev => prev.filter(t => t.taskId !== taskId));
                    setEditingTask(null);
                    setViewingTask(null);
                    setDetailTask(null);
                    success('Task deleted successfully.');

                    await fetchTasks();
                    await fetchDashboardData();
                    await fetchBinRecords();

                } catch (err: any) {
                    error(err.message ?? 'Something went wrong.');
                }
            }
        });
    };

    const handleLogout = async () => {
        const token = localStorage.getItem('authToken');

        if (token) {
            await fetch('/api/authentication/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            }).catch(() => { }); // non-fatal � clear localStorage regardless
        }

        ['employeeId', 'refreshToken', 'authToken', 'employeeName',
            'firstName', 'middleName', 'lastName', 'contactNumber', 'role']
            .forEach(k => localStorage.removeItem(k));
        navigate('/');
    };

    const pageTitles: Record<NavTab, string> = {
        dashboard: 'Board Overview',
        tasks: 'Task Management',
        team: 'Team Management',
        reports: 'Performance Reports',
        profile: 'My Profile',
        leave: 'Leave Requests',
        reopen: 'Reopen Requests',
        templates: 'Task Templates',
        approvals: 'Approvals',
        activity_logs: 'Activity Logs',
    };

    // -- Fetch dashboard data when filters change --
    useEffect(() => {
        fetchDashboardData();
        fetchActivityLogs(1);
    }, [fetchDashboardData]);

    // -- Polling fallback: refresh tasks periodically regardless of SignalR --
    useEffect(() => {
        const interval = setInterval(() => fetchTasks(), 30000);
        return () => clearInterval(interval);
    }, []);

    // -- SignalR: Auto-refresh dashboard when task data changes --
    useEffect(() => {
        const connection = new signalR.HubConnectionBuilder()
            .withUrl('/hubs/workflow')
            .withAutomaticReconnect()
            .build();

        connection.on('DashboardDataChanged', () => {
            fetchDashboardData();
            fetchTasks();
            window.dispatchEvent(new CustomEvent('opencode-notification-update'));
        });

        connection.start().then(() => {
            const acctId = localStorage.getItem('employeeId');
            if (acctId) connection.invoke('JoinDashboardGroup', acctId).catch(() => { });
        }).catch(() => { });

        return () => { connection.stop(); };
    }, [fetchDashboardData]);

    return (
        <div className="dashboard-container">
            <aside className="sidebar">
                <div className="sidebar-logo">
                    <img src="/src/assets/SpeedexLogo.jpg" alt="Speedex Logo" className="logo-image" />
                </div>

                <div className="sidebar-role-section">
                    <div className="sidebar-role-badge super-admin">
                        <div className="role-dot-inner" />
                        OPERATION ADMIN
                    </div>
                </div>

                <nav className="sidebar-nav">
                    {NAV_GROUPS.map(group => (
                        <div key={group.label} className="nav-section">
                            <div className="nav-section-title">{group.label}</div>
                            {group.items.map(({ tab, icon: Icon, label }) => {
                                const isActive = activeTab === tab;
                                return (
                                    <div
                                        key={tab}
                                        className={`nav-item${isActive ? ' nav-item-active' : ''}`}
                                        onClick={() => {
                                            if (activeTab === tab) return;
                                            setViewingTask(null); setEditingTask(null); setDetailTask(null);
                                            setOverrideTask(null); setReviewTask(null); setReviewingRequest(null);
                                            setActiveTab(tab);
                                        }}
                                    >
                                        <Icon size={18} />
                                        <span className="nav-item-label">{label}</span>
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </nav>

                <div className="sidebar-footer-profile">
                    <div className="profile-card">
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                            <div className="profile-avatar">
                                {getInitials(employeeName || 'Operation Admin')}
                            </div>
                            <span style={{
                                position: 'absolute', bottom: 1, right: 1,
                                width: 9, height: 9, borderRadius: '50%',
                                background: userPresenceStatus === 'Online' ? 'var(--status-active)' : 'var(--text-secondary)',
                                border: '2px solid var(--sidebar-bg, #1b2559)',
                                display: 'block'
                            }} />
                        </div>
                        <div className="profile-info">
                            <span className="profile-name">{employeeName || 'Op Admin'}</span>
                            <span className="profile-role">OPERATION ADMIN</span>
                        </div>
                        <button className="profile-logout" onClick={handleLogout} title="Logout" aria-label="Logout">
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </aside>

            {/* -- Main -- */}
            <main className="main-viewport">
                <DashboardHeader
                    title={pageTitles[activeTab]}
                    notificationApi="/api/notification/my-notifications"
                    userInitials={getInitials(employeeName || 'Operation Admin')}
                    onSettingsClick={() => setActiveTab('profile')}
                    onLogout={handleLogout}
                >
                </DashboardHeader>

                {activeTab === 'dashboard' && (
                    <DashboardTab
                        dashboardData={dashboardData}
                        dashboardEmployees={dashboardEmployees}
                        dashboardDepartments={dashboardDepartments}
                        dashboardLoading={dashboardLoading}
                        dashboardError={dashboardError}
                        filters={dashboardFilters}
                        onFilterChange={setDashboardFilters}
                        onClearFilters={handleDashboardClearFilters}
                        onNewTask={() => setShowNew(true)}
                    />
                )}
                {activeTab === 'tasks' && (
                    <div className="dashboard-content">
                        <TaskManager
                            tasks={tmTasks}
                            teamMembers={teamMembers.map(m => ({ accountId: m.accountId, employeeName: m.employeeName }))}
                            onNewTask={() => setShowNew(true)}
                            onEdit={id => setEditingTask(tasks.find(t => t.taskId === id) ?? null)}
                            onView={id => setDetailTask(tasks.find(t => t.taskId === id) ?? null)}
                            onArchive={ids => { ids.forEach(id => handleDeleteTask(id)); }}
                            onRestore={ids => { ids.forEach(id => handleRestoreTask(id)); }}
                            onDelete={ids => { ids.forEach(id => handleDeleteTask(id)); }}
                            onMarkDone={ids => { ids.forEach(id => handleStatusTransition(id, 'Completed')); }}
                        />
                    </div>
                )}
                {activeTab === 'team' && (
                    <TeamTab
                        tasks={tasks}
                        teamMembers={teamMembers}
                        onView={id => setViewingTask(tasks.find(t => t.taskId === id) ?? null)}
                    />
                )}
                {activeTab === 'templates' && <TemplateTab teamMembers={teamMembers} />}
                {activeTab === 'approvals' && <ApprovalsWrapper />}
                {activeTab === 'reports' && <ReportsTab teamMembers={teamMembers} />}
                {activeTab === 'profile' && <ProfileTab />}
                {activeTab === 'leave' && (
                    <LeaveTab
                        records={leaveRecords}
                        loading={leaveLoading}
                        onNewRecord={record => setLeaveRecords(prev => [record, ...prev])}
                    />
                )}
                {activeTab === 'reopen' && (
                    <ReopenTab
                        requests={reopenRequests}
                        onReview={req => setReviewingRequest(req)}
                    />
                )}
                {activeTab === 'activity_logs' && (
                    <div className="dashboard-content">
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

            {/* -- Modals -- */}
            {showNew && (
                <TaskModal
                    key="new-task"
                    mode="new"
                    teamMembers={teamMembers}
                    tasks={tasks}
                    onSave={data => handleNewTask(data as CreateTaskDTO)}
                    onClose={() => { setShowNew(false); setDuplicateWarnings([]); setPendingTaskData(null); }}
                    showSuccess={success}
                />
            )}
            {editingTask && (
                <TaskModal
                    key={`edit-${editingTask.taskId}`}
                    mode="edit"
                    initial={editingTask}
                    teamMembers={teamMembers}
                    tasks={tasks}
                    onSave={data => handleEditTask(editingTask.taskId, data as UpdateTaskDTO)}
                    onClose={() => setEditingTask(null)}
                    onDelete={() => handleDeleteTask(editingTask.taskId)}
                />
            )}
            {viewingTask && (
                <ViewModal
                    task={viewingTask}
                    onEdit={() => { setEditingTask(viewingTask); setViewingTask(null); }}
                    onReopen={() => handleReopenTask(viewingTask.taskId)}
                    onStatusChange={(id, status) => handleStatusTransition(id, status)}
                    onAdminOverride={(id) => setOverrideTask(tasks.find(t => t.taskId === id) ?? null)}
                    onClose={() => setViewingTask(null)}
                    onViewMore={() => { setDetailTask(viewingTask); setViewingTask(null); }}
                    onReview={() => { setReviewTask(viewingTask); setViewingTask(null); }}
                />
            )}
            {detailTask && (
                <TaskView
                    task={detailTask}
                    onEdit={() => { setEditingTask(detailTask); setDetailTask(null); }}
                    onReopen={() => handleReopenTask(detailTask.taskId)}
                    onClose={() => setDetailTask(null)}
                    onApprove={(id) => handleReviewTask(id, 'Approve & Close', 'Approved via TaskView.')}
                    onReject={(id, reason) => handleReviewTask(id, 'Return for Rework', reason)}
                />
            )}
            {overrideTask && (
                <AdminOverrideModal
                    task={overrideTask}
                    onSubmit={(reason, remarks, requestedStatus) => handleAdminOverride(overrideTask.taskId, reason, remarks, requestedStatus)}
                    onClose={() => setOverrideTask(null)}
                />
            )}
            {reviewTask && (
                <TaskReviewModal
                    task={reviewTask}
                    onSubmit={(taskId, decision, remarks) => handleReviewTask(taskId, decision, remarks)}
                    onClose={() => setReviewTask(null)}
                />
            )}
            {reviewingRequest && (
                <ReopenApprovalModal
                    request={reviewingRequest}
                    onApprove={handleApproveReopen}
                    onReject={handleRejectReopen}
                    onClose={() => setReviewingRequest(null)}
                />
            )}
            {duplicateWarnings.length > 0 && pendingTaskData && (
                <DuplicateWarningModal
                    duplicates={duplicateWarnings}
                    onContinue={() => {
                        const task = pendingTaskData;
                        setDuplicateWarnings([]);
                        setPendingTaskData(null);
                        handleNewTask({ ...task, IsDuplicateAcknowledged: true });
                    }}
                    onCancel={() => {
                        setDuplicateWarnings([]);
                        setPendingTaskData(null);
                        setShowNew(false);
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
                onConfirm={confirmModal.onConfirm}
                onCancel={() => setConfirmModal(CONFIRM_CLOSED)}
            />
        </div>
    );
}