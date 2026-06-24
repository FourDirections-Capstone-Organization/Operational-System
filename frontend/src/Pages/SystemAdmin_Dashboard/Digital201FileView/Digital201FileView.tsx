import React, { useEffect, useState, useRef } from 'react';
import {
    X,
    FileText,
    Download,
    Upload,
    Trash2,
    Loader2,
    Plus,
    File,
    AlertTriangle,
    CheckCircle2,
    Calendar,
    User,
    Shield,
    Mail,
    Phone,
    Archive,
    Folder,
    RefreshCw,
    Lock,
    CreditCard,
    Building2,
    Smartphone,
    Hash,
    Banknote,
    PhoneCall,
    Pencil,
    Save,
    AlertCircle,
    Eye,
    EyeOff
} from 'lucide-react';
import './Digital201FileView.css';
import { useToast } from '../../../components/Toast/Toast';
import FormModal from '../../../components/FormModal/FormModal';
import ConfirmationModal from '../../../components/ConfirmationModal/ConfirmationModal';

interface ConfirmModalState {
    isOpen: boolean;
    variant: 'neutral' | 'danger' | 'warning' | 'info' | 'success';
    title: string;
    description: React.ReactNode;
    notice?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
}

const CONFIRM_CLOSED: ConfirmModalState = {
    isOpen: false,
    variant: 'neutral',
    title: '',
    description: '',
    onConfirm: () => {},
};

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface EmployeeAttachment {
    employeeAttachmentId: string;
    fileName: string;
    fileUrl: string;
    contentType: string;
    fileSize: number;
    version: number;
    documentType: string;
    isArchived: boolean;
    documentTitle?: string;
    issueDate?: string;
    expiryDate?: string;
    remarks?: string;
}

interface ComplianceData {
    sssNumber: string;
    philhealthNumber: string;
    pagibigNumber: string;
    tinNumber?: string;
    bankName: string;
    bankAccountNumber: string;
    emergencyContactName: string;
    emergencyContactNumber: string;
}

interface Digital201FileData {
    employeeNumber: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    suffix?: string;
    contactNumber: string;
    email: string;
    departmentName?: string;
    jobPositionTitle?: string;
    dateHired: string;
    role: string;
    accountStatus: string;
    attachments: EmployeeAttachment[];
    compliance?: ComplianceData | null;
}

const COMPLIANCE_SSS_REGEX = /^\d{2}-\d{7}-\d{1}$/;
const COMPLIANCE_PHILHEALTH_REGEX = /^\d{2}-\d{9}-\d{1}$/;
const COMPLIANCE_PAGIBIG_REGEX = /^\d{4}-\d{4}-\d{4}$/;
const COMPLIANCE_TIN_REGEX = /^\d{3}-\d{3}-\d{3}-\d{3}$/;
const COMPLIANCE_PH_MOBILE_REGEX = /^09\d{9}$/;

