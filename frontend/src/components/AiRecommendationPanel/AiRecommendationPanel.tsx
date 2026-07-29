import React, { useState, useEffect, useCallback } from 'react';
import { Brain, Loader2, AlertCircle, TrendingUp, User, Briefcase, Clock, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { aiService, SuitabilityResponseDTO, SuitabilityExplanationDTO, SlaRiskResponseDTO } from '../../services/aiService';
import './AiRecommendationPanel.css';

interface AiRecommendationPanelProps {
    taskId: string;
}

const ROLE_LABELS: Record<string, string> = {
    '0': 'Manager', '1': 'Coordinator', '2': 'Dispatcher', '3': 'Encoder', '4': 'Courier',
};

const AiRecommendationPanel: React.FC<AiRecommendationPanelProps> = ({ taskId }) => {
    const [suitability, setSuitability] = useState<SuitabilityResponseDTO[]>([]);
    const [slaRisk, setSlaRisk] = useState<SlaRiskResponseDTO | null>(null);
    const [explanations, setExplanations] = useState<Record<string, SuitabilityExplanationDTO[]>>({});
    const [expandedEmp, setExpandedEmp] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [slaLoading, setSlaLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [suitRes] = await Promise.all([
                aiService.getSuitability(taskId),
            ]);
            const json = suitRes.data;
            if (json.isSuccess && Array.isArray(json.data)) {
                setSuitability(json.data);
            } else {
                setSuitability([]);
            }
        } catch {
            setError('AI recommendation temporarily unavailable.');
            setSuitability([]);
        } finally {
            setLoading(false);
        }
    }, [taskId]);

    const fetchSlaRisk = useCallback(async () => {
        setSlaLoading(true);
        try {
            const res = await aiService.getSlaRisk(taskId);
            setSlaRisk(res.data);
        } catch {
            setSlaRisk(null);
        } finally {
            setSlaLoading(false);
        }
    }, [taskId]);

    useEffect(() => { fetchData(); }, [fetchData]);
    useEffect(() => { fetchSlaRisk(); }, [fetchSlaRisk]);

    const handleToggleExplain = async (empId: string) => {
        if (expandedEmp === empId) {
            setExpandedEmp(null);
            return;
        }
        if (!explanations[empId]) {
            try {
                const res = await aiService.getSuitabilityExplanation(taskId, empId);
                const json = res.data;
                if (json.isSuccess && Array.isArray(json.data)) {
                    setExplanations(prev => ({ ...prev, [empId]: json.data }));
                }
            } catch {
                setExplanations(prev => ({ ...prev, [empId]: [] }));
            }
        }
        setExpandedEmp(empId);
    };

    const getRoleLabel = (role: string): string => ROLE_LABELS[role] ?? role;

    return (
        <div className="ai-panel">
            <div className="ai-header">
                <Brain size={14} className="ai-header-icon" />
                <span className="ai-title">AI Insights</span>
                <span className="ai-subtitle">Neo4j + ML</span>
            </div>

            <div className="ai-body">
                {error && (
                    <div className="ai-error"><AlertCircle size={14} /> {error}</div>
                )}

                {/* ── SLA Risk Section ── */}
                {!slaLoading && slaRisk && (
                    <div className="ai-risk-section">
                        <div className="ai-risk-header">
                            <span className="ai-risk-label"><TrendingUp size={12} /> SLA Risk Prediction</span>
                            <span className={`ai-risk-level ai-risk-${slaRisk.riskLevel}`}>{slaRisk.riskLevel}</span>
                        </div>
                        <div className="ai-risk-confidence">
                            Confidence: {(slaRisk.confidenceScore * 100).toFixed(0)}%
                        </div>
                        {slaRisk.keyFactors.length > 0 && (
                            <div className="ai-risk-factors">
                                {slaRisk.keyFactors.map((f, i) => (
                                    <span key={i} className="ai-risk-factor">{f}</span>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ── Suitability Rankings ── */}
                <div className="ai-section-title">
                    <Zap size={14} /> Suitable Employees
                </div>

                {loading ? (
                    <div className="ai-loading"><Loader2 size={14} className="ai-spin" /> Analyzing...</div>
                ) : suitability.length === 0 && !error ? (
                    <div className="ai-empty">No suitability data available.</div>
                ) : (
                    suitability.map((emp, idx) => (
                        <div key={emp.employeeId}>
                            <div className="ai-card">
                                <div className="ai-card-top">
                                    <div className="ai-card-row">
                                        <span className="ai-card-name">{emp.fullName}</span>
                                        <span className="ai-card-number">{emp.employeeNumber}</span>
                                        <span className="ai-card-role">{getRoleLabel(emp.role)}</span>
                                        {idx === 0 && <span className="ai-best-badge"><Zap size={10} /> Best Pick</span>}
                                    </div>
                                    <div className="ai-card-meta">
                                        <span className="ai-meta-item"><Briefcase size={10} /> {emp.workload} active</span>
                                        <button className="ai-explain-btn" onClick={() => handleToggleExplain(emp.employeeId)}>
                                                            {expandedEmp === emp.employeeId ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                                                            {expandedEmp === emp.employeeId ? 'Hide details' : 'Why this score?'}
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="ai-card-score">
                                                    <div className="ai-score-value">{emp.suitabilityScore.toFixed(4)}</div>
                                                    <div className="ai-score-label">score</div>
                                                </div>
                                            </div>

                                            {/* ── Explanation ── */}
                                            {expandedEmp === emp.employeeId && explanations[emp.employeeId] && (
                                                <div className="ai-explain-box">
                                                    {explanations[emp.employeeId]?.length > 0 ? (
                                                        explanations[emp.employeeId].map((exp, i) => (
                                                            <div key={i}>{exp.explanation}</div>
                                                        ))
                                                    ) : (
                                                        <div>
                                                            Score = {emp.suitabilityScore.toFixed(4)} based on workload ({emp.workload} active
                                                            tasks), experience match, and recommendation scores.
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>

            <div className="ai-unavailable">
                <AlertCircle size={12} />
                AI is advisory. Task creation works with or without these suggestions.
            </div>
        </div>
    );
};

export default AiRecommendationPanel;
