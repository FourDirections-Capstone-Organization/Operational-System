import React from 'react';
import './StatCard.css';

export interface StatCardProps {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    subtext?: string;
    variant?: 'primary' | 'success' | 'danger' | 'warning' | string;
    className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
    icon,
    label,
    value,
    subtext,
    variant = 'primary',
    className = '',
}) => {
    return (
        <div className={`stat-card accent-${variant} ${className}`}>
            <div className="stat-card-top">
                <div className={`stat-icon bg-${variant}`}>
                    {icon}
                </div>
                <div className="stat-text">
                    <span className="stat-label">{label}</span>
                </div>
            </div>
            <h3 className="stat-value">{value}</h3>
            {subtext && <div className="stat-subtext">{subtext}</div>}
        </div>
    );
};

export default StatCard;
