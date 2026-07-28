import React, { useState, useEffect, useCallback } from 'react';
import {
    Pencil, X, Package, CheckCircle2,
    XCircle, Clock, AlertTriangle, ThumbsUp, RotateCcw, Lock,
    FileText, Download, Trash2, Paperclip, MessageSquare, Lightbulb, Loader2, AlertCircle,
} from 'lucide-react';
import TaskComments from '../TaskComments/TaskComments';
import TaskRecommendations from '../TaskRecommendations/TaskRecommendations';
import StatusBadge from '../ui/StatusBadge';
import api from '../../api';
import axios from 'axios';
import './TaskView.css';

// ─── Types ────────────────────────────────────────────────────────────────────

type Priority = 'Urgent' | 'High' | 'Medium' | 'Low';
type TaskStatus = 'Not Started' | 'In Progress' | 'Done/Pending Review' | 'Completed' | 'On Hold' | 'Cancelled' | 'Overdue';
type ReviewState = 'none' | 'pending_review' | 'approved' | 'rejected';

export interface TaskAttachment {
    id: string;
    fileName: string;
    fileSize: number;
    fileType?: string;
    description?: string;
    uploadedByName?: string;
    createdAt: string;
}

export interface TaskViewTask {
    taskId: string;
    taskTitle: string;
    taskDescription: string;
    priority: Priority;
    dueAt: string | null;
    taskStatus: TaskStatus;
    taskRemarks?: string;
    assignedEmployee: string;
    createdByEmployee: string;
    assignedTo: string;
    createdAt: string;
    isConfidential?: boolean;
    classification?: string;
    isSLALocked?: boolean;
    attachmentCount?: number;
    assignmentScope?: number;
    assignedDepartmentId?: string;
    assignedDepartmentName?: string;
}

export interface Comment {
    id: string;
    author: string;
    role: 'admin' | 'employee';
    text: string;
    timestamp: string;
    type?: 'message' | 'system';
}

interface ReviewHistoryEntry {
    action: 'submitted' | 'approved' | 'rejected' | 'reopened';
    by: string;
    at: string;
    note?: string;
}

interface TaskViewProps {
    task: TaskViewTask;
    onEdit: () => void;
    onReopen: () => void;
    onClose: () => void;
    onApprove?: (taskId: string) => void;
    onReject?: (taskId: string, reason: string) => void;
    onDeleteAttachment?: (attachmentId: string) => void;
    onPushBack?: (taskId: string, comment: string) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const isEffectivelyOverdue = (t: TaskViewTask): boolean =>
    t.taskStatus !== 'Completed' && !!t.dueAt && new Date(t.dueAt) < new Date();

const fmtDate = (d: string): string => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
    });
};

const fmtDateTime = (d: string): string => {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-US', {
        month: 'short', day: 'numeric',
        hour: 'numeric', minute: '2-digit', hour12: true,
    });
};

const PrioBadge: React.FC<{ p: Priority }> = ({ p }) => (
    <StatusBadge status={p} size="sm" />
);

const priorityDotClass = (p: Priority): string =>
    ({ Urgent: 'tv-prio-dot high', High: 'tv-prio-dot high', Medium: 'tv-prio-dot medium', Low: 'tv-prio-dot low' }[p]);

// ─── Reject Modal ─────────────────────────────────────────────────────────────

