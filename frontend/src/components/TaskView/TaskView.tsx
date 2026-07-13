import React, { useState, useEffect, useCallback } from 'react';
import {
    Pencil, X, Package, CheckCircle2,
    XCircle, Clock, AlertTriangle, ThumbsUp, RotateCcw, Lock,
    FileText, Download, Trash2, Paperclip,
} from 'lucide-react';
import TaskComments from '../TaskComments/TaskComments';
import TaskRecommendations from '../TaskRecommendations/TaskRecommendations';
import StatusBadge from '../ui/StatusBadge';
import './TaskView.css';

// ─── Types ────────────────────────────────────────────────────────────────────

type Priority = 'Critical' | 'High' | 'Medium' | 'Low';
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
    ({ Critical: 'tv-prio-dot high', High: 'tv-prio-dot high', Medium: 'tv-prio-dot medium', Low: 'tv-prio-dot low' }[p]);

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
    task, onEdit, onReopen, onClose, onApprove, onReject, onDeleteAttachment,
}) => {
    const [reopening, setReopening] = useState(false);
    const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
    const [attachmentsLoading, setAttachmentsLoading] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    const token = localStorage.getItem('authToken');

    const fetchAttachments = useCallback(async () => {
        if (!task.taskId) return;
        setAttachmentsLoading(true);
        try {
            const res = await fetch(`/api/tasks/${task.taskId}/attachments`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const json = await res.json();
                const raw = json?.data ?? json;
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

    const handleDownload = (attachmentId: string, fileName: string) => {
        const a = document.createElement('a');
        a.href = `/api/attachments/${attachmentId}/download`;
        if (token) a.href += `?token=${encodeURIComponent(token)}`;
        a.download = fileName;
        a.click();
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
    const [activeTab, setActiveTab] = useState<'details' | 'comments' | 'recommendations'>('details');

    const currentUser = localStorage.getItem('employeeName') ?? 'Admin';

    const od = isEffectivelyOverdue({ ...task, taskStatus: localStatus });
    const effectiveStatus = od ? 'Overdue' : localStatus;

    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    // ── Review actions ──
    const handleRequestReview = () => {
        setReviewState('pending_review');
        setLocalStatus('Done/Pending Review');
        setReviewHistory(prev => [...prev, {
            action: 'submitted', by: task.assignedEmployee,
            at: new Date().toISOString(),
        }]);
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
        if (reviewState === 'pending_review') return (
            <div className="tv-review-banner tv-review-pending">
                <div className="tv-review-banner-left">
                    <Clock size={16} />
                    <div>
                        <span className="tv-review-banner-title">Awaiting completion review</span>
                        <span className="tv-review-banner-sub">
                            {task.assignedEmployee} submitted this task for review. Review and approve or reject.
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

        if (reviewState === 'approved') return (
            <div className="tv-review-banner tv-review-approved">
                <div className="tv-review-banner-left">
                    <ThumbsUp size={16} />
                    <div>
                        <span className="tv-review-banner-title">Completion approved</span>
                        <span className="tv-review-banner-sub">This task has been marked as complete.</span>
                    </div>
                </div>
                <button className="tv-btn tv-btn-ghost-sm" onClick={handleReopen} disabled={reopening}
                    style={reopening ? { opacity: 0.5, cursor: 'not-allowed' } : {}}>
                    <RotateCcw size={12} /> {reopening ? 'Reopen Requested' : 'Reopen'}
                </button>
            </div>
        );

        if (reviewState === 'rejected') return (
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
                    <Clock size={12} /> Re-submit
                </button>
            </div>
        );

        // none — show simulate button (demo only; in real app employee triggers this)
        return (
            <div className="tv-review-banner tv-review-none">
                <div className="tv-review-banner-left">
                    <Clock size={15} />
                    <div>
                        <span className="tv-review-banner-title">Task in progress</span>
                        <span className="tv-review-banner-sub">
                            Waiting for {task.assignedEmployee} to submit for review.
                        </span>
                    </div>
                </div>
                <button className="tv-btn tv-btn-ghost-sm" onClick={handleRequestReview}
                    title="Simulate employee submitting for review">
                    Simulate submit ↗
                </button>
            </div>
        );
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

                    {/* ── Right: Comments ── */}
                    <div className={`tv-comments${activeTab === 'comments' ? ' tv-mobile-visible' : ''}`}>
                        <TaskComments taskId={task.taskId} currentEmployeeId={task.assignedTo} />
                    </div>

                    {/* ── Right: Recommendations ── */}
                    <div className={`tv-comments${activeTab === 'recommendations' ? ' tv-mobile-visible' : ''}`}>
                        <TaskRecommendations taskId={task.taskId} />
                    </div>
                </div>
            </div>

            {showRejectModal && (
                <RejectModal
                    onConfirm={handleReject}
                    onCancel={() => setShowRejectModal(false)}
                />
            )}
        </>
    );
};

export default TaskView;