import api from '../api';
import axios from 'axios';

// ─── Backend DTO Types (mirrors backend C# DTOs) ───

export interface BiomarkerAlertDTO {
    id: string;
    scanDateTime: string;
    scanDate: string;
    departmentId: string | null;
    departmentName: string;
    employeeName?: string;
    employeeNumber?: string;
    metricName: string;
    currentValue: number;
    thresholdValue: number;
    severity: string;
    description: string;
    isAcknowledged: boolean;
    createdAt: string;
}

export interface DepartmentStreamMetricsDTO {
    departmentId: string;
    departmentName: string;
    completedLastHour: number;
    totalLastHour: number;
    completionRate: number;
    overdueCount: number;
    activeTasks: number;
    lastUpdated: string;
}

export interface OverdueAlertDTO {
    departmentId: string;
    departmentName: string;
    overdueCount: number;
    taskTitles: string[];
    windowStart: string;
}

export interface WorkloadStreamDTO {
    departmentId: string;
    activeTaskCount: number;
    distinctEmployeesAssigned: number;
    avgTasksPerEmployee: number;
    lastUpdated: string;
}

export interface ChartDataDTO {
    labels: string[];
    datasets: ChartDatasetDTO[];
}

export interface ChartDatasetDTO {
    label: string;
    data: number[];
    backgroundColor: string;
    borderColor: string;
}

export interface TrendDataDTO {
    periodLabel: string;
    onTimeCount: number;
    lateCount: number;
    totalCompleted: number;
    onTimeRate: number;
}

export interface BiomarkerSummaryDTO {
    totalViolations: number;
    totalSlaBreaches: number;
    totalWorkloadOverloads: number;
    totalBiomarkerFlags: number;
    totalCriticalFlags: number;
    totalHighMediumFlags: number;
    totalLowFlags: number;
}

export interface BiomarkerFilters {
    type?: string;
    employeeNumber?: string;
    departmentId?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
}

export interface LatestBiomarkerResponse {
    paged: PaginatedResponseDTO<BiomarkerAlertDTO>;
    summary: BiomarkerSummaryDTO;
}

export interface PaginatedResponseDTO<T> {
    items: T[];
    totalCount: number;
    pageNumber: number;
    pageSize: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
}

// ─── Frontend Domain Types ───

export type ViolationType = 'sla_breach' | 'workload_overload' | 'biomarker_flag';
export type Severity = 'Critical' | 'High' | 'Medium' | 'Low';
export type ViolationStatus = 'New' | 'Acknowledged' | 'Resolved';
export type ScanStatus = 'Idle' | 'Running' | 'Completed' | 'Failed';

export interface BiomarkerViolation {
    id: string;
    type: ViolationType;
    severity: Severity;
    description: string;
    employeeName: string;
    employeeNumber: string;
    department: string;
    departmentId: string;
    taskTitle: string;
    taskReference: string;
    detectedAt: string;
    status: ViolationStatus;
}

export interface ScanMeta {
    batchId: string;
    scannedAt: string;
    duration: string;
    totalViolations: number;
}

export type AnalyticsHealthStatus = 'loading' | 'online' | 'offline' | 'error';

// ─── Mock / Fallback Data ───

export const MOCK_SCAN: ScanMeta = {
    batchId: 'SCAN-20260723-001',
    scannedAt: '2026-07-23T00:00:00',
    duration: '2m 14s',
    totalViolations: 10,
};

export const MOCK_NEXT_SCAN = '2026-07-24T00:00:00';

