import React, { useState, useEffect, useCallback } from 'react';
import { Lightbulb, Loader2, Send, AlertCircle, User, Clock } from 'lucide-react';
import { useToast } from '../Toast/Toast';
import './TaskRecommendations.css';

interface RecommendationDTO {
    recommendationId: string;
    category: string;
    notes: string;
    recommendedBy: string;
    recommendedByName: string;
    createdAt: string;
}

interface TaskRecommendationsProps {
    taskId: string;
}

const CATEGORY_OPTIONS = [
    'Reassignment',
    'Priority Change',
    'Process Improvement',
    'Training Required',
    'Escalation',
    'Other',
];

const authHeader = (): HeadersInit => ({
    Authorization: `Bearer ${localStorage.getItem('authToken') ?? ''}`,
});

const fmtDateTime = (d: string): string => {
    if (!d) return '';
    const date = new Date(d);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
        ' · ' + date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

const TaskRecommendations: React.FC<TaskRecommendationsProps> = ({ taskId }) => {
    const { success } = useToast();
    const [recommendations, setRecommendations] = useState<RecommendationDTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [category, setCategory] = useState(CATEGORY_OPTIONS[0]);
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const fetchRecommendations = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`/api/tasks/${taskId}/recommendations`, { headers: authHeader() });
            if (res.status === 404) { setRecommendations([]); return; }
            if (!res.ok) throw new Error('Failed to load recommendations.');
            const json = await res.json();
            const list: any[] = json.isSuccess && Array.isArray(json.data) ? json.data : (Array.isArray(json.data?.data) ? json.data.data : []);
            setRecommendations(list.map((r: any) => ({
                recommendationId: r.id ?? r.recommendationId,
                category: r.category ?? '',
                notes: r.notes ?? '',
                recommendedBy: r.coordinatorId ?? r.recommendedBy ?? '',
                recommendedByName: r.coordinatorName ?? r.recommendedByName ?? '',
                createdAt: r.createdAt ?? '',
            })));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load recommendations.');
            setRecommendations([]);
        } finally {
            setLoading(false);
        }
    }, [taskId]);

    useEffect(() => { fetchRecommendations(); }, [fetchRecommendations]);

    const handleSubmit = async () => {
        if (!notes.trim()) { setError('Notes are required.'); return; }
        setError('');
        setSubmitting(true);
        try {
            const res = await fetch(`/api/tasks/${taskId}/recommendations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeader() },
                body: JSON.stringify({ category, notes: notes.trim() }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || 'Failed to submit recommendation.');
            }
            setNotes('');
            success('Recommendation submitted successfully.');
            await fetchRecommendations();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="tr-container">
            <div className="tr-header">
                <Lightbulb size={14} />
                <span className="tr-title">Recommendations</span>
                <span className="tr-count">{recommendations.length}</span>
            </div>

            {error && (
                <div className="tr-error"><AlertCircle size={13} /> {error}</div>
            )}

            {/* History */}
            <div className="tr-list">
                {loading ? (
                    <div className="tr-loading"><Loader2 size={14} className="tr-spin" /> Loading recommendations...</div>
                ) : recommendations.length === 0 ? (
                    <div className="tr-empty">No recommendations yet.</div>
                ) : (
                    recommendations.map(r => (
                        <div key={r.recommendationId} className="tr-item">
                            <div className="tr-item-top">
                                <span className="tr-category">{r.category}</span>
                                <span className="tr-author"><User size={10} /> {r.recommendedByName}</span>
                            </div>
                            <div className="tr-notes">{r.notes}</div>
                            <div className="tr-time"><Clock size={10} /> {fmtDateTime(r.createdAt)}</div>
                        </div>
                    ))
                )}
            </div>

            {/* Add new recommendation */}
            <div className="tr-form">
                <div className="tr-form-row">
                    <select className="tr-select" value={category} onChange={e => setCategory(e.target.value)}>
                        {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div className="tr-form-row">
                    <textarea
                        className="tr-textarea"
                        placeholder="Add notes about this recommendation…"
                        value={notes}
                        maxLength={1000}
                        onChange={e => { setNotes(e.target.value); setError(''); }}
                        rows={2}
                        disabled={submitting}
                    />
                    <span className="tr-char-count">{notes.length}/1000</span>
                </div>
                <button className="tr-submit-btn" onClick={handleSubmit}
                    disabled={!notes.trim() || submitting}>
                    {submitting ? <><Loader2 size={12} className="tr-spin" /> Submitting...</>
                        : <><Send size={12} /> Submit Recommendation</>}
                </button>
            </div>
        </div>
    );
};

export default TaskRecommendations;
