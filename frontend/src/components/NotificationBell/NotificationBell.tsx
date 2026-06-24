import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2 } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import EmptyState from '../ui/EmptyState';
import './NotificationBell.css';

export interface NotificationItem {
    notificationId: string;
    taskId: string | null;
    notificationType: string;
    message: string;
    isRead: boolean;
    createdAt: string;
}

interface NotificationBellProps {
    apiEndpoint: string;
}

function getTypeBadge(type: string): { label: string; cls: string } {
    switch (type) {
        case 'TaskAssigned':
            return { label: 'Task assigned', cls: 'task-assigned' };
        case 'TaskDeadlineApproaching':
            return { label: 'Deadline', cls: 'deadline' };
        default:
            return { label: type, cls: 'default' };
    }
}

function timeAgo(iso: string): string {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

type FilterTab = 'all' | 'unread';

export default function NotificationBell({ apiEndpoint }: NotificationBellProps) {
    const [notifs, setNotifs] = useState<NotificationItem[]>([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
    const [activeTab, setActiveTab] = useState<FilterTab>('all');
    const [notifPage, setNotifPage] = useState(1);
    const [notifTotalPages, setNotifTotalPages] = useState(1);
    const [notifTotalRecords, setNotifTotalRecords] = useState(0);
    const [notifTotalUnread, setNotifTotalUnread] = useState(0);
    const NOTIF_PAGE_SIZE = 10;
    const wrapRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const unreadCount = notifTotalUnread;
    const baseUrl = apiEndpoint.substring(0, apiEndpoint.lastIndexOf('/'));

    const visibleNotifs = activeTab === 'unread'
        ? notifs.filter(n => !n.isRead)
        : notifs;

    const fetchNotifs = async (page?: number) => {
        try {
            const p = page ?? notifPage;
            const token = localStorage.getItem('authToken');
            const sep = apiEndpoint.includes('?') ? '&' : '?';
            const res = await fetch(`${apiEndpoint}${sep}pageNumber=${p}&pageSize=${NOTIF_PAGE_SIZE}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error();
            const json = await res.json();
            const paginated = json?.data ?? json;
            const list: NotificationItem[] = Array.isArray(paginated)
                ? paginated
                : paginated?.data ?? paginated?.notifications ?? paginated?.items ?? [];
            const totalPages = paginated?.totalPages ?? 1;
            const totalRecords = paginated?.totalRecords ?? list.length;
            const totalUnread = paginated?.totalUnread ?? list.filter((n: NotificationItem) => !n.isRead).length;
            setNotifTotalPages(totalPages);
            setNotifTotalRecords(totalRecords);
            setNotifTotalUnread(totalUnread);
            setNotifPage(p);
            setNotifs(prev => {
                const locallyRead = new Set(
                    prev.filter(n => n.isRead).map(n => n.notificationId)
                );
                return list.map(n => ({
                    ...n,
                    isRead: n.isRead || locallyRead.has(n.notificationId),
                }));
            });
        } catch {
            // silently fail
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifs(1);
        const interval = setInterval(() => fetchNotifs(notifPage), 5000);
        return () => clearInterval(interval);
    }, [apiEndpoint]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (
                wrapRef.current && !wrapRef.current.contains(e.target as Node) &&
                dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
            ) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleOpen = () => {
        if (!open && wrapRef.current) {
            const rect = wrapRef.current.getBoundingClientRect();
            setDropdownPos({
                top: rect.bottom + window.scrollY + 6,
                right: window.innerWidth - rect.right,
            });
        }
        setOpen(o => !o);
    };

    const markAsRead = async (id: string) => {
        setNotifs(prev => prev.map(n =>
            n.notificationId === id ? { ...n, isRead: true } : n
        ));
        try {
            const token = localStorage.getItem('authToken');
            const res = await fetch(`${baseUrl}/${id}/read`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            });
            if (!res.ok) {
                setNotifs(prev => prev.map(n =>
                    n.notificationId === id ? { ...n, isRead: false } : n
                ));
            }
        } catch {
            setNotifs(prev => prev.map(n =>
                n.notificationId === id ? { ...n, isRead: false } : n
            ));
        }
    };

    const markAllAsRead = async () => {
        const unread = notifs.filter(n => !n.isRead);
        if (unread.length === 0) return;

        setNotifs(prev => prev.map(n => ({ ...n, isRead: true })));

        const token = localStorage.getItem('authToken');

        const results = await Promise.allSettled(
            unread.map(n =>
                fetch(`${baseUrl}/${n.notificationId}/read`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                })
            )
        );

        results.forEach((result, index) => {
            const id = unread[index].notificationId;
            if (result.status === 'rejected' || !result.value.ok) {
                setNotifs(prev => prev.map(n =>
                    n.notificationId === id ? { ...n, isRead: false } : n
                ));
            }
        });
    };

    return (
        <div ref={wrapRef} className="notif-wrap">
            <button className="notif-btn" onClick={handleOpen} aria-label="Notifications">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18" height="18"
                    viewBox="0 0 24 24"
                    fill="#4318ff"
                    stroke="#4318ff"
                    strokeWidth="1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {unreadCount > 0 && (
                    <span className="notif-badge">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {open && createPortal(
                <div
                    ref={dropdownRef}
                    className="notif-dropdown"
                    style={{ top: dropdownPos.top, right: dropdownPos.right }}
                >
                    {/* Header */}
                    <div className="notif-header">
                        <span className="notif-header-title">Notifications</span>
                        {unreadCount > 0 && (
                            <button className="notif-mark-all-btn" onClick={markAllAsRead}>
                                Mark all as read
                            </button>
                        )}
                    </div>

                    {/* Tabs */}
                    <div className="notif-tabs">
                        <button
                            className={`notif-tab ${activeTab === 'all' ? 'active' : ''}`}
                            onClick={() => setActiveTab('all')}
                        >
                            All
                            <span className="notif-tab-count">{notifs.length}</span>
                        </button>
                        <button
                            className={`notif-tab ${activeTab === 'unread' ? 'active' : ''}`}
                            onClick={() => setActiveTab('unread')}
                        >
                            Unread
                            {unreadCount > 0 && (
                                <span className="notif-tab-count unread">{unreadCount}</span>
                            )}
                        </button>
                    </div>

                    {/* List */}
                    <div className="notif-list">
                        {loading ? (
                            <div className="notif-loading">
                                <Loader2 size={16} className="spin" /> Loading…
                            </div>
                        ) : visibleNotifs.length === 0 ? (
                            <EmptyState title={activeTab === 'unread' ? 'No unread notifications' : 'No notifications'} />
                        ) : visibleNotifs.map(n => {
                            const badge = getTypeBadge(n.notificationType);
                            return (
                                <div
                                    key={n.notificationId}
                                    className={`notif-item ${n.isRead ? 'read' : 'unread'}`}
                                    onClick={() => !n.isRead && markAsRead(n.notificationId)}
                                    style={{ cursor: n.isRead ? 'default' : 'pointer' }}
                                >
                                    <div className={`notif-dot ${n.isRead ? 'read' : 'unread'}`} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                                            <StatusBadge status={badge.label} size="sm" />
                                            {n.isRead && (
                                                <span style={{ fontSize: 10, color: 'var(--text-muted, #a3aed0)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                                                    ✓ Read
                                                </span>
                                            )}
                                        </div>
                                        <div className="notif-message" style={{ color: n.isRead ? 'var(--text-muted, #a3aed0)' : 'var(--text-primary)' }}>
                                            {n.message}
                                        </div>
                                        <div className="notif-time">{timeAgo(n.createdAt)}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Footer */}
                    {notifTotalRecords > 0 && (
                        <div className="notif-footer">
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                {notifs.filter(n => n.isRead).length} read · {notifTotalRecords} total
                            </div>
                            {notifTotalPages > 1 && (
                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4, marginTop: 6 }}>
                                    <button className="btn btn-sm" disabled={notifPage <= 1}
                                        onClick={() => fetchNotifs(notifPage - 1)}
                                        style={{ fontSize: 10, padding: '2px 6px', opacity: notifPage <= 1 ? 0.4 : 1 }}>
                                        ‹
                                    </button>
                                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>
                                        {notifPage} / {notifTotalPages}
                                    </span>
                                    <button className="btn btn-sm" disabled={notifPage >= notifTotalPages}
                                        onClick={() => fetchNotifs(notifPage + 1)}
                                        style={{ fontSize: 10, padding: '2px 6px', opacity: notifPage >= notifTotalPages ? 0.4 : 1 }}>
                                        ›
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>,
                document.body
            )}
        </div>
    );
}