export const MOCK_VIOLATIONS: BiomarkerViolation[] = [
    {
        id: 'V-001', type: 'sla_breach', severity: 'Critical',
        description: 'Task exceeded SLA deadline by 4h 32m',
        employeeName: 'Juan dela Cruz', employeeNumber: 'C-0421',
        department: 'Last Mile', departmentId: 'D-004',
        taskTitle: 'Priority Delivery — Warehouse A to Cluster B',
        taskReference: 'T-88231', detectedAt: '2026-07-23T00:00:12', status: 'New',
    },
    {
        id: 'V-002', type: 'sla_breach', severity: 'High',
        description: 'Task exceeded SLA deadline by 1h 15m',
        employeeName: 'Maria Santos', employeeNumber: 'C-0317',
        department: 'Dispatch', departmentId: 'D-002',
        taskTitle: 'Same-Day Dispatch — Client Package #4402',
        taskReference: 'T-88190', detectedAt: '2026-07-23T00:00:14', status: 'New',
    },
    {
        id: 'V-003', type: 'sla_breach', severity: 'Medium',
        description: 'Task exceeded SLA deadline by 45m',
        employeeName: 'Pedro Reyes', employeeNumber: 'C-0552',
        department: 'Logistics', departmentId: 'D-001',
        taskTitle: 'Route #12 — Document Drop-off',
        taskReference: 'T-88012', detectedAt: '2026-07-23T00:00:16', status: 'Acknowledged',
    },
    {
        id: 'V-004', type: 'workload_overload', severity: 'Critical',
        description: 'Courier has 12 active tasks — exceeds threshold of 8',
        employeeName: 'Jose Rizal', employeeNumber: 'C-0388',
        department: 'Last Mile', departmentId: 'D-004',
        taskTitle: 'Multiple active assignments',
        taskReference: '—', detectedAt: '2026-07-23T00:00:30', status: 'New',
    },
    {
        id: 'V-005', type: 'workload_overload', severity: 'High',
        description: 'Courier has 10 active tasks — exceeds threshold of 8',
        employeeName: 'Ana Gonzales', employeeNumber: 'C-0612',
        department: 'Dispatch', departmentId: 'D-002',
        taskTitle: 'Multiple active assignments',
        taskReference: '—', detectedAt: '2026-07-23T00:00:31', status: 'New',
    },
    {
        id: 'V-006', type: 'workload_overload', severity: 'Low',
        description: 'Courier has 9 active tasks — exceeds threshold of 8',
        employeeName: 'Carlos Mendoza', employeeNumber: 'C-0724',
        department: 'Logistics', departmentId: 'D-001',
        taskTitle: 'Multiple active assignments',
        taskReference: '—', detectedAt: '2026-07-23T00:00:32', status: 'Resolved',
    },
    {
        id: 'V-007', type: 'biomarker_flag', severity: 'Critical',
        description: 'RED FLAG: SLA + workload overload — immediate review required.',
        employeeName: 'Jose Rizal', employeeNumber: 'C-0388',
        department: 'Last Mile', departmentId: 'D-004',
        taskTitle: 'Compound violation',
        taskReference: 'FLAG-C-0388', detectedAt: '2026-07-23T00:01:00', status: 'New',
    },
    {
        id: 'V-008', type: 'biomarker_flag', severity: 'High',
        description: 'AMBER FLAG: Recurring SLA breach pattern — 3rd breach this week',
        employeeName: 'Juan dela Cruz', employeeNumber: 'C-0421',
        department: 'Last Mile', departmentId: 'D-004',
        taskTitle: 'Pattern violation',
        taskReference: 'FLAG-C-0421', detectedAt: '2026-07-23T00:01:05', status: 'New',
    },
    {
        id: 'V-009', type: 'biomarker_flag', severity: 'Medium',
        description: 'AMBER FLAG: Courier workload trending upward — 20% increase over 7 days',
        employeeName: 'Ana Gonzales', employeeNumber: 'C-0612',
        department: 'Dispatch', departmentId: 'D-002',
        taskTitle: 'Trend violation',
        taskReference: 'FLAG-C-0612', detectedAt: '2026-07-23T00:01:10', status: 'Acknowledged',
    },
    {
        id: 'V-010', type: 'biomarker_flag', severity: 'Low',
        description: 'GREEN FLAG: Workload returned to normal after previous overload warning',
        employeeName: 'Carlos Mendoza', employeeNumber: 'C-0724',
        department: 'Logistics', departmentId: 'D-001',
        taskTitle: 'Resolution flag',
        taskReference: 'FLAG-C-0724', detectedAt: '2026-07-23T00:01:15', status: 'Resolved',
    },
];

// ─── Analytics Service ───

const HEALTH_CHECK_TIMEOUT = 5000;

async function healthCheckInternal(): Promise<boolean> {
    try {
        const response = await axios.get<BiomarkerAlertDTO[]>('/api/analytics/biomarker/latest', {
            timeout: HEALTH_CHECK_TIMEOUT,
        });
        return response.status >= 200 && response.status < 500;
    } catch {
        return false;
    }
}

