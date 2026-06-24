import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Send, X, Paperclip, Loader2, AlertCircle, CheckCircle2,
    Pencil, Trash2, FileText, XCircle,
} from 'lucide-react';
import { useToast } from '../Toast/Toast';
import EmptyState from '../ui/EmptyState';
import './TaskComments.css';

interface CommentDTO {
    taskCommentId: string;
    taskId: string;
    employeeId: string;
    accountId?: string;
    authorName: string;
    message: string;
    attachmentUrl?: string;
    createdAt: string;
    updatedAt?: string;
}

interface TaskCommentsProps {
    taskId: string;
    currentEmployeeId: string;
    apiBase?: string;
    taskReferenceNumber?: string;
}

const fmtDateTime = (d: string): string => {
    if (!d) return '';
    const date = new Date(d);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
        ' · ' + date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

const authHeader = (): HeadersInit => ({
    Authorization: `Bearer ${localStorage.getItem('authToken') ?? ''}`,
});

const getCurrentAccountId = (): string => {
    const token = localStorage.getItem('authToken');
    if (!token) return '';
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload[
            'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'
        ] ?? payload.sub ?? payload.nameid ?? '';
    } catch { return ''; }
};

const TaskComments: React.FC<TaskCommentsProps> = ({
    taskId,
    currentEmployeeId: _propId,
    apiBase = '/api/taskComment',
    taskReferenceNumber,
}) => {
    const currentUserId = getCurrentAccountId();
    const currentEmployeeId = currentUserId || _propId;
    const [comments, setComments] = useState<CommentDTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [newMessage, setNewMessage] = useState('');
    const [attachment, setAttachment] = useState<File | null>(null);
    const [sending, setSending] = useState(false);
    const { success } = useToast();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editMessage, setEditMessage] = useState('');
    const [savingEdit, setSavingEdit] = useState(false);
    const endRef = useRef<HTMLDivElement>(null);

    const fetchComments = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${apiBase}/task/${taskId}`, { headers: authHeader() });
            if (res.status === 404) {
                setComments([]);
                return;
            }
            if (!res.ok) throw new Error('Failed to load comments.');
            const json = await res.json();
            setComments(json.data ?? []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load comments.');
            setComments([]);
        } finally {
            setLoading(false);
        }
    }, [taskId, apiBase]);

    useEffect(() => { fetchComments(); }, [fetchComments]);
    useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [comments]);

    const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 20 * 1024 * 1024) { setError('Attachment exceeds maximum size of 20MB.'); return; }
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (!['pdf', 'docx', 'xlsx', 'jpg', 'png', 'jpeg'].includes(ext ?? '')) {
            setError('Allowed file types: PDF, DOCX, XLSX, JPG, PNG.');
            return;
        }
        setAttachment(file);
        setError('');
    };

    const handleSend = async () => {
        if (!newMessage.trim()) { setError('Comment content is required.'); return; }
        setError('');
        setSending(true);
        try {
            const fd = new FormData();
            fd.append('TaskId', taskId);
            fd.append('Message', newMessage.trim());
            if (attachment) fd.append('Attachment', attachment);
            const res = await fetch(apiBase, {
                method: 'POST',
                headers: authHeader(),
                body: fd,
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || 'Failed to add comment.');
            }
            setNewMessage('');
            setAttachment(null);
            success('Comment added successfully.');
            await fetchComments();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    };

    const startEdit = (c: CommentDTO) => {
        setEditingId(c.taskCommentId);
        setEditMessage(c.message);
        setError('');
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditMessage('');
        setError('');
    };

    const saveEdit = async () => {
        if (!editMessage.trim()) { setError('Comment content is required.'); return; }
        setError('');
        setSavingEdit(true);
        try {
            const res = await fetch(`${apiBase}/${editingId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', ...authHeader() },
                body: JSON.stringify({ Message: editMessage.trim() }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || 'Failed to update comment.');
            }
            cancelEdit();
            success('Comment updated successfully.');
            await fetchComments();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSavingEdit(false);
        }
    };

    const deleteComment = async (commentId: string) => {
        if (!window.confirm('Are you sure you want to delete this comment?')) return;
        try {
            const res = await fetch(`${apiBase}/${commentId}`, {
                method: 'DELETE',
                headers: authHeader(),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || 'Failed to delete comment.');
            }
            success('Comment deleted successfully.');
            await fetchComments();
        } catch (err: any) {
            setError(err.message);
        }
    };

    const isOwnComment = (c: CommentDTO) =>
        c.accountId === currentUserId || c.accountId?.toUpperCase() === currentUserId.toUpperCase();

    return (
        <div className="tc-container">
            <div className="tc-header">
                <span className="tc-title">Comments</span>
                <span className="tc-count">{comments.length}</span>
            </div>

            {error && (
                <div className="tc-error"><AlertCircle size={14} /> {error}</div>
            )}

            <div className="tc-thread">
                {loading ? (
                    <div className="tc-loading"><Loader2 size={18} className="tc-spin" /> Loading comments...</div>
                ) : comments.length === 0 ? (
                    <EmptyState icon={<FileText size={22} strokeWidth={1.5} />} title="No comments yet." description="Start the conversation below." />
                ) : comments.map(c => {
                    const isMe = isOwnComment(c);
                    const isEditing = editingId === c.taskCommentId;
                    return (
                        <div key={c.taskCommentId} className={`tc-msg${isMe ? ' tc-msg-mine' : ' tc-msg-theirs'}`}>
                            {!isMe && <div className="tc-avatar">{c.authorName.charAt(0).toUpperCase()}</div>}
                            <div className="tc-body">
                                {!isMe && <span className="tc-author">{c.authorName}</span>}
                                {isEditing ? (
                                    <div className="tc-edit-box">
                                        <textarea
                                            className="tc-edit-textarea"
                                            value={editMessage}
                                            maxLength={1000}
                                            onChange={e => setEditMessage(e.target.value)}
                                            autoFocus
                                        />
                                        <div className="tc-edit-actions">
                                            <span className="tc-char-count">{editMessage.length}/1000</span>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <button className="tc-btn tc-btn-sm" onClick={cancelEdit} disabled={savingEdit}>
                                                    Cancel
                                                </button>
                                                <button className="tc-btn tc-btn-primary tc-btn-sm" onClick={saveEdit} disabled={savingEdit || !editMessage.trim()}>
                                                    {savingEdit ? <><Loader2 size={12} className="tc-spin" /> Saving...</> : 'Save'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className={`tc-bubble${isMe ? ' tc-bubble-mine' : ' tc-bubble-theirs'}`}>
                                            {c.message}
                                        </div>
                                        {c.attachmentUrl && (
                                            <a
                                                href={c.attachmentUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="tc-attachment-link"
                                            >
                                                <Paperclip size={12} /> View Attachment
                                            </a>
                                        )}
                                        <div className="tc-meta">
                                            <span className="tc-time">{fmtDateTime(c.createdAt)}</span>
                                            {c.updatedAt && <span className="tc-edited">(edited)</span>}
                                            {isMe && (
                                                <div className="tc-actions">
                                                    <button className="tc-action-btn" onClick={() => startEdit(c)} title="Edit">
                                                        <Pencil size={12} />
                                                    </button>
                                                    <button className="tc-action-btn tc-action-delete" onClick={() => deleteComment(c.taskCommentId)} title="Delete">
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                            {isMe && !isEditing && (
                                <div className="tc-avatar tc-avatar-self">{c.authorName.charAt(0).toUpperCase()}</div>
                            )}
                        </div>
                    );
                })}
                <div ref={endRef} />
            </div>

            <div className="tc-input-area">
                <div className="tc-input-row">
                    <div className="tc-self-avatar">
                        {localStorage.getItem('employeeName')?.charAt(0)?.toUpperCase() ?? 'U'}
                    </div>
                    <div className="tc-input-box">
                        <textarea
                            className="tc-textarea"
                            placeholder="Write a comment… (Enter to send)"
                            value={newMessage}
                            maxLength={1000}
                            onChange={e => { setNewMessage(e.target.value); setError(''); }}
                            onKeyDown={handleKeyDown}
                            rows={1}
                            disabled={sending}
                        />
                        <div className="tc-input-actions">
                            <label className="tc-attach-btn" title="Attach file (PDF, DOCX, XLSX, JPG, PNG, max 20MB)">
                                <Paperclip size={14} />
                                <input type="file" hidden accept=".pdf,.docx,.xlsx,.jpg,.png,.jpeg" onChange={handleAttachmentChange} />
                            </label>
                            <span className="tc-char-count">{newMessage.length}/1000</span>
                            <button className="tc-send-btn" onClick={handleSend}
                                disabled={!newMessage.trim() || sending} aria-label="Send">
                                {sending ? <Loader2 size={14} className="tc-spin" /> : <Send size={14} />}
                            </button>
                        </div>
                    </div>
                </div>
                {attachment && (
                    <div className="tc-attach-preview">
                        <Paperclip size={12} />
                        <span>{attachment.name}</span>
                        <button className="tc-attach-remove" onClick={() => setAttachment(null)}><X size={14} /></button>
                    </div>
                )}
                <p className="tc-hint">Shift + Enter for new line</p>
            </div>
        </div>
    );
};

export default TaskComments;