const RejectModal: React.FC<{
    onConfirm: (reason: string) => void;
    onCancel: () => void;
}> = ({ onConfirm, onCancel }) => {
    const [reason, setReason] = useState('');
    return (
        <div className="tv-modal-overlay" onClick={onCancel}>
            <div className="tv-modal" onClick={e => e.stopPropagation()}>
                <div className="tv-modal-header">
                    <div className="tv-modal-icon tv-modal-icon-danger">
                        <XCircle size={20} />
                    </div>
                    <div>
                        <h4 className="tv-modal-title">Reject Completion</h4>
                        <p className="tv-modal-sub">Provide a reason so the employee can revise.</p>
                    </div>
                </div>
                <textarea
                    className="tv-modal-textarea"
                    placeholder="e.g. Missing attachment, incomplete encoding, wrong format…"
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    rows={3}
                    autoFocus
                />
                <div className="tv-modal-actions">
                    <button className="tv-btn tv-btn-outline" onClick={onCancel}>Cancel</button>
                    <button
                        className="tv-btn tv-btn-danger"
                        onClick={() => reason.trim() && onConfirm(reason.trim())}
                        disabled={!reason.trim()}
                    >
                        <XCircle size={13} /> Reject
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Component ────────────────────────────────────────────────────────────────

const TaskView: React.FC<TaskViewProps> = ({
    task, onEdit, onReopen, onClose, onApprove, onReject, onDeleteAttachment, onPushBack,
}) => {
    const [reopening, setReopening] = useState(false);
    const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
    const [attachmentsLoading, setAttachmentsLoading] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [showPushBack, setShowPushBack] = useState(false);
    const [pushBackComment, setPushBackComment] = useState('');
    const [pushingBack, setPushingBack] = useState(false);
    const [showHold, setShowHold] = useState(false);
    const [holdReason, setHoldReason] = useState('');
    const [holding, setHolding] = useState(false);
    const [showResume, setShowResume] = useState(false);
    const [revisedDeadline, setRevisedDeadline] = useState('');
    const [resuming, setResuming] = useState(false);
    const [showCancel, setShowCancel] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [cancelling, setCancelling] = useState(false);
    const [downloadError, setDownloadError] = useState('');

    const token = localStorage.getItem('authToken');

    const fetchAttachments = useCallback(async () => {
        if (!task.taskId) return;
        setAttachmentsLoading(true);
        try {
            const res = await api.get<any>(`/api/tasks/${task.taskId}/attachments`);
            const json = res.data;
            if (res.status === 200) {
                const raw = json?.data?.items ?? json?.data ?? json;
                setAttachments(Array.isArray(raw) ? raw.map((a: any) => ({
                    id: a.id,
                    fileName: a.fileName,
                    fileSize: a.fileSize,
                    fileType: a.fileType,
                    description: a.description,
                    uploadedByName: a.uploadedByName,
                    createdAt: a.createdAt,
                })) : []);
            }
        } catch {
            // silently fail
        } finally {
            setAttachmentsLoading(false);
        }
    }, [task.taskId, token]);

    useEffect(() => {
        fetchAttachments();
    }, [fetchAttachments]);

    const handleDownload = async (attachmentId: string, fileName: string) => {
        try {
            const res = await axios.get(`/api/attachments/${attachmentId}/download`, {
                responseType: 'blob',
                headers: { Authorization: `Bearer ${token}` },
            });
            const blob = res.data;
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch {
            setDownloadError('Unable to download attachment. The file may no longer be available.');
        }
    };

    const handleDelete = (attachmentId: string) => {
        onDeleteAttachment?.(attachmentId);
        setAttachments(prev => prev.filter(a => a.id !== attachmentId));
        setDeleteConfirmId(null);
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };
    const [reviewState, setReviewState] = useState<ReviewState>(
        task.taskStatus === 'Completed' ? 'approved' :
            task.taskStatus === 'Done/Pending Review' ? 'pending_review' : 'none'
    );
    const [reviewHistory, setReviewHistory] = useState<ReviewHistoryEntry[]>([]);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [localStatus, setLocalStatus] = useState<TaskStatus>(task.taskStatus);
    // Controls: mobile full-screen tab (details | comments | recommendations)
    // AND (on desktop) which panel shows on the right — 'details' has no
    // meaning on the right panel, so it falls back to 'comments' there.
    const [activeTab, setActiveTab] = useState<'details' | 'comments' | 'recommendations'>('details');

    const currentUser = localStorage.getItem('employeeName') ?? 'Admin';
    const userRole = localStorage.getItem('userRole') ?? '';
    const isCoordOrManager = userRole === 'Coordinator' || userRole === 'Manager';
    const isCoordinator = userRole === 'Coordinator';
    const isEmployee = ['Dispatcher', 'Encoder', 'Courier', 'Accountant'].includes(userRole);
    const isAssignedToMe = task.assignedTo === localStorage.getItem('employeeId');

    const od = isEffectivelyOverdue({ ...task, taskStatus: localStatus });
    const effectiveStatus = od ? 'Overdue' : localStatus;

    // What the right-hand panel should render on desktop.
    const rightPanelTab: 'comments' | 'recommendations' =
        activeTab === 'recommendations' ? 'recommendations' : 'comments';

    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    // ── Review actions ──
    const handleRequestReview = async () => {
        try {
            await api.patch(`/api/Task/${task.taskId}/status`, { newStatus: 'DonePendingReview' });
            setReviewState('pending_review');
            setLocalStatus('Done/Pending Review');
            setReviewHistory(prev => [...prev, {
                action: 'submitted', by: currentUser,
                at: new Date().toISOString(),
            }]);
        } catch { /* silently fail */ }
    };

    const handleApprove = () => {
        setReviewState('approved');
        setLocalStatus('Completed');
        setReviewHistory(prev => [...prev, {
            action: 'approved', by: currentUser,
            at: new Date().toISOString(),
        }]);
        onApprove?.(task.taskId);
    };

    const handleReject = (reason: string) => {
        setShowRejectModal(false);
        setReviewState('rejected');
        setLocalStatus('In Progress');
        setReviewHistory(prev => [...prev, {
            action: 'rejected', by: currentUser,
            at: new Date().toISOString(), note: reason,
        }]);
        onReject?.(task.taskId, reason);
    };

    const handleReopen = () => {
        if (reopening) return;
        setReopening(true);
        setReviewHistory(prev => [...prev, {
            action: 'reopened', by: currentUser,
            at: new Date().toISOString(),
        }]);
        onReopen();
    };

    // ── Review banner ──
    const renderReviewBanner = () => {
        const isDonePending = effectiveStatus === 'Done/Pending Review' || effectiveStatus === 'Pending Admin Review';
        const isInProgress = effectiveStatus === 'In Progress' || effectiveStatus === 'Not Started';
        const isCompleted = effectiveStatus === 'Completed';
        const isCancelled = effectiveStatus === 'Cancelled';

        if (isCompleted || isCancelled) return null;

        // Coordinator/Manager view: show approve/reject for tasks pending review
        if (isCoordOrManager && isDonePending) {
            return (
                <div className="tv-review-banner tv-review-pending">
                    <div className="tv-review-banner-left">
                        <Clock size={16} />
                        <div>
                            <span className="tv-review-banner-title">Awaiting completion review</span>
                            <span className="tv-review-banner-sub">
                                {task.assignedEmployee} submitted this task for review.
                            </span>
                        </div>
                    </div>
                    <div className="tv-review-banner-actions">
                        <button className="tv-btn tv-btn-danger-solid" onClick={() => setShowRejectModal(true)}>
                            <XCircle size={13} /> Reject
                        </button>
                        <button className="tv-btn tv-btn-success" onClick={handleApprove}>
                            <CheckCircle2 size={13} /> Approve
                        </button>
                    </div>
                </div>
            );
        }

        // Employee view: show "Submit for Review" when task is In Progress
        if (isEmployee && isInProgress && isAssignedToMe) {
            return (
                <div className="tv-review-banner tv-review-none">
                    <div className="tv-review-banner-left">
                        <Clock size={15} />
                        <div>
                            <span className="tv-review-banner-title">Task in progress</span>
                            <span className="tv-review-banner-sub">
                                Submit this task for review when ready.
                            </span>
                        </div>
                    </div>
                    <button className="tv-btn tv-btn-primary" onClick={handleRequestReview}>
                        <CheckCircle2 size={13} /> Submit for Review
                    </button>
                </div>
            );
        }

        // Rejected state — employee can resubmit
        if (reviewState === 'rejected' && isInProgress && isEmployee) {
            return (
                <div className="tv-review-banner tv-review-rejected">
                    <div className="tv-review-banner-left">
                        <AlertTriangle size={16} />
                        <div>
                            <span className="tv-review-banner-title">Completion rejected</span>
                            <span className="tv-review-banner-sub">
                                The employee needs to revise and resubmit.
                            </span>
                        </div>
                    </div>
                    <button className="tv-btn tv-btn-outline-sm" onClick={handleRequestReview}>
                        <CheckCircle2 size={12} /> Re-submit
                    </button>
                </div>
            );
        }

        return null;
    };

    return (
        <>
            <div className="tv-backdrop" onClick={onClose} />

            <div className="tv-panel" role="dialog" aria-modal="true" aria-label={task.taskTitle}>

                {/* ── Header ── */}
                <div className="tv-header">
                    <div className="tv-header-left">
                        <span className={priorityDotClass(task.priority)} />
                        <div className="tv-header-text">
                            <h2 className="tv-title">
                                {task.taskTitle}
                                {task.classification && (
                                    <span
                                        style={{
                                            marginLeft: 8, display: 'inline-flex', alignItems: 'center', gap: 3,
                                            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                                            verticalAlign: 'middle', letterSpacing: '0.03em',
                                            background: task.classification === 'special' ? 'rgba(67,24,255,0.08)' : 'rgba(5,150,105,0.08)',
                                            color: task.classification === 'special' ? '#4318FF' : '#059669',
                                        }}
                                    >
                                        {task.classification === 'special' ? 'SPECIAL TASK' : 'ROUTINE'}
                                    </span>
                                )}
                                {task.isConfidential && (
                                    <span
                                        title="Confidential — only Coordinators and Manager can view"
                                        style={{ marginLeft: 6, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: 'var(--status-failed, #ee5d50)', background: 'rgba(238, 93, 80, 0.08)', padding: '2px 8px', borderRadius: 4, verticalAlign: 'middle', letterSpacing: '0.04em' }}
                                    >
                                        <Lock size={11} /> CONFIDENTIAL
                                    </span>
                                )}
                            </h2>
                            <p className="tv-subtitle">
                                Created by <strong>{task.createdByEmployee}</strong>
                                {task.createdAt && <> · {fmtDate(task.createdAt)}</>}
                            </p>
                        </div>
                    </div>
                    <div className="tv-header-actions">
                        <button className="tv-btn tv-btn-primary" onClick={onEdit}>
                            <Pencil size={13} /> Edit
                        </button>
                        {(task.taskStatus === 'Done/Pending Review' || task.taskStatus === 'Pending Admin Review') && onPushBack && (
                            <button className="tv-btn tv-btn-outline" onClick={() => setShowPushBack(true)}>
                                <RotateCcw size={13} /> Push Back
                            </button>
                        )}
                        {isCoordinator && effectiveStatus !== 'Completed' && effectiveStatus !== 'Cancelled' && effectiveStatus !== 'On Hold' && (
                            <button className="tv-btn tv-btn-outline" onClick={() => setShowHold(true)}>
                                <Clock size={13} /> Hold
                            </button>
                        )}
                        {isCoordinator && effectiveStatus !== 'Completed' && effectiveStatus !== 'Cancelled' && effectiveStatus !== 'Done/Pending Review' && effectiveStatus !== 'Pending Admin Review' && (
                            <button className="tv-btn tv-btn-outline-danger" onClick={() => setShowCancel(true)}>
                                <XCircle size={13} /> Cancel
                            </button>
                        )}
                        {isCoordOrManager && effectiveStatus === 'On Hold' && (
                            <button className="tv-btn tv-btn-outline" onClick={() => {
                                const d = new Date(); d.setDate(d.getDate() + 1);
                                setRevisedDeadline(d.toISOString().slice(0, 16));
                                setShowResume(true);
                            }}>
                                <RotateCcw size={13} /> Resume
                            </button>
                        )}
                        <button className="tv-icon-btn" onClick={onClose} aria-label="Close">
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* ── Review banner ── */}
                {renderReviewBanner()}

                {/* ── Mobile tabs ── */}
                <div className="tv-tabs">
                    <button className={`tv-tab${activeTab === 'details' ? ' active' : ''}`}
                        onClick={() => setActiveTab('details')}>Details</button>
                    <button className={`tv-tab${activeTab === 'comments' ? ' active' : ''}`}
                        onClick={() => setActiveTab('comments')}>
                        Comments
                    </button>
                    <button className={`tv-tab${activeTab === 'recommendations' ? ' active' : ''}`}
                        onClick={() => setActiveTab('recommendations')}>
                        Recommendations
                    </button>
                </div>

                {/* ── Body ── */}
                <div className="tv-body">

                    {/* ── Left: Details ── */}
                    <div className={`tv-details${activeTab === 'details' ? ' tv-mobile-visible' : ''}`}>

                        {/* Meta chips */}
                        <div className="tv-meta-grid">
                            <div className="tv-meta-chip">
                                <span className="tv-meta-label">Status</span>
                                <StatusBadge status={reviewState === 'pending_review' ? 'Pending Review' : effectiveStatus} size="sm" />
                            </div>
                            <div className="tv-meta-chip">
                                <span className="tv-meta-label">Priority</span>
                                <PrioBadge p={task.priority} />
                            </div>
                            <div className="tv-meta-chip">
                                <span className="tv-meta-label">Classification</span>
                                <span style={{
                                    fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 4,
                                    background: task.classification === 'special' ? 'rgba(67,24,255,0.08)' : 'rgba(5,150,105,0.08)',
                                    color: task.classification === 'special' ? '#4318FF' : '#059669',
                                }}>
                                    {task.classification === 'special' ? 'SPECIAL TASK' : 'ROUTINE'}
                                </span>
                            </div>
                            <div className="tv-meta-chip">
                                <span className="tv-meta-label">Due Date</span>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                    {task.isSLALocked && (
                                        <span title="SLA Locked — deadline enforced by system" style={{ display: 'inline-flex', alignItems: 'center', color: '#7c1d1d', background: '#fef2f2', padding: '1px 5px', borderRadius: 4, fontSize: 10, fontWeight: 700, gap: 2 }}>
                                            <Lock size={10} /> SLA
                                        </span>
                                    )}
                                    <span className={`tv-meta-value${od ? ' tv-overdue' : ''}`}>
                                        {task.dueAt ? fmtDate(task.dueAt) : '—'}
                                    </span>
                                </span>
                            </div>
                            <div className="tv-meta-chip">
                                <span className="tv-meta-label">Scope</span>
                                <span style={{ fontSize: 11, fontWeight: 600 }}>
                                    {task.assignmentScope !== undefined
                                        ? (['Single', 'Team', 'Department'][task.assignmentScope] ?? '—')
                                        : '—'}
                                </span>
                            </div>
                        </div>

                        {/* Assigned to */}
                        <div className="tv-section">
                            <span className="tv-section-label">
                                {task.assignmentScope === 2 ? 'Department' : 'Assigned To'}
                            </span>
                            <div className="tv-assignee">
                                {task.assignmentScope === 2 ? (
                                    <span className="tv-assignee-name">
                                        {task.assignedDepartmentName || '—'}
                                    </span>
                                ) : (
                                    <>
                                        <div className="tv-avatar tv-avatar-blue">
                                            {(task.assignedEmployee || '?').charAt(0).toUpperCase()}
                                        </div>
                                        <span className="tv-assignee-name">
                                            {task.assignedEmployee || 'Unassigned'}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Confidential Toggle */}
                        <div className="tv-section">
                            <span className="tv-section-label">Visibility</span>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '4px 0', fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
                                <input
                                    type="checkbox"
                                    checked={!!task.isConfidential}
                                    onChange={async e => {
                                        const checked = e.target.checked;
                                        try {
                                            const lookupRes = await api.get(`/api/User/employee-number/${encodeURIComponent(task.assignedTo)}`).catch(() => null);
                                            const empNum = localStorage.getItem('employeeId') || task.assignedTo;
                                            const userRes = await api.get(`/api/User/employee-number/${encodeURIComponent(empNum)}`);
                                            const userId = userRes.data?.data?.id || userRes.data?.id;
                                            if (userId) {
                                                await api.put(`/api/User/${userId}`, { isConfidential: checked } as any);
                                            }
                                        } catch { /* fallback */ }
                                        window.location.reload();
                                    }}
                                    style={{ accentColor: 'var(--teal, #00A99D)', width: 16, height: 16, cursor: 'pointer' }}
                                />
                                <Lock size={13} color="var(--text-secondary)" />
                                <span>Confidential — {task.isConfidential ? 'Only Coordinators & Manager can view' : 'Visible to all assigned roles'}</span>
                            </label>
                        </div>

                        {/* Description */}
                        <div className="tv-section">
                            <span className="tv-section-label">Description</span>
                            <div className="tv-text-box">
                                {task.taskDescription
                                    ? task.taskDescription
                                    : <span className="tv-empty-text">No description provided.</span>}
                            </div>
                        </div>

                        {/* Remarks */}
                        {task.taskRemarks && (
                            <div className="tv-section">
                                <span className="tv-section-label">Remarks</span>
                                <div className="tv-text-box tv-text-box-remarks">{task.taskRemarks}</div>
                            </div>
                        )}

                        {/* Attachments */}
                        <div className="tv-section">
                            <span className="tv-section-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Paperclip size={13} /> Attachments
                                {(task.attachmentCount ?? 0) > 0 && (
                                    <span className="tv-attach-count">{task.attachmentCount}</span>
                                )}
                            </span>
                            {attachmentsLoading ? (
                                <div className="tv-text-box" style={{ color: 'var(--sidebar-text)', fontSize: 12 }}>
                                    Loading attachments…
                                </div>
                            ) : attachments.length === 0 ? (
                                <div className="tv-text-box">
                                    <span className="tv-empty-text">No attachments.</span>
                                </div>
                            ) : (
                                <div className="tv-attach-list">
                                    {attachments.map(a => (
                                        <div key={a.id} className="tv-attach-item">
                                            <FileText size={15} className="tv-attach-icon" />
                                            <div className="tv-attach-info">
                                                <span className="tv-attach-name" title={a.fileName}>{a.fileName}</span>
                                                <span className="tv-attach-meta">
                                                    {formatFileSize(a.fileSize)}
                                                    {a.uploadedByName && <> · by {a.uploadedByName}</>}
                                                </span>
                                            </div>
                                            <div className="tv-attach-actions">
                                                <button className="tv-icon-btn tv-attach-btn" title="Download"
                                                    onClick={() => handleDownload(a.id, a.fileName)}>
                                                    <Download size={13} />
                                                </button>
                                                {onDeleteAttachment && (
                                                    deleteConfirmId === a.id ? (
                                                        <div className="tv-attach-confirm">
                                                            <button className="tv-btn tv-btn-danger-xs" onClick={() => handleDelete(a.id)}>
                                                                <XCircle size={11} /> Confirm
                                                            </button>
                                                            <button className="tv-icon-btn tv-attach-btn" onClick={() => setDeleteConfirmId(null)}>
                                                                <X size={12} />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button className="tv-icon-btn tv-attach-btn tv-attach-delete" title="Delete"
                                                            onClick={() => setDeleteConfirmId(a.id)}>
                                                            <Trash2 size={13} />
                                                        </button>
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {downloadError && (
                                <div className="tv-text-box" style={{ color: 'var(--status-failed)', fontSize: 12, marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <AlertCircle size={12} /> {downloadError}
                                </div>
                            )}
                        </div>

                        {/* Review history */}
                        {reviewHistory.length > 0 && (
                            <div className="tv-section">
                                <span className="tv-section-label">Review History</span>
                                <div className="tv-review-history">
                                    {reviewHistory.map((h, i) => (
                                        <div key={i} className={`tv-rh-item tv-rh-${h.action}`}>
                                            <div className={`tv-rh-dot tv-rh-dot-${h.action}`} />
                                            <div className="tv-rh-content">
                                                <span className="tv-rh-label">
                                                    {h.action === 'submitted' && 'Submitted for review'}
                                                    {h.action === 'approved' && 'Completion approved'}
                                                    {h.action === 'rejected' && 'Completion rejected'}
                                                    {h.action === 'reopened' && 'Task reopened'}
                                                </span>
                                                <span className="tv-rh-meta">by {h.by} · {fmtDateTime(h.at)}</span>
                                                {h.note && <span className="tv-rh-note">"{h.note}"</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Timeline */}
                        <div className="tv-timeline">
                            <div className="tv-timeline-item">
                                <span className="tv-timeline-dot" />
                                <span className="tv-timeline-text">
                                    Task created · {task.createdAt ? fmtDateTime(task.createdAt) : '—'}
                                </span>
                            </div>
                            {task.dueAt && (
                                <div className="tv-timeline-item">
                                    <span className={`tv-timeline-dot${od ? ' tv-dot-red' : ' tv-dot-blue'}`} />
                                    <span className="tv-timeline-text">Due · {fmtDateTime(task.dueAt)}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Right: Comments / Recommendations (single panel, toggled) ── */}
                    <div className={`tv-comments${activeTab !== 'details' ? ' tv-mobile-visible' : ''}`}>
                        <div className="tv-comments-toggle">
                            <button
                                type="button"
                                className={rightPanelTab === 'comments' ? 'active' : ''}
                                onClick={() => setActiveTab('comments')}
                            >
                                <MessageSquare size={13} /> Comments
                            </button>
                            <button
                                type="button"
                                className={rightPanelTab === 'recommendations' ? 'active' : ''}
                                onClick={() => setActiveTab('recommendations')}
                            >
                                <Lightbulb size={13} /> Recommendations
                            </button>
                        </div>
                        <div className="tv-comments-panel">
                            {rightPanelTab === 'recommendations'
                                ? <TaskRecommendations taskId={task.taskId} />
                                : <TaskComments taskId={task.taskId} currentEmployeeId={task.assignedTo} taskReferenceNumber={task.taskId} />}
                        </div>
                    </div>
                </div>
            </div>

            {showRejectModal && (
                <RejectModal
                    onConfirm={handleReject}
                    onCancel={() => setShowRejectModal(false)}
                />
            )}

            {showPushBack && (
                <div className="tv-modal-overlay" onClick={() => !pushingBack && setShowPushBack(false)}>
                    <div className="tv-modal" onClick={e => e.stopPropagation()}>
                        <div className="tv-modal-header">
                            <div className="tv-modal-icon tv-modal-icon-danger">
                                <RotateCcw size={20} />
                            </div>
                            <div>
                                <h4 className="tv-modal-title">Push Back Task</h4>
                                <p className="tv-modal-sub">Return this task to In Progress with a mandatory reason.</p>
                            </div>
                        </div>
                        <textarea
                            className="tv-modal-textarea"
                            placeholder="Explain why this task needs to be revised..."
                            value={pushBackComment}
                            onChange={e => setPushBackComment(e.target.value)}
                            rows={3}
                            autoFocus
                        />
                        <div className="tv-modal-actions">
                            <button className="tv-btn tv-btn-outline" onClick={() => { setShowPushBack(false); setPushBackComment(''); }} disabled={pushingBack}>Cancel</button>
                            <button className="tv-btn tv-btn-danger"
                                onClick={async () => {
                                    if (!pushBackComment.trim()) return;
                                    setPushingBack(true);
                                    try { await onPushBack?.(task.taskId, pushBackComment.trim()); } catch {}
                                    setPushingBack(false);
                                    setShowPushBack(false);
                                    setPushBackComment('');
                                }}
                                disabled={!pushBackComment.trim() || pushingBack}>
                                {pushingBack ? <Loader2 size={13} className="spin" /> : <RotateCcw size={13} />} Push Back
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showHold && (
                <div className="tv-modal-overlay" onClick={() => !holding && setShowHold(false)}>
                    <div className="tv-modal" onClick={e => e.stopPropagation()}>
                        <div className="tv-modal-header">
                            <div className="tv-modal-icon tv-modal-icon-warning">
                                <Clock size={20} />
                            </div>
                            <div>
                                <h4 className="tv-modal-title">Place Task On Hold</h4>
                                <p className="tv-modal-sub">The deadline/SLA countdown will pause immediately.</p>
                            </div>
                        </div>
                        <textarea
                            className="tv-modal-textarea"
                            placeholder="Reason for holding this task (required)..."
                            value={holdReason}
                            onChange={e => setHoldReason(e.target.value)}
                            rows={3}
                            autoFocus
                        />
                        <div className="tv-modal-actions">
                            <button className="tv-btn tv-btn-outline" onClick={() => { setShowHold(false); setHoldReason(''); }} disabled={holding}>Cancel</button>
                            <button className="tv-btn tv-btn-warning"
                                onClick={async () => {
                                    if (!holdReason.trim()) return;
                                    setHolding(true);
                                    try {
                                        await api.patch(`/api/Task/${task.taskId}/hold`, { holdReason: holdReason.trim() });
                                        setLocalStatus('On Hold');
                                        setShowHold(false);
                                        setHoldReason('');
                                    } catch (err: any) {
                                        console.error(err);
                                    } finally { setHolding(false); }
                                }}
                                disabled={!holdReason.trim() || holding}>
                                {holding ? <Loader2 size={13} className="spin" /> : <Clock size={13} />} Place On Hold
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showResume && (
                <div className="tv-modal-overlay" onClick={() => !resuming && setShowResume(false)}>
                    <div className="tv-modal" onClick={e => e.stopPropagation()}>
                        <div className="tv-modal-header">
                            <div className="tv-modal-icon tv-modal-icon-success">
                                <RotateCcw size={20} />
                            </div>
                            <div>
                                <h4 className="tv-modal-title">Resume Task</h4>
                                <p className="tv-modal-sub">Set a new revised deadline to restart the countdown.</p>
                            </div>
                        </div>
                        <div style={{ padding: '0 24px 16px' }}>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Revised Deadline *</label>
                            <input
                                type="datetime-local"
                                value={revisedDeadline}
                                onChange={e => setRevisedDeadline(e.target.value)}
                                min={new Date().toISOString().slice(0, 16)}
                                style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, outline: 'none' }}
                            />
                        </div>
                        <div className="tv-modal-actions">
                            <button className="tv-btn tv-btn-outline" onClick={() => setShowResume(false)} disabled={resuming}>Cancel</button>
                            <button className="tv-btn tv-btn-primary"
                                onClick={async () => {
                                    if (!revisedDeadline) return;
                                    setResuming(true);
                                    try {
                                        await api.patch(`/api/Task/${task.taskId}/resume`, { revisedDeadline: new Date(revisedDeadline).toISOString() });
                                        setLocalStatus(task.taskStatus === 'On Hold' ? task.taskStatus : 'In Progress');
                                        setShowResume(false);
                                    } catch (err: any) {
                                        console.error(err);
                                    } finally { setResuming(false); }
                                }}
                                disabled={!revisedDeadline || resuming}>
                                {resuming ? <Loader2 size={13} className="spin" /> : <RotateCcw size={13} />} Resume Task
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showCancel && (
                <div className="tv-modal-overlay" onClick={() => !cancelling && setShowCancel(false)}>
                    <div className="tv-modal" onClick={e => e.stopPropagation()}>
                        <div className="tv-modal-header">
                            <div className="tv-modal-icon tv-modal-icon-danger">
                                <XCircle size={20} />
                            </div>
                            <div>
                                <h4 className="tv-modal-title">Cancel Task</h4>
                                <p className="tv-modal-sub">This action cannot be undone. The task will be marked as Cancelled.</p>
                            </div>
                        </div>
                        <textarea
                            className="tv-modal-textarea"
                            placeholder="Reason for cancellation (required)..."
                            value={cancelReason}
                            onChange={e => setCancelReason(e.target.value)}
                            rows={3}
                            autoFocus
                        />
                        <div className="tv-modal-actions">
                            <button className="tv-btn tv-btn-outline" onClick={() => { setShowCancel(false); setCancelReason(''); }} disabled={cancelling}>Keep Task</button>
                                                    <button className="tv-btn tv-btn-danger"
                                                        onClick={async () => {
                                                            if (!cancelReason.trim()) return;
                                                            setCancelling(true);
                                                            try {
                                                                await api.patch(`/api/Task/${task.taskId}/cancel`, { cancellationReason: cancelReason.trim(), isConfirmed: true });
                                                                setLocalStatus('Cancelled');
                                                                setShowCancel(false);
                                                                setCancelReason('');
                                                            } catch (err: any) {
                                                                const msg = err?.response?.data?.message || err?.response?.data?.Message || 'Failed to cancel task.';
                                                                alert(msg);
                                                            } finally { setCancelling(false); }
                                                        }}
                                                        disabled={!cancelReason.trim() || cancelling}>
                                                        {cancelling ? <Loader2 size={13} className="spin" /> : <XCircle size={13} />} Cancel Task
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default TaskView;