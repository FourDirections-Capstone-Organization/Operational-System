import { useState, useEffect, useCallback, useRef } from 'react';
import {
    analyticsService,
    BiomarkerAlertDTO,
    BiomarkerViolation,
    ScanMeta,
    ScanStatus,
    AnalyticsHealthStatus,
    ViolationType,
    Severity,
    ViolationStatus,
} from '../../services/analyticsService';

// ─── Public API ─────────────────────────────────────────────────────

export interface BiomarkerSummary {
    slaBreaches: number;
    workloadOverloads: number;
    biomarkerFlags: number;
    redFlags: number;
    amberFlags: number;
    greenFlags: number;
}

export interface UseBiomarkerReturn {
    violations: BiomarkerViolation[];
    scanMeta: ScanMeta | null;
    nextScan: string;
    scanStatus: ScanStatus;
    scanning: boolean;
    analyticsStatus: AnalyticsHealthStatus;
    lastRefresh: number;
    totalCount: number;
    totalPages: number;
    currentPage: number;
    setPage: (page: number) => void;
    summary: BiomarkerSummary;
    triggerScan: () => Promise<void>;
}

const POLL_INTERVAL_MS = 30000;
const SCAN_POLL_DELAY_MS = 3000;
const EMPLOYEE_NUMBER_RE = /([A-Z])-(\d{3,4})/;

// ─── Severity Mapping ───────────────────────────────────────────────

function mapSeverity(backendSeverity: string): Severity {
    switch (backendSeverity) {
        case 'Critical': return 'Critical';
        case 'Warning': return 'High';
        case 'Info': return 'Low';
        default: return 'Medium';
    }
}

// ─── Type Mapping (MetricName → ViolationType) ──────────────────────

function metricToViolationType(metricName: string): ViolationType {
    const slaMetrics = ['OnTimeRate', 'StuckTasks', 'OverallSlaCompliance'];
    if (slaMetrics.includes(metricName)) return 'sla_breach';

    if (metricName === 'HighWorkload') return 'workload_overload';

    return 'biomarker_flag';
}

// ─── Status Mapping ─────────────────────────────────────────────────

function mapStatus(alert: BiomarkerAlertDTO): ViolationStatus {
    if (alert.metricName === 'InactiveEmployee' && alert.isAcknowledged) return 'Resolved';
    if (alert.isAcknowledged) return 'Acknowledged';
    return 'New';
}

// ─── Employee Info Extraction ───────────────────────────────────────

function extractEmployeeInfo(description: string, employeeName?: string, employeeNumber?: string): { employeeName: string; employeeNumber: string } {
    if (employeeName && employeeNumber) {
        return { employeeName, employeeNumber };
    }

    const empMatch = description.match(/Employee\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+\(?([A-Z]-\d{3,4})\)?/);
    if (empMatch) {
        return { employeeName: empMatch[1].trim(), employeeNumber: empMatch[2].trim() };
    }

    const numOnly = description.match(EMPLOYEE_NUMBER_RE);
    if (numOnly) {
        return { employeeName: `Employee ${numOnly[0]}`, employeeNumber: numOnly[0] };
    }

    return { employeeName: '', employeeNumber: '' };
}

// ─── Data Transformation ────────────────────────────────────────────

function transformAlertsToViolations(alerts: BiomarkerAlertDTO[]): BiomarkerViolation[] {
    return alerts.map((a, idx) => {
        const emp = extractEmployeeInfo(a.description, a.employeeName, a.employeeNumber);

        return {
            id: a.id || `ALERT-${idx + 1}`,
            type: metricToViolationType(a.metricName),
            severity: mapSeverity(a.severity),
            description: a.description,
            employeeName: emp.employeeName,
            employeeNumber: emp.employeeNumber,
            department: a.departmentName || '',
            departmentId: a.departmentId || '',
            taskTitle: a.metricName,
            taskReference: a.metricName === 'HighWorkload'
                ? '—'
                : `${a.metricName}-${a.departmentId?.slice(0, 8) || ''}`,
            detectedAt: a.scanDateTime || a.createdAt,
            status: mapStatus(a),
        };
    });
}

// ─── Hook ────────────────────────────────────────────────────────────

