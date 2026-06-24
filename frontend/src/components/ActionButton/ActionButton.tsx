import React from 'react';
import './ActionButton.css';

interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    icon?: React.ReactNode;
    children: React.ReactNode;
}

const ActionButton: React.FC<ActionButtonProps> = ({ icon, children, className = '', ...props }) => {
    return (
        <button className={`quick-action-btn-header ${className}`} {...props}>
            {icon && <span className="action-btn-icon">{icon}</span>}
            <span>{children}</span>
        </button>
    );
};

export default ActionButton;
