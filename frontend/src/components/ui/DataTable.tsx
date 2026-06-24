import React, { useState, useRef, useEffect } from 'react';
import { Search, Loader2, ChevronLeft, ChevronRight, Package, MoreVertical } from 'lucide-react';
import ReactDOM from 'react-dom';
import './DataTable.css';

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface DataTableColumn<T> {
    header: string;
    accessor: keyof T | ((row: T) => React.ReactNode);
    className?: string;
}

export interface DataTableTab {
    key: string;
    label: string;
    icon?: React.ReactNode;
    badge?: number | string;
}

export interface DataTableAction {
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
}

export interface DropdownAction {
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    variant?: 'danger' | 'success' | 'default';
}

// ─── Props ──────────────────────────────────────────────────────────────────────

interface DataTableProps<T> {
    columns?: DataTableColumn<T>[];
    data?: T[];
    onRowClick?: (row: T) => void;
    className?: string;

    // Legacy mode (like old TableCard)
    headers?: string[];
    children?: React.ReactNode;

    // Tabs
    tabs?: DataTableTab[];
    activeTab?: string;
    onTabChange?: (key: string) => void;

    // Header / Title
    title?: string;
    headerAction?: { label: string; onClick: () => void };

    // Search
    searchQuery?: string;
    onSearchChange?: (value: string) => void;
    setSearchQuery?: (value: string) => void;
    searchPlaceholder?: string;

    // Filters (rendered between search and action button)
    filterElements?: React.ReactNode;

    // Action button (top right)
    actionButton?: DataTableAction;

    // States
    loading?: boolean;
    emptyMessage?: string;
    emptyIcon?: React.ReactNode;

    // Pagination
    currentPage?: number;
    totalPages?: number;
    onPageChange?: (page: number) => void;

    // Results info
    totalRecords?: number;
    totalResults?: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────────

function getPageNumbers(total: number, current: number): (number | '...')[] {
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

// ─── Actions Dropdown ────────────────────────────────────────────────────────────

export function ActionsDropdown({ actions }: { actions: DropdownAction[] }) {
    const [isOpen, setIsOpen] = useState(false);
    const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            const inContainer = containerRef.current?.contains(target);
            const inMenu = menuRef.current?.contains(target);
            if (!inContainer && !inMenu) setIsOpen(false);
        };
        const handleScroll = () => setIsOpen(false);
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            window.addEventListener('scroll', handleScroll, true);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, [isOpen]);

    const handleOpen = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isOpen) { setIsOpen(false); return; }
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setMenuPos({ top: rect.bottom + 4, left: rect.right - 160 });
        }
        setIsOpen(true);
    };

    const menu = isOpen && menuPos ? ReactDOM.createPortal(
        <div ref={menuRef} className="actions-dropdown-menu" style={{ top: menuPos.top, left: menuPos.left }} onClick={e => e.stopPropagation()}>
            {actions.map((act, i) => (
                <button key={i} type="button" className={`actions-dropdown-item ${act.variant ?? ''}`} onClick={() => { setIsOpen(false); act.onClick(); }}>
                    {act.icon}<span>{act.label}</span>
                </button>
            ))}
        </div>,
        document.body
    ) : null;

    return (
        <div className="actions-dropdown-container" ref={containerRef}>
            <button ref={triggerRef} type="button" className={`actions-dropdown-trigger${isOpen ? ' active' : ''}`} onClick={handleOpen} aria-label="Actions">
                <MoreVertical size={16} />
            </button>
            {menu}
        </div>
    );
}

// ─── DataTable Component ─────────────────────────────────────────────────────────

