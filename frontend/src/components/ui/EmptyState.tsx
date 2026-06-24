import { Package } from 'lucide-react';

interface EmptyStateProps {
    icon?: React.ReactNode;
    title?: string;
    description?: string;
    /** @deprecated use `title` instead */
    message?: string;
    /** @deprecated use `description` instead */
    subtext?: string;
    action?: React.ReactNode;
    className?: string;
}

export default function EmptyState({
    icon,
    title,
    description,
    message,
    subtext,
    action,
    className = '',
}: EmptyStateProps) {
    const displayTitle = title || message || '';
    const displayDesc = description || subtext || '';
    return (
        <div className={`empty-state ${className}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 20px', textAlign: 'center' }}>
            {icon ?? <Package size={40} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />}
            {displayTitle && <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{displayTitle}</p>}
            {displayDesc && <p className="text-muted text-sm" style={{ marginTop: 6, maxWidth: 360 }}>{displayDesc}</p>}
            {action && <div style={{ marginTop: 16 }}>{action}</div>}
        </div>
    );
}
