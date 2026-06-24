import React, { useState, useEffect, useRef } from 'react';
import { Eye, X, Shield, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { HubConnectionBuilder, HubConnection } from '@microsoft/signalr';
import ApprovalTracker, { TrackerData } from '../../components/ApprovalTracker/ApprovalTracker';
import { useToast } from '../../components/Toast/Toast';
import EmptyState from '../../components/ui/EmptyState';

const authHeaders = (): HeadersInit => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('authToken') ?? ''}`,
});

interface PendingApprovalItem {
    approvalRequestId: string;
    requestType: string;
    requesterName: string;
    requesterEmployeeNumber: string;
    currentTierLevel: number;
    status: string;
    createdAt: string;
}

const PendingApprovalsTab: React.FC = () => {
    const { success, error: showError } = useToast();
    const [pending, setPending] = useState<PendingApprovalItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRequest, setSelectedRequest] = useState<TrackerData | null>(null);
    const [decision, setDecision] = useState<'Approved' | 'Rejected' | ''>('');
    const [remarks, setRemarks] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [showDecision, setShowDecision] = useState(false);

    const fetchPending = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/approvalrequests/pending', { headers: authHeaders() });
            if (res.ok) {
                const json = await res.json();
                setPending(json.data ?? json ?? []);
            } else setPending([]);
        } catch { setPending([]); }
        finally { setLoading(false); }
    };

    const connectionRef = useRef<HubConnection | null>(null);

    useEffect(() => {
        fetchPending();

        const accountId = localStorage.getItem('employeeId');
        if (!accountId) return;

        const conn = new HubConnectionBuilder()
            .withUrl('/hubs/workflow')
            .withAutomaticReconnect()
            .build();

        conn.on('TrackerUpdated', () => {
            fetchPending();
        });

        conn.start().then(() => {
            conn.invoke('JoinUserGroup', accountId).catch(() => {});
        }).catch(() => {});

        connectionRef.current = conn;

        return () => {
            conn.stop().catch(() => {});
        };
    }, []);

    const handleOpenDecision = async (id: string) => {
        try {
            const res = await fetch(`/api/approvalrequests/${id}`, { headers: authHeaders() });
            if (res.ok) {
                const json = await res.json();
                setSelectedRequest(json.data ?? json);
                setDecision('');
                setRemarks('');
                setShowDecision(true);
            }
        } catch { showError('Failed to load request details.'); }
    };

    const handleSubmitDecision = async () => {
        if (!decision) { showError('Please select a decision.'); return; }
        if (decision === 'Rejected' && !remarks.trim()) { showError('Remarks are mandatory when rejecting a request.'); return; }
        if (!selectedRequest) return;
        setSubmitting(true);
        try {
            const res = await fetch(`/api/approvalrequests/${selectedRequest.approvalRequestId}/decide`, {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify({ Decision: decision, Remarks: remarks.trim() || undefined }),
            });
            if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || 'Failed to process decision.'); }
            setShowDecision(false);
            setSelectedRequest(null);
            const msg = decision === 'Approved'
                ? (selectedRequest.currentTierLevel >= selectedRequest.totalTierCount
                    ? 'Request fully approved and processed.'
                    : 'Request approved and routed to the next level.')
                : 'Request rejected and workflow terminated.';
            success(msg);
            await fetchPending();
        } catch (err: any) { showError(err.message); }
        finally { setSubmitting(false); }
    };

    return (
        <div className="dashboard-content">
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="card-header-layout" style={{ padding: '14px 20px', margin: 0 }}>
                    <h3>Pending Approvals</h3>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{pending.length} pending</span>
                </div>
                {loading ? (
                    <EmptyState icon={<Loader2 size={20} className="spin" />} title="Loading pending approvals..." />
                ) : pending.length === 0 ? (
                    <EmptyState icon={<Shield size={24} />} title="No pending approvals." description="All requests have been processed." />
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                            <thead>
                                <tr style={{ background: 'var(--bg-main)' }}>
                                    <th style={{ padding: '10px 16px', fontWeight: 700, color: 'var(--text-secondary)', fontSize: 11, letterSpacing: '0.5px', textAlign: 'left' }}>REQUEST TYPE</th>
                                    <th style={{ padding: '10px 16px', fontWeight: 700, color: 'var(--text-secondary)', fontSize: 11, letterSpacing: '0.5px', textAlign: 'left' }}>REQUESTER</th>
                                    <th style={{ padding: '10px 16px', fontWeight: 700, color: 'var(--text-secondary)', fontSize: 11, letterSpacing: '0.5px', textAlign: 'center' }}>TIER</th>
                                    <th style={{ padding: '10px 16px', fontWeight: 700, color: 'var(--text-secondary)', fontSize: 11, letterSpacing: '0.5px', textAlign: 'left' }}>SUBMITTED</th>
                                    <th style={{ padding: '10px 16px', fontWeight: 700, color: 'var(--text-secondary)', fontSize: 11, letterSpacing: '0.5px', textAlign: 'center' }}>ACTION</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pending.map(r => (
                                    <tr key={r.approvalRequestId} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '10px 16px', fontWeight: 600 }}>{r.requestType}</td>
                                        <td style={{ padding: '10px 16px' }}>{r.requesterName}</td>
                                        <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                                            <span className="badge badge-purple">{r.currentTierLevel}</span>
                                        </td>
                                        <td style={{ padding: '10px 16px', color: 'var(--text-secondary)', fontSize: 12 }}>
                                            {new Date(r.createdAt).toLocaleDateString()}
                                        </td>
                                        <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                                            <button className="btn btn-primary btn-sm" onClick={() => handleOpenDecision(r.approvalRequestId)}>
                                                <Eye size={12} /> Review
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {showDecision && selectedRequest && (
                <div className="modal-overlay" onClick={() => setShowDecision(false)}>
                    <div className="modal-card" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-head">
                            <div>
                                <h3>Review {selectedRequest.requestType} Request</h3>
                                <p className="modal-sub">Tier {selectedRequest.currentTierLevel} of {selectedRequest.totalTierCount}</p>
                            </div>
                            <button className="icon-btn" onClick={() => setShowDecision(false)}><X size={16} /></button>
                        </div>
                        <div style={{ margin: '8px 0 16px', padding: '12px', background: 'var(--bg-main)', borderRadius: 8 }}>
                            <ApprovalTracker tracker={selectedRequest} compact />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div className="field">
                                <label>Decision <span style={{ color: 'var(--danger)' }}>*</span></label>
                                <div style={{ display: 'flex', gap: 10 }}>
                                    {(['Approved', 'Rejected'] as const).map(opt => (
                                        <button key={opt}
                                            className={`filter-pill${decision === opt ? ' active' : ''}`}
                                            onClick={() => { setDecision(opt); }}
                                            style={{
                                                flex: 1, justifyContent: 'center', padding: '10px 14px',
                                                background: decision === opt && opt === 'Approved' ? '#05cd99' :
                                                    decision === opt && opt === 'Rejected' ? '#ee5d50' : undefined,
                                                color: decision === opt ? '#fff' : undefined,
                                                borderColor: decision === opt ? 'transparent' : undefined,
                                            }}>
                                            {opt === 'Approved' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                                            {opt === 'Approved' ? 'Approve' : 'Reject'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="field">
                                <label>Remarks {decision === 'Rejected' ? <span style={{ color: 'var(--danger)' }}>* (Required for rejection)</span> : <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>}</label>
                                <textarea className="report-input" rows={3} maxLength={500} value={remarks}
                                    onChange={e => setRemarks(e.target.value)}
                                    placeholder={decision === 'Rejected' ? 'Provide reason for rejection...' : 'Optional remarks...'} />
                                <div style={{ fontSize: 11, marginTop: 3, textAlign: 'right', color: 'var(--text-muted)' }}>{remarks.length}/500</div>
                            </div>
                        </div>
                        <div className="modal-actions" style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 8 }}>
                            <button className="btn" onClick={() => setShowDecision(false)} disabled={submitting}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSubmitDecision} disabled={submitting || !decision}>
                                {submitting ? <><Loader2 size={13} className="spin" /> Processing...</> : <><Shield size={13} /> Submit Decision</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PendingApprovalsTab;
