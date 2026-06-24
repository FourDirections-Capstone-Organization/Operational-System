import React, { useState, useMemo } from 'react';
import { Plus, Package, ClipboardList, Loader2, CheckCircle2, AlertCircle, Archive, Trash2, BarChart3 } from 'lucide-react';
import DataTable from '../ui/DataTable';
import StatusBadge from '../ui/StatusBadge';
import StatCard from '../StatCard/StatCard';

export interface TMTask {
    id: string;
    name: string;
    referenceNumber?: string;
    project?: string;
    assignee?: { id: string; name: string };
    priority: 'Critical' | 'High' | 'Medium' | 'Low';
    status: 'Backlog' | 'To do' | 'In progress' | 'In review' | 'Done';
    dueDate?: string;
    startDate?: string;
    progress: number;
    isArchived?: boolean;
    isDeleted?: boolean;
}

interface TMProps {
    tasks: TMTask[];
    teamMembers: { accountId: string; employeeName: string }[];
    onNewTask: () => void;
    onEdit: (id: string) => void;
    onView: (id: string) => void;
    onArchive: (ids: string[]) => void;
    onRestore?: (ids: string[]) => void;
    onDelete: (ids: string[]) => void;
    onMarkDone: (ids: string[]) => void;
}

type TabType = 'active' | 'completed' | 'bin';

const PRIORITIES: TMTask['priority'][] = ['Critical', 'High', 'Medium', 'Low'];
const PRIO_COLORS: Record<string, string> = { Critical: '#dc2626', High: '#ea580c', Medium: '#d97706', Low: '#2563eb' };
const PRIO_BG: Record<string, string> = { Critical: '#fef2f2', High: '#fff7ed', Medium: '#fffbeb', Low: '#eff6ff' };
const STATUS_DOT: Record<string, string> = { Backlog: '#94a3b8', 'To do': '#3b82f6', 'In progress': '#16a34a', 'In review': '#d97706', Done: '#94a3b8' };
const ASSIGNEE_COLORS = ['#4318ff', '#059669', '#dc2626', '#d97706', '#0284c7', '#7c3aed', '#db2777', '#0891b2', '#65a30d', '#c026d3'];
const getAc = (n: string) => ASSIGNEE_COLORS[n.length % ASSIGNEE_COLORS.length];
const fmtDate = (d: string) => { try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); } catch { return d; } };
const getProgress = (s: string) => s === 'Done' ? 100 : s === 'In progress' ? 50 : s === 'In review' ? 80 : s === 'To do' ? 10 : 0;

const PriorityBadge = ({ p }: { p: string }) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '1px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: PRIO_BG[p] || '#f1f5f9', color: PRIO_COLORS[p] || '#475569' }}>
        <span style={{ fontSize: 10 }}>{p === 'Critical' ? '⬆' : p === 'High' ? '↗' : p === 'Medium' ? '→' : '↘'}</span> {p}
    </span>
);

const AssigneeAvatar = ({ name }: { name: string }) => (
    <div style={{ width: 24, height: 24, borderRadius: '50%', background: getAc(name), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }} title={name}>
        {(name || '?').charAt(0).toUpperCase()}
    </div>
);

const DueLabel = ({ date }: { date?: string }) => {
    if (!date) return <span style={{ color: '#94a3b8', fontSize: 11 }}>—</span>;
    let diff: number;
    try {
        const n = new Date(); n.setHours(0, 0, 0, 0);
        const d = new Date(date); d.setHours(0, 0, 0, 0);
        diff = Math.round((d.getTime() - n.getTime()) / 86400000);
    } catch { return <span style={{ color: '#94a3b8', fontSize: 11 }}>{date}</span>; }
    if (isNaN(diff)) return <span style={{ color: '#94a3b8', fontSize: 11 }}>{date}</span>;
    if (diff < 0) return <span style={{ color: '#dc2626', fontSize: 11, fontWeight: 700 }}>Overdue</span>;
    if (diff === 0) return <span style={{ color: '#d97706', fontSize: 11, fontWeight: 600 }}>Today</span>;
    if (diff <= 3) return <span style={{ color: '#d97706', fontSize: 11, fontWeight: 600 }}>{diff}d left</span>;
    return <span style={{ color: '#94a3b8', fontSize: 11 }}>{fmtDate(date)}</span>;
};

