import React, { useState, useEffect } from 'react';
import {
    FileText, Download, Eye, Upload, Search,
    CheckCircle2, Clock, Archive, AlertCircle, Loader2,
    Plus, Calendar, User, Tag, Info, EyeOff,
} from 'lucide-react';
import { useToast } from '../../../components/Toast/Toast';
import DataTable from '../../../components/ui/DataTable';
import FormModal from '../../../components/FormModal/FormModal';
import StatusBadge from '../../../components/ui/StatusBadge';
import ConfirmationModal from '../../../components/ConfirmationModal/ConfirmationModal';

const PAGE_SIZE = 15;

const CONTRACT_TYPES = [
    'Employment Contract',
    'Contract Amendment',
    'NDA',
    'Job Description',
    'Probationary Agreement',
    'Other',
];

const OTHER_DOC_TYPES = [
    'Resume/CV',
    'Government Records',
    'Certificates',
    'Performance Evaluations',
    'Disciplinary Records',
];

const ALL_DOC_TYPES = [...CONTRACT_TYPES, ...OTHER_DOC_TYPES];

const fmt = (bytes: any) => {
    if (!bytes) return '—';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const fmtDate = (d: any) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const fmtDateTime = (d: any) => {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

// ─── Upload Modal ──────────────────────────────────────────────────────────

function UploadDocumentModal({ employees, onClose, onUploaded }: { employees: any[], onClose: () => void, onUploaded: () => void }) {
    const [step, setStep] = useState(1);
    const [searchEmp, setSearchEmp] = useState('');
    const [selectedEmp, setSelectedEmp] = useState<any>(null);
    const [isContract, setIsContract] = useState(true);
    const [docType, setDocType] = useState(CONTRACT_TYPES[0]);
    const [docTitle, setDocTitle] = useState('');
    const [effectiveDate, setEffectiveDate] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState<any>({});
    const [showPasswordGate, setShowPasswordGate] = useState(false);
    const [gatePassword, setGatePassword] = useState('');
    const [gateError, setGateError] = useState('');
    const [gateLoading, setGateLoading] = useState(false);
    const [showGatePw, setShowGatePw] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const fileRef = React.useRef<HTMLInputElement>(null);

    const filteredEmps = employees.filter((e: any) => {
        const name = `${e.firstName || ''} ${e.lastName || ''}`.toLowerCase();
        const num = (e.employeeNumber || '').toLowerCase();
        const q = searchEmp.toLowerCase();
        return name.includes(q) || num.includes(q);
    });

    const validateFile = (f: File) => {
        const ext = '.' + f.name.split('.').pop()?.toLowerCase();
        if (isContract && ext !== '.pdf') {
            return 'Contracts must be PDF format to maintain legal document integrity.';
        }
        if (!isContract && !['.pdf', '.jpg', '.jpeg', '.png'].includes(ext)) {
            return 'Only PDF, JPG, and PNG files are allowed.';
        }
        if (f.size > 15 * 1024 * 1024) {
            return 'File must be under 15 MB.';
        }
        return '';
    };

    const handleTypeChange = (type: string) => {
        setDocType(type);
        setIsContract(CONTRACT_TYPES.includes(type));
        setFieldErrors((p: any) => ({ ...p, docType: undefined }));
    };

    const validate = () => {
        const errs: any = {};
        if (!selectedEmp) errs.emp = 'Select an employee.';
        if (!docType) errs.docType = 'Select a document type.';
        if (!effectiveDate) errs.effectiveDate = 'Effective Start Date is required.';
        if (!file) errs.file = 'Please attach a file.';
        setFieldErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const doUpload = async () => {
        setSubmitting(true);
        setError('');
        try {
            const token = localStorage.getItem('authToken');
            const fd = new FormData();

            if (isContract) {
                fd.append('ContractType', docType);
                fd.append('EffectiveStartDate', new Date(effectiveDate).toISOString());
                if (file) fd.append('File', file);
                const url = `/api/systemadmin/contracts/upload?employeeNumber=${encodeURIComponent(selectedEmp.employeeNumber)}`;
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                    body: fd,
                });
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.message || 'Upload failed.');
                }
                const result = await res.json();
                if (!result.isSuccess) throw new Error(result.message || 'Upload failed.');
            } else {
                fd.append('DocumentType', docType);
                fd.append('DocumentTitle', docTitle.trim() || docType);
                fd.append('IssueDate', new Date(effectiveDate).toISOString());
                if (file) fd.append('File', file);
                const url = `/api/systemadmin/documents/upload?employeeNumber=${encodeURIComponent(selectedEmp.employeeNumber)}`;
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                    body: fd,
                });
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.message || 'Upload failed.');
                }
                const result = await res.json();
                if (!result.isSuccess) throw new Error(result.message || 'Upload failed.');
            }

            setUploadSuccess(true);
            setShowPasswordGate(false);
            setTimeout(() => {
                onUploaded();
                onClose();
            }, 1500);
        } catch (err: any) {
            setError(err.message ?? 'Something went wrong.');
            setShowPasswordGate(false);
        } finally {
            setSubmitting(false);
        }
    };

    const handleSubmit = () => {
        if (!validate()) return;
        setGatePassword('');
        setGateError('');
        setShowPasswordGate(true);
    };

    const inputStyle = (err?: string) => ({
        height: 42,
        borderRadius: 8,
        border: `1.5px solid ${err ? '#ef4444' : '#e2e8f0'}`,
        padding: '0 14px',
        fontSize: 13,
        color: '#0f172a',
        background: '#fff',
        outline: 'none',
        width: '100%',
        boxSizing: 'border-box' as const,
        fontFamily: 'inherit',
        transition: 'border-color 0.15s',
    });

    const selectStyle = (err?: string) => ({
        height: 42,
        borderRadius: 8,
        border: `1.5px solid ${err ? '#ef4444' : '#e2e8f0'}`,
        padding: '0 32px 0 14px',
        fontSize: 13,
        color: '#0f172a',
        background: '#fff',
        outline: 'none',
        width: '100%',
        boxSizing: 'border-box' as const,
        fontFamily: 'inherit',
        appearance: 'none' as const,
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 12px center',
        transition: 'border-color 0.15s',
    });

    const labelStyle: React.CSSProperties = {
        fontSize: 12,
        fontWeight: 700,
        color: '#374151',
        marginBottom: 6,
        display: 'block',
    };

    return (
        <FormModal isOpen onClose={onClose} title="Upload Document"
            subtitle={`Step ${step} of 2 — ${step === 1 ? 'Choose employee' : 'Document details'}`} size="md" confirmOnCancel={true}
        >
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                {[1, 2].map(s => (
                    <div key={s} style={{ flex: 1, height: 4, borderRadius: 4, background: s <= step ? '#4318ff' : '#e2e8f0', transition: 'background 0.2s' }} />
                ))}
            </div>

            {error && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#dc2626' }}>
                    <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span>{error}</span>
                </div>
            )}

            {step === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input
                            type="text"
                            placeholder="Search by name or employee ID…"
                            value={searchEmp}
                            onChange={e => setSearchEmp(e.target.value)}
                            style={{ ...inputStyle(), paddingLeft: 36 }}
                            autoFocus
                        />
                    </div>
                    {fieldErrors.emp && (
                        <span style={{ fontSize: 11, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <AlertCircle size={11} /> {fieldErrors.emp}
                        </span>
                    )}
                    <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {filteredEmps.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '24px 0', color: '#64748b', fontSize: 13 }}>No employees found</div>
                        ) : filteredEmps.map((emp: any) => {
                            const name = `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.employeeNumber;
                            const selected = selectedEmp?.employeeNumber === emp.employeeNumber;
                            return (
                                <div
                                    key={emp.employeeNumber}
                                    onClick={() => setSelectedEmp(emp)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 12,
                                        padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                                        border: `1.5px solid ${selected ? '#4318ff' : '#e2e8f0'}`,
                                        background: selected ? 'rgba(67,24,255,0.04)' : '#fff',
                                    }}
                                >
                                    <div className="emp-avatar" style={{ width: 36, height: 36, fontSize: 14, flexShrink: 0 }}>
                                        {(emp.firstName?.[0] || emp.lastName?.[0] || '?').toUpperCase()}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, fontSize: 13 }}>{name}</div>
                                        <div style={{ fontSize: 11, color: '#64748b' }}>#{emp.employeeNumber} · {emp.role || '—'}</div>
                                    </div>
                                    {selected && <CheckCircle2 size={16} color="#4318ff" />}
                                </div>
                            );
                        })}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                        <button
                            className="btn btn-primary"
                            onClick={() => { if (!selectedEmp) { setFieldErrors((p: any) => ({ ...p, emp: 'Select an employee.' })); return; } setStep(2); }}
                            style={{ padding: '9px 24px', borderRadius: 10 }}
                        >
                            Continue →
                        </button>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(67,24,255,0.04)', border: '1px solid rgba(67,24,255,0.15)', borderRadius: 10, padding: '10px 14px' }}>
                        <div className="emp-avatar" style={{ width: 34, height: 34, fontSize: 13, flexShrink: 0 }}>
                            {(selectedEmp.firstName?.[0] || selectedEmp.lastName?.[0] || '?').toUpperCase()}
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 13 }}>{`${selectedEmp.firstName || ''} ${selectedEmp.lastName || ''}`.trim() || selectedEmp.employeeNumber}</div>
                            <div style={{ fontSize: 11, color: '#4318ff' }}>#{selectedEmp.employeeNumber}</div>
                        </div>
                        <button onClick={() => setStep(1)} style={{ marginLeft: 'auto', fontSize: 11, color: '#4318ff', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Change</button>
                    </div>

                    <div>
                        <label style={labelStyle}>
                            Document Type <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <select
                            style={selectStyle(fieldErrors.docType)}
                            value={docType}
                            onChange={e => handleTypeChange(e.target.value)}
                        >
                            <optgroup label="Contract Documents">
                                {CONTRACT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </optgroup>
                            <optgroup label="Other Documents">
                                {OTHER_DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </optgroup>
                        </select>
                        {fieldErrors.docType && (
                            <span style={{ fontSize: 11, color: '#ef4444', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <AlertCircle size={11} /> {fieldErrors.docType}
                            </span>
                        )}
                    </div>

                    {!isContract && (
                        <div>
                            <label style={labelStyle}>
                                Document Title <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. Updated Resume, 2024 Certification"
                                value={docTitle}
                                onChange={e => { setDocTitle(e.target.value); setFieldErrors((p: any) => ({ ...p, docTitle: undefined })); }}
                                style={inputStyle(fieldErrors.docTitle)}
                            />
                            {fieldErrors.docTitle && (
                                <span style={{ fontSize: 11, color: '#ef4444', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <AlertCircle size={11} /> {fieldErrors.docTitle}
                                </span>
                            )}
                        </div>
                    )}

                    <div>
                        <label style={labelStyle}>
                            <Calendar size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                            Effective Start Date <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                            type="date"
                            value={effectiveDate}
                            onChange={e => { setEffectiveDate(e.target.value); setFieldErrors((p: any) => ({ ...p, effectiveDate: undefined })); }}
                            style={inputStyle(fieldErrors.effectiveDate)}
                        />
                        {fieldErrors.effectiveDate ? (
                            <span style={{ fontSize: 11, color: '#ef4444', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <AlertCircle size={11} /> {fieldErrors.effectiveDate}
                            </span>
                        ) : (
                            <span style={{ fontSize: 11, color: '#64748b', marginTop: 4, display: 'block' }}>
                                {isContract
                                    ? 'When this contract takes effect. Any prior active contract will be automatically archived.'
                                    : 'Date this document was issued.'}
                            </span>
                        )}
                    </div>

                    <div>
                        <label style={labelStyle}>
                            <FileText size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                            File <span style={{ color: '#ef4444' }}>*</span>
                            {isContract && (
                                <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, background: 'rgba(67,24,255,0.1)', color: '#4318ff', padding: '1px 6px', borderRadius: 4, verticalAlign: 'middle' }}>PDF only</span>
                            )}
                        </label>
                        <div
                            onClick={() => fileRef.current?.click()}
                            style={{
                                border: `2px dashed ${fieldErrors.file ? '#ef4444' : '#cbd5e1'}`,
                                borderRadius: 12, padding: '24px 20px', textAlign: 'center', cursor: 'pointer',
                            }}
                        >
                            {file ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                                    <FileText size={28} color="#4318ff" />
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: 13 }}>{file.name}</div>
                                        <div style={{ fontSize: 11, color: '#64748b' }}>{fmt(file.size)}</div>
                                    </div>
                                    <button type="button" onClick={e => { e.stopPropagation(); setFile(null); }} style={{ fontSize: 11, color: '#ee5d50', background: 'none', border: 'none', cursor: 'pointer' }}>Remove file</button>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: '#64748b' }}>
                                    <Upload size={24} />
                                    <div><span style={{ fontWeight: 600, color: '#4318ff' }}>Click to browse</span> or drag & drop</div>
                                    <div style={{ fontSize: 11 }}>{isContract ? 'PDF only · max 15 MB' : 'PDF, JPG, PNG · max 15 MB'}</div>
                                </div>
                            )}
                        </div>
                        <input ref={fileRef} type="file" accept={isContract ? '.pdf' : '.pdf,.jpg,.jpeg,.png'} style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0] || null; if (f) { const err = validateFile(f); if (err) { setFieldErrors((p: any) => ({ ...p, file: err })); return; } setFile(f); setFieldErrors((p: any) => ({ ...p, file: undefined })); } }} />
                        {fieldErrors.file && (
                            <span style={{ fontSize: 11, color: '#ef4444', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <AlertCircle size={11} /> {fieldErrors.file}
                            </span>
                        )}
                    </div>

                    {isContract && (
                        <div style={{ display: 'flex', gap: 8, background: 'rgba(255,181,71,0.08)', border: '1px solid rgba(255,181,71,0.25)', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#334155' }}>
                            <Info size={14} style={{ flexShrink: 0, marginTop: 1, color: '#f59e0b' }} />
                            <span>
                                Uploading this contract will automatically archive any prior active contract for this employee.
                                Only PDF format is accepted to maintain legal document integrity.
                            </span>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
                        <button className="btn" onClick={() => setStep(1)} disabled={submitting} style={{ padding: '9px 18px', borderRadius: 10 }}>← Back</button>
                        <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting} style={{ padding: '9px 24px', borderRadius: 10 }}>
                            {submitting ? <><Loader2 size={13} className="fm-spin" /> Uploading…</> : <><Upload size={13} /> Upload Document</>}
                        </button>
                    </div>
                </div>
            )}

            {showPasswordGate && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }} onClick={() => { if (!submitting) setShowPasswordGate(false); }}>
                    <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: 380, maxWidth: '90vw', boxShadow: '0 24px 64px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
                        {uploadSuccess ? (
                            <div style={{ textAlign: 'center', padding: '20px 0' }}>
                                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(5,150,105,0.1)', border: '2px solid rgba(5,150,105,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                    <CheckCircle2 size={28} color="#059669" />
                                </div>
                                <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800, color: '#0f172a' }}>Upload Successful!</h3>
                                <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>Document has been uploaded successfully.</p>
                            </div>
                        ) : (
                            <>
                                <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Confirm Your Identity</h3>
                                <p style={{ margin: '0 0 20px', fontSize: 13, color: '#64748b' }}>Enter your password to proceed with the upload.</p>
                                <div style={{ position: 'relative' }}>
                                    <input type={showGatePw ? 'text' : 'password'} placeholder="Enter your current password" value={gatePassword} autoFocus
                                        onChange={e => { setGatePassword(e.target.value); setGateError(''); }}
                                        onKeyDown={e => { if (e.key === 'Enter' && !gateLoading) { (document.getElementById('gate-upload-confirm') as HTMLButtonElement)?.click(); } }}
                                        style={{ width: '100%', height: 42, borderRadius: 10, border: `1.5px solid ${gateError ? '#dc2626' : '#e2e8f0'}`, padding: '0 44px 0 14px', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                                    />
                                    <button type="button" onClick={() => setShowGatePw(p => !p)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }} tabIndex={-1}>
                                        {showGatePw ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                                {gateError && <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#dc2626', marginTop: 8 }}><AlertCircle size={12} />{gateError}</div>}
                                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                                    <button className="btn" onClick={() => setShowPasswordGate(false)} disabled={gateLoading} style={{ padding: '9px 18px', borderRadius: 10 }}>Cancel</button>
                                    <button id="gate-upload-confirm" className="btn btn-primary" disabled={gateLoading} onClick={async () => {
                                        if (!gatePassword) { setGateError('Please enter your password.'); return; }
                                        setGateLoading(true);
                                        setGateError('');
                                        try {
                                            const token = localStorage.getItem('authToken');
                                            const adminId = localStorage.getItem('employeeId') ?? '';
                                            const verifyRes = await fetch('/api/authentication/verify-password', {
                                                method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                                body: JSON.stringify({ employeeID: adminId, password: gatePassword }),
                                            });
                                            const verifyData = await verifyRes.json().catch(() => ({}));
                                            if (!verifyData.isSuccess) { throw new Error(verifyData.message || verifyData.Message || 'Incorrect password.'); }
                                            await doUpload();
                                        } catch (err: any) { setGateError(err.message ?? 'Incorrect password.'); }
                                        finally { setGateLoading(false); }
                                    }} style={{ padding: '9px 24px', borderRadius: 10 }}>
                                        {gateLoading ? <><Loader2 size={13} className="fm-spin" /> Verifying…</> : <>Verify & Upload</>}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </FormModal>
    );
}

// ─── Detail Modal ──────────────────────────────────────────────────────────

function DetailModal({ doc, onClose, onArchive }: { doc: any, onClose: () => void, onArchive: () => void }) {
    const isArchived = doc.isArchived || doc.contractStatus === 'Archived';
    const empName = doc.employeeName || `${doc.firstName || ''} ${doc.lastName || ''}`.trim() || '—';
    const isContract = doc.documentType === 'Employment Contract' || doc.documentType === 'Contract Amendment';
    return (
        <FormModal isOpen onClose={onClose} title="Document Details"
            subtitle={`${doc.documentTitle || doc.documentType} — ${empName}`} size="md"
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, marginBottom: 18, background: isArchived ? 'rgba(100,116,139,0.08)' : 'rgba(5,150,105,0.06)', border: `1px solid ${isArchived ? 'rgba(100,116,139,0.2)' : 'rgba(5,150,105,0.2)'}`, fontSize: 13, fontWeight: 600, color: isArchived ? '#64748b' : '#059669' }}>
                {isArchived ? <Archive size={14} /> : <CheckCircle2 size={14} />}
                {isArchived ? 'This document has been archived.' : 'This document is active.'}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                <div className="emp-avatar" style={{ width: 40, height: 40, flexShrink: 0 }}>{(doc.firstName?.[0] || doc.lastName?.[0] || '?').toUpperCase()}</div>
                <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{empName}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>#{doc.employeeNumber}</div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px', marginBottom: 18 }}>
                {[
                    { label: 'Document Type', value: doc.documentType, icon: <Tag size={11} /> },
                    { label: 'Title', value: doc.documentTitle || '—', icon: <FileText size={11} /> },
                    { label: 'Version', value: `v${doc.version}`, icon: <Clock size={11} /> },
                    { label: isContract ? 'Effective Start Date' : 'Issue Date', value: fmtDate(doc.issueDate || doc.effectiveStartDate), icon: <Calendar size={11} /> },
                    { label: 'File Name', value: doc.fileName, icon: <FileText size={11} /> },
                    { label: 'File Size', value: fmt(doc.fileSize), icon: <Info size={11} /> },
                    { label: 'Uploaded At', value: fmtDateTime(doc.uploadedAt), icon: <Clock size={11} /> },
                ].map(({ label, value, icon }) => (
                    <div key={label} style={{ background: '#f8fafc', borderRadius: 10, padding: '10px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#64748b', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>{icon} {label}</div>
                        <div style={{ fontSize: 13, fontWeight: 600, wordBreak: 'break-word', color: '#0f172a' }}>{value}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button className="btn" onClick={onClose} style={{ padding: '9px 18px', borderRadius: 10 }}>Close</button>
                <button className="btn btn-primary" onClick={() => window.open(doc.fileUrl, '_blank')} style={{ padding: '9px 20px', borderRadius: 10 }}><Download size={13} /> Download</button>
                {!isArchived && (
                    <button className="btn" style={{ padding: '9px 18px', borderRadius: 10, color: '#dc2626', borderColor: 'rgba(220,38,38,0.3)' }} onClick={onArchive}><Archive size={13} /> Archive</button>
                )}
            </div>
        </FormModal>
    );
}

// ─── Main Component ────────────────────────────────────────────────────────

export default function EmployeeDocumentsTab({ employees = [], onOpenDigital201 }: { employees?: any[], onOpenDigital201: (emp: any) => void }) {
    const { success, error } = useToast();
    const [docs, setDocs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [search, setSearch] = useState('');
    const [filterDocType, setFilterDocType] = useState('');
    const [filterStatus, setFilterStatus] = useState('active');
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [detailDoc, setDetailDoc] = useState<any>(null);
    const [archiveTarget, setArchiveTarget] = useState<any>(null);

    const fetchDocs = async (pg = 1) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            const params = new URLSearchParams({ PageNumber: String(pg), PageSize: String(PAGE_SIZE) });
            if (search) params.append('search', search);
            if (filterDocType) params.append('documentType', filterDocType);
            if (filterStatus === 'active') params.append('isArchived', 'false');
            else if (filterStatus === 'archived') params.append('isArchived', 'true');

            const res = await fetch(`/api/systemadmin/documents?${params}`, { headers: { Authorization: `Bearer ${token}` } });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const result = await res.json();
            if (result.isSuccess && result.data) {
                const raw: any[] = Array.isArray(result.data.data) ? result.data.data : [];
                raw.sort((a, b) => new Date(b.issueDate || b.uploadedAt).getTime() - new Date(a.issueDate || a.uploadedAt).getTime());
                setDocs(raw);
                setTotalPages(result.data.totalPages ?? 1);
                setTotalCount(result.data.totalRecords ?? raw.length);
                setPage(pg);
            } else {
                setDocs([]);
                setTotalPages(1);
                setTotalCount(0);
            }
        } catch { setDocs([]); } finally { setLoading(false); }
    };

    useEffect(() => { fetchDocs(1); }, [search, filterDocType, filterStatus]);

    const handleArchiveConfirm = async () => {
        if (!archiveTarget) return;
        try {
            const token = localStorage.getItem('authToken');
            const res = await fetch(`/api/systemadmin/documents/${archiveTarget.employeeAttachmentId ?? archiveTarget.contractId}/archive`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Failed to archive document.');
            success('Document archived successfully.');
            setArchiveTarget(null);
            fetchDocs(page);
        } catch (err: any) {
            error(err.message ?? 'Failed to archive document.');
            setArchiveTarget(null);
        }
    };

    const activeCount = docs.filter((d: any) => !d.isArchived).length;
    const archivedCount = docs.filter((d: any) => d.isArchived).length;

    return (
        <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.2)', borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 600, color: '#059669' }}>
                    <CheckCircle2 size={12} /> {activeCount} active
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 600, color: '#64748b' }}>
                    <Archive size={12} /> {archivedCount} archived
                </div>
            </div>

            <DataTable
                searchQuery={search}
                onSearchChange={setSearch}
                searchPlaceholder="Search by employee name, title, or ID…"
                filterElements={
                    <>
                        <div style={{ display: 'flex', gap: 4, background: '#f8fafc', borderRadius: 10, padding: 3 }}>
                            {[
                                { value: 'active', label: 'Active' },
                                { value: 'archived', label: 'Archived' },
                                { value: 'all', label: 'All' },
                            ].map(opt => (
                                <button key={opt.value} onClick={() => setFilterStatus(opt.value)} style={{ padding: '4px 10px', borderRadius: 7, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: filterStatus === opt.value ? '#fff' : 'transparent', color: filterStatus === opt.value ? '#4318ff' : '#64748b', boxShadow: filterStatus === opt.value ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                        <select value={filterDocType} onChange={e => setFilterDocType(e.target.value)} style={{ height: 36, borderRadius: 8, border: '1.5px solid #e2e8f0', padding: '0 32px 0 14px', background: '#fff', color: '#0f172a', fontSize: '0.82rem', fontWeight: 500, outline: 'none', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}>
                            <option value="">All Types</option>
                            {ALL_DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </>
                }
                actionButton={{ label: 'Upload Document', icon: <Plus size={14} />, onClick: () => setShowUploadModal(true) }}
                headers={['Employee', 'Document Type', 'Title', 'Effective Date', 'File', 'Size', 'Status', 'Actions']}
                loading={loading}
                emptyMessage="No documents match your filters."
                emptyIcon={<FileText size={24} />}
                currentPage={page}
                totalPages={totalPages}
                onPageChange={fetchDocs}
                totalRecords={totalCount}
            >
                {docs.map((doc: any) => {
                    const empName = doc.employeeName || `${doc.firstName || ''} ${doc.lastName || ''}`.trim() || '—';
                    const isArchived = doc.isArchived;
                    return (
                        <tr key={doc.employeeAttachmentId} style={{ opacity: isArchived ? 0.7 : 1 }}>
                            <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                                    <div className="emp-avatar" style={{ width: 32, height: 32, fontSize: 12, flexShrink: 0 }}>
                                        {(doc.firstName?.[0] || doc.lastName?.[0] || '?').toUpperCase()}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: 13 }}>{empName}</div>
                                        <div style={{ fontSize: 11, color: '#64748b' }}>#{doc.employeeNumber}</div>
                                    </div>
                                </div>
                            </td>
                            <td><span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: 'rgba(67,24,255,0.08)', color: '#4318ff' }}>{doc.documentType}</span></td>
                            <td style={{ fontWeight: 600, fontSize: 13 }}>{doc.documentTitle || doc.fileName || '—'}</td>
                            <td style={{ fontSize: 12, whiteSpace: 'nowrap', color: '#64748b' }}>
                                <Calendar size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                                {fmtDate(doc.issueDate || doc.effectiveStartDate)}
                            </td>
                            <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <FileText size={13} style={{ color: '#dc2626', flexShrink: 0 }} />
                                    <span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }} title={doc.fileName}>{doc.fileName}</span>
                                </div>
                            </td>
                            <td style={{ fontSize: 12, color: '#64748b' }}>
                                {fmt(doc.fileSize)}
                                <span style={{ display: 'inline-block', padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: '#f1f5f9', color: '#475569', marginLeft: 4 }}>v{doc.version}</span>
                            </td>
                            <td>
                                <StatusBadge status={isArchived ? 'Archived' : 'Active'} size="sm"
                                    icon={isArchived ? <Archive size={11} /> : <CheckCircle2 size={11} />}
                                />
                            </td>
                            <td onClick={e => e.stopPropagation()}>
                                <div style={{ display: 'flex', gap: 5 }}>
                                    <button className="action-icon-btn" onClick={() => setDetailDoc(doc)} title="View details"><Eye size={13} /></button>
                                    <button className="action-icon-btn" onClick={() => window.open(doc.fileUrl, '_blank')} title="Download"><Download size={13} /></button>
                                    {!isArchived && (
                                        <button className="action-icon-btn" onClick={() => setArchiveTarget(doc)} title="Archive" style={{ color: '#dc2626' }}><Archive size={13} /></button>
                                    )}
                                    {employees.find((e: any) => e.employeeNumber === doc.employeeNumber) && (
                                        <button className="action-icon-btn" title="Digital 201 File" onClick={() => { const emp = employees.find((e: any) => e.employeeNumber === doc.employeeNumber); if (emp) onOpenDigital201(emp); }}><User size={13} /></button>
                                    )}
                                </div>
                            </td>
                        </tr>
                    );
                })}
            </DataTable>

            {showUploadModal && (
                <UploadDocumentModal
                    employees={employees}
                    onClose={() => setShowUploadModal(false)}
                    onUploaded={() => { success('Document uploaded successfully.'); fetchDocs(page); }}
                />
            )}
            {detailDoc && (
                <DetailModal
                    doc={detailDoc}
                    onClose={() => setDetailDoc(null)}
                    onArchive={() => { setDetailDoc(null); setArchiveTarget(detailDoc); }}
                />
            )}
            <ConfirmationModal
                isOpen={!!archiveTarget}
                variant="warning"
                title="Archive document?"
                description={
                    archiveTarget
                        ? `Are you sure you want to archive "${archiveTarget.documentTitle || archiveTarget.fileName}"? It will be hidden from the active view but preserved for audit purposes.`
                        : ''
                }
                confirmLabel="Archive"
                onConfirm={handleArchiveConfirm}
                onCancel={() => setArchiveTarget(null)}
            />
        </>
    );
}
