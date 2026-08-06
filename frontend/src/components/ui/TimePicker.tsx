import React, { useEffect, useRef, useState } from 'react';
import { Clock } from 'lucide-react';

interface TimePickerProps {
    /** 24-hour time in "HH:mm" format */
    value: string;
    /** Emits the selected time in "HH:mm" (24-hour) format */
    onChange: (time: string) => void;
    disabled?: boolean;
}

const DIAL_SIZE = 236;
const CENTER = DIAL_SIZE / 2;
const NUM_RADIUS = 86;   // where the 12 numbers sit
const POINTER_RADIUS = 64; // pointer length

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Position of dial index i (0 = 12 o'clock, clockwise) on a circle of `radius`. */
const positionFor = (i: number, radius: number) => {
    const rad = toRad(i * 30 - 90);
    return { x: CENTER + radius * Math.cos(rad), y: CENTER + radius * Math.sin(rad) };
};

const fmtAMPM = (hour24: number, minute: number): string =>
    new Date(2000, 0, 1, hour24, minute)
        .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

/**
 * Analog clock-style time picker (like Material Design 3): tap or drag a
 * pointer around a circular dial to pick the hour, then the minute, and
 * choose AM/PM. No typing, no dropdown list.
 */
const TimePicker: React.FC<TimePickerProps> = ({ value, onChange, disabled }) => {
    const [open, setOpen] = useState(false);
    const [mode, setMode] = useState<'hour' | 'minute'>('hour');
    const [dragging, setDragging] = useState(false);
    const dialRef = useRef<HTMLDivElement>(null);
    const rootRef = useRef<HTMLDivElement>(null);

    const hour24 = value ? Number(value.slice(0, 2)) : null;
    const minute = value ? Number(value.slice(3, 5)) : 0;
    const hour12 = hour24 === null ? null : hour24 % 12 === 0 ? 12 : hour24 % 12;
    const period = hour24 === null ? 'AM' : hour24 < 12 ? 'AM' : 'PM';

    // index of the currently selected value on the dial (0 = 12 o'clock)
    const selectedIndex = mode === 'hour'
        ? (hour12 ?? 9) % 12
        : Math.round(minute / 5) % 12;

    const apply = (h12: number, min: number, per: string) => {
        let h = h12 % 12;
        if (per === 'PM') h += 12;
        onChange(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
    };

    const indexFromEvent = (clientX: number, clientY: number): number => {
        const el = dialRef.current;
        if (!el) return 0;
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const deg = (Math.atan2(clientY - cy, clientX - cx) * 180) / Math.PI;
        const normalized = (deg + 90 + 360) % 360;
        return Math.round(normalized / 30) % 12;
    };

    const selectByIndex = (index: number) => {
        if (mode === 'hour') {
            const h12 = index === 0 ? 12 : index;
            apply(h12, minute, period);
        } else {
            apply(hour12 ?? 9, (index * 5) % 60, period);
        }
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (disabled) return;
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
        setDragging(true);
        selectByIndex(indexFromEvent(e.clientX, e.clientY));
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!dragging) return;
        selectByIndex(indexFromEvent(e.clientX, e.clientY));
    };

    const handlePointerUp = () => {
        if (dragging && mode === 'hour') setMode('minute'); // auto-advance after hour
        setDragging(false);
    };

    useEffect(() => {
        if (open) setMode('hour');
    }, [open]);

    useEffect(() => {
        const onDocClick = (e: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', onDocClick);
        return () => document.removeEventListener('mousedown', onDocClick);
    }, []);

    const triggerStyle: React.CSSProperties = {
        width: '100%', height: 36, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        gap: 6, padding: '0 12px', fontSize: '0.85rem', fontFamily: 'inherit', fontWeight: 600,
        border: '1.5px solid var(--border)', borderRadius: 8, background: 'var(--bg-main)', color: 'var(--text-primary)',
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.7 : 1, whiteSpace: 'nowrap',
    };

    return (
        <div ref={rootRef} style={{ position: 'relative', minWidth: 118 }}>
            <button type="button" onClick={() => !disabled && setOpen(o => !o)} disabled={disabled} style={triggerStyle}>
                <Clock size={13} />
                {hour24 !== null ? fmtAMPM(hour24, minute) : 'Select time'}
            </button>

            {open && (
                <div style={{
                    position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 40,
                    background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12,
                    boxShadow: '0 10px 30px rgba(15, 23, 42, 0.16)', padding: 12,
                }}>
                    {/* Digital display — tap hour or minute to switch dial mode */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, marginBottom: 8 }}>
                        <button
                            type="button"
                            onClick={() => setMode('hour')}
                            style={{
                                fontSize: 24, fontWeight: 700, fontFamily: 'inherit', background: 'none', border: 'none',
                                color: mode === 'hour' ? 'var(--primary)' : 'var(--text-secondary)', cursor: 'pointer', padding: '0 2px',
                            }}
                        >
                            {String(hour24 ?? 0).padStart(2, '0')}
                        </button>
                        <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-secondary)' }}>:</span>
                        <button
                            type="button"
                            onClick={() => setMode('minute')}
                            style={{
                                fontSize: 24, fontWeight: 700, fontFamily: 'inherit', background: 'none', border: 'none',
                                color: mode === 'minute' ? 'var(--primary)' : 'var(--text-secondary)', cursor: 'pointer', padding: '0 2px',
                            }}
                        >
                            {String(minute).padStart(2, '0')}
                        </button>
                    </div>

                    {/* Circular dial */}
                    <div
                        ref={dialRef}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerCancel={handlePointerUp}
                        style={{
                            width: DIAL_SIZE, height: DIAL_SIZE, borderRadius: '50%', position: 'relative',
                            background: 'var(--s2, #F0F4FF)', border: '1px solid var(--border)',
                            touchAction: 'none', cursor: 'pointer', userSelect: 'none', WebkitUserSelect: 'none',
                        }}
                    >
                        {Array.from({ length: 12 }, (_, i) => {
                            const pos = positionFor(i, NUM_RADIUS);
                            const isSel = selectedIndex === i;
                            const label = mode === 'hour'
                                ? (i === 0 ? '12' : String(i))
                                : String((i * 5) % 60).padStart(2, '0');
                            return (
                                <div
                                    key={i}
                                    style={{
                                        position: 'absolute', left: pos.x - 15, top: pos.y - 15, width: 30, height: 30,
                                        borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 12.5, fontWeight: isSel ? 700 : 600, pointerEvents: 'none',
                                        background: isSel ? 'var(--primary)' : 'transparent',
                                        color: isSel ? '#fff' : 'var(--text-primary)',
                                    }}
                                >
                                    {label}
                                </div>
                            );
                        })}

                        {/* Pointer */}
                        <div style={{
                            position: 'absolute', left: CENTER - 2, top: CENTER - POINTER_RADIUS,
                            width: 4, height: POINTER_RADIUS, borderRadius: 2,
                            transformOrigin: '2px 100%', transform: `rotate(${selectedIndex * 30}deg)`,
                            background: 'var(--primary)',
                        }} />
                        {/* Center dot */}
                        <div style={{
                            position: 'absolute', left: CENTER - 6, top: CENTER - 6, width: 12, height: 12,
                            borderRadius: '50%', background: 'var(--primary)',
                        }} />
                    </div>

                    {/* AM / PM */}
                    <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                        {(['AM', 'PM'] as const).map(p => (
                            <button
                                key={p}
                                type="button"
                                onClick={() => apply(hour12 ?? 9, minute, p)}
                                style={{
                                    flex: 1, height: 30, border: '1px solid var(--border)', borderRadius: 7, fontFamily: 'inherit',
                                    background: p === period ? 'var(--primary)' : 'var(--bg-main)',
                                    color: p === period ? '#fff' : 'var(--text-primary)',
                                    fontWeight: 700, fontSize: 12.5, cursor: 'pointer',
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