export default function TaskManager({ tasks, teamMembers, onNewTask, onEdit, onView, onArchive, onRestore, onDelete, onMarkDone }: TMProps) {
    const [tab, setTab] = useState<TabType>('active');
    const [search, setSearch] = useState('');
    const [filterPrio, setFilterPrio] = useState('');
    const [filterAssignee, setFilterAssignee] = useState('');
    const [page, setPage] = useState(1);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const toggleSelect = (id: string) => {
        setSelectedIds(p => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
    };
    const toggleSelectAll = () => {
        if (selectedIds.size === paginated.length) setSelectedIds(new Set());
        else setSelectedIds(new Set(paginated.map(t => t.id)));
    };

    const tabTasks = useMemo(() => {
        if (tab === 'active') return tasks.filter(t => t.status !== 'Done' && !t.isArchived && !t.isDeleted);
        if (tab === 'completed') return tasks.filter(t => t.status === 'Done' && !t.isArchived && !t.isDeleted);
        return tasks.filter(t => t.isArchived || t.isDeleted);
    }, [tasks, tab]);

    const filtered = useMemo(() => {
        let list = [...tabTasks];
        const q = search.toLowerCase().trim();
        if (q) list = list.filter(t => t.name.toLowerCase().includes(q) || (t.assignee?.name || '').toLowerCase().includes(q) || (t.project || '').toLowerCase().includes(q));
        if (filterPrio) list = list.filter(t => t.priority === filterPrio);
        if (filterAssignee) list = list.filter(t => t.assignee?.id === filterAssignee);
        return list;
    }, [tabTasks, search, filterPrio, filterAssignee]);

    const totalPages = Math.ceil(filtered.length / 8);
    const paginated = filtered.slice((page - 1) * 8, page * 8);
    const totalInProgress = tasks.filter(t => t.status === 'In progress' && !t.isArchived && !t.isDeleted).length;
    const totalDone = tasks.filter(t => t.status === 'Done' && !t.isArchived && !t.isDeleted).length;
    const totalOverdue = tasks.filter(t => t.status !== 'Done' && !t.isArchived && !t.isDeleted && t.dueDate).filter(t => { try { return new Date(t.dueDate!) < new Date(); } catch { return false; } }).length;

    const handleTabChange = (key: string) => { setTab(key as TabType); setPage(1); };
    const handlePageChange = (p: number) => { setPage(p); };

    const activeStats = tab === 'active' ? [
        { label: 'Active', value: tabTasks.length, icon: <ClipboardList size={18} />, variant: 'primary' as const, subtext: `${tabTasks.length} task${tabTasks.length !== 1 ? 's' : ''}` },
        { label: 'In Progress', value: totalInProgress, icon: <Loader2 size={18} />, variant: 'warning' as const, subtext: 'Currently active' },
        { label: 'Completed', value: totalDone, icon: <CheckCircle2 size={18} />, variant: 'success' as const, subtext: tasks.length ? `${Math.round(totalDone / tasks.length * 100)}% completion rate` : '' },
        { label: 'Overdue', value: totalOverdue, icon: <AlertCircle size={18} />, variant: totalOverdue > 0 ? 'danger' as const : 'primary' as const, subtext: totalOverdue > 0 ? 'Needs attention' : 'No overdue tasks' },
    ] : tab === 'completed' ? [
        { label: 'Completed', value: tabTasks.length, icon: <CheckCircle2 size={18} />, variant: 'success' as const, subtext: 'Finished tasks' },
        { label: 'On Time', value: tabTasks.filter(t => t.progress >= 100).length, icon: <ClipboardList size={18} />, variant: 'primary' as const, subtext: 'Completed on schedule' },
        { label: 'Rate', value: tasks.length ? `${Math.round(totalDone / tasks.length * 100)}%` : '—', icon: <BarChart3 size={18} />, variant: 'success' as const, subtext: 'Completion rate' },
    ] : [
        { label: 'Archived', value: tabTasks.filter(t => t.isArchived).length, icon: <Archive size={18} />, variant: 'warning' as const, subtext: 'Archived tasks' },
        { label: 'Deleted', value: tabTasks.filter(t => t.isDeleted).length, icon: <Trash2 size={18} />, variant: 'danger' as const, subtext: 'Deleted tasks' },
        { label: 'Total', value: tabTasks.length, icon: <ClipboardList size={18} />, variant: 'primary' as const, subtext: 'In bin' },
    ];

    return (
        <div>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${activeStats.length}, 1fr)`, gap: 12, marginBottom: 16 }}>
                {activeStats.map(s => (
                    <StatCard key={s.label} icon={s.icon} label={s.label} value={s.value} subtext={s.subtext} variant={s.variant} />
                ))}
            </div>
            <DataTable
                tabs={[
                    { key: 'active', label: 'Active', icon: <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6', display: 'inline-block' }} />, badge: tasks.filter(t => t.status !== 'Done' && !t.isArchived && !t.isDeleted).length },
                    { key: 'completed', label: 'Completed', icon: <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />, badge: tasks.filter(t => t.status === 'Done' && !t.isArchived && !t.isDeleted).length },
                    { key: 'bin', label: 'Bin', icon: <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#94a3b8', display: 'inline-block' }} />, badge: tasks.filter(t => t.isArchived || t.isDeleted).length },
                ]}
                activeTab={tab}
                onTabChange={handleTabChange}
                title="Task Manager"
                searchQuery={search}
                onSearchChange={val => { setSearch(val); setPage(1); }}
                searchPlaceholder="Search by task, assignee, project…"
                filterElements={tab !== 'bin' ? <>
                    <select value={filterPrio} onChange={e => { setFilterPrio(e.target.value); setPage(1); }} style={{ height: 36, borderRadius: 8, border: '1px solid var(--border)', padding: '0 10px', fontSize: 13, outline: 'none', background: '#fff', cursor: 'pointer' }}>
                        <option value="">All Priorities</option>
                        {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <select value={filterAssignee} onChange={e => { setFilterAssignee(e.target.value); setPage(1); }} style={{ height: 36, borderRadius: 8, border: '1px solid var(--border)', padding: '0 10px', fontSize: 13, outline: 'none', background: '#fff', cursor: 'pointer' }}>
                        <option value="">All Assignees</option>
                        {teamMembers.map(m => <option key={m.accountId} value={m.accountId}>{m.employeeName}</option>)}
                    </select>
                </> : undefined}
                actionButton={tab === 'active' ? { label: 'New Task', icon: <Plus size={14} />, onClick: onNewTask } : undefined}
                headers={['', '#', 'Task', 'Assignee', 'Priority', 'Due Date', 'Status']}
                loading={false}
                emptyMessage="No tasks found."
                emptyIcon={<Package size={20} />}
                totalRecords={filtered.length}
                currentPage={page}
                totalPages={totalPages}
                onPageChange={handlePageChange}
            >
                {paginated.map(t => {
                    const refDisplay = t.referenceNumber || t.id.slice(0, 8).toUpperCase();
                    const isChecked = selectedIds.has(t.id);
                    return (
                        <tr key={t.id} onClick={() => tab !== 'bin' ? onView(t.id) : null} style={{ cursor: tab !== 'bin' ? 'pointer' : 'default', opacity: tab === 'bin' ? 0.75 : 1 }}>
                            <td onClick={e => e.stopPropagation()} style={{ textAlign: 'center' }}>
                                <input type="checkbox" checked={isChecked} onChange={() => toggleSelect(t.id)} style={{ cursor: 'pointer' }} />
                            </td>
                            <td style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>#{refDisplay}</td>
                            <td style={{ fontWeight: 600, color: tab === 'bin' ? '#94a3b8' : '#0f172a', textDecoration: tab === 'bin' ? 'line-through' : 'none' }}>{t.name}</td>
                            <td>{t.assignee ? <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><AssigneeAvatar name={t.assignee.name} /><span style={{ fontSize: 13 }}>{t.assignee.name}</span></div> : <span style={{ color: '#94a3b8' }}>—</span>}</td>
                            <td><PriorityBadge p={t.priority} /></td>
                            <td><DueLabel date={t.dueDate} /></td>
                            <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <StatusBadge status={t.status} size="sm" />
                                    <div style={{ width: 50, height: 4, background: '#e8ecf4', borderRadius: 2, overflow: 'hidden' }}>
                                        <div style={{ width: `${getProgress(t.status)}%`, height: '100%', background: t.status === 'Done' ? '#059669' : '#4318ff', borderRadius: 2 }} />
                                    </div>
                                </div>
                            </td>
                        </tr>
                    );
                })}
            </DataTable>
            {selectedIds.size > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', background: '#f8fafc', border: '0.5px solid #e2e8f0', borderRadius: 8, marginTop: 12, fontSize: 13 }}>
                    <span style={{ fontWeight: 600, color: '#1e293b' }}>{selectedIds.size} selected</span>
                    {tab !== 'bin' && <button onClick={() => { onMarkDone([...selectedIds]); setSelectedIds(new Set()); }} style={{ padding: '4px 10px', borderRadius: 6, border: '0.5px solid #e2e8f0', background: '#fff', fontSize: 12, cursor: 'pointer' }}>Mark done</button>}
                    {tab !== 'bin' && <button onClick={() => { onArchive([...selectedIds]); setSelectedIds(new Set()); }} style={{ padding: '4px 10px', borderRadius: 6, border: '0.5px solid #e2e8f0', background: '#fff', fontSize: 12, cursor: 'pointer', color: '#d97706' }}>Archive</button>}
                    {tab === 'bin' && onRestore && <button onClick={() => { onRestore([...selectedIds]); setSelectedIds(new Set()); }} style={{ padding: '4px 10px', borderRadius: 6, border: '0.5px solid #e2e8f0', background: '#fff', fontSize: 12, cursor: 'pointer' }}>Restore</button>}
                    <button onClick={() => { onDelete([...selectedIds]); setSelectedIds(new Set()); }} style={{ padding: '4px 10px', borderRadius: 6, border: '0.5px solid #e2e8f0', background: '#fff', fontSize: 12, cursor: 'pointer', color: '#dc2626' }}>Delete</button>
                </div>
            )}
        </div>
    );
}
