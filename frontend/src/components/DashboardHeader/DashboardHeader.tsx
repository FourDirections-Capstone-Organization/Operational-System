import React, { useState, useEffect, useRef } from 'react';
import { User, Settings, LogOut } from 'lucide-react';
import NotificationBell from '../NotificationBell/NotificationBell';
import './DashboardHeader.css';

interface DashboardHeaderProps {
    title: string;
    notificationApi?: string;
    userInitials?: string;
    onSettingsClick?: () => void;
    onLogout?: () => void;
    onMenuToggle?: () => void;
    children?: React.ReactNode;
}

export default function DashboardHeader({
    title,
    notificationApi = '/api/notification/my-notifications',
    userInitials,
    onSettingsClick,
    onLogout,
    onMenuToggle,
    children,
}: DashboardHeaderProps) {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const today = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const toggleDropdown = () => {
        setIsDropdownOpen(prev => !prev);
    };

    return (
        <div className="dashboard-header">
            {onMenuToggle && (
                <button className="sidebar-toggle-btn" onClick={onMenuToggle} aria-label="Toggle sidebar">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
                </button>
            )}
            <div className="header-title">
                <h2>{title}</h2>
            </div>

            {/* Custom actions slot (search inputs, quick action buttons) */}
            {children && <div className="header-custom-actions">{children}</div>}

            <div className="dashboard-header-right">
                <div className="dashboard-header-right-meta">
                    <span className="dashboard-header-company">Speedex Courier Inc.</span>
                    <span className="dashboard-header-date">{today}</span>
                </div>
                {notificationApi && (
                    <NotificationBell apiEndpoint={notificationApi} />
                )}
                
                <div className="dashboard-header-profile-container" ref={dropdownRef}>
                    <button
                        className="dashboard-header-profile-btn"
                        onClick={toggleDropdown}
                        title="Profile Menu"
                        type="button"
                        aria-expanded={isDropdownOpen}
                    >
                        {userInitials ? (
                            <span className="profile-btn-initials">{userInitials}</span>
                        ) : (
                            <User size={18} />
                        )}
                    </button>

                    {isDropdownOpen && (
                        <div className="profile-dropdown-menu">
                            {onSettingsClick && (
                                <button
                                    type="button"
                                    className="dropdown-item"
                                    onClick={() => {
                                        setIsDropdownOpen(false);
                                        onSettingsClick();
                                    }}
                                >
                                    <Settings size={14} />
                                    <span>Settings</span>
                                </button>
                            )}
                            {onLogout && (
                                <button
                                    type="button"
                                    className="dropdown-item logout-item"
                                    onClick={() => {
                                        setIsDropdownOpen(false);
                                        onLogout();
                                    }}
                                >
                                    <LogOut size={14} />
                                    <span>Log out</span>
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