async function fetchLatestAlertsPagedInternal(pageNumber: number, pageSize: number, filters?: BiomarkerFilters): Promise<LatestBiomarkerResponse | null> {
    try {
        const params: Record<string, any> = { pageNumber, pageSize };
        if (filters) {
            if (filters.type) params.type = filters.type;
            if (filters.employeeNumber) params.employeeNumber = filters.employeeNumber;
            if (filters.departmentId) params.departmentId = filters.departmentId;
            if (filters.dateFrom) params.dateFrom = filters.dateFrom;
            if (filters.dateTo) params.dateTo = filters.dateTo;
            if (filters.search) params.search = filters.search;
        }
        console.log('[AnalyticsService] Request params:', JSON.stringify(params));
        const res = await api.get<LatestBiomarkerResponse>('/api/analytics/biomarker/latest', params);
        console.log('[AnalyticsService] Response totalCount:', res.data?.paged?.totalCount, '| items:', res.data?.paged?.items?.length);
        return res.data;
    } catch (err) {
        console.warn('[AnalyticsService] fetchLatestAlertsPaged failed:', err);
        return null;
    }
}

async function fetchHistoryPagedInternal(from: string | undefined, to: string | undefined, pageNumber: number, pageSize: number): Promise<PaginatedResponseDTO<BiomarkerAlertDTO> | null> {
    try {
        const params: Record<string, any> = { pageNumber, pageSize };
        if (from) params.from = from;
        if (to) params.to = to;
        const res = await api.get<PaginatedResponseDTO<BiomarkerAlertDTO>>('/api/analytics/biomarker/history', params);
        return res.data;
    } catch (err) {
        console.warn('[AnalyticsService] fetchHistoryPaged failed:', err);
        return null;
    }
}

export const analyticsService = {
    /** Check if the Analytics backend module is reachable */
    checkHealth: healthCheckInternal,

    /** Fetch the latest biomarker alerts (first page, 50 items) */
    fetchLatestAlerts: async (): Promise<BiomarkerAlertDTO[] | null> => {
        const paged = await fetchLatestAlertsPagedInternal(1, 50);
        return paged?.paged.items ?? null;
    },

    /** Fetch the latest biomarker alerts with pagination and optional type filter */
    fetchLatestAlertsPaged: fetchLatestAlertsPagedInternal,

    /** Fetch biomarker alert history with optional date range (first page, 50 items) */
    fetchHistory: async (from?: string, to?: string): Promise<BiomarkerAlertDTO[] | null> => {
        const paged = await fetchHistoryPagedInternal(from, to, 1, 50);
        return paged?.items ?? null;
    },

    /** Fetch biomarker alert history with optional date range and pagination */
    fetchHistoryPaged: fetchHistoryPagedInternal,

    /** Trigger a manual biomarker scan */
    triggerScan: async (): Promise<boolean> => {
        try {
            await api.post('/api/analytics/biomarker/trigger-scan');
            return true;
        } catch (err) {
            console.warn('[AnalyticsService] triggerScan failed:', err);
            return false;
        }
    },

    /** Fetch real-time stream metrics for a department */
    fetchDepartmentStream: async (deptId: string): Promise<DepartmentStreamMetricsDTO | null> => {
        try {
            const res = await api.get<DepartmentStreamMetricsDTO>(
                `/api/analytics/dashboard/department/${deptId}/stream`);
            return res.data;
        } catch (err) {
            console.warn('[AnalyticsService] fetchDepartmentStream failed:', err);
            return null;
        }
    },

    /** Fetch overdue alerts, optionally filtered by department */
    fetchOverdueAlerts: async (departmentId?: string): Promise<OverdueAlertDTO[] | null> => {
        try {
            const params = departmentId ? { departmentId } : undefined;
            const res = await api.get<OverdueAlertDTO[]>('/api/analytics/dashboard/overdue', params);
            return res.data;
        } catch (err) {
            console.warn('[AnalyticsService] fetchOverdueAlerts failed:', err);
            return null;
        }
    },

    /** Fetch live workload data for a department */
    fetchWorkloadStream: async (deptId: string): Promise<WorkloadStreamDTO | null> => {
        try {
            const res = await api.get<WorkloadStreamDTO>(
                `/api/analytics/dashboard/workload/stream`, { departmentId: deptId });
            return res.data;
        } catch (err) {
            console.warn('[AnalyticsService] fetchWorkloadStream failed:', err);
            return null;
        }
    },

    /** Fetch chart-ready trend / completion-rate data */
    fetchTrendData: async (weeks: number = 4): Promise<ChartDataDTO | null> => {
        try {
            const res = await api.get<ChartDataDTO>('/api/analytics/trends/chart/completion-rate', { weeks });
            return res.data;
        } catch (err) {
            console.warn('[AnalyticsService] fetchTrendData failed:', err);
            return null;
        }
    },
};
