import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    className?: string;
}

function getPageNumbers(total: number, current: number): (number | '...')[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: (number | '...')[] = [];
    if (current <= 3) {
        for (let i = 1; i <= Math.min(5, total); i++) pages.push(i);
        if (total > 5) { pages.push('...'); pages.push(total); }
    } else if (current >= total - 2) {
        pages.push(1); pages.push('...');
        for (let i = total - 4; i <= total; i++) pages.push(i);
    } else {
        pages.push(1); pages.push('...');
        for (let i = current - 1; i <= current + 1; i++) pages.push(i);
        pages.push('...'); pages.push(total);
    }
    return pages;
}

export default function Pagination({ currentPage, totalPages, onPageChange, className = '' }: PaginationProps) {
    if (totalPages <= 1) return null;
    return (
        <div className={`table-pagination ${className}`}>
            <div className="pagination-controls">
                <button className="pagination-btn" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>
                    <ChevronLeft size={14} />
                </button>
                {getPageNumbers(totalPages, currentPage).map((p, i) =>
                    p === '...'
                        ? <span key={i} className="pagination-ellipsis">…</span>
                        : <button key={i} className={`pagination-btn ${currentPage === p ? 'active' : ''}`} onClick={() => onPageChange(p)}>{p}</button>
                )}
                <button className="pagination-btn" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}>
                    <ChevronRight size={14} />
                </button>
            </div>
        </div>
    );
}
