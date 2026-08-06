import React, { useState, useEffect, useCallback } from 'react';
import { Lightbulb, Loader2, Send, AlertCircle, User, Clock } from 'lucide-react';
import { useToast } from '../Toast/Toast';
import api from '../../api';
import Pagination from '../ui/Pagination';
import './TaskRecommendations.css';

interface RecommendationDTO {
    recommendationId: string;
    category: string;
    categoryValue: number;
    notes: string;
    recommendedBy: string;
    recommendedByName: string;
    createdAt: string;
}

interface TaskRecommendationsProps {
    taskId: string;
}

const CATEGORY_OPTIONS = [
    'Timeliness',
    'WorkQuality',
    'Communication',
    'Other',
];

const CATEGORY_MAP: Record<string, number> = {
    Timeliness: 0,
    WorkQuality: 1,
    Communication: 2,
    Other: 3,
};

const CATEGORY_LABELS: Record<number, string> = {
    0: 'Timeliness',
    1: 'Work Quality',
    2: 'Communication',
    3: 'Other',
};

// Keep the panel compact — paginate instead of letting the list overflow.
const PAGE_SIZE = 5;

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
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [category, setCategory] = useState(CATEGORY_OPTIONS[0]);
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const userRole = localStorage.getItem('userRole') ?? '';
    const isCoordinator = userRole === 'Coordinator' || userRole === 'Manager';

    const fetchRecommendations = useCallback(async (pageOverride?: number) => {
        const targetPage = pageOverride ?? page;
        setLoading(true);
        setError('');
        try {
            const res = await api.get<any>(`/api/tasks/${taskId}/recommendations`, { pageNumber: targetPage, pageSize: PAGE_SIZE });
            const json = res.data;
            const d = json?.data;
            const list: any[] = json.isSuccess && Array.isArray(d?.items) ? d.items : (json.isSuccess && Array.isArray(d) ? d : []);
            setRecommendations(list.map((r: any) => ({
                recommendationId: r.id ?? r.recommendationId,
                category: CATEGORY_LABELS[r.category as number] ?? String(r.category),
                categoryValue: r.category as number,
                notes: r.notes ?? '',
                recommendedBy: r.coordinatorId ?? r.recommendedBy ?? '',
                recommendedByName: r.coordinatorName ?? r.recommendedByName ?? '',
                createdAt: r.createdAt ?? '',
            })));
            setTotalPages(d?.totalPages || 1);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load recommendations.');
            setRecommendations([]);
            setTotalPages(1);
        } finally {
            setLoading(false);
        }
    }, [taskId, page]);

    useEffect(() => { setPage(1); }, [taskId]);

    useEffect(() => { fetchRecommendations(); }, [fetchRecommendations]);

    const handleSubmit = async () => {
        if (!notes.trim()) { setError('Notes are required.'); return; }
        setError('');
        setSubmitting(true);
        try {
            await api.post(`/api/tasks/${taskId}/recommendations`, {
                category: CATEGORY_MAP[category] ?? 0,
                notes: notes.trim()
            });
            setNotes('');
            setCategory(CATEGORY_OPTIONS[0]);
            setPage(1);
            await fetchRecommendations(1);
            success('Recommendation submitted successfully.');
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Failed to submit recommendation.');
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

            {!loading && !error && recommendations.length > 0 && (
                <div style={{ padding: '4px 14px 6px', borderTop: '1px solid var(--border-color, #e2e8f0)' }}>
                    <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
                </div>
            )}

            {isCoordinator && (
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
            )}
        </div>
    );
};

export default TaskRecommendations;
