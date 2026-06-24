import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import {
    CheckCircle2, AlertCircle, Loader2, Eye, EyeOff, ArrowRight, ArrowLeft,
    User, Lock, Upload, FileText, Trash2, ShieldCheck, Mail
} from 'lucide-react';

type Step = 'welcome' | 'profile' | 'password' | 'documents' | 'done';

interface UploadedFile {
    name: string;
    size: string;
    status: 'idle' | 'selected' | 'uploading' | 'done' | 'error';
    error?: string;
}

const NAME_REGEX = /^[A-Za-zÀ-ÖØ-öø-ÿ\s'\-.]+$/;
const SUFFIX_REGEX = /^[A-Za-z.\s]+$/;

const PH_MOBILE_REGEX = /^09\d{9}$/;

export default function OnboardingPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const onboardingToken = searchParams.get('token') || '';
    const isFresh = searchParams.get('fresh') === 'true';

    const [tokenValidating, setTokenValidating] = useState(!isFresh);
    const [tokenError, setTokenError] = useState('');
    const [resending, setResending] = useState(false);
    const [resent, setResent] = useState(false);
    const [applicantInfo, setApplicantInfo] = useState<{
        fullName: string; firstName: string; middleName: string; lastName: string; suffix: string;
        contactNumber: string; email: string; position: string;
        resumeFilePath: string; medicalClearanceFilePath: string;
    } | null>(null);

    useEffect(() => {
        if (isFresh) {
            setTokenValidating(false);
            setStep('profile');
            return;
        }
        if (!onboardingToken) {
            setTokenValidating(false);
            setTokenError('Missing onboarding token. Please check your email for a valid link.');
            return;
        }
        axios.post('/api/onboarding/validate', { token: onboardingToken })
            .then((res) => {
                const data = res.data as any;
                if (data?.isSuccess && data.data) {
                    // Store JWT and employee info for subsequent API calls
                    if (data.data.accessToken) {
                        localStorage.setItem('authToken', data.data.accessToken);
                        // Extract role from JWT for dashboard navigation later
                        try {
                            const payload = data.data.accessToken.split('.')[1];
                            const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
                            const roleClaim = json['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || json.role || '';
                            const roleMap: Record<string, string> = {
                                'SystemAdmin': 'System Admin', 'OperationAdmin': 'Operation Admin',
                                'Coordinator': 'Coordinator', 'Encoder': 'Encoder'
                            };
                            localStorage.setItem('userRole', roleMap[roleClaim] || roleClaim);
                        } catch { /* ignore JWT parse errors */ }
                    }
                    if (data.data.employeeNumber) {
                        localStorage.setItem('employeeId', data.data.employeeNumber);
                    }
                    setApplicantInfo({
                        fullName: data.data.fullName,
                        firstName: data.data.firstName || '',
                        middleName: data.data.middleName || '',
                        lastName: data.data.lastName || '',
                        suffix: data.data.suffix || '',
                        contactNumber: data.data.contactNumber || '',
                        email: data.data.emailAddress,
                        position: data.data.jobPositionName,
                        resumeFilePath: data.data.resumeFilePath || '',
                        medicalClearanceFilePath: data.data.medicalClearanceFilePath || '',
                    });
                    setTokenValidating(false);
                } else {
                    setTokenError(data?.message || 'Invalid or expired link.');
                    setTokenValidating(false);
                }
            })
            .catch((err) => {
                const isNetworkDown = !err?.response || err?.response?.status >= 502;
                const msg = isNetworkDown ? 'System not available at the moment. Please try again later.' : (err?.response?.data?.message || 'Failed to validate onboarding link.');
                setTokenError(msg);
                setTokenValidating(false);
            });
    }, [onboardingToken]);

    const [step, setStep] = useState<Step>('welcome');

    // ── Profile state ──
    const [profile, setProfile] = useState({ firstName: '', middleName: '', lastName: '', suffix: '', contactNumber: '' });

    // Pre-fill profile from applicant info when available
    useEffect(() => {
        if (applicantInfo) {
            setProfile({
                firstName: applicantInfo.firstName || '',
                middleName: applicantInfo.middleName || '',
                lastName: applicantInfo.lastName || '',
                suffix: applicantInfo.suffix || '',
                contactNumber: applicantInfo.contactNumber || '',
            });
            // Pre-fill uploaded docs with existing files from application form
            setUploadedDocs(prev => ({
                ...prev,
                biodata: applicantInfo.resumeFilePath
                    ? { name: 'Resume/CV (from application)', size: 'Uploaded', status: 'done' as const }
                    : prev.biodata,
                medical: applicantInfo.medicalClearanceFilePath
                    ? { name: 'Medical Clearance (from application)', size: 'Uploaded', status: 'done' as const }
                    : prev.medical,
            }));
        }
    }, [applicantInfo]);
    const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
    const [profileSaving, setProfileSaving] = useState(false);
    const [profileApiError, setProfileApiError] = useState('');

    // ── Password state ──
    const [pw, setPw] = useState({ next: '', confirm: '' });
    const [pwErrors, setPwErrors] = useState<Record<string, string>>({});
    const [pwSaving, setPwSaving] = useState(false);
    const [pwApiError, setPwApiError] = useState('');
    const [completedCredentials, setCompletedCredentials] = useState<string>('');
    const [showNext, setShowNext] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    // ── File upload state ──
    const [fileObjects, setFileObjects] = useState<Record<string, File>>({});
    const [submittingDocs, setSubmittingDocs] = useState(false);
    const [docsApiError, setDocsApiError] = useState('');
    const [uploadedDocs, setUploadedDocs] = useState<Record<string, UploadedFile>>({
        biodata: { name: '', size: '', status: 'idle' },
        medical: { name: '', size: '', status: 'idle' },
        govId: { name: '', size: '', status: 'idle' },
        nbi: { name: '', size: '', status: 'idle' },
        education: { name: '', size: '', status: 'idle' },
        psa: { name: '', size: '', status: 'idle' },
        bir2316: { name: '', size: '', status: 'idle' },
    });



    const token = localStorage.getItem('authToken') ?? '';
    const steps: Step[] = ['welcome', 'profile', 'password', 'documents', 'done'];
    const stepIndex = steps.indexOf(step);

    // ── Helpers ──
    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const handleFileChange = (key: string, file: File | null) => {
        if (!file) return;
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        const sizeStr = formatFileSize(file.size);
        const validExtensionsMap: Record<string, string[]> = {
            biodata: ['pdf', 'docx'],
            medical: ['pdf', 'jpg', 'jpeg', 'png'],
            govId: ['pdf'],
            nbi: ['pdf', 'jpg', 'jpeg', 'png'],
            education: ['pdf'],
            psa: ['pdf', 'jpg', 'jpeg', 'png'],
            bir2316: ['pdf', 'jpg', 'jpeg', 'png'],
        };
        const validExts = validExtensionsMap[key] || [];
        if (file.size > 10 * 1024 * 1024) {
            setUploadedDocs(prev => ({ ...prev, [key]: { name: file.name, size: sizeStr, status: 'error', error: 'File size exceeds 10MB limit.' } }));
            return;
        }
        if (!validExts.includes(ext)) {
            const errMsg = key === 'biodata' ? 'Upload a PDF or DOCX.' : (key === 'govId' || key === 'education') ? 'Upload a PDF.' : 'Upload a PDF or image.';
            setUploadedDocs(prev => ({ ...prev, [key]: { name: file.name, size: sizeStr, status: 'error', error: errMsg } }));
            return;
        }
        setUploadedDocs(prev => ({ ...prev, [key]: { name: file.name, size: sizeStr, status: 'selected' } }));
        setFileObjects(prev => ({ ...prev, [key]: file }));
    };

    const handleFileClear = (key: string) => {
        setUploadedDocs(prev => ({ ...prev, [key]: { name: '', size: '', status: 'idle' } }));
        setFileObjects(prev => { const n = { ...prev }; delete n[key]; return n; });
    };

    const requiredKeys = ['biodata', 'medical', 'govId', 'nbi', 'psa'];
    const pendingRequiredCount = requiredKeys.filter(k => uploadedDocs[k]?.status !== 'selected' && uploadedDocs[k]?.status !== 'done').length;
    const isSubmitDisabled = pendingRequiredCount > 0;

    // ── Validators ──
    const validateField = (key: string, value: string): string => {
        switch (key) {
            case 'firstName':
            case 'lastName':
                if (!value.trim()) return `${key === 'firstName' ? 'First' : 'Last'} name is required.`;
                if (value.trim().length < 2) return 'Must be at least 2 characters.';
                if (value.trim().length > 50) return 'Must not exceed 50 characters.';
                if (key === 'firstName') { if (!/^[A-Za-zÀ-ÖØ-öø-ÿ0-9\s'\-.]+$/.test(value.trim())) return 'Letters, numbers, spaces, hyphens, and apostrophes only.'; }
                else { if (!NAME_REGEX.test(value.trim())) return 'Letters, spaces, hyphens, and apostrophes only.'; }
                return '';
            case 'middleName':
                if (!value.trim()) return '';
                if (value.trim().length < 2) return 'Must be at least 2 characters.';
                if (value.trim().length > 50) return 'Must not exceed 50 characters.';
                if (!NAME_REGEX.test(value.trim())) return 'Letters, spaces, hyphens, and apostrophes only.';
                return '';
            case 'suffix':
                if (!value.trim()) return '';
                if (value.trim().length > 10) return 'Must not exceed 10 characters.';
                if (!SUFFIX_REGEX.test(value.trim())) return 'Letters and periods only (e.g. Jr., Sr., III).';
                return '';
            case 'contactNumber':
                if (!value.trim()) return '';
                if (!PH_MOBILE_REGEX.test(value.trim())) return 'Must be 11 digits starting with 09.';
                return '';
            default:
                return '';
        }
    };

    const validateProfile = () => {
        const errs: Record<string, string> = {};
        Object.keys(profile).forEach(key => {
            const err = validateField(key, profile[key as keyof typeof profile]);
            if (err) errs[key] = err;
        });
        if (!profile.firstName.trim()) errs.firstName = 'First name is required.';
        if (!profile.lastName.trim()) errs.lastName = 'Last name is required.';
        return errs;
    };

    const validatePwField = (key: string, value: string): string => {
        switch (key) {
            case 'next':
                if (!value) return 'Password is required.';
                if (value.length < 15) return 'Must be at least 15 characters.';
                if (value.length > 64) return 'Must not exceed 64 characters.';
                return '';
            case 'confirm':
                if (!value) return 'Please confirm your password.';
                if (value !== pw.next) return 'Passwords do not match.';
                return '';
            default: return '';
        }
    };

    // ── Wizard steps (local only — no API calls until completion) ──
    const handleProfileSave = async () => {
        const errs = validateProfile();
        if (Object.keys(errs).length > 0) { setProfileErrors(errs); return; }
        if (isFresh) {
            setProfileSaving(true);
            try {
                const token = localStorage.getItem('authToken');
                await axios.post('/api/onboarding/complete-profile', {
                    firstName: profile.firstName,
                    middleName: profile.middleName,
                    lastName: profile.lastName,
                    suffix: profile.suffix,
                    contactNumber: profile.contactNumber,
                }, { headers: { Authorization: `Bearer ${token}` } });
                const role = localStorage.getItem('userRole') ?? '';
                const routes: Record<string, string> = {
                    SuperAdmin: '/SystemAdmin_Dashboard',
                    'System Admin': '/SystemAdmin_Dashboard',
                    'Operation Admin': '/OpAdmin_Dashboard',
                    OpAdmin: '/OpAdmin_Dashboard',
                    Coordinator: '/OpEmployee_Dashboard',
                    Encoder: '/OpEmployee_Dashboard',
                };
                navigate(routes[role] || '/');
                return;
            } catch {
                setProfileApiError('Failed to save profile. Please try again.');
            } finally {
                setProfileSaving(false);
            }
            return;
        }
        setStep('password');
    };

    const handlePasswordSave = async () => {
        const errs: Record<string, string> = {};
        ['next', 'confirm'].forEach(k => { const err = validatePwField(k, pw[k as keyof typeof pw]); if (err) errs[k] = err; });
        if (Object.keys(errs).length > 0) { setPwErrors(errs); return; }
        setStep('documents');
    };

    const handleFinalSubmit = async () => {
        setSubmittingDocs(true);
        setDocsApiError('');
        const keys = Object.keys(fileObjects).filter(k => uploadedDocs[k]?.status !== 'done');
        for (const key of keys) {
            const file = fileObjects[key];
            if (!file) continue;
            setUploadedDocs(prev => ({ ...prev, [key]: { ...prev[key], status: 'uploading' } }));
            const formData = new FormData();
            formData.append('token', onboardingToken ?? '');
            formData.append('documentType', key);
            formData.append('file', file);
            try {
                const res = await fetch('/api/onboarding/upload-document', { method: 'POST', body: formData });
                const data = await res.json();
                if (!res.ok) throw new Error((data as any).message || 'Upload failed.');
                setUploadedDocs(prev => ({ ...prev, [key]: { ...prev[key], status: 'done' } }));
            } catch (err: any) {
                setUploadedDocs(prev => ({ ...prev, [key]: { ...prev[key], status: 'error', error: err.message || 'Upload failed.' } }));
                setDocsApiError('Some files failed to upload. You can retry or continue anyway.');
                setSubmittingDocs(false);
                return;
            }
        }
        try {
            const token = localStorage.getItem('authToken');
            const res = await fetch('/api/onboarding/complete', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token: onboardingToken,
                    password: pw.next || null,
                    firstName: profile.firstName || null,
                    middleName: profile.middleName || null,
                    lastName: profile.lastName || null,
                    suffix: profile.suffix || null,
                    contactNumber: profile.contactNumber || null,
                }),
            });
            if (!res.ok) throw new Error('Failed to complete onboarding.');
            const data = await res.json();
            setCompletedCredentials((data as any).message || '');
            setStep('done');
        } catch (err: any) {
            setDocsApiError(err.message ?? 'Something went wrong. Please try again.');
        } finally { setSubmittingDocs(false); }
    };

    const handleSubmitAndFinish = async () => {
        setSubmittingDocs(true);
        setDocsApiError('');

        const keys = Object.keys(fileObjects).filter(k => uploadedDocs[k]?.status !== 'done');
        for (const key of keys) {
            const file = fileObjects[key];
            if (!file) continue;
            setUploadedDocs(prev => ({ ...prev, [key]: { ...prev[key], status: 'uploading' } }));
            const formData = new FormData();
            formData.append('token', onboardingToken ?? '');
            formData.append('documentType', key);
            formData.append('file', file);
            try {
                const res = await fetch('/api/onboarding/upload-document', { method: 'POST', body: formData });
                const data = await res.json();
                if (!res.ok) throw new Error((data as any).message || 'Upload failed.');
                setUploadedDocs(prev => ({ ...prev, [key]: { ...prev[key], status: 'done' } }));
            } catch (err: any) {
                setUploadedDocs(prev => ({ ...prev, [key]: { ...prev[key], status: 'error', error: err.message || 'Upload failed.' } }));
                setDocsApiError('Some files failed to upload. You can retry or continue anyway.');
                setSubmittingDocs(false);
                return;
            }
        }
        try {
            const token = localStorage.getItem('authToken');
            const res = await fetch('/api/onboarding/complete', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token: onboardingToken,
                    password: pw.next || null,
                    firstName: profile.firstName || null,
                    middleName: profile.middleName || null,
                    lastName: profile.lastName || null,
                    suffix: profile.suffix || null,
                    contactNumber: profile.contactNumber || null,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error((data as any).message || 'Failed to complete onboarding.');
            setStep('done');
        } catch (err: any) {
            setDocsApiError(err.message ?? 'Something went wrong. Please try again.');
        } finally { setSubmittingDocs(false); }
    };

    const pwStrength = pw.next.length === 0 ? 0 : pw.next.length < 6 ? 1 : pw.next.length < 10 ? 2 : 3;
    const pwStrengthLabel = ['', 'Weak', 'Fair', 'Strong'];
    const pwStrengthColor = ['', 'var(--status-failed)', 'var(--status-pending)', 'var(--status-active)'];

    const inputStyle = (err?: string) => ({
        padding: '9px 13px', borderRadius: 'var(--radius-sm)', fontSize: 13, fontFamily: 'inherit',
        border: `1.5px solid ${err ? 'var(--status-failed)' : 'var(--border)'}`,
        outline: 'none', color: 'var(--text-primary)', background: 'var(--bg-card)', width: '100%',
        boxSizing: 'border-box' as const,
    });
    const pwInputStyle = (err?: string) => ({ ...inputStyle(err), padding: '9px 40px 9px 13px' });

    // ── Inline label component ──
    const FieldLabel = ({ label, required, optional }: { label: string; required?: boolean; optional?: boolean }) => (
        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>
            {label}{' '}
            {required && <span style={{ color: 'var(--status-failed)' }}>*</span>}
            {optional && <span style={{ fontSize: 10, color: 'var(--text-secondary)', textTransform: 'none' as const, fontWeight: 500 }}>(optional)</span>}
        </label>
    );

    const FieldError = ({ msg }: { msg?: string }) => msg ? (
        <span style={{ fontSize: 11, color: 'var(--status-failed)', display: 'flex', alignItems: 'center', gap: 4 }}><AlertCircle size={11} />{msg}</span>
    ) : null;

    const FieldHint = ({ hint }: { hint: string }) => (
        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{hint}</span>
    );

    const BackButton = ({ to, disabled }: { to: Step; disabled?: boolean }) => (
        <button
            type="button"
            onClick={() => setStep(to)}
            disabled={disabled}
            style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'none', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-md)',
                padding: '0 16px', height: 44, fontSize: 13, fontWeight: 700,
                color: disabled ? 'var(--text-muted)' : 'var(--text-secondary)',
                cursor: disabled ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', flexShrink: 0,
            }}
            onMouseEnter={e => { if (!disabled) { e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; } }}
            onMouseLeave={e => { if (!disabled) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; } }}
        >
            <ArrowLeft size={14} /> Back
        </button>
    );

    // ── Upload slot renderer ──
    const renderUploadSlot = (key: string, label: string, specs: string, required: boolean) => {
        const fileState = uploadedDocs[key];
        const status = fileState.status;
        let cardStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', padding: '12px 16px', borderRadius: 'var(--radius-md)', cursor: 'pointer', position: 'relative' };
        if (status === 'idle') cardStyle = { ...cardStyle, background: 'var(--bg-main)', border: '1.5px dashed var(--border)' };
        else if (status === 'selected') cardStyle = { ...cardStyle, background: 'var(--bg-main)', border: '1.5px solid var(--primary)' };
        else if (status === 'uploading') cardStyle = { ...cardStyle, background: 'var(--bg-main)', border: '1.5px solid var(--border)', cursor: 'default' };
        else if (status === 'done') cardStyle = { ...cardStyle, background: 'rgba(5,150,105,0.03)', border: '1.5px solid rgba(5,150,105,0.18)', cursor: 'default' };
        else if (status === 'error') cardStyle = { ...cardStyle, background: 'rgba(220,38,38,0.03)', border: '1.5px solid rgba(220,38,38,0.18)' };

        return (
            <div key={key}>
                <input type="file" id={`file-input-${key}`} style={{ display: 'none' }} onChange={e => { handleFileChange(key, e.target.files?.[0] || null); e.target.value = ''; }} accept={key === 'biodata' ? '.pdf,.docx' : (key === 'govId' || key === 'education') ? '.pdf' : '.pdf,.jpg,.jpeg,.png'} />
                <div className={status === 'idle' || status === 'selected' || status === 'error' ? 'upload-slot-card' : ''} style={cardStyle} onClick={() => { if (status === 'idle' || status === 'selected' || status === 'error') document.getElementById(`file-input-${key}`)?.click(); }}>
                    <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: 14, background: status === 'done' ? 'rgba(5,150,105,0.08)' : status === 'error' ? 'rgba(220,38,38,0.08)' : 'rgba(0,169,157,0.05)' }}>
                        {status === 'idle' && <Upload size={16} color="var(--primary)" />}
                        {status === 'selected' && <FileText size={16} color="var(--primary)" />}
                        {status === 'uploading' && <Loader2 size={16} color="var(--primary)" className="spin-icon" />}
                        {status === 'done' && <CheckCircle2 size={16} color="var(--status-active)" />}
                        {status === 'error' && <AlertCircle size={16} color="var(--status-failed)" />}
                    </div>
                    <div style={{ flexGrow: 1, minWidth: 0, marginRight: 12 }}>
                        {status === 'idle' && (<><div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 3 }}>{label} {required && <span style={{ color: 'var(--status-failed)' }}>*</span>}</div><div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{specs}</div></>)}
                        {status === 'selected' && (<><div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>{label} {required && <span style={{ color: 'var(--status-failed)' }}>*</span>}</div><div style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 600, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}><FileText size={12} /> {fileState.name} ({fileState.size})</div></>)}
                        {status === 'uploading' && (<><div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>Uploading...</div><div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileState.name} ({fileState.size})</div></>)}
                        {status === 'done' && (<><div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{label} {required && <span style={{ color: 'var(--status-failed)' }}>*</span>}</div><div style={{ fontSize: 11, color: 'var(--status-active)', fontWeight: 600, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}><FileText size={12} /> {fileState.name} ({fileState.size})</div></>)}
                        {status === 'error' && (<><div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{label} {required && <span style={{ color: 'var(--status-failed)' }}>*</span>}</div><div style={{ fontSize: 11, color: 'var(--status-failed)', fontWeight: 600, marginTop: 2 }}>{fileState.error || 'Upload failed.'}</div></>)}
                    </div>
                    <div style={{ flexShrink: 0 }}>
                        {status === 'idle' && <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Browse</span>}
                        {(status === 'selected' || status === 'done') && (
                            <button type="button" onClick={e => { e.stopPropagation(); handleFileClear(key); }} style={{ background: 'none', border: 'none', padding: 6, cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', borderRadius: 6 }} onMouseEnter={e => (e.currentTarget.style.color = 'var(--status-failed)')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}><Trash2 size={15} /></button>
                        )}
                        {status === 'error' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--status-failed)', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: 4 }}>Retry</span>
                                <button type="button" onClick={e => { e.stopPropagation(); handleFileClear(key); }} style={{ background: 'none', border: 'none', padding: 6, cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', borderRadius: 6 }} onMouseEnter={e => (e.currentTarget.style.color = 'var(--status-failed)')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}><Trash2 size={15} /></button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    // ── Progress bar step labels ──
    const progressLabels = ['Profile Setup', 'Set Password', 'Upload Documents'];
    const progressIndex = step === 'profile' ? 0 : step === 'password' ? 1 : step === 'documents' ? 2 : -1;

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, var(--sidebar-bg) 0%, var(--primary-dark) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Montserrat', sans-serif", padding: '24px 16px' }}>
            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                .spin-icon { animation: spin 1s linear infinite; }
                .upload-slot-card { transition: all 0.2s ease; }
                .upload-slot-card:hover { border-color: var(--primary) !important; background-color: var(--bg-input) !important; }
                select { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; padding-right: 32px !important; }
            `}</style>
            <div style={{ width: '100%', maxWidth: 520 }}>

                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <img src="/src/assets/SpeedexLogo.jpg" alt="Speedex" style={{ height: 40, objectFit: 'contain' }} />
                </div>

                {tokenValidating && (
                    <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '48px 32px', textAlign: 'center', boxShadow: '0 24px 64px rgba(0,0,0,0.35)' }}>
                        <Loader2 size={32} color="var(--primary)" className="spin-icon" style={{ margin: '0 auto 16px' }} />
                        <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>Validating your onboarding link…</p>
                    </div>
                )}

                {tokenError && (
                    <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '48px 32px', textAlign: 'center', boxShadow: '0 24px 64px rgba(0,0,0,0.35)' }}>
                        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(220,38,38,0.1)', border: '2px solid rgba(220,38,38,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                            <AlertCircle size={28} color="var(--status-failed)" />
                        </div>
                        <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 8px' }}>Link Invalid or Expired</h2>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 24px', lineHeight: 1.6 }}>{tokenError}</p>
                    </div>
                )}

                {tokenError && !resending && !resent && (
                    <div style={{ textAlign: 'center', marginTop: 12 }}>
                        <button
                            onClick={async () => {
                                setResending(true);
                                try {
                                    await axios.post('/api/onboarding/resend-link', { token: onboardingToken });
                                    setResent(true);
                                } catch { setTokenError('Failed to resend. Please contact HR.'); }
                                finally { setResending(false); }
                            }}
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: 8,
                                background: 'var(--primary)', color: 'white', border: 'none',
                                borderRadius: 'var(--radius-md)', padding: '12px 24px',
                                fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                            }}
                        >
                            {resending ? <><Loader2 size={14} className="spin-icon" /> Sending…</> : <><Mail size={14} /> Resend Link</>}
                        </button>
                    </div>
                )}

                {resent && (
                    <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '48px 32px', textAlign: 'center', boxShadow: '0 24px 64px rgba(0,0,0,0.35)', marginTop: 16 }}>
                        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(5,150,105,0.1)', border: '2px solid rgba(5,150,105,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                            <CheckCircle2 size={28} color="var(--status-active)" />
                        </div>
                        <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 8px' }}>New Link Sent!</h2>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 24px', lineHeight: 1.6 }}>Please check your email for the new onboarding link.</p>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>You can close this page.</p>
                    </div>
                )}

                {!tokenValidating && !tokenError && (
                    <>
                        {/* ── Progress bar ── */}
                        {step !== 'welcome' && step !== 'done' && (
                            <div style={{ marginBottom: 24 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                    {progressLabels.map((label, i) => (
                                        <span key={label} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: progressIndex >= i ? 'var(--status-active)' : 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>
                                            {progressIndex > i ? '✓ ' : ''}{label}
                                        </span>
                                    ))}
                                </div>
                                <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', borderRadius: 'var(--radius-full)', background: 'linear-gradient(90deg, var(--status-active), var(--primary))', width: step === 'profile' ? '33%' : step === 'password' ? '66%' : step === 'documents' ? '100%' : '0%', transition: 'width 0.4s ease' }} />
                                </div>
                            </div>
                        )}

                        <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.35)' }}>

                            {/* ── WELCOME ── */}
                            {step === 'welcome' && (
                                <div>
                                    <div style={{ background: 'linear-gradient(135deg, var(--sidebar-bg), var(--primary-dark))', padding: '40px 32px 32px', textAlign: 'center' }}>
                                        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(5,150,105,0.15)', border: '2px solid rgba(5,150,105,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                            <CheckCircle2 size={28} color="var(--status-active)" />
                                        </div>
                                        <h2 style={{ color: 'white', fontSize: 22, fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.02em' }}>Welcome to Speedex!</h2>
                                        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, margin: 0, lineHeight: 1.6 }}>Your email has been verified. Let's set up your account before you get started.</p>
                                    </div>
                                    <div style={{ padding: '28px 32px 32px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
                                            {[
                                                { icon: User, label: 'Set up your profile', desc: 'Add your name and contact details' },
                                                { icon: Lock, label: 'Create a secure password', desc: 'Replace the temporary password sent to you' },
                                                { icon: Upload, label: 'Upload onboarding documents', desc: 'Biodata, medical certificate, government ID' },
                                            ].map(({ icon: Icon, label, desc }, i) => (
                                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: 'var(--bg-main)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                                                    <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-md)', background: 'rgba(0,169,157,0.08)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <Icon size={18} color="var(--primary)" />
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{label}</div>
                                                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{desc}</div>
                                                    </div>
                                                    <div style={{ marginLeft: 'auto', width: 22, height: 24, borderRadius: '50%', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)' }}>{i + 1}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <button onClick={() => setStep('profile')} style={{ width: '100%', height: 46, border: 'none', borderRadius: 'var(--radius-md)', background: 'var(--primary)', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: 'var(--shadow-md)', fontFamily: 'inherit' }}>
                                            Get Started <ArrowRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* ── PROFILE ── */}
                            {step === 'profile' && (
                                <div>
                                    <div style={{ padding: '28px 32px 20px', borderBottom: '1px solid var(--border)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                                            <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', background: 'rgba(0,169,157,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={16} color="var(--primary)" /></div>
                                            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>Profile Setup</h3>
                                        </div>
                                        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', marginLeft: 42 }}>Fill in your personal details for your account.</p>
                                    </div>
                                    <div style={{ padding: '24px 32px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                                        {profileApiError && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--status-failed)' }}>
                                                <AlertCircle size={14} />{profileApiError}
                                            </div>
                                        )}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                            {(['firstName', 'lastName'] as const).map(key => (
                                                <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                                    <FieldLabel label={key === 'firstName' ? 'First Name' : 'Last Name'} required />
                                                    <input type="text" placeholder={key === 'firstName' ? 'e.g. Juan' : 'e.g. dela Cruz'} value={profile[key]} onChange={e => { const val = e.target.value; setProfile(p => ({ ...p, [key]: val })); setProfileErrors(p => ({ ...p, [key]: validateField(key, val) })); }} maxLength={50} style={inputStyle(profileErrors[key])} />
                                                    {profileErrors[key] ? <FieldError msg={profileErrors[key]} /> : <FieldHint hint={key === 'firstName' ? 'Letters, numbers, hyphens, apostrophes only' : 'Letters, hyphens, apostrophes only'} />}
                                                </div>
                                            ))}
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                            {([{ key: 'middleName', label: 'Middle Name', placeholder: 'e.g. Santos' }, { key: 'suffix', label: 'Suffix', placeholder: 'e.g. Jr., Sr., III' }] as const).map(({ key, label, placeholder }) => (
                                                <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                                    <FieldLabel label={label} optional />
                                                    <input type="text" placeholder={placeholder} value={profile[key]} onChange={e => { const val = e.target.value; setProfile(p => ({ ...p, [key]: val })); setProfileErrors(p => ({ ...p, [key]: validateField(key, val) })); }} maxLength={key === 'suffix' ? 10 : 50} style={inputStyle(profileErrors[key])} />
                                                    <FieldError msg={profileErrors[key]} />
                                                </div>
                                            ))}
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                            <FieldLabel label="Contact Number" optional />
                                            <input type="tel" placeholder="e.g. 09123456789" value={profile.contactNumber} onChange={e => { const val = e.target.value.replace(/\D/g, ''); setProfile(p => ({ ...p, contactNumber: val })); setProfileErrors(p => ({ ...p, contactNumber: validateField('contactNumber', val) })); }} maxLength={11} style={inputStyle(profileErrors.contactNumber)} />
                                            {profileErrors.contactNumber ? <FieldError msg={profileErrors.contactNumber} /> : <FieldHint hint="Format: 09XXXXXXXXX (11 digits)" />}
                                        </div>
                                        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                                            <BackButton to="welcome" disabled={profileSaving} />
                                            <button onClick={handleProfileSave} disabled={profileSaving} style={{ flex: 1, height: 44, border: 'none', borderRadius: 'var(--radius-md)', background: profileSaving ? 'rgba(0,169,157,0.45)' : 'var(--primary)', color: 'white', fontSize: 13, fontWeight: 700, cursor: profileSaving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit' }}>
                                                {profileSaving ? <><Loader2 size={14} className="spin-icon" /> Saving…</> : <>Save & Continue <ArrowRight size={14} /></>}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ── PASSWORD ── */}
                            {step === 'password' && (
                                <div>
                                    <div style={{ padding: '28px 32px 20px', borderBottom: '1px solid var(--border)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                                            <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', background: 'rgba(0,169,157,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Lock size={16} color="var(--primary)" /></div>
                                            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>Set Your Password</h3>
                                        </div>
                                        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', marginLeft: 42 }}>Create a strong password to secure your account.</p>
                                    </div>
                                    <div style={{ padding: '24px 32px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                                        {pwApiError && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--status-failed)' }}>
                                                <AlertCircle size={14} />{pwApiError}
                                            </div>
                                        )}
                                        {[
                                            { key: 'next', label: 'Create your Password', show: showNext, setShow: setShowNext, placeholder: 'At least 15 characters' },
                                            { key: 'confirm', label: 'Confirm Password', show: showConfirm, setShow: setShowConfirm, placeholder: 'Re-enter your password' },
                                        ].map(({ key, label, show, setShow, placeholder }) => (
                                            <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                                <FieldLabel label={label} required />
                                                <div style={{ position: 'relative' }}>
                                                    <input type={show ? 'text' : 'password'} placeholder={placeholder} value={pw[key as keyof typeof pw]} onChange={e => { const val = e.target.value; setPw(p => ({ ...p, [key]: val })); setPwErrors(p => ({ ...p, [key]: validatePwField(key, val), ...(key === 'next' && pw.confirm ? { confirm: pw.confirm !== val ? 'Passwords do not match.' : '' } : {}) })); }} maxLength={64} style={pwInputStyle(pwErrors[key])} />
                                                    <button type="button" onClick={() => setShow((p: boolean) => !p)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                                                        {show ? <EyeOff size={15} /> : <Eye size={15} />}
                                                    </button>
                                                </div>
                                                {key === 'next' && pw.next.length > 0 && (
                                                    <div>
                                                        <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                                                            {[1, 2, 3].map(l => <div key={l} style={{ flex: 1, height: 4, borderRadius: 2, background: pwStrength >= l ? pwStrengthColor[pwStrength] : 'var(--border)', transition: 'background 0.2s' }} />)}
                                                        </div>
                                                        <span style={{ fontSize: 11, color: pwStrengthColor[pwStrength], marginTop: 3, display: 'block', fontWeight: 600 }}>{pwStrengthLabel[pwStrength]}</span>
                                                    </div>
                                                )}
                                                {key === 'confirm' && pw.confirm.length > 0 && !pwErrors.confirm && <span style={{ fontSize: 11, color: 'var(--status-active)', fontWeight: 600 }}>✓ Passwords match</span>}
                                                <FieldError msg={pwErrors[key]} />
                                            </div>
                                        ))}
                                        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                                            <BackButton to="profile" disabled={pwSaving} />
                                            <button onClick={handlePasswordSave} disabled={pwSaving} style={{ flex: 1, height: 44, border: 'none', borderRadius: 'var(--radius-md)', background: pwSaving ? 'rgba(0,169,157,0.45)' : 'var(--primary)', color: 'white', fontSize: 13, fontWeight: 700, cursor: pwSaving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit' }}>
                                                {pwSaving ? <><Loader2 size={14} className="spin-icon" /> Saving…</> : <>Set Password & Continue <ArrowRight size={14} /></>}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ── UPLOAD DOCUMENTS ── */}
                            {step === 'documents' && (
                                <div>
                                    <div style={{ padding: '28px 32px 20px', borderBottom: '1px solid var(--border)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                                            <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', background: 'rgba(0,169,157,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Upload size={16} color="var(--primary)" /></div>
                                            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>Upload Documents</h3>
                                        </div>
                                        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', marginLeft: 42 }}>Please upload the required personal files to complete your onboarding.</p>
                                    </div>
                                    <div style={{ padding: '24px 32px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                                        <div>
                                            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Required Documents <span style={{ color: 'var(--status-failed)' }}>*</span></div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                                {renderUploadSlot('biodata', 'Biodata / Resume', 'PDF or DOCX up to 10MB', true)}
                                                {renderUploadSlot('medical', 'Medical Certificate', 'PDF, JPG, or PNG up to 10MB', true)}
                                                {renderUploadSlot('govId', 'Government-issued ID', 'PDF up to 10MB', true)}
                                                {renderUploadSlot('nbi', 'NBI / Police Clearance', 'JPG, PNG, or PDF up to 10MB', true)}
                                                {renderUploadSlot('psa', 'PSA Birth Certificate', 'JPG, PNG, or PDF up to 10MB', true)}
                                            </div>
                                        </div>
                                        <div style={{ marginTop: 8 }}>
                                            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Optional Documents</div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                                {renderUploadSlot('bir2316', 'BIR Form 2316', 'JPG, PNG, or PDF up to 10MB', false)}
                                                {renderUploadSlot('education', 'Educational Documents', 'PDF up to 10MB', false)}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 10, padding: '12px 14px', background: 'rgba(0,169,157,0.05)', border: '1px solid rgba(0,169,157,0.1)', borderRadius: 'var(--radius-md)', marginTop: 8, alignItems: 'flex-start' }}>
                                            <ShieldCheck size={18} color="var(--primary)" style={{ flexShrink: 0, marginTop: 1 }} />
                                            <span style={{ fontSize: 11, color: 'var(--text-primary)', lineHeight: 1.4 }}>Your files are encrypted and securely stored. Only authorized HR personnel can access them.</span>
                                        </div>
                                        {docsApiError && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--status-failed)' }}>
                                                <AlertCircle size={14} />{docsApiError}
                                            </div>
                                        )}
                                        <div style={{ marginTop: 8 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <BackButton to="password" disabled={submittingDocs} />

                                                <button disabled={isSubmitDisabled || submittingDocs} onClick={handleSubmitAndFinish} style={{ flex: 1, height: 44, border: 'none', borderRadius: 'var(--radius-md)', background: (isSubmitDisabled || submittingDocs) ? 'rgba(0,169,157,0.25)' : 'var(--primary)', color: (isSubmitDisabled || submittingDocs) ? 'var(--text-muted)' : 'white', fontSize: 13, fontWeight: 700, cursor: (isSubmitDisabled || submittingDocs) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit', boxShadow: (isSubmitDisabled || submittingDocs) ? 'none' : 'var(--shadow-md)', transition: 'all 0.2s ease' }}>
                                                    {submittingDocs ? <><Loader2 size={14} className="spin-icon" /> Uploading…</> : <>Upload & Continue <ArrowRight size={14} /></>}
                                                </button>
                                            </div>
                                            <div style={{ marginTop: 12, textAlign: 'center' }}>
                                                {pendingRequiredCount > 0
                                                    ? <span style={{ fontSize: 11, color: 'var(--status-failed)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}><AlertCircle size={12} /> {pendingRequiredCount} required {pendingRequiredCount === 1 ? 'document' : 'documents'} still pending</span>
                                                    : <span style={{ fontSize: 11, color: 'var(--status-active)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}><CheckCircle2 size={12} /> All required documents uploaded</span>
                                                }
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ── DONE ── */}
                            {step === 'done' && (
                                <div style={{ padding: '48px 32px', textAlign: 'center' }}>
                                    <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(5,150,105,0.1)', border: '2px solid rgba(5,150,105,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                                        <CheckCircle2 size={32} color="var(--status-active)" />
                                    </div>
                                    <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 8px', letterSpacing: '-0.02em' }}>You're all set!</h2>
                                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 8px', lineHeight: 1.6 }}>Your employee account has been created.</p>
                                    {completedCredentials && (
                                        <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '14px 18px', marginBottom: 24, textAlign: 'left', fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.6 }}>
                                            {completedCredentials}
                                        </div>
                                    )}
                                    <button onClick={() => {
                                        localStorage.clear();
                                        navigate('/');
                                    }} style={{ width: '100%', height: 46, border: 'none', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, var(--sidebar-bg), var(--primary-dark))', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit', boxShadow: 'var(--shadow-lg)' }}>
                                        Go to Login <ArrowRight size={16} />
                                    </button>
                                </div>
                            )}

                        </div>
                    </>)}

                <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
                    © {new Date().getFullYear()} Speedex Courier Inc. All rights reserved.
                </p>
            </div>
        </div>
    );
}