import React, { useState, useEffect } from 'react';
import {
    Pencil, X, Package, CheckCircle2,
    XCircle, Clock, AlertTriangle, ThumbsUp, RotateCcw,
} from 'lucide-react';
import TaskComments from '../TaskComments/TaskComments';
import StatusBadge from '../ui/StatusBadge';
import './TaskView.css';

// ─── Types ────────────────────────────────────────────────────────────────────

type Priority = 'Critical' | 'High' | 'Medium' | 'Low';
type TaskStatus = 'Draft' | 'Assigned' | 'Pending' | 'In Progress' | 'Pending Admin Review' | 'Done' | 'Completed' | 'Overdue';
type ReviewState = 'none' | 'pending_review' | 'approved' | 'rejected';

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
    task, onEdit, onReopen, onClose, onApprove, onReject,
}) => {
    const [activeTab, setActiveTab] = useState<'details' | 'comments'>('details');
    const [reopening, setReopening] = useState(false);
    const [reviewState, setReviewState] = useState<ReviewState>(
        task.taskStatus === 'Completed' ? 'approved' :
            task.taskStatus === 'Pending Admin Review' ? 'pending_review' : 'none'
    );
    const [reviewHistory, setReviewHistory] = useState<ReviewHistoryEntry[]>([]);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [localStatus, setLocalStatus] = useState<TaskStatus>(task.taskStatus);

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
        setLocalStatus('Done');
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
                            <h2 className="tv-title">{task.taskTitle}</h2>
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
                                <span className="tv-meta-label">Due Date</span>
                                <span className={`tv-meta-value${od ? ' tv-overdue' : ''}`}>
                                    {task.dueAt ? fmtDate(task.dueAt) : '—'}
                                </span>
                            </div>
                        </div>

                        {/* Assigned to */}
                        <div className="tv-section">
                            <span className="tv-section-label">Assigned To</span>
                            <div className="tv-assignee">
                                <div className="tv-avatar tv-avatar-blue">
                                    {(task.assignedEmployee || '?').charAt(0).toUpperCase()}
                                </div>
                                <span className="tv-assignee-name">
                                    {task.assignedEmployee || 'Unassigned'}
                                </span>
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