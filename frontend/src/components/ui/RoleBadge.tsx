interface RoleBadgeProps {
    role: string;
    size?: 'sm' | 'md';
}

const ROLE_COLORS: Record<string, string> = {
    MANAGER: 'var(--role-super-admin)',
    COORDINATOR: 'var(--role-ops-team)',
    DISPATCHER: '#0284C7',
    ENCODER: '#0284C7',
    COURIER: '#0284C7',
};

export default function RoleBadge({ role, size = 'md' }: RoleBadgeProps) {
    const roleStr = String(role ?? '');
    const color = ROLE_COLORS[roleStr.toUpperCase()] ?? 'var(--text-secondary)';
    const fontSize = size === 'sm' ? '0.62rem' : '0.72rem';
    const padding = size === 'sm' ? '2px 6px' : '3px 12px';
    return (
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding,
                borderRadius: 999,
                fontSize,
                fontWeight: 700,
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                background: `${color}15`,
                color,
            }}
        >
            {roleStr}
        </span>
    );
}
