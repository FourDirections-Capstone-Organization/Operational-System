import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    AlertTriangle, Clock, Users, Activity, Shield,
    RefreshCw, Loader2, Calendar, CheckCircle2, XCircle,
    AlertCircle, UserCheck, RotateCcw,
    Radio
} from 'lucide-react';
import './BiomarkerDashboard.css';
import StatusCard from '../../components/StatusCard/StatusCard';
import DataTable, { DataTableColumn, DataTableTab } from '../../components/ui/DataTable';
import Select from '../../components/ui/Select';
import api from '../../api';
import { useBiomarker, AnalyticsStatusBadge } from '../../components/Analytics';
import {
    ViolationType, Severity, ViolationStatus,
    BiomarkerViolation, ScanStatus
} from '../../services/analyticsService';

type FilterTab = 'all' | 'sla_breach' | 'workload_overload' | 'biomarker_flag';

// ─── Helpers ─────────────────────────────────────────────────────────────

const severityClass = (s: Severity) =>
    ({ Critical: 'sev-critical', High: 'sev-high', Medium: 'sev-medium', Low: 'sev-low' }[s]);

const typeLabel = (t: ViolationType): string =>
    ({ sla_breach: 'SLA Breach', workload_overload: 'Workload Overload', biomarker_flag: 'Biomarker Flag' }[t]);

const typeIcon = (t: ViolationType) => {
    if (t === 'sla_breach') return <Clock size={14} />;
    if (t === 'workload_overload') return <Users size={14} />;
    return <Activity size={14} />;
};

const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const getTimeAgo = (iso: string): string => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
};

function ViolationBadge({ type }: { type: ViolationType }) {
    const cls = type === 'sla_breach' ? 'badge badge-red' :
        type === 'workload_overload' ? 'badge badge-amber' : 'badge badge-purple';
    return (
        <span className={cls} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.72rem' }}>
            {typeIcon(type)}{typeLabel(type)}
        </span>
    );
}

// ─── Main Component ─────────────────────────────────────────────────────

