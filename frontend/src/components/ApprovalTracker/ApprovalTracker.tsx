import React from 'react';
import { CheckCircle2, XCircle, Clock, Loader2, ChevronRight, AlertCircle } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import './ApprovalTracker.css';

interface TierDecision {
    tierLevel: number;
    approverName: string;
    decision: string;
    remarks?: string;
    createdAt: string;
}

interface TrackerData {
    approvalRequestId: string;
    requestType: string;
    statusTrackingText: string;
    currentTierLevel: number;
    totalTierCount: number;
    currentTierLabel?: string;
    currentApproverName?: string;
    status: string;
    createdAt: string;
    updatedAt?: string;
    decisions: TierDecision[];
}

interface ApprovalTrackerProps {
    tracker: TrackerData;
    compact?: boolean;
}

const fmtDateTime = (d: string): string => {
    if (!d) return '';
    const date = new Date(d);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
        ' · ' + date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

const TierCircle: React.FC<{ level: number; label: string; status: 'pending' | 'approved' | 'rejected' | 'current'; isLast: boolean }> =
    ({ level, label, status, isLast }) => {
        const icon = status === 'approved' ? <CheckCircle2 size={16} /> :
            status === 'rejected' ? <XCircle size={16} /> :
            status === 'current' ? <Loader2 size={14} className="at-spin" /> :
            <Clock size={14} />;

        return (
            <div className="at-tier-row">
                <div className="at-tier-left">
                    <div className={`at-tier-circle at-${status}`}>{icon}</div>
                    {!isLast && <div className={`at-tier-line at-${status}`} />}
                </div>
                <div className="at-tier-info">
                    <span className="at-tier-label">{label}</span>
                    <span className={`at-tier-status at-${status}`}>
                        {status === 'approved' ? 'Approved' :
                            status === 'rejected' ? 'Rejected' :
                            status === 'current' ? 'Pending' : 'Waiting'}
                    </span>
                </div>
            </div>
        );
    };

const ApprovalTracker: React.FC<ApprovalTrackerProps> = ({ tracker, compact }) => {
    const tiers = [];
    const usedLabels: Record<number, string> = {};

    // Build tier labels from decisions + remaining tiers
    for (const d of tracker.decisions) {
        usedLabels[d.tierLevel] = d.approverName || `Tier ${d.tierLevel}`;
    }

    // Fill in any missing labels from the tracker data
    for (let i = 1; i <= tracker.totalTierCount; i++) {
        if (!usedLabels[i]) {
            usedLabels[i] = i === tracker.currentTierLevel && tracker.currentTierLabel
                ? tracker.currentTierLabel
                : `Tier ${i}`;
        }
    }

    const finalStatus = tracker.status === 'Approved' || tracker.status === 'Completed' ? 'approved' :
        tracker.status === 'Rejected' ? 'rejected' : 'pending';

    return (
        <div className={`at-container${compact ? ' at-compact' : ''}`}>
            <div className="at-header">
                <span className="at-title">{tracker.requestType} Request</span>
                <StatusBadge status={
                    tracker.status === 'Approved' || tracker.status === 'Completed'
                        ? 'Approved'
                        : tracker.status === 'Rejected'
                            ? 'Rejected'
                            : tracker.statusTrackingText || 'In Progress'
                } />
            </div>

            {tracker.status === 'Rejected' && (
                <div className="at-rejected-banner">
                    <AlertCircle size={14} /> This request was rejected and the workflow has been terminated.
                </div>
            )}

            <div className="at-tier-list">
                {Array.from({ length: tracker.totalTierCount }, (_, idx) => {
                    const level = idx + 1;
                    const decision = tracker.decisions.find(d => d.tierLevel === level);
                    const isCurrent = level === tracker.currentTierLevel && tracker.status === 'Pending';
                    const isPast = !!decision;

                    let status: 'pending' | 'approved' | 'rejected' | 'current' = 'pending';
                    if (decision?.decision === 'Approved') status = 'approved';
                    else if (decision?.decision === 'Rejected') status = 'rejected';
                    else if (isCurrent) status = 'current';

                    return (
                        <div key={level} style={{ display: 'flex', flexDirection: 'column' }}>
                            <TierCircle level={level} label={usedLabels[level] || `Tier ${level}`}
                                status={status} isLast={level === tracker.totalTierCount} />
                            {decision && !compact && (
                                <div className={`at-decision-card at-${status}`}>
                                    <div className="at-decision-header">
                                        <span className="at-decision-approver">{decision.approverName}</span>
                                        <span className="at-decision-time">{fmtDateTime(decision.createdAt)}</span>
                                    </div>
                                    {decision.remarks && <div className="at-decision-remarks">"{decision.remarks}"</div>}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {!compact && (
                <div className="at-footer">
                    <span className="at-footer-id">Step {tracker.currentTierLevel || 1} of {tracker.totalTierCount}</span>
                    <span className="at-footer-date">Submitted {fmtDateTime(tracker.createdAt)}</span>
                </div>
            )}
        </div>
    );
};

export { ApprovalTracker, type TrackerData, type TierDecision };
export default ApprovalTracker;
