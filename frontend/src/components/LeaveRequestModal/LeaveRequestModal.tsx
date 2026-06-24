import React, { useState } from 'react';
import {
    CalendarDays, AlertCircle, Loader2, X, Send, Clock,
    Palmtree, HeartPulse, AlertTriangle, User, Baby, MoreHorizontal,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type LeaveType = 'vacation' | 'sick' | 'emergency' | 'personal' | 'maternity' | 'other';
export type LeaveStatus = 'Pending' | 'Approved' | 'Declined';

export interface LeaveRecord {
    id: string;
    leaveType: LeaveType;
    startDate: string;
    endDate: string;
    reason: string;
    status: LeaveStatus;
    submittedAt: string;
    reviewedBy?: string;
    reviewNote?: string;
}

export interface LeaveRequestModalProps {
    onClose: () => void;
    onSubmit: (record: LeaveRecord) => void;
    authToken?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const LEAVE_TYPES: { key: LeaveType; label: string; icon: React.ReactNode }[] = [
    { key: 'vacation', label: 'Vacation', icon: <Palmtree size={16} /> },
    { key: 'sick', label: 'Sick Leave', icon: <HeartPulse size={16} /> },
    { key: 'emergency', label: 'Emergency', icon: <AlertTriangle size={16} /> },
    { key: 'personal', label: 'Personal', icon: <User size={16} /> },
    { key: 'maternity', label: 'Maternity/Paternity', icon: <Baby size={16} /> },
    { key: 'other', label: 'Other', icon: <MoreHorizontal size={16} /> },
];

// ─── Helper ───────────────────────────────────────────────────────────────────

const calcDays = (start: string, end: string): number =>
    Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1;

// ─── Component ────────────────────────────────────────────────────────────────

const LeaveRequestModal: React.FC<LeaveRequestModalProps> = ({ onClose, onSubmit, authToken }) => {
    const today = new Date().toISOString().split('T')[0];
    const token = authToken ?? localStorage.getItem('authToken') ?? '';

    const [leaveType, setLeaveType] = useState<LeaveType>('vacation');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reason, setReason] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const dayCount = startDate && endDate && endDate >= startDate
        ? calcDays(startDate, endDate)
        : null;

    const handleSubmit = async () => {
        setError('');
        if (!startDate || !endDate) { setError('Please select start and end dates.'); return; }
        if (endDate < startDate) { setError('End date cannot be before start date.'); return; }
        if (!reason.trim()) { setError('Please provide a reason for your leave.'); return; }

        setSubmitting(true);
        try {
            const res = await fetch('/api/leaverequest/create-leave-request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    Start_Date: startDate,
                    End_Date: endDate,
                    Reason: reason.trim(),
                    Leave_Type: leaveType,
                }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error((err as any).message || (err as any).Message || 'Failed to submit leave request.');
            }
            const data = await res.json();
            onSubmit({
                id: String(data.leaveId ?? data.LeaveId ?? Date.now()),
                leaveType,
                startDate,
                endDate,
                reason: reason.trim(),
                status: 'Pending',
                submittedAt: today,
            });
            onClose();
        } catch (err: any) {
            setError(err.message ?? 'Something went wrong.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-card leave-request-modal" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="modal-head">
                    <div className="leave-modal-title-block">
                        <div className="leave-modal-icon"><CalendarDays size={18} /></div>
                        <div>
                            <h3>Request Leave</h3>
                            <p className="modal-sub">Fill in the details below — your manager will review it.</p>
                        </div>
                    </div>
                    <button className="icon-btn" onClick={onClose}><X size={16} /></button>
                </div>

                {/* Error */}
                {error && (
                    <div className="form-api-error" style={{ marginBottom: 14 }}>
                        <AlertCircle size={14} /><span>{error}</span>
                    </div>
                )}

                {/* Leave type chips */}
                <div className="field">
                    <label>Leave type</label>
                    <div className="leave-type-grid">
                        {LEAVE_TYPES.map(lt => (
                            <button
                                key={lt.key}
                                className={`leave-type-chip${leaveType === lt.key ? ' active' : ''}`}
                                onClick={() => setLeaveType(lt.key)}
                            >
                                {lt.icon}<span>{lt.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Dates */}
                <div className="leave-date-row">
                    <div className="field">
                        <label>Start date</label>
                        <input
                            type="date"
                            className="leave-date-input"
                            min={today}
                            value={startDate}
                            onChange={e => {
                                setStartDate(e.target.value);
                                if (endDate && endDate < e.target.value) setEndDate('');
                                setError('');
                            }}
                        />
                    </div>
                    <div className="field">
                        <label>End date</label>
                        <input
                            type="date"
                            className="leave-date-input"
                            min={startDate || today}
                            value={endDate}
                            onChange={e => { setEndDate(e.target.value); setError(''); }}
                        />
                    </div>
                </div>

                {/* Duration pill */}
                {dayCount !== null && (
                    <div className="leave-duration-pill" style={{ marginBottom: 4 }}>
                        <Clock size={13} />
                        {dayCount === 1 ? '1 day' : `${dayCount} days`}
                    </div>
                )}

                {/* Reason */}
                <div className="field">
                    <label>Reason</label>
                    <textarea
                        className="leave-reason-textarea"
                        maxLength={300}
                        rows={3}
                        placeholder="Briefly describe your reason for leave…"
                        value={reason}
                        onChange={e => { setReason(e.target.value); setError(''); }}
                    />
                    <div className="leave-char-count">{reason.length} / 300</div>
                </div>

                {/* Footer */}
                <div className="modal-actions" style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 4 }}>
                    <span className="leave-footer-note">
                        <AlertCircle size={12} /> Requires manager approval
                    </span>
                    <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
                        <button className="btn" onClick={onClose}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
                            {submitting
                                ? <><Loader2 size={13} className="spin" /> Submitting…</>
                                : <><Send size={13} /> Submit Request</>
                            }
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LeaveRequestModal;