import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes

export function useSessionTimeout() {
    const navigate = useNavigate();
    const timerRef = useRef<ReturnType<typeof setTimeout>>();

    const logout = () => {
        localStorage.clear();
        navigate('/', { replace: true });
    };

    const resetTimer = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(logout, INACTIVITY_TIMEOUT);
    };

    useEffect(() => {
        const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'click'];

        const handleActivity = () => resetTimer();

        resetTimer();

        events.forEach(event => window.addEventListener(event, handleActivity));

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            events.forEach(event => window.removeEventListener(event, handleActivity));
        };
    }, [navigate]);
}
