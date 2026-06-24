import { useState, useEffect, useCallback, ReactNode } from 'react';
import axios from 'axios';
import { useToast } from '../../../components/Toast/Toast';
import StatCard from '../../../components/StatCard/StatCard';
import DataTable from '../../../components/ui/DataTable';
import StatusBadge from '../../../components/ui/StatusBadge';
import {
    Search, Users, Clock, CheckCircle2, XCircle,
    CalendarCheck, Briefcase, ChevronLeft, ChevronRight,
    Eye, RefreshCw, Loader2, Package, Filter, X,
    AlertCircle, Mail, MapPin, User, Send, CalendarDays,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type RecruitmentStatus =
    | 'Pending Review'
    | 'Interview Scheduled'
    | 'Job Offered'
    | 'Rejected'
    | 'Hired';

export interface StatusHistoryEntry {
    status: RecruitmentStatus;
    changedAt: string;
    changedBy: string;
    remarks?: string;
}

export interface InterviewDetails {
    date: string;       // ISO date string "YYYY-MM-DD"
    time: string;       // "HH:MM"
    location: string;
    interviewer: string;
    emailSentAt?: string;
}

export interface AuditLogEntry {
    action: string;
    target: string;
    performedBy: string;
    performedAt: string;
}

export interface ApplicantRecord {
    applicantId: string;
    referenceNumber: string;
    fullName: string;
    firstName: string;
    middleName: string;
    lastName: string;
    suffix: string;
    gender: string;
    civilStatus: string;
    email: string;
    contactNumber: string;
    currentResidentialAddress: string;
    permanentAddress: string;
    sssNumber: string;
    philHealthNumber: string;
    pagIBIGNumber: string;
    tin: string;
    bankName: string;
    bankAccountName: string;
    bankAccountNumber: string;
    nbiClearanceFilePath: string;
    medicalClearanceFilePath: string;
    psaBirthCertificateFilePath: string;
    resumeFilePath: string;
    signedEmploymentContractFilePath: string;
    emergencyContactName: string;
    emergencyContactRelationship: string;
    emergencyContactMobileNumber: string;
    declaredDependents: string;
    highestEducationalAttainment: string;
    institution: string;
    degree: string;
    yearGraduated: string;
    professionalLicensesCertifications: string;
    isEmailVerified: boolean;
    position: string;
    currentStatus: RecruitmentStatus;
    submittedAt: string;
    updatedAt?: string | null;
    adminRemarks?: string | null;
    resumeUrl?: string | null;
    statusHistory?: StatusHistoryEntry[];
    interviewDetails?: InterviewDetails | null;
}

interface MockFetchParams {
    search: string;
    filterStatus: RecruitmentStatus | '';
    filterPosition: string;
    page: number;
    pageSize: number;
}

interface MockFetchResult {
    data: ApplicantRecord[];
    totalCount: number;
    totalPages: number;
}

interface StatusMeta {
    icon: ReactNode;
    color: string;
    bg: string;
    border: string;
}

// ─── Dummy Data ───────────────────────────────────────────────────────────────

const DUMMY_APPLICANT_DEFAULTS = {
    referenceNumber: '',
    firstName: '',
    middleName: '',
    lastName: '',
    suffix: '',
    gender: '',
    civilStatus: '',
    currentResidentialAddress: '',
    permanentAddress: '',
    sssNumber: '',
    philHealthNumber: '',
    pagIBIGNumber: '',
    tin: '',
    bankName: '',
    bankAccountName: '',
    bankAccountNumber: '',
    nbiClearanceFilePath: '',
    medicalClearanceFilePath: '',
    psaBirthCertificateFilePath: '',
    resumeFilePath: '',
    signedEmploymentContractFilePath: '',
    emergencyContactName: '',
    emergencyContactRelationship: '',
    emergencyContactMobileNumber: '',
    declaredDependents: '',
    highestEducationalAttainment: '',
    institution: '',
    degree: '',
    yearGraduated: '',
    professionalLicensesCertifications: '',
    isEmailVerified: false,
    resumeUrl: null,
};

const DUMMY_APPLICANTS: ApplicantRecord[] = [
    {
        ...DUMMY_APPLICANT_DEFAULTS,
        applicantId: 'APP-0001',
        fullName: 'Maria Santos',
        email: 'maria.santos@email.com',
        contactNumber: '+63 912 345 6789',
        position: 'Frontend Developer',
        currentStatus: 'Pending Review',
        submittedAt: '2025-06-01T08:30:00Z',
        updatedAt: null,
        adminRemarks: null,
        interviewDetails: null,
        statusHistory: [
            { status: 'Pending Review', changedAt: '2025-06-01T08:30:00Z', changedBy: 'System', remarks: 'Application received.' },
        ],
    },
    {
        ...DUMMY_APPLICANT_DEFAULTS,
        applicantId: 'APP-0002',
        fullName: 'Jose Reyes',
        email: 'jose.reyes@email.com',
        contactNumber: '+63 917 234 5678',
        position: 'Backend Developer',
        currentStatus: 'Interview Scheduled',
        submittedAt: '2025-05-28T10:00:00Z',
        updatedAt: '2025-06-03T14:00:00Z',
        adminRemarks: 'Technical interview set for June 10.',
        resumeUrl: null,
        interviewDetails: {
            date: '2025-06-20',
            time: '10:00',
            location: 'https://meet.google.com/abc-defg-hij',
            interviewer: 'Admin Cruz',
            emailSentAt: '2025-06-03T14:01:00Z',
        },
        statusHistory: [
            { status: 'Pending Review', changedAt: '2025-05-28T10:00:00Z', changedBy: 'System', remarks: 'Application received.' },
            { status: 'Interview Scheduled', changedAt: '2025-06-03T14:00:00Z', changedBy: 'Admin Cruz', remarks: 'Technical interview set for June 10.' },
        ],
    },
    {
        ...DUMMY_APPLICANT_DEFAULTS,
        applicantId: 'APP-0003',
        fullName: 'Ana Villanueva',
        email: 'ana.villanueva@email.com',
        contactNumber: '+63 920 111 2233',
        position: 'UI/UX Designer',
        currentStatus: 'Job Offered',
        submittedAt: '2025-05-15T09:00:00Z',
        updatedAt: '2025-06-05T11:00:00Z',
        adminRemarks: 'Excellent portfolio. Offer sent via email.',
        resumeUrl: null,
        interviewDetails: null,
        statusHistory: [
            { status: 'Pending Review', changedAt: '2025-05-15T09:00:00Z', changedBy: 'System', remarks: 'Application received.' },
            { status: 'Interview Scheduled', changedAt: '2025-05-20T10:00:00Z', changedBy: 'Admin Cruz', remarks: 'Initial design review call.' },
            { status: 'Job Offered', changedAt: '2025-06-05T11:00:00Z', changedBy: 'Admin Cruz', remarks: 'Excellent portfolio. Offer sent via email.' },
        ],
    },
    {
        ...DUMMY_APPLICANT_DEFAULTS,
        applicantId: 'APP-0004',
        fullName: 'Carlos Mendoza',
        email: 'carlos.mendoza@email.com',
        contactNumber: '+63 918 999 8877',
        position: 'DevOps Engineer',
        currentStatus: 'Rejected',
        submittedAt: '2025-05-10T07:45:00Z',
        updatedAt: '2025-05-22T16:30:00Z',
        adminRemarks: 'Does not meet minimum experience requirement.',
        resumeUrl: null,
        interviewDetails: null,
        statusHistory: [
            { status: 'Pending Review', changedAt: '2025-05-10T07:45:00Z', changedBy: 'System', remarks: 'Application received.' },
            { status: 'Rejected', changedAt: '2025-05-22T16:30:00Z', changedBy: 'Admin Lim', remarks: 'Does not meet minimum experience requirement.' },
        ],
    },
    {
        ...DUMMY_APPLICANT_DEFAULTS,
        applicantId: 'APP-0005',
        fullName: 'Liza Ocampo',
        email: 'liza.ocampo@email.com',
        contactNumber: '+63 916 555 4433',
        position: 'Frontend Developer',
        currentStatus: 'Interview Scheduled',
        submittedAt: '2025-06-02T13:00:00Z',
        updatedAt: '2025-06-06T09:00:00Z',
        adminRemarks: 'React skills confirmed. Interview on June 12.',
        resumeUrl: null,
        interviewDetails: {
            date: '2025-06-25',
            time: '14:00',
            location: 'HQ Office - Room 3B, Makati',
            interviewer: 'Admin Cruz',
            emailSentAt: '2025-06-06T09:01:00Z',
        },
        statusHistory: [
            { status: 'Pending Review', changedAt: '2025-06-02T13:00:00Z', changedBy: 'System', remarks: 'Application received.' },
            { status: 'Interview Scheduled', changedAt: '2025-06-06T09:00:00Z', changedBy: 'Admin Cruz', remarks: 'React skills confirmed. Interview on June 12.' },
        ],
    },
    {
        ...DUMMY_APPLICANT_DEFAULTS,
        applicantId: 'APP-0006',
        fullName: 'Ramon Gutierrez',
        email: 'ramon.gutierrez@email.com',
        contactNumber: '+63 913 777 6655',
        position: 'Project Manager',
        currentStatus: 'Pending Review',
        submittedAt: '2025-06-07T08:00:00Z',
        updatedAt: null,
        adminRemarks: null,
        resumeUrl: null,
        interviewDetails: null,
        statusHistory: [
            { status: 'Pending Review', changedAt: '2025-06-07T08:00:00Z', changedBy: 'System', remarks: 'Application received.' },
        ],
    },
    {
        ...DUMMY_APPLICANT_DEFAULTS,
        applicantId: 'APP-0007',
        fullName: 'Grace Dela Cruz',
        email: 'grace.delacruz@email.com',
        contactNumber: '+63 919 444 3322',
        position: 'QA Engineer',
        currentStatus: 'Pending Review',
        submittedAt: '2025-06-08T10:30:00Z',
        updatedAt: null,
        adminRemarks: null,
        resumeUrl: null,
        interviewDetails: null,
        statusHistory: [
            { status: 'Pending Review', changedAt: '2025-06-08T10:30:00Z', changedBy: 'System', remarks: 'Application received.' },
        ],
    },
    {
        ...DUMMY_APPLICANT_DEFAULTS,
        applicantId: 'APP-0008',
        fullName: 'Mark Bautista',
        email: 'mark.bautista@email.com',
        contactNumber: '+63 921 333 2211',
        position: 'Backend Developer',
        currentStatus: 'Job Offered',
        submittedAt: '2025-05-20T11:00:00Z',
        updatedAt: '2025-06-08T15:00:00Z',
        adminRemarks: 'Strong Node.js background. Offer extended.',
        resumeUrl: null,
        interviewDetails: null,
        statusHistory: [
            { status: 'Pending Review', changedAt: '2025-05-20T11:00:00Z', changedBy: 'System', remarks: 'Application received.' },
            { status: 'Interview Scheduled', changedAt: '2025-05-25T10:00:00Z', changedBy: 'Admin Lim', remarks: 'Initial call done, technical round scheduled.' },
            { status: 'Job Offered', changedAt: '2025-06-08T15:00:00Z', changedBy: 'Admin Lim', remarks: 'Strong Node.js background. Offer extended.' },
        ],
    },
    {
        ...DUMMY_APPLICANT_DEFAULTS,
        applicantId: 'APP-0009',
        fullName: 'Cynthia Flores',
        email: 'cynthia.flores@email.com',
        contactNumber: '+63 915 222 1100',
        position: 'UI/UX Designer',
        currentStatus: 'Rejected',
        submittedAt: '2025-05-18T09:30:00Z',
        updatedAt: '2025-05-30T12:00:00Z',
        adminRemarks: 'Portfolio did not align with current design direction.',
        resumeUrl: null,
        interviewDetails: null,
        statusHistory: [
            { status: 'Pending Review', changedAt: '2025-05-18T09:30:00Z', changedBy: 'System', remarks: 'Application received.' },
            { status: 'Interview Scheduled', changedAt: '2025-05-22T10:00:00Z', changedBy: 'Admin Cruz', remarks: 'Portfolio review call.' },
            { status: 'Rejected', changedAt: '2025-05-30T12:00:00Z', changedBy: 'Admin Cruz', remarks: 'Portfolio did not align with current design direction.' },
        ],
    },
    {
        ...DUMMY_APPLICANT_DEFAULTS,
        applicantId: 'APP-0010',
        fullName: 'Dennis Aquino',
        email: 'dennis.aquino@email.com',
        contactNumber: '+63 911 888 7766',
        position: 'DevOps Engineer',
        currentStatus: 'Interview Scheduled',
        submittedAt: '2025-06-05T14:00:00Z',
        updatedAt: '2025-06-09T10:00:00Z',
        adminRemarks: 'AWS certified. Panel interview scheduled for June 15.',
        resumeUrl: null,
        interviewDetails: {
            date: '2025-06-28',
            time: '09:00',
            location: 'https://zoom.us/j/123456789',
            interviewer: 'Admin Lim',
            emailSentAt: '2025-06-09T10:01:00Z',
        },
        statusHistory: [
            { status: 'Pending Review', changedAt: '2025-06-05T14:00:00Z', changedBy: 'System', remarks: 'Application received.' },
            { status: 'Interview Scheduled', changedAt: '2025-06-09T10:00:00Z', changedBy: 'Admin Lim', remarks: 'AWS certified. Panel interview scheduled for June 15.' },
        ],
    },
    {
        ...DUMMY_APPLICANT_DEFAULTS,
        applicantId: 'APP-0011',
        fullName: 'Patricia Navarro',
        email: 'patricia.navarro@email.com',
        contactNumber: '+63 914 666 5544',
        position: 'Project Manager',
        currentStatus: 'Interview Scheduled',
        submittedAt: '2025-06-03T08:00:00Z',
        updatedAt: '2025-06-10T09:00:00Z',
        adminRemarks: 'PMP certified. Stakeholder interview set.',
        resumeUrl: null,
        interviewDetails: {
            date: '2025-06-30',
            time: '13:00',
            location: 'BGC Office - Conference Room A',
            interviewer: 'Admin Cruz',
            emailSentAt: '2025-06-10T09:01:00Z',
        },
        statusHistory: [
            { status: 'Pending Review', changedAt: '2025-06-03T08:00:00Z', changedBy: 'System', remarks: 'Application received.' },
            { status: 'Interview Scheduled', changedAt: '2025-06-10T09:00:00Z', changedBy: 'Admin Cruz', remarks: 'PMP certified. Stakeholder interview set.' },
        ],
    },
    {
        ...DUMMY_APPLICANT_DEFAULTS,
        applicantId: 'APP-0012',
        fullName: 'Roberto Castillo',
        email: 'roberto.castillo@email.com',
        contactNumber: '+63 922 000 9988',
        position: 'QA Engineer',
        currentStatus: 'Pending Review',
        submittedAt: '2025-06-10T11:00:00Z',
        updatedAt: null,
        adminRemarks: null,
        resumeUrl: null,
        interviewDetails: null,
        statusHistory: [
            { status: 'Pending Review', changedAt: '2025-06-10T11:00:00Z', changedBy: 'System', remarks: 'Application received.' },
        ],
    },
];

// ─── In-memory audit log ──────────────────────────────────────────────────────

const AUDIT_LOG: AuditLogEntry[] = [];

function appendAuditLog(entry: AuditLogEntry): void {
    AUDIT_LOG.push(entry);
    console.info('[AUDIT LOG]', entry);
}

// ─── Mock services ────────────────────────────────────────────────────────────

function mockFetchApplicants({
    search, filterStatus, filterPosition, page, pageSize,
}: MockFetchParams): Promise<MockFetchResult> {
    return new Promise((resolve) => {
        setTimeout(() => {
            let filtered = [...DUMMY_APPLICANTS];
            if (search) {
                const q = search.toLowerCase();
                filtered = filtered.filter(
                    (a) => a.fullName.toLowerCase().includes(q) ||
                        a.applicantId.toLowerCase().includes(q) ||
                        a.email.toLowerCase().includes(q),
                );
            }
            if (filterStatus) filtered = filtered.filter((a) => a.currentStatus === filterStatus);
            if (filterPosition) filtered = filtered.filter((a) => a.position === filterPosition);
            const totalCount = filtered.length;
            const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
            const start = (page - 1) * pageSize;
            resolve({ data: filtered.slice(start, start + pageSize), totalCount, totalPages });
        }, 400);
    });
}

/** Simulates SMTP dispatch — fails ~20% of the time for demo purposes */
function mockSendEmail(to: string, subject: string, body: string): Promise<void> {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const willFail = Math.random() < 0.2;
            if (willFail) {
                reject(new Error('SMTP timeout: connection refused.'));
            } else {
                console.info(`[EMAIL SENT] To: ${to}\nSubject: ${subject}\n\n${body}`);
                resolve();
            }
        }, 900);
    });
}

