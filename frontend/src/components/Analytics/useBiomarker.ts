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
    MOCK_VIOLATIONS,
    MOCK_SCAN,
    MOCK_NEXT_SCAN,
} from '../../services/analyticsService';

// ─── Public API ─────────────────────────────────────────────────────

export interface UseBiomarkerReturn {
    violations: BiomarkerViolation[];
    scanMeta: ScanMeta | null;
    nextScan: string;
    scanStatus: ScanStatus;
    scanning: boolean;
    analyticsStatus: AnalyticsHealthStatus;
    lastRefresh: number;
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

function extractEmployeeInfo(description: string): { employeeName: string; employeeNumber: string } {
    const empMatch = description.match(/Employee\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+\(?([A-Z]-\d{3,4})\)?/);
    if (empMatch) {
        return { employeeName: empMatch[1].trim(), employeeNumber: empMatch[2].trim() };
    }

    const numOnly = description.match(EMPLOYEE_NUMBER_RE);
    if (numOnly) {
        return { employeeName: `Employee ${numOnly[0]}`, employeeNumber: numOnly[0] };
    }

    return { employeeName: 'Unknown', employeeNumber: '—' };
}

// ─── Data Transformation ────────────────────────────────────────────

function transformAlertsToViolations(alerts: BiomarkerAlertDTO[]): BiomarkerViolation[] {
    return alerts.map((a, idx) => {
        const emp = extractEmployeeInfo(a.description);

        return {
            id: a.id || `ALERT-${idx + 1}`,
            type: metricToViolationType(a.metricName),
            severity: mapSeverity(a.severity),
            description: a.description,
            employeeName: emp.employeeName,
            employeeNumber: emp.employeeNumber,
            department: a.departmentName || 'Unknown',
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

export function useBiomarker(): UseBiomarkerReturn {
    const [violations, setViolations] = useState<BiomarkerViolation[]>(MOCK_VIOLATIONS);
    const [scanMeta, setScanMeta] = useState<ScanMeta | null>(MOCK_SCAN);
    const [nextScan, setNextScan] = useState(MOCK_NEXT_SCAN);
    const [scanStatus, setScanStatus] = useState<ScanStatus>('Completed');
    const [analyticsStatus, setAnalyticsStatus] = useState<AnalyticsHealthStatus>('loading');
    const [lastRefresh, setLastRefresh] = useState(Date.now());
    const mountedRef = useRef(true);
    const isScanningRef = useRef(false);

    // ── Data Fetch ──
    const refreshData = useCallback(async () => {
        if (isScanningRef.current) return;

        const healthy = await analyticsService.checkHealth();

        if (!mountedRef.current) return;

        if (healthy) {
            setAnalyticsStatus('online');
            const alerts = await analyticsService.fetchLatestAlerts();
            if (alerts && alerts.length > 0 && mountedRef.current) {
                const transformed = transformAlertsToViolations(alerts);
                setViolations(transformed);
                setScanMeta({
                    batchId: `SCAN-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-001`,
                    scannedAt: alerts[0].scanDateTime || new Date().toISOString(),
                    duration: '~1s',
                    totalViolations: transformed.length,
                });
                const next = new Date();
                next.setDate(next.getDate() + 1);
                next.setHours(0, 0, 0, 0);
                setNextScan(next.toISOString());
            }
        } else {
            setAnalyticsStatus('offline');
        }

        if (mountedRef.current) {
            setLastRefresh(Date.now());
        }
    }, []);

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

    // ── Trigger Scan ──
    const triggerScan = useCallback(async () => {
        if (isScanningRef.current) return;
        isScanningRef.current = true;
        setScanStatus('Running');

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
        triggerScan,
    };
}

export default useBiomarker;
