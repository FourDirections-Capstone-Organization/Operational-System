import React, { useEffect, useRef, useState } from 'react';
import { Clock } from 'lucide-react';

interface TimePickerProps {
    /** 24-hour time in "HH:mm" format */
    value: string;
    /** Emits the selected time in "HH:mm" (24-hour) format */
    onChange: (time: string) => void;
    disabled?: boolean;
}

const HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

const fmtAMPM = (hour24: number, minute: string): string =>
    new Date(2000, 0, 1, hour24, Number(minute))
        .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

/**
 * Compact clock-style time picker: a trigger button that opens a small popover
 * with hour, minute, and AM/PM selections — no typing, no tall dropdown.
 */
const TimePicker: React.FC<TimePickerProps> = ({ value, onChange, disabled }) => {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    const hour24 = value ? Number(value.slice(0, 2)) : null;
    const minute = value ? value.slice(3, 5) : '00';
    const hour12 = hour24 === null ? null : hour24 % 12 === 0 ? 12 : hour24 % 12;
    const period = hour24 === null ? 'AM' : hour24 < 12 ? 'AM' : 'PM';

    const apply = (h12: number, min: string, per: string) => {
        let h = h12 % 12;
        if (per === 'PM') h += 12;
        onChange(`${String(h).padStart(2, '0')}:${min}`);
    };

    useEffect(() => {
        const onDocClick = (e: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', onDocClick);
        return () => document.removeEventListener('mousedown', onDocClick);
    }, []);

    const btnStyle: React.CSSProperties = {
        width: '100%', height: 36, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        gap: 6, padding: '0 12px', fontSize: '0.85rem', fontFamily: 'inherit', fontWeight: 600,
        border: '1.5px solid var(--border)', borderRadius: 8, background: 'var(--bg-main)', color: 'var(--text-primary)',
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.7 : 1, whiteSpace: 'nowrap',
    };

    return (
        <div ref={rootRef} style={{ position: 'relative', minWidth: 118 }}>
            <button
                type="button"
                onClick={() => !disabled && setOpen(o => !o)}
                disabled={disabled}
                style={btnStyle}
            >
                <Clock size={13} />
                {hour24 !== null ? fmtAMPM(hour24, minute) : 'Select time'}
            </button>
            {open && (
                <div style={{
                    position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 40, width: 236,
                    background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10,
                    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.14)', padding: 10,
                }}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--text-secondary)', marginBottom: 6 }}>
                        Hour
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
                        {HOURS.map(h => (
                            <button
                                key={h}
                                type="button"
                                onClick={() => apply(h, minute, period)}
                                style={{
                                    height: 30, border: '1px solid var(--border)', borderRadius: 6, fontFamily: 'inherit',
                                    background: h === hour12 ? 'var(--primary)' : 'var(--bg-main)',
                                    color: h === hour12 ? '#fff' : 'var(--text-primary)',
                                    fontWeight: h === hour12 ? 700 : 600, fontSize: 12.5, cursor: 'pointer',
                                }}
                            >
                                {h}
                            </button>
                        ))}
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--text-secondary)', margin: '8px 0 6px' }}>
                        Minute
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
                        {MINUTES.map(m => (
                            <button
                                key={m}
                                type="button"
                                onClick={() => apply(hour12 ?? 9, m, period)}
                                style={{
                                    height: 26, border: '1px solid var(--border)', borderRadius: 6, fontFamily: 'inherit',
                                    background: m === minute ? 'var(--primary)' : 'var(--bg-main)',
                                    color: m === minute ? '#fff' : 'var(--text-primary)',
                                    fontWeight: m === minute ? 700 : 600, fontSize: 12, cursor: 'pointer',
                                }}
                            >
                                {m}
                            </button>
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                        {(['AM', 'PM'] as const).map(p => (
                            <button
                                key={p}
                                type="button"
                                onClick={() => apply(hour12 ?? 9, minute, p)}
                                style={{
                                    flex: 1, height: 28, border: '1px solid var(--border)', borderRadius: 6, fontFamily: 'inherit',
                                    background: p === period ? 'var(--primary)' : 'var(--bg-main)',
                                    color: p === period ? '#fff' : 'var(--text-primary)',
                                    fontWeight: 700, fontSize: 12, cursor: 'pointer',
                                }}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default TimePicker;