const applyComplianceFormat = (field: string, value: string): string => {
    const digits = value.replace(/\D/g, '');
    if (field === 'sssNumber') {
        if (digits.length <= 2) return digits;
        if (digits.length <= 9) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
        return `${digits.slice(0, 2)}-${digits.slice(2, 9)}-${digits.slice(9, 10)}`;
    }
    if (field === 'philhealthNumber') {
        if (digits.length <= 2) return digits;
        if (digits.length <= 11) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
        return `${digits.slice(0, 2)}-${digits.slice(2, 11)}-${digits.slice(11, 12)}`;
    }
    if (field === 'pagibigNumber') {
        if (digits.length <= 4) return digits;
        if (digits.length <= 8) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
        return `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8, 12)}`;
    }
    if (field === 'tinNumber') {
        if (digits.length <= 3) return digits;
        if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
        if (digits.length <= 9) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
        return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 9)}-${digits.slice(9, 12)}`;
    }
    return value;
};

const validateComplianceField = (field: string, value: string): string => {
    switch (field) {
        case 'sssNumber':
            if (!value.trim()) return 'SSS Number is required.';
            if (!COMPLIANCE_SSS_REGEX.test(value.trim())) return 'Format: XX-XXXXXXX-X';
            return '';
        case 'philhealthNumber':
            if (!value.trim()) return 'PhilHealth Number is required.';
            if (!COMPLIANCE_PHILHEALTH_REGEX.test(value.trim())) return 'Format: XX-XXXXXXXXX-X';
            return '';
        case 'pagibigNumber':
            if (!value.trim()) return 'Pag-IBIG Number is required.';
            if (!COMPLIANCE_PAGIBIG_REGEX.test(value.trim())) return 'Format: XXXX-XXXX-XXXX';
            return '';
        case 'tinNumber':
            if (value.trim() && !COMPLIANCE_TIN_REGEX.test(value.trim())) return 'Format: XXX-XXX-XXX-XXX';
            return '';
        case 'emergencyContactNumber':
            if (value.trim() && !COMPLIANCE_PH_MOBILE_REGEX.test(value.trim())) return 'Must be 11 digits starting with 09.';
            return '';
        default:
            return '';
    }
};

interface Digital201FileViewProps {
    employeeNumber: string;
    onAttachmentsChanged?: (attachments: EmployeeAttachment[]) => void;
    readOnly?: boolean;
}

type TabType = 'employment' | 'compliance' | 'performance' | 'disciplinary';

const DOC_TYPE_CATEGORIES: Record<TabType, string[]> = {
    employment: ['Employment Contract', 'Job Description', 'Resume', 'Onboarding Checklist', 'Other Employment'],
    compliance: ['BIR Tax Form', 'Government ID', 'NBI Clearance', 'Medical Clearance', 'Other Compliance'],
    performance: ['Performance Evaluation', 'Training Certificate', 'Award Certificate', 'Other Performance'],
    disciplinary: ['Incident Report', 'Written Warning', 'Notice of Explanation', 'Other Disciplinary']
};

const TAB_LABELS: Record<TabType, string> = {
    employment: 'Employment',
    compliance: 'Compliance',
    performance: 'Performance',
    disciplinary: 'Disciplinary'
};

// Helper: Formats bytes to MB/KB
const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = 2;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// Helper: Categorizes DTO Document Types to tab categories
const getTabFromDocType = (docType: string): TabType => {
    const type = (docType || '').toLowerCase();
    if (type.includes('contract') || type.includes('resume') || type.includes('onboarding') || type.includes('job description') || type.includes('employment')) {
        return 'employment';
    }
    if (type.includes('tax') || type.includes('clearance') || type.includes('medical') || type.includes('nbi') || type.includes('id') || type.includes('compliance') || type.includes('government')) {
        return 'compliance';
    }
    if (type.includes('performance') || type.includes('review') || type.includes('evaluation') || type.includes('certificate') || type.includes('training')) {
        return 'performance';
    }
    if (type.includes('warning') || type.includes('disciplinary') || type.includes('incident') || type.includes('suspension') || type.includes('explanation')) {
        return 'disciplinary';
    }
    return 'employment'; // Default fallback
};

export default function Digital201FileView({
    employeeNumber,
    onAttachmentsChanged,
    readOnly = false
}: Digital201FileViewProps) {
    const { success, error } = useToast();
    const [confirmModal, setConfirmModal] = useState<ConfirmModalState>(CONFIRM_CLOSED);

    // ── States ────────────────────────────────────────────────────────────────
    const [loading, setLoading] = useState(true);
    const [errStatus, setErrStatus] = useState<number | null>(null);
    const [errMsg, setErrMsg] = useState('');
    const [data, setData] = useState<Digital201FileData | null>(null);
    const [activeTab, setActiveTab] = useState<TabType>('employment');
    const [showArchived, setShowArchived] = useState(false);

    // Sub-modal: Upload
    const [showUpload, setShowUpload] = useState(false);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploadDocType, setUploadDocType] = useState('');
    const [uploading, setUploading] = useState(false);
    const [uploadDirty, setUploadDirty] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Sub-modal: Update (new version)
    const [updateTarget, setUpdateTarget] = useState<EmployeeAttachment | null>(null);
    const [updateFile, setUpdateFile] = useState<File | null>(null);
    const [updateDocType, setUpdateDocType] = useState('');
    const [updating, setUpdating] = useState(false);
    const [updateDirty, setUpdateDirty] = useState(false);
    const updateFileInputRef = useRef<HTMLInputElement>(null);

    // Sub-modal: Archive confirm
    const [archiveTarget, setArchiveTarget] = useState<EmployeeAttachment | null>(null);
    const [archiving, setArchiving] = useState(false);

    // Compliance editing
    const [editingCompliance, setEditingCompliance] = useState(false);
    const [complianceForm, setComplianceForm] = useState({
        sssNumber: '', philhealthNumber: '', pagibigNumber: '', tinNumber: '',
        bankName: '', bankAccountNumber: '',
        emergencyContactName: '', emergencyContactNumber: ''
    });
    const [complianceOriginal, setComplianceOriginal] = useState<typeof complianceForm | null>(null);
    const [showComplianceCancelConfirm, setShowComplianceCancelConfirm] = useState(false);
    const [complianceSaving, setComplianceSaving] = useState(false);
    const [complianceError, setComplianceError] = useState('');
    const [complianceErrors, setComplianceErrors] = useState<Record<string, string>>({});
    const [gatePassword, setGatePassword] = useState('');
    const [gateError, setGateError] = useState('');
    const [gateLoading, setGateLoading] = useState(false);
    const [showGatePassword, setShowGatePassword] = useState(false);

    // ── Fetch Data ────────────────────────────────────────────────────────────
    const fetch201File = async () => {
        setLoading(true);
        setErrStatus(null);
        setErrMsg('');
        try {
            const token = localStorage.getItem('authToken');
            const res = await fetch(`/api/systemadmin/digital-201-file?employeeNumber=${encodeURIComponent(employeeNumber)}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.status === 401 || res.status === 403) {
                setErrStatus(res.status);
                setErrMsg('You do not have authorization to view this employee\'s Digital 201 File (RBAC Policy Restriction).');
                setLoading(false);
                return;
            }

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}: Failed to retrieve file dashboard.`);
            }

            const json = await res.json();
            if (json.isSuccess && json.data) {
                setData(json.data);
                if (onAttachmentsChanged) {
                    onAttachmentsChanged(json.data.attachments ?? []);
                }
            } else {
                throw new Error(json.message || 'Failed to fetch Digital 201 File.');
            }
        } catch (err: any) {
            console.error(err);
            setErrMsg(err.message || 'An error occurred while loading files.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (employeeNumber) {
            fetch201File();
            // Reset tab
            setActiveTab('employment');
            setShowArchived(false);
        }
    }, [employeeNumber]);

    // ── Action Handlers ───────────────────────────────────────────────────────

    // Handle File Drop / Select for Upload
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setUploadFile(e.target.files[0]);
            setUploadDirty(true);
        }
    };

    const handleUpdateFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setUpdateFile(e.target.files[0]);
            setUpdateDirty(true);
        }
    };

    // Trigger Upload
    const handleUploadSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!uploadFile) {
            error('Please select a file to upload.');
            return;
        }
        if (!uploadDocType) {
            error('Please select a document type.');
            return;
        }

        setUploading(true);
        try {
            const token = localStorage.getItem('authToken');
            const formData = new FormData();
            formData.append('File', uploadFile);
            formData.append('DocumentType', uploadDocType);

            const res = await fetch(`/api/systemadmin/documents/upload?employeeNumber=${encodeURIComponent(employeeNumber)}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const json = await res.json();
            if (res.ok && json.isSuccess) {
                success('Document uploaded successfully.');
                setShowUpload(false);
                setUploadFile(null);
                setUploadDocType('');
                setUploadDirty(false);
                await fetch201File();
            } else {
                throw new Error(json.message || 'Upload failed.');
            }
        } catch (err: any) {
            error(err.message || 'Failed to upload document.');
        } finally {
            setUploading(false);
        }
    };

    const handleUploadClose = () => {
        setUploadDirty(false);
        setShowUpload(false);
        setUploadFile(null);
    };

    // Trigger Update
    const handleUpdateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!updateTarget) return;

        setUpdating(true);
        try {
            const token = localStorage.getItem('authToken');
            const formData = new FormData();
            if (updateFile) {
                formData.append('File', updateFile);
            }
            formData.append('DocumentType', updateDocType || updateTarget.documentType);

            const res = await fetch(`/api/systemadmin/documents/${updateTarget.employeeAttachmentId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const json = await res.json();
            if (res.ok && json.isSuccess) {
                success('Document updated successfully.');
                setUpdateTarget(null);
                setUpdateFile(null);
                setUpdateDocType('');
                setUpdateDirty(false);
                await fetch201File();
            } else {
                throw new Error(json.message || 'Update failed.');
            }
        } catch (err: any) {
            error(err.message || 'Failed to update document.');
        } finally {
            setUpdating(false);
        }
    };

    // Trigger Archive
    const handleArchiveSubmit = async () => {
        if (!archiveTarget) return;
        setArchiving(true);
        try {
            const token = localStorage.getItem('authToken');
            const res = await fetch(`/api/systemadmin/documents/${archiveTarget.employeeAttachmentId}/archive`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const json = await res.json();
            if (res.ok && json.isSuccess) {
                success('Document archived successfully.');
                setArchiveTarget(null);
                await fetch201File();
            } else {
                throw new Error(json.message || 'Failed to archive.');
            }
        } catch (err: any) {
            error(err.message || 'Failed to archive document.');
        } finally {
            setArchiving(false);
        }
    };

    // ── Helper Variables ─────────────────────────────────────────────────────
    const attachments = data?.attachments || [];

    // Categorized lists
    const categorized = attachments.reduce<Record<TabType, EmployeeAttachment[]>>((acc, att) => {
        const tab = getTabFromDocType(att.documentType);
        if (att.isArchived && !showArchived) {
            return acc;
        }
        acc[tab].push(att);
        return acc;
    }, { employment: [], compliance: [], performance: [], disciplinary: [] });

    const currentTabAttachments = categorized[activeTab];

    const tabCounts = attachments.reduce<Record<TabType, number>>((acc, att) => {
        if (att.isArchived && !showArchived) return acc;
        const tab = getTabFromDocType(att.documentType);
        acc[tab]++;
        return acc;
    }, { employment: 0, compliance: 0, performance: 0, disciplinary: 0 });

    const openUploadForActiveTab = () => {
        setUploadDocType(DOC_TYPE_CATEGORIES[activeTab][0]);
        setUploadDirty(false);
        setShowUpload(true);
    };

    const openUpdateForAttachment = (att: EmployeeAttachment) => {
        setUpdateTarget(att);
        setUpdateDocType(att.documentType);
        setUpdateFile(null);
        setUpdateDirty(false);
    };

    if (loading) {
        return (
            <div className="d201-view-loading">
                <Loader2 size={36} className="d201-view-spin" />
                <h3>Loading Digital 201 File...</h3>
                <p>We are retrieving employment, compliance, performance, and disciplinary records from the server.</p>
            </div>
        );
    }

    if (errMsg) {
        return (
            <div className="d201-view-error">
                {errStatus === 403 || errStatus === 401 ? (
                    <Lock size={48} className="d201-view-error-icon" style={{ color: 'var(--text-secondary)' }} />
                ) : (
                    <AlertTriangle size={48} className="d201-view-error-icon" />
                )}
                <h3>Access Error</h3>
                <p>{errMsg}</p>
                <button className="d201-view-error-action-btn" onClick={fetch201File}>
                    Try Again
                </button>
            </div>
        );
    }

    return (
        <div className="d201-view-container">
            {/* Top action bar */}
            {!readOnly && (
                <div className="d201-view-header">
                    <button className="d201-view-upload-btn" onClick={openUploadForActiveTab}>
                        <Plus size={14} />
                        Upload Document
                    </button>
                </div>
            )}

            {/* Toolbar area */}
            <div className="d201-view-toolbar">
                <div className="d201-view-navigation">
                    {(Object.keys(TAB_LABELS) as TabType[]).map((tab) => (
                        <button
                            key={tab}
                            className={`d201-view-tab-btn ${activeTab === tab ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab)}
                        >
                            {TAB_LABELS[tab]}
                            <span>{tabCounts[tab]}</span>
                        </button>
                    ))}
                </div>
                <label className="d201-view-toggle-archived">
                    <input
                        type="checkbox"
                        checked={showArchived}
                        onChange={(e) => setShowArchived(e.target.checked)}
                    />
                    Show Archived Documents
                </label>
            </div>

            {/* Compliance data section */}
            {activeTab === 'compliance' && data?.compliance && (
                <div className="d201-compliance-section" style={{ marginBottom: 20, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Shield size={16} color="#065f46" />
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#065f46' }}>Bio-Data & Compliance (Encrypted at Rest)</span>
                        </div>
                        {!editingCompliance && (
                            <button className="btn btn-primary btn-sm" onClick={() => { const vals = { sssNumber: data.compliance!.sssNumber, philhealthNumber: data.compliance!.philhealthNumber, pagibigNumber: data.compliance!.pagibigNumber, tinNumber: data.compliance!.tinNumber || '', bankName: data.compliance!.bankName, bankAccountNumber: data.compliance!.bankAccountNumber, emergencyContactName: data.compliance!.emergencyContactName, emergencyContactNumber: data.compliance!.emergencyContactNumber }; setComplianceForm(vals); setComplianceOriginal(vals); setComplianceErrors({}); setEditingCompliance(true); }}>
                                <Pencil size={11} /> Edit
                            </button>
                        )}
                    </div>
                    {editingCompliance ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {complianceError && <div style={{ display: 'flex', gap: 8, padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 12, color: '#dc2626' }}><AlertCircle size={14} /><span>{complianceError}</span></div>}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                {[
                                    { key: 'sssNumber', label: 'SSS Number', placeholder: 'XX-XXXXXXX-X', format: true },
                                    { key: 'philhealthNumber', label: 'PhilHealth Number', placeholder: 'XX-XXXXXXXXX-X', format: true },
                                    { key: 'pagibigNumber', label: 'Pag-IBIG Number', placeholder: 'XXXX-XXXX-XXXX', format: true },
                                    { key: 'tinNumber', label: 'TIN', placeholder: 'XXX-XXX-XXX-XXX', format: true },
                                    { key: 'bankName', label: 'Bank Name', placeholder: 'e.g. BDO', format: false },
                                    { key: 'bankAccountNumber', label: 'Bank Account', placeholder: 'Account number', format: false },
                                    { key: 'emergencyContactName', label: 'Emergency Contact', placeholder: 'Full name', format: false },
                                    { key: 'emergencyContactNumber', label: 'Emergency Number', placeholder: '09XXXXXXXXX', format: false },
                                ].map(({ key, label, placeholder, format }) => {
                                    const fieldValue = (complianceForm as any)[key] || '';
                                    const fieldErr = complianceErrors[key];
                                    return (
                                        <div key={key}>
                                            <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4, display: 'block' }}>{label}</label>
                                            <input type="text" value={fieldValue}
                                                onChange={e => {
                                                    const raw = e.target.value;
                                                    const val = format ? applyComplianceFormat(key, raw) : raw;
                                                    setComplianceForm(f => ({ ...f, [key]: val }));
                                                    setComplianceErrors(prev => ({ ...prev, [key]: validateComplianceField(key, val) }));
                                                    setComplianceError('');
                                                }}
                                                placeholder={placeholder}
                                                style={{ height: 36, borderRadius: 8, border: `1.5px solid ${fieldErr ? '#dc2626' : '#e2e8f0'}`, padding: '0 10px', fontSize: 13, width: '100%', boxSizing: 'border-box', outline: 'none' }} />
                                            {fieldErr && <span style={{ fontSize: 11, color: '#dc2626', marginTop: 2, display: 'block' }}>{fieldErr}</span>}
                                        </div>
                                    );
                                })}
                            </div>
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                                <button className="btn btn-sm" onClick={() => {
                                    if (!complianceOriginal) { setEditingCompliance(false); return; }
                                    const hasChanges = (Object.keys(complianceForm) as (keyof typeof complianceForm)[]).some(k => complianceForm[k] !== complianceOriginal[k]);
                                    if (hasChanges) { setShowComplianceCancelConfirm(true); } else { setEditingCompliance(false); }
                                }} disabled={complianceSaving}>Cancel</button>
                                <button className="btn btn-primary btn-sm" onClick={async () => {
                                    const errs: Record<string, string> = {};
                                    (['sssNumber', 'philhealthNumber', 'pagibigNumber', 'tinNumber', 'emergencyContactNumber'] as const).forEach(k => {
                                        const val = (complianceForm as any)[k] || '';
                                        const e = validateComplianceField(k, val);
                                        if (e) errs[k] = e;
                                    });
                                    if (Object.keys(errs).length > 0) { setComplianceErrors(errs); return; }
                                    setGatePassword('');
                                    setGateError('');
                                    setShowGatePassword(false);
                                    setConfirmModal({
                                        isOpen: true,
                                        variant: 'info',
                                        title: 'Confirm your identity',
                                        description: (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>Enter your password to save compliance changes.</p>
                                                <div style={{ position: 'relative' }}>
                                                    <input id="compliance-gate-pw" type={showGatePassword ? 'text' : 'password'} placeholder="Enter your current password" style={{ width: '100%', paddingRight: 40, boxSizing: 'border-box', height: 38, borderRadius: 8, border: '1.5px solid #e2e8f0', padding: '0 40px 0 12px', fontSize: 13, outline: 'none' }} autoFocus onChange={e => { setGatePassword(e.target.value); setGateError(''); }} onKeyDown={e => { if (e.key === 'Enter') document.getElementById('compliance-gate-confirm')?.click(); }} />
                                                    <button type="button" onClick={() => setShowGatePassword(p => !p)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }} tabIndex={-1}>{showGatePassword ? <EyeOff size={15} /> : <Eye size={15} />}</button>
                                                </div>
                                                {gateError && <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#dc2626' }}><AlertCircle size={12} />{gateError}</div>}
                                            </div>
                                        ),
                                        confirmLabel: 'Verify & save',
                                        onConfirm: async () => {
                                            const pw = (document.getElementById('compliance-gate-pw') as HTMLInputElement)?.value ?? gatePassword;
                                            if (!pw) { setGateError('Please enter your password.'); return; }
                                            setGateLoading(true);
                                            setGateError('');
                                            try {
                                                const token = localStorage.getItem('authToken');
                                                const adminId = localStorage.getItem('employeeId') ?? '';
                                                const verifyRes = await fetch('/api/authentication/verify-password', {
                                                    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                                    body: JSON.stringify({ employeeID: adminId, password: pw }),
                                                });
                                                const verifyData = await verifyRes.json().catch(() => ({}));
                                                if (!verifyData.isSuccess) { throw new Error(verifyData.message || verifyData.Message || 'Incorrect password.'); }
                                                setConfirmModal(CONFIRM_CLOSED);
                                                setComplianceSaving(true);
                                                setComplianceError('');
                                                try {
                                                    const saveRes = await fetch('/api/systemadmin/update-statutory-records', {
                                                        method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                                        body: JSON.stringify({ employeeNumber, sssNumber: complianceForm.sssNumber, philhealthNumber: complianceForm.philhealthNumber, pagibigNumber: complianceForm.pagibigNumber, tinNumber: complianceForm.tinNumber, bankName: complianceForm.bankName, bankAccountNumber: complianceForm.bankAccountNumber, emergencyContactName: complianceForm.emergencyContactName, emergencyContactNumber: complianceForm.emergencyContactNumber }),
                                                    });
                                                    if (!saveRes.ok) { const err = await saveRes.json().catch(() => ({})); throw new Error(err.message || 'Save failed.'); }
                                                    const result = await saveRes.json();
                                                    if (!result.isSuccess) throw new Error(result.message || 'Save failed.');
                                                    setEditingCompliance(false);
                                                    success('Compliance records updated successfully.');
                                                    fetch201File();
                                                } catch (err: any) { setComplianceError(err.message ?? 'Failed to save.'); } finally { setComplianceSaving(false); }
                                            } catch (err: any) { setGateError(err.message ?? 'Incorrect password.'); } finally { setGateLoading(false); }
                                        },
                                    });
                                }} disabled={complianceSaving}>
                                    {complianceSaving ? <><Loader2 size={13} className="spin" /> Saving…</> : <><Save size={13} /> Save</>}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            {[
                                { icon: <Hash size={14} />, label: 'SSS Number', value: data.compliance.sssNumber },
                                { icon: <Hash size={14} />, label: 'PhilHealth Number', value: data.compliance.philhealthNumber },
                                { icon: <Hash size={14} />, label: 'Pag-IBIG Number', value: data.compliance.pagibigNumber },
                                { icon: <Hash size={14} />, label: 'TIN', value: data.compliance.tinNumber || '—' },
                                { icon: <Building2 size={14} />, label: 'Bank Name', value: data.compliance.bankName },
                                { icon: <Banknote size={14} />, label: 'Bank Account', value: data.compliance.bankAccountNumber },
                                { icon: <User size={14} />, label: 'Emergency Contact', value: data.compliance.emergencyContactName },
                                { icon: <PhoneCall size={14} />, label: 'Emergency Number', value: data.compliance.emergencyContactNumber },
                            ].map(({ icon, label, value }) => (
                                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: '#fff', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                                    <div style={{ color: '#64748b', flexShrink: 0 }}>{icon}</div>
                                    <div>
                                        <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                                        <div style={{ fontSize: 13, color: '#0f172a', fontWeight: 600 }}>{value}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Document list or empty state */}
            {currentTabAttachments.length === 0 ? (
                <div className="d201-view-empty">
                    <FileText size={36} />
                    <div className="d201-view-empty-title">No documents found</div>
                    <div className="d201-view-empty-text">
                        There are no documents uploaded under the **{TAB_LABELS[activeTab]}** category for this employee yet.
                    </div>
                </div>
            ) : (
                <div className="d201-view-grid">
                    {currentTabAttachments.map((att) => (
                        <div key={att.employeeAttachmentId} className={`d201-view-card ${att.isArchived ? 'archived-card' : ''}`}>
                            <div className="d201-view-card-main">
                                <div className="d201-view-file-icon">
                                    <FileText size={18} />
                                </div>
                                <div className="d201-view-file-info">
                                    <div className="d201-view-file-name" title={att.documentTitle || att.fileName}>
                                        {att.documentTitle || att.fileName}
                                    </div>
                                    <div className="d201-view-file-meta">
                                        <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 500 }} title={att.fileName}>{att.fileName}</span>
                                    </div>
                                    <div className="d201-view-file-meta">
                                        <span className="d201-view-version-badge">v{att.version}</span>
                                        <span>{formatBytes(att.fileSize)}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="d201-view-card-footer">
                                <span className="d201-view-doc-type-label" title={att.documentType}>
                                    {att.documentType}
                                </span>
                                <div className="d201-view-card-actions">
                                    <a
                                        href={att.fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="d201-view-action-btn"
                                        title="Download Document"
                                    >
                                        <Download size={13} />
                                    </a>
                                    {!att.isArchived && !readOnly && (
                                        <>
                                            <button
                                                className="d201-view-action-btn"
                                                onClick={() => openUpdateForAttachment(att)}
                                                title="Upload New Version"
                                            >
                                                <RefreshCw size={13} />
                                            </button>
                                            <button
                                                className="d201-view-action-btn delete"
                                                onClick={() => setArchiveTarget(att)}
                                                title="Archive Document"
                                            >
                                                <Archive size={13} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}



            {/* ── SUB-MODAL: UPLOAD FILE ────────────────────────────────────────── */}
            <FormModal
                isOpen={showUpload}
                onClose={handleUploadClose}
                title="Upload Document"
                subtitle={`Choose a file to upload to the ${TAB_LABELS[activeTab]} category.`}
                onSubmit={handleUploadSubmit}
                submitLabel="Upload"
                cancelLabel="Cancel"
                isSubmitting={uploading}
                submitDisabled={!uploadFile}
                size="md"
                confirmOnCancel={true}
                dirty={uploadDirty}
            >
                <div className="fm-section">
                    <div className="fm-field-grid">
                        <div className="fm-field fm-field-full">
                            <label className="fm-label">Document Category (Tab)</label>
                            <input type="text" value={TAB_LABELS[activeTab]} disabled className="fm-input" style={{ background: '#f1f5f9', color: '#64748b' }} />
                        </div>

                        <div className="fm-field fm-field-full">
                            <label className="fm-label">Specific Document Type</label>
                            <select value={uploadDocType} onChange={(e) => { setUploadDocType(e.target.value); setUploadDirty(true); }} required className="fm-select">
                                {DOC_TYPE_CATEGORIES[activeTab].map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>

                        <div className="fm-field fm-field-full">
                            <label className="fm-label">Select File</label>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                style={{ display: 'none' }}
                                required
                            />
                            {!uploadFile ? (
                                <div className="d201-file-select-zone" onClick={() => fileInputRef.current?.click()}>
                                    <Upload size={24} />
                                    <span>Click to browse and choose a file</span>
                                    <span style={{ fontSize: 11, color: '#94a3b8' }}>Supports PDF, PNG, JPG, DOCX</span>
                                </div>
                            ) : (
                                <div className="d201-selected-file-preview">
                                    <div className="d201-selected-file-preview-left">
                                        <FileText size={16} color="var(--primary)" />
                                        <span>{uploadFile.name}</span>
                                    </div>
                                    <button
                                        type="button"
                                        className="d201-action-btn delete"
                                        onClick={() => { setUploadFile(null); setUploadDirty(true); }}
                                        style={{ border: 'none', background: 'transparent' }}
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </FormModal>

            {/* ── SUB-MODAL: UPDATE FILE (NEW VERSION) ───────────────────────────── */}
            <FormModal
                isOpen={!!updateTarget}
                onClose={() => { setUpdateTarget(null); setUpdateFile(null); setUpdateDirty(false); }}
                title="Update Document Version"
                subtitle={updateTarget ? `Update document version and details for ${updateTarget.fileName}.` : ''}
                onSubmit={handleUpdateSubmit}
                submitLabel="Save Changes"
                cancelLabel="Cancel"
                isSubmitting={updating}
                size="md"
                confirmOnCancel={true}
                dirty={updateDirty}
            >
                {updateTarget && (
                    <div className="fm-section">
                        <div className="d201-notice-card" style={{ marginBottom: '16px' }}>
                            <AlertTriangle size={15} />
                            <div>
                                This will update <strong>{updateTarget.fileName}</strong>. A new version (v{updateTarget.version + 1}) will be created automatically.
                            </div>
                        </div>

                        <div className="fm-field-grid">
                            <div className="fm-field fm-field-full">
                                <label className="fm-label">Document Category (Tab)</label>
                                <input type="text" value={TAB_LABELS[activeTab]} disabled className="fm-input" style={{ background: '#f1f5f9', color: '#64748b' }} />
                            </div>

                            <div className="fm-field fm-field-full">
                                <label className="fm-label">Specific Document Type</label>
                                <select value={updateDocType} onChange={(e) => { setUpdateDocType(e.target.value); setUpdateDirty(true); }} required className="fm-select">
                                    {DOC_TYPE_CATEGORIES[activeTab].map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="fm-field fm-field-full">
                                <label className="fm-label">Upload New File (Optional)</label>
                                <input
                                    type="file"
                                    ref={updateFileInputRef}
                                    onChange={handleUpdateFileChange}
                                    style={{ display: 'none' }}
                                />
                                {!updateFile ? (
                                    <div className="d201-file-select-zone" onClick={() => updateFileInputRef.current?.click()}>
                                        <Upload size={20} />
                                        <span>Click to choose a replacement file</span>
                                        <span style={{ fontSize: 11, color: '#94a3b8' }}>Leave empty to keep existing file and only update metadata</span>
                                    </div>
                                ) : (
                                    <div className="d201-selected-file-preview">
                                        <div className="d201-selected-file-preview-left">
                                            <FileText size={16} color="var(--primary)" />
                                            <span>{updateFile.name}</span>
                                        </div>
                                        <button
                                            type="button"
                                            className="d201-action-btn delete"
                                            onClick={() => { setUpdateFile(null); setUpdateDirty(true); }}
                                            style={{ border: 'none', background: 'transparent' }}
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </FormModal>

            {/* ── SUB-MODAL: ARCHIVE CONFIRM ────────────────────────────────────── */}
            {archiveTarget && (
                <div className="d201-submodal-overlay">
                    <div className="d201-submodal" onClick={(e) => e.stopPropagation()}>
                        <div className="d201-submodal-header">
                            <h3>Archive Document</h3>
                            <button className="d201-submodal-close" onClick={() => setArchiveTarget(null)}>
                                <X size={16} />
                            </button>
                        </div>
                        <div className="d201-submodal-body">
                            <p style={{ margin: 0, fontSize: 14, color: '#334155', lineHeight: 1.5 }}>
                                Are you sure you want to archive <strong>{archiveTarget.fileName}</strong>?
                            </p>
                            <p style={{ margin: 0, fontSize: 12.5, color: '#64748b', lineHeight: 1.5 }}>
                                Archived files will be hidden from the active category tables but can be viewed by checking "Show Archived Documents" at any time.
                            </p>
                        </div>
                        <div className="d201-submodal-footer">
                            <button type="button" className="d201-btn-cancel" onClick={() => setArchiveTarget(null)}>
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="d201-btn-submit"
                                onClick={handleArchiveSubmit}
                                style={{ background: '#d97706', borderColor: '#d97706' }}
                                disabled={archiving}
                            >
                                {archiving ? (
                                    <>
                                        <Loader2 size={13} className="d201-spin" />
                                        Archiving...
                                    </>
                                ) : (
                                    <>
                                        <Archive size={13} />
                                        Archive
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                variant={confirmModal.variant}
                title={confirmModal.title}
                description={confirmModal.description}
                confirmLabel={confirmModal.confirmLabel}
                cancelLabel={confirmModal.cancelLabel}
                isLoading={gateLoading}
                onConfirm={confirmModal.onConfirm}
                onCancel={() => setConfirmModal(CONFIRM_CLOSED)}
            />
            <ConfirmationModal
                isOpen={showComplianceCancelConfirm}
                variant="warning"
                title="Discard changes?"
                description="You have unsaved changes in the Bio-Data & Compliance form. Are you sure you want to discard them?"
                confirmLabel="Discard"
                onConfirm={() => { setShowComplianceCancelConfirm(false); setEditingCompliance(false); }}
                onCancel={() => setShowComplianceCancelConfirm(false)}
            />
        </div>
    );
}