export function useBiomarker(filterType?: string): UseBiomarkerReturn {
    const [violations, setViolations] = useState<BiomarkerViolation[]>([]);
    const [scanMeta, setScanMeta] = useState<ScanMeta | null>(null);
    const [nextScan, setNextScan] = useState('');
    const [scanStatus, setScanStatus] = useState<ScanStatus>('Completed');
    const [analyticsStatus, setAnalyticsStatus] = useState<AnalyticsHealthStatus>('loading');
    const [lastRefresh, setLastRefresh] = useState(Date.now());
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [summary, setSummary] = useState<BiomarkerSummary>({ slaBreaches: 0, workloadOverloads: 0, biomarkerFlags: 0, redFlags: 0, amberFlags: 0, greenFlags: 0 });
    const mountedRef = useRef(true);
    const isScanningRef = useRef(false);

    // ── Data Fetch ──
    const refreshData = useCallback(async () => {
        if (isScanningRef.current) return;

        const healthy = await analyticsService.checkHealth();

        if (!mountedRef.current) return;

        if (healthy) {
            setAnalyticsStatus('online');
            const paged = await analyticsService.fetchLatestAlertsPaged(currentPage, 10, filterType);
            if (paged && mountedRef.current) {
                const transformed = transformAlertsToViolations(paged.paged.items);
                setViolations(transformed);
                setTotalCount(paged.paged.totalCount);
                setTotalPages(paged.paged.totalPages);
                setSummary({
                    slaBreaches: paged.summary.totalSlaBreaches,
                    workloadOverloads: paged.summary.totalWorkloadOverloads,
                    biomarkerFlags: paged.summary.totalBiomarkerFlags,
                    redFlags: paged.summary.totalCriticalFlags,
                    amberFlags: paged.summary.totalHighMediumFlags,
                    greenFlags: paged.summary.totalLowFlags,
                });
                if (transformed.length > 0) {
                    setScanMeta({
                        batchId: `SCAN-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-001`,
                        scannedAt: paged.paged.items[0].scanDateTime || new Date().toISOString(),
                        duration: '~1s',
                        totalViolations: paged.paged.totalCount,
                    });
                }
                const next = new Date();
                next.setDate(next.getDate() + 1);
                next.setHours(0, 0, 0, 0);
                setNextScan(next.toISOString());
            }
        } else {
            setAnalyticsStatus('offline');
            setViolations([]);
            setScanMeta(null);
            setTotalCount(0);
            setTotalPages(0);
        }

        if (mountedRef.current) {
            setLastRefresh(Date.now());
        }
    }, [currentPage, filterType]);

    // ── Initial Load ──
    useEffect(() => {
        mountedRef.current = true;
        refreshData();
        return () => { mountedRef.current = false; };
    }, [refreshData]);

    // ── Polling ──
    useEffect(() => {
        const interval = setInterval(() => {
            refreshData();
        }, POLL_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [refreshData]);

    // ── Page Change ──
    const setPage = useCallback((page: number) => {
        setCurrentPage(page);
    }, []);

    // ── Trigger Scan ──
    const triggerScan = useCallback(async () => {
        if (isScanningRef.current) return;
        isScanningRef.current = true;
        setScanStatus('Running');
        setCurrentPage(1);

        const ok = await analyticsService.triggerScan();

        if (!mountedRef.current) {
            isScanningRef.current = false;
            return;
        }

        if (ok && analyticsStatus === 'online') {
            await new Promise(r => setTimeout(r, SCAN_POLL_DELAY_MS));
            await refreshData();
            setScanStatus('Completed');
        } else if (!ok) {
            if (analyticsStatus === 'offline') {
                setScanStatus('Completed');
            } else {
                setScanStatus('Failed');
            }
        } else {
            setScanStatus('Completed');
        }

        isScanningRef.current = false;
    }, [analyticsStatus, refreshData]);

    return {
        violations,
        scanMeta,
        nextScan,
        scanStatus,
        scanning: scanStatus === 'Running',
        analyticsStatus,
        lastRefresh,
        totalCount,
        totalPages,
        currentPage,
        setPage,
        summary,
        triggerScan,
    };
}

export default useBiomarker;