export default function BiomarkerDashboard() {
    // ── Filter state ──
    const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterEmployee, setFilterEmployee] = useState('');
    const [filterDepartment, setFilterDepartment] = useState('');
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');

    // ── Build server-side filters object ──
    const filters = useMemo(() => ({
        type: activeFilter !== 'all' ? activeFilter : undefined,
        employeeNumber: filterEmployee || undefined,
        departmentId: filterDepartment || undefined,
        dateFrom: filterDateFrom || undefined,
        dateTo: filterDateTo || undefined,
        search: searchQuery || undefined,
    }), [activeFilter, filterEmployee, filterDepartment, filterDateFrom, filterDateTo, searchQuery]);

    const {
        violations, scanMeta, nextScan, scanStatus,
        scanning, analyticsStatus, lastRefresh, triggerScan,
        totalCount, totalPages, currentPage, setPage, summary,
    } = useBiomarker(filters);
    const safeScanMeta = scanMeta ?? { batchId: 'N/A', scannedAt: '', duration: '—', totalViolations: 0 };

    // ── Full employee/department lists (unfiltered, for dropdown options) ──
    const [employeeOptions, setEmployeeOptions] = useState<{ value: string; label: string }[]>([]);
    const [departmentOptions, setDepartmentOptions] = useState<{ value: string; label: string }[]>([]);

    useEffect(() => {
        // Fetch all departments
        api.get('/api/Department', { pageSize: 100 }).then((res: any) => {
            const payload = res.data;
            const depts = payload?.data?.items ?? (Array.isArray(payload) ? payload : []);
            setDepartmentOptions(
                depts
                    .filter((d: any) => d.isActive !== false)
                    .map((d: any) => ({ value: d.id ?? d.Id, label: d.name ?? d.Name }))
                    .sort((a: any, b: any) => a.label.localeCompare(b.label))
            );
        }).catch(() => {});
        // Fetch users, filter to non-manager couriers with employee numbers
        api.get('/api/User', { pageNumber: 1, pageSize: 200 }).then((res: any) => {
            const raw: any[] = res.data?.data?.items ?? (Array.isArray(res.data) ? res.data : []);
            setEmployeeOptions(
                raw
                    .filter((u: any) => u.employeeNumber && u.employeeNumber !== '-' && u.isActive !== false && !u.isDeactivated)
                    .map((u: any) => ({
                        value: u.employeeNumber,
                        label: `${u.employeeName ?? `${u.firstName ?? ''} ${u.lastName ?? ''}`} (${u.employeeNumber})`
                    }))
                    .sort((a: any, b: any) => a.label.localeCompare(b.label))
            );
        }).catch(() => {});
    }, []);

    // ── Reset page when filters change ──
    useEffect(() => {
        setPage(1);
    }, [activeFilter, searchQuery, filterEmployee, filterDepartment, filterDateFrom, filterDateTo, setPage]);

    // ── Counts ──
    const newCount = useMemo(() => violations.filter(v => v.status === 'New').length, [violations]);

    // ── Filtered violations ──
    const filteredViolations = violations;

    // ── Handlers ──
    const handleManualScan = useCallback(async () => {
        await triggerScan();
    }, [triggerScan]);

    const handleResetFilters = useCallback(() => {
        setSearchQuery('');
        setFilterEmployee('');
        setFilterDepartment('');
        setFilterDateFrom('');
        setFilterDateTo('');
        setActiveFilter('all');
    }, []);

    const hasActiveFilters = !!(searchQuery || filterEmployee || filterDepartment || filterDateFrom || filterDateTo || activeFilter !== 'all');

    // ── Columns ──
    const columns: DataTableColumn<BiomarkerViolation>[] = useMemo(() => [
        {
            header: '',
            accessor: v => <span className={`sev-dot ${severityClass(v.severity)}`} title={v.severity} />,
            width: '24px',
        },
        {
            header: 'Type',
            accessor: v => <ViolationBadge type={v.type} />,
            width: '105px',
        },
        {
            header: 'Description',
            accessor: v => <span className="bd-desc-text">{v.description}</span>,
        },
        {
            header: 'Employee',
            accessor: v => (
                <span className="bd-employee-cell">
                    <span className="bd-employee-name">{v.employeeName}</span>
                    <span className="bd-employee-num">{v.employeeNumber}</span>
                </span>
            ),
            width: '130px',
        },
        {
            header: 'Department',
            accessor: v => <span className="bd-dept-badge">{v.department}</span>,
            width: '80px',
        },
        {
            header: 'Task Ref',
            accessor: v => <code className="bd-ref">{v.taskReference}</code>,
            width: '70px',
        },
        {
            header: 'Detected',
            accessor: v => <span className="bd-time-cell">{getTimeAgo(v.detectedAt)}</span>,
            width: '72px',
        },
        {
            header: 'Status',
            accessor: v => (
                <span className={`bd-status ${v.status.toLowerCase()}`}>
                    {v.status === 'New' && <AlertCircle size={12} />}
                    {v.status === 'Acknowledged' && <UserCheck size={12} />}
                    {v.status === 'Resolved' && <CheckCircle2 size={12} />}
                    {v.status}
                </span>
            ),
            width: '80px',
        },
    ], []);

    // ── Tabs ──
    const tabs: DataTableTab[] = useMemo(() => [
        { key: 'all', label: 'All Violations', badge: summary.slaBreaches + summary.workloadOverloads + summary.biomarkerFlags },
        { key: 'sla_breach', label: 'SLA Breaches', badge: summary.slaBreaches },
        { key: 'workload_overload', label: 'Workload Overloads', badge: summary.workloadOverloads },
        { key: 'biomarker_flag', label: 'Biomarker Flags', badge: summary.biomarkerFlags },
    ], [summary.slaBreaches, summary.workloadOverloads, summary.biomarkerFlags]);

    // ── Filter elements ──
    const filterElements = useMemo(() => (
        <div className="bd-dt-filters">
            <Select
                value={filterEmployee}
                onChange={v => { setFilterEmployee(v); setPage(1); }}
                options={employeeOptions}
                placeholder="All Employees"
            />
            <Select
                value={filterDepartment}
                onChange={v => { setFilterDepartment(v); setPage(1); }}
                options={departmentOptions}
                placeholder="All Departments"
            />
            <div className="bd-date-range">
                <input
                    type="date"
                    value={filterDateFrom}
                    onChange={e => { setFilterDateFrom(e.target.value); setPage(1); }}
                    className="bd-date-input"
                    title="From date"
                />
                <span className="bd-date-sep">–</span>
                <input
                    type="date"
                    value={filterDateTo}
                    onChange={e => { setFilterDateTo(e.target.value); setPage(1); }}
                    className="bd-date-input"
                    title="To date"
                />
            </div>
            {hasActiveFilters && (
                <button className="bd-dt-reset-btn" onClick={handleResetFilters}>
                    <RotateCcw size={13} /> Reset
                </button>
            )}
        </div>
    ), [filterEmployee, filterDepartment, filterDateFrom, filterDateTo, employeeOptions, departmentOptions, hasActiveFilters, handleResetFilters]);

    return (
        <div className="biomarker-dashboard">
            {/* ── Scan Status Header ── */}
            <div className="bd-scan-header">
                <div className="bd-scan-header-left">
                    <div className="bd-scan-icon-wrap">
                        <Activity size={28} />
                    </div>
                    <div className="bd-scan-info">
                        <h3>Biomarker Scan Engine <span className="bd-live-badge"><Radio size={10} /> LIVE</span> <AnalyticsStatusBadge status={analyticsStatus} /></h3>
                        <div className="bd-scan-meta">
                            <span className={`bd-scan-status-badge ${scanStatus.toLowerCase()}`}>
                                <span className="bd-status-dot" />
                                {scanStatus === 'Running' ? 'Scanning...' : scanStatus}
                            </span>
                            <span className="bd-scan-divider">|</span>
                            <span className="bd-scan-label">
                                <Calendar size={12} /> {safeScanMeta.batchId}
                            </span>
                            <span className="bd-scan-divider">|</span>
                            <span className="bd-scan-label">
                                <Clock size={12} /> Scanned: {formatTime(safeScanMeta.scannedAt)}
                            </span>
                            <span className="bd-scan-divider">|</span>
                            <span className="bd-scan-label">
                                <Clock size={12} /> Duration: {safeScanMeta.duration}
                            </span>
                            <span className="bd-scan-divider">|</span>
                            <span className="bd-scan-label">
                                Next: {formatTime(nextScan)}
                            </span>
                        </div>
                    </div>
                </div>
                <button
                    className="btn btn--primary"
                    onClick={handleManualScan}
                    disabled={scanning}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 36, padding: '0 16px', borderRadius: 9, fontSize: 13, whiteSpace: 'nowrap' }}
                >
                    {scanning ? (
                        <><Loader2 size={16} className="spin" /> Scanning...</>
                    ) : (
                        <><RefreshCw size={16} /> Run Scan Now</>
                    )}
                </button>
            </div>

            {/* ── Summary Cards ── */}
            <div className="bd-cards-row">
                <StatusCard
                    label="Total Violations"
                    value={summary.slaBreaches + summary.workloadOverloads + summary.biomarkerFlags}
                    icon={<AlertTriangle size={22} />}
                    variant="danger"
                    subtext={`${newCount} new • Latest scan`}
                />
                <StatusCard
                    label="SLA Breaches"
                    value={summary.slaBreaches}
                    icon={<Clock size={22} />}
                    variant="warning"
                    subtext="Tasks past SLA deadline"
                />
                <StatusCard
                    label="Workload Overloads"
                    value={summary.workloadOverloads}
                    icon={<Users size={22} />}
                    variant="warning"
                    subtext="Couriers exceeding threshold"
                />
                <StatusCard
                    label="Biomarker Flags"
                    value={summary.biomarkerFlags}
                    icon={<Activity size={22} />}
                    variant="info"
                    subtext="Flags generated from violations"
                />
            </div>

            {/* ── Violations DataTable ── */}
            <DataTable<BiomarkerViolation>
                title={`Detected Violations (${safeScanMeta.batchId})`}
                columns={columns}
                data={filteredViolations}
                tabs={tabs}
                activeTab={activeFilter}
                onTabChange={key => setActiveFilter(key as FilterTab)}
                searchQuery={searchQuery}
                onSearchChange={val => { setSearchQuery(val); setPage(1); }}
                searchPlaceholder="Search violations…"
                filterElements={filterElements}
                emptyMessage="No violations match your filter."
                emptyIcon={<CheckCircle2 size={24} />}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setPage}
                totalRecords={totalCount}
                pageSize={10}
            />

            {/* ── Biomarker Flags Summary ── */}
            <div className="bd-section">
                <div className="bd-section-header">
                    <h4>Biomarker Flag Summary — {safeScanMeta.batchId}</h4>
                </div>
                <div className="bd-flags-summary" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                    <StatusCard
                        variant="danger"
                        label="Red Flags"
                        value={summary.redFlags}
                        icon={<XCircle size={22} />}
                        subtext="Immediate action required — compound violations"
                    />
                    <StatusCard
                        variant="warning"
                        label="Amber Flags"
                        value={summary.amberFlags}
                        icon={<AlertTriangle size={22} />}
                        subtext="Requires monitoring — recurring or trending patterns"
                    />
                    <StatusCard
                        variant="success"
                        label="Green Flags"
                        value={summary.greenFlags}
                        icon={<CheckCircle2 size={22} />}
                        subtext="Positive resolution — conditions normalized"
                    />
                </div>
            </div>

            {/* ── Compliance Note ── */}
            <div className="bd-compliance-note">
                <Shield size={14} />
                <span>
                    Automated scan runs daily at 12:00 AM. Dashboard reflects the latest completed scan ({safeScanMeta.batchId}).
                    Viewing biomarker alerts does not modify any task or audit log records.
                    Dashboard refreshes automatically every 30 seconds.
                </span>
            </div>
        </div>
    );
}
