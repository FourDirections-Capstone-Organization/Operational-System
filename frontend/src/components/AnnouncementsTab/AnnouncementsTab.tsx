import React, { useEffect, useState } from 'react';
import { Megaphone, Plus, X, Loader2, AlertCircle, CheckCircle2, Clock, Users, Calendar, MessageSquare, ThumbsUp, Send } from 'lucide-react';
import FormModal from '../FormModal/FormModal';
import api from '../../api';

interface CommentDTO {
    id: string;
    userId: string;
    fullName: string;
    content: string;
    createdAt: string;
}

interface AcknowledgmentUserDTO {
    userId: string;
    fullName: string;
    acknowledgedAt: string;
}

interface AnnouncementDTO {
    id: string;
    title: string;
    content: string;
    targetRoles?: string;
    effectiveDate: string;
    expiryDate?: string;
    createdByName: string;
    createdByRole: string;
    createdAt: string;
    isAcknowledged: boolean;
    acknowledgmentCount: number;
    acknowledgments: AcknowledgmentUserDTO[];
    comments: CommentDTO[];
}

interface AnnouncementsTabProps {
    canCreate: boolean;
}

const ROLES = ['Manager', 'Coordinator', 'Dispatcher', 'Encoder', 'Courier', 'Accountant'];

const fmtDate = (d: string) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const fmtDateTime = (d: string) => {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const isExpiringSoon = (d?: string) => {
    if (!d) return false;
    const diff = new Date(d).getTime() - Date.now();
    return diff > 0 && diff < 3 * 24 * 60 * 60 * 1000;
};

const AnnouncementsTab: React.FC<AnnouncementsTabProps> = ({ canCreate }) => {
    const [announcements, setAnnouncements] = useState<AnnouncementDTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [commentText, setCommentText] = useState<Record<string, string>>({});
    const [sendingComment, setSendingComment] = useState<Record<string, boolean>>({});
    const [acknowledging, setAcknowledging] = useState<Record<string, boolean>>({});

    const fetchAnnouncements = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await api.get('/api/Announcement/active');
            const json = res.data;
            if (json?.isSuccess && json?.data) {
                setAnnouncements(json.data);
            } else {
                setAnnouncements([]);
            }
        } catch {
            setAnnouncements([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAnnouncements(); }, []);

    const handleAcknowledge = async (id: string) => {
        setAcknowledging(prev => ({ ...prev, [id]: true }));
        try {
            await api.post(`/api/Announcement/${id}/acknowledge`);
            await fetchAnnouncements();
        } catch { /* ignore */ }
        finally { setAcknowledging(prev => ({ ...prev, [id]: false })); }
    };

    const handleComment = async (id: string) => {
        const text = commentText[id]?.trim();
        if (!text) return;
        setSendingComment(prev => ({ ...prev, [id]: true }));
        try {
            await api.post(`/api/Announcement/${id}/comments`, { content: text });
            setCommentText(prev => ({ ...prev, [id]: '' }));
            await fetchAnnouncements();
        } catch { /* ignore */ }
        finally { setSendingComment(prev => ({ ...prev, [id]: false })); }
    };

    const currentUserId = (() => {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) return '';
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] || payload.sub || '';
        } catch { return ''; }
    })();

    return (
        <div className="dashboard-content">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 18, fontWeight: 700, margin: 0 }}>
                    <Megaphone size={22} /> Announcements
                </h3>
                {canCreate && (
                    <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                        <Plus size={14} /> New Announcement
                    </button>
                )}
            </div>

            {error && (
                <div className="card" style={{ marginBottom: 16, padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--status-failed)' }}>
                        <AlertCircle size={16} /> {error}
                    </div>
                </div>
            )}

            {loading ? (
                <div className="card"><div className="empty-state"><Loader2 size={22} className="spin" /><p>Loading announcements...</p></div></div>
            ) : announcements.length === 0 ? (
                <div className="card"><div className="empty-state"><Megaphone size={24} /><p>No announcements yet.</p></div></div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {announcements.map(a => (
                        <div key={a.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                            <div style={{
                                padding: '20px 24px 16px',
                                borderLeft: '4px solid var(--primary)',
                                background: 'linear-gradient(135deg, rgba(67,24,255,0.03) 0%, transparent 100%)',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <h4 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                                            {a.title}
                                        </h4>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <Users size={12} /> {a.createdByName}
                                            </span>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <Calendar size={12} /> {fmtDate(a.effectiveDate)}
                                            </span>
                                            {a.expiryDate && (
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: isExpiringSoon(a.expiryDate) ? 'var(--status-pending)' : undefined }}>
                                                    <Clock size={12} /> Expires {fmtDate(a.expiryDate)}
                                                </span>
                                            )}
                                            {a.targetRoles ? (
                                                <span className="badge badge-blue" style={{ fontSize: 10 }}>{a.targetRoles}</span>
                                            ) : (
                                                <span className="badge badge-green" style={{ fontSize: 10 }}>All Users</span>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', paddingTop: 2 }}>
                                        {fmtDateTime(a.createdAt)}
                                    </div>
                                </div>

                                <div style={{
                                    marginTop: 14, padding: '14px 16px', background: 'var(--bg-card)',
                                    borderRadius: 8, border: '1px solid var(--border)',
                                    fontSize: 14, lineHeight: 1.65, color: 'var(--text-primary)',
                                    whiteSpace: 'pre-wrap',
                                }}>
                                    {a.content}
                                </div>

                                {/* Acknowledge + Comment actions */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14, flexWrap: 'wrap' }}>
                                    <button
                                        className={`btn btn-sm ${a.isAcknowledged ? 'btn-success' : ''}`}
                                        onClick={() => !a.isAcknowledged && handleAcknowledge(a.id)}
                                        disabled={a.isAcknowledged || acknowledging[a.id]}
                                        style={a.isAcknowledged ? { cursor: 'default' } : {}}
                                    >
                                        {acknowledging[a.id] ? <Loader2 size={12} className="spin" /> : <ThumbsUp size={12} />}
                                        {' '}{a.isAcknowledged ? 'Acknowledged' : 'Acknowledge'}
                                        {a.acknowledgmentCount > 0 && <span className="badge" style={{ marginLeft: 6, fontSize: 10 }}>{a.acknowledgmentCount}</span>}
                                    </button>

                                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                        <MessageSquare size={12} style={{ marginRight: 4 }} />{a.comments.length} comment{a.comments.length !== 1 ? 's' : ''}
                                    </span>
                                </div>

                                {/* Acknowledgments list (publisher can see who) */}
                                {a.acknowledgments.length > 0 && (
                                    <details style={{ marginTop: 10, fontSize: 12 }}>
                                        <summary style={{ cursor: 'pointer', color: 'var(--text-secondary)', fontWeight: 600 }}>
                                            Acknowledged by {a.acknowledgments.length} user{a.acknowledgments.length !== 1 ? 's' : ''}
                                        </summary>
                                        <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            {a.acknowledgments.map(ack => (
                                                <div key={ack.userId} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', background: 'var(--bg-main)', borderRadius: 6 }}>
                                                    <span style={{ fontWeight: 500 }}>{ack.fullName}</span>
                                                    <span style={{ color: 'var(--text-muted)' }}>{fmtDateTime(ack.acknowledgedAt)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </details>
                                )}

                                {/* Comments */}
                                <div style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                                    {a.comments.map(c => (
                                        <div key={c.id} style={{
                                            display: 'flex', gap: 8, padding: '8px 0',
                                            borderBottom: '1px solid var(--border)',
                                            fontSize: 13,
                                        }}>
                                            <div style={{
                                                width: 28, height: 28, borderRadius: '50%',
                                                background: c.userId === currentUserId ? 'var(--status-active)' : 'var(--primary)',
                                                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: 11, fontWeight: 700, flexShrink: 0,
                                            }}>
                                                {c.fullName.charAt(0).toUpperCase()}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 600, fontSize: 12 }}>{c.fullName} <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>{fmtDateTime(c.createdAt)}</span></div>
                                                <div style={{ marginTop: 2, lineHeight: 1.5 }}>{c.content}</div>
                                            </div>
                                        </div>
                                    ))}

                                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                                        <input
                                            type="text"
                                            placeholder="Write a comment..."
                                            value={commentText[a.id] || ''}
                                            onChange={e => setCommentText(prev => ({ ...prev, [a.id]: e.target.value }))}
                                            onKeyDown={e => { if (e.key === 'Enter') handleComment(a.id); }}
                                            style={{
                                                flex: 1, padding: '8px 12px', borderRadius: 8,
                                                border: '1px solid var(--border)', fontSize: 13,
                                                outline: 'none', fontFamily: 'inherit',
                                            }}
                                            disabled={sendingComment[a.id]}
                                        />
                                        <button
                                            className="btn btn-primary btn-sm"
                                            onClick={() => handleComment(a.id)}
                                            disabled={!commentText[a.id]?.trim() || sendingComment[a.id]}
                                        >
                                            {sendingComment[a.id] ? <Loader2 size={12} className="spin" /> : <Send size={12} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showCreate && (
                <CreateAnnouncementModal
                    onClose={() => setShowCreate(false)}
                    onCreated={() => { setShowCreate(false); fetchAnnouncements(); }}
                />
            )}
        </div>
    );
};

// ─── Create Modal ─────────────────────────────────────────

interface CreateAnnouncementModalProps {
    onClose: () => void;
    onCreated: () => void;
}

const CreateAnnouncementModal: React.FC<CreateAnnouncementModalProps> = ({ onClose, onCreated }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [targetRoles, setTargetRoles] = useState('');
    const [effectiveDate, setEffectiveDate] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState('');

    const handleSubmit = async () => {
        if (!title.trim()) { setFormError('Title is required.'); return; }
        if (!content.trim()) { setFormError('Content is required.'); return; }
        if (!effectiveDate) { setFormError('Effective date is required.'); return; }
        if (expiryDate && new Date(expiryDate) < new Date(effectiveDate)) {
            setFormError('Expiry date must not precede effective date.');
            return;
        }
        setFormError('');
        setSubmitting(true);
        try {
            await api.post('/api/Announcement', {
                title: title.trim(),
                content: content.trim(),
                targetRoles: targetRoles || null,
                effectiveDate: new Date(effectiveDate).toISOString(),
                expiryDate: expiryDate ? new Date(expiryDate).toISOString() : null,
            });
            onCreated();
        } catch (err: any) {
            setFormError(err.response?.data?.message || err.message || 'Failed to create announcement.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <FormModal isOpen onClose={onClose} title="New Announcement" subtitle="Create a new announcement for your team." size="md"
            footer={
                <div style={{ display: 'flex', gap: 8, width: '100%', justifyContent: 'flex-end' }}>
                    <button className="btn" onClick={onClose} disabled={submitting}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
                        {submitting ? <><Loader2 size={13} className="spin" /> Publishing...</> : <><Megaphone size={13} /> Publish</>}
                    </button>
                </div>
            }
        >
            {formError && (
                <div className="form-api-error" style={{ marginBottom: 12 }}><AlertCircle size={14} /><span>{formError}</span></div>
            )}
            <div className="field">
                <label>Title <span style={{ color: 'var(--status-failed)' }}>*</span></label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Holiday Schedule Update" maxLength={200} />
            </div>
            <div className="field">
                <label>Content <span style={{ color: 'var(--status-failed)' }}>*</span></label>
                <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Write your announcement here..." rows={5} maxLength={5000} style={{ resize: 'vertical' }} />
            </div>
            <div className="field">
                <label>Target Audience</label>
                <select value={targetRoles} onChange={e => setTargetRoles(e.target.value)}>
                    <option value="">All Users</option>
                    {ROLES.map(r => <option key={r} value={r}>{r}s</option>)}
                </select>
            </div>
            <div className="field-row">
                <div className="field">
                    <label>Effective Date <span style={{ color: 'var(--status-failed)' }}>*</span></label>
                    <input type="datetime-local" value={effectiveDate} onChange={e => setEffectiveDate(e.target.value)} />
                </div>
                <div className="field">
                    <label>Expiry Date <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>(optional)</span></label>
                    <input type="datetime-local" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} min={effectiveDate} />
                </div>
            </div>
        </FormModal>
    );
};

export default AnnouncementsTab;
