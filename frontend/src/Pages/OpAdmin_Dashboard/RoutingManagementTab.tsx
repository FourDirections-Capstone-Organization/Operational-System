import React, { useState, useEffect } from 'react';
import { Shield, Plus, Pencil, Trash2, Loader2, X, Save, RotateCcw, CheckCircle2 } from 'lucide-react';
import { useToast } from '../../components/Toast/Toast';

const authHeaders = (): HeadersInit => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('authToken') ?? ''}`,
});

interface TierData {
    tierLevel: number;
    approverRole: string;
    fallbackApproverRole: string;
    isFinalTier: boolean;
}

interface MatrixData {
    routingMatrixId: string;
    requestType: string;
    isActive: boolean;
    tiers: TierData[];
    createdAt: string;
    updatedAt: string | null;
}

const RoutingManagementTab: React.FC = () => {
    const { success, error: showError } = useToast();
    const [matrices, setMatrices] = useState<MatrixData[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState({ requestType: '', tiers: [{ tierLevel: 1, approverRole: '', fallbackApproverRole: '', isFinalTier: false }] });

    const fetchMatrices = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/approvalrequests/matrices', { headers: authHeaders() });
            if (res.ok) {
                const json = await res.json();
                setMatrices(json.data ?? json ?? []);
            } else setMatrices([]);
        } catch { setMatrices([]); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchMatrices(); }, []);

    const handleToggle = async (id: string) => {
        try {
            const res = await fetch(`/api/approvalrequests/matrices/${id}/toggle`, { method: 'PATCH', headers: authHeaders() });
            if (res.ok) { success('Matrix status toggled.'); await fetchMatrices(); }
            else { const e = await res.json().catch(() => ({})); showError(e.message || 'Failed to toggle.'); }
        } catch { showError('Failed to toggle.'); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this routing matrix? This action cannot be undone.')) return;
        try {
            const res = await fetch(`/api/approvalrequests/matrices/${id}`, { method: 'DELETE', headers: authHeaders() });
            if (res.ok) { success('Matrix deleted.'); await fetchMatrices(); }
            else { const e = await res.json().catch(() => ({})); showError(e.message || 'Failed to delete.'); }
        } catch { showError('Failed to delete.'); }
    };

    const handleSubmit = async () => {
        if (!form.requestType.trim()) { showError('Request type is required.'); return; }
        if (form.tiers.length === 0) { showError('At least one tier is required.'); return; }
        const hasFinal = form.tiers.some(t => t.isFinalTier);
        if (!hasFinal) { showError('One tier must be marked as final.'); return; }
        try {
            const body = { requestType: form.requestType.trim(), tiers: form.tiers };
            const url = editingId
                ? `/api/approvalrequests/matrices/${editingId}`
                : '/api/approvalrequests/matrices';
            const method = editingId ? 'PUT' : 'POST';
            const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(body) });
            if (res.ok) { success(editingId ? 'Matrix updated.' : 'Matrix created.'); setShowForm(false); setEditingId(null); await fetchMatrices(); resetForm(); }
            else { const e = await res.json().catch(() => ({})); showError(e.message || 'Failed to save.'); }
        } catch { showError('Failed to save.'); }
    };

    const handleEdit = (m: MatrixData) => {
        setEditingId(m.routingMatrixId);
        setForm({ requestType: m.requestType, tiers: m.tiers.map(t => ({ ...t })) });
        setShowForm(true);
    };

    const resetForm = () => {
        setForm({ requestType: '', tiers: [{ tierLevel: 1, approverRole: '', fallbackApproverRole: '', isFinalTier: false }] });
    };

    const addTier = () => {
        setForm(p => ({ ...p, tiers: [...p.tiers, { tierLevel: p.tiers.length + 1, approverRole: '', fallbackApproverRole: '', isFinalTier: false }] }));
    };

    const updateTier = (idx: number, field: string, value: any) => {
        setForm(p => {
            const tiers = [...p.tiers];
            tiers[idx] = { ...tiers[idx], [field]: value };
            return { ...p, tiers };
        });
    };

    const removeTier = (idx: number) => {
        setForm(p => ({ ...p, tiers: p.tiers.filter((_, i) => i !== idx).map((t, i) => ({ ...t, tierLevel: i + 1 })) }));
    };

    return (
        <div className="dashboard-content">
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="card-header-layout" style={{ padding: '14px 20px', margin: 0 }}>
                    <h3>Routing Matrices</h3>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-primary btn-sm" onClick={() => { resetForm(); setEditingId(null); setShowForm(true); }}>
                            <Plus size={14} /> New Matrix
                        </button>
                    </div>
                </div>
                {loading ? (
                    <div className="empty-state" style={{ padding: '32px 0' }}><Loader2 size={20} className="spin" /><p>Loading matrices...</p></div>
                ) : matrices.length === 0 ? (
                    <div className="empty-state" style={{ padding: '32px 0' }}>
                        <Shield size={24} /><p>No routing matrices configured.</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                            <thead>
                                <tr style={{ background: 'var(--bg-main)' }}>
                                    <th style={{ padding: '10px 16px', fontWeight: 700, color: 'var(--text-secondary)', fontSize: 11, letterSpacing: '0.5px', textAlign: 'left' }}>REQUEST TYPE</th>
                                    <th style={{ padding: '10px 16px', fontWeight: 700, color: 'var(--text-secondary)', fontSize: 11, letterSpacing: '0.5px', textAlign: 'center' }}>TIERS</th>
                                    <th style={{ padding: '10px 16px', fontWeight: 700, color: 'var(--text-secondary)', fontSize: 11, letterSpacing: '0.5px', textAlign: 'center' }}>STATUS</th>
                                    <th style={{ padding: '10px 16px', fontWeight: 700, color: 'var(--text-secondary)', fontSize: 11, letterSpacing: '0.5px', textAlign: 'center' }}>ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {matrices.map(m => (
                                    <tr key={m.routingMatrixId} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '10px 16px', fontWeight: 600 }}>{m.requestType}</td>
                                        <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                                            <span className="badge badge-blue">{m.tiers.length}</span>
                                            <span style={{ fontSize: 11, marginLeft: 6, color: 'var(--text-secondary)' }}>
                                                {m.tiers.map(t => t.approverRole).join(' → ')}
                                            </span>
                                        </td>
                                        <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                                            <button className={`btn btn-sm ${m.isActive ? '' : ''}`}
                                                onClick={() => handleToggle(m.routingMatrixId)}
                                                style={{ fontSize: 11, padding: '3px 10px', background: m.isActive ? 'rgba(5,205,153,0.12)' : 'rgba(238,93,80,0.08)', color: m.isActive ? '#05cd99' : '#ee5d50', border: `1px solid ${m.isActive ? 'rgba(5,205,153,0.3)' : 'rgba(238,93,80,0.2)'}`, borderRadius: 6 }}>
                                                {m.isActive ? 'Active' : 'Inactive'}
                                            </button>
                                        </td>
                                        <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                                                <button className="btn btn-sm" onClick={() => handleEdit(m)} title="Edit"><Pencil size={12} /></button>
                                                <button className="btn btn-sm" onClick={() => handleDelete(m.routingMatrixId)} title="Delete"
                                                    style={{ color: '#ee5d50' }}><Trash2 size={12} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {showForm && (
                <div className="modal-overlay" onClick={() => setShowForm(false)}>
                    <div className="modal-card" style={{ width: 520 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{editingId ? 'Edit' : 'New'} Routing Matrix</h3>
                            <button className="icon-btn" onClick={() => setShowForm(false)}><X size={16} /></button>
                        </div>
                        <div className="modal-form">
                            <div className="field">
                                <label>Request Type *</label>
                                <input className="report-input" value={form.requestType}
                                    onChange={e => setForm(p => ({ ...p, requestType: e.target.value }))}
                                    placeholder="e.g. Asset, Resignation, e-NTE" disabled={!!editingId} />
                            </div>
                            <div style={{ marginTop: 16 }}>
                                <label>Approval Tiers</label>
                                {form.tiers.map((tier, idx) => (
                                    <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, padding: '10px 12px', background: 'var(--bg-main)', borderRadius: 8 }}>
                                        <span style={{ fontSize: 12, fontWeight: 700, minWidth: 24 }}>T{idx + 1}</span>
                                        <input className="report-input" style={{ flex: 1 }} value={tier.approverRole}
                                            onChange={e => updateTier(idx, 'approverRole', e.target.value)}
                                            placeholder="Approver role (e.g. Supervisor)" />
                                        <input className="report-input" style={{ flex: 1 }} value={tier.fallbackApproverRole}
                                            onChange={e => updateTier(idx, 'fallbackApproverRole', e.target.value)}
                                            placeholder="Fallback role" />
                                        <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
                                            <input type="checkbox" checked={tier.isFinalTier}
                                                onChange={e => updateTier(idx, 'isFinalTier', e.target.checked)} />
                                            Final
                                        </label>
                                        {form.tiers.length > 1 && (
                                            <button className="btn btn-sm" onClick={() => removeTier(idx)} style={{ color: '#ee5d50' }}><X size={12} /></button>
                                        )}
                                    </div>
                                ))}
                                <button className="btn btn-sm" onClick={addTier} style={{ marginTop: 8 }}>
                                    <Plus size={12} /> Add Tier
                                </button>
                            </div>
                            <div className="modal-actions" style={{ marginTop: 20 }}>
                                <button className="btn" onClick={() => setShowForm(false)}>Cancel</button>
                                <button className="btn btn-primary" onClick={handleSubmit}>
                                    <Save size={13} /> {editingId ? 'Update' : 'Create'} Matrix
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RoutingManagementTab;
