
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function usePreventBackNav() {
    const navigate = useNavigate();

    useEffect(() => {
        window.history.pushState(null, '', window.location.href);
        const handlePop = () => {
            const token = localStorage.getItem('authToken');
            if (!token) {
                navigate('/', { replace: true });
            } else {
                window.history.pushState(null, '', window.location.href);
            }
        };
        window.addEventListener('popstate', handlePop);
        return () => window.removeEventListener('popstate', handlePop);
    }, [navigate]);
}