export default function DataTable<T extends Record<string, any>>({
    columns, data, onRowClick, className = '',
    headers, children: rowChildren,
    tabs, activeTab, onTabChange,
    title, headerAction,
    searchQuery, onSearchChange, setSearchQuery, searchPlaceholder = 'Search…',
    filterElements,
    actionButton,
    loading = false, emptyMessage = 'No items found', emptyIcon = <Package size={20} />,
    currentPage = 1, totalPages = 1, onPageChange,
    totalRecords, totalResults,
}: DataTableProps<T>) {
    const isLegacyMode = headers !== undefined;
    const colCount = isLegacyMode ? headers!.length : (columns?.length ?? 0);
    const handleSearchChange = onSearchChange ?? setSearchQuery;
    const hasFilters = filterElements !== undefined || handleSearchChange !== undefined || actionButton !== undefined;
    const totalCount = totalRecords ?? totalResults;

    const renderSearchBar = () => {
        if (!handleSearchChange) return null;
        return (
            <div className="table-card-search-input-wrap">
                <Search size={14} className="table-card-search-icon" />
                <input type="text" placeholder={searchPlaceholder} value={searchQuery ?? ''} onChange={e => handleSearchChange!(e.target.value)} className="table-card-search-input" />
            </div>
        );
    };

    const renderPagination = () => {
        if (loading || totalPages <= 1 || !onPageChange) return null;
        return (
            <div className="table-card-pagination-bar">
                <span className="table-card-pagination-info">Page {currentPage} of {totalPages}</span>
                <div className="table-card-pagination-controls">
                    <button className="table-card-page-btn table-card-page-btn-nav" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}><ChevronLeft size={15} /></button>
                    {getPageNumbers(totalPages, currentPage).map((p, i) =>
                        p === '...' ? <span key={i} className="table-card-page-ellipsis">…</span>
                            : <button key={i} className={`table-card-page-btn${currentPage === p ? ' active' : ''}`} onClick={() => onPageChange(p as number)}>{p}</button>
                    )}
                    <button className="table-card-page-btn table-card-page-btn-nav" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}><ChevronRight size={15} /></button>
                </div>
            </div>
        );
    };

    return (
        <div className={`card table-card ${className}`}>
            {/* ── Tabs ── */}
            {tabs && tabs.length > 0 && (
                <div className="table-card-tabs">
                    {tabs.map(({ key, label, icon, badge }) => (
                        <button key={key} onClick={() => onTabChange?.(key)} className={`table-card-tab-btn${activeTab === key ? ' active' : ''}`}>
                            {icon}<span>{label}</span>
                            {badge !== undefined && typeof badge === 'number' && badge > 0 && <span className={`table-card-tab-badge${activeTab === key ? ' active' : ''}`}>{badge}</span>}
                            {badge !== undefined && typeof badge === 'string' && badge !== '0' && badge !== '' && <span className={`table-card-tab-badge${activeTab === key ? ' active' : ''}`}>{badge}</span>}
                        </button>
                    ))}
                </div>
            )}

            {/* ── Title + Header Action ── */}
            {title && (
                <div className="table-card-header">
                    <h3 className="table-card-title">{title}</h3>
                    {headerAction && <button className="table-card-header-action" onClick={headerAction.onClick}>{headerAction.label}</button>}
                </div>
            )}

            {/* ── Search / Filters / Action ── */}
            {hasFilters && (
                <div style={{ padding: '16px 20px 0' }}>
                    {totalCount !== undefined && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <span className="table-card-results-info">{totalCount} result{totalCount !== 1 ? 's' : ''} on this page</span>
                        </div>
                    )}
                    <div className="table-card-filter-bar">
                        {renderSearchBar()}
                        {filterElements}
                        {actionButton && (
                            <button className="btn btn-primary" onClick={actionButton.onClick} style={{ marginLeft: 'auto' }}>
                                {actionButton.icon}<span>{actionButton.label}</span>
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* ── Table ── */}
            <div className="table-card-wrap">
                <table className="table-card-data-table">
                    <thead>
                        <tr>
                            {(isLegacyMode ? headers! : columns ?? []).map((col: any) =>
                                <th key={typeof col === 'string' ? col : col.header}>{typeof col === 'string' ? col : col.header}</th>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={colCount}><div className="table-card-empty-state"><Loader2 size={20} className="spin" /><p>Loading…</p></div></td></tr>
                        ) : isLegacyMode ? (
                            (!rowChildren || React.Children.count(rowChildren) === 0) ? (
                                <tr><td colSpan={colCount}><div className="table-card-empty-state">{emptyIcon}<p>{emptyMessage}</p></div></td></tr>
                            ) : rowChildren
                        ) : (
                            (data ?? []).length === 0 ? (
                                <tr><td colSpan={colCount}><div className="table-card-empty-state">{emptyIcon}<p>{emptyMessage}</p></div></td></tr>
                            ) : (
                                data!.map((row, i) => (
                                    <tr key={i} onClick={() => onRowClick?.(row)} style={{ cursor: onRowClick ? 'pointer' : 'default' }}>
                                        {columns!.map(col => {
                                            const value = typeof col.accessor === 'function' ? col.accessor(row) : row[col.accessor];
                                            return <td key={col.header} className={col.className ?? ''}>{value ?? '—'}</td>;
                                        })}
                                    </tr>
                                ))
                            )
                        )}
                    </tbody>
                </table>
            </div>

            {renderPagination()}
        </div>
    );
}