function buildEmailBody(applicant: ApplicantRecord, details: InterviewDetails): string {
    const dateStr = new Date(`${details.date}T${details.time}`).toLocaleString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
    return `Dear ${applicant.fullName},

We are pleased to inform you that you have been shortlisted for the position of ${applicant.position}.

Your interview has been scheduled as follows:
  • Date & Time: ${dateStr}
  • Location / Meeting Link: ${details.location}
  • Interviewer / Contact Person: ${details.interviewer}

Please confirm your availability by replying to this email. If you need to reschedule, kindly notify us at least 24 hours in advance.

We look forward to speaking with you.

Best regards,
Recruitment Team`;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const ALL_STATUSES: RecruitmentStatus[] = [
    'Pending Review', 'Interview Scheduled', 'Job Offered', 'Rejected', 'Hired',
];

export const STATUS_TRANSITIONS: Record<RecruitmentStatus, RecruitmentStatus[]> = {
    'Pending Review': ['Interview Scheduled', 'Rejected'],
    'Interview Scheduled': ['Job Offered', 'Rejected'],
    'Job Offered': ['Rejected', 'Hired'],
    'Rejected': [],
    'Hired': [],
};

const INTERVIEWERS = ['Admin Cruz', 'Admin Lim', 'Admin Santos', 'Admin Reyes', 'Admin Dela Cruz'];

const PAGE_SIZE = 5;

// ─── Status meta ──────────────────────────────────────────────────────────────

const STATUS_META: Record<RecruitmentStatus, StatusMeta> = {
    'Pending Review': {
        icon: <Clock size={11} />,
        color: '#b45309', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.35)',
    },
    'Interview Scheduled': {
        icon: <CalendarCheck size={11} />,
        color: '#1d4ed8', bg: 'rgba(67,24,255,0.10)', border: 'rgba(67,24,255,0.25)',
    },
    'Job Offered': {
        icon: <Briefcase size={11} />,
        color: '#065f46', bg: 'rgba(5,205,153,0.12)', border: 'rgba(5,205,153,0.30)',
    },
    'Rejected': {
        icon: <XCircle size={11} />,
        color: '#b91c1c', bg: 'rgba(238,93,80,0.10)', border: 'rgba(238,93,80,0.28)',
    },
    'Hired': {
        icon: <CheckCircle2 size={11} />,
        color: '#059669', bg: 'rgba(5,150,105,0.12)', border: 'rgba(5,150,105,0.30)',
    },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getPageNumbers(total: number, current: number): (number | '...')[] {
    const pages: (number | '...')[] = [];
    if (total <= 5) {
        for (let i = 1; i <= total; i++) pages.push(i);
    } else {
        pages.push(1);
        if (current > 3) pages.push('...');
        const start = Math.max(2, current - 1);
        const end = Math.min(total - 1, current + 1);
        for (let i = start; i <= end; i++) pages.push(i);
        if (current < total - 2) pages.push('...');
        pages.push(total);
    }
    return pages;
}

export function fmtDate(d: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function fmtDateTime(d: string, t: string): string {
    return new Date(`${d}T${t}`).toLocaleString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric',
        year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
}

function todayISO(): string {
    return new Date().toISOString().split('T')[0];
}

// ─── Inline CSS ───────────────────────────────────────────────────────────────

const css = `
  .rec-content { padding: 24px; font-family: 'Inter', system-ui, sans-serif; background: #f8fafc; min-height: 100vh; }
  .rec-stats-row { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
  .rec-stat-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px; display: flex; align-items: center; gap: 14px; flex: 1; min-width: 140px; }
  .rec-stat-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .rec-stat-icon--purple { background: rgba(67,24,255,0.10); color: #4318ff; }
  .rec-stat-icon--amber { background: rgba(251,191,36,0.15); color: #b45309; }
  .rec-stat-icon--blue { background: rgba(29,78,216,0.10); color: #1d4ed8; }
  .rec-stat-icon--green { background: rgba(5,205,153,0.12); color: #065f46; }
  .rec-stat-icon--red { background: rgba(238,93,80,0.10); color: #b91c1c; }
  .rec-stat-value { font-size: 22px; font-weight: 700; color: #0f172a; line-height: 1; }
  .rec-stat-label { font-size: 11px; color: #64748b; margin-top: 3px; white-space: nowrap; }
  .rec-table-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; }
  .rec-toolbar { display: flex; align-items: center; gap: 10px; padding: 14px 16px; border-bottom: 1px solid #f1f5f9; flex-wrap: wrap; }
  .rec-search-wrap { position: relative; flex: 1; min-width: 200px; }
  .rec-search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #94a3b8; pointer-events: none; }
  .rec-search-input { width: 100%; border: 1px solid #e2e8f0; border-radius: 8px; padding: 7px 10px 7px 30px; font-size: 13px; outline: none; color: #0f172a; background: #f8fafc; box-sizing: border-box; }
  .rec-search-input:focus { border-color: #4318ff; background: #fff; }
  .rec-filter-wrap { position: relative; }
  .rec-filter-icon { position: absolute; left: 9px; top: 50%; transform: translateY(-50%); color: #94a3b8; pointer-events: none; }
  .rec-select { border: 1px solid #e2e8f0; border-radius: 8px; padding: 7px 10px; font-size: 13px; color: #0f172a; background: #f8fafc; cursor: pointer; outline: none; }
  .rec-select--with-icon { padding-left: 28px; }
  .rec-result-count { font-size: 12px; color: #94a3b8; white-space: nowrap; margin-left: auto; }
  .rec-table-scroll { overflow-x: auto; }
  .rec-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .rec-table thead tr { background: #f8fafc; }
  .rec-table th { padding: 10px 16px; text-align: left; font-size: 11px; font-weight: 600; color: #94a3b8; letter-spacing: 0.05em; border-bottom: 1px solid #f1f5f9; white-space: nowrap; }
  .rec-table td { padding: 12px 16px; border-bottom: 1px solid #f8fafc; vertical-align: middle; }
  .rec-row { cursor: pointer; transition: background 0.15s; }
  .rec-row:hover { background: #f8fafc; }
  .rec-row:last-child td { border-bottom: none; }
  .rec-ref-chip { background: #f1f5f9; color: #475569; font-size: 11px; padding: 2px 7px; border-radius: 5px; font-family: monospace; }
  .rec-applicant-cell { display: flex; align-items: center; gap: 10px; }
  .rec-avatar { width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg,#4318ff,#868cff); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; flex-shrink: 0; }
  .rec-avatar--lg { width: 44px; height: 44px; font-size: 18px; }
  .rec-applicant-name { font-weight: 600; color: #0f172a; font-size: 13px; }
  .rec-applicant-email { font-size: 11px; color: #94a3b8; }
  .rec-actions-cell { display: flex; gap: 6px; }
  .rec-action-btn { display: flex; align-items: center; gap: 4px; border: 1px solid #e2e8f0; background: #fff; color: #475569; border-radius: 6px; padding: 5px 10px; font-size: 12px; cursor: pointer; transition: all 0.15s; font-weight: 500; white-space: nowrap; }
  .rec-action-btn:hover { background: #f8fafc; border-color: #cbd5e1; }
  .rec-action-btn--primary { background: #4318ff; color: #fff; border-color: #4318ff; }
  .rec-action-btn--primary:hover { background: #3311cc; }
  .rec-empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; padding: 48px; color: #94a3b8; font-size: 13px; }
  .rec-pagination { display: flex; align-items: center; justify-content: center; gap: 4px; padding: 14px; border-top: 1px solid #f1f5f9; }
  .rec-page-btn { border: 1px solid #e2e8f0; background: #fff; color: #475569; border-radius: 7px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 13px; font-weight: 500; transition: all 0.15s; }
  .rec-page-btn:hover:not(:disabled) { background: #f8fafc; border-color: #4318ff; color: #4318ff; }
  .rec-page-btn--active { background: #4318ff; color: #fff; border-color: #4318ff; }
  .rec-page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .rec-page-ellipsis { color: #94a3b8; padding: 0 4px; font-size: 13px; }
  .rec-spinner { animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  /* Overlay & Modal */
  .rec-overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.45); z-index: 1000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(2px); padding: 20px; }
  .rec-modal { background: #fff; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.18); width: 100%; }
  .rec-modal--sm { max-width: 460px; }
  .rec-modal--md { max-width: 580px; }
  .rec-modal--lg { max-width: 680px; }
  .rec-modal--scrollable { max-height: 90vh; overflow-y: auto; }
  .rec-modal-header { display: flex; align-items: flex-start; justify-content: space-between; padding: 20px 22px 16px; border-bottom: 1px solid #f1f5f9; gap: 12px; }
  .rec-modal-header--sticky { position: sticky; top: 0; background: #fff; z-index: 10; }
  .rec-modal-title { font-size: 15px; font-weight: 700; color: #0f172a; margin: 0 0 3px; }
  .rec-modal-subtitle { font-size: 12px; color: #94a3b8; margin: 0; }
  .rec-modal-ref { font-family: monospace; font-size: 11px; background: #f1f5f9; padding: 1px 5px; border-radius: 4px; color: #475569; }
  .rec-close-btn { border: none; background: #f1f5f9; color: #64748b; border-radius: 7px; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; }
  .rec-close-btn:hover { background: #e2e8f0; }
  .rec-modal-body { padding: 20px 22px 22px; }
  .rec-applicant-strip { display: flex; align-items: center; gap: 12px; background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 10px; padding: 12px 14px; margin-bottom: 18px; }
  .rec-applicant-strip-name { font-weight: 600; color: #0f172a; font-size: 13px; }
  .rec-applicant-strip-pos { font-size: 11px; color: #64748b; margin-top: 2px; }
  .rec-field-label { display: block; font-size: 12px; font-weight: 600; color: #374151; margin-bottom: 6px; }
  .rec-field-label span { color: #ef4444; }
  .rec-field-optional { color: #94a3b8; font-weight: 400; }
  .rec-no-transitions { display: flex; align-items: center; gap: 7px; font-size: 12px; color: #94a3b8; padding: 10px 0; }
  .rec-status-options { display: flex; flex-direction: column; gap: 8px; margin-bottom: 18px; }
  .rec-status-option { display: flex; align-items: center; gap: 10px; border: 1px solid #e2e8f0; border-radius: 9px; padding: 10px 12px; cursor: pointer; transition: all 0.15s; }
  .rec-status-option input[type=radio] { flex-shrink: 0; }
  .rec-status-option-icon { width: 26px; height: 26px; border-radius: 7px; border: 1px solid; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .rec-status-option-text { flex: 1; font-size: 13px; color: #374151; }
  .rec-textarea-wrap { margin-bottom: 14px; }
  .rec-textarea { width: 100%; border: 1px solid #e2e8f0; border-radius: 8px; padding: 9px 11px; font-size: 13px; color: #0f172a; resize: vertical; outline: none; font-family: inherit; box-sizing: border-box; }
  .rec-textarea:focus { border-color: #4318ff; }
  .rec-char-count { font-size: 11px; color: #94a3b8; text-align: right; margin-top: 4px; }
  .rec-modal-error { display: flex; align-items: center; gap: 7px; font-size: 12px; color: #b91c1c; background: rgba(238,93,80,0.07); border: 1px solid rgba(238,93,80,0.2); border-radius: 8px; padding: 8px 12px; margin-bottom: 14px; }
  .rec-modal-success { display: flex; align-items: flex-start; gap: 7px; font-size: 12px; color: #065f46; background: rgba(5,205,153,0.08); border: 1px solid rgba(5,205,153,0.25); border-radius: 8px; padding: 10px 12px; margin-bottom: 14px; }
  .rec-modal-warn { display: flex; align-items: flex-start; gap: 7px; font-size: 12px; color: #b45309; background: rgba(251,191,36,0.09); border: 1px solid rgba(251,191,36,0.3); border-radius: 8px; padding: 10px 12px; margin-bottom: 14px; }
  .rec-modal-actions { display: flex; justify-content: flex-end; gap: 8px; }
  .rec-btn { display: flex; align-items: center; gap: 6px; padding: 9px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; transition: all 0.15s; white-space: nowrap; }
  .rec-btn--cancel { background: #f1f5f9; color: #475569; }
  .rec-btn--cancel:hover { background: #e2e8f0; }
  .rec-btn--primary { background: #4318ff; color: #fff; }
  .rec-btn--primary:hover { background: #3311cc; }
  .rec-btn--dynamic { color: #fff; }
  .rec-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  /* Detail modal */
  .rec-detail-hero { display: flex; align-items: center; gap: 14px; margin-bottom: 18px; }
  .rec-detail-name { font-size: 16px; font-weight: 700; color: #0f172a; }
  .rec-detail-position { font-size: 12px; color: #64748b; margin-top: 3px; }
  .rec-detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px; }
  .rec-detail-cell { background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 9px; padding: 10px 13px; }
  .rec-detail-cell-label { font-size: 11px; color: #94a3b8; display: block; margin-bottom: 3px; font-weight: 500; }
  .rec-detail-cell-value { font-size: 13px; color: #0f172a; font-weight: 500; word-break: break-all; }
  .rec-remarks-strip { background: #fffbeb; border: 1px solid rgba(251,191,36,0.35); border-radius: 9px; padding: 12px 14px; margin-bottom: 16px; }
  .rec-remarks-label { font-size: 11px; font-weight: 600; color: #b45309; display: block; margin-bottom: 5px; }
  .rec-remarks-text { font-size: 13px; color: #78350f; margin: 0; }
  .rec-section-label { font-size: 12px; font-weight: 600; color: #374151; display: block; margin-bottom: 12px; }
  /* Interview card inside detail modal */
  .rec-interview-card { background: rgba(67,24,255,0.04); border: 1px solid rgba(67,24,255,0.18); border-radius: 11px; padding: 14px 16px; margin-bottom: 16px; }
  .rec-interview-card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
  .rec-interview-card-title { font-size: 12px; font-weight: 700; color: #1d4ed8; display: flex; align-items: center; gap: 6px; }
  .rec-interview-card-email-badge { display: flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 600; color: #065f46; background: rgba(5,205,153,0.12); border: 1px solid rgba(5,205,153,0.25); border-radius: 20px; padding: 2px 8px; }
  .rec-interview-rows { display: flex; flex-direction: column; gap: 7px; }
  .rec-interview-row { display: flex; align-items: flex-start; gap: 8px; font-size: 12px; color: #374151; }
  .rec-interview-row-icon { color: #1d4ed8; margin-top: 1px; flex-shrink: 0; }
  /* Timeline */
  .rec-timeline { }
  .rec-rejected-notice { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #b91c1c; background: rgba(238,93,80,0.07); border: 1px solid rgba(238,93,80,0.2); border-radius: 9px; padding: 10px 14px; margin-bottom: 14px; }
  .rec-rejected-text { font-weight: 500; }
  .rec-timeline-steps { display: flex; align-items: flex-start; margin-bottom: 18px; }
  .rec-timeline-step { display: flex; flex-direction: column; align-items: center; gap: 5px; }
  .rec-timeline-step-dot { width: 28px; height: 28px; border-radius: 50%; border: 2px solid #e2e8f0; background: #f8fafc; color: #94a3b8; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; transition: all 0.2s; }
  .rec-timeline-step-label { font-size: 10px; color: #94a3b8; text-align: center; max-width: 80px; font-weight: 500; }
  .rec-timeline-step-label--active { font-weight: 700; }
  .rec-timeline-connector { flex: 1; height: 2px; background: #e2e8f0; margin: 14px 4px 0; min-width: 20px; }
  .rec-timeline-connector--done { background: #4318ff; }
  .rec-history-list { display: flex; flex-direction: column; gap: 8px; }
  .rec-history-label { font-size: 11px; font-weight: 600; color: #94a3b8; letter-spacing: 0.05em; text-transform: uppercase; display: block; margin-bottom: 4px; }
  .rec-history-entry { display: flex; align-items: flex-start; gap: 10px; padding: 10px 12px; background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 9px; }
  .rec-history-meta { font-size: 11px; color: #64748b; }
  .rec-history-remarks { font-size: 12px; color: #374151; margin-top: 3px; font-style: italic; }
  /* Interview scheduling form */
  .rec-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px; }
  .rec-form-field { display: flex; flex-direction: column; gap: 6px; }
  .rec-form-field--full { grid-column: 1 / -1; }
  .rec-input { border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 11px; font-size: 13px; color: #0f172a; background: #f8fafc; outline: none; width: 100%; box-sizing: border-box; font-family: inherit; }
  .rec-input:focus { border-color: #4318ff; background: #fff; }
  .rec-input--error { border-color: #ef4444; }
  .rec-field-error { font-size: 11px; color: #ef4444; margin-top: 2px; }
  .rec-input-icon-wrap { position: relative; }
  .rec-input-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #94a3b8; pointer-events: none; }
  .rec-input-icon-wrap .rec-input { padding-left: 30px; }
  /* Email preview */
  .rec-email-preview { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px; margin-bottom: 16px; }
  .rec-email-preview-header { display: flex; align-items: center; gap: 7px; font-size: 11px; font-weight: 700; color: #374151; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.05em; }
  .rec-email-meta { display: flex; flex-direction: column; gap: 4px; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #e2e8f0; }
  .rec-email-meta-row { display: flex; gap: 8px; font-size: 12px; }
  .rec-email-meta-label { color: #94a3b8; font-weight: 600; width: 50px; flex-shrink: 0; }
  .rec-email-meta-value { color: #374151; }
  .rec-email-body { font-size: 12px; color: #374151; white-space: pre-wrap; line-height: 1.7; }
  /* Steps indicator */
  .rec-steps { display: flex; align-items: center; gap: 0; margin-bottom: 20px; }
  .rec-step { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: #94a3b8; }
  .rec-step--active { color: #4318ff; }
  .rec-step--done { color: #065f46; }
  .rec-step-dot { width: 22px; height: 22px; border-radius: 50%; border: 2px solid #e2e8f0; background: #f8fafc; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; flex-shrink: 0; }
  .rec-step--active .rec-step-dot { border-color: #4318ff; background: #4318ff; color: #fff; }
  .rec-step--done .rec-step-dot { border-color: #065f46; background: #065f46; color: #fff; }
  .rec-step-line { flex: 1; height: 2px; background: #e2e8f0; margin: 0 6px; min-width: 20px; }
  .rec-step-line--done { background: #4318ff; }
  .rec-divider { border: none; border-top: 1px solid #f1f5f9; margin: 16px 0; }
`;

// ─── StatusBadge ─────────────────────────────────────────────────────────────

export function RecruitmentStatusBadge({ status }: { status: RecruitmentStatus }) {
    const m = STATUS_META[status];
    return <StatusBadge status={status} size="sm" icon={m?.icon} />;
}

// ─── ApplicantTimeline ────────────────────────────────────────────────────────

interface ApplicantTimelineProps {
    history: StatusHistoryEntry[];
    currentStatus: RecruitmentStatus;
}

function ApplicantTimeline({ history, currentStatus }: ApplicantTimelineProps) {
    const steps: RecruitmentStatus[] = ['Pending Review', 'Interview Scheduled', 'Job Offered'];
    const isRejected = currentStatus === 'Rejected';
    const currentIdx = steps.indexOf(currentStatus);

    return (
        <div className="rec-timeline">
            {isRejected ? (
                <div className="rec-rejected-notice">
                    <XCircle size={16} color="#ee5d50" />
                    <span className="rec-rejected-text">Application was rejected</span>
                </div>
            ) : (
                <div className="rec-timeline-steps">
                    {steps.map((step, i) => {
                        const done = i <= currentIdx;
                        const active = step === currentStatus;
                        const m = STATUS_META[step];
                        return (
                            <div key={step} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : undefined }}>
                                <div className="rec-timeline-step">
                                    <div
                                        className={`rec-timeline-step-dot${done ? ' rec-timeline-step-dot--done' : ''}`}
                                        style={done ? { background: m.bg, borderColor: m.border, color: m.color, boxShadow: active ? `0 0 0 4px ${m.bg}` : 'none' } : {}}
                                    >
                                        {done ? <CheckCircle2 size={13} /> : <span>{i + 1}</span>}
                                    </div>
                                    <span className={`rec-timeline-step-label${active ? ' rec-timeline-step-label--active' : ''}`}
                                        style={done ? { color: m.color } : {}}>{step}</span>
                                </div>
                                {i < steps.length - 1 && (
                                    <div className={`rec-timeline-connector${i < currentIdx ? ' rec-timeline-connector--done' : ''}`} />
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
            {history.length > 0 && (
                <div className="rec-history-list">
                    <span className="rec-history-label">Status History</span>
                    {[...history].reverse().map((h, idx) => (
                        <div key={idx} className="rec-history-entry">
                            <RecruitmentStatusBadge status={h.status} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div className="rec-history-meta">{fmtDate(h.changedAt)} · by <strong>{h.changedBy}</strong></div>
                                {h.remarks && <div className="rec-history-remarks">"{h.remarks}"</div>}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── InterviewCard (shown in detail modal) ─────────────────────────────────

function InterviewCard({ details }: { details: InterviewDetails }) {
    return (
        <div className="rec-interview-card">
            <div className="rec-interview-card-header">
                <div className="rec-interview-card-title">
                    <CalendarDays size={13} /> Interview Details
                </div>
                {details.emailSentAt && (
                    <div className="rec-interview-card-email-badge">
                        <Mail size={10} /> Email sent {fmtDate(details.emailSentAt)}
                    </div>
                )}
            </div>
            <div className="rec-interview-rows">
                <div className="rec-interview-row">
                    <CalendarDays size={13} className="rec-interview-row-icon" />
                    <span>{fmtDateTime(details.date, details.time)}</span>
                </div>
                <div className="rec-interview-row">
                    <MapPin size={13} className="rec-interview-row-icon" />
                    <span style={{ wordBreak: 'break-all' }}>{details.location}</span>
                </div>
                <div className="rec-interview-row">
                    <User size={13} className="rec-interview-row-icon" />
                    <span>{details.interviewer}</span>
                </div>
            </div>
        </div>
    );
}

// ─── InterviewSchedulingModal ─────────────────────────────────────────────────

type ScheduleStep = 'form' | 'preview' | 'sending' | 'done';

interface InterviewSchedulingModalProps {
    applicant: ApplicantRecord;
    onClose: () => void;
    onScheduled: (applicantId: string, details: InterviewDetails) => void;
    initialInterview?: InterviewDetails | null;
}

function InterviewSchedulingModal({ applicant, onClose, onScheduled, initialInterview }: InterviewSchedulingModalProps) {
    const [step, setStep] = useState<ScheduleStep>('form');

    // Form fields
    const [date, setDate] = useState<string>(initialInterview?.date ?? '');
    const [time, setTime] = useState<string>(initialInterview?.time ?? '');
    const [location, setLocation] = useState<string>(initialInterview?.location ?? '');

    // Field errors
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Email dispatch state
    const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'sent' | 'failed' | 'retrying'>('idle');
    const [emailError, setEmailError] = useState<string>('');

    const adminName = 'Admin (Demo)';

    function validate(): boolean {
        const errs: Record<string, string> = {};
        if (!date) errs.date = 'Interview date is required.';
        else if (date <= todayISO()) errs.date = 'Date must be in the future.';
        if (!time) errs.time = 'Interview time is required.';
        if (!location.trim()) errs.location = 'Location or meeting link is required.';
        else if (location.trim().length > 255) errs.location = 'Maximum 255 characters.';
        setErrors(errs);
        return Object.keys(errs).length === 0;
    }

    function handlePreview(): void {
        if (validate()) setStep('preview');
    }

    async function handleSend(): Promise<void> {
        setStep('sending');
        const details: InterviewDetails = {
            date, time, location: location.trim(), interviewer: '',
        };

        setEmailStatus('sending');
        setEmailError('');

        try {
            const payload = {
                applicantRecordId: applicant.applicantId,
                interviewDate: date,
                interviewTime: time,
                locationOrLink: location.trim(),
                interviewerName: adminName || 'Scheduler',
            };
            const res = await axios.post('/api/recruitment/schedule-interview', payload);
            const apiResult = res.data as any;

            if (apiResult?.isSuccess) {
                const msg = apiResult.message ?? '';
                if (msg.includes('failed') || msg.includes('Retrying')) {
                    setEmailStatus('failed');
                    setEmailError('Email dispatch failed. Retrying... (saved to retry queue)');
                } else {
                    setEmailStatus('sent');
                }
            } else {
                setEmailStatus('failed');
                setEmailError(apiResult?.message || 'Failed to schedule interview.');
            }
        } catch (err: unknown) {
            setEmailStatus('failed');
            const msg = err instanceof Error ? err.message : 'Unknown error.';
            setEmailError(`Failed to schedule interview: ${msg}`);
        }

        const now = new Date().toISOString();
        const finalDetails: InterviewDetails = {
            ...details,
            emailSentAt: emailStatus === 'sent' ? now : undefined,
        };

        onScheduled(applicant.applicantId, finalDetails);

        appendAuditLog({
            action: 'Interview Scheduled',
            target: applicant.email,
            performedBy: adminName,
            performedAt: now,
        });

        setStep('done');
    }

    const stepIndex = { form: 0, preview: 1, sending: 2, done: 2 }[step];

    return (
        <div className="rec-overlay" onClick={step === 'sending' ? undefined : onClose}>
            <div className="rec-modal rec-modal--lg rec-modal--scrollable" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="rec-modal-header rec-modal-header--sticky">
                    <div>
                        <h3 className="rec-modal-title">{initialInterview ? 'Reschedule Interview' : 'Schedule Interview'}</h3>
                        <p className="rec-modal-subtitle">
                            Ref: <code className="rec-modal-ref">{applicant.referenceNumber || applicant.applicantId}</code>
                        </p>
                    </div>
                    {step !== 'sending' && (
                        <button className="rec-close-btn" onClick={onClose}><X size={14} /></button>
                    )}
                </div>

                <div className="rec-modal-body">
                    {/* Steps indicator */}
                    <div className="rec-steps">
                        {(['Fill Details', 'Review & Send', 'Complete'] as const).map((label, i) => (
                            <div key={label} style={{ display: 'flex', alignItems: 'center', flex: i < 2 ? 1 : undefined }}>
                                <div className={`rec-step${i < stepIndex ? ' rec-step--done' : i === stepIndex ? ' rec-step--active' : ''}`}>
                                    <div className="rec-step-dot">
                                        {i < stepIndex ? <CheckCircle2 size={12} /> : i + 1}
                                    </div>
                                    <span>{label}</span>
                                </div>
                                {i < 2 && <div className={`rec-step-line${i < stepIndex ? ' rec-step-line--done' : ''}`} />}
                            </div>
                        ))}
                    </div>

                    {/* Applicant strip */}
                    <div className="rec-applicant-strip">
                        <div className="rec-avatar">{applicant.fullName.charAt(0).toUpperCase()}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="rec-applicant-strip-name">{applicant.fullName}</div>
                            <div className="rec-applicant-strip-pos">{applicant.position}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#94a3b8' }}>
                            <Mail size={12} /> {applicant.email}
                        </div>
                    </div>

                    {/* ── STEP 1: Form ── */}
                    {step === 'form' && (
                        <>
                            <div className="rec-form-grid">
                                {/* Date */}
                                <div className="rec-form-field">
                                    <label className="rec-field-label">Interview Date <span>*</span></label>
                                    <div className="rec-input-icon-wrap">
                                        <CalendarDays size={13} className="rec-input-icon" />
                                        <input
                                            type="date"
                                            className={`rec-input${errors.date ? ' rec-input--error' : ''}`}
                                            value={date}
                                            min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                                            onChange={(e) => { setDate(e.target.value); setErrors((p) => ({ ...p, date: '' })); }}
                                        />
                                    </div>
                                    {errors.date && <span className="rec-field-error">{errors.date}</span>}
                                </div>

                                {/* Time */}
                                <div className="rec-form-field">
                                    <label className="rec-field-label">Interview Time <span>*</span></label>
                                    <div className="rec-input-icon-wrap">
                                        <Clock size={13} className="rec-input-icon" />
                                        <input
                                            type="time"
                                            className={`rec-input${errors.time ? ' rec-input--error' : ''}`}
                                            value={time}
                                            onChange={(e) => { setTime(e.target.value); setErrors((p) => ({ ...p, time: '' })); }}
                                        />
                                    </div>
                                    {errors.time && <span className="rec-field-error">{errors.time}</span>}
                                </div>

                                {/* Location */}
                                <div className="rec-form-field rec-form-field--full">
                                    <label className="rec-field-label">Location / Meeting Link <span>*</span></label>
                                    <div className="rec-input-icon-wrap">
                                        <MapPin size={13} className="rec-input-icon" />
                                        <input
                                            type="text"
                                            className={`rec-input${errors.location ? ' rec-input--error' : ''}`}
                                            placeholder="e.g. https://meet.google.com/xyz or Office Room 3B"
                                            maxLength={255}
                                            value={location}
                                            onChange={(e) => { setLocation(e.target.value); setErrors((p) => ({ ...p, location: '' })); }}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        {errors.location
                                            ? <span className="rec-field-error">{errors.location}</span>
                                            : <span />
                                        }
                                        <span style={{ fontSize: 11, color: '#94a3b8' }}>{location.length} / 255</span>
                                    </div>
                                </div>

                            </div>

                            <div className="rec-modal-actions">
                                <button className="rec-btn rec-btn--cancel" onClick={onClose}>Cancel</button>
                                <button className="rec-btn rec-btn--primary" onClick={handlePreview}>
                                    <Mail size={13} /> Preview Email & Continue
                                </button>
                            </div>
                        </>
                    )}

                    {/* ── STEP 2: Preview ── */}
                    {step === 'preview' && (
                        <>
                            <div className="rec-email-preview">
                                <div className="rec-email-preview-header">
                                    <Mail size={12} /> Email Preview
                                </div>
                                <div className="rec-email-meta">
                                    <div className="rec-email-meta-row">
                                        <span className="rec-email-meta-label">To:</span>
                                        <span className="rec-email-meta-value">{applicant.email}</span>
                                    </div>
                                    <div className="rec-email-meta-row">
                                        <span className="rec-email-meta-label">Subject:</span>
                                        <span className="rec-email-meta-value">Interview Schedule – {applicant.position} at Our Company</span>
                                    </div>
                                </div>
                                <div className="rec-email-body">
                                    {buildEmailBody(applicant, { date, time, location: location.trim(), interviewer: '' })}
                                </div>
                            </div>

                            <div className="rec-modal-actions">
                                <button className="rec-btn rec-btn--cancel" onClick={() => setStep('form')}>
                                    ← Back
                                </button>
                                <button className="rec-btn rec-btn--primary" onClick={handleSend}>
                                    <Send size={13} /> Confirm & Send Email
                                </button>
                            </div>
                        </>
                    )}

                    {/* ── STEP 3: Sending / Done ── */}
                    {(step === 'sending' || step === 'done') && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            {/* Saving schedule */}
                            <div className="rec-modal-success">
                                <CheckCircle2 size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                                <div>
                                    <strong>Interview schedule saved to database.</strong><br />
                                    <span style={{ fontWeight: 400 }}>
                                        {fmtDateTime(date, time)} · {location.trim()}
                                    </span>
                                </div>
                            </div>

                            {/* Email dispatch */}
                            {(emailStatus === 'sending' || emailStatus === 'retrying') && (
                                <div className="rec-modal-warn">
                                    <Loader2 size={14} className="rec-spinner" style={{ flexShrink: 0, marginTop: 1 }} />
                                    <span>
                                        {emailStatus === 'retrying'
                                            ? 'Email dispatch failed. Retrying…'
                                            : 'Dispatching email notification via SMTP…'
                                        }
                                    </span>
                                </div>
                            )}
                            {emailStatus === 'sent' && (
                                <div className="rec-modal-success">
                                    <Mail size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                                    <div>
                                        <strong>Email notification sent successfully.</strong><br />
                                        <span style={{ fontWeight: 400 }}>Dispatched to {applicant.email}</span>
                                    </div>
                                </div>
                            )}
                            {emailStatus === 'failed' && (
                                <div className="rec-modal-error">
                                    <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                                    <div>
                                        <strong>Email dispatch failed after retry.</strong><br />
                                        <span>{emailError}</span>
                                    </div>
                                </div>
                            )}

                            {/* Audit log confirmation */}
                            {step === 'done' && (
                                <div className="rec-modal-success">
                                    <CheckCircle2 size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                                    <span>Audit log entry generated — Action: Interview Scheduled · Target: {applicant.email}</span>
                                </div>
                            )}

                            {step === 'done' && (
                                <div className="rec-modal-actions" style={{ marginTop: 4 }}>
                                    <button className="rec-btn rec-btn--primary" onClick={onClose}>
                                        <CheckCircle2 size={13} /> Done
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── UpdateStatusModal ────────────────────────────────────────────────────────

interface UpdateStatusModalProps {
    applicant: ApplicantRecord;
    onClose: () => void;
    onConfirm: (
        applicantId: string,
        newStatus: RecruitmentStatus,
        remarks: string,
    ) => Promise<void>;
    /** Called when admin picks "Interview Scheduled" so the scheduling form can open */
    onNeedsSchedule?: (applicant: ApplicantRecord) => void;
}

function UpdateStatusModal({ applicant, onClose, onConfirm, onNeedsSchedule }: UpdateStatusModalProps) {
    const available: RecruitmentStatus[] = STATUS_TRANSITIONS[applicant.currentStatus] ?? [];
    const [newStatus, setNewStatus] = useState<RecruitmentStatus | ''>('');
    const [remarks, setRemarks] = useState<string>('');
    const [submitting, setSubmitting] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const selectedMeta: StatusMeta | null = newStatus ? STATUS_META[newStatus as RecruitmentStatus] : null;

    const handleSubmit = async (): Promise<void> => {
        if (!newStatus) { setError('Please select a new status.'); return; }
        setError('');
        setSubmitting(true);
        try {
            await onConfirm(applicant.applicantId, newStatus as RecruitmentStatus, remarks.trim());
            // If moving to Interview Scheduled, open scheduling form
            if (newStatus === 'Interview Scheduled' && onNeedsSchedule) {
                onNeedsSchedule(applicant);
            }
            onClose();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Something went wrong.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="rec-overlay" onClick={onClose}>
            <div className="rec-modal rec-modal--sm" onClick={(e) => e.stopPropagation()}>
                <div className="rec-modal-header">
                    <div>
                        <h3 className="rec-modal-title">Update Application Status</h3>
                        <p className="rec-modal-subtitle">Ref: <code className="rec-modal-ref">{applicant.referenceNumber || applicant.applicantId}</code></p>
                    </div>
                    <button className="rec-close-btn" onClick={onClose}><X size={14} /></button>
                </div>
                <div className="rec-modal-body">
                    <div className="rec-applicant-strip">
                        <div className="rec-avatar">{applicant.fullName.charAt(0).toUpperCase()}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="rec-applicant-strip-name">{applicant.fullName}</div>
                            <div className="rec-applicant-strip-pos">{applicant.position}</div>
                        </div>
                        <StatusBadge status={applicant.currentStatus} />
                    </div>

                    <label className="rec-field-label">New Status <span>*</span></label>
                    {available.length === 0 ? (
                        <div className="rec-no-transitions"><XCircle size={14} /> No further transitions available.</div>
                    ) : (
                        <div className="rec-status-options">
                            {available.map((s) => {
                                const m = STATUS_META[s];
                                const selected = newStatus === s;
                                return (
                                    <label key={s} className="rec-status-option"
                                        style={selected ? { borderColor: m.border, background: m.bg } : {}}>
                                        <input type="radio" name="newStatus" value={s} checked={selected}
                                            onChange={() => { setNewStatus(s); setError(''); }}
                                            style={{ accentColor: m.color }} />
                                        <div className="rec-status-option-icon"
                                            style={{ background: m.bg, color: m.color, borderColor: m.border }}>{m.icon}</div>
                                        <div style={{ flex: 1 }}>
                                            <span className="rec-status-option-text"
                                                style={selected ? { color: m.color, fontWeight: 700 } : {}}>{s}</span>
                                            {s === 'Interview Scheduled' && (
                                                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                                                    You'll be prompted to schedule the interview
                                                </div>
                                            )}
                                        </div>
                                        {selected && <CheckCircle2 size={14} color={m.color} />}
                                    </label>
                                );
                            })}
                        </div>
                    )}

                    <div className="rec-textarea-wrap">
                        <label className="rec-field-label">Admin Remarks <span className="rec-field-optional">(optional)</span></label>
                        <textarea className="rec-textarea" rows={3} maxLength={500}
                            placeholder="Add a note for this status change…"
                            value={remarks} onChange={(e) => setRemarks(e.target.value)} />
                        <div className="rec-char-count">{remarks.length} / 500</div>
                    </div>

                    {error && <div className="rec-modal-error"><AlertCircle size={13} />{error}</div>}

                    <div className="rec-modal-actions">
                        <button className="rec-btn rec-btn--cancel" onClick={onClose} disabled={submitting}>Cancel</button>
                        <button className="rec-btn rec-btn--dynamic" onClick={handleSubmit}
                            disabled={submitting || !newStatus || available.length === 0}
                            style={{
                                background: newStatus && selectedMeta ? selectedMeta.color : '#4318ff',
                                opacity: submitting || !newStatus ? 0.6 : 1,
                                cursor: submitting || !newStatus ? 'not-allowed' : 'pointer',
                            }}>
                            {submitting
                                ? <><Loader2 size={13} className="rec-spinner" /> Updating…</>
                                : <><RefreshCw size={13} /> Update Status</>
                            }
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── ApplicantDetailModal ─────────────────────────────────────────────────────

interface ApplicantDetailModalProps {
    applicant: ApplicantRecord;
    onClose: () => void;
    onUpdateStatus: (applicant: ApplicantRecord) => void;
    onReschedule: (applicant: ApplicantRecord) => void;
}

function ApplicantDetailModal({ applicant, onClose, onUpdateStatus, onReschedule }: ApplicantDetailModalProps) {
    const hasTransitions = (STATUS_TRANSITIONS[applicant.currentStatus]?.length ?? 0) > 0;
    const [onboardingStatus, setOnboardingStatus] = useState<string | null>(null);

    function CollapsibleSection({ title, children, defaultOpen }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
        const [open, setOpen] = useState(defaultOpen ?? false);
        return (
            <div style={{ marginTop: 16, border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
                <div onClick={() => setOpen(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#f8fafc', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#1e293b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    <span style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', fontSize: 10 }}>▶</span>
                    {title}
                </div>
                {open && <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>{children}</div>}
            </div>
        );
    }

    function DetailRow({ label, value, link }: { label: string; value: string; link?: string }) {
        return (
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13 }}>
                <span style={{ color: '#64748b', fontWeight: 500 }}>{label}</span>
                {link ? (
                    <a href={link} target="_blank" rel="noopener noreferrer" style={{ color: '#4318ff', fontWeight: 600, textDecoration: 'none' }}>{value}</a>
                ) : (
                    <span style={{ color: '#0f172a', fontWeight: 600, textAlign: 'right' }}>{value || '—'}</span>
                )}
            </div>
        );
    }

    useEffect(() => {
        if (applicant.currentStatus === 'Job Offered') {
            axios.get(`/api/recruitment/${applicant.applicantId}/onboarding-link`)
                .then((res) => {
                    const data = res.data as any;
                    if (data?.isSuccess && data.data) {
                        setOnboardingStatus(data.data.tokenStatus);
                    } else {
                        setOnboardingStatus(null);
                    }
                })
                .catch(() => setOnboardingStatus(null));
        }
    }, [applicant.applicantId, applicant.currentStatus]);

    return (
        <div className="rec-overlay" onClick={onClose}>
            <div className="rec-modal rec-modal--md rec-modal--scrollable" onClick={(e) => e.stopPropagation()}>
                <div className="rec-modal-header rec-modal-header--sticky">
                    <div>
                        <h3 className="rec-modal-title">Application Details</h3>
                        <p className="rec-modal-subtitle">Ref: <code className="rec-modal-ref">{applicant.referenceNumber || applicant.applicantId}</code></p>
                    </div>
                    <button className="rec-close-btn" onClick={onClose}><X size={14} /></button>
                </div>
                <div className="rec-modal-body">
                    <div className="rec-detail-hero">
                        <div className="rec-avatar rec-avatar--lg">{applicant.fullName.charAt(0).toUpperCase()}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="rec-detail-name">{applicant.fullName}</div>
                            <div className="rec-detail-position">{applicant.position}</div>
                        </div>
                        <RecruitmentStatusBadge status={applicant.currentStatus} />
                    </div>

                    <div className="rec-detail-grid">
                        {([
                            { label: 'Email', value: applicant.email },
                            { label: 'Contact', value: applicant.contactNumber || '—' },
                            { label: 'Applied', value: fmtDate(applicant.submittedAt) },
                            { label: 'Last Updated', value: applicant.updatedAt ? fmtDate(applicant.updatedAt) : '—' },
                        ] as { label: string; value: string }[]).map(({ label, value }) => (
                            <div key={label} className="rec-detail-cell">
                                <span className="rec-detail-cell-label">{label}</span>
                                <span className="rec-detail-cell-value">{value}</span>
                            </div>
                        ))}
                    </div>

                    {/* Collapsible details */}
                    <CollapsibleSection title="Personal Information">
                        <DetailRow label="First Name" value={applicant.firstName} />
                        <DetailRow label="Middle Name" value={applicant.middleName} />
                        <DetailRow label="Last Name" value={applicant.lastName} />
                        <DetailRow label="Suffix" value={applicant.suffix} />
                        <DetailRow label="Gender" value={applicant.gender} />
                        <DetailRow label="Civil Status" value={applicant.civilStatus} />
                        <DetailRow label="Email" value={applicant.email} />
                        <DetailRow label="Contact Number" value={applicant.contactNumber} />
                        <DetailRow label="Email Verified" value={applicant.isEmailVerified ? 'Yes' : 'No'} />
                    </CollapsibleSection>

                    <CollapsibleSection title="Address">
                        <DetailRow label="Current Address" value={applicant.currentResidentialAddress} />
                        <DetailRow label="Permanent Address" value={applicant.permanentAddress} />
                    </CollapsibleSection>

                    <CollapsibleSection title="Government Identifiers">
                        <DetailRow label="SSS Number" value={applicant.sssNumber} />
                        <DetailRow label="PhilHealth Number" value={applicant.philHealthNumber} />
                        <DetailRow label="Pag-IBIG Number" value={applicant.pagIBIGNumber} />
                        <DetailRow label="TIN" value={applicant.tin} />
                    </CollapsibleSection>

                    <CollapsibleSection title="Financial & Payroll Data">
                        <DetailRow label="Bank Name" value={applicant.bankName} />
                        <DetailRow label="Bank Account Name" value={applicant.bankAccountName} />
                        <DetailRow label="Bank Account Number" value={applicant.bankAccountNumber} />
                    </CollapsibleSection>

                    <CollapsibleSection title="Documents">
                        {applicant.nbiClearanceFilePath && <DetailRow label="NBI Clearance" value="View" link={applicant.nbiClearanceFilePath} />}
                        {applicant.medicalClearanceFilePath && <DetailRow label="Medical Clearance" value="View" link={applicant.medicalClearanceFilePath} />}
                        {applicant.psaBirthCertificateFilePath && <DetailRow label="PSA Birth Cert" value="View" link={applicant.psaBirthCertificateFilePath} />}
                        {applicant.resumeFilePath && <DetailRow label="Resume" value="View" link={applicant.resumeFilePath} />}
                        {applicant.signedEmploymentContractFilePath && <DetailRow label="Employment Contract" value="View" link={applicant.signedEmploymentContractFilePath} />}
                        {!applicant.nbiClearanceFilePath && !applicant.medicalClearanceFilePath && !applicant.psaBirthCertificateFilePath && !applicant.resumeFilePath && !applicant.signedEmploymentContractFilePath && (
                            <span style={{ fontSize: 13, color: '#94a3b8' }}>No documents uploaded</span>
                        )}
                    </CollapsibleSection>

                    <CollapsibleSection title="Emergency Contact">
                        <DetailRow label="Name" value={applicant.emergencyContactName} />
                        <DetailRow label="Relationship" value={applicant.emergencyContactRelationship} />
                        <DetailRow label="Mobile Number" value={applicant.emergencyContactMobileNumber} />
                    </CollapsibleSection>

                    <CollapsibleSection title="Education & Qualifications">
                        <DetailRow label="Highest Education" value={applicant.highestEducationalAttainment} />
                        <DetailRow label="Institution" value={applicant.institution} />
                        <DetailRow label="Degree / Field of Study" value={applicant.degree} />
                        <DetailRow label="Year Graduated" value={applicant.yearGraduated} />
                        <DetailRow label="Licenses/Certifications" value={applicant.professionalLicensesCertifications} />
                        <DetailRow label="Dependents" value={applicant.declaredDependents} />
                    </CollapsibleSection>

                    {applicant.adminRemarks && (
                        <div className="rec-remarks-strip">
                            <span className="rec-remarks-label">Admin Remarks</span>
                            <p className="rec-remarks-text">{applicant.adminRemarks}</p>
                        </div>
                    )}

                    {/* Interview card */}
                    {applicant.interviewDetails && (
                        <>
                            <span className="rec-section-label">Interview Scheduled</span>
                            <InterviewCard details={applicant.interviewDetails} />
                            <button className="rec-btn rec-btn--outline" style={{ marginTop: 8 }}
                                onClick={() => { onClose(); onReschedule(applicant); }}>
                                <RefreshCw size={13} /> Reschedule
                            </button>
                        </>
                    )}

                    {/* Onboarding status */}
                    {applicant.currentStatus === 'Job Offered' && (
                        <>
                            <span className="rec-section-label">Onboarding Link</span>
                            <div className="rec-interview-card" style={{ background: 'rgba(5,205,153,0.04)', border: '1px solid rgba(5,205,153,0.18)' }}>
                                <div className="rec-interview-rows">
                                    <div className="rec-interview-row">
                                        <Mail size={13} className="rec-interview-row-icon" style={{ color: '#065f46' }} />
                                        <span>
                                            Status: <strong>{onboardingStatus ?? 'Not generated yet'}</strong>
                                        </span>
                                    </div>
                                    {onboardingStatus === 'Active' && (
                                        <div className="rec-modal-success" style={{ margin: '8px 0 0' }}>
                                            <CheckCircle2 size={14} />
                                            <span>Onboarding link has been sent to the applicant.</span>
                                        </div>
                                    )}
                                    {onboardingStatus === 'Used' && (
                                        <div className="rec-modal-success" style={{ margin: '8px 0 0' }}>
                                            <CheckCircle2 size={14} />
                                            <span>Applicant has completed onboarding.</span>
                                        </div>
                                    )}
                                    {onboardingStatus === 'Expired' && (
                                        <div className="rec-modal-warn" style={{ margin: '8px 0 0' }}>
                                            <AlertCircle size={14} />
                                            <span>Onboarding link has expired. Resend a new link.</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    <span className="rec-section-label">Application Progress</span>
                    <ApplicantTimeline history={applicant.statusHistory ?? []} currentStatus={applicant.currentStatus} />

                    <div className="rec-modal-actions" style={{ marginTop: 24 }}>
                        <button className="rec-btn rec-btn--cancel" onClick={onClose}>Close</button>
                        {hasTransitions && (
                            <button className="rec-btn rec-btn--primary"
                                onClick={() => { onClose(); onUpdateStatus(applicant); }}>
                                <RefreshCw size={13} /> Update Status
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── RecruitmentTab ───────────────────────────────────────────────────────────

interface RecruitmentTabProps {
    onSuccess?: (msg: string) => void;
    onError?: (msg: string) => void;
}

export default function RecruitmentTab({ onSuccess, onError: _onError }: RecruitmentTabProps) {
    const { success, error } = useToast();
    const [applicants, setApplicants] = useState<ApplicantRecord[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [page, setPage] = useState<number>(1);
    const [totalPages, setTotalPages] = useState<number>(1);
    const [totalCount, setTotalCount] = useState<number>(0);

    const [search, setSearch] = useState<string>('');
    const [filterStatus, setFilterStatus] = useState<RecruitmentStatus | ''>('');
    const [filterPosition, setFilterPosition] = useState<string>('');

    const [detailApplicant, setDetailApplicant] = useState<ApplicantRecord | null>(null);
    const [updateApplicant, setUpdateApplicant] = useState<ApplicantRecord | null>(null);
    const [scheduleApplicant, setScheduleApplicant] = useState<ApplicantRecord | null>(null);

    const [positions, setPositions] = useState<{ id: string; name: string }[]>([]);

    useEffect(() => {
        axios.get('/api/public/apply/active-positions')
            .then((res) => {
                const body = res.data as any;
                if (body?.isSuccess && Array.isArray(body.data)) {
                    setPositions(body.data.map((p: any) => ({ id: p.jobPositionId, name: p.title })));
                }
            })
            .catch(() => { /* positions remain empty */ });
    }, []);

    const fetchApplicants = useCallback(async (p: number = 1): Promise<void> => {
        setLoading(true);
        try {
            const params: Record<string, string | number> = { pageNumber: p, pageSize: PAGE_SIZE };
            if (filterStatus) params.currentStatus = filterStatus;
            if (filterPosition && positions.length > 0) {
                const match = positions.find((pos) => pos.name === filterPosition);
                if (match) params.jobPositionId = match.id;
            }
            if (search) params.search = search;

            const res = await axios.get('/api/recruitment/dashboard', { params });
            const apiResult = res.data as any;
            if (apiResult?.isSuccess && apiResult.data) {
                const paginated = apiResult.data;
                const mapped: ApplicantRecord[] = (paginated.data || []).map((item: any) => ({
                    applicantId: item.applicantRecordId,
                    referenceNumber: item.referenceNumber,
                    fullName: item.fullName,
                    firstName: item.firstName || '',
                    middleName: item.middleName || '',
                    lastName: item.lastName || '',
                    suffix: item.suffix || '',
                    gender: item.gender || '',
                    civilStatus: item.civilStatus || '',
                    email: item.emailAddress,
                    contactNumber: item.contactNumber,
                    currentResidentialAddress: item.currentResidentialAddress || '',
                    permanentAddress: item.permanentAddress || '',
                    sssNumber: item.sssNumber || '',
                    philHealthNumber: item.philHealthNumber || '',
                    pagIBIGNumber: item.pagIBIGNumber || '',
                    tin: item.tin || '',
                    bankName: item.bankName || '',
                    bankAccountName: item.bankAccountName || '',
                    bankAccountNumber: item.bankAccountNumber || '',
                    nbiClearanceFilePath: item.nbiClearanceFilePath || '',
                    medicalClearanceFilePath: item.medicalClearanceFilePath || '',
                    psaBirthCertificateFilePath: item.psaBirthCertificateFilePath || '',
                    resumeFilePath: item.resumeFilePath || '',
                    signedEmploymentContractFilePath: item.signedEmploymentContractFilePath || '',
                    emergencyContactName: item.emergencyContactName || '',
                    emergencyContactRelationship: item.emergencyContactRelationship || '',
                    emergencyContactMobileNumber: item.emergencyContactMobileNumber || '',
                    declaredDependents: item.declaredDependents || '',
                    highestEducationalAttainment: item.highestEducationalAttainment || '',
                    institution: item.institution || '',
                    degree: item.degree || '',
                    yearGraduated: item.yearGraduated || '',
                    professionalLicensesCertifications: item.professionalLicensesCertifications || '',
                    isEmailVerified: item.isEmailVerified ?? false,
                    position: item.jobPositionName,
                    currentStatus: item.status as RecruitmentStatus,
                    submittedAt: item.createdAt,
                    updatedAt: item.updatedAt || null,
                    adminRemarks: item.adminRemarks || null,
                    resumeUrl: item.resumeFilePath || null,
                    statusHistory: (item.statusHistory || []).map((h: any) => ({
                        status: h.status,
                        changedAt: h.changedAt,
                        changedBy: h.changedBy,
                        remarks: h.remarks || '',
                    })),
                    interviewDetails: item.interviewDate
                        ? { date: item.interviewDate.slice(0, 10), time: item.interviewTime || '', location: item.locationOrLink || '', interviewer: item.interviewerName || '' }
                        : null,
                }));
                setApplicants(mapped);
                setTotalPages(paginated.totalPages ?? 1);
                setTotalCount(paginated.totalRecords ?? 0);
            } else {
                setApplicants([]);
                setTotalPages(1);
                setTotalCount(0);
            }
            setPage(p);
        } catch (err) {
            console.error('Failed to fetch applicants:', err);
            setApplicants([]);
        } finally {
            setLoading(false);
        }
    }, [search, filterStatus, filterPosition, positions]);

    useEffect(() => {
        const t = setTimeout(() => fetchApplicants(1), 300);
        return () => clearTimeout(t);
    }, [fetchApplicants]);

    // Called after UpdateStatusModal confirms — updates status via API
    const handleUpdateStatus = async (
        applicantId: string,
        newStatus: RecruitmentStatus,
        remarks: string,
    ): Promise<void> => {
        const applicant = applicants.find((a) => a.applicantId === applicantId);
        if (!applicant) throw new Error('Applicant not found.');
        if (!(STATUS_TRANSITIONS[applicant.currentStatus] ?? []).includes(newStatus)) throw new Error('Invalid status transition.');

        const res = await axios.put('/api/recruitment/status', {
            applicantRecordId: applicantId,
            newStatus,
            remarks: remarks || null,
        });
        const apiResult = res.data as any;
        if (!apiResult?.isSuccess) {
            throw new Error(apiResult?.message || 'Failed to update status.');
        }

        await fetchApplicants(page);

        if (newStatus !== 'Interview Scheduled') {
            success('Applicant status updated successfully.');
        }
    };

    // Called by InterviewSchedulingModal when scheduling is complete
    const handleInterviewScheduled = (applicantId: string, details: InterviewDetails): void => {
        const now = new Date().toISOString();
        const wasReschedule = applicants.some(a => a.applicantId === applicantId && !!a.interviewDetails);
        setApplicants((prev) =>
            prev.map((a) =>
                a.applicantId === applicantId
                    ? {
                        ...a,
                        interviewDetails: { ...details, emailSentAt: details.emailSentAt ?? now },
                        updatedAt: now,
                    }
                    : a,
            ),
        );
        success(wasReschedule ? 'Interview rescheduled and email notification sent successfully.' : 'Interview scheduled and email notification sent successfully.');
        setScheduleApplicant(null);
    };

    const positionNames: string[] = positions.map((p) => p.name).sort();

    const counts = {
        total: totalCount,
        pending: applicants.filter((a) => a.currentStatus === 'Pending Review').length,
        interview: applicants.filter((a) => a.currentStatus === 'Interview Scheduled').length,
        offered: applicants.filter((a) => a.currentStatus === 'Job Offered').length,
        rejected: applicants.filter((a) => a.currentStatus === 'Rejected').length,
    };

    return (
        <>
            <style>{css}</style>

            <div className="rec-content">
                {/* ── Stat Cards ── */}
                <div className="stats-row">
                    <StatCard icon={<Users size={20} />} variant="primary" label="Total Applicants" value={counts.total} subtext="All time" />
                    <StatCard icon={<Clock size={20} />} variant="warning" label="Pending Review" value={counts.pending} subtext="Awaiting review" />
                    <StatCard icon={<CalendarCheck size={20} />} variant="primary" label="Interview Scheduled" value={counts.interview} subtext="Scheduled" />
                    <StatCard icon={<XCircle size={20} />} variant="danger" label="Rejected" value={counts.rejected} subtext="Not accepted" />
                </div>

                {/* ── DataTable ── */}
                <DataTable
                    searchQuery={search}
                    onSearchChange={setSearch}
                    searchPlaceholder="Search applicant or ID…"
                    filterElements={
                        <>
                            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as RecruitmentStatus | '')}
                                style={{ height: 38, borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)', padding: '0 32px 0 14px', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.82rem', fontWeight: 500, outline: 'none' }}>
                                <option value="">All Statuses</option>
                                {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <select value={filterPosition} onChange={(e) => setFilterPosition(e.target.value)}
                                style={{ height: 38, borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)', padding: '0 32px 0 14px', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.82rem', fontWeight: 500, outline: 'none' }}>
                                <option value="">All Positions</option>
                                {positionNames.map((p) => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </>
                    }
                    headers={['REF ID', 'APPLICANT', 'POSITION APPLIED', 'SUBMITTED', 'CURRENT STATUS', 'ACTIONS']}
                    loading={loading}
                    emptyMessage="No applicants match your filters"
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={(p) => fetchApplicants(p)}
                    totalRecords={totalCount}
                >
                    {applicants.map((a) => (
                        <tr key={a.applicantId} onClick={() => setDetailApplicant(a)} style={{ cursor: 'pointer' }}>
                            <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-secondary)' }}>{a.referenceNumber}</td>
                            <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--primary-hover))', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                                        {a.fullName.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: 13 }}>{a.fullName}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{a.email}</div>
                                    </div>
                                </div>
                            </td>
                            <td style={{ fontSize: 13 }}>{a.position}</td>
                            <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{fmtDate(a.submittedAt)}</td>
                            <td>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                                    <StatusBadge status={a.currentStatus} />
                                    {a.currentStatus === 'Interview Scheduled' && a.interviewDetails && (
                                        <span style={{ fontSize: 10, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 3 }}>
                                            <CalendarDays size={10} /> {fmtDate(a.interviewDetails.date)}
                                        </span>
                                    )}
                                </div>
                            </td>
                            <td onClick={(e) => e.stopPropagation()}>
                                <div style={{ display: 'flex', gap: 6 }}>
                                    <button className="action-icon-btn" onClick={() => setDetailApplicant(a)} title="View"><Eye size={13} /></button>
                                    {(STATUS_TRANSITIONS[a.currentStatus]?.length ?? 0) > 0 && (
                                        <button className="action-icon-btn" onClick={() => setUpdateApplicant(a)} title="Update" style={{ background: 'var(--bg-input)', color: 'var(--primary)' }}><RefreshCw size={13} /></button>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </DataTable>
            </div>

            {/* ── Modals ── */}
            {detailApplicant && (
                <ApplicantDetailModal
                    applicant={detailApplicant}
                    onClose={() => setDetailApplicant(null)}
                    onUpdateStatus={(a) => { setDetailApplicant(null); setUpdateApplicant(a); }}
                    onReschedule={(a) => { setDetailApplicant(null); setScheduleApplicant(a); }}
                />
            )}

            {updateApplicant && (
                <UpdateStatusModal
                    applicant={updateApplicant}
                    onClose={() => setUpdateApplicant(null)}
                    onConfirm={handleUpdateStatus}
                    onNeedsSchedule={(a) => {
                        // Snapshot the updated applicant with the new status before opening scheduler
                        const updated = applicants.find((x) => x.applicantId === a.applicantId) ?? a;
                        setScheduleApplicant({ ...updated, currentStatus: 'Interview Scheduled' });
                    }}
                />
            )}

            {scheduleApplicant && (
                <InterviewSchedulingModal
                    applicant={scheduleApplicant}
                    onClose={() => setScheduleApplicant(null)}
                    onScheduled={handleInterviewScheduled}
                    initialInterview={scheduleApplicant.interviewDetails}
                />
            )}
        </>
    );
}