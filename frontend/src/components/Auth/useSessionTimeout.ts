import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

// Safety-net timeout (30 min). Backend handles the actual 15-min session
// timeout via SessionTimeoutMiddleware. This frontend timer only fires
// as a last resort if the backend check is somehow bypassed.
const INACTIVITY_TIMEOUT = 30 * 60 * 1000;
const HEARTBEAT_INTERVAL = 5 * 60 * 1000;
const RESET_THROTTLE = 1000;

const ACTIVITY_EVENTS = [
    'mousedown', 'mousemove', 'click', 'keydown',
    'touchstart', 'touchmove', 'pointerdown', 'pointermove',
    'wheel', 'scroll', 'input', 'focus',
];

export function useSessionTimeout() {
    const navigate = useNavigate();
    const inactivityTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const heartbeatTimer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
    const lastReset = useRef(0);
    const logoutRef = useRef<(() => void) | undefined>(undefined);

    const logout = useCallback(() => {
        localStorage.clear();
        navigate('/', { replace: true });
    }, [navigate]);

    logoutRef.current = logout;

    const resetTimer = useCallback(() => {
        const now = Date.now();
        if (now - lastReset.current < RESET_THROTTLE) return;
        lastReset.current = now;

        if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
        inactivityTimer.current = setTimeout(() => {
            logoutRef.current?.();
        }, INACTIVITY_TIMEOUT);
    }, []);

    const refreshToken = useCallback(async () => {
        const token = localStorage.getItem('refreshToken');
        if (!token) return;

        try {
            const { data: raw } = await axios.post(
                '/api/Auth/refresh-token',
                { refreshToken: token },
                { headers: { 'X-Heartbeat': 'true' } as any }
            );
            const d = raw?.data ?? raw;
            if (d?.accessToken) localStorage.setItem('authToken', d.accessToken);
            if (d?.refreshToken) localStorage.setItem('refreshToken', d.refreshToken);
        } catch (err) {
            console.warn('[SessionTimeout] Heartbeat token refresh failed:', (err as any)?.message ?? err);
        }
    }, []);

    useEffect(() => {
        const handleActivity = () => resetTimer();

        ACTIVITY_EVENTS.forEach(event =>
            window.addEventListener(event, handleActivity, { capture: true })
        );

        resetTimer();

        heartbeatTimer.current = setInterval(refreshToken, HEARTBEAT_INTERVAL);

        return () => {
            if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
            if (heartbeatTimer.current) clearInterval(heartbeatTimer.current);
            ACTIVITY_EVENTS.forEach(event =>
                window.removeEventListener(event, handleActivity, { capture: true })
            );
        };
    }, [resetTimer, refreshToken]);
